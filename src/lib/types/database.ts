export type Firm = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  logo_url: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "free" | "starter" | "pro";
  created_at: string;
};

export type FirmUser = {
  id: string;
  firm_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};

export type Client = {
  id: string;
  firm_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  client_type: "sole_trader" | "landlord" | "limited_company" | "partnership";
  mtd_threshold: string | null;
  tax_reference: string | null;
  notes: string | null;
  status: "active" | "inactive" | "archived" | "on_hold";
  created_at: string;
};

export type DocumentRequest = {
  id: string;
  firm_id: string;
  client_id: string;
  title: string;
  template_id: string | null;
  deadline: string | null;
  status: "pending" | "in_progress" | "completed" | "overdue";
  magic_token: string;
  reminder_count: number;
  last_reminder_at: string | null;
  completed_at: string | null;
  created_at: string;
};

export type RequestItem = {
  id: string;
  request_id: string;
  label: string;
  description: string | null;
  required: boolean;
  status: "pending" | "uploaded" | "approved" | "rejected";
  file_url: string | null;
  file_name: string | null;
  uploaded_at: string | null;
  reviewed_at: string | null;
  sort_order: number;
  created_at: string;
};

export type Template = {
  id: string;
  firm_id: string | null;
  name: string;
  description: string | null;
  category: string | null;
  items: TemplateItem[];
  is_system: boolean;
  created_at: string;
};

export type TemplateItem = {
  label: string;
  description?: string;
  required: boolean;
};

export type ReminderLog = {
  id: string;
  request_id: string;
  client_id: string | null;
  channel: "email" | "sms";
  status: "sent" | "delivered" | "failed" | "bounced";
  message_preview: string | null;
  sent_at: string;
};

export type ActivityLog = {
  id: string;
  firm_id: string;
  client_id: string | null;
  request_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
};

// Notification types
export type NotificationStatus = "queued" | "sent" | "delivered" | "failed" | "stopped";
export type NotificationChannel = "email" | "sms";
export type NotificationFrequency = "daily" | "weekly" | "monthly";
export type QueueStatus = "pending" | "processing" | "completed" | "cancelled";

export type NotificationType = {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string;
  is_subscribable: boolean;
  created_at: string;
};

export type NotificationLog = {
  id: string;
  firm_id: string;
  client_id: string;
  notification_type_id: string;
  triggered_by: string | null;
  channel: NotificationChannel;
  recipient_address: string;
  subject: string | null;
  content_preview: string | null;
  full_content: string | null;
  status: NotificationStatus;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
};

export type ClientNotificationSubscription = {
  id: string;
  client_id: string;
  firm_id: string;
  notification_type_id: string;
  frequency: NotificationFrequency;
  is_active: boolean;
  last_delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationQueueItem = {
  id: string;
  notification_log_id: string | null;
  client_id: string;
  firm_id: string;
  notification_type_id: string;
  scheduled_for: string;
  status: QueueStatus;
  created_at: string;
};

// Extended types with relations
export type DocumentRequestWithClient = DocumentRequest & {
  clients: Pick<Client, "id" | "name" | "email">;
};

export type RequestItemWithRequest = RequestItem & {
  document_requests: Pick<DocumentRequest, "id" | "title" | "firm_id">;
};
