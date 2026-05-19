-- Migration: 014_channel_consent.sql
-- GDPR Channel-Based Consent: Kanal bazlı (email/sms) bağımsız onay yapısı
-- Mevcut tek boolean gdpr_consent alanını kanal bazlı consent tablosuna dönüştürür.
-- Eski sütunlar (gdpr_consent, gdpr_consent_token, gdpr_consented_at) korunur.

BEGIN;

-- 1. Create client_consents table
CREATE TABLE IF NOT EXISTS client_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  consent_token UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(client_id, channel)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_client_consents_client_id ON client_consents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_consents_token ON client_consents(consent_token);
CREATE INDEX IF NOT EXISTS idx_client_consents_status ON client_consents(status);

-- 3. Enable Row Level Security
ALTER TABLE client_consents ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies

-- Firm users can view their clients' consents
CREATE POLICY "Users can view firm client consents" ON client_consents
  FOR SELECT USING (
    client_id IN (
      SELECT id FROM clients
      WHERE firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
    )
  );

-- Firm users can insert consents for their clients
CREATE POLICY "Users can insert firm client consents" ON client_consents
  FOR INSERT WITH CHECK (
    client_id IN (
      SELECT id FROM clients
      WHERE firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
    )
  );

-- Firm users can update their clients' consents
CREATE POLICY "Users can update firm client consents" ON client_consents
  FOR UPDATE USING (
    client_id IN (
      SELECT id FROM clients
      WHERE firm_id IN (SELECT firm_id FROM firm_users WHERE user_id = auth.uid())
    )
  );

-- Public access via consent_token (for consent page - anonymous users)
CREATE POLICY "Public can view consent by token" ON client_consents
  FOR SELECT USING (true);

CREATE POLICY "Public can update consent by token" ON client_consents
  FOR UPDATE USING (true);

-- 5. Migrate existing data from clients table
-- gdpr_consent=true → accepted for all channels
-- gdpr_consent=false/NULL → pending for all channels
-- Uses COALESCE for consent_token and gdpr_consented_at preservation
-- WHERE NOT EXISTS ensures idempotency (safe to run multiple times)
INSERT INTO client_consents (client_id, channel, status, consent_token, created_at, updated_at)
SELECT
  c.id,
  ch.channel,
  CASE
    WHEN c.gdpr_consent = true THEN 'accepted'
    ELSE 'pending'
  END,
  COALESCE(c.gdpr_consent_token::uuid, gen_random_uuid()),
  COALESCE(c.gdpr_consented_at, now()),
  COALESCE(c.gdpr_consented_at, now())
FROM clients c
CROSS JOIN (VALUES ('email'), ('sms')) AS ch(channel)
WHERE NOT EXISTS (
  SELECT 1 FROM client_consents cc
  WHERE cc.client_id = c.id AND cc.channel = ch.channel
);

-- 6. Old columns are intentionally kept for backward compatibility:
-- gdpr_consent, gdpr_consent_token, gdpr_consented_at
-- Do NOT drop these columns.

COMMIT;
