import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";
import { env } from "../../config/env.js";
import { getRawField } from "./fieldService.js";
import { listActiveAlerts } from "./alertService.js";
import { saveReportRecord } from "./runtimeState.js";
import { logger } from "./logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reportsDir = path.resolve(__dirname, "../../generated-reports");

function reportUrl(filename) {
  if (env.agrosenseReportBaseUrl) {
    return `${env.agrosenseReportBaseUrl.replace(/\/+$/, "")}/${filename}`;
  }
  return `/generated-reports/${filename}`;
}

function reportHtml(field, alerts, dateRange) {
  const riskRows = field.risk.topRisks
    .slice(0, 6)
    .map(
      (risk) => `
        <tr>
          <td>${risk.zoneLabel}</td>
          <td>${risk.pestType}</td>
          <td>${Math.round(risk.probability * 100)}%</td>
          <td>${risk.severity}</td>
        </tr>`
    )
    .join("");

  const insightRows = field.insights
    .map(
      (insight) => `
        <li>
          <strong>${insight.urgency.toUpperCase()}</strong> - ${insight.recommendation}
          <span style="display:block;color:#6f8174;font-size:12px;">${insight.modelSource} • ${(insight.modelConfidence * 100).toFixed(0)}% confidence</span>
        </li>`
    )
    .join("");

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>AgroSense AI Report</title>
      <style>
        body { font-family: Arial, sans-serif; background: #f6fbf7; color: #102315; padding: 32px; }
        h1, h2, h3 { margin: 0 0 12px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 28px; }
        .card { background: #ffffff; border: 1px solid #dceadf; border-radius: 14px; padding: 18px; margin-bottom: 18px; }
        .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        .metric { background: #eff8f1; border-radius: 12px; padding: 12px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border-bottom: 1px solid #e5efe7; text-align: left; }
        th { background: #eef7f0; }
        ul { padding-left: 18px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>AgroSense AI Field Report</h1>
          <p>${field.name} • ${field.cropType} • ${field.areaHa} ha</p>
        </div>
        <div>
          <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
          <p><strong>Range:</strong> ${dateRange.start} to ${dateRange.end}</p>
        </div>
      </div>

      <div class="card">
        <h2>Executive Summary</h2>
        <div class="grid">
          <div class="metric"><strong>Avg NDVI</strong><div>${field.overview.avgNdvi}</div></div>
          <div class="metric"><strong>Soil Moisture</strong><div>${field.overview.soilMoisturePct}%</div></div>
          <div class="metric"><strong>Active Stress Zones</strong><div>${field.overview.activeStressZones}</div></div>
          <div class="metric"><strong>Peak Pest Risk</strong><div>${field.overview.peakPestRiskPct}%</div></div>
        </div>
      </div>

      <div class="card">
        <h2>Risk Assessment</h2>
        <table>
          <thead>
            <tr><th>Zone</th><th>Risk</th><th>Probability</th><th>Severity</th></tr>
          </thead>
          <tbody>${riskRows}</tbody>
        </table>
      </div>

      <div class="card">
        <h2>Active Alerts</h2>
        <ul>${alerts.map((alert) => `<li><strong>${alert.severity.toUpperCase()}</strong> - ${alert.title}: ${alert.recommendation}</li>`).join("")}</ul>
      </div>

      <div class="card">
        <h2>Recommendations</h2>
        <ul>${insightRows}</ul>
      </div>
    </body>
  </html>`;
}

export async function generateFieldReport(fieldId, options = {}) {
  const field = getRawField(fieldId);
  const alerts = (await listActiveAlerts()).filter((alert) => alert.fieldId === fieldId);
  const reportId = randomUUID();
  const filename = `${fieldId}-${Date.now()}.pdf`;
  const pdfPath = path.join(reportsDir, filename);
  const html = reportHtml(field, alerts, {
    start: options.dateRangeStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    end: options.dateRangeEnd || new Date().toISOString().slice(0, 10)
  });

  await fs.mkdir(reportsDir, { recursive: true });

  let format = "pdf";
  try {
    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.default.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({ path: pdfPath, format: "A4", printBackground: true, margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" } });
    await browser.close();
  } catch (error) {
    format = "html";
    const htmlPath = pdfPath.replace(/\.pdf$/, ".html");
    await fs.writeFile(htmlPath, html, "utf8");
    logger.warn("report_pdf_fallback", { fieldId, error: error.message });
  }

  const record = saveReportRecord({
    id: reportId,
    fieldId,
    generatedBy: options.generatedBy || "system",
    dateRangeStart: options.dateRangeStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    dateRangeEnd: options.dateRangeEnd || new Date().toISOString().slice(0, 10),
    pdfUrl: reportUrl(format === "pdf" ? filename : filename.replace(/\.pdf$/, ".html")),
    createdAt: new Date().toISOString(),
    format
  });

  return record;
}
