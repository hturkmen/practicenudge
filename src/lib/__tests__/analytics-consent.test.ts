import { describe, expect, it } from "vitest";
import { parseAnalyticsConsent } from "../analytics-consent";

describe("parseAnalyticsConsent", () => {
  it("accepts only the two stored values", () => {
    expect(parseAnalyticsConsent("granted")).toBe("granted");
    expect(parseAnalyticsConsent("denied")).toBe("denied");
  });

  it("treats anything else as no choice made", () => {
    expect(parseAnalyticsConsent(null)).toBeUndefined();
    expect(parseAnalyticsConsent(undefined)).toBeUndefined();
    expect(parseAnalyticsConsent("accepted")).toBeUndefined();
    expect(parseAnalyticsConsent("true")).toBeUndefined();
    expect(parseAnalyticsConsent("")).toBeUndefined();
  });
});