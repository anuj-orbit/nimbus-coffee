import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail } from "../src/validate.js";

test("normalizes trim + lowercase", () => {
  assert.equal(normalizeEmail("  Foo@Example.COM \n"), "foo@example.com");
});

test("rejects invalid input", () => {
  const long = `${"a".repeat(250)}@x.io`;
  for (const bad of [undefined, null, 42, {}, [], "", "   ", "foo", "foo@", "@x.com", "a b@x.com", "a@b", "a@@b.com", "a@b..com", long]) {
    assert.equal(normalizeEmail(bad), null, String(bad));
  }
});

test("accepts max length 254", () => {
  const email = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(57)}.com`;
  assert.equal(email.length, 254);
  assert.equal(normalizeEmail(email), email);
});
