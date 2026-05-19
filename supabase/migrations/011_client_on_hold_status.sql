-- Add 'on_hold' to clients status
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_status_check;
ALTER TABLE clients ADD CONSTRAINT clients_status_check 
  CHECK (status IN ('active', 'inactive', 'archived', 'on_hold'));
