import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CONSENT_COOKIE, isSignupConsentVersion } from "@/lib/outreach/consent";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  // Validate redirect path to prevent open redirect
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const response = NextResponse.redirect(`${origin}${safeNext}`);
      const { data: { user } } = await supabase.auth.getUser();
      // A brand-new account: leave a short-lived flag so the browser can report the sign-up to Google Analytics.
      // Readable by script on purpose, and it holds no personal data.
      if (user?.created_at && Date.now() - new Date(user.created_at).getTime() < 2 * 60 * 1000) {
        response.cookies.set("pn_signup", "google", { maxAge: 300, path: "/", sameSite: "lax", httpOnly: false });
      }
      // Consent ticked on the sign-up page before a Google redirect; recorded for this user only.
      const consentVersion = cookies().get(CONSENT_COOKIE)?.value;
      if (consentVersion) {
        response.cookies.set(CONSENT_COOKIE, "", { maxAge: 0, path: "/" });
        if (user?.email && isSignupConsentVersion(consentVersion)) {
          const { error: consentError } = await createServiceClient().rpc("outreach_record_basis", {
            p_email: user.email,
            p_basis: "consent",
            p_evidence: { source: "register_google", wording_version: consentVersion, user_id: user.id, given_at: new Date().toISOString() },
          });
          if (consentError) console.error("[auth-callback] Consent not recorded", consentError.code);
        }
      }
      return response;
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
