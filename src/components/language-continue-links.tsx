"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";
import { setUserLocale } from "@/i18n/locale";
import type { Locale } from "@/i18n/config";

// Each option is written in its own language, so speakers recognise it at a glance.
const OPTIONS: { locale: Locale; label: string; dir?: "rtl" }[] = [
  { locale: "en", label: "Continue in English" },
  { locale: "pl", label: "Kontynuuj po polsku" },
  { locale: "ro", label: "Continuă în română" },
  { locale: "tr", label: "Türkçe devam et" },
  { locale: "ur", label: "اردو میں جاری رکھیں", dir: "rtl" },
];

export function LanguageContinueLinks() {
  const current = useLocale();
  const [pending, startTransition] = useTransition();

  return (
    <nav aria-label="Language" className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
      {OPTIONS.filter((option) => option.locale !== current).map((option) => (
        <button
          key={option.locale}
          type="button"
          lang={option.locale}
          dir={option.dir}
          disabled={pending}
          onClick={() => startTransition(async () => {
            await setUserLocale(option.locale);
            window.location.reload();
          })}
          className="font-medium text-teal-700 underline underline-offset-4 hover:text-teal-900 dark:text-teal-300 dark:hover:text-teal-100 disabled:opacity-50"
        >
          {option.label}
        </button>
      ))}
    </nav>
  );
}
