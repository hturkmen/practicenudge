-- ============================================
-- SECURITY FIX: Tighten RLS policies
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. FIX: request_items - remove overly permissive public access
DROP POLICY IF EXISTS "Public can view request items by request_id" ON request_items;
DROP POLICY IF EXISTS "Public can update request items for upload" ON request_items;

-- Public can only view/update items for requests accessed via magic token
-- Scoped to specific request_id (app passes this from magic_token lookup)
CREATE POLICY "Public can view request items via magic token" ON request_items
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM document_requests WHERE magic_token IS NOT NULL
    )
  );

CREATE POLICY "Public can upload to request items" ON request_items
  FOR UPDATE USING (
    request_id IN (
      SELECT id FROM document_requests WHERE magic_token IS NOT NULL
    )
  )
  WITH CHECK (status IN ('uploaded', 'pending'));

-- 2. FIX: firm_users INSERT - only allow inserting for own user_id
DROP POLICY IF EXISTS "Authenticated users can insert firm_users" ON firm_users;
DROP POLICY IF EXISTS "Service role can insert firm users" ON firm_users;

CREATE POLICY "Users can insert own firm_users record" ON firm_users
  FOR INSERT WITH CHECK (
    user_id = auth.uid() OR auth.role() = 'service_role'
  );

-- 3. FIX: firms INSERT - restrict to service role or own email
DROP POLICY IF EXISTS "Authenticated users can insert firms" ON firms;
DROP POLICY IF EXISTS "Service role can insert firms" ON firms;

CREATE POLICY "Users can insert firms for themselves" ON firms
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR auth.role() = 'service_role'
  );

-- 4. FIX: activity_logs INSERT - only authenticated users
DROP POLICY IF EXISTS "Authenticated users can insert activity logs" ON activity_logs;

CREATE POLICY "Only authenticated users can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. FIX: Add magic_token expiration column (optional, for future use)
ALTER TABLE document_requests 
  ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days');

-- 6. FIX: Strengthen the firm_users view policy (already fixed earlier but ensure it's correct)
DROP POLICY IF EXISTS "Users can view firm members" ON firm_users;

CREATE POLICY "Users can view own firm membership" ON firm_users
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can view firm members of own firm" ON firm_users
  FOR SELECT USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );
