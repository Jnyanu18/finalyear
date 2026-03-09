export function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function hoursSince(capturedAt) {
  if (!capturedAt) return Number.POSITIVE_INFINITY;
  const t = new Date(capturedAt).getTime();
  if (!Number.isFinite(t)) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - t) / (1000 * 60 * 60));
}

export function freshnessConfidence(capturedAt, maxFreshHours) {
  const age = hoursSince(capturedAt);
  if (!Number.isFinite(age)) return 0;
  if (age <= maxFreshHours) return 1;
  if (age >= maxFreshHours * 2) return 0;
  return Number((1 - (age - maxFreshHours) / maxFreshHours).toFixed(2));
}

export function buildInsufficientDataResponse({
  moduleName,
  modelVersion,
  missingInputs = [],
  staleInputs = [],
  assumptions = {},
}) {
  return {
    status: "insufficient_data",
    moduleName,
    modelVersion,
    confidence: 0,
    missingInputs,
    staleInputs,
    assumptions,
    generatedAt: new Date().toISOString(),
  };
}

