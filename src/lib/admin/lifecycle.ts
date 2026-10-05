import { DISPOSABLE_DOMAINS } from "./member-insights";

export const LIFECYCLE_STAGES = [
  "new_lead", "unverified", "no_clients", "no_requests", "activated", "stalled", "suspended", "lost",
] as const;
export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number];

/** Suspension is a real account state and cannot be set by hand (mirrors migration 016). */
export const OVERRIDABLE_STAGES = LIFECYCLE_STAGES.filter((s) => s !== "suspended");

export const STAGE_LABELS: Record<LifecycleStage, string> = {
  new_lead: "Lead, no account",
  unverified: "Email not verified",
  no_clients: "No clients yet",
  no_requests: "Clients, no requests",
  activated: "Activated",
  stalled: "Stalled 21+ days",
  suspended: "Suspended",
  lost: "Lost",
};

export const VERDICTS = ["unknown", "real", "junk"] as const;
export type Verdict = (typeof VERDICTS)[number];
export type QualityTier = "ok" | "review" | "junk";
export type QualitySignal = { text: string; strength: "strong" | "weak" };
export type ContactQuality = { tier: QualityTier; signals: QualitySignal[] };

/** One row of admin_lifecycle_overview: a person joined across leads and memberships. */
export type LifecycleRow = {
  email_key: string;
  member_id: string | null;
  user_id: string | null;
  firm_id: string | null;
  role: "owner" | "admin" | "member" | null;
  member_status: "active" | "suspended" | null;
  member_name: string | null;
  firm_name: string | null;
  plan: string | null;
  signed_up_at: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  lead_id: string | null;
  lead_name: string | null;
  lead_practice: string | null;
  lead_client_range: string | null;
  lead_source: string | null;
  lead_status: string | null;
  lead_at: string | null;
  lead_count: number | null;
  client_count: number;
  first_client_at: string | null;
  request_count: number;
  first_request_at: string | null;
  last_request_at: string | null;
  first_upload_at: string | null;
  last_activity_at: string | null;
  last_seen_at: string | null;
  contact_id: string | null;
  verdict: Verdict;
  verdict_reason: string | null;
  stage_override: LifecycleStage | null;
  stage_override_reason: string | null;
  derived_stage: LifecycleStage;
  stage: LifecycleStage;
};

export type LifecyclePerson = LifecycleRow & { quality: ContactQuality };
export type FunnelStep = { key: string; label: string; value: number };
export type LifecycleResponse = { people: LifecyclePerson[]; funnel: FunnelStep[]; truncated: boolean };
export type TimelineEvent = { at: string; kind: string; detail: Record<string, unknown> };
export type TimelineResponse = { person: LifecyclePerson; events: TimelineEvent[] };

// Many genuine UK sole traders use these, so a personal provider alone never flags a record.
const FREE_MAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "hotmail.com", "hotmail.co.uk",
  "outlook.com", "live.com", "live.co.uk", "msn.com", "icloud.com", "me.com", "aol.com",
  "btinternet.com", "sky.com", "virginmedia.com", "talktalk.net", "protonmail.com", "proton.me",
  "gmx.com", "mail.com", "zoho.com", "yandex.com",
]);
const DAY = 86400000;

/**
 * Explainable quality tier, not a score. Suspicious records go to a person for review and are
 * never emailed automatically; an admin verdict always wins over the signals.
 */
export function getContactQuality(row: LifecycleRow, now = Date.now()): ContactQuality {
  const signals: QualitySignal[] = [];
  const [local = "", domain = ""] = row.email_key.split("@");
  const disposable = DISPOSABLE_DOMAINS.has(domain);
  if (disposable) signals.push({ text: "Email domain is on the disposable-address signal list.", strength: "strong" });
  if (FREE_MAIL_DOMAINS.has(domain)) signals.push({ text: "Personal email provider, not a practice domain.", strength: "weak" });
  if (/\d/.test(row.member_name || row.lead_name || "")) signals.push({ text: "Name contains digits.", strength: "weak" });

  if (row.member_id) {
    const signedUp = Date.parse(row.signed_up_at ?? "");
    const ageDays = Number.isFinite(signedUp) ? (now - signedUp) / DAY : 0;
    if (!row.email_confirmed_at && ageDays >= 1) {
      signals.push({ text: "Email remains unverified more than 24 hours after registration.", strength: "strong" });
    }
    // Google sign-ups also get this default, so it is only a weak signal.
    if (row.firm_name?.toLowerCase() === local + "'s firm") {
      signals.push({ text: "No firm name was given at sign-up.", strength: "weak" });
    }
    if (row.client_count === 0 && ageDays >= 7) {
      signals.push({ text: "No clients added 7+ days after sign-up.", strength: "weak" });
    }
  } else if ((row.lead_practice ?? "").trim().length < 3) {
    signals.push({ text: "Practice name is missing or too short.", strength: "weak" });
  }

  if (row.verdict === "junk") return { tier: "junk", signals };
  if (row.verdict === "real") return { tier: "ok", signals };
  if (disposable) return { tier: "junk", signals };
  const strong = signals.filter((s) => s.strength === "strong").length;
  const weak = signals.length - strong;
  return { tier: strong > 0 || weak >= 2 ? "review" : "ok", signals };
}

/** Firm-level funnel: owners only (one per firm), excluding records marked junk. */
export function getFunnel(people: LifecyclePerson[]): FunnelStep[] {
  const counted = people.filter((p) => p.quality.tier !== "junk");
  const owners = counted.filter((p) => p.member_id && p.role === "owner");
  return [
    { key: "leads", label: "Leads", value: counted.filter((p) => p.lead_id).length },
    { key: "signed_up", label: "Signed up", value: owners.length },
    { key: "first_client", label: "First client", value: owners.filter((p) => p.client_count > 0).length },
    { key: "first_request", label: "First request", value: owners.filter((p) => p.first_request_at).length },
    { key: "first_upload", label: "First upload", value: owners.filter((p) => p.first_upload_at).length },
  ];
}

export function withQuality(row: LifecycleRow, now = Date.now()): LifecyclePerson {
  const normalised = { ...row, client_count: Number(row.client_count ?? 0), request_count: Number(row.request_count ?? 0) };
  return { ...normalised, quality: getContactQuality(normalised, now) };
}
