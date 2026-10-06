import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./locale";
import en from "../messages/en.json";

type Messages = { [key: string]: string | Messages };

// English fills any key a translation does not have yet, so new copy never shows a raw key.
function withFallback(base: Messages, override: Messages): Messages {
  const merged: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const fallback = base[key];
    merged[key] = typeof value === "object" && typeof fallback === "object" ? withFallback(fallback, value) : value;
  }
  return merged;
}

export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  const messages = locale === "en"
    ? en
    : withFallback(en as Messages, (await import(`../messages/${locale}.json`)).default as Messages);

  return { locale, messages };
});
