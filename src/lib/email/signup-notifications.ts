import { Resend } from "resend";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberListItem } from "@/lib/types/admin";

type Message = { from: string; to: string[]; subject: string; text: string };
type Job = {
  id: string;
  member_id: string;
  kind: "admin_registration" | "welcome";
  attempts: number;
  lock_token: string;
  message: Message | null;
};

export function signupMessage(member: MemberListItem, recipient: string): Message {
  return {
    from: "PracticeNudge System <noreply@practicenudge.com>",
    to: [recipient],
    subject: "[PracticeNudge] New member: " + member.firm_name.replace(/[\r\n]/g, " ").slice(0, 120),
    text: [
      "A member has joined PracticeNudge.",
      "Name: " + member.name,
      "Email: " + member.email,
      "Firm: " + member.firm_name,
      "Role: " + member.role,
      "Account registered: " + (member.account_created_at || member.created_at),
      "Joined firm: " + member.created_at,
      "Email verified at notification time: " + (member.email_confirmed_at ? "Yes" : "No"),
      "Review: https://www.practicenudge.com/admin/members/" + member.id,
    ].join("\n"),
  };
}

/** Jobs originate in the database, never in a caller-supplied email address or firm name. */
export async function processSignupNotifications(db: SupabaseClient, memberId?: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.SUPER_ADMIN_EMAIL || "halil.turkmen@gmail.com";
  if (!apiKey) return { configured: false, sent: 0, failed: 0 };
  const resend = new Resend(apiKey);
  const { data: jobs, error } = await db.rpc("claim_admin_signup_notifications", {
    p_member_id: memberId || null, p_limit: memberId ? 2 : 10,
  });
  if (error) throw new Error("Unable to claim signup notifications");
  let sent = 0;
  let failed = 0;
  for (const job of (jobs || []) as Job[]) {
    try {
      let message = job.message;
      if (!message) {
        const { data: member, error: lookupError } = await db.from("admin_member_overview")
          .select("*").eq("id", job.member_id).single();
        if (lookupError || !member) throw new Error("Member could not be loaded");
        message = job.kind === "welcome" ? {
          from: "PracticeNudge <noreply@practicenudge.com>", to: [member.email],
          subject: "Welcome to PracticeNudge",
          text: "Welcome to PracticeNudge, " + member.firm_name + ".\n\nAdd your clients, create document requests and track their readiness.\n\nOpen your dashboard: https://www.practicenudge.com/dashboard",
        } : signupMessage(member as MemberListItem, recipient);
        const { data: saved, error: saveError } = await db.from("admin_signup_notifications")
          .update({ message }).eq("id", job.id).eq("lock_token", job.lock_token).select("id").maybeSingle();
        if (saveError || !saved) throw new Error("Notification claim expired before send");
      }
      const { data, error: sendError } = await resend.emails.send(message, {
        idempotencyKey: "admin-signup/" + job.id,
      });
      if (sendError || !data?.id) throw new Error(sendError?.message || "Email provider returned no message ID");
      const { data: saved, error: saveError } = await db.from("admin_signup_notifications")
        .update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: data.id,
          last_error: null, locked_until: null })
        .eq("id", job.id).eq("lock_token", job.lock_token).select("id").maybeSingle();
      if (saveError || !saved) throw new Error("Provider accepted message but delivery record could not be saved");
      sent++;
    } catch (error) {
      failed++;
      const { error: saveError } = await db.from("admin_signup_notifications")
        .update({ status: job.attempts >= 8 ? "review_required" : "failed", locked_until: null,
          last_error: (error instanceof Error ? error.message : "Notification failed").slice(0, 300),
          next_attempt_at: new Date(Date.now() + Math.min(60, 2 ** job.attempts) * 60000).toISOString() })
        .eq("id", job.id).eq("lock_token", job.lock_token);
      if (saveError) console.error("[admin-signup] Unable to save job outcome", job.id);
    }
  }
  return { configured: true, sent, failed };
}
