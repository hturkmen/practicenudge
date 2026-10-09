"use client";

import { useTranslations } from "next-intl";
import { resetAnalyticsConsent } from "@/lib/analytics-consent";

/** Footer link that lets a visitor change their mind: it brings the cookie banner back. */
export function CookieSettingsButton({ className }: { className?: string }) {
  const t = useTranslations("cookies");
  return (
    <button type="button" onClick={resetAnalyticsConsent} className={className}>
      {t("settings")}
    </button>
  );
}