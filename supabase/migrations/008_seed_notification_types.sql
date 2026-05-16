-- Seed notification_types with initial notification types
-- Uses ON CONFLICT to make this migration idempotent (safe to re-run)

INSERT INTO notification_types (name, display_name, description, category, is_subscribable)
VALUES
  ('document_reminder', 'Document Reminder', 'Reminders for pending document uploads or reviews', 'reminders', true),
  ('deadline_alert', 'Deadline Alert', 'Alerts for upcoming or missed deadlines', 'alerts', true),
  ('status_update', 'Status Update', 'Updates on document or request status changes', 'updates', true),
  ('general_announcement', 'General Announcement', 'General announcements from the firm', 'announcements', true)
ON CONFLICT (name) DO NOTHING;
