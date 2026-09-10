const { PGlite } = await import(process.env.PGLITE_MODULE_PATH || '@electric-sql/pglite');
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
process.on('uncaughtException', error => { console.error(error.message, error.detail || '', error.where || ''); process.exit(1); });
const db = new PGlite();
const root = new URL('../', import.meta.url).pathname;
await db.exec(`
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text, raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}', created_at timestamptz DEFAULT now(), email_confirmed_at timestamptz, last_sign_in_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_user::text $$;
GRANT USAGE ON SCHEMA auth, public TO authenticated, anon, service_role;
`);
for (const file of ['001_initial_schema.sql','003_auth_trigger.sql','005_super_admin.sql','007_notification_log_management.sql','009_super_admin_panel.sql','013_fix_cascade_constraints.sql']) {
  await db.exec(readFileSync(root+'supabase/migrations/'+file,'utf8').replace(/^INSERT INTO super_admins.*;$/m, ''));
}
// Pre-existing member is not backfilled into the email outbox.
await db.exec(`INSERT INTO auth.users (id,email) VALUES ('00000000-0000-4000-a000-000000000001','historic@example.test');`);
await db.exec(readFileSync(root+'supabase/migrations/015_member_observability.sql','utf8'));
assert.equal((await db.query(`SELECT count(*)::int n FROM public.admin_signup_notifications WHERE kind='admin_registration'`)).rows[0].n,0);
const user='00000000-0000-4000-a000-000000000002';
await db.query(`INSERT INTO auth.users (id,email,raw_user_meta_data,raw_app_meta_data) VALUES ($1,'owner@example.test','{"full_name":"Owner"}','{"providers":["email"]}')`,[user]);
const member=(await db.query('SELECT * FROM public.admin_member_overview WHERE user_id=$1',[user])).rows[0];
assert.equal(member.email,'owner@example.test');
assert.equal(member.firm_client_count,0);
assert.equal((await db.query(`SELECT count(*)::int n FROM public.admin_signup_notifications WHERE kind='admin_registration'`)).rows[0].n,1);
// First authentication updates last sign-in and appends an attributable event.
await db.query('UPDATE auth.users SET last_sign_in_at=now() WHERE id=$1',[user]);
await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)",[user]);
await db.query("INSERT INTO public.clients (firm_id,name) SELECT $1, 'Client ' || n FROM generate_series(1,1005) n",[member.firm_id]);
const client=(await db.query('SELECT id FROM clients WHERE firm_id=$1 LIMIT 1',[member.firm_id])).rows[0].id;
const template=(await db.query("INSERT INTO templates (name,is_system) VALUES ('System template',true) RETURNING id")).rows[0].id;
const request=(await db.query("INSERT INTO document_requests (firm_id,client_id,title,template_id) VALUES ($1,$2,'Document request',$3) RETURNING id",[member.firm_id,client,template])).rows[0].id;
await db.query("UPDATE document_requests SET status='completed' WHERE id=$1",[request]);
await db.query("INSERT INTO request_items (request_id,label,file_url) VALUES ($1,'File','https://example.test/document')",[request]);
const usage=(await db.query('SELECT public.admin_member_usage($1) usage',[member.id])).rows[0].usage;
assert.equal(usage.clients,1005); assert.equal(usage.completed_requests,1); assert.equal(usage.uploaded_files,1); assert.equal(usage.templates[0].requests,1);
assert.equal(usage.member_actions_30d,1009);
// Another actor cannot be credited with the firm's changes, even via a service-role operation.
await db.query("SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',false)");
await db.query("UPDATE clients SET name='Changed by another context' WHERE id=$1",[client]);
assert.equal((await db.query('SELECT public.admin_member_usage($1) usage',[member.id])).rows[0].usage.member_actions_30d,1009);
// Claim exclusivity + time-window safety.
const first=(await db.query('SELECT * FROM public.claim_admin_signup_notifications($1,10)',[member.id])).rows;
assert.equal(first.length,1);
assert.equal((await db.query('SELECT * FROM public.claim_admin_signup_notifications($1,10)',[member.id])).rows.length,0);
await db.exec("UPDATE admin_signup_notifications SET first_attempt_at=now()-interval '24 hours', locked_until=now()-interval '1 minute' WHERE kind='admin_registration'");
assert.equal((await db.query('SELECT * FROM public.claim_admin_signup_notifications($1,10)',[member.id])).rows.length,0);
assert.equal((await db.query("SELECT status FROM admin_signup_notifications WHERE kind='admin_registration'")).rows[0].status,'review_required');
// Private auth view, RPCs and queue must be inaccessible to ordinary members and anonymous users.
for (const role of ['anon','authenticated']) {
  await db.exec('SET ROLE '+role);
  for (const query of ['SELECT * FROM public.admin_member_overview','SELECT * FROM public.admin_signup_notifications',"SELECT public.admin_member_usage('"+member.id+"')",'SELECT * FROM public.claim_admin_signup_notifications()']) {
    await assert.rejects(db.query(query),/permission denied/);
  }
  await db.exec('RESET ROLE');
}
await db.exec('SET ROLE service_role');
assert.equal((await db.query('SELECT count(*)::int n FROM admin_member_overview')).rows[0].n,2);
await db.exec('RESET ROLE');
// New tracking must not block normal firm deletion.
await db.query('DELETE FROM firms WHERE id=$1',[member.firm_id]);
assert.equal((await db.query('SELECT count(*)::int n FROM admin_signup_notifications')).rows[0].n,0);
await db.close();
console.log('Migration checks passed: registration, 1,005 clients, auth/actor attribution, counts, claim exclusivity, retry expiry, roles, cascade.');
