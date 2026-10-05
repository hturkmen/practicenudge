"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { History, Loader2, RotateCcw, ShieldCheck, ShieldX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { memberDate } from "@/components/admin/member-insights";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { buildOutreachEmail } from "@/lib/outreach/message";
import { basisCovers, stepContext, stepsFor, type StepDefinition } from "@/lib/outreach/templates";
import { BASIS_LABELS, MARKETING_BASES, OVERRIDABLE_STAGES, STAGE_LABELS } from "@/lib/admin/lifecycle";
import type {
  FunnelStep, LifecyclePerson, LifecycleResponse, LifecycleStage, MarketingBasis, TimelineEvent, TimelineResponse,
} from "@/lib/admin/lifecycle";

export type LifecycleTarget = { member_id?: string; lead_id?: string };

export function useLifecycle() {
  const [data, setData] = useState<LifecycleResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/lifecycle");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to load lifecycle data");
      setData(body as LifecycleResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load lifecycle data");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  return { data, loading, error, reload };
}

const STAGE_STYLES: Record<LifecycleStage, string> = {
  new_lead: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300",
  unverified: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  no_clients: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  no_requests: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  activated: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  stalled: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  suspended: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  lost: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

/** Same footprint as a badge, so cells do not jump when lifecycle data arrives. */
export function LifecycleCellPlaceholder({ failed }: { failed?: boolean }) {
  if (failed) return <span className="text-muted-foreground">—</span>;
  return <span aria-hidden className="inline-block h-5 w-24 rounded-full bg-muted animate-pulse align-middle" />;
}

export function StageBadge({ person }: { person: LifecyclePerson }) {
  const overridden = !!person.stage_override;
  return (
    <Badge variant="outline" className={cn("border-transparent text-xs whitespace-nowrap", STAGE_STYLES[person.stage])}
      title={overridden ? "Set by an admin. Derived stage: " + STAGE_LABELS[person.derived_stage] : undefined}>
      {STAGE_LABELS[person.stage]}{overridden && <span className="sr-only"> (set by an admin)</span>}
      {overridden && <span aria-hidden className="ml-1">*</span>}
    </Badge>
  );
}

export function qualityLabel(person: LifecyclePerson) {
  const { tier } = person.quality;
  if (tier === "internal") return "Team account";
  if (tier === "junk") return person.verdict === "junk" ? "Marked junk" : "Likely junk";
  if (tier === "review") return "Needs review";
  return person.verdict === "real" ? "Marked real" : "No strong signals";
}

export function QualityBadge({ person }: { person: LifecyclePerson }) {
  const { tier } = person.quality;
  const style = tier === "internal" ? "text-muted-foreground"
    : tier === "junk" ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-transparent"
    : tier === "review" ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-transparent"
    : person.verdict === "real" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-transparent"
    : "";
  return <Badge variant="outline" className={cn("text-xs whitespace-nowrap", style)}>{qualityLabel(person)}</Badge>;
}

const shortDate = (value: string) => new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Europe/London" });

/** Last email sent and the next one queued, in one compact cell. */
export function OutreachCell({ person }: { person: LifecyclePerson }) {
  if (person.is_internal) return <span className="text-muted-foreground">—</span>;
  if (person.suppression_reason) return <span className="text-xs text-muted-foreground capitalize">Suppressed ({person.suppression_reason})</span>;
  const parts = [
    person.last_outreach_at && "Sent " + shortDate(person.last_outreach_at),
    person.next_outreach_at && "Next " + shortDate(person.next_outreach_at),
  ].filter(Boolean);
  return <span className="text-xs whitespace-nowrap text-muted-foreground">{parts.length ? parts.join(" · ") : person.paused ? "Paused" : "None"}</span>;
}

export function displayName(person: LifecyclePerson) {
  return person.member_name || person.lead_name || person.email_key;
}

export function FunnelSummary({ funnel, loading, error, onRetry }: {
  funnel: FunnelStep[] | undefined; loading: boolean; error: string | null; onRetry: () => void;
}) {
  const signedUp = funnel?.find((s) => s.key === "signed_up")?.value ?? 0;
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Activation funnel</CardTitle>
        <CardDescription>One owner per firm. Records marked junk are excluded.</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-destructive">{error}</span>
            <Button variant="outline" size="sm" onClick={onRetry}>Retry</Button>
          </div>
        ) : (
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            {(funnel ?? PLACEHOLDER_FUNNEL).map((step) => (
              <div key={step.key} className="min-w-0">
                <dt className="text-xs text-muted-foreground">{step.label}</dt>
                <dd className="mt-1 h-8 text-2xl font-bold tabular-nums">
                  {loading && !funnel ? <span aria-hidden className="inline-block h-6 w-10 rounded bg-muted animate-pulse" /> : step.value}
                </dd>
                <dd className="h-4 text-xs text-muted-foreground tabular-nums">
                  {funnel && !["leads", "signed_up"].includes(step.key) && signedUp > 0
                    ? Math.round((step.value / signedUp) * 100) + "% of sign-ups" : ""}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

const PLACEHOLDER_FUNNEL: FunnelStep[] = [
  { key: "leads", label: "Leads", value: 0 },
  { key: "signed_up", label: "Signed up", value: 0 },
  { key: "first_client", label: "First client", value: 0 },
  { key: "first_request", label: "First request", value: 0 },
  { key: "first_upload", label: "First upload", value: 0 },
];

export function ReviewQueue({ people, loading, onOpen }: {
  people: LifecyclePerson[]; loading: boolean; onOpen: (person: LifecyclePerson) => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Needs human review</CardTitle>
        <CardDescription>Never emailed automatically. Open a record to mark it real or junk.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <span aria-hidden className="block h-9 w-full rounded bg-muted animate-pulse" />
        ) : people.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing needs review right now.</p>
        ) : (
          <ul className="divide-y">
            {people.map((person) => (
              <li key={person.email_key} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{displayName(person)}</p>
                  <p className="truncate text-xs text-muted-foreground">{person.quality.signals[0]?.text}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => onOpen(person)}>Review</Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function TimelineButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClick} aria-label={"Open timeline for " + label}>
      <History className="h-4 w-4" />
    </Button>
  );
}

const EVENT_LABELS: Record<string, string> = {
  lead_captured: "Lead captured",
  signed_up: "Signed up",
  email_verified: "Email verified",
  first_client: "First client added",
  first_request: "First document request",
  first_upload: "First client upload",
  last_sign_in: "Last sign-in",
  welcome_email_sent: "Welcome email sent",
  plan_changed: "Plan changed",
  admin_verdict_change: "Admin verdict",
  admin_stage_override: "Admin stage override",
  admin_outreach_pause: "Outreach paused",
  admin_outreach_resume: "Outreach resumed",
  admin_basis_change: "Lawful basis changed",
  admin_mark_replied: "Marked as replied",
  outreach_scheduled: "Email scheduled",
  outreach_processing: "Email sending",
  outreach_sent: "Email sent",
  outreach_failed: "Email failed, will retry",
  outreach_cancelled: "Email cancelled",
  outreach_review_required: "Email needs checking",
  outreach_delivered: "Email delivered",
  outreach_delivery_delayed: "Delivery delayed",
  outreach_bounced: "Email bounced",
  outreach_complained: "Marked as spam",
  outreach_unsubscribed: "Unsubscribed",
  outreach_replied: "Replied",
  suppressed: "Added to suppression list",
};

function adminValue(value: unknown) {
  if (typeof value !== "string") return "automatic";
  return STAGE_LABELS[value as LifecycleStage] ?? BASIS_LABELS[value as MarketingBasis] ?? value;
}

function eventDetail(event: TimelineEvent) {
  const d = event.detail || {};
  switch (event.kind) {
    case "lead_captured": return [d.source ? `via ${d.source}` : "", d.practice].filter(Boolean).join(" · ");
    case "signed_up": return [d.firm, d.plan ? `${d.plan} plan` : ""].filter(Boolean).join(" · ");
    case "first_client": return `${d.clients_now} client(s) now`;
    case "first_request": return `${d.requests_now} request(s) now`;
    case "plan_changed": return `${d.from} → ${d.to}`;
    case "admin_verdict_change":
    case "admin_stage_override":
    case "admin_basis_change":
      return `${adminValue(d.previous)} → ${adminValue(d.new)}` + (d.reason ? ` · ${d.reason}` : "");
    case "admin_outreach_pause":
    case "admin_mark_replied":
      return d.reason ? `${d.reason}` : "";
    case "suppressed": return `${d.reason}` + (d.source ? ` · ${String(d.source).replace(/_/g, " ")}` : "");
    default:
      if (event.kind.startsWith("outreach_") && d.sequence) {
        return [d.subject || `${d.sequence}/${d.step}`, d.manual ? "sent by an admin" : "", d.reason]
          .filter(Boolean).join(" · ");
      }
      return "";
  }
}

const SAVED_MESSAGES = {
  verdict: "Verdict saved",
  stage_override: "Stage updated",
  pause: "Outreach setting saved",
  basis: "Lawful basis saved",
  replied: "Marked as replied; automated follow-ups stopped",
};

export function LifecycleDrawer({ target, onClose, onChanged }: {
  target: LifecycleTarget | null; onClose: () => void; onChanged: () => void;
}) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [verdictReason, setVerdictReason] = useState("");
  const [stageChoice, setStageChoice] = useState<string>("automatic");
  const [stageReason, setStageReason] = useState("");
  const [confirmJunk, setConfirmJunk] = useState(false);
  const [basisChoice, setBasisChoice] = useState<MarketingBasis>("none");
  const [outreachNote, setOutreachNote] = useState("");
  const [previewStep, setPreviewStep] = useState<StepDefinition | null>(null);
  const [confirmStep, setConfirmStep] = useState<StepDefinition | null>(null);

  const sendStep = async (step: StepDefinition, action: "test" | "send_now") => {
    if (!target) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, action, sequence: step.sequence, step: step.step }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Could not send");
      if (action === "test") toast.success("Test email sent to the admin inbox");
      else toast.success(body.sent ? "Email sent" : body.mode === "live" ? "Email queued" : "Queued. It will go out once sending is switched to live.");
      if (action === "send_now") { await load(target); onChanged(); }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSaving(false);
    }
  };

  const load = useCallback(async (t: LifecycleTarget) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(t.member_id ? { member_id: t.member_id } : { lead_id: t.lead_id || "" });
      const res = await fetch("/api/admin/lifecycle/timeline?" + params.toString());
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to load timeline");
      const result = body as TimelineResponse;
      setData(result);
      setStageChoice(result.person.stage_override ?? "automatic");
      setStageReason(result.person.stage_override_reason ?? "");
      setVerdictReason(result.person.verdict_reason ?? "");
      setBasisChoice(result.person.marketing_basis ?? "none");
      setOutreachNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load timeline");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setData(null);
    if (target) load(target);
  }, [target, load]);

  const save = async (action: keyof typeof SAVED_MESSAGES, value: string | null, reason: string) => {
    if (!target) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/lifecycle", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, action, value, reason: reason.trim() || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Update failed");
      toast.success(SAVED_MESSAGES[action]);
      await load(target);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const person = data?.person;
  const facts: [string, string][] = person ? [
    ["Lead captured", person.lead_at ? memberDate(person.lead_at) : "No lead record"],
    ["Signed up", person.signed_up_at ? memberDate(person.signed_up_at) : "No account"],
    ["Email verified", person.member_id ? (person.email_confirmed_at ? memberDate(person.email_confirmed_at) : "Not verified") : "—"],
    ["Clients / requests", person.member_id ? person.client_count + " / " + person.request_count : "—"],
    ["First client upload", person.first_upload_at ? memberDate(person.first_upload_at) : "None yet"],
    ["Last seen", memberDate(person.last_seen_at)],
  ] : [];

  return (
    <Sheet open={!!target} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{person ? displayName(person) : "Contact timeline"}</SheetTitle>
          <SheetDescription className="break-all">
            {person ? [person.email_key, person.firm_name || person.lead_practice].filter(Boolean).join(" · ") : "Lifecycle, quality and history"}
          </SheetDescription>
        </SheetHeader>

        {loading && !person ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : error ? (
          <div className="space-y-3 py-6 text-sm">
            <p className="text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => target && load(target)}>Retry</Button>
          </div>
        ) : person ? (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <StageBadge person={person} />
              <QualityBadge person={person} />
              {person.role && person.role !== "owner" && <Badge variant="outline" className="text-xs capitalize">{person.role}</Badge>}
            </div>

            {(person.quality.signals.length > 0 || person.verdict_reason || person.stage_override_reason) && (
              <section aria-labelledby="lifecycle-why" className="space-y-2">
                <h3 id="lifecycle-why" className="text-sm font-semibold">Why</h3>
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {person.quality.signals.map((s) => <li key={s.text}>{s.text} <span className="text-xs">({s.strength})</span></li>)}
                  {person.verdict_reason && <li>Verdict note: {person.verdict_reason}</li>}
                  {person.stage_override_reason && <li>Stage note: {person.stage_override_reason}</li>}
                </ul>
              </section>
            )}

            <dl className="grid grid-cols-2 gap-4">
              {facts.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="text-sm break-words">{value}</dd>
                </div>
              ))}
            </dl>

            <section aria-labelledby="lifecycle-verdict" className="space-y-3 rounded-md border p-4">
              <h3 id="lifecycle-verdict" className="text-sm font-semibold">Is this a real prospect?</h3>
              <div className="space-y-1.5">
                <Label htmlFor="verdict-reason">Note (optional)</Label>
                <Input id="verdict-reason" maxLength={500} value={verdictReason}
                  onChange={(e) => setVerdictReason(e.target.value)} placeholder="e.g. Called the practice, genuine" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={saving} onClick={() => save("verdict", "real", verdictReason)}>
                  <ShieldCheck className="mr-1.5 h-4 w-4" />Mark real
                </Button>
                <Button size="sm" variant="outline" disabled={saving} className="text-destructive" onClick={() => setConfirmJunk(true)}>
                  <ShieldX className="mr-1.5 h-4 w-4" />Mark junk
                </Button>
                {person.verdict !== "unknown" && (
                  <Button size="sm" variant="ghost" disabled={saving} onClick={() => save("verdict", "unknown", verdictReason)}>
                    <RotateCcw className="mr-1.5 h-4 w-4" />Reset
                  </Button>
                )}
              </div>
            </section>

            <section aria-labelledby="lifecycle-stage" className="space-y-3 rounded-md border p-4">
              <h3 id="lifecycle-stage" className="text-sm font-semibold">Stage</h3>
              <p className="text-xs text-muted-foreground">Derived from activity: {STAGE_LABELS[person.derived_stage]}. Override only when the data is wrong.</p>
              <div className="space-y-1.5">
                <Label htmlFor="stage-choice">Stage</Label>
                <Select value={stageChoice} onValueChange={setStageChoice}>
                  <SelectTrigger id="stage-choice"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="automatic">Automatic (from activity)</SelectItem>
                    {OVERRIDABLE_STAGES.map((stage) => <SelectItem key={stage} value={stage}>{STAGE_LABELS[stage]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {stageChoice !== "automatic" && (
                <div className="space-y-1.5">
                  <Label htmlFor="stage-reason">Reason</Label>
                  <Input id="stage-reason" maxLength={500} value={stageReason} onChange={(e) => setStageReason(e.target.value)} />
                </div>
              )}
              <Button size="sm" disabled={saving || stageChoice === (person.stage_override ?? "automatic")}
                onClick={() => save("stage_override", stageChoice === "automatic" ? null : stageChoice, stageReason)}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Save stage
              </Button>
            </section>

            <section aria-labelledby="lifecycle-outreach" className="space-y-3 rounded-md border p-4">
              <h3 id="lifecycle-outreach" className="text-sm font-semibold">Follow-up email</h3>
              {person.is_internal ? (
                <p className="text-sm text-muted-foreground">Team account. Never emailed by follow-up sequences.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {person.suppression_reason && (
                      <Badge variant="outline" className="border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 capitalize">
                        Suppressed: {person.suppression_reason}
                      </Badge>
                    )}
                    {person.paused && <Badge variant="outline">Paused</Badge>}
                    <Badge variant="outline">Basis: {BASIS_LABELS[person.marketing_basis]}</Badge>
                  </div>
                  <dl className="grid grid-cols-2 gap-4">
                    <div><dt className="text-xs text-muted-foreground">Last sent</dt><dd className="text-sm">{person.last_outreach_at ? memberDate(person.last_outreach_at) : "Nothing sent"}</dd></div>
                    <div><dt className="text-xs text-muted-foreground">Next step</dt><dd className="text-sm break-words">{person.next_outreach_at ? memberDate(person.next_outreach_at) + " · " + person.next_outreach_step : "None scheduled"}</dd></div>
                  </dl>
                  <div className="space-y-1.5">
                    <Label htmlFor="basis-choice">Lawful basis for email</Label>
                    <Select value={basisChoice} onValueChange={(v) => setBasisChoice(v as MarketingBasis)}>
                      <SelectTrigger id="basis-choice"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {MARKETING_BASES.map((basis) => <SelectItem key={basis} value={basis}>{BASIS_LABELS[basis]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="outreach-note">Note {basisChoice !== person.marketing_basis && basisChoice !== "none" ? "(required: where does this basis come from?)" : "(optional)"}</Label>
                    <Input id="outreach-note" maxLength={500} value={outreachNote} onChange={(e) => setOutreachNote(e.target.value)} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={saving || basisChoice === person.marketing_basis || (basisChoice !== "none" && !outreachNote.trim())}
                      onClick={() => save("basis", basisChoice, outreachNote)}>Save basis</Button>
                    <Button size="sm" variant="outline" disabled={saving}
                      onClick={() => save("pause", person.paused ? "false" : "true", outreachNote)}>
                      {person.paused ? "Resume follow-ups" : "Pause follow-ups"}
                    </Button>
                    <Button size="sm" variant="outline" disabled={saving} onClick={() => save("replied", null, outreachNote)}>
                      They replied
                    </Button>
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Emails</h4>
                    {stepsFor(person).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No follow-up emails apply to this contact (only firm owners and leads get them).</p>
                    ) : (
                      <ul className="space-y-3">
                        {stepsFor(person).map((step) => {
                          const blocked = person.suppression_reason ? "On the suppression list"
                            : !basisCovers(person.marketing_basis, step) ? (person.marketing_basis === "lead_form" ? "Lead form covers only the tracker follow-up" : "No lawful basis recorded")
                            : null;
                          return (
                            <li key={step.sequence + step.step} className="space-y-1.5">
                              <div>
                                <p className="text-sm font-medium">{step.label}</p>
                                <p className="text-xs text-muted-foreground">{step.timing}{blocked && " · " + blocked}</p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button size="sm" variant="ghost" onClick={() => setPreviewStep(step)}>Preview</Button>
                                <Button size="sm" variant="ghost" disabled={saving} onClick={() => sendStep(step, "test")}>Send test to me</Button>
                                <Button size="sm" variant="outline" disabled={saving || !!blocked} onClick={() => setConfirmStep(step)}>Send now</Button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </>
              )}
            </section>

            <section aria-labelledby="lifecycle-history" className="space-y-3">
              <h3 id="lifecycle-history" className="text-sm font-semibold">History</h3>
              {data.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recorded events.</p>
              ) : (
                <ol className="space-y-3 border-l pl-4">
                  {data.events.map((event, i) => (
                    <li key={event.kind + event.at + i} className="relative">
                      <span aria-hidden className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                      <p className="text-sm font-medium">{EVENT_LABELS[event.kind] ?? event.kind}</p>
                      <p className="text-xs text-muted-foreground">{memberDate(event.at)}</p>
                      {eventDetail(event) && <p className="text-xs text-muted-foreground break-words">{eventDetail(event)}</p>}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            {person.member_id && (
              <Link href={"/admin/members/" + person.member_id} className="inline-block text-sm text-primary hover:underline">
                Open full member profile
              </Link>
            )}

            <ConfirmationDialog
              open={confirmJunk}
              onOpenChange={setConfirmJunk}
              title="Mark as junk?"
              description="Junk records are excluded from the funnel and will never receive automated email. You can reset this later."
              confirmLabel="Mark junk"
              onConfirm={() => save("verdict", "junk", verdictReason)}
            />

            <ConfirmationDialog
              open={!!confirmStep}
              onOpenChange={(open) => { if (!open) setConfirmStep(null); }}
              title="Send this email now?"
              description={confirmStep ? `"${confirmStep.label}" will be sent to ${person.email_key}. Each email can only be sent once per person.` : ""}
              confirmLabel="Send"
              variant="warning"
              onConfirm={() => { if (confirmStep) sendStep(confirmStep, "send_now"); }}
            />

            <Dialog open={!!previewStep} onOpenChange={(open) => { if (!open) setPreviewStep(null); }}>
              <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
                {previewStep && (() => {
                  const rendered = previewStep.render(stepContext(person));
                  const email = buildOutreachEmail({ to: person.email_key, subject: rendered.subject, body: rendered.body, unsubscribeToken: null });
                  return (
                    <>
                      <DialogHeader>
                        <DialogTitle>{email.subject}</DialogTitle>
                        <DialogDescription>From {email.from} · Replies to {email.replyTo} · To {person.email_key}</DialogDescription>
                      </DialogHeader>
                      <pre className="whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-4 font-sans text-sm leading-relaxed">{email.text}</pre>
                      <p className="text-xs text-muted-foreground">The real email carries a personal unsubscribe link and one-click unsubscribe headers.</p>
                    </>
                  );
                })()}
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
