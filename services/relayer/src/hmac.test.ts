import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "./hmac.js";

describe("verifyWebhookSignature", () => {
  const secret = "test-secret";
  const timestamp = "1700000000";
  const body = '{"reference":"deposit-1"}';
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  it("accepts a valid signature", () => {
    expect(verifyWebhookSignature(secret, timestamp, body, signature, 1700000000)).toEqual({
      valid: true,
    });
  });

  it("rejects an invalid signature", () => {
    expect(verifyWebhookSignature(secret, timestamp, body, "0".repeat(64), 1700000000)).toEqual({
      valid: false,
      reason: "invalid_signature",
    });
  });

  it("rejects an expired timestamp", () => {
    expect(verifyWebhookSignature(secret, timestamp, body, signature, 1700000301)).toEqual({
      valid: false,
      reason: "expired",
    });
  });
});
