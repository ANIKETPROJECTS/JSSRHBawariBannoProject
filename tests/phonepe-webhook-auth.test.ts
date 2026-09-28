import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { phonePeShaWebhookAuthorized } from "../src/lib/phonepe-webhook-auth";

describe("PhonePe SHA webhook authorization", () => {
  const username = "store-webhook";
  const password = "test-only-password";
  const signature = createHash("sha256").update(`${username}:${password}`).digest("hex");

  test("accepts the configured SHA256 username/password hash", () => {
    expect(phonePeShaWebhookAuthorized(signature, username, password)).toBe(true);
  });

  test("accepts a SHA256-prefixed header", () => {
    expect(phonePeShaWebhookAuthorized(`SHA256=${signature}`, username, password)).toBe(true);
  });

  test("rejects mismatched, missing, and empty credentials", () => {
    expect(phonePeShaWebhookAuthorized(signature, username, "wrong-password")).toBe(false);
    expect(phonePeShaWebhookAuthorized(null, username, password)).toBe(false);
    expect(phonePeShaWebhookAuthorized(signature, "", password)).toBe(false);
  });
});