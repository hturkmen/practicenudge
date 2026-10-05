import { createHmac } from "node:crypto";
import { describe, it, expect } from "vitest";
import { createUnsubscribeToken, verifyUnsubscribeToken } from "../tokens";
import { verifyResendWebhook } from "../webhook-signature";

const secret = "test-only-secret-that-is-long-enough-1234";
const contact = "3f0c5a52-9a51-4d7e-8f43-6f1f8f3b2a10";
const now = Date.parse("2026-10-05T12:00:00Z");

describe("unsubscribe tokens", () => {
  it("round-trips a contact ID", () => {
    expect(verifyUnsubscribeToken(createUnsubscribeToken(contact, secret, now), secret, now)).toEqual({ contactId: contact });
  });
  it("still works months later but not after a year", () => {
    const token = createUnsubscribeToken(contact, secret, now);
    expect(verifyUnsubscribeToken(token, secret, now + 200 * 86400000)).not.toBeNull();
    expect(verifyUnsubscribeToken(token, secret, now + 366 * 86400000)).toBeNull();
  });
  it("rejects tampering, a different secret and a missing secret", () => {
    const token = createUnsubscribeToken(contact, secret, now);
    const [payload, signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ c: "00000000-0000-4000-8000-000000000000", p: "unsubscribe", e: 9999999999 }))
      .toString("base64url");
    expect(verifyUnsubscribeToken(forged + "." + signature, secret, now)).toBeNull();
    expect(verifyUnsubscribeToken(payload + ".x" + signature.slice(2), secret, now)).toBeNull();
    expect(verifyUnsubscribeToken(token, "another-secret-that-is-long-enough-9876", now)).toBeNull();
    expect(verifyUnsubscribeToken(token, undefined, now)).toBeNull();
    expect(verifyUnsubscribeToken(Buffer.from(contact + ":unsubscribe").toString("base64url"), secret, now)).toBeNull();
  });
});

describe("Resend webhook signatures", () => {
  const key = Buffer.from("webhook-test-key").toString("base64");
  const webhookSecret = "whsec_" + key;
  const body = JSON.stringify({ type: "email.bounced", data: { email_id: "abc" } });
  const timestamp = String(Math.floor(now / 1000));
  const signature = createHmac("sha256", Buffer.from(key, "base64")).update(`msg_1.${timestamp}.${body}`).digest("base64");
  const headers = (sig: string, ts = timestamp) => new Headers({ "svix-id": "msg_1", "svix-timestamp": ts, "svix-signature": sig });

  it("accepts a valid signature, including alongside a rotated one", () => {
    expect(verifyResendWebhook(body, headers("v1," + signature), webhookSecret, now)).toBe(true);
    expect(verifyResendWebhook(body, headers("v1,oldsignature v1," + signature), webhookSecret, now)).toBe(true);
  });
  it("rejects a modified body, a replayed timestamp and a missing secret", () => {
    expect(verifyResendWebhook(body + " ", headers("v1," + signature), webhookSecret, now)).toBe(false);
    expect(verifyResendWebhook(body, headers("v1," + signature), webhookSecret, now + 10 * 60000)).toBe(false);
    expect(verifyResendWebhook(body, headers("v1," + signature), undefined, now)).toBe(false);
    expect(verifyResendWebhook(body, headers("v2," + signature), webhookSecret, now)).toBe(false);
  });
});
