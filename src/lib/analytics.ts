// Thin wrapper around Google Analytics (gtag is loaded in the root layout).
// No personal data goes in here: never an email, a name or a practice name.

type Gtag = (command: "event", name: string, params?: Record<string, string | number | boolean>) => void;

export type AnalyticsEvent =
  | "generate_lead" // the MTD tracker request form was submitted
  | "sign_up" // a new account was created (method: email | google)
  | "sign_up_start" // the Google sign-up button was pressed (the account is only known after the redirect)
  | "cta_click"; // a link to the pilot, the tracker or the explainer was clicked

export function trackEvent(name: AnalyticsEvent, params: Record<string, string | number | boolean> = {}) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return;
  try {
    gtag("event", name, params);
  } catch {
    // Analytics must never break the page.
  }
}

/** Which call to action a link is, judged from where it points. Null for any other link. */
export function ctaForHref(href: string | null): "join_pilot" | "get_tracker" | "read_explainer" | null {
  if (!href) return null;
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "");
  if (href === "#get-tracker" || path === "/mtd") return "get_tracker";
  if (path === "/register") return "join_pilot";
  if (path === "/what-is-mtd") return "read_explainer";
  return null;
}

/** Where on the page a link sits, so header, hero and footer clicks can be told apart. */
export function placementOf(el: Element): string {
  if (el.closest("header, nav")) return "header";
  if (el.closest("footer")) return "footer";
  const marked = el.closest("[data-cta-location]");
  if (marked) return marked.getAttribute("data-cta-location") || "body";
  const section = el.closest("section[id]");
  if (section) return section.id;
  if (el.closest("section")) return "section";
  return "body";
}
