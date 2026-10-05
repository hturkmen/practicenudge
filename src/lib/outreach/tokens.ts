import { createHmac, timingSafeEqual } from "node:crypto";

const PURPOSE = "unsubscribe";
// Long-lived on purpose: an opt-out link must keep working well after the email was sent.
const VALIDITY_SECONDS = 365 * 86400;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** No fallback secret: a well-known default would let anyone forge an unsubscribe for anyone. */
export function getTokenSecret(): string | undefined {
  const secret = process.env.OUTREACH_TOKEN_SECRET;
  return secret && secret.length >= 32 ? secret : undefined;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(PURPOSE + "." + payload).digest("base64url");
}

/** Signed, single-purpose, expiring token naming a contact record, never an email address. */
export function createUnsubscribeToken(contactId: string, secret: string, now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({
    c: contactId, p: PURPOSE, e: Math.floor(now / 1000) + VALIDITY_SECONDS,
  })).toString("base64url");
  return payload + "." + sign(payload, secret);
}

export function verifyUnsubscribeToken(token: unknown, secret: string | undefined, now = Date.now()): { contactId: string } | null {
  if (!secret || typeof token !== "string" || token.length > 512) return null;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  const expected = Buffer.from(sign(parts[0], secret));
  const actual = Buffer.from(parts[1]);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const data = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    if (data?.p !== PURPOSE || typeof data.c !== "string" || !UUID.test(data.c)) return null;
    if (typeof data.e !== "number" || data.e * 1000 < now) return null;
    return { contactId: data.c };
  } catch {
    return null;
  }
}
