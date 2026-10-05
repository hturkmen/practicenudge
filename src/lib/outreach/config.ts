/** Lifecycle outreach to our own leads and members. Kept apart from customer-facing transactional mail. */
export const OUTREACH_FROM = "PracticeNudge <updates@practicenudge.com>";
// Replies must reach a person; this address is routed to a human inbox.
export const OUTREACH_REPLY_TO = "hello@practicenudge.com";

export type OutreachMode = "off" | "dry_run" | "live";

/** Kill switch. Anything other than an explicit value means off. */
export function getOutreachMode(): OutreachMode {
  const mode = process.env.OUTREACH_MODE;
  return mode === "live" || mode === "dry_run" ? mode : "off";
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "https://www.practicenudge.com";
}
