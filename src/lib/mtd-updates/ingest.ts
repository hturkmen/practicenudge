import type { SupabaseClient } from "@supabase/supabase-js";
import { contentApiUrl, GOVUK_MTD_FEED, parseAtomEntries, recentEntries, textFromContentApi, type FeedEntry } from "./feed";
import { draftWithGemini, sourceDraft, type Draft } from "./draft";

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Items older than this are not considered new. */
export const WINDOW_DAYS = 21;
/** Drafts per run: keeps the AI calls and the reviewer's queue small. */
export const MAX_NEW_PER_RUN = 5;

export type IngestSummary = {
  fetched: number;
  recent: number;
  alreadyKnown: number;
  createdPending: number;
  createdRejected: number;
  aiDrafts: number;
  sourceDrafts: number;
  errors: number;
};

export type IngestDeps = {
  fetch?: FetchLike;
  now?: Date;
  geminiKey?: string;
  /** After this many milliseconds the remaining items get the plain GOV.UK draft, so the job always ends in time. */
  budgetMs?: number;
  /** Called once with a plain-text summary when new drafts need review. */
  notify?: (subject: string, body: string) => Promise<void>;
};

const UA = { "User-Agent": "Mozilla/5.0 (compatible; PracticeNudgeUpdates/1.0; +https://www.practicenudge.com)" };

async function fetchSourceText(entry: FeedEntry, fetchImpl: FetchLike): Promise<string> {
  const api = contentApiUrl(entry.url);
  if (!api) return "";
  try {
    const res = await fetchImpl(api, { headers: UA, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return "";
    return textFromContentApi(await res.json());
  } catch {
    return "";
  }
}

const key = (url: string, updatedAt: string) => `${url}|${new Date(updatedAt).toISOString()}`;

/**
 * Reads the GOV.UK MTD feed and stores a pending draft for each item not seen before. Drafts are
 * never public: a super admin publishes them at /admin/updates.
 */
export async function ingestMtdUpdates(supabase: SupabaseClient, deps: IngestDeps = {}): Promise<IngestSummary> {
  const fetchImpl = deps.fetch ?? fetch;
  const now = deps.now ?? new Date();
  const started = Date.now();
  const budgetMs = deps.budgetMs ?? 40_000;
  const summary: IngestSummary = {
    fetched: 0,
    recent: 0,
    alreadyKnown: 0,
    createdPending: 0,
    createdRejected: 0,
    aiDrafts: 0,
    sourceDrafts: 0,
    errors: 0,
  };

  const res = await fetchImpl(GOVUK_MTD_FEED, { headers: UA, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`GOV.UK feed returned ${res.status}`);
  const entries = parseAtomEntries(await res.text());
  summary.fetched = entries.length;

  const recent = recentEntries(entries, now, WINDOW_DAYS);
  summary.recent = recent.length;
  if (recent.length === 0) return summary;

  const { data: known, error: knownError } = await supabase
    .from("mtd_updates")
    .select("source_url, source_updated_at")
    .in("source_url", recent.map((e) => e.url));
  if (knownError) throw new Error(`Could not read existing updates: ${knownError.message}`);
  const seen = new Set((known ?? []).map((r: { source_url: string; source_updated_at: string }) => key(r.source_url, r.source_updated_at)));

  const fresh = recent.filter((e) => !seen.has(key(e.url, e.updatedAt)));
  summary.alreadyKnown = recent.length - fresh.length;

  const pendingTitles: string[] = [];
  for (const entry of fresh.slice(0, MAX_NEW_PER_RUN)) {
    const overBudget = Date.now() - started > budgetMs;
    const sourceText = overBudget ? "" : await fetchSourceText(entry, fetchImpl);
    let draft: Draft | null =
      deps.geminiKey && !overBudget ? await draftWithGemini(entry, sourceText, deps.geminiKey, fetchImpl) : null;
    if (draft?.origin === "ai") summary.aiDrafts++;
    if (!draft) {
      draft = sourceDraft(entry);
      summary.sourceDrafts++;
    }

    const rejected = draft.relevant === false;
    const { error } = await supabase.from("mtd_updates").insert({
      source_url: entry.url,
      source_title: entry.title,
      source_summary: entry.summary || null,
      source_updated_at: entry.updatedAt,
      title: rejected ? entry.title : draft.title,
      body: rejected ? "Judged not relevant to MTD for Income Tax practices by the drafting model." : draft.body,
      draft_origin: draft.origin,
      status: rejected ? "rejected" : "pending",
    });
    if (error) {
      // 23505: another run stored it first. Anything else is a real failure.
      if (error.code === "23505") summary.alreadyKnown++;
      else {
        summary.errors++;
        console.error("[mtd-updates] insert failed:", error.message);
      }
      continue;
    }
    if (rejected) summary.createdRejected++;
    else {
      summary.createdPending++;
      pendingTitles.push(draft.title);
    }
  }

  if (pendingTitles.length > 0 && deps.notify) {
    await deps
      .notify(
        `${pendingTitles.length} new MTD update draft${pendingTitles.length === 1 ? "" : "s"} to review`,
        `New GOV.UK items about Making Tax Digital were drafted and are waiting for your review. Nothing is public until you publish it.\n\n` +
          pendingTitles.map((t) => `- ${t}`).join("\n") +
          `\n\nReview: https://www.practicenudge.com/admin/updates`
      )
      .catch((e) => console.error("[mtd-updates] notify failed:", e instanceof Error ? e.message : e));
  }

  return summary;
}
