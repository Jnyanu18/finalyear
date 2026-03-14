interface BarProps {
  value: number;
}

function InlineBar({ value }: BarProps) {
  return (
    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-[#3ddc6e] transition-all" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

interface SensorCardProps {
  label: string;
  value: number;
  unit: string;
  progress: number;
  tone: "green" | "yellow" | "orange" | "red";
}

const toneMap = {
  green: "text-[#3ddc6e]",
  yellow: "text-[#f7d454]",
  orange: "text-[#f59e0b]",
  red: "text-[#ef4444]"
};

export function SensorCard({ label, value, unit, progress, tone }: SensorCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1a10] p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[#6e8d75]">{label}</div>
      <div className={`mt-3 text-3xl font-semibold ${toneMap[tone]}`}>{value.toFixed(1)} <span className="text-sm text-[#8fb89a]">{unit}</span></div>
      <InlineBar value={progress} />
    </div>
  );
}
