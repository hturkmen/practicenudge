/**
 * The exact wording people agree to. Change the version whenever the text changes, so each
 * recorded consent can be traced back to what was shown.
 */
export const SIGNUP_CONSENT_VERSION = "register-2026-10";
export const SIGNUP_CONSENT_TEXT =
  "Email me occasional tips for getting set up and news about PracticeNudge. I can unsubscribe at any time.";

// Asked once in the dashboard of owners who have not decided (for example Google sign-ups from /login).
export const PROMPT_CONSENT_VERSION = "dashboard-2026-10";
export const PROMPT_CONSENT_TEXT =
  "Would you like occasional emails with tips for getting set up and news about PracticeNudge? You can unsubscribe at any time.";

/** Carries a Google sign-up's consent choice across the OAuth redirect; read once by the auth callback. */
export const CONSENT_COOKIE = "pn_marketing_consent";

// Shown on the /mtd form since 22 May 2026. It covers exactly one follow-up email, nothing more.
export const LEAD_FORM_VERSION = "mtd-2026-05";
export const LEAD_FORM_PROMISE = "No spam. We'll send the template link and one follow-up about PracticeNudge.";
