import { createApp } from "./app.js";
import { getSignups, isConfigured, closeDb } from "./db.js";

const port = Number(process.env.PORT) || 3000;
const server = createApp().listen(port, "0.0.0.0", () => {
  console.log(`listening on :${port}`);
});

// Best-effort index creation at startup; the process stays up if the DB is down
// (getSignups retries lazily on the next request).
if (isConfigured()) {
  getSignups()
    .then(() => console.log("indexes ready"))
    .catch((err) => console.error("startup index creation failed:", err?.name || "Error"));
}

for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    server.close(() => closeDb().finally(() => process.exit(0)));
  });
}
