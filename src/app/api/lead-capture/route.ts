import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { LEAD_FORM_PROMISE, LEAD_FORM_VERSION } from "@/lib/outreach/consent";
import { domainAcceptsMail } from "@/lib/outreach/mx";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }
  return new Resend(apiKey);
}

function getServiceSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Google Sheet link for the MTD Client Readiness Tracker Template
const TRACKER_SHEET_URL =
  process.env.MTD_TRACKER_SHEET_URL ||
  "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/copy";

// Simple in-memory rate limiter (resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5; // max requests
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

// Basic email validation
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email) && email.length <= 254;
}

export async function POST(request: Request) {
  try {
    // Rate limiting by IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { name, practice, clients } = body;
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (typeof name !== "string" || !name.trim() || !email || typeof practice !== "string" || !practice.trim()) {
      return NextResponse.json(
        { error: "Name, email, and practice name are required" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // A domain that cannot receive mail would only bounce and hurt delivery for everyone.
    if ((await domainAcceptsMail(email)) === false) {
      return NextResponse.json(
        { error: "We couldn't find a mail server for that address. Please check it and try again." },
        { status: 400 }
      );
    }

    // Sanitize inputs (strip HTML/scripts and line breaks that could end up in a mail header)
    const safeName = name.slice(0, 100).replace(/<[^>]*>/g, "").replace(/[\r\n]+/g, " ");
    const safePractice = practice.slice(0, 200).replace(/<[^>]*>/g, "").replace(/[\r\n]+/g, " ");
    const safeClients = typeof clients === "string" ? clients.slice(0, 20) : "";

    // 1. Save the lead first, so a delivery problem can never lose it
    const supabase = getServiceSupabase();
    const { data: lead, error: insertError } = await supabase.from("leads").insert({
      name: safeName,
      email,
      practice: safePractice,
      client_count: safeClients || null,
      source: "mtd_tracker",
      ip_address: ip,
    }).select("id").single();
    if (insertError || !lead) {
      console.error("Lead capture: lead could not be saved", insertError?.code);
      return NextResponse.json({ error: "Failed to process submission" }, { status: 500 });
    }

    // 2. Record what the form promised: one follow-up email, nothing more
    const { error: basisError } = await supabase.rpc("outreach_record_basis", {
      p_email: email,
      p_basis: "lead_form",
      p_evidence: { source: "mtd_lead_form", wording_version: LEAD_FORM_VERSION, wording: LEAD_FORM_PROMISE, lead_id: lead.id },
    });
    if (basisError) console.error("Lead capture: follow-up basis not recorded", basisError.code);

    // 3. Send the tracker template to the lead
    await getResend().emails.send({
      from: "PracticeNudge <noreply@practicenudge.com>",
      to: [email],
      subject: "Your MTD Client Readiness Tracker Template",
      text: `Hi ${safeName},

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
The PracticeNudge team

---
You received this because you downloaded the MTD Client Readiness Tracker from practicenudge.com.
Privacy notice: https://www.practicenudge.com/privacy`,
    });

    // 4. Notify the team about the new lead; a failure here must not fail the visitor's request
    try {
      await getResend().emails.send({
        from: "PracticeNudge <noreply@practicenudge.com>",
        to: [process.env.LEAD_NOTIFICATION_EMAIL || "halil.turkmen@gmail.com"],
        subject: `New MTD Tracker Lead: ${safeName} (${safePractice})`.slice(0, 150),
        text: `New lead from /mtd page:

Name: ${safeName}
Email: ${email}
Practice: ${safePractice}
Client count: ${safeClients || "Not specified"}
Time: ${new Date().toISOString()}

---
Review it in the admin panel: https://www.practicenudge.com/admin/leads`,
      });
    } catch {
      console.error("Lead capture: team notification failed");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // The error can quote the visitor's address, so only its type is logged.
    console.error("Lead capture error:", error instanceof Error ? error.name : "unknown");
    return NextResponse.json(
      { error: "Failed to process submission" },
      { status: 500 }
    );
  }
}
