-- Outreach infrastructure for our own leads and members: outbox, suppression list, delivery events.
-- Nothing is sent by this migration. Sending also requires OUTREACH_MODE=live in the application.
BEGIN;

-- Suppression is matched on a hash so an erased person stays suppressed without keeping their address.
CREATE FUNCTION public.outreach_email_hash(p_email text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
  SELECT encode(sha256(convert_to(lower(btrim(p_email)), 'UTF8')), 'hex');
$$;
REVOKE ALL ON FUNCTION public.outreach_email_hash(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_email_hash(text) TO service_role;

ALTER TABLE public.outreach_contacts
  -- 'lead_form' covers only the single follow-up promised on the /mtd form.
  ADD COLUMN marketing_basis text NOT NULL DEFAULT 'none'
    CHECK (marketing_basis IN ('none', 'consent', 'lead_form', 'corporate')),
  ADD COLUMN basis_evidence jsonb,
  ADD COLUMN basis_recorded_at timestamptz,
  ADD COLUMN paused boolean NOT NULL DEFAULT false,
  ADD COLUMN paused_reason text CHECK (length(paused_reason) <= 500),
  ADD COLUMN paused_at timestamptz;

CREATE TABLE public.outreach_suppressions (
  id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  email_hash text PRIMARY KEY CHECK (email_hash ~ '^[0-9a-f]{64}$'),
  -- Shown in the admin list; cleared on erasure so only the hash remains.
  email text CHECK (email IS NULL OR (email = lower(email) AND length(email) <= 254)),
  reason text NOT NULL CHECK (reason IN ('unsubscribe', 'bounce', 'complaint', 'manual', 'erasure')),
  source text NOT NULL CHECK (length(source) <= 50),
  note text CHECK (length(note) <= 500),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.outreach_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES public.outreach_contacts(id) ON DELETE CASCADE,
  sequence_key text NOT NULL CHECK (sequence_key ~ '^[a-z0-9_]{1,40}$'),
  step_key text NOT NULL CHECK (step_key ~ '^[a-z0-9_]{1,40}$'),
  -- A step can only ever be sent once per person, however often jobs retry or overlap.
  UNIQUE (contact_id, sequence_key, step_key),
  -- The stage the step was written for; the send is cancelled if the person has moved on.
  required_stage text,
  manual boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'processing', 'sent', 'failed', 'cancelled', 'review_required')),
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 0,
  first_attempt_at timestamptz,
  locked_until timestamptz,
  lock_token uuid,
  -- Persisted on first attempt so retries reuse the same payload and idempotency key.
  message jsonb,
  provider_message_id text UNIQUE,
  last_error text,
  cancel_reason text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outreach_messages_due ON public.outreach_messages (scheduled_for)
  WHERE status IN ('scheduled', 'processing', 'failed');
CREATE INDEX outreach_messages_contact ON public.outreach_messages (contact_id, sent_at DESC);

CREATE TABLE public.outreach_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid REFERENCES public.outreach_contacts(id) ON DELETE CASCADE,
  message_id uuid REFERENCES public.outreach_messages(id) ON DELETE CASCADE,
  kind text NOT NULL
    CHECK (kind IN ('delivered', 'delivery_delayed', 'bounced', 'complained', 'unsubscribed', 'replied')),
  -- Webhook deliveries are retried by the provider; the event ID makes recording idempotent.
  provider_event_id text UNIQUE,
  detail jsonb NOT NULL DEFAULT '{}',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX outreach_events_contact ON public.outreach_events (contact_id, occurred_at DESC);

ALTER TABLE public.outreach_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.outreach_suppressions, public.outreach_messages, public.outreach_events FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.outreach_suppressions, public.outreach_messages, public.outreach_events TO service_role;

ALTER TABLE public.admin_audit_logs DROP CONSTRAINT admin_audit_logs_target_entity_type_check;
ALTER TABLE public.admin_audit_logs ADD CONSTRAINT admin_audit_logs_target_entity_type_check
  CHECK (target_entity_type IN ('member', 'firm', 'contact', 'suppression'));
ALTER TABLE public.admin_audit_logs DROP CONSTRAINT admin_audit_logs_action_type_check;
ALTER TABLE public.admin_audit_logs ADD CONSTRAINT admin_audit_logs_action_type_check
  CHECK (action_type IN ('role_change', 'plan_change', 'suspend', 'reactivate',
    'verdict_change', 'stage_override', 'outreach_pause', 'outreach_resume', 'basis_change',
    'mark_replied', 'suppress', 'unsuppress', 'outreach_send_now', 'test_send'));

-- Same definition as migration 016 with outreach facts appended (a view may only gain columns at the end).
CREATE OR REPLACE VIEW public.admin_lifecycle_overview AS
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
  coalesce(oc.stage_override, derived.stage) AS stage,
  -- Team accounts are never prospects: excluded from funnels, review and sequences.
  EXISTS (SELECT 1 FROM public.super_admins sa WHERE sa.user_id = p.user_id) AS is_internal,
  coalesce(oc.marketing_basis, 'none') AS marketing_basis,
  coalesce(oc.paused, false) AS paused,
  (SELECT s.reason FROM public.outreach_suppressions s
    WHERE s.email_hash = public.outreach_email_hash(p.email_key)) AS suppression_reason,
  (SELECT max(m.sent_at) FROM public.outreach_messages m
    WHERE m.contact_id = oc.id AND m.status = 'sent') AS last_outreach_at,
  nx.scheduled_for AS next_outreach_at,
  nx.step AS next_outreach_step
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
) derived
LEFT JOIN LATERAL (
  SELECT m.scheduled_for, m.sequence_key || '/' || m.step_key AS step
  FROM public.outreach_messages m
  WHERE m.contact_id = oc.id AND m.status IN ('scheduled', 'processing', 'failed')
  ORDER BY m.scheduled_for LIMIT 1
) nx ON true;

-- Timeline now includes what we sent, what the provider reported and any suppression.
CREATE OR REPLACE FUNCTION public.admin_contact_timeline(p_member_id uuid DEFAULT NULL, p_lead_id uuid DEFAULT NULL)
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
    UNION ALL SELECT CASE m.status WHEN 'sent' THEN m.sent_at WHEN 'scheduled' THEN m.scheduled_for ELSE m.updated_at END,
      'outreach_' || m.status,
      jsonb_build_object('sequence', m.sequence_key, 'step', m.step_key, 'subject', m.message->>'subject',
        'manual', m.manual, 'reason', coalesce(m.cancel_reason, m.last_error))
      FROM public.outreach_messages m JOIN person p ON m.contact_id = p.contact_id
    UNION ALL SELECT e.occurred_at, 'outreach_' || e.kind, e.detail
      FROM public.outreach_events e JOIN person p ON e.contact_id = p.contact_id
    UNION ALL SELECT s.created_at, 'suppressed', jsonb_build_object('reason', s.reason, 'source', s.source)
      FROM public.outreach_suppressions s JOIN person p ON s.email_hash = public.outreach_email_hash(p.email_key)
  )
  SELECT CASE WHEN NOT EXISTS (SELECT 1 FROM person) THEN NULL ELSE jsonb_build_object(
    'person', (SELECT to_jsonb(p) FROM person p),
    'events', (SELECT coalesce(jsonb_agg(jsonb_build_object('at', occurred_at, 'kind', kind, 'detail', detail)
      ORDER BY occurred_at DESC), '[]'::jsonb) FROM events)
  ) END;
$$;

-- Adds a suppression and cancels anything still queued for that address.
CREATE FUNCTION public.outreach_add_suppression(p_email text, p_reason text, p_source text,
  p_note text DEFAULT NULL, p_admin uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  key text := lower(btrim(p_email));
  suppression_id uuid;
BEGIN
  IF key IS NULL OR key !~ '^[^@\s]+@[^@\s]+$' OR length(key) > 254 THEN
    RAISE EXCEPTION 'Invalid email' USING ERRCODE = '22023';
  END IF;
  -- A stronger reason replaces a weaker one, so a complaint is never hidden behind a removable manual entry.
  INSERT INTO public.outreach_suppressions AS s (email_hash, email, reason, source, note, created_by)
  VALUES (public.outreach_email_hash(key), key, p_reason, p_source, nullif(btrim(p_note), ''), p_admin)
  ON CONFLICT (email_hash) DO UPDATE SET reason = EXCLUDED.reason, source = EXCLUDED.source
  WHERE array_position(ARRAY['manual', 'bounce', 'unsubscribe', 'complaint', 'erasure'], EXCLUDED.reason)
    > array_position(ARRAY['manual', 'bounce', 'unsubscribe', 'complaint', 'erasure'], s.reason);
  SELECT id INTO suppression_id FROM public.outreach_suppressions WHERE email_hash = public.outreach_email_hash(key);
  UPDATE public.outreach_messages m SET status = 'cancelled', cancel_reason = 'suppressed',
    locked_until = NULL, updated_at = now()
  FROM public.outreach_contacts c
  WHERE c.id = m.contact_id AND c.email = key AND m.status IN ('scheduled', 'failed');
  IF p_admin IS NOT NULL THEN
    INSERT INTO public.admin_audit_logs (admin_user_id, target_entity_id, target_entity_type, action_type, details)
    VALUES (p_admin, suppression_id, 'suppression', 'suppress', jsonb_build_object('reason', p_reason, 'note', p_note));
  END IF;
  RETURN suppression_id;
END;
$$;
REVOKE ALL ON FUNCTION public.outreach_add_suppression(text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_add_suppression(text, text, text, text, uuid) TO service_role;

-- A person's own unsubscribe or complaint can never be lifted by an admin.
CREATE FUNCTION public.outreach_remove_suppression(p_admin uuid, p_suppression_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE removed public.outreach_suppressions;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = p_admin) THEN
    RAISE EXCEPTION 'Not a super admin' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.outreach_suppressions
  WHERE id = p_suppression_id AND reason IN ('manual', 'bounce') RETURNING * INTO removed;
  IF removed.id IS NULL THEN
    RAISE EXCEPTION 'Suppression not found or not removable' USING ERRCODE = 'P0002';
  END IF;
  INSERT INTO public.admin_audit_logs (admin_user_id, target_entity_id, target_entity_type, action_type, details)
  VALUES (p_admin, removed.id, 'suppression', 'unsuppress', jsonb_build_object('reason', removed.reason));
END;
$$;
REVOKE ALL ON FUNCTION public.outreach_remove_suppression(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_remove_suppression(uuid, uuid) TO service_role;

-- Called from a verified unsubscribe token (contact) or the email form (address only).
CREATE FUNCTION public.outreach_unsubscribe(p_contact_id uuid, p_email text, p_source text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  contact public.outreach_contacts;
BEGIN
  IF p_contact_id IS NOT NULL THEN
    SELECT * INTO contact FROM public.outreach_contacts WHERE id = p_contact_id;
  ELSE
    SELECT * INTO contact FROM public.outreach_contacts WHERE email = lower(btrim(p_email));
  END IF;
  IF contact.id IS NULL AND p_email IS NULL THEN RETURN; END IF;
  PERFORM public.outreach_add_suppression(coalesce(contact.email, p_email), 'unsubscribe', p_source);
  IF contact.id IS NOT NULL THEN
    INSERT INTO public.outreach_events (contact_id, kind, detail)
    VALUES (contact.id, 'unsubscribed', jsonb_build_object('source', p_source));
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.outreach_unsubscribe(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_unsubscribe(uuid, text, text) TO service_role;

-- Provider webhooks report on every email in the account; only our outreach messages are recorded.
CREATE FUNCTION public.outreach_record_event(p_provider_event_id text, p_provider_message_id text,
  p_kind text, p_detail jsonb, p_occurred_at timestamptz)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  msg public.outreach_messages;
  contact_email text;
  inserted uuid;
BEGIN
  SELECT * INTO msg FROM public.outreach_messages WHERE provider_message_id = p_provider_message_id;
  IF msg.id IS NULL THEN RETURN 'ignored'; END IF;
  INSERT INTO public.outreach_events (contact_id, message_id, kind, provider_event_id, detail, occurred_at)
  VALUES (msg.contact_id, msg.id, p_kind, p_provider_event_id, coalesce(p_detail, '{}'::jsonb),
    coalesce(p_occurred_at, now()))
  ON CONFLICT (provider_event_id) DO NOTHING RETURNING id INTO inserted;
  IF inserted IS NULL THEN RETURN 'duplicate'; END IF;
  IF p_kind IN ('bounced', 'complained') THEN
    SELECT email INTO contact_email FROM public.outreach_contacts WHERE id = msg.contact_id;
    PERFORM public.outreach_add_suppression(contact_email,
      CASE p_kind WHEN 'bounced' THEN 'bounce' ELSE 'complaint' END, 'provider_webhook');
  END IF;
  RETURN 'recorded';
END;
$$;
REVOKE ALL ON FUNCTION public.outreach_record_event(text, text, text, jsonb, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_record_event(text, text, text, jsonb, timestamptz) TO service_role;

-- Exit rules are enforced at send time, not only when a step was scheduled.
CREATE FUNCTION public.claim_outreach_messages(p_limit integer DEFAULT 10)
RETURNS SETOF public.outreach_messages LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  london timestamp := now() AT TIME ZONE 'Europe/London';
  -- Automated steps go out on weekdays, 09:00-17:00 UK time; a human's "send now" is not delayed.
  in_hours boolean := extract(isodow FROM london) BETWEEN 1 AND 5 AND extract(hour FROM london) BETWEEN 9 AND 16;
BEGIN
  -- Provider idempotency keys expire after 24h; an ambiguous older attempt needs a human.
  UPDATE public.outreach_messages SET status = 'review_required', locked_until = NULL, updated_at = now(),
    last_error = 'Retry window expired; check provider delivery before resending.'
  WHERE status IN ('processing', 'failed') AND first_attempt_at < now() - interval '23 hours';

  UPDATE public.outreach_messages m SET status = 'cancelled', cancel_reason = x.reason,
    locked_until = NULL, updated_at = now()
  FROM (
    SELECT m2.id, CASE
      WHEN EXISTS (SELECT 1 FROM public.outreach_suppressions s
        WHERE s.email_hash = public.outreach_email_hash(c.email)) THEN 'suppressed'
      WHEN c.verdict = 'junk' THEN 'junk'
      WHEN o.email_key IS NULL THEN 'contact_gone'
      WHEN o.is_internal THEN 'internal'
      WHEN c.marketing_basis = 'none' THEN 'no_lawful_basis'
      WHEN NOT m2.manual AND m2.required_stage IS NOT NULL AND o.stage <> m2.required_stage THEN 'stage_changed'
      WHEN NOT m2.manual AND EXISTS (SELECT 1 FROM public.outreach_events e
        WHERE e.contact_id = c.id AND e.kind = 'replied') THEN 'replied'
      WHEN NOT m2.manual AND m2.scheduled_for < now() - interval '4 days' THEN 'stale'
      WHEN NOT m2.manual AND (SELECT count(*) FROM public.outreach_messages s2
        WHERE s2.contact_id = c.id AND s2.status = 'sent' AND NOT s2.manual) >= 4 THEN 'lifetime_cap'
    END AS reason
    FROM public.outreach_messages m2
    JOIN public.outreach_contacts c ON c.id = m2.contact_id
    LEFT JOIN public.admin_lifecycle_overview o ON o.email_key = c.email
    WHERE m2.status IN ('scheduled', 'failed') AND m2.scheduled_for <= now()
  ) x
  WHERE m.id = x.id AND x.reason IS NOT NULL;

  -- At most one automated email per person per 7 days: move the step, do not drop it.
  UPDATE public.outreach_messages m SET scheduled_for = x.last_sent + interval '7 days', updated_at = now()
  FROM (
    SELECT m2.id, max(s.sent_at) AS last_sent
    FROM public.outreach_messages m2
    JOIN public.outreach_messages s ON s.contact_id = m2.contact_id AND s.status = 'sent'
    WHERE m2.status = 'scheduled' AND NOT m2.manual AND m2.scheduled_for <= now()
    GROUP BY m2.id HAVING max(s.sent_at) > now() - interval '7 days'
  ) x
  WHERE m.id = x.id;

  RETURN QUERY
  WITH candidates AS (
    SELECT m.id FROM public.outreach_messages m
    JOIN public.outreach_contacts c ON c.id = m.contact_id
    WHERE ((m.status IN ('scheduled', 'failed') AND m.scheduled_for <= now())
        OR (m.status = 'processing' AND m.locked_until < now()))
      AND m.attempts < 8 AND NOT c.paused AND (m.manual OR in_hours)
    ORDER BY m.scheduled_for LIMIT greatest(1, least(p_limit, 25))
    FOR UPDATE OF m SKIP LOCKED
  )
  UPDATE public.outreach_messages m SET status = 'processing', attempts = m.attempts + 1,
    first_attempt_at = coalesce(m.first_attempt_at, now()), locked_until = now() + interval '5 minutes',
    lock_token = gen_random_uuid(), updated_at = now()
  FROM candidates WHERE m.id = candidates.id RETURNING m.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_outreach_messages(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_outreach_messages(integer) TO service_role;

-- Same signature as migration 016, with outreach controls added. Every change is audited atomically.
CREATE OR REPLACE FUNCTION public.admin_update_contact(p_admin uuid, p_member_id uuid, p_lead_id uuid,
  p_action text, p_value text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  key text := public.admin_contact_email(p_member_id, p_lead_id);
  prev_row public.outreach_contacts;
  next_row public.outreach_contacts;
  reason text := nullif(btrim(p_reason), '');
  audit_action text;
  audit_details jsonb;
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
    audit_action := 'verdict_change';
    audit_details := jsonb_build_object('previous', prev_row.verdict, 'new', next_row.verdict, 'reason', reason);
  ELSIF p_action = 'stage_override' THEN
    UPDATE public.outreach_contacts SET stage_override = p_value,
      stage_override_reason = CASE WHEN p_value IS NULL THEN NULL ELSE reason END,
      stage_override_by = p_admin, stage_override_at = now(), updated_at = now()
    WHERE id = prev_row.id RETURNING * INTO next_row;
    audit_action := 'stage_override';
    audit_details := jsonb_build_object('previous', prev_row.stage_override, 'new', next_row.stage_override, 'reason', reason);
  ELSIF p_action = 'pause' THEN
    IF p_value NOT IN ('true', 'false') THEN RAISE EXCEPTION 'Invalid pause value' USING ERRCODE = '22023'; END IF;
    UPDATE public.outreach_contacts SET paused = (p_value = 'true'),
      paused_reason = CASE WHEN p_value = 'true' THEN reason END,
      paused_at = CASE WHEN p_value = 'true' THEN now() END, updated_at = now()
    WHERE id = prev_row.id RETURNING * INTO next_row;
    audit_action := CASE WHEN p_value = 'true' THEN 'outreach_pause' ELSE 'outreach_resume' END;
    audit_details := jsonb_build_object('reason', reason);
  ELSIF p_action = 'basis' THEN
    -- Claiming a lawful basis needs a note saying where it came from.
    IF p_value <> 'none' AND reason IS NULL THEN
      RAISE EXCEPTION 'A note is required to record a lawful basis' USING ERRCODE = '22023';
    END IF;
    UPDATE public.outreach_contacts SET marketing_basis = p_value,
      basis_evidence = jsonb_build_object('source', 'admin', 'note', reason, 'recorded_by', p_admin),
      basis_recorded_at = now(), updated_at = now()
    WHERE id = prev_row.id RETURNING * INTO next_row;
    audit_action := 'basis_change';
    audit_details := jsonb_build_object('previous', prev_row.marketing_basis, 'new', next_row.marketing_basis, 'reason', reason);
  ELSIF p_action = 'replied' THEN
    -- A reply ends every automated sequence for this person.
    INSERT INTO public.outreach_events (contact_id, kind, detail)
    VALUES (prev_row.id, 'replied', jsonb_build_object('source', 'admin', 'note', reason));
    UPDATE public.outreach_messages SET status = 'cancelled', cancel_reason = 'replied', locked_until = NULL, updated_at = now()
    WHERE contact_id = prev_row.id AND status IN ('scheduled', 'failed') AND NOT manual;
    next_row := prev_row;
    audit_action := 'mark_replied';
    audit_details := jsonb_build_object('reason', reason);
  ELSE
    RAISE EXCEPTION 'Unknown contact action' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.admin_audit_logs (admin_user_id, target_entity_id, target_entity_type, action_type, details)
  VALUES (p_admin, prev_row.id, 'contact', audit_action, audit_details);
  RETURN jsonb_build_object('verdict', next_row.verdict, 'stage_override', next_row.stage_override,
    'paused', next_row.paused, 'marketing_basis', next_row.marketing_basis);
END;
$$;

COMMIT;
