-- Lifecycle overview for our own leads and members (not our customers' clients).
-- Stages are derived from real events; only admin verdicts and stage overrides are stored.
-- Nothing in this migration sends email. Apply once, before deploying the matching application.
BEGIN;

-- One row per person, keyed by lower-cased email. Created on the first admin decision.
CREATE TABLE public.outreach_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) <= 254),
  verdict text NOT NULL DEFAULT 'unknown' CHECK (verdict IN ('unknown', 'real', 'junk')),
  verdict_reason text CHECK (length(verdict_reason) <= 500),
  verdict_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  verdict_at timestamptz,
  -- Suspension is a real account state, so it can never be set by hand here.
  stage_override text CHECK (stage_override IN
    ('new_lead', 'unverified', 'no_clients', 'no_requests', 'activated', 'stalled', 'lost')),
  stage_override_reason text CHECK (length(stage_override_reason) <= 500),
  stage_override_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  stage_override_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.outreach_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.outreach_contacts FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_contacts TO service_role;

CREATE INDEX IF NOT EXISTS idx_leads_email_lower ON public.leads (lower(email));

-- Contact decisions are audited like every other admin action.
ALTER TABLE public.admin_audit_logs DROP CONSTRAINT admin_audit_logs_target_entity_type_check;
ALTER TABLE public.admin_audit_logs ADD CONSTRAINT admin_audit_logs_target_entity_type_check
  CHECK (target_entity_type IN ('member', 'firm', 'contact'));
ALTER TABLE public.admin_audit_logs DROP CONSTRAINT admin_audit_logs_action_type_check;
ALTER TABLE public.admin_audit_logs ADD CONSTRAINT admin_audit_logs_action_type_check
  CHECK (action_type IN ('role_change', 'plan_change', 'suspend', 'reactivate',
    'verdict_change', 'stage_override'));

-- One row per person: their preferred membership (owner first) joined to their latest lead.
-- Firm facts come from base tables, so history from before migration 015 is included.
CREATE VIEW public.admin_lifecycle_overview AS
WITH member_rows AS (
  SELECT DISTINCT ON (lower(u.email))
    lower(u.email) AS email_key, fu.id AS member_id, fu.user_id, fu.firm_id, fu.role,
    fu.status AS member_status, nullif(u.raw_user_meta_data->>'full_name', '') AS member_name,
    f.name AS firm_name, f.plan, u.created_at AS signed_up_at, u.email_confirmed_at, u.last_sign_in_at
  FROM public.firm_users fu
  JOIN auth.users u ON u.id = fu.user_id
  JOIN public.firms f ON f.id = fu.firm_id
  WHERE u.email IS NOT NULL
  ORDER BY lower(u.email), (fu.role = 'owner') DESC, fu.created_at
), lead_rows AS (
  SELECT DISTINCT ON (lower(l.email))
    lower(l.email) AS email_key, l.id AS lead_id, l.name AS lead_name, l.practice AS lead_practice,
    l.client_count AS lead_client_range, l.source AS lead_source, l.status AS lead_status,
    min(l.created_at) OVER (PARTITION BY lower(l.email)) AS lead_at,
    count(*) OVER (PARTITION BY lower(l.email)) AS lead_count
  FROM public.leads l
  ORDER BY lower(l.email), l.created_at DESC
), people AS (
  SELECT coalesce(m.email_key, l.email_key) AS email_key,
    m.member_id, m.user_id, m.firm_id, m.role, m.member_status, m.member_name, m.firm_name, m.plan,
    m.signed_up_at, m.email_confirmed_at, m.last_sign_in_at,
    l.lead_id, l.lead_name, l.lead_practice, l.lead_client_range, l.lead_source, l.lead_status,
    l.lead_at, l.lead_count
  FROM member_rows m FULL JOIN lead_rows l ON l.email_key = m.email_key
)
SELECT p.*,
  fc.client_count, fc.first_client_at,
  fr.request_count, fr.first_request_at, fr.last_request_at,
  up.first_upload_at, fa.last_activity_at,
  greatest(p.last_sign_in_at, fa.last_activity_at, fr.last_request_at, p.signed_up_at, p.lead_at) AS last_seen_at,
  oc.id AS contact_id, coalesce(oc.verdict, 'unknown') AS verdict, oc.verdict_reason,
  oc.stage_override, oc.stage_override_reason,
  derived.stage AS derived_stage,
  coalesce(oc.stage_override, derived.stage) AS stage
FROM people p
LEFT JOIN LATERAL (
  SELECT count(*) AS client_count, min(c.created_at) AS first_client_at
  FROM public.clients c WHERE c.firm_id = p.firm_id
) fc ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS request_count, min(r.created_at) AS first_request_at, max(r.created_at) AS last_request_at
  FROM public.document_requests r WHERE r.firm_id = p.firm_id
) fr ON true
LEFT JOIN LATERAL (
  SELECT min(i.uploaded_at) AS first_upload_at
  FROM public.request_items i JOIN public.document_requests r ON r.id = i.request_id
  WHERE r.firm_id = p.firm_id
) up ON true
LEFT JOIN LATERAL (
  SELECT max(a.created_at) AS last_activity_at
  FROM public.member_activity_logs a WHERE a.user_id = p.user_id AND a.firm_id = p.firm_id
) fa ON true
LEFT JOIN public.outreach_contacts oc ON oc.email = p.email_key
CROSS JOIN LATERAL (
  SELECT CASE
    WHEN p.member_id IS NULL THEN CASE WHEN p.lead_status = 'lost' THEN 'lost' ELSE 'new_lead' END
    WHEN p.member_status = 'suspended' THEN 'suspended'
    WHEN p.email_confirmed_at IS NULL THEN 'unverified'
    WHEN fr.first_request_at IS NOT NULL THEN CASE
      WHEN greatest(p.last_sign_in_at, fa.last_activity_at, fr.last_request_at, p.signed_up_at)
        < now() - interval '21 days' THEN 'stalled'
      ELSE 'activated' END
    WHEN fc.client_count > 0 THEN 'no_requests'
    ELSE 'no_clients'
  END AS stage
) derived;
REVOKE ALL ON public.admin_lifecycle_overview FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_lifecycle_overview TO service_role;

-- Callers pass record IDs, never an email address, so no address appears in request URLs or logs.
CREATE FUNCTION public.admin_contact_email(p_member_id uuid, p_lead_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(
    (SELECT lower(u.email) FROM public.firm_users fu JOIN auth.users u ON u.id = fu.user_id
      WHERE fu.id = p_member_id),
    (SELECT lower(l.email) FROM public.leads l WHERE l.id = p_lead_id));
$$;
REVOKE ALL ON FUNCTION public.admin_contact_email(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_contact_email(uuid, uuid) TO service_role;

CREATE FUNCTION public.admin_contact_timeline(p_member_id uuid DEFAULT NULL, p_lead_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH k AS (
    SELECT public.admin_contact_email(p_member_id, p_lead_id) AS key
  ), person AS (
    SELECT o.* FROM public.admin_lifecycle_overview o JOIN k ON o.email_key = k.key
  ), events AS (
    SELECT l.created_at AS occurred_at, 'lead_captured' AS kind,
      jsonb_build_object('source', l.source, 'practice', l.practice) AS detail
    FROM public.leads l JOIN k ON lower(l.email) = k.key
    UNION ALL SELECT signed_up_at, 'signed_up', jsonb_build_object('firm', firm_name, 'plan', plan)
      FROM person WHERE signed_up_at IS NOT NULL
    UNION ALL SELECT email_confirmed_at, 'email_verified', '{}'::jsonb
      FROM person WHERE email_confirmed_at IS NOT NULL
    UNION ALL SELECT first_client_at, 'first_client', jsonb_build_object('clients_now', client_count)
      FROM person WHERE first_client_at IS NOT NULL
    UNION ALL SELECT first_request_at, 'first_request', jsonb_build_object('requests_now', request_count)
      FROM person WHERE first_request_at IS NOT NULL
    UNION ALL SELECT first_upload_at, 'first_upload', '{}'::jsonb
      FROM person WHERE first_upload_at IS NOT NULL
    UNION ALL SELECT last_sign_in_at, 'last_sign_in', '{}'::jsonb
      FROM person WHERE last_sign_in_at IS NOT NULL
    UNION ALL SELECT n.sent_at, 'welcome_email_sent', '{}'::jsonb
      FROM public.admin_signup_notifications n JOIN person p ON n.member_id = p.member_id
      WHERE n.kind = 'welcome' AND n.sent_at IS NOT NULL
    UNION ALL SELECT s.created_at, 'plan_changed', jsonb_build_object('from', s.previous_plan, 'to', s.new_plan)
      FROM public.subscription_history s JOIN person p ON s.firm_id = p.firm_id
    UNION ALL SELECT a.created_at, 'admin_' || a.action_type, a.details
      FROM public.admin_audit_logs a JOIN person p ON a.target_entity_id = p.contact_id
      WHERE a.target_entity_type = 'contact'
  )
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM person) THEN NULL ELSE jsonb_build_object(
    'person', (SELECT to_jsonb(p) FROM person p),
    'events', (SELECT coalesce(jsonb_agg(jsonb_build_object('at', occurred_at, 'kind', kind, 'detail', detail)
      ORDER BY occurred_at DESC), '[]'::jsonb) FROM events)
  ) END;
$$;
REVOKE ALL ON FUNCTION public.admin_contact_timeline(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_contact_timeline(uuid, uuid) TO service_role;

-- The decision and its audit entry commit together or not at all.
CREATE FUNCTION public.admin_update_contact(p_admin uuid, p_member_id uuid, p_lead_id uuid,
  p_action text, p_value text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  key text := public.admin_contact_email(p_member_id, p_lead_id);
  prev_row public.outreach_contacts;
  next_row public.outreach_contacts;
  reason text := nullif(btrim(p_reason), '');
BEGIN
  IF key IS NULL THEN RAISE EXCEPTION 'Unknown contact' USING ERRCODE = 'P0002'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = p_admin) THEN
    RAISE EXCEPTION 'Not a super admin' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.outreach_contacts (email) VALUES (key) ON CONFLICT (email) DO NOTHING;
  SELECT * INTO prev_row FROM public.outreach_contacts WHERE email = key FOR UPDATE;
  IF p_action = 'verdict' THEN
    UPDATE public.outreach_contacts SET verdict = p_value, verdict_reason = reason,
      verdict_by = p_admin, verdict_at = now(), updated_at = now()
    WHERE id = prev_row.id RETURNING * INTO next_row;
    INSERT INTO public.admin_audit_logs (admin_user_id, target_entity_id, target_entity_type, action_type, details)
    VALUES (p_admin, prev_row.id, 'contact', 'verdict_change',
      jsonb_build_object('previous', prev_row.verdict, 'new', next_row.verdict, 'reason', reason));
  ELSIF p_action = 'stage_override' THEN
    UPDATE public.outreach_contacts SET stage_override = p_value,
      stage_override_reason = CASE WHEN p_value IS NULL THEN NULL ELSE reason END,
      stage_override_by = p_admin, stage_override_at = now(), updated_at = now()
    WHERE id = prev_row.id RETURNING * INTO next_row;
    INSERT INTO public.admin_audit_logs (admin_user_id, target_entity_id, target_entity_type, action_type, details)
    VALUES (p_admin, prev_row.id, 'contact', 'stage_override',
      jsonb_build_object('previous', prev_row.stage_override, 'new', next_row.stage_override, 'reason', reason));
  ELSE
    RAISE EXCEPTION 'Unknown contact action' USING ERRCODE = '22023';
  END IF;
  RETURN jsonb_build_object('verdict', next_row.verdict, 'stage_override', next_row.stage_override);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_update_contact(uuid, uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_contact(uuid, uuid, uuid, text, text, text) TO service_role;

COMMIT;
