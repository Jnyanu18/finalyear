import { Bell, ChevronRight } from "lucide-react";
import type { AlertItem } from "@/types/agrosense";

interface AlertBannerProps {
  alert: AlertItem | null;
  onAcknowledge: (alertId: string) => void;
}

const toneClass: Record<AlertItem["severity"], string> = {
  info: "border-sky-400/30 bg-sky-400/10 text-sky-100",
  watch: "border-yellow-400/30 bg-yellow-400/10 text-yellow-100",
  warning: "border-orange-400/30 bg-orange-400/10 text-orange-100",
  critical: "border-red-500/40 bg-red-500/10 text-red-100"
};

export function AlertBanner({ alert, onAcknowledge }: AlertBannerProps) {
  if (!alert) {
    return null;
  }

  return (
    <div className={`rounded-3xl border p-5 ${toneClass[alert.severity]}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <Bell className="mt-1 h-5 w-5" />
          <div>
            <div className="text-xs uppercase tracking-[0.24em] opacity-80">Highest severity alert</div>
            <h2 className="mt-1 text-xl font-semibold">{alert.title}</h2>
            <p className="mt-1 text-sm opacity-90">{alert.description}</p>
            <p className="mt-2 text-sm font-medium">Recommended action: {alert.recommendation}</p>
          </div>
        </div>
        <button onClick={() => onAcknowledge(alert.id)} className="inline-flex items-center gap-2 rounded-2xl border border-current/20 px-4 py-3 text-sm font-medium transition hover:bg-white/10">
          Dismiss <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
