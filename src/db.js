import { MongoClient } from "mongodb";

let client;
let connecting;
let indexesReady = false;

export function isConfigured() {
  return Boolean(process.env.MONGODB_URI);
}

async function connect() {
  if (client) return client;
  connecting ??= (async () => {
    const c = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
    try {
      await c.connect();
    } catch (err) {
      await c.close().catch(() => {});
      throw err;
    }
    client = c;
    return c;
  })().finally(() => {
    connecting = undefined;
  });
  return connecting;
}

/** Idempotently create indexes on the signups collection. */
export async function ensureIndexes(collection) {
  await collection.createIndex({ email: 1 }, { unique: true, name: "uniq_email" });
  await collection.createIndex({ createdAt: -1 }, { name: "createdAt_desc" });
}

/** Returns the signups collection (indexes ensured once). Throws if DB is unreachable. */
export async function getSignups() {
  if (!isConfigured()) throw new Error("MONGODB_URI not configured");
  const c = await connect();
  const db = c.db(process.env.MONGODB_DB || undefined);
  const col = db.collection("signups");
  if (!indexesReady) {
    await ensureIndexes(col);
    indexesReady = true;
  }
  return col;
}

/** "up" | "down" — never throws. */
export async function dbStatus() {
  if (!isConfigured()) return "down";
  try {
    const c = await connect();
    await c.db(process.env.MONGODB_DB || undefined).command({ ping: 1 });
    return "up";
  } catch {
    return "down";
  }
}

export async function closeDb() {
  const c = client;
  client = undefined;
  indexesReady = false;
  if (c) await c.close().catch(() => {});
}
