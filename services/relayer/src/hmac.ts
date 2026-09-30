import { createHmac, timingSafeEqual } from "node:crypto";

export type SignatureCheck =
  | { valid: true }
  | { valid: false; reason: "invalid_timestamp" | "expired" | "invalid_signature" };

export function verifyWebhookSignature(
  secret: string,
  timestamp: string,
  rawBody: string | Buffer,
  signature: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): SignatureCheck {
  if (!/^\d+$/.test(timestamp)) {
    return { valid: false, reason: "invalid_timestamp" };
  }

  const timestampSeconds = Number(timestamp);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > 300
  ) {
    return { valid: false, reason: "expired" };
  }

  if (!/^[0-9a-f]{64}$/i.test(signature)) {
    return { valid: false, reason: "invalid_signature" };
  }

  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest();
  const received = Buffer.from(signature, "hex");
  return timingSafeEqual(expected, received)
    ? { valid: true }
    : { valid: false, reason: "invalid_signature" };
}
