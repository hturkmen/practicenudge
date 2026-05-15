import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Google Sheet link for the MTD Client Readiness Tracker Template
const TRACKER_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/PLACEHOLDER/copy";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, practice, clients } = body;

    if (!name || !email || !practice) {
      return NextResponse.json(
        { error: "Name, email, and practice name are required" },
        { status: 400 }
      );
    }

    // 1. Send the tracker template to the lead
    await resend.emails.send({
      from: "PracticeNudge <onboarding@resend.dev>",
      to: [email],
      subject: "Your MTD Client Readiness Tracker Template",
      text: `Hi ${name},

Thanks for downloading the MTD Client Readiness Tracker!

Here's your copy:
${TRACKER_SHEET_URL}

Open the link and click "Make a copy" to save it to your own Google Drive.

The tracker helps you:
• See which clients are MTD-ready at a glance
• Track missing information per client
• Identify high-risk clients who need chasing first

---

We're also building PracticeNudge — a dashboard that does what this spreadsheet does, but automatically. Live status tracking, follow-up reminders, and risk scoring for every client.

We're looking for 10 small UK practices to pilot it (free). If you're interested:
https://www.practicenudge.com/#pricing

Best,
Halil
PracticeNudge

---
You received this because you downloaded the MTD Client Readiness Tracker from practicenudge.com.`,
    });

    // 2. Notify yourself about the new lead
    await resend.emails.send({
      from: "PracticeNudge Leads <onboarding@resend.dev>",
      to: ["halil.turkmen@gmail.com"],
      subject: `New MTD Tracker Lead: ${name} (${practice})`,
      text: `New lead from /mtd page:

Name: ${name}
Email: ${email}
Practice: ${practice}
Client count: ${clients || "Not specified"}
Time: ${new Date().toISOString()}

---
Follow up in 2-3 days with pilot offer.`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Lead capture error:", error);
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
