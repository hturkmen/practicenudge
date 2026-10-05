-- Records the lawful basis for follow-up email where it is created: the sign-up consent box and
-- the single follow-up promised on the /mtd lead form. Nothing is sent by this migration.
BEGIN;

-- Never downgrades a basis: explicit consent outranks the lead-form follow-up, and an existing
-- consent or corporate basis is left as it is.
CREATE FUNCTION public.outreach_record_basis(p_email text, p_basis text, p_evidence jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE key text := lower(btrim(p_email));
BEGIN
  IF key IS NULL OR key = '' THEN RETURN; END IF;
  IF p_basis NOT IN ('consent', 'lead_form') THEN
    RAISE EXCEPTION 'Only consent and lead_form are recorded automatically' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.outreach_contacts AS c (email, marketing_basis, basis_evidence, basis_recorded_at)
  VALUES (key, p_basis, p_evidence, now())
  ON CONFLICT (email) DO UPDATE SET marketing_basis = EXCLUDED.marketing_basis,
    basis_evidence = EXCLUDED.basis_evidence, basis_recorded_at = now(), updated_at = now()
  WHERE c.marketing_basis = 'none' OR (EXCLUDED.marketing_basis = 'consent' AND c.marketing_basis = 'lead_form');
END;
$$;
REVOKE ALL ON FUNCTION public.outreach_record_basis(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.outreach_record_basis(text, text, jsonb) TO service_role;

-- Email sign-ups carry the consent choice in their metadata. Google sign-ups are recorded by the
-- auth callback instead, because an OAuth redirect cannot carry metadata.
CREATE FUNCTION public.record_signup_marketing_consent()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.raw_user_meta_data->>'marketing_consent' = 'true' THEN
    PERFORM public.outreach_record_basis(NEW.email, 'consent', jsonb_build_object(
      'source', 'register_form',
      'wording_version', NEW.raw_user_meta_data->>'marketing_consent_version',
      'user_id', NEW.id,
      'given_at', NEW.created_at));
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Recording consent must never block an account from being created.
  RAISE WARNING 'record_signup_marketing_consent failed: %', SQLSTATE;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.record_signup_marketing_consent() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER record_signup_marketing_consent AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.record_signup_marketing_consent();

COMMIT;
