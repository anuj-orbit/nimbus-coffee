// In-memory fake of the `signups` collection (updateOne upsert + unique email).
export function fakeSignups({ failWith } = {}) {
  const docs = [];
  return {
    docs,
    calls: 0,
    async updateOne(filter, update, opts) {
      this.calls += 1;
      if (failWith) throw failWith;
      await Promise.resolve(); // yield, to let parallel requests interleave
      const found = docs.find((d) => d.email === filter.email);
      if (found) return { upsertedCount: 0, matchedCount: 1 };
      if (!opts?.upsert) return { upsertedCount: 0, matchedCount: 0 };
      docs.push({ ...update.$setOnInsert });
      return { upsertedCount: 1, matchedCount: 0 };
    },
  };
}

export async function withServer(app, fn) {
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    return await fn(base);
  } finally {
    await new Promise((r) => server.close(r));
  }
}

export const post = (base, body, raw = false) =>
  fetch(`${base}/api/subscribe`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: raw ? body : JSON.stringify(body),
  });
