import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/admin/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { runMtdUpdatesJob } from "@/lib/mtd-updates/job";
import { uniqueSlug, updateSlug } from "@/lib/mtd-updates/slug";
import { isUpdateAction, validateNote } from "@/lib/mtd-updates/validate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const COLUMNS =
  "id, title, body, source_url, source_title, source_summary, source_updated_at, draft_origin, status, slug, created_at, published_at";

/** GET: drafts waiting for review, recently published notes and how many were rejected. */
export async function GET() {
  const admin = await requireSuperAdmin();
  if ("response" in admin) return admin.response;

  const supabase = createServiceClient();
  const [pending, published, rejected] = await Promise.all([
    supabase.from("mtd_updates").select(COLUMNS).eq("status", "pending").order("source_updated_at", { ascending: false }).limit(100),
    supabase.from("mtd_updates").select(COLUMNS).eq("status", "published").order("published_at", { ascending: false }).limit(30),
    supabase.from("mtd_updates").select("id", { count: "exact", head: true }).eq("status", "rejected"),
  ]);
  const failed = pending.error ?? published.error ?? rejected.error;
  if (failed) {
    const hint = /mtd_updates/.test(failed.message) ? " (run supabase/migrations/020_mtd_updates.sql)" : "";
    return NextResponse.json({ error: `Database error: ${failed.message}${hint}` }, { status: 500 });
  }
  return NextResponse.json({ pending: pending.data ?? [], published: published.data ?? [], rejectedCount: rejected.count ?? 0 });
}

/**
 * POST { action: 'ingest' }: check GOV.UK now (no e-mail, the admin is already looking).
 * PATCH { id, action: 'publish' | 'save' | 'reject' | 'unpublish', title?, body? }.
 */
export async function POST(request: Request) {
  const admin = await requireSuperAdmin();
  if ("response" in admin) return admin.response;

  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (body.action !== "ingest") return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const result = await runMtdUpdatesJob(createServiceClient(), { notify: false });
  return NextResponse.json(result, { status: "error" in result ? 502 : 200 });
}

export async function PATCH(request: Request) {
  const admin = await requireSuperAdmin();
  if ("response" in admin) return admin.response;

  let body: { id?: unknown; action?: unknown; title?: unknown; body?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (typeof body.id !== "string" || !body.id || !isUpdateAction(body.action) || body.action === "ingest") {
    return NextResponse.json({ error: "id and a valid action are required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const current = await supabase.from("mtd_updates").select("id, title, body, status, slug, draft_origin").eq("id", body.id).maybeSingle();
  if (current.error) return NextResponse.json({ error: current.error.message }, { status: 500 });
  if (!current.data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const row = current.data as { id: string; title: string; body: string; status: string; slug: string | null; draft_origin: string };

  const now = new Date();
  const patch: Record<string, unknown> = { reviewed_at: now.toISOString() };

  if (body.action === "publish" || body.action === "save") {
    // Edits are optional: without them the stored draft is what gets checked and published.
    const edited = body.title !== undefined || body.body !== undefined;
    const note = validateNote({ title: body.title ?? row.title, body: body.body ?? row.body });
    if (!note.ok) return NextResponse.json({ error: note.error }, { status: 400 });
    patch.title = note.title;
    patch.body = note.body;
    if (edited && (note.title !== row.title || note.body !== row.body)) patch.draft_origin = "manual";

    if (body.action === "publish") {
      patch.status = "published";
      patch.published_at = now.toISOString();
      if (!row.slug) {
        patch.slug = await uniqueSlug(updateSlug(note.title, now), async (slug) => {
          const hit = await supabase.from("mtd_updates").select("id").eq("slug", slug).neq("id", row.id).maybeSingle();
          return !!hit.data;
        });
      }
    }
  } else if (body.action === "reject") {
    patch.status = "rejected";
    patch.published_at = null;
  } else if (body.action === "unpublish") {
    patch.status = "pending";
    patch.published_at = null;
  }

  const updated = await supabase.from("mtd_updates").update(patch).eq("id", row.id).select("id, slug").maybeSingle();
  if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 500 });

  // Public pages are cached for an hour: refresh them now so a publish or unpublish shows at once.
  const slug = (updated.data as { slug: string | null } | null)?.slug ?? row.slug;
  for (const path of ["/updates", "/updates/rss.xml", "/sitemap.xml"]) revalidatePath(path);
  if (slug) revalidatePath(`/updates/${slug}`);

  return NextResponse.json({ success: true, slug });
}
