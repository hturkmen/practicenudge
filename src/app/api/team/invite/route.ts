import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, role, firmId, firmName, inviterName } = body;

    if (!email || !role || !firmId || !firmName) {
      return NextResponse.json(
        { error: "Email, role, firm ID, and firm name are required" },
        { status: 400 }
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if user already exists and is already a member
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email === email.toLowerCase()
    );

    if (existingUser) {
      // Check if already a member of this firm
      const { data: existingMember } = await supabase
        .from("firm_users")
        .select("id")
        .eq("firm_id", firmId)
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (existingMember) {
        return NextResponse.json(
          { error: "This person is already a member of your firm" },
          { status: 400 }
        );
      }

      // User exists but not a member — add them directly
      const { error: addError } = await supabase.from("firm_users").insert({
        firm_id: firmId,
        user_id: existingUser.id,
        role: role,
      });

      if (addError) {
        return NextResponse.json(
          { error: "Failed to add team member" },
          { status: 500 }
        );
      }

      // Send notification email
      await resend.emails.send({
        from: "PracticeNudge <onboarding@resend.dev>",
        to: [email],
        subject: `You've been added to ${firmName} on PracticeNudge`,
        text: `Hi,

${inviterName || "Your colleague"} has added you to ${firmName} on PracticeNudge.

You can sign in at: https://www.practicenudge.com/login

Your role: ${role}

Best,
PracticeNudge`,
      });

      return NextResponse.json({ success: true, status: "added" });
    }

    // User doesn't exist — send invitation email to register
    await resend.emails.send({
      from: "PracticeNudge <onboarding@resend.dev>",
      to: [email],
      subject: `${inviterName || "Your colleague"} invited you to ${firmName} on PracticeNudge`,
      text: `Hi,

${inviterName || "Your colleague"} has invited you to join ${firmName} on PracticeNudge — a client readiness tracking tool for UK accountants.

To accept the invitation, create your account here:
https://www.practicenudge.com/register?invite=${firmId}&role=${role}

Once you register, you'll automatically be added to the ${firmName} team.

Best,
PracticeNudge`,
    });

    return NextResponse.json({ success: true, status: "invited" });
  } catch (error: any) {
    console.error("Team invite error:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
}
