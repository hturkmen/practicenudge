"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ctaForHref, placementOf, trackEvent } from "@/lib/analytics";

const SIGNUP_COOKIE = "pn_signup";

/**
 * Mounted once in the root layout. It sends two kinds of events that no single page owns:
 * - cta_click, for every link to the pilot, the tracker or the explainer (found by where the link points),
 * - sign_up for Google, which the auth callback flags with a short-lived cookie because the account only exists after the redirect.
 */
export function AnalyticsEvents() {
  const pathname = usePathname();

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!link) return;
      const cta = ctaForHref(link.getAttribute("href"));
      if (!cta) return;
      trackEvent("cta_click", { cta, placement: placementOf(link), page_path: window.location.pathname });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    try {
      const match = document.cookie.match(new RegExp(`(?:^|; )${SIGNUP_COOKIE}=([^;]*)`));
      if (!match) return;
      document.cookie = `${SIGNUP_COOKIE}=; Max-Age=0; Path=/`;
      if (match[1] === "google") trackEvent("sign_up", { method: "google" });
    } catch {
      // Cookies blocked: nothing to report.
    }
  }, [pathname]);

  return null;
}
