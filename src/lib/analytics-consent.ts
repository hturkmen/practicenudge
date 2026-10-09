// The visitor's choice about analytics cookies. Google Analytics is not loaded at all until it is "granted".

export const ANALYTICS_CONSENT_KEY = "pn:analytics-consent:v1";
export const ANALYTICS_CONSENT_EVENT = "pn:analytics-consent-change";
export const GA_MEASUREMENT_ID = "G-B8P1PZSHZ9";

export type AnalyticsConsent = "granted" | "denied";

export function parseAnalyticsConsent(value: string | null | undefined): AnalyticsConsent | undefined {
  return value === "granted" || value === "denied" ? value : undefined;
}

export function readAnalyticsConsent(): AnalyticsConsent | undefined {
  try {
    return parseAnalyticsConsent(localStorage.getItem(ANALYTICS_CONSENT_KEY));
  } catch {
    return undefined;
  }
}

export function writeAnalyticsConsent(value: AnalyticsConsent) {
  try {
    localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
  } catch {
    // Storage blocked: the choice only lasts for this page view, and analytics stays off unless "granted" is set below.
  }
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: value }));
}

/** Forgets the choice, so the banner asks again. */
export function resetAnalyticsConsent() {
  try {
    localStorage.removeItem(ANALYTICS_CONSENT_KEY);
  } catch {
    // Nothing stored to remove.
  }
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_EVENT, { detail: undefined }));
}

/** Removes Google Analytics cookies from this site (previously sent data cannot be recalled). */
export function removeAnalyticsCookies() {
  for (const item of document.cookie.split(";")) {
    const name = item.split("=")[0]?.trim();
    if (!name || (name !== "_ga" && !name.startsWith("_ga_"))) continue;
    document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=.practicenudge.com; SameSite=Lax`;
    document.cookie = `${name}=; Max-Age=0; path=/; domain=www.practicenudge.com; SameSite=Lax`;
  }
}