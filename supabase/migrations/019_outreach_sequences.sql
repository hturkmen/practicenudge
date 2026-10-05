-- Sequences: a lead-form basis covers only its single promised follow-up, and admins can queue
-- a step by hand ("send now"), audited. Sending still requires OUTREACH_MODE=live.
BEGIN;

-- Same as migration 017, plus the rule that 'lead_form' only covers sequence 'lead_follow_up'.
CREATE OR REPLACE FUNCTION public.claim_outreach_messages(p_limit integer DEFAULT 10)
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
      -- The tracker form promised one follow-up and nothing else; this applies to manual sends too.
      WHEN c.marketing_basis = 'lead_form' AND m2.sequence_key <> 'lead_follow_up' THEN 'basis_does_not_cover'
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

-- Queues one step for one person by hand. A step already queued or sent is never queued twice.
CREATE FUNCTION public.outreach_send_now(p_admin uuid, p_member_id uuid, p_lead_id uuid,
  p_sequence text, p_step text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  key text := public.admin_contact_email(p_member_id, p_lead_id);
  contact public.outreach_contacts;
  message_id uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = p_admin) THEN
    RAISE EXCEPTION 'Not a super admin' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO contact FROM public.outreach_contacts WHERE email = key;
  IF contact.id IS NULL OR contact.marketing_basis = 'none' THEN
    RAISE EXCEPTION 'No lawful basis recorded' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.outreach_messages (contact_id, sequence_key, step_key, manual, created_by)
  VALUES (contact.id, p_sequence, p_step, true, p_admin)
  ON CONFLICT (contact_id, sequence_key, step_key) DO NOTHING RETURNING id INTO message_id;
  IF message_id IS NULL THEN
    RAISE EXCEPTION 'This step was already queued or sent' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.admin_audit_logs (admin_user_id, target_entity_id, target_entity_type, action_type, details)
  VALUES (p_admin, contact.id, 'contact', 'outreach_send_now', jsonb_build_object('sequence', p_sequence, 'step', p_step));
  RETURN message_id;
END;
$$;
REVOKE ALL ON FUNCTION public.outreach_send_now(uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_send_now(uuid, uuid, uuid, text, text) TO service_role;

COMMIT;
