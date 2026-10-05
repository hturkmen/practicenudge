import type { LifecyclePerson } from "@/lib/admin/lifecycle";
import { basisCovers, stepsFor } from "./templates";

const DAY = 86400000;
// Steps that fell due longer ago than this are skipped, so switching sending on never floods
// people who signed up weeks ago.
export const CATCH_UP_DAYS = 3;

export type PlannedStep = {
  contact_id: string;
  sequence_key: string;
  step_key: string;
  required_stage: string;
  scheduled_for: string;
};

/** Automated email only for real, reachable people with a lawful basis; review and junk go to a human. */
export function isEligible(person: LifecyclePerson): boolean {
  if (!person.contact_id || person.is_internal || person.quality.tier !== "ok") return false;
  if (person.suppression_reason || person.paused || person.marketing_basis === "none") return false;
  return person.member_id ? person.member_status === "active" && !!person.email_confirmed_at : true;
}

/** Steps due now. The database still re-checks every exit rule when the email is actually sent. */
export function planOutreach(people: LifecyclePerson[], now = Date.now()): PlannedStep[] {
  const planned: PlannedStep[] = [];
  for (const person of people) {
    if (!isEligible(person)) continue;
    for (const step of stepsFor(person)) {
      if (step.stage !== person.stage || !basisCovers(person.marketing_basis, step)) continue;
      const anchor = Date.parse(step.anchor(person) ?? "");
      if (!Number.isFinite(anchor)) continue;
      const due = anchor + step.delayDays * DAY;
      if (due > now || due < now - CATCH_UP_DAYS * DAY) continue;
      planned.push({
        contact_id: person.contact_id!, sequence_key: step.sequence, step_key: step.step,
        required_stage: step.stage, scheduled_for: new Date(now).toISOString(),
      });
    }
  }
  return planned;
}
