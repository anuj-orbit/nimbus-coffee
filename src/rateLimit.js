/** Minimal in-memory fixed-window rate limiter, keyed by client IP. */
export function rateLimit({ windowMs = 60_000, max = 20 } = {}) {
  const hits = new Map();
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, v] of hits) if (v.reset <= now) hits.delete(key);
  }, windowMs);
  timer.unref();

  return function limiter(req, res, next) {
    const now = Date.now();
    const key = req.ip || "unknown";
    let entry = hits.get(key);
    if (!entry || entry.reset <= now) {
      entry = { count: 0, reset: now + windowMs };
      hits.set(key, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set("Retry-After", String(Math.ceil((entry.reset - now) / 1000)));
      return res.status(429).json({ ok: false, error: "rate_limited" });
    }
    return next();
  };
}
