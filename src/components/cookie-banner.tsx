"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  ANALYTICS_CONSENT_EVENT,
  readAnalyticsConsent,
  writeAnalyticsConsent,
} from "@/lib/analytics-consent";

/** Asks once about analytics cookies. Both answers are equally easy; nothing is tracked until "accept". */
export function CookieBanner() {
  const t = useTranslations("cookies");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(readAnalyticsConsent() === undefined);
    update();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, update);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, update);
  }, []);

  if (!visible) return null;

  const button =
    "inline-flex h-10 flex-1 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700";

  return (
    <div
      role="region"
      aria-label={t("label")}
      className="fixed inset-x-3 bottom-3 z-[60] rounded-xl border border-slate-200 bg-white p-4 shadow-lg dark:border-slate-700 dark:bg-slate-900 md:left-auto md:right-6 md:bottom-6 md:max-w-md"
    >
      <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
        {t("text")}{" "}
        <Link href="/privacy" className="font-medium text-teal-700 underline underline-offset-4 dark:text-teal-300">
          {t("privacy")}
        </Link>
      </p>
      <div className="mt-3 flex gap-2">
        <button type="button" className={button} onClick={() => writeAnalyticsConsent("granted")}>
          {t("accept")}
        </button>
        <button type="button" className={button} onClick={() => writeAnalyticsConsent("denied")}>
          {t("decline")}
        </button>
      </div>
    </div>
  );
}