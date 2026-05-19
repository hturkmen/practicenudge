import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyAdmin } from "@/lib/email/admin-notify";

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

  await notifyAdmin(
    `Reactivation request: ${firmName || user.email}`,
    `A suspended user is requesting account reactivation.\n\nFirm: ${firmName || "Unknown"}\nUser email: ${user.email}\nFirm email: ${email || "N/A"}\nTime: ${new Date().toISOString()}\n\nTo reactivate, go to the admin panel:\nhttps://www.practicenudge.com/admin/firms`
  );

  return NextResponse.json({ success: true });
}
