import { jest } from "@jest/globals";

await jest.unstable_mockModule("../middlewares/authMiddleware.js", () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: "test-user", email: "test@example.com" };
    next();
  }
}));

await jest.unstable_mockModule("../middlewares/agrosenseRateLimit.js", () => ({
  agrosenseRateLimit: (_req, _res, next) => next()
}));

const express = (await import("express")).default;
const request = (await import("supertest")).default;
const agrosenseFieldRoutes = (await import("../routes/agrosenseFieldRoutes.js")).default;
const agrosenseAlertRoutes = (await import("../routes/agrosenseAlertRoutes.js")).default;
const agrosenseModelRoutes = (await import("../routes/agrosenseModelRoutes.js")).default;
const agrosenseReportRoutes = (await import("../routes/agrosenseReportRoutes.js")).default;

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(agrosenseFieldRoutes);
  app.use(agrosenseAlertRoutes);
  app.use(agrosenseModelRoutes);
  app.use(agrosenseReportRoutes);
  app.use((err, _req, res, _next) => {
    res.status(err.statusCode || 500).json({ error: err.message });
  });
  return app;
}

describe("AgroSense API routes", () => {
  const app = buildApp();

  test("GET /fields returns field list", async () => {
    const response = await request(app).get("/fields");
    expect(response.status).toBe(200);
    expect(response.body.data.fields.length).toBeGreaterThan(0);
  });

  test("GET /fields/:id/map returns GeoJSON", async () => {
    const fieldsResponse = await request(app).get("/fields");
    const fieldId = fieldsResponse.body.data.fields[0].id;
    const response = await request(app).get(`/fields/${fieldId}/map`);
    expect(response.status).toBe(200);
    expect(response.body.data.geojson.features.length).toBe(6);
  });

  test("GET /alerts returns active alerts", async () => {
    const response = await request(app).get("/alerts");
    expect(response.status).toBe(200);
    expect(response.body.data.alerts.length).toBeGreaterThan(0);
  });

  test("GET /models/status returns model state", async () => {
    const response = await request(app).get("/models/status");
    expect(response.status).toBe(200);
    expect(response.body.data.models.length).toBe(4);
  });

  test("GET /reports/:fieldId generates a report payload", async () => {
    const fieldsResponse = await request(app).get("/fields");
    const fieldId = fieldsResponse.body.data.fields[0].id;
    const response = await request(app).get(`/reports/${fieldId}`);
    expect(response.status).toBe(200);
    expect(response.body.data.report.pdfUrl).toMatch(/generated-reports/);
  });
});
