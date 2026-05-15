-- MTD Client Chaser - Initial Database Schema
-- Run this in Supabase SQL Editor

-- Muhasebe firmaları
CREATE TABLE firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  logo_url TEXT,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Firma kullanıcıları (muhasebeciler)
CREATE TABLE firm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(firm_id, user_id)
);

-- Müşteriler
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  client_type TEXT DEFAULT 'sole_trader' CHECK (client_type IN ('sole_trader', 'landlord', 'limited_company', 'partnership')),
  mtd_threshold TEXT,
  tax_reference TEXT,
  notes TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hazır şablonlar (UK vergi-spesifik)
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  is_system BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Belge talepleri
CREATE TABLE document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  template_id UUID REFERENCES templates(id),
  deadline DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue')),
  magic_token TEXT UNIQUE DEFAULT gen_random_uuid(),
  reminder_count INTEGER DEFAULT 0,
  last_reminder_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Belge talep kalemleri (checklist items)
CREATE TABLE request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES document_requests(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  required BOOLEAN DEFAULT true,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'uploaded', 'approved', 'rejected')),
  file_url TEXT,
  file_name TEXT,
  uploaded_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Hatırlatma logları
CREATE TABLE reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES document_requests(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
  message_preview TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

-- Aktivite logları
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  request_id UUID REFERENCES document_requests(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_firm_users_firm_id ON firm_users(firm_id);
CREATE INDEX idx_firm_users_user_id ON firm_users(user_id);
CREATE INDEX idx_clients_firm_id ON clients(firm_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_document_requests_firm_id ON document_requests(firm_id);
CREATE INDEX idx_document_requests_client_id ON document_requests(client_id);
CREATE INDEX idx_document_requests_status ON document_requests(status);
CREATE INDEX idx_document_requests_deadline ON document_requests(deadline);
CREATE INDEX idx_document_requests_magic_token ON document_requests(magic_token);
CREATE INDEX idx_request_items_request_id ON request_items(request_id);
CREATE INDEX idx_reminder_logs_request_id ON reminder_logs(request_id);
CREATE INDEX idx_activity_logs_firm_id ON activity_logs(firm_id);
CREATE INDEX idx_templates_firm_id ON templates(firm_id);

-- Row Level Security
ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Firms: users can only see their own firm
CREATE POLICY "Users can view own firm" ON firms
  FOR SELECT USING (
    id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own firm" ON firms
  FOR UPDATE USING (
    id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

-- Firm Users: users can see members of their firm
CREATE POLICY "Users can view firm members" ON firm_users
  FOR SELECT USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Clients: users can manage clients of their firm
CREATE POLICY "Users can view firm clients" ON clients
  FOR SELECT USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert firm clients" ON clients
  FOR INSERT WITH CHECK (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update firm clients" ON clients
  FOR UPDATE USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete firm clients" ON clients
  FOR DELETE USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Templates: system templates visible to all, firm templates to firm members
CREATE POLICY "Anyone can view system templates" ON templates
  FOR SELECT USING (is_system = true);

CREATE POLICY "Users can view firm templates" ON templates
  FOR SELECT USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage firm templates" ON templates
  FOR ALL USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Document Requests: firm members can manage, public access via magic_token
CREATE POLICY "Users can view firm requests" ON document_requests
  FOR SELECT USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert firm requests" ON document_requests
  FOR INSERT WITH CHECK (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update firm requests" ON document_requests
  FOR UPDATE USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can delete firm requests" ON document_requests
  FOR DELETE USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Public access for magic token (anonymous users uploading documents)
CREATE POLICY "Public can view request by magic token" ON document_requests
  FOR SELECT USING (true);

-- Request Items: accessible via firm membership or public upload
CREATE POLICY "Users can view firm request items" ON request_items
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM document_requests
      WHERE firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage firm request items" ON request_items
  FOR ALL USING (
    request_id IN (
      SELECT id FROM document_requests
      WHERE firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
    )
  );

-- Public can view and update request items (for file upload via magic link)
CREATE POLICY "Public can view request items" ON request_items
  FOR SELECT USING (true);

CREATE POLICY "Public can update request items" ON request_items
  FOR UPDATE USING (true);

-- Reminder Logs
CREATE POLICY "Users can view firm reminder logs" ON reminder_logs
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM document_requests
      WHERE firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
    )
  );

-- Activity Logs
CREATE POLICY "Users can view firm activity logs" ON activity_logs
  FOR SELECT USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

-- Insert policies for logs (service role will handle inserts mostly)
CREATE POLICY "Users can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert reminder logs" ON reminder_logs
  FOR INSERT WITH CHECK (
    request_id IN (
      SELECT id FROM document_requests
      WHERE firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
    )
  );
