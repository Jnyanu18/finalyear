import { AlertTriangle, Activity, Droplets, ShieldAlert, X } from "lucide-react";
import type { ZoneIndex, ZoneRiskBreakdown } from "@/types/agrosense";

function InlineBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div className="h-full rounded-full bg-[#3ddc6e] transition-all" style={{ width: `${Math.max(0, Math.min(value, 100))}%` }} />
    </div>
  );
}

interface ZoneDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zone: ZoneIndex | null;
  risk: ZoneRiskBreakdown | null;
}

export function ZoneDrawer({ open, onOpenChange, zone, risk }: ZoneDrawerProps) {
  if (!open || !zone) {
    return null;
  }

  const topRisk = risk ? [...risk.pestRisks].sort((left, right) => right.probability - left.probability)[0] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l border-white/10 bg-[#0d1a10] p-6 text-white shadow-2xl">
        <button onClick={() => onOpenChange(false)} className="absolute right-4 top-4 rounded-full border border-white/10 p-2 text-[#8fb89a] hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
        <div>
          <h2 className="text-2xl font-semibold">{zone.zoneLabel}</h2>
          <p className="mt-2 text-sm text-[#8fb89a]">{zone.status} canopy state with live fused sensor and spectral metrics.</p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm text-[#8fb89a]"><Activity className="h-4 w-4" /> NDVI</div>
              <div className="mt-2 text-3xl font-semibold">{zone.ndvi.toFixed(2)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-sm text-[#8fb89a]"><Droplets className="h-4 w-4" /> Soil Moisture Index</div>
              <div className="mt-2 text-3xl font-semibold">{zone.smi.toFixed(2)}</div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 text-sm uppercase tracking-[0.2em] text-[#6e8d75]">
              <ShieldAlert className="h-4 w-4" /> Zone Risk
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm text-[#dbe9df]">
                  <span>Readiness</span>
                  <span>{risk?.readiness ?? 0}%</span>
                </div>
                <InlineBar value={risk?.readiness ?? 0} />
              </div>
              <div>
                <div className="flex items-center justify-between text-sm text-[#dbe9df]">
                  <span>Soil Health</span>
                  <span>{risk?.soilHealthScore ?? 0}</span>
                </div>
                <InlineBar value={risk?.soilHealthScore ?? 0} />
              </div>
              {topRisk ? (
                <div className="rounded-2xl bg-[#102315] p-4 text-sm text-[#dbe9df]">
                  <div className="flex items-center gap-2 text-[#f6d365]"><AlertTriangle className="h-4 w-4" /> Top risk</div>
                  <p className="mt-2 text-lg font-semibold">{topRisk.pestType}</p>
                  <p className="text-[#a8c4af]">{Math.round(topRisk.probability * 100)}% probability</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["NDRE", zone.ndre],
              ["SAVI", zone.savi],
              ["EVI", zone.evi],
              ["Clay Ratio", zone.clayMineralRatio],
              ["Iron Oxide", zone.ironOxideIndex]
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-[#6e8d75]">{label}</div>
                <div className="mt-2 text-2xl font-semibold">{Number(value).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
