-- Super Admin Panel - New tables and column modifications
-- Adds admin_audit_logs, member_activity_logs, subscription_history tables
-- Adds status column to firm_users table

-- ============================================================
-- 1. Add status column to firm_users table
-- ============================================================

ALTER TABLE firm_users
  ADD COLUMN status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'suspended'));

-- ============================================================
-- 2. Create admin_audit_logs table (Requirement 6.5)
-- Records all administrative actions for security auditing
-- ============================================================

CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id),
  target_entity_id UUID NOT NULL,
  target_entity_type TEXT NOT NULL CHECK (target_entity_type IN ('member', 'firm')),
  action_type TEXT NOT NULL CHECK (action_type IN ('role_change', 'plan_change', 'suspend', 'reactivate')),
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_target ON admin_audit_logs(target_entity_id);
CREATE INDEX idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);

-- ============================================================
-- 3. Create member_activity_logs table (Requirement 5.1, 5.2)
-- Records member actions for activity tracking
-- ============================================================

CREATE TABLE member_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  firm_id UUID NOT NULL REFERENCES firms(id),
  action_type TEXT NOT NULL CHECK (action_type IN ('login', 'client_added', 'client_updated', 'document_request_sent', 'document_request_completed', 'settings_changed')),
  description TEXT,
  related_entity_id UUID,
  related_entity_name TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_member_activity_user ON member_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_member_activity_firm ON member_activity_logs(firm_id, created_at DESC);
CREATE INDEX idx_member_activity_type ON member_activity_logs(action_type);

-- ============================================================
-- 4. Create subscription_history table (Requirement 3.4)
-- Records firm plan changes for the firm detail view
-- ============================================================

CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id),
  previous_plan TEXT NOT NULL,
  new_plan TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_history_firm ON subscription_history(firm_id, created_at DESC);

-- ============================================================
-- 5. Row Level Security for new tables
-- ============================================================

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Super admins can view all audit logs
CREATE POLICY "Super admins can view all admin_audit_logs" ON admin_audit_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Super admins can insert audit logs
CREATE POLICY "Super admins can insert admin_audit_logs" ON admin_audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Super admins can view all member activity logs
CREATE POLICY "Super admins can view all member_activity_logs" ON member_activity_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Users can view their own activity logs
CREATE POLICY "Users can view own member_activity_logs" ON member_activity_logs
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own activity logs
CREATE POLICY "Users can insert own member_activity_logs" ON member_activity_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Super admins can view all subscription history
CREATE POLICY "Super admins can view all subscription_history" ON subscription_history
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Super admins can insert subscription history
CREATE POLICY "Super admins can insert subscription_history" ON subscription_history
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Users can view subscription history for their own firm
CREATE POLICY "Users can view own firm subscription_history" ON subscription_history
  FOR SELECT USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- ============================================================
-- 6. Allow super admins to update firm_users (for role/status changes)
-- ============================================================

CREATE POLICY "Super admins can update all firm_users" ON firm_users
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );
