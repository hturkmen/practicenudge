import { createHmac, timingSafeEqual } from "node:crypto";

const TOLERANCE_SECONDS = 300;

/**
 * Verifies a Resend webhook (Svix scheme): HMAC-SHA256 over "id.timestamp.body" with the
 * base64 key after "whsec_". Old timestamps are rejected so a captured request cannot be replayed.
 */
export function verifyResendWebhook(payload: string, headers: Headers, secret: string | undefined, now = Date.now()): boolean {
  if (!secret || !secret.startsWith("whsec_")) return false;
  const id = headers.get("svix-id");
  const timestamp = headers.get("svix-timestamp");
  const signatures = headers.get("svix-signature");
  if (!id || !timestamp || !signatures || !/^\d+$/.test(timestamp)) return false;
  if (Math.abs(now / 1000 - Number(timestamp)) > TOLERANCE_SECONDS) return false;
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  if (key.length === 0) return false;
  const expected = Buffer.from(createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest("base64"));
  return signatures.split(" ").some((entry) => {
    const [version, signature] = entry.split(",");
    if (version !== "v1" || !signature) return false;
    const actual = Buffer.from(signature);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  });
}
