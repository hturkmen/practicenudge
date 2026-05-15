-- ============================================
-- PracticeNudge - Full Database Setup
-- Run this in Supabase SQL Editor (single execution)
-- ============================================

-- ============================================
-- 1. TABLES
-- ============================================

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

CREATE TABLE firm_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(firm_id, user_id)
);

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

CREATE TABLE reminder_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID REFERENCES document_requests(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'bounced')),
  message_preview TEXT,
  sent_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  request_id UUID REFERENCES document_requests(id),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE super_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 2. INDEXES
-- ============================================

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

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE firms ENABLE ROW LEVEL SECURITY;
ALTER TABLE firm_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminder_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Firms
CREATE POLICY "Users can view own firm" ON firms
  FOR SELECT USING (
    id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update own firm" ON firms
  FOR UPDATE USING (
    id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  );

CREATE POLICY "Authenticated users can insert firms" ON firms
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Firm Users
CREATE POLICY "Users can view firm members" ON firm_users
  FOR SELECT USING (
    firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can insert firm_users" ON firm_users
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Clients
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

-- Templates
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

-- Document Requests
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

-- Request Items
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

CREATE POLICY "Public can view request items by request_id" ON request_items
  FOR SELECT USING (true);

CREATE POLICY "Public can update request items for upload" ON request_items
  FOR UPDATE USING (true)
  WITH CHECK (status IN ('uploaded', 'pending'));

-- Reminder Logs
CREATE POLICY "Users can view firm reminder logs" ON reminder_logs
  FOR SELECT USING (
    request_id IN (
      SELECT id FROM document_requests
      WHERE firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert reminder logs" ON reminder_logs
  FOR INSERT WITH CHECK (
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

CREATE POLICY "Authenticated users can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'anon');

-- Super Admins
CREATE POLICY "Super admins can view themselves" ON super_admins
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Super admins can view all firms" ON firms
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM super_admins));

CREATE POLICY "Super admins can update all firms" ON firms
  FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM super_admins));

CREATE POLICY "Super admins can view all firm_users" ON firm_users
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM super_admins));

CREATE POLICY "Super admins can view all clients" ON clients
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM super_admins));

CREATE POLICY "Super admins can view all requests" ON document_requests
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM super_admins));

CREATE POLICY "Super admins can view all activity_logs" ON activity_logs
  FOR SELECT USING (auth.uid() IN (SELECT user_id FROM super_admins));

-- ============================================
-- 5. AUTH TRIGGER (auto-create firm on signup)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_firm_id UUID;
  firm_name TEXT;
BEGIN
  firm_name := COALESCE(
    NEW.raw_user_meta_data->>'firm_name',
    split_part(NEW.email, '@', 1) || '''s Firm'
  );

  INSERT INTO public.firms (name, email)
  VALUES (firm_name, NEW.email)
  RETURNING id INTO new_firm_id;

  INSERT INTO public.firm_users (firm_id, user_id, role)
  VALUES (new_firm_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 6. SEED DATA (UK Tax Templates)
-- ============================================

INSERT INTO templates (name, description, category, is_system, items) VALUES
(
  'SA100 Self Assessment 2024/25',
  'Complete document checklist for Self Assessment tax return',
  'self_assessment',
  true,
  '[{"label":"P60 2024/25","description":"End of year certificate from employer","required":true},{"label":"P11D 2024/25","description":"Benefits and expenses from employer","required":false},{"label":"Bank interest certificates","description":"Interest earned on savings accounts","required":true},{"label":"Dividend vouchers","description":"Dividend payments received from companies","required":false},{"label":"Rental income summary","description":"Summary of rental income and expenses","required":false},{"label":"Mortgage interest statement","description":"Annual mortgage interest statement for rental properties","required":false},{"label":"Pension contributions","description":"Evidence of personal pension contributions","required":false},{"label":"Gift Aid receipts","description":"Charitable donation receipts for Gift Aid claims","required":false},{"label":"Capital gains records","description":"Records of asset disposals","required":false},{"label":"Self-employment income records","description":"Sales invoices, income records","required":false},{"label":"Self-employment expense receipts","description":"Business expense receipts","required":false}]'::jsonb
),
(
  'MTD ITSA Quarterly (Q1 Apr-Jun)',
  'Quarterly submission documents for MTD ITSA - Quarter 1',
  'mtd_itsa',
  true,
  '[{"label":"Bank statements (April-June)","description":"All business bank statements for the quarter","required":true},{"label":"Sales invoices","description":"All sales invoices issued during the quarter","required":true},{"label":"Purchase receipts","description":"All business purchase receipts and invoices","required":true},{"label":"Mileage log","description":"Business mileage records for the quarter","required":false},{"label":"Home office calculation","description":"Home office usage calculation if applicable","required":false}]'::jsonb
),
(
  'MTD ITSA Quarterly (Q2 Jul-Sep)',
  'Quarterly submission documents for MTD ITSA - Quarter 2',
  'mtd_itsa',
  true,
  '[{"label":"Bank statements (July-September)","description":"All business bank statements for the quarter","required":true},{"label":"Sales invoices","description":"All sales invoices issued during the quarter","required":true},{"label":"Purchase receipts","description":"All business purchase receipts and invoices","required":true},{"label":"Mileage log","description":"Business mileage records for the quarter","required":false},{"label":"Home office calculation","description":"Home office usage calculation if applicable","required":false}]'::jsonb
),
(
  'MTD ITSA Quarterly (Q3 Oct-Dec)',
  'Quarterly submission documents for MTD ITSA - Quarter 3',
  'mtd_itsa',
  true,
  '[{"label":"Bank statements (October-December)","description":"All business bank statements for the quarter","required":true},{"label":"Sales invoices","description":"All sales invoices issued during the quarter","required":true},{"label":"Purchase receipts","description":"All business purchase receipts and invoices","required":true},{"label":"Mileage log","description":"Business mileage records for the quarter","required":false},{"label":"Home office calculation","description":"Home office usage calculation if applicable","required":false}]'::jsonb
),
(
  'MTD ITSA Quarterly (Q4 Jan-Mar)',
  'Quarterly submission documents for MTD ITSA - Quarter 4',
  'mtd_itsa',
  true,
  '[{"label":"Bank statements (January-March)","description":"All business bank statements for the quarter","required":true},{"label":"Sales invoices","description":"All sales invoices issued during the quarter","required":true},{"label":"Purchase receipts","description":"All business purchase receipts and invoices","required":true},{"label":"Mileage log","description":"Business mileage records for the quarter","required":false},{"label":"Home office calculation","description":"Home office usage calculation if applicable","required":false}]'::jsonb
),
(
  'New Client Onboarding',
  'Essential documents needed when onboarding a new client',
  'onboarding',
  true,
  '[{"label":"Photo ID verification","description":"Passport or driving licence copy","required":true},{"label":"Proof of address","description":"Utility bill or bank statement (less than 3 months old)","required":true},{"label":"Previous tax returns","description":"Last 2 years tax returns if available","required":false},{"label":"UTR number","description":"Unique Taxpayer Reference number","required":true},{"label":"HMRC login details","description":"Government Gateway login credentials","required":false},{"label":"Bank details","description":"Business bank account details for HMRC repayments","required":true},{"label":"National Insurance number","description":"Your National Insurance number","required":true}]'::jsonb
),
(
  'Corporation Tax',
  'Documents needed for Corporation Tax return preparation',
  'corporation_tax',
  true,
  '[{"label":"Annual accounts","description":"Draft or final annual accounts","required":true},{"label":"Bank statements (full year)","description":"All company bank statements for the accounting period","required":true},{"label":"Director loan account","description":"Director loan account transactions","required":false},{"label":"Dividend minutes","description":"Board minutes for dividend declarations","required":false},{"label":"P11D details","description":"Benefits in kind provided to directors/employees","required":false},{"label":"Fixed asset purchases","description":"Details of any capital expenditure","required":false},{"label":"R&D expenditure","description":"Research and development costs if applicable","required":false}]'::jsonb
),
(
  'VAT Return',
  'Documents needed for VAT return preparation',
  'vat',
  true,
  '[{"label":"Sales invoices","description":"All sales invoices for the VAT period","required":true},{"label":"Purchase invoices","description":"All purchase invoices for the VAT period","required":true},{"label":"Bank statements","description":"Bank statements covering the VAT period","required":true},{"label":"EC sales list","description":"Details of sales to EU businesses if applicable","required":false},{"label":"Import/export documentation","description":"Customs declarations and import VAT certificates","required":false}]'::jsonb
);
