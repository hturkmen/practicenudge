-- Leads table for tracking MTD tracker downloads and interest
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  practice TEXT,
  client_count TEXT,
  source TEXT DEFAULT 'mtd_tracker',
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'lost')),
  notes TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

-- No RLS needed - only accessed via service_role in admin APIs
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Super admins can manage leads (via service_role, but add policy for safety)
CREATE POLICY "Service role has full access to leads" ON leads
  FOR ALL USING (auth.role() = 'service_role');
