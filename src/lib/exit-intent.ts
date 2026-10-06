// Pure trigger/suppression rules for the landing page exit-intent modal.
// No React and no DOM globals here: callers pass everything in, so the rules are unit-testable.

export const EXIT_INTENT_SUPPRESS_MS = 7 * 24 * 60 * 60 * 1000;
export const DESKTOP_MIN_DWELL_MS = 8_000;
export const MOBILE_MIN_DWELL_MS = 15_000;
export const MOBILE_MIN_SCROLL_DEPTH = 0.4;
export const MOBILE_MIN_SCROLL_UP_PX = 80;
export const MOBILE_MIN_SCROLL_UP_SPEED = 0.5; // px per ms

export const STORAGE_KEYS = {
  shown: "pn_exit_intent_shown",
  dismissedAt: "pn_exit_intent_dismissed_at",
  converted: "pn_exit_intent_converted",
} as const;

export interface ExitIntentState {
  now: number;
  lastDismissedAt: number | null;
  converted: boolean;
  shownThisSession: boolean;
  loggedIn: boolean;
}

export function shouldShowExitIntent(s: ExitIntentState): boolean {
  if (s.converted || s.shownThisSession || s.loggedIn) return false;
  if (s.lastDismissedAt !== null) {
    // A timestamp in the future (clock change) is treated as a fresh dismissal.
    if (s.lastDismissedAt > s.now) return false;
    if (s.now - s.lastDismissedAt < EXIT_INTENT_SUPPRESS_MS) return false;
  }
  return true;
}

export function parseTimestamp(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

export function isDesktopExitEvent(e: { clientY: number; hasRelatedTarget: boolean; dwellMs: number }): boolean {
  return e.clientY <= 0 && !e.hasRelatedTarget && e.dwellMs >= DESKTOP_MIN_DWELL_MS;
}

export function isMobileExitScroll(e: {
  maxDepthRatio: number;
  scrolledUpPx: number;
  elapsedMs: number;
  dwellMs: number;
}): boolean {
  return (
    e.dwellMs >= MOBILE_MIN_DWELL_MS &&
    e.maxDepthRatio >= MOBILE_MIN_SCROLL_DEPTH &&
    e.scrolledUpPx >= MOBILE_MIN_SCROLL_UP_PX &&
    e.elapsedMs > 0 &&
    e.scrolledUpPx / e.elapsedMs >= MOBILE_MIN_SCROLL_UP_SPEED
  );
}

// @supabase/ssr stores the session in a readable cookie named sb-<ref>-auth-token (optionally chunked .0, .1).
export function hasSupabaseAuthCookie(cookie: string): boolean {
  return /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=[^;]+/.test(cookie);
}
