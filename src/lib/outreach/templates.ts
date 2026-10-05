import type { LifecycleRow, LifecycleStage, MarketingBasis } from "@/lib/admin/lifecycle";
import { appUrl } from "./config";

/**
 * Follow-up sequences. Copy rules: plain and short, one next step per email, tied to the exact
 * milestone not yet reached, signed by the team, honest about being automated. No invented urgency,
 * statistics or testimonials, and never claim a person noticed something the system detected.
 */
export type StepContext = { firstName: string | null; firmName: string | null; clientCount: number; baseUrl: string };
export type RenderedStep = { subject: string; body: string };
export type StepDefinition = {
  sequence: "lead_follow_up" | "onboarding";
  step: string;
  label: string;
  /** Plain-English timing shown to admins. */
  timing: string;
  audience: "lead" | "owner";
  /** Lifecycle stage the person must still be in when the email is sent. */
  stage: LifecycleStage;
  /** When the step becomes due, measured from a real event. */
  delayDays: number;
  anchor: (person: LifecycleRow) => string | null;
  render: (context: StepContext) => RenderedStep;
};

const SIGN_OFF = "The PracticeNudge team";
const hi = (c: StepContext) => (c.firstName ? `Hi ${c.firstName},` : "Hi,");
const lines = (...parts: (string | false)[]) => parts.filter((p) => p !== false).join("\n\n");

export const STEPS: StepDefinition[] = [
  {
    sequence: "lead_follow_up", step: "follow_up", label: "Tracker follow-up (the one promised)", timing: "3 days after the tracker download",
    audience: "lead", stage: "new_lead", delayDays: 3, anchor: (p) => p.lead_at,
    render: (c) => ({
      subject: "Did the MTD tracker help?",
      body: lines(
        hi(c),
        "A few days ago you downloaded our MTD client readiness tracker. We hope it is useful.",
        "If keeping it up to date by hand starts to take time, PracticeNudge does the same job automatically: it shows which clients are ready, sends document requests and tracks what comes back.",
        `It is free to try while we are in pilot: ${c.baseUrl}/register`,
        "This is the one follow-up we mentioned when you downloaded the tracker, so we will not email you about it again. If you have a question, just reply.",
        SIGN_OFF,
      ),
    }),
  },
  {
    sequence: "onboarding", step: "add_first_client", label: "Add your first client", timing: "2 days after sign-up, no clients yet",
    audience: "owner", stage: "no_clients", delayDays: 2, anchor: (p) => p.email_confirmed_at,
    render: (c) => ({
      subject: "Your next step: add your first client",
      body: lines(
        hi(c),
        `Your PracticeNudge account${c.firmName ? ` for ${c.firmName}` : ""} is set up. The next step is adding your first client. It takes about two minutes, or you can import several at once from a CSV file.`,
        `Add a client: ${c.baseUrl}/clients`,
        "Once a client is in, you can send them a document request and PracticeNudge will track what comes back.",
        "If anything is unclear, reply to this email.",
        SIGN_OFF,
      ),
    }),
  },
  {
    sequence: "onboarding", step: "add_first_client_reminder", label: "Help adding clients", timing: "7 days after sign-up, no clients yet",
    audience: "owner", stage: "no_clients", delayDays: 7, anchor: (p) => p.email_confirmed_at,
    render: (c) => ({
      subject: "Need a hand adding clients?",
      body: lines(
        hi(c),
        "There are no clients in your PracticeNudge account yet. If something got in the way, reply and tell us. It helps us fix it.",
        `Trying it with a single client is the quickest way to see how it works: ${c.baseUrl}/clients`,
        SIGN_OFF,
      ),
    }),
  },
  {
    sequence: "onboarding", step: "check_in", label: "Is it right for you?", timing: "14 days after sign-up, no clients yet",
    audience: "owner", stage: "no_clients", delayDays: 14, anchor: (p) => p.email_confirmed_at,
    render: (c) => ({
      subject: "Is PracticeNudge right for your practice?",
      body: lines(
        hi(c),
        "It has been two weeks since you signed up and your account is still empty, so we would like to ask: is PracticeNudge right for you? A one-line reply is plenty, whether it is \"not now\" or \"I got stuck at...\".",
        "We will not send more setup emails after this one unless you start using it.",
        SIGN_OFF,
      ),
    }),
  },
  {
    sequence: "onboarding", step: "first_request", label: "Send your first request", timing: "2 days after the first client, no requests yet",
    audience: "owner", stage: "no_requests", delayDays: 2, anchor: (p) => p.first_client_at,
    render: (c) => ({
      subject: "Next step: send your first document request",
      body: lines(
        hi(c),
        `You have added ${c.clientCount === 1 ? "a client" : `${c.clientCount} clients`} to PracticeNudge. The next step is sending a document request: choose what you need and PracticeNudge emails your client a secure upload link.`,
        `Create a request: ${c.baseUrl}/requests/new`,
        SIGN_OFF,
      ),
    }),
  },
  {
    sequence: "onboarding", step: "first_request_reminder", label: "First request reminder", timing: "7 days after the first client, no requests yet",
    audience: "owner", stage: "no_requests", delayDays: 7, anchor: (p) => p.first_client_at,
    render: (c) => ({
      subject: "Ready to send your first request?",
      body: lines(
        hi(c),
        "Your clients are in, but no document request has gone out yet. One request is enough to see how PracticeNudge tracks what comes back.",
        `Create a request: ${c.baseUrl}/requests/new`,
        "If something is not working the way you need, reply and let us know.",
        SIGN_OFF,
      ),
    }),
  },
  {
    sequence: "onboarding", step: "stalled_check_in", label: "Check in after 3 quiet weeks", timing: "after 21 days without activity",
    audience: "owner", stage: "stalled", delayDays: 21, anchor: (p) => p.last_seen_at,
    render: (c) => ({
      subject: "Anything we can help with?",
      body: lines(
        hi(c),
        "There has not been any activity in your PracticeNudge account for three weeks.",
        "If it is not working for you, a one-line reply telling us why would really help. If you are just between busy periods, you can ignore this email.",
        `Your dashboard: ${c.baseUrl}/dashboard`,
        SIGN_OFF,
      ),
    }),
  },
];

export function findStep(sequence: string, step: string) {
  return STEPS.find((s) => s.sequence === sequence && s.step === step);
}

/** Only letters, spaces, hyphens and apostrophes reach an email; anything else is dropped. */
export function safeFirstName(name: string | null | undefined): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  // Latin letters including accented ones (e.g. Turkish, Polish, Romanian), apostrophes and hyphens.
  const cleaned = first.replace(/[^A-Za-zÀ-ÖØ-öø-ɏ'\-]/g, "").slice(0, 40);
  return cleaned.length >= 2 ? cleaned : null;
}

function safeText(value: string | null | undefined, max: number): string | null {
  const cleaned = (value ?? "").replace(/[\u0000-\u001f\u007f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return cleaned || null;
}

export function stepContext(person: LifecycleRow): StepContext {
  return {
    firstName: safeFirstName(person.member_name || person.lead_name),
    // A default "x's Firm" name was never chosen by the person, so it is not repeated back to them.
    firmName: person.firm_name && !/'s Firm$/i.test(person.firm_name) ? safeText(person.firm_name, 80) : null,
    clientCount: Number(person.client_count) || 0,
    baseUrl: appUrl(),
  };
}

/** Which steps a basis allows (mirrors the database rule: the lead form covers one follow-up only). */
export function basisCovers(basis: MarketingBasis, step: StepDefinition) {
  if (basis === "consent" || basis === "corporate") return true;
  return basis === "lead_form" && step.sequence === "lead_follow_up";
}

export function stepsFor(person: LifecycleRow): StepDefinition[] {
  const isLead = !person.member_id;
  return STEPS.filter((s) => (s.audience === "lead" ? isLead : !isLead && person.role === "owner"));
}
