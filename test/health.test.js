import { test } from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../src/app.js";
import { withServer } from "./helpers.js";

test("GET /health is 200 with db up", async () => {
  await withServer(createApp({ dbStatus: async () => "up" }), async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "ok", db: "up" });
  });
});

test("GET /health is 200 even when the db is down or throws", async () => {
  for (const dbStatus of [async () => "down", async () => { throw new Error("boom"); }]) {
    await withServer(createApp({ dbStatus }), async (base) => {
      const res = await fetch(`${base}/health`);
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { status: "ok", db: "down" });
    });
  }
});

test("GET /health works with no MONGODB_URI (real db module)", async () => {
  delete process.env.MONGODB_URI;
  await withServer(createApp(), async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.equal((await res.json()).db, "down");
  });
});

test("GET / serves the home page", async () => {
  await withServer(createApp(), async (base) => {
    const res = await fetch(`${base}/`);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /<html/i);
  });
});
