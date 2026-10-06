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
    <nav aria-label="Language" className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-slate-500 dark:text-slate-400">
      {OPTIONS.filter((option) => option.locale !== current).map((option, i) => (
        <span key={option.locale} className="flex items-center gap-3">
          {i > 0 && <span aria-hidden>·</span>}
          <button
            type="button"
            lang={option.locale}
            dir={option.dir}
            disabled={pending}
            onClick={() => startTransition(async () => {
              await setUserLocale(option.locale);
              window.location.reload();
            })}
            className="underline-offset-4 hover:underline hover:text-slate-900 dark:hover:text-white disabled:opacity-50"
          >
            {option.label}
          </button>
        </span>
      ))}
    </nav>
  );
}
