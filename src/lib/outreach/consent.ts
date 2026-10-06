import type { Locale } from "@/i18n/config";

/**
 * The exact wording people agree to. Change the version whenever the text changes, so each
 * recorded consent can be traced back to what was shown.
 */
export const SIGNUP_CONSENT_VERSION = "register-2026-10";
export const SIGNUP_CONSENT_TEXT =
  "Email me occasional tips for getting set up and news about PracticeNudge. I can unsubscribe at any time.";

// The sign-up page shows the tick-box in the visitor's language. Each language is its own wording
// version ("register-2026-10-tr"), so a recorded consent traces back to the exact text that was shown.
const SIGNUP_CONSENT_TRANSLATIONS: Record<Exclude<Locale, "en">, string> = {
  tr: "Kurulum ipuçlarını ve PracticeNudge haberlerini ara sıra e-postayla gönderin. İstediğim zaman abonelikten çıkabilirim.",
  pl: "Chcę od czasu do czasu otrzymywać e-mailem wskazówki dotyczące konfiguracji i nowości o PracticeNudge. Mogę się wypisać w dowolnym momencie.",
  ro: "Vreau să primesc din când în când e-mailuri cu sfaturi de configurare și noutăți despre PracticeNudge. Mă pot dezabona oricând.",
  ur: "کبھی کبھار سیٹ اپ کے مشورے اور PracticeNudge کی خبریں مجھے ای میل کیجیے۔ سبسکرپشن کسی بھی وقت ختم کی جا سکتی ہے۔",
  bn: "সেটআপের টিপস এবং PracticeNudge-এর খবর মাঝে মাঝে আমাকে ইমেইল করুন। আমি যেকোনো সময় আনসাবস্ক্রাইব করতে পারি।",
  pa: "ਸੈੱਟਅੱਪ ਲਈ ਸੁਝਾਅ ਅਤੇ PracticeNudge ਦੀਆਂ ਖ਼ਬਰਾਂ ਮੈਨੂੰ ਕਦੇ-ਕਦੇ ਈਮੇਲ ਕਰੋ। ਸਬਸਕ੍ਰਿਪਸ਼ਨ ਕਿਸੇ ਵੀ ਸਮੇਂ ਬੰਦ ਕੀਤੀ ਜਾ ਸਕਦੀ ਹੈ।",
  de: "Senden Sie mir gelegentlich Tipps zur Einrichtung und Neuigkeiten zu PracticeNudge per E-Mail. Ich kann mich jederzeit abmelden.",
  fr: "Envoyez-moi de temps en temps des conseils de prise en main et des nouvelles de PracticeNudge par e-mail. Je peux me désabonner à tout moment.",
  es: "Envíame de vez en cuando consejos para empezar y novedades de PracticeNudge por correo. Puedo darme de baja en cualquier momento.",
};

/** The wording and wording version for the sign-up tick-box in this language (English if there is no translation). */
export function signupConsent(locale: string): { version: string; text: string } {
  const text = (SIGNUP_CONSENT_TRANSLATIONS as Record<string, string>)[locale];
  return text
    ? { version: `${SIGNUP_CONSENT_VERSION}-${locale}`, text }
    : { version: SIGNUP_CONSENT_VERSION, text: SIGNUP_CONSENT_TEXT };
}

/** True for a wording version this build can have shown on the sign-up page. */
export function isSignupConsentVersion(value: string | undefined): boolean {
  return (
    value === SIGNUP_CONSENT_VERSION ||
    Object.keys(SIGNUP_CONSENT_TRANSLATIONS).some((locale) => value === `${SIGNUP_CONSENT_VERSION}-${locale}`)
  );
}

// Asked once in the dashboard of owners who have not decided (for example Google sign-ups from /login).
export const PROMPT_CONSENT_VERSION = "dashboard-2026-10";
export const PROMPT_CONSENT_TEXT =
  "Would you like occasional emails with tips for getting set up and news about PracticeNudge? You can unsubscribe at any time.";

/** Carries a Google sign-up's consent choice across the OAuth redirect; read once by the auth callback. */
export const CONSENT_COOKIE = "pn_marketing_consent";

// Shown on the /mtd form since 22 May 2026. It covers exactly one follow-up email, nothing more.
export const LEAD_FORM_VERSION = "mtd-2026-05";
export const LEAD_FORM_PROMISE = "No spam. We'll send the template link and one follow-up about PracticeNudge.";
