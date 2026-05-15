-- Super admin table
CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view themselves" ON super_admins
  FOR SELECT USING (user_id = auth.uid());

-- Insert your Google account as super admin
-- Replace with your actual user_id
INSERT INTO super_admins (user_id) VALUES ('98f15d5e-a5f4-43c7-8660-37dbcb6c103a');

-- Allow super admins to read all firms (bypass normal RLS)
CREATE POLICY "Super admins can view all firms" ON firms
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

CREATE POLICY "Super admins can update all firms" ON firms
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Allow super admins to read all firm_users
CREATE POLICY "Super admins can view all firm_users" ON firm_users
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Allow super admins to read all clients
CREATE POLICY "Super admins can view all clients" ON clients
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Allow super admins to read all document_requests
CREATE POLICY "Super admins can view all requests" ON document_requests
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Allow super admins to read all activity_logs
CREATE POLICY "Super admins can view all activity_logs" ON activity_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );
