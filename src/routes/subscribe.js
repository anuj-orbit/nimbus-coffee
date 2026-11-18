import { Router } from "express";
import { normalizeEmail } from "../validate.js";

export function subscribeRouter({ getSignups, limiter }) {
  const router = Router();

  router.post("/subscribe", limiter, async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ ok: false, error: "invalid_email" });

    try {
      const col = await getSignups();
      const result = await col.updateOne(
        { email },
        { $setOnInsert: { email, createdAt: new Date() } },
        { upsert: true },
      );
      if (result.upsertedCount > 0) {
        return res.status(201).json({ ok: true, status: "subscribed" });
      }
      return res.status(200).json({ ok: true, status: "already_subscribed" });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(200).json({ ok: true, status: "already_subscribed" });
      }
      console.error("subscribe failed:", err?.name || "Error");
      return res.status(503).json({ ok: false, error: "unavailable" });
    }
  });

  return router;
}
