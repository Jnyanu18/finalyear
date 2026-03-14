import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ReferenceArea, ReferenceLine, Legend } from "recharts";
import { formatShortDate } from "@/lib/live-data";
import type { ForecastPoint } from "@/types/agrosense";

interface ForecastChartProps {
  data: ForecastPoint[];
}

export function ForecastChart({ data }: ForecastChartProps) {
  const firstForecast = data.find((point) => point.isForecast)?.date;
  const lastPoint = data[data.length - 1]?.date;

  return (
    <div className="h-[340px] w-full rounded-3xl border border-white/10 bg-[#0d1a10] p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 20, right: 12, bottom: 8, left: -16 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={(value) => formatShortDate(value)} tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: "#8fb89a", fontSize: 11 }} tickLine={false} axisLine={false} domain={[0.2, 1]} />
          <Tooltip labelFormatter={(value) => formatShortDate(String(value))} contentStyle={{ background: "#08110b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16 }} />
          <Legend wrapperStyle={{ color: "#dbe9df" }} />
          {firstForecast && lastPoint ? (
            <ReferenceArea x1={firstForecast} x2={lastPoint} fill="#3ddc6e" fillOpacity={0.08} />
          ) : null}
          {firstForecast ? <ReferenceLine x={firstForecast} stroke="#f7d454" strokeDasharray="4 4" label={{ value: "Forecast start", fill: "#f7d454", position: "top" }} /> : null}
          <Line type="monotone" dataKey="ndvi" stroke="#3ddc6e" strokeWidth={2.5} dot={false} />
          <Line type="monotone" dataKey="ndre" stroke="#7dd3fc" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="savi" stroke="#f59e0b" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
