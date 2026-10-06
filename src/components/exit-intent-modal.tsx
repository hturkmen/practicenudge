"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  STORAGE_KEYS,
  shouldShowExitIntent,
  parseTimestamp,
  isDesktopExitEvent,
  isMobileExitScroll,
  hasSupabaseAuthCookie,
} from "@/lib/exit-intent";

type StorageKind = "local" | "session";

// Storage can throw (Safari private mode, blocked cookies), so every access is guarded.
function safeGet(kind: StorageKind, key: string): string | null {
  try {
    return (kind === "local" ? window.localStorage : window.sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function safeSet(kind: StorageKind, key: string, value: string): void {
  try {
    (kind === "local" ? window.localStorage : window.sessionStorage).setItem(key, value);
  } catch {
    // Ignore: worst case the modal may show once more.
  }
}

function canShowNow(): boolean {
  return shouldShowExitIntent({
    now: Date.now(),
    lastDismissedAt: parseTimestamp(safeGet("local", STORAGE_KEYS.dismissedAt)),
    converted: safeGet("local", STORAGE_KEYS.converted) === "1",
    shownThisSession: safeGet("session", STORAGE_KEYS.shown) === "1",
    loggedIn: hasSupabaseAuthCookie(document.cookie),
  });
}

// Pause between scroll events after which an upward scroll is measured from scratch.
const SCROLL_PAUSE_MS = 300;

/**
 * One value-led question shown when a visitor is about to leave the landing page.
 * Closed on the server and on first client render, so it adds no markup, layout shift or hydration risk.
 */
export function ExitIntentModal() {
  const t = useTranslations("landing");
  const [open, setOpen] = useState(false);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!canShowNow()) return;

    const mountedAt = Date.now();
    const desktop = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    let maxDepthRatio = 0;
    let lastY = window.scrollY;
    let lastT = mountedAt;
    let anchor = { y: lastY, t: lastT };

    const cleanup = () => {
      document.removeEventListener("mouseout", onMouseOut);
      window.removeEventListener("scroll", onScroll);
    };

    const trigger = () => {
      // Never stack on top of another open dialog or menu (Radix locks body scroll while open).
      if (document.body.hasAttribute("data-scroll-locked")) return;
      cleanup();
      if (!canShowNow()) return;
      safeSet("session", STORAGE_KEYS.shown, "1");
      setOpen(true);
    };

    function onMouseOut(e: MouseEvent) {
      if (isDesktopExitEvent({ clientY: e.clientY, hasRelatedTarget: !!e.relatedTarget, dwellMs: Date.now() - mountedAt })) {
        trigger();
      }
    }

    function onScroll() {
      const y = window.scrollY;
      const now = Date.now();
      const height = document.documentElement.scrollHeight;
      if (height > 0) maxDepthRatio = Math.max(maxDepthRatio, (y + window.innerHeight) / height);

      // Measure an upward flick from where it started: reset on downward movement or after a pause.
      if (y >= lastY || now - lastT > SCROLL_PAUSE_MS) anchor = { y, t: now };
      lastY = y;
      lastT = now;

      if (
        y < anchor.y &&
        isMobileExitScroll({ maxDepthRatio, scrolledUpPx: anchor.y - y, elapsedMs: now - anchor.t, dwellMs: now - mountedAt })
      ) {
        trigger();
      }
    }

    if (desktop) {
      document.addEventListener("mouseout", onMouseOut);
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    return cleanup;
  }, []);

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) safeSet("local", STORAGE_KEYS.dismissedAt, String(Date.now()));
    setOpen(next);
  }, []);

  const markConverted = useCallback(() => {
    safeSet("local", STORAGE_KEYS.converted, "1");
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-[#0E2621]/45 backdrop-blur-[2px] motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none dark:bg-black/60" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            ctaRef.current?.focus();
          }}
          className={cn(
            "fixed z-50 w-full max-h-[90dvh] overflow-y-auto border border-[#E5E0D3] bg-white text-[#0E2621] shadow-[0_24px_60px_-20px_rgba(14,38,33,0.35)] focus:outline-none dark:border-[#2A3A35] dark:bg-[#13221E] dark:text-[#EEF5F1]",
            // Phones: bottom sheet. From sm up: centred card (margin-auto centring keeps transforms free for the animation).
            "inset-x-0 bottom-0 rounded-t-2xl px-6 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))]",
            "sm:inset-0 sm:m-auto sm:h-fit sm:max-w-[460px] sm:rounded-2xl sm:p-8",
            "motion-safe:duration-200 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=open]:fade-in-0 motion-safe:data-[state=open]:slide-in-from-bottom-8",
            "motion-safe:sm:data-[state=open]:slide-in-from-bottom-2 motion-safe:sm:data-[state=open]:zoom-in-95",
            "motion-safe:data-[state=closed]:animate-out motion-safe:data-[state=closed]:fade-out-0"
          )}
        >
          <DialogClose
            aria-label={t("exitClose")}
            className="absolute end-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#4A5A55] transition-colors hover:bg-[#F4F1EA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A55] dark:text-[#9FB3AB] dark:hover:bg-[#0E1A17]"
          >
            <X className="h-4 w-4" aria-hidden />
          </DialogClose>

          <p className="mb-2 pe-10 text-xs font-bold uppercase tracking-[0.14em] text-[#1F7A55] rtl:tracking-normal dark:text-[#6FD3A6]">
            {t("exitEyebrow")}
          </p>
          <DialogTitle
            className="pe-8 text-[21px] font-extrabold leading-[1.15] tracking-[-0.02em] break-words rtl:tracking-normal sm:text-[23px]"
            style={{ textWrap: "balance" as any }}
          >
            {t("exitTitle")}
          </DialogTitle>
          <DialogDescription className="mt-3 text-[15px] leading-relaxed text-[#2E403B] dark:text-[#C9D8D2]">
            {t("exitBody")}
          </DialogDescription>

          <ol className="mt-5 space-y-2.5">
            {[t("exitStep1"), t("exitStep2"), t("exitStep3")].map((step, i) => (
              <li key={i} className="flex items-center gap-3 text-[15px] text-[#0E2621] dark:text-[#EEF5F1]">
                <span
                  aria-hidden
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F4F1EA] text-xs font-bold tabular-nums text-[#1F7A55] dark:bg-[#0E1A17] dark:text-[#6FD3A6]"
                >
                  {i + 1}
                </span>
                <span className="min-w-0">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              ref={ctaRef}
              href="/register"
              onClick={markConverted}
              className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#0E2621] px-7 text-[15px] font-semibold text-[#F4F1EA] transition-colors hover:bg-[#1A3A33] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A55] focus-visible:ring-offset-2 dark:bg-[#EEF5F1] dark:text-[#0E1A17] dark:hover:bg-white dark:focus-visible:ring-offset-[#13221E] sm:w-auto"
            >
              {t("exitCta")}
            </Link>
            <DialogClose className="h-11 rounded-full px-5 text-[14px] font-medium text-[#4A5A55] underline-offset-4 transition-colors hover:text-[#0E2621] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1F7A55] dark:text-[#9FB3AB] dark:hover:text-white">
              {t("exitDismiss")}
            </DialogClose>
          </div>

          <p className="mt-3 text-[13px] text-[#4A5A55] dark:text-[#9FB3AB]">{t("exitTrust")}</p>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
