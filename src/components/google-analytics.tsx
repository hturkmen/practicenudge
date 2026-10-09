"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import {
  ANALYTICS_CONSENT_EVENT,
  GA_MEASUREMENT_ID,
  readAnalyticsConsent,
  removeAnalyticsCookies,
  type AnalyticsConsent,
} from "@/lib/analytics-consent";

/**
 * Loads Google Analytics only after the visitor accepted analytics cookies. Nothing is requested from Google
 * before that. If the visitor later declines, tracking is switched off and the cookies are removed.
 */
export function GoogleAnalytics() {
  const [consent, setConsent] = useState<AnalyticsConsent | undefined>(undefined);

  useEffect(() => {
    const update = () => setConsent(readAnalyticsConsent());
    update();
    window.addEventListener(ANALYTICS_CONSENT_EVENT, update);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, update);
  }, []);

  useEffect(() => {
    if (consent === "granted") {
      (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
    } else {
      (window as unknown as Record<string, unknown>)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
      removeAnalyticsCookies();
    }
  }, [consent]);

  if (consent !== "granted") return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          // Own visits are tagged so a GA4 data filter (traffic_type = internal) can drop them. A browser is marked
          // by opening any page with ?pn_internal=1 (and ?pn_internal=0 to undo). Local development counts as internal.
          var internal = /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname);
          try {
            if (location.search.indexOf('pn_internal=1') > -1) localStorage.setItem('pn_internal', '1');
            if (location.search.indexOf('pn_internal=0') > -1) localStorage.removeItem('pn_internal');
            internal = internal || localStorage.getItem('pn_internal') === '1';
          } catch (e) {}
          gtag('set', 'user_properties', { site_language: document.documentElement.lang || 'en' });
          gtag('config', '${GA_MEASUREMENT_ID}', internal ? { traffic_type: 'internal' } : {});
        `}
      </Script>
    </>
  );
}