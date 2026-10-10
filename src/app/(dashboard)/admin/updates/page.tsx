"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/admin-guard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExternalLink, Loader2, Newspaper, RefreshCw } from "lucide-react";

type UpdateRow = {
  id: string;
  title: string;
  body: string;
  source_url: string;
  source_title: string;
  source_updated_at: string;
  draft_origin: "ai" | "source" | "manual";
  status: "pending" | "published" | "rejected";
  slug: string | null;
  published_at: string | null;
};

type Loaded = { pending: UpdateRow[]; published: UpdateRow[]; rejectedCount: number };

const ORIGIN_LABEL: Record<UpdateRow["draft_origin"], string> = {
  ai: "AI draft: check every fact against the source",
  source: "GOV.UK summary only (no AI draft)",
  manual: "Edited by you",
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function AdminUpdatesPage() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, { title: string; body: string }>>({});
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/updates");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || "Could not load updates");
        if (cancelled) return;
        setData(json as Loaded);
        setError("");
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load updates");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const valueOf = useCallback(
    (row: UpdateRow) => edits[row.id] ?? { title: row.title, body: row.body },
    [edits]
  );

  async function act(row: UpdateRow, action: "publish" | "save" | "reject" | "unpublish", done: string) {
    setBusy(row.id);
    try {
      const v = valueOf(row);
      const res = await fetch("/api/admin/updates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, action, ...(action === "publish" || action === "save" ? v : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "The action failed");
      toast.success(done);
      setEdits((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setReload((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The action failed");
    } finally {
      setBusy(null);
    }
  }

  async function checkNow() {
    setBusy("ingest");
    try {
      const res = await fetch("/api/admin/updates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ingest" }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not check GOV.UK");
      toast.success(`Checked GOV.UK: ${json.createdPending} new draft(s), ${json.alreadyKnown} already known.`);
      setReload((n) => n + 1);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not check GOV.UK");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Newspaper className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">MTD Updates</h1>
              <p className="text-muted-foreground">
                Drafts from GOV.UK wait here. Nothing is public until you publish it.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/updates" target="_blank">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" /> View public page
              </Button>
            </Link>
            <Button onClick={checkNow} disabled={busy === "ingest"} className="gap-2">
              {busy === "ingest" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Check GOV.UK now
            </Button>
          </div>
        </div>

        {!data && !error && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <Card>
            <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {data && (
          <>
            <section aria-labelledby="pending-title" className="space-y-4">
              <h2 id="pending-title" className="text-lg font-semibold">
                Waiting for review ({data.pending.length})
              </h2>
              {data.pending.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nothing to review. The daily check adds new GOV.UK items here, and you get an e-mail when it does.
                </p>
              )}
              {data.pending.map((row) => {
                const v = valueOf(row);
                const working = busy === row.id;
                return (
                  <Card key={row.id}>
                    <CardHeader>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={row.draft_origin === "ai" ? "default" : "secondary"}>{ORIGIN_LABEL[row.draft_origin]}</Badge>
                        <span className="text-xs text-muted-foreground">GOV.UK updated {fmt(row.source_updated_at)}</span>
                      </div>
                      <CardTitle className="text-base">{row.source_title}</CardTitle>
                      <CardDescription>
                        <a
                          href={row.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                        >
                          Open the GOV.UK page to check the draft <ExternalLink className="h-3 w-3" />
                        </a>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <label htmlFor={`t-${row.id}`} className="text-sm font-medium">Headline</label>
                        <Input
                          id={`t-${row.id}`}
                          value={v.title}
                          onChange={(e) => setEdits((p) => ({ ...p, [row.id]: { ...v, title: e.target.value } }))}
                        />
                      </div>
                      <div>
                        <label htmlFor={`b-${row.id}`} className="text-sm font-medium">Text (Markdown)</label>
                        <Textarea
                          id={`b-${row.id}`}
                          rows={9}
                          value={v.body}
                          onChange={(e) => setEdits((p) => ({ ...p, [row.id]: { ...v, body: e.target.value } }))}
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button disabled={working} onClick={() => act(row, "publish", "Published")}>
                          {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Publish
                        </Button>
                        <Button variant="outline" disabled={working} onClick={() => act(row, "save", "Saved")}>
                          Save changes
                        </Button>
                        <Button variant="ghost" disabled={working} onClick={() => act(row, "reject", "Rejected")}>
                          Reject
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </section>

            <section aria-labelledby="published-title" className="space-y-3">
              <h2 id="published-title" className="text-lg font-semibold">
                Published ({data.published.length}) · {data.rejectedCount} rejected
              </h2>
              {data.published.map((row) => (
                <Card key={row.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                    <div>
                      <p className="font-medium">{row.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.published_at ? `Published ${fmt(row.published_at)}` : ""}
                        {row.slug && (
                          <>
                            {" · "}
                            <Link href={`/updates/${row.slug}`} target="_blank" className="text-primary underline underline-offset-2">
                              /updates/{row.slug}
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy === row.id}
                      onClick={() => act(row, "unpublish", "Moved back to review")}
                    >
                      Unpublish
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </section>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
