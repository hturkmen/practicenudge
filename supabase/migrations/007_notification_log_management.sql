-- Notification Log Management Schema
-- Creates notification_types, notification_logs, client_notification_subscriptions, and notification_queue tables

-- Notification types (categories of notifications)
CREATE TABLE notification_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  is_subscribable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notification logs (audit trail of all sent notifications)
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  notification_type_id UUID NOT NULL REFERENCES notification_types(id) ON DELETE RESTRICT,
  triggered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
  recipient_address TEXT NOT NULL,
  subject TEXT,
  content_preview TEXT,
  full_content TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'stopped')),
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Client notification subscriptions (opt-in preferences)
CREATE TABLE client_notification_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  notification_type_id UUID NOT NULL REFERENCES notification_types(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, firm_id, notification_type_id)
);

-- Notification queue (scheduled notifications awaiting delivery)
CREATE TABLE notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_log_id UUID REFERENCES notification_logs(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  notification_type_id UUID NOT NULL REFERENCES notification_types(id) ON DELETE CASCADE,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for notification_logs
CREATE INDEX idx_notification_logs_firm_id ON notification_logs(firm_id);
CREATE INDEX idx_notification_logs_client_id ON notification_logs(client_id);
CREATE INDEX idx_notification_logs_status ON notification_logs(status);
CREATE INDEX idx_notification_logs_notification_type_id ON notification_logs(notification_type_id);
CREATE INDEX idx_notification_logs_created_at ON notification_logs(created_at DESC);
CREATE INDEX idx_notification_logs_triggered_by ON notification_logs(triggered_by);
CREATE INDEX idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX idx_notification_logs_scheduled_at ON notification_logs(scheduled_at);

-- Indexes for client_notification_subscriptions
CREATE INDEX idx_client_notification_subscriptions_client_id ON client_notification_subscriptions(client_id);
CREATE INDEX idx_client_notification_subscriptions_firm_id ON client_notification_subscriptions(firm_id);
CREATE INDEX idx_client_notification_subscriptions_type_id ON client_notification_subscriptions(notification_type_id);
CREATE INDEX idx_client_notification_subscriptions_active ON client_notification_subscriptions(is_active);

-- Indexes for notification_queue
CREATE INDEX idx_notification_queue_status ON notification_queue(status);
CREATE INDEX idx_notification_queue_scheduled_for ON notification_queue(scheduled_for);
CREATE INDEX idx_notification_queue_client_id ON notification_queue(client_id);
CREATE INDEX idx_notification_queue_firm_id ON notification_queue(firm_id);
CREATE INDEX idx_notification_queue_notification_type_id ON notification_queue(notification_type_id);
CREATE INDEX idx_notification_queue_pending_scheduled ON notification_queue(status, scheduled_for) WHERE status = 'pending';

-- Indexes for notification_types
CREATE INDEX idx_notification_types_category ON notification_types(category);
CREATE INDEX idx_notification_types_is_subscribable ON notification_types(is_subscribable);

-- Enable Row Level Security on all new tables
ALTER TABLE notification_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_notification_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (detailed policies will be added in migration 1.2)
-- notification_types: readable by all authenticated users
CREATE POLICY "Authenticated users can view notification types" ON notification_types
  FOR SELECT USING (auth.role() = 'authenticated');
