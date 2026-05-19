-- Add 'on_hold' and 'cancelled' to document_requests status
ALTER TABLE document_requests DROP CONSTRAINT IF EXISTS document_requests_status_check;
ALTER TABLE document_requests ADD CONSTRAINT document_requests_status_check 
  CHECK (status IN ('pending', 'in_progress', 'completed', 'overdue', 'on_hold', 'cancelled'));
