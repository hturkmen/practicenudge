import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { appUrl } from "@/lib/outreach/config";
import { getTokenSecret, verifyUnsubscribeToken } from "@/lib/outreach/tokens";

export const runtime = "nodejs";

// Best-effort limit on the address form (per instance); the token path needs no limit, it is signed.
const attempts = new Map<string, { count: number; resetAt: number }>();
function limited(ip: string) {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 3600000 });
    return false;
  }
  return ++entry.count > 10;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Handles RFC 8058 one-click unsubscribe (mail clients POST "List-Unsubscribe=One-Click") and the
 * form on /unsubscribe. A GET never unsubscribes, because link scanners prefetch GET URLs.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  let token: string | null = url.searchParams.get("token");
  let email: string | null = null;
  let fromPage = false;
  try {
    const form = await request.formData();
    if (form.get("List-Unsubscribe") !== "One-Click") {
      fromPage = true;
      token = (form.get("token") as string | null) || token;
      email = ((form.get("email") as string | null) || "").trim().toLowerCase() || null;
    }
  } catch {
    // A body-less one-click request still carries its token in the URL.
  }

  const done = (ok: boolean) => fromPage
    ? NextResponse.redirect(appUrl() + "/unsubscribe?" + (ok ? "done=1" : "error=1"), 303)
    : NextResponse.json(ok ? { unsubscribed: true } : { error: "Invalid or expired link" }, { status: ok ? 200 : 400 });

  const verified = token ? verifyUnsubscribeToken(token, getTokenSecret()) : null;
  if (!verified && !email) return done(false);
  if (!verified) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (limited(ip)) return fromPage ? done(false) : NextResponse.json({ error: "Too many requests" }, { status: 429 });
    if (!EMAIL.test(email!) || email!.length > 254) return done(false);
  }

  const { error } = await createServiceClient().rpc("outreach_unsubscribe", {
    p_contact_id: verified?.contactId ?? null,
    p_email: verified ? null : email,
    p_source: verified ? (fromPage ? "unsubscribe_page" : "one_click") : "unsubscribe_form",
  });
  if (error) {
    console.error("[unsubscribe] Could not record unsubscribe", error.code);
    return fromPage ? done(false) : NextResponse.json({ error: "Please try again" }, { status: 503 });
  }
  // The address form always reports success, so it cannot be used to discover who is on our list.
  return done(true);
}
