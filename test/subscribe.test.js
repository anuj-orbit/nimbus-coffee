import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { ensureIndexes } from "../src/db.js";
import { fakeSignups, withServer, post } from "./helpers.js";

const appWith = (col, extra = {}) => createApp({ getSignups: async () => col, ...extra });

test("new email -> 201, stored normalized with createdAt", async () => {
  const col = fakeSignups();
  await withServer(appWith(col), async (base) => {
    const res = await post(base, { email: "  Jane@Example.com " });
    assert.equal(res.status, 201);
    assert.deepEqual(await res.json(), { ok: true, status: "subscribed" });
    assert.equal(col.docs.length, 1);
    assert.equal(col.docs[0].email, "jane@example.com");
    assert.ok(col.docs[0].createdAt instanceof Date);
  });
});

test("duplicate (any case/whitespace) -> 200 already_subscribed, one doc", async () => {
  const col = fakeSignups();
  await withServer(appWith(col), async (base) => {
    assert.equal((await post(base, { email: "a@b.co" })).status, 201);
    const res = await post(base, { email: " A@B.CO " });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true, status: "already_subscribed" });
    assert.equal(col.docs.length, 1);
  });
});

test("invalid emails -> 400 and DB untouched", async () => {
  const col = fakeSignups();
  await withServer(appWith(col), async (base) => {
    for (const body of [{}, { email: 5 }, { email: "nope" }, { email: "a@b" }, { email: "a".repeat(260) + "@x.com" }, null]) {
      const res = await post(base, body);
      assert.equal(res.status, 400);
      assert.deepEqual(await res.json(), { ok: false, error: "invalid_email" });
    }
    const bad = await post(base, "{not json", true);
    assert.equal(bad.status, 400);
    assert.equal(col.calls, 0);
  });
});

test("oversize body -> 413 JSON, no crash", async () => {
  await withServer(appWith(fakeSignups()), async (base) => {
    const res = await post(base, { email: "a@b.co", pad: "x".repeat(20_000) });
    assert.equal(res.status, 413);
    assert.equal((await res.json()).ok, false);
  });
});

test("parallel identical requests -> one doc, no 5xx", async () => {
  const col = fakeSignups();
  await withServer(appWith(col), async (base) => {
    const rs = await Promise.all(Array.from({ length: 10 }, () => post(base, { email: "race@x.io" })));
    const codes = rs.map((r) => r.status);
    assert.ok(codes.every((c) => c === 200 || c === 201), codes.join());
    assert.equal(col.docs.length, 1);
  });
});

test("duplicate-key race error (11000) -> 200", async () => {
  const col = fakeSignups({ failWith: Object.assign(new Error("dup"), { code: 11000 }) });
  await withServer(appWith(col), async (base) => {
    const res = await post(base, { email: "a@b.co" });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).status, "already_subscribed");
  });
});

test("DB down -> 503 JSON without leaking details; process alive", async () => {
  const app = createApp({
    getSignups: async () => { throw new Error("secret connection string"); },
    dbStatus: async () => "down",
  });
  await withServer(app, async (base) => {
    const res = await post(base, { email: "a@b.co" });
    assert.equal(res.status, 503);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), { ok: false, error: "unavailable" });
    assert.ok(!text.includes("secret"));
    assert.equal((await fetch(`${base}/health`)).status, 200);
  });
});

test("rate limit -> 429 after max requests", async () => {
  const col = fakeSignups();
  await withServer(appWith(col, { rateLimitMax: 3 }), async (base) => {
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await post(base, { email: `u${i}@x.io` })).status);
    assert.deepEqual(codes, [201, 201, 201, 429, 429]);
    const res = await post(base, { email: "z@x.io" });
    assert.deepEqual(await res.json(), { ok: false, error: "rate_limited" });
    assert.ok(res.headers.get("retry-after"));
  });
});

test("ensureIndexes creates unique uniq_email index", async () => {
  const created = [];
  await ensureIndexes({ createIndex: async (keys, opts) => created.push({ keys, opts }) });
  const idx = created.find((c) => c.opts.name === "uniq_email");
  assert.deepEqual(idx.keys, { email: 1 });
  assert.equal(idx.opts.unique, true);
});
