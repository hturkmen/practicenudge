import { describe, expect, it } from "vitest";
import { locales } from "../../../i18n/config";
import { isSignupConsentVersion, SIGNUP_CONSENT_TEXT, SIGNUP_CONSENT_VERSION, signupConsent } from "../consent";

describe("sign-up consent wording", () => {
  it("keeps the English wording and its original version", () => {
    expect(signupConsent("en")).toEqual({ version: SIGNUP_CONSENT_VERSION, text: SIGNUP_CONSENT_TEXT });
    expect(SIGNUP_CONSENT_VERSION).toBe("register-2026-10");
  });

  it("has its own wording and version for every other language", () => {
    const seen = new Set<string>();
    for (const locale of locales.filter((l) => l !== "en")) {
      const { version, text } = signupConsent(locale);
      expect(version).toBe(`${SIGNUP_CONSENT_VERSION}-${locale}`);
      expect(text).not.toBe(SIGNUP_CONSENT_TEXT);
      expect(text).toContain("PracticeNudge");
      seen.add(text);
    }
    expect(seen.size).toBe(locales.length - 1);
  });

  it("falls back to English for an unknown language", () => {
    expect(signupConsent("xx")).toEqual({ version: SIGNUP_CONSENT_VERSION, text: SIGNUP_CONSENT_TEXT });
  });

  it("accepts only versions this build can have shown", () => {
    expect(isSignupConsentVersion(SIGNUP_CONSENT_VERSION)).toBe(true);
    for (const locale of locales) expect(isSignupConsentVersion(signupConsent(locale).version)).toBe(true);
    expect(isSignupConsentVersion("register-2026-10-xx")).toBe(false);
    expect(isSignupConsentVersion("dashboard-2026-10")).toBe(false);
    expect(isSignupConsentVersion("")).toBe(false);
    expect(isSignupConsentVersion(undefined)).toBe(false);
  });
});
