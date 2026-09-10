import type { MemberListItem, MemberUsage } from "@/lib/types/admin";

const DAY = 86400000;
// A deliberately small signal list, not a comprehensive spam classifier.
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "yopmail.com", "guerrillamail.com", "10minutemail.com", "tempmail.com",
]);

export function getMemberInsights(member: MemberListItem, usage?: MemberUsage, now = Date.now()) {
  const joined = Date.parse(member.account_created_at || member.created_at);
  const ageDays = Math.max(0, (now - joined) / DAY);
  const lastSeen = [member.last_sign_in_at, member.last_activity_at]
    .filter((value): value is string => !!value)
    .map(Date.parse).filter(Number.isFinite);
  const idleDays = (now - (lastSeen.length ? Math.max(...lastSeen) : joined)) / DAY;
  const hasClients = (member.firm_client_count ?? 0) > 0;
  const hasRequests = (member.firm_request_count ?? 0) > 0;
  const engagement = member.status === "suspended" ? "Suspended"
    : idleDays >= 14 ? "Inactive for 14+ days"
    : hasClients && hasRequests ? "Firm using requests"
    : hasClients ? "Firm adding clients"
    : ageDays < 7 ? "New — onboarding" : "No firm clients yet";

  const signals: string[] = [];
  const domain = member.email.split("@").pop()?.toLowerCase();
  if (domain && DISPOSABLE_DOMAINS.has(domain)) signals.push("Email domain is on the disposable-address signal list.");
  if (member.email_confirmed_at === null && ageDays >= 1) signals.push("Email remains unverified more than 24 hours after registration.");
  const attempts = usage?.notifications.reduce((sum, n) => sum + n.total, 0) ?? 0;
  const failed = usage?.notifications.filter(n => n.status === "failed").reduce((sum, n) => sum + n.total, 0) ?? 0;
  if (failed >= 10 && attempts > 0 && failed / attempts >= 0.5) {
    signals.push("At least half of this firm's recorded notifications failed (10+ failures). Check delivery and consent settings as well as abuse.");
  }
  return { engagement, review: signals.length ? "Review suggested" : "No strong signals", signals };
}
