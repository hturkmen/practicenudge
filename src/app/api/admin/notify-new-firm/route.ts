import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyNewFirmRegistered } from "@/lib/email/admin-notify";
import { sendWelcomeEmail } from "@/lib/email/welcome";

export async function POST(request: Request) {
  const supabase = createClient();

  // Verify the user is authenticated
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { firmName, email } = await request.json();

  if (!firmName || !email) {
    return NextResponse.json({ error: "firmName and email required" }, { status: 400 });
  }

  // Send welcome email to the new user
  await sendWelcomeEmail(email, firmName);

  // Notify super admin
  await notifyNewFirmRegistered(firmName, email);

  return NextResponse.json({ success: true });
}
