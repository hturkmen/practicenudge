import { createClient } from "@supabase/supabase-js";

export type PublishedUpdate = {
  slug: string;
  title: string;
  /** Markdown. */
  body: string;
  sourceUrl: string;
  sourceTitle: string;
  /** When GOV.UK last updated the source page. */
  sourceUpdatedAt: string;
  publishedAt: string;
};

type Row = {
  slug: string;
  title: string;
  body: string;
  source_url: string;
  source_title: string;
  source_updated_at: string;
  published_at: string;
};

const COLUMNS = "slug, title, body, source_url, source_title, source_updated_at, published_at";

function toUpdate(r: Row): PublishedUpdate {
  return {
    slug: r.slug,
    title: r.title,
    body: r.body,
    sourceUrl: r.source_url,
    sourceTitle: r.source_title,
    sourceUpdatedAt: r.source_updated_at,
    publishedAt: r.published_at,
  };
}

/** Anonymous client: row level security lets it read published notes and nothing else. */
function anonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function getPublishedUpdates(limit = 50): Promise<PublishedUpdate[]> {
  const supabase = anonClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("mtd_updates")
    .select(COLUMNS)
    .eq("status", "published")
    .not("slug", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[mtd-updates] could not load published updates:", error.message);
    return [];
  }
  return ((data ?? []) as Row[]).map(toUpdate);
}

export async function getPublishedUpdate(slug: string): Promise<PublishedUpdate | null> {
  const supabase = anonClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("mtd_updates")
    .select(COLUMNS)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[mtd-updates] could not load update:", error.message);
    return null;
  }
  return data ? toUpdate(data as Row) : null;
}
