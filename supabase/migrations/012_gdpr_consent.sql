-- Add GDPR consent fields to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gdpr_consent BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gdpr_consent_token TEXT UNIQUE DEFAULT gen_random_uuid();
ALTER TABLE clients ADD COLUMN IF NOT EXISTS gdpr_consented_at TIMESTAMPTZ;
