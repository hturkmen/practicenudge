-- MTD Updates: short, dated, human-approved notes on what GOV.UK/HMRC published about
-- Making Tax Digital for Income Tax (shown at /updates).
--
-- A daily job reads GOV.UK's Atom feed and stores a DRAFT per new item (written by an AI model
-- from the GOV.UK text, or, without an API key, just the GOV.UK summary). Nothing is public until
-- a super admin reviews it at /admin/updates and publishes it.
--
-- Run once in the Supabase SQL Editor. Safe to run again.
BEGIN;

CREATE TABLE IF NOT EXISTS public.mtd_updates (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url        text NOT NULL,
  source_title      text NOT NULL,
  source_summary    text,
  source_updated_at timestamptz NOT NULL,
  title             text NOT NULL,
  body              text NOT NULL,                 -- Markdown, see src/lib/markdown.tsx
  draft_origin      text NOT NULL DEFAULT 'source' CHECK (draft_origin IN ('ai', 'source', 'manual')),
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'rejected')),
  slug              text UNIQUE,                   -- set when published
  created_at        timestamptz NOT NULL DEFAULT now(),
  reviewed_at       timestamptz,
  published_at      timestamptz,
  -- The same GOV.UK page can be updated again later: each update is a separate candidate.
  UNIQUE (source_url, source_updated_at)
);

CREATE INDEX IF NOT EXISTS idx_mtd_updates_status_published
  ON public.mtd_updates (status, published_at DESC);

ALTER TABLE public.mtd_updates ENABLE ROW LEVEL SECURITY;

-- Visitors (and the sitemap) may read published notes only. There are no write policies:
-- drafts are created and reviewed with the service role behind a super-admin check.
DROP POLICY IF EXISTS mtd_updates_public_read ON public.mtd_updates;
CREATE POLICY mtd_updates_public_read ON public.mtd_updates
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

COMMIT;

-- Check:
--   select status, count(*) from public.mtd_updates group by status;
