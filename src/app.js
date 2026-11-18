import express from "express";
import { fileURLToPath } from "node:url";
import { dbStatus, getSignups } from "./db.js";
import { rateLimit } from "./rateLimit.js";
import { subscribeRouter } from "./routes/subscribe.js";

/**
 * @param {object} [deps] injectable for tests
 */
export function createApp({
  getSignups: getCol = getSignups,
  dbStatus: getDbStatus = dbStatus,
  rateLimitMax = 20,
  rateLimitWindowMs = 60_000,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);

  app.get("/health", async (_req, res) => {
    let db;
    try {
      db = await getDbStatus();
    } catch {
      db = "down";
    }
    res.status(200).json({ status: "ok", db });
  });

  const limiter = rateLimit({ max: rateLimitMax, windowMs: rateLimitWindowMs });
  app.use("/api", express.json({ limit: "10kb" }));
  app.use("/api", subscribeRouter({ getSignups: getCol, limiter }));

  const publicDir = fileURLToPath(new URL("../public", import.meta.url));
  app.use(express.static(publicDir));
  app.use("/static", express.static(publicDir));

  // JSON error handler (bad JSON, oversize body): no stack traces.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, _next) => {
    const status = err?.status >= 400 && err?.status < 500 ? err.status : 500;
    if (req.path.startsWith("/api/") && status === 400) {
      return res.status(400).json({ ok: false, error: "invalid_email" });
    }
    res.status(status).json({ ok: false, error: status === 500 ? "internal" : "bad_request" });
  });

  return app;
}
