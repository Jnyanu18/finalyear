import { useEffect, useMemo, useState } from "react";
import { FileDown } from "lucide-react";
import { AgroSenseToolbar } from "@/components/agrosense/AgroSenseToolbar";
import { agrosenseApi, toAbsoluteAssetUrl } from "@/api/agrosense";
import { useAgroSenseFieldBundle, useAgroSenseFields, useTriggerFieldAnalysis } from "@/hooks/useAgroSense";
import { useAgroSenseStore } from "@/store/agrosenseStore";
import type { InsightsResponse, RiskResponse } from "@/types/agrosense";

export default function ReportsPage() {
  const { data: fieldsData } = useAgroSenseFields();
  const { selectedFieldId, sensorRange, setSelectedFieldId } = useAgroSenseStore();
  const bundle = useAgroSenseFieldBundle(selectedFieldId, sensorRange);
  const triggerAnalysis = useTriggerFieldAnalysis(selectedFieldId);
  const [dateRangeStart, setDateRangeStart] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [dateRangeEnd, setDateRangeEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [reportUrl, setReportUrl] = useState("");

  const fields = useMemo(() => fieldsData?.fields ?? [], [fieldsData?.fields]);
  useEffect(() => {
    if (!selectedFieldId && fields.length > 0) {
      setSelectedFieldId(fields[0].id);
    }
  }, [fields, selectedFieldId, setSelectedFieldId]);

  const riskData = bundle.risk.data as RiskResponse | undefined;
  const insightsData = bundle.insights.data as InsightsResponse | undefined;
  const selectedField = fields.find((field) => field.id === selectedFieldId) || null;

  const preview = useMemo(() => ({
    summary: selectedField,
    risk: riskData?.topRisks.slice(0, 5) || [],
    recommendations: insightsData?.insights || []
  }), [selectedField, riskData, insightsData]);

  const handleGenerate = async () => {
    const result = await agrosenseApi.generateReport(selectedFieldId, dateRangeStart, dateRangeEnd);
    setReportUrl(toAbsoluteAssetUrl(result.report.pdfUrl));
  };

  if (!selectedField) {
    return null;
  }

  return (
    <div className="space-y-6 text-white">
      <AgroSenseToolbar
        fields={fields}
        selectedFieldId={selectedFieldId}
        onSelectField={setSelectedFieldId}
        onRunAnalysis={() => triggerAnalysis.mutate()}
        onExport={handleGenerate}
        isRunning={triggerAnalysis.isPending}
      />

      <div className="grid gap-6 xl:grid-cols-[0.7fr,1.3fr]">
        <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
          <h2 className="text-xl font-semibold">Report options</h2>
          <div className="mt-4 space-y-4">
            <label className="block">
              <div className="mb-2 text-sm text-[#8fb89a]">Start date</div>
              <input type="date" value={dateRangeStart} onChange={(event) => setDateRangeStart(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#08110b] px-4 py-3 text-sm text-white" />
            </label>
            <label className="block">
              <div className="mb-2 text-sm text-[#8fb89a]">End date</div>
              <input type="date" value={dateRangeEnd} onChange={(event) => setDateRangeEnd(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#08110b] px-4 py-3 text-sm text-white" />
            </label>
            <button onClick={handleGenerate} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#3ddc6e] px-4 py-3 font-semibold text-[#08110b]"><FileDown className="h-4 w-4" /> Generate PDF report</button>
            {reportUrl ? <a href={reportUrl} target="_blank" rel="noreferrer" className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center text-sm hover:bg-white/10">Open latest artifact</a> : null}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
          <h2 className="text-xl font-semibold">Report preview</h2>
          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#6e8d75]">Summary</div>
              <p className="mt-3 text-sm leading-6 text-[#dbe9df]">{selectedField.name} is tracking at {selectedField.overview.avgNdvi.toFixed(2)} NDVI with {selectedField.overview.activeStressZones} active stress zones and a peak pest risk of {selectedField.overview.peakPestRiskPct}%.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#6e8d75]">Risk assessment</div>
              <div className="mt-3 space-y-2 text-sm text-[#dbe9df]">
                {preview.risk.map((risk) => (
                  <div key={`${risk.zoneId}-${risk.pestType}`} className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2">
                    <span>{risk.zoneLabel} • {risk.pestType}</span>
                    <span>{Math.round(risk.probability * 100)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-[#6e8d75]">Recommendations</div>
              <div className="mt-3 space-y-3 text-sm text-[#dbe9df]">
                {preview.recommendations.map((insight) => (
                  <div key={insight.id} className="rounded-xl border border-white/10 px-3 py-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-[#6e8d75]">{insight.urgency}</div>
                    <p className="mt-2">{insight.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


