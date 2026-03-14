import { formatRelativeTime } from "@/lib/live-data";
import type { ModelStatusItem } from "@/types/agrosense";

function InlineBar({ value }: { value: number }) {
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-[#3ddc6e] transition-all" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

interface ModelStatusPanelProps {
  models: ModelStatusItem[];
}

export function ModelStatusPanel({ models }: ModelStatusPanelProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0d1a10] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Model Status</h3>
          <p className="text-sm text-[#8fb89a]">Accuracy and retraining freshness across the AgroSense stack.</p>
        </div>
      </div>
      <div className="space-y-4">
        {models.map((model) => (
          <div key={model.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">{model.modelName}</div>
                <div className="text-xs text-[#8fb89a]">{model.version} • {model.sampleCount.toLocaleString()} samples</div>
              </div>
              <div className="text-sm font-medium text-[#3ddc6e]">{(model.accuracy * 100).toFixed(1)}%</div>
            </div>
            <InlineBar value={model.accuracy * 100} />
            <div className="mt-2 text-xs text-[#6e8d75]">Last trained {formatRelativeTime(model.trainedAt)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
