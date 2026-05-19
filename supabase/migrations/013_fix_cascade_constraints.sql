-- Fix subscription_history to cascade on firm delete
ALTER TABLE subscription_history DROP CONSTRAINT IF EXISTS subscription_history_firm_id_fkey;
ALTER TABLE subscription_history ADD CONSTRAINT subscription_history_firm_id_fkey 
  FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE;

-- Fix any other tables that might block firm deletion
ALTER TABLE admin_audit_logs DROP CONSTRAINT IF EXISTS admin_audit_logs_target_entity_id_fkey;
