import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AppCard } from "../components/AppCard";
import { StatCard } from "../components/StatCard";
import { modulesApi } from "../services/moduleApi";

export default function HomePage() {
  const reportQuery = useQuery({
    queryKey: ["report-summary"],
    queryFn: modulesApi.reportSummary
  });

  const summary = reportQuery.data?.summary;
  const quickSeries = [
    { day: "D0", value: summary?.yieldPrediction?.predictedYieldToday || 0 },
    { day: "D3", value: summary?.yieldPrediction?.predictedYield3Days || 0 },
    { day: "D7", value: summary?.yieldPrediction?.predictedYield7Days || 0 }
  ];

  return (
    <>
      <AppCard
        title="AgriNexus Decision Intelligence"
        subtitle="Unified dashboard for crop, risk, irrigation, harvest, storage, market and profit decisions."
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Latest Crop" value={summary?.crop?.cropType || "-"} hint={summary?.crop?.growthStage || ""} />
          <StatCard label="Yield (7 days)" value={`${summary?.yieldPrediction?.predictedYield7Days || 0} kg`} />
          <StatCard label="Disease Risk" value={summary?.disease?.riskLevel || "-"} />
          <StatCard label="Best Market" value={summary?.market?.bestMarket || "-"} hint={summary?.market?.netProfit ? `Net ${summary.market.netProfit}` : ""} />
        </div>
      </AppCard>

      <AppCard title="Yield Trend Snapshot" subtitle="From latest prediction engine run">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={quickSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Area type="monotone" dataKey="value" stroke="#22c55e" fill="#22c55e33" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </AppCard>
    </>
  );
}
