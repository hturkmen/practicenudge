import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { CONSENT_COOKIE, SIGNUP_CONSENT_VERSION } from "@/lib/outreach/consent";
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
      // Consent ticked on the sign-up page before a Google redirect; recorded for this user only.
      const consentVersion = cookies().get(CONSENT_COOKIE)?.value;
      if (consentVersion) {
        response.cookies.set(CONSENT_COOKIE, "", { maxAge: 0, path: "/" });
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.email && consentVersion === SIGNUP_CONSENT_VERSION) {
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
