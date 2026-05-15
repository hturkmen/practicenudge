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
  status: "active" | "inactive" | "archived";
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

// Extended types with relations
export type DocumentRequestWithClient = DocumentRequest & {
  clients: Pick<Client, "id" | "name" | "email">;
};

export type RequestItemWithRequest = RequestItem & {
  document_requests: Pick<DocumentRequest, "id" | "title" | "firm_id">;
};
