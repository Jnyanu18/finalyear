const metrics = {
  startedAt: new Date().toISOString(),
  requests: {},
  latencyMs: {},
  fallbacks: {},
  quotaFailures: 0,
  errors: 0
};

function ensureBucket(obj, key) {
  if (!obj[key]) obj[key] = 0;
}

export function observeRequest(req, res, next) {
  const started = Date.now();
  const key = `${req.method} ${req.path}`;

  ensureBucket(metrics.requests, key);
  metrics.requests[key] += 1;

  res.on("finish", () => {
    const elapsed = Date.now() - started;
    ensureBucket(metrics.latencyMs, key);
    const prev = metrics.latencyMs[key];
    metrics.latencyMs[key] = prev === 0 ? elapsed : Math.round(prev * 0.8 + elapsed * 0.2);
    if (res.statusCode >= 500) metrics.errors += 1;
  });

  next();
}

export function trackFallback(channel) {
  ensureBucket(metrics.fallbacks, channel);
  metrics.fallbacks[channel] += 1;
}

export function trackQuotaFailure() {
  metrics.quotaFailures += 1;
}

export function getMetricsSnapshot() {
  return {
    ...metrics,
    generatedAt: new Date().toISOString()
  };
}
