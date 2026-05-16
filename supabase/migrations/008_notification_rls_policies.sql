-- ============================================
-- RLS Policies for Notification Log Management Tables
-- Implements firm-scoped access, super admin full access, and service role operations
-- ============================================

-- ============================================
-- notification_logs RLS Policies
-- ============================================

-- Firm users can SELECT notification logs for their firm
CREATE POLICY "Firm users can view own firm notification logs" ON notification_logs
  FOR SELECT USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Firm users can DELETE notification logs for their firm
CREATE POLICY "Firm users can delete own firm notification logs" ON notification_logs
  FOR DELETE USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Super admins can SELECT all notification logs
CREATE POLICY "Super admins can view all notification logs" ON notification_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Super admins can UPDATE all notification logs
CREATE POLICY "Super admins can update all notification logs" ON notification_logs
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Super admins can DELETE all notification logs
CREATE POLICY "Super admins can delete all notification logs" ON notification_logs
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Service role can do everything on notification_logs (for automated processes)
CREATE POLICY "Service role has full access to notification logs" ON notification_logs
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- client_notification_subscriptions RLS Policies
-- ============================================

-- Firm users can SELECT subscriptions for their firm's clients
CREATE POLICY "Firm users can view own firm subscriptions" ON client_notification_subscriptions
  FOR SELECT USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Firm users can INSERT subscriptions for their firm's clients
CREATE POLICY "Firm users can insert own firm subscriptions" ON client_notification_subscriptions
  FOR INSERT WITH CHECK (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Firm users can UPDATE subscriptions for their firm's clients
CREATE POLICY "Firm users can update own firm subscriptions" ON client_notification_subscriptions
  FOR UPDATE USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Firm users can DELETE subscriptions for their firm's clients
CREATE POLICY "Firm users can delete own firm subscriptions" ON client_notification_subscriptions
  FOR DELETE USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Super admins can manage all subscriptions
CREATE POLICY "Super admins can view all subscriptions" ON client_notification_subscriptions
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

CREATE POLICY "Super admins can update all subscriptions" ON client_notification_subscriptions
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

CREATE POLICY "Super admins can delete all subscriptions" ON client_notification_subscriptions
  FOR DELETE USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Service role can do everything on subscriptions (for automated processes)
CREATE POLICY "Service role has full access to subscriptions" ON client_notification_subscriptions
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- notification_queue RLS Policies
-- ============================================

-- Firm users can SELECT queue items for their firm
CREATE POLICY "Firm users can view own firm queue items" ON notification_queue
  FOR SELECT USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Super admins can SELECT all queue items
CREATE POLICY "Super admins can view all queue items" ON notification_queue
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Service role can do everything on notification_queue (for cron/automated processes)
CREATE POLICY "Service role has full access to notification queue" ON notification_queue
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- notification_types RLS Policies (supplementary)
-- ============================================
-- Note: Basic SELECT policy for authenticated users already exists in 007 migration.
-- Adding service role full access for INSERT/UPDATE/DELETE operations.

-- Service role can do everything on notification_types (for seeding and management)
CREATE POLICY "Service role has full access to notification types" ON notification_types
  FOR ALL USING (auth.role() = 'service_role');

-- Super admins can manage notification types
CREATE POLICY "Super admins can manage notification types" ON notification_types
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );
