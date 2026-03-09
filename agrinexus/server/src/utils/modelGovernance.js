export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function hoursSince(inputDate) {
  if (!inputDate) return Number.POSITIVE_INFINITY;
  const dt = new Date(inputDate);
  if (Number.isNaN(dt.getTime())) return Number.POSITIVE_INFINITY;
  return (Date.now() - dt.getTime()) / (1000 * 60 * 60);
}

export function freshnessConfidence(capturedAt, staleAfterHours = 24, hardStopHours = 96) {
  const age = hoursSince(capturedAt);
  if (!Number.isFinite(age)) return 0;
  if (age <= staleAfterHours) return 1;
  if (age >= hardStopHours) return 0;
  const span = hardStopHours - staleAfterHours;
  return clamp(1 - (age - staleAfterHours) / span, 0, 1);
}

export function missingRequiredInputs(context = {}, required = []) {
  return required.filter((path) => {
    const value = path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), context);
    if (typeof value === "number") return !Number.isFinite(value);
    return value === undefined || value === null || value === "";
  });
}

export function buildInsufficientDataResponse({ modelVersion, missingInputs = [], staleInputs = [], confidence = 0 }) {
  return {
    status: "insufficient_data",
    modelVersion,
    confidence: Number(clamp(confidence, 0, 1).toFixed(2)),
    missingInputs,
    staleInputs,
    scenarios: null,
    explanation: "Required inputs are missing or stale. Add fresh field context to compute a reliable prediction."
  };
}

export function percentileBand(expectedValue) {
  const base = toNumber(expectedValue, 0);
  return {
    p10: Number((base * 0.82).toFixed(2)),
    p50: Number(base.toFixed(2)),
    p90: Number((base * 1.16).toFixed(2))
  };
}
