-- Applied by apply-migrations.mjs AFTER the real migrations, to the local demo database only.
-- It is not a migration and is never run anywhere else.
--
-- Why: applied in order on an empty database, migration 006 leaves a policy on firm_users that selects from
-- firm_users, which Postgres rejects with "infinite recursion detected in policy" for every signed-in query.
-- A SECURITY DEFINER helper reads the memberships without going through the policy.

CREATE OR REPLACE FUNCTION public.demo_my_firm_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT firm_id FROM public.firm_users WHERE user_id = auth.uid()
$$;

DROP POLICY IF EXISTS "Users can view firm members of own firm" ON firm_users;
CREATE POLICY "Users can view firm members of own firm" ON firm_users
  FOR SELECT USING (firm_id IN (SELECT public.demo_my_firm_ids()));
