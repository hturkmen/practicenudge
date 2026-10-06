import { describe, it, expect } from "vitest";
import {
  EXIT_INTENT_SUPPRESS_MS,
  DESKTOP_MIN_DWELL_MS,
  MOBILE_MIN_DWELL_MS,
  shouldShowExitIntent,
  parseTimestamp,
  isDesktopExitEvent,
  isMobileExitScroll,
  hasSupabaseAuthCookie,
} from "../exit-intent";

const NOW = 1_700_000_000_000;
const DAY = 24 * 60 * 60 * 1000;
const base = { now: NOW, lastDismissedAt: null, converted: false, shownThisSession: false, loggedIn: false };

describe("shouldShowExitIntent", () => {
  it("shows on a first visit", () => {
    expect(shouldShowExitIntent(base)).toBe(true);
  });

  it("never shows after the CTA was clicked", () => {
    expect(shouldShowExitIntent({ ...base, converted: true })).toBe(false);
  });

  it("shows at most once per session", () => {
    expect(shouldShowExitIntent({ ...base, shownThisSession: true })).toBe(false);
  });

  it("does not show to logged-in users", () => {
    expect(shouldShowExitIntent({ ...base, loggedIn: true })).toBe(false);
  });

  it("stays suppressed for 7 days after a dismissal", () => {
    expect(shouldShowExitIntent({ ...base, lastDismissedAt: NOW - DAY })).toBe(false);
    expect(shouldShowExitIntent({ ...base, lastDismissedAt: NOW - EXIT_INTENT_SUPPRESS_MS + 1 })).toBe(false);
  });

  it("shows again once 7 days have passed", () => {
    expect(shouldShowExitIntent({ ...base, lastDismissedAt: NOW - EXIT_INTENT_SUPPRESS_MS })).toBe(true);
    expect(shouldShowExitIntent({ ...base, lastDismissedAt: NOW - 8 * DAY })).toBe(true);
  });

  it("treats a future dismissal timestamp as suppressed", () => {
    expect(shouldShowExitIntent({ ...base, lastDismissedAt: NOW + DAY })).toBe(false);
  });
});

describe("parseTimestamp", () => {
  it("returns null for missing or invalid values", () => {
    expect(parseTimestamp(null)).toBeNull();
    expect(parseTimestamp("")).toBeNull();
    expect(parseTimestamp("abc")).toBeNull();
    expect(parseTimestamp("-5")).toBeNull();
    expect(parseTimestamp("0")).toBeNull();
    expect(parseTimestamp("12.5")).toBeNull();
  });

  it("parses a valid millisecond timestamp", () => {
    expect(parseTimestamp("1700000000000")).toBe(1_700_000_000_000);
  });
});

describe("isDesktopExitEvent", () => {
  const ok = { clientY: 0, hasRelatedTarget: false, dwellMs: DESKTOP_MIN_DWELL_MS };

  it("fires when the pointer leaves through the top after the dwell time", () => {
    expect(isDesktopExitEvent(ok)).toBe(true);
    expect(isDesktopExitEvent({ ...ok, clientY: -1 })).toBe(true);
  });

  it("does not fire before the dwell time", () => {
    expect(isDesktopExitEvent({ ...ok, dwellMs: DESKTOP_MIN_DWELL_MS - 1 })).toBe(false);
  });

  it("does not fire when the pointer is still inside the page", () => {
    expect(isDesktopExitEvent({ ...ok, clientY: 5 })).toBe(false);
  });

  it("does not fire when moving onto another element", () => {
    expect(isDesktopExitEvent({ ...ok, hasRelatedTarget: true })).toBe(false);
  });
});

describe("isMobileExitScroll", () => {
  const ok = { maxDepthRatio: 0.4, scrolledUpPx: 80, elapsedMs: 160, dwellMs: MOBILE_MIN_DWELL_MS };

  it("fires when every threshold is met", () => {
    expect(isMobileExitScroll(ok)).toBe(true);
  });

  it("does not fire before the dwell time", () => {
    expect(isMobileExitScroll({ ...ok, dwellMs: MOBILE_MIN_DWELL_MS - 1 })).toBe(false);
  });

  it("does not fire before the visitor has scrolled deep enough", () => {
    expect(isMobileExitScroll({ ...ok, maxDepthRatio: 0.39 })).toBe(false);
  });

  it("does not fire for a short upward scroll", () => {
    expect(isMobileExitScroll({ ...ok, scrolledUpPx: 79, elapsedMs: 100 })).toBe(false);
  });

  it("does not fire for a slow upward scroll", () => {
    expect(isMobileExitScroll({ ...ok, elapsedMs: 161 })).toBe(false);
  });

  it("does not fire when no time has elapsed", () => {
    expect(isMobileExitScroll({ ...ok, elapsedMs: 0 })).toBe(false);
  });
});

describe("hasSupabaseAuthCookie", () => {
  it("is false without cookies", () => {
    expect(hasSupabaseAuthCookie("")).toBe(false);
  });

  it("detects a single or chunked session cookie", () => {
    expect(hasSupabaseAuthCookie("sb-abc-auth-token=x")).toBe(true);
    expect(hasSupabaseAuthCookie("sb-abc-auth-token.0=x")).toBe(true);
    expect(hasSupabaseAuthCookie("foo=1; sb-x-auth-token=y")).toBe(true);
  });

  it("ignores the PKCE code verifier and empty values", () => {
    expect(hasSupabaseAuthCookie("sb-abc-auth-token-code-verifier=x")).toBe(false);
    expect(hasSupabaseAuthCookie("sb-abc-auth-token=")).toBe(false);
    expect(hasSupabaseAuthCookie("sb-abc-auth-token=; foo=1")).toBe(false);
  });
});
