import { useQuery } from "@tanstack/react-query";
import { AppCard } from "../components/AppCard";
import { StatCard } from "../components/StatCard";
import { modulesApi } from "../services/moduleApi";

export default function ReportsPage() {
  const reportQuery = useQuery({
    queryKey: ["report-summary"],
    queryFn: modulesApi.reportSummary
  });

  const summary = reportQuery.data?.summary;

  return (
    <>
      <AppCard title="Integrated Farm Report" subtitle="Latest consolidated intelligence across all modules">
        {reportQuery.isLoading ? <p className="text-slate-400">Loading report...</p> : null}
        {summary ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Crop" value={summary.crop?.cropType || "-"} />
            <StatCard label="Yield 7D" value={summary.yieldPrediction?.predictedYield7Days || "-"} />
            <StatCard label="Disease Risk" value={summary.disease?.riskLevel || "-"} />
            <StatCard label="Best Market" value={summary.market?.bestMarket || "-"} />
          </div>
        ) : null}
      </AppCard>

      <AppCard title="Raw Report JSON">
        <pre className="max-h-[420px] overflow-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
          {JSON.stringify(summary || {}, null, 2)}
        </pre>
      </AppCard>
    </>
  );
}
