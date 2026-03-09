const MONITOR_CONTEXT_KEY = "agri:latest-monitor-analysis";

export type MonitorSnapshot = {
  cropType: string;
  growthStage: string;
  fruitCount: number;
  healthStatus: string;
  stages: Array<{ stage: string; count: number }>;
  summary?: string;
  updatedAt: string;
};

type MaybeSnapshot = MonitorSnapshot | null;

export function saveMonitorSnapshot(snapshot: Omit<MonitorSnapshot, "updatedAt">) {
  if (typeof window === "undefined") return;
  const payload: MonitorSnapshot = { ...snapshot, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(MONITOR_CONTEXT_KEY, JSON.stringify(payload));
}

export function readMonitorSnapshot(): MaybeSnapshot {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(MONITOR_CONTEXT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as MonitorSnapshot;
    if (!parsed?.cropType) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function deriveRipeRatio(snapshot: MaybeSnapshot): number | null {
  if (!snapshot) return null;
  const total = Number(snapshot.fruitCount || 0);
  if (total <= 0) return null;
  const ripe = snapshot.stages
    ?.filter((s) => (s.stage || "").toLowerCase().includes("ripe") && !(s.stage || "").toLowerCase().includes("semi"))
    .reduce((sum, s) => sum + Number(s.count || 0), 0) || 0;
  return Math.max(0, Math.min(1, ripe / total));
}

export function deriveWeatherScore(healthStatus: string): number {
  const key = (healthStatus || "").toLowerCase();
  if (key === "healthy") return 0.88;
  if (key === "moderate") return 0.72;
  return 0.58;
}

export function deriveTemperature(healthStatus: string): number {
  const key = (healthStatus || "").toLowerCase();
  if (key === "healthy") return 26;
  if (key === "moderate") return 29;
  return 32;
}

export function deriveHumidity(healthStatus: string): number {
  const key = (healthStatus || "").toLowerCase();
  if (key === "healthy") return 62;
  if (key === "moderate") return 74;
  return 84;
}
