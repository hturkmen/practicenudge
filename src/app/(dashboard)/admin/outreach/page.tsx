"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MailX, Send } from "lucide-react";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/admin-guard";
import { ConfirmationDialog } from "@/components/admin/confirmation-dialog";
import { memberDate } from "@/components/admin/member-insights";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Suppression = { id: string; email: string | null; reason: string; source: string; note: string | null; created_at: string };
type OutreachStatus = { mode: "off" | "dry_run" | "live"; token_secret_set: boolean; webhook_secret_set: boolean };

const MODE_LABELS = { off: "Off", dry_run: "Dry run (schedules, never sends)", live: "Live" };
const REMOVABLE = new Set(["manual", "bounce"]);

export default function OutreachPage() {
  const [status, setStatus] = useState<OutreachStatus | null>(null);
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Suppression | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/outreach");
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Failed to load outreach settings");
      setStatus(body.status);
      setSuppressions(body.suppressions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load outreach settings");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const addSuppression = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, note }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Could not add address");
      toast.success("Address suppressed");
      setEmail("");
      setNote("");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add address");
    } finally {
      setSaving(false);
    }
  };

  const removeSuppression = async (item: Suppression) => {
    try {
      const res = await fetch("/api/admin/outreach?id=" + encodeURIComponent(item.id), { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || "Could not remove");
      toast.success("Suppression removed");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove");
    }
  };

  const ready = (ok: boolean | undefined) => (
    <Badge variant="outline" className={ok
      ? "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
      : "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"}>
      {ok ? "Ready" : "Secret not set"}
    </Badge>
  );

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Send className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Outreach</h1>
            <p className="text-muted-foreground">Follow-up email to our own leads and members</p>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-md border border-destructive/50 px-4 py-3 text-sm">
            <span className="text-destructive">{error}</span>
            <Button variant="outline" size="sm" onClick={load}>Retry</Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sending status</CardTitle>
            <CardDescription>
              Controlled by the OUTREACH_MODE setting in Vercel. Nothing is emailed unless it is Live.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              {[
                ["Sending", status ? <Badge key="m" variant="outline">{MODE_LABELS[status.mode]}</Badge> : null],
                ["Unsubscribe links", status ? ready(status.token_secret_set) : null],
                ["Bounce and complaint webhook", status ? ready(status.webhook_secret_set) : null],
              ].map(([label, value]) => (
                <div key={label as string} className="min-w-0">
                  <dt className="text-xs text-muted-foreground">{label}</dt>
                  <dd className="mt-1 h-6">
                    {value ?? <span aria-hidden className="inline-block h-5 w-24 rounded-full bg-muted animate-pulse" />}
                  </dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suppression list</CardTitle>
            <CardDescription>
              Never emailed by any sequence. Unsubscribes and complaints are permanent; manual entries and bounces can be lifted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={addSuppression} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="suppress-email">Email address</Label>
                <Input id="suppress-email" type="email" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="suppress-note">Note (optional)</Label>
                <Input id="suppress-note" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Asked by phone not to be emailed" />
              </div>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}Suppress
              </Button>
            </form>

            {loading && !suppressions.length ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : suppressions.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                <MailX className="mx-auto mb-3 h-10 w-10 opacity-50" aria-hidden />
                <p>No suppressed addresses.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Note</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppressions.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium break-all">{item.email ?? <span className="text-muted-foreground">Erased</span>}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{item.reason}</Badge></TableCell>
                      <TableCell className="text-muted-foreground">{item.source.replace(/_/g, " ")}</TableCell>
                      <TableCell className="text-muted-foreground">{item.note || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{memberDate(item.created_at)}</TableCell>
                      <TableCell>
                        {REMOVABLE.has(item.reason) && (
                          <Button variant="ghost" size="sm" onClick={() => setRemoving(item)}>Remove</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ConfirmationDialog
          open={!!removing}
          onOpenChange={(open) => { if (!open) setRemoving(null); }}
          title="Remove from suppression list?"
          description={"Follow-up sequences may email " + (removing?.email ?? "this address") + " again if they qualify."}
          confirmLabel="Remove"
          variant="warning"
          onConfirm={() => { if (removing) removeSuppression(removing); }}
        />
      </div>
    </AdminGuard>
  );
}
