const WINDOW_MS = 60 * 1000;
const LIMIT = 100;
const buckets = new Map();

function getClientKey(req) {
  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return `token:${authHeader.slice(7)}`;
  }
  if (req.cookies?.agrivision_session) {
    return `cookie:${req.cookies.agrivision_session}`;
  }
  return `ip:${req.ip}`;
}

export function agrosenseRateLimit(req, res, next) {
  const key = getClientKey(req);
  const now = Date.now();
  const recent = (buckets.get(key) || []).filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recent.length >= LIMIT) {
    return res.status(429).json({
      ok: false,
      error: "Rate limit exceeded. Maximum 100 requests per minute per token."
    });
  }

  recent.push(now);
  buckets.set(key, recent);
  return next();
}
