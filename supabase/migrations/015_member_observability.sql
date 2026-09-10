-- Member observability. Apply once, before deploying the matching application.
BEGIN;

-- Activity now exists for every new member; deleting a firm must still cascade cleanly.
ALTER TABLE public.member_activity_logs DROP CONSTRAINT member_activity_logs_firm_id_fkey;
ALTER TABLE public.member_activity_logs ADD CONSTRAINT member_activity_logs_firm_id_fkey
  FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;
ALTER TABLE public.member_activity_logs DROP CONSTRAINT member_activity_logs_user_id_fkey;
ALTER TABLE public.member_activity_logs ADD CONSTRAINT member_activity_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Only database triggers may write the new trusted activity stream.
DROP POLICY IF EXISTS "Users can insert own member_activity_logs" ON public.member_activity_logs;
REVOKE INSERT, UPDATE, DELETE ON public.member_activity_logs FROM anon, authenticated;
ALTER TABLE public.member_activity_logs DROP CONSTRAINT member_activity_logs_action_type_check;
ALTER TABLE public.member_activity_logs ADD CONSTRAINT member_activity_logs_action_type_check
  CHECK (action_type IN ('login', 'registered', 'client_added', 'client_updated',
    'document_request_created', 'document_request_updated', 'document_request_sent',
    'document_request_completed', 'settings_changed', 'template_saved'));

CREATE OR REPLACE FUNCTION public.record_member_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  tenant uuid;
  event_name text;
BEGIN
  -- Public uploads and system jobs are not falsely attributed to an accountant.
  IF actor IS NULL THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'firms' THEN tenant := NEW.id; ELSE tenant := NEW.firm_id; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.firm_users
    WHERE user_id = actor AND firm_id = tenant AND status = 'active') THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND to_jsonb(OLD) = to_jsonb(NEW) THEN RETURN NEW; END IF;
  IF TG_TABLE_NAME = 'clients' THEN
    event_name := CASE WHEN TG_OP = 'INSERT' THEN 'client_added' ELSE 'client_updated' END;
  ELSIF TG_TABLE_NAME = 'document_requests' THEN
    event_name := CASE WHEN TG_OP = 'INSERT' THEN 'document_request_created'
      WHEN NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN 'document_request_completed'
      ELSE 'document_request_updated' END;
  ELSIF TG_TABLE_NAME = 'templates' THEN event_name := 'template_saved';
  ELSE event_name := 'settings_changed'; END IF;
  INSERT INTO public.member_activity_logs
    (user_id, firm_id, action_type, description, related_entity_id, metadata)
  VALUES (actor, tenant, event_name, replace(event_name, '_', ' '), NEW.id,
    jsonb_build_object('source', 'database'));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_member_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_member_client_change AFTER INSERT OR UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.record_member_change();
CREATE TRIGGER record_member_request_change AFTER INSERT OR UPDATE ON public.document_requests
  FOR EACH ROW EXECUTE FUNCTION public.record_member_change();
CREATE TRIGGER record_member_template_change AFTER INSERT OR UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.record_member_change();
CREATE TRIGGER record_member_settings_change AFTER UPDATE ON public.firms
  FOR EACH ROW EXECUTE FUNCTION public.record_member_change();

CREATE OR REPLACE FUNCTION public.record_member_sign_in()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.last_sign_in_at IS NOT NULL AND NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    INSERT INTO public.member_activity_logs (user_id, firm_id, action_type, description, created_at, metadata)
    SELECT NEW.id, fu.firm_id, 'login', 'Signed in', NEW.last_sign_in_at,
      jsonb_build_object('source', 'auth')
    FROM public.firm_users fu WHERE fu.user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_member_sign_in() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_member_sign_in AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.record_member_sign_in();

-- Private, durable outbox. No historic backfill: existing members must not cause an email flood.
CREATE TABLE public.admin_signup_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.firm_users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'admin_registration' CHECK (kind IN ('admin_registration', 'welcome')),
  UNIQUE(member_id, kind),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'review_required')),
  attempts integer NOT NULL DEFAULT 0,
  first_attempt_at timestamptz,
  locked_until timestamptz,
  lock_token uuid,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  -- Persist the exact message on first attempt so retries use the same idempotency payload.
  message jsonb,
  provider_message_id text,
  last_error text,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_signup_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_signup_notifications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_signup_notifications TO service_role;
CREATE INDEX admin_signup_notifications_pending ON public.admin_signup_notifications(next_attempt_at)
  WHERE status IN ('pending', 'processing', 'failed');

CREATE OR REPLACE FUNCTION public.queue_admin_signup_notification()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.admin_signup_notifications(member_id) VALUES (NEW.id)
    ON CONFLICT (member_id, kind) DO NOTHING;
  -- Preserve welcome email delivery; only a verified owner is eligible to receive it.
  IF NEW.role = 'owner' THEN
    INSERT INTO public.admin_signup_notifications(member_id, kind) VALUES (NEW.id, 'welcome')
      ON CONFLICT (member_id, kind) DO NOTHING;
  END IF;
  INSERT INTO public.member_activity_logs (user_id, firm_id, action_type, description, metadata)
  VALUES (NEW.user_id, NEW.firm_id, 'registered', 'Joined firm', jsonb_build_object('source', 'database'));
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.queue_admin_signup_notification() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER queue_admin_signup_notification AFTER INSERT ON public.firm_users
  FOR EACH ROW EXECUTE FUNCTION public.queue_admin_signup_notification();

-- Claim with row locks: concurrent webhook, dashboard and cron requests cannot double-send.
CREATE FUNCTION public.claim_admin_signup_notifications(p_member_id uuid DEFAULT NULL, p_limit integer DEFAULT 10)
RETURNS SETOF public.admin_signup_notifications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Resend keys expire after 24h. An ambiguous attempt older than 23h needs manual reconciliation.
  UPDATE public.admin_signup_notifications SET status = 'review_required', locked_until = NULL,
    last_error = 'Retry window expired; check provider delivery before resending.'
  WHERE status IN ('processing', 'failed') AND first_attempt_at < now() - interval '23 hours'
    AND (p_member_id IS NULL OR member_id = p_member_id);
  RETURN QUERY
  WITH candidates AS (
    SELECT n.id FROM public.admin_signup_notifications n
    WHERE (p_member_id IS NULL OR n.member_id = p_member_id)
      AND ((n.status IN ('pending', 'failed') AND n.next_attempt_at <= now())
        OR (n.status = 'processing' AND n.locked_until < now()))
      AND n.attempts < 8
      AND (n.kind = 'admin_registration' OR EXISTS (
        SELECT 1 FROM public.firm_users fu JOIN auth.users u ON u.id = fu.user_id
        WHERE fu.id = n.member_id AND u.email_confirmed_at IS NOT NULL))
    ORDER BY n.created_at LIMIT greatest(1, least(p_limit, 25)) FOR UPDATE SKIP LOCKED
  )
  UPDATE public.admin_signup_notifications n SET status = 'processing', attempts = n.attempts + 1,
    first_attempt_at = coalesce(n.first_attempt_at, now()), locked_until = now() + interval '5 minutes',
    lock_token = gen_random_uuid()
  FROM candidates c WHERE n.id = c.id RETURNING n.*;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_admin_signup_notifications(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_admin_signup_notifications(uuid, integer) TO service_role;

-- Private view joins the correct auth row before filtering and pagination.
-- Auth passwords, tokens and raw metadata are deliberately excluded.
CREATE VIEW public.admin_member_overview AS
SELECT fu.id, fu.user_id, fu.firm_id, fu.role, fu.status, fu.created_at,
  coalesce(nullif(u.raw_user_meta_data->>'full_name', ''), split_part(u.email, '@', 1), 'Unknown') AS name,
  coalesce(u.email, '') AS email, f.name AS firm_name, f.plan,
  u.created_at AS account_created_at, u.email_confirmed_at, u.last_sign_in_at,
  coalesce(u.raw_app_meta_data->'providers', '[]'::jsonb) AS providers,
  (SELECT max(a.created_at) FROM public.member_activity_logs a
    WHERE a.user_id = fu.user_id AND a.firm_id = fu.firm_id) AS last_activity_at,
  (SELECT count(*) FROM public.clients c WHERE c.firm_id = fu.firm_id) AS firm_client_count,
  (SELECT count(*) FROM public.document_requests r WHERE r.firm_id = fu.firm_id) AS firm_request_count
FROM public.firm_users fu JOIN auth.users u ON u.id = fu.user_id JOIN public.firms f ON f.id = fu.firm_id;
REVOKE ALL ON public.admin_member_overview FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_member_overview TO service_role;

CREATE FUNCTION public.admin_member_usage(p_member_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE tenant uuid; member_user uuid;
BEGIN
  SELECT fu.firm_id, fu.user_id INTO tenant, member_user FROM public.firm_users fu WHERE fu.id = p_member_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'clients', (SELECT count(*) FROM public.clients WHERE firm_id = tenant),
    'active_clients', (SELECT count(*) FROM public.clients WHERE firm_id = tenant AND status = 'active'),
    'requests', (SELECT count(*) FROM public.document_requests WHERE firm_id = tenant),
    'completed_requests', (SELECT count(*) FROM public.document_requests WHERE firm_id = tenant AND status = 'completed'),
    'overdue_requests', (SELECT count(*) FROM public.document_requests WHERE firm_id = tenant AND status = 'overdue'),
    'uploaded_files', (SELECT count(*) FROM public.request_items i JOIN public.document_requests r ON r.id = i.request_id
      WHERE r.firm_id = tenant AND i.file_url IS NOT NULL),
    'custom_templates', (SELECT count(*) FROM public.templates WHERE firm_id = tenant AND NOT is_system),
    'member_actions_30d', (SELECT count(*) FROM public.member_activity_logs WHERE user_id = member_user AND firm_id = tenant
      AND created_at >= now() - interval '30 days' AND metadata->>'source' IN ('database', 'auth')),
    'notifications', coalesce((SELECT jsonb_agg(n) FROM (
      SELECT channel, status, count(*) AS total FROM public.notification_logs
      WHERE firm_id = tenant GROUP BY channel, status ORDER BY channel, status) n), '[]'::jsonb),
    'templates', coalesce((SELECT jsonb_agg(t) FROM (
      SELECT t.id, t.name, t.is_system, count(*) AS requests FROM public.document_requests r
      JOIN public.templates t ON t.id = r.template_id WHERE r.firm_id = tenant
      GROUP BY t.id, t.name, t.is_system ORDER BY count(*) DESC, t.name LIMIT 50) t), '[]'::jsonb)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.admin_member_usage(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_member_usage(uuid) TO service_role;

COMMIT;
