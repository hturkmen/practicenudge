export const locales = ["en", "pl", "ro", "ur", "bn", "pa", "tr", "de", "fr", "es"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  pl: "Polski",
  ro: "Română",
  ur: "اردو",
  bn: "বাংলা",
  pa: "ਪੰਜਾਬੀ",
  tr: "Türkçe",
  de: "Deutsch",
  fr: "Français",
  es: "Español",
};

// RTL languages
export const rtlLocales: Locale[] = ["ur"];

export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}
