// Admin type definitions for the Super Admin Panel

// --- Core Types ---

export type MemberStatus = "active" | "suspended";

export type AdminActionType = "role_change" | "plan_change" | "suspend" | "reactivate";

export type MemberActionType =
  | "login"
  | "client_added"
  | "client_updated"
  | "document_request_sent"
  | "document_request_completed"
  | "settings_changed";

export type AdminAuditLog = {
  id: string;
  admin_user_id: string;
  target_entity_id: string;
  target_entity_type: "member" | "firm";
  action_type: AdminActionType;
  details: Record<string, unknown>;
  created_at: string;
};

export type MemberActivityLog = {
  id: string;
  user_id: string;
  firm_id: string;
  action_type: MemberActionType;
  description: string | null;
  related_entity_id: string | null;
  related_entity_name: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SubscriptionHistoryEntry = {
  id: string;
  firm_id: string;
  previous_plan: string;
  new_plan: string;
  changed_by: string | null;
  created_at: string;
};

// --- API Request/Response Interfaces ---

// Members API

export type MembersListRequest = {
  page?: number;
  page_size?: number;
  search?: string;
  firm_id?: string;
  role?: "owner" | "admin" | "member";
  plan?: "free" | "starter" | "pro";
  status?: MemberStatus;
  sort_by?: string;
  sort_order?: "asc" | "desc";
};

export type MembersListResponse = {
  data: MemberListItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

export type MemberListItem = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  firm_name: string;
  firm_id: string;
  role: "owner" | "admin" | "member";
  plan: "free" | "starter" | "pro";
  status: MemberStatus;
  created_at: string;
};

// Firms API

export type FirmsListRequest = {
  page?: number;
  page_size?: number;
  search?: string;
  plan?: "free" | "starter" | "pro";
  date_from?: string;
  date_to?: string;
};

export type FirmsListResponse = {
  data: FirmListItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
};

export type FirmListItem = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  plan: "free" | "starter" | "pro";
  member_count: number;
  client_count: number;
  created_at: string;
};

export type FirmDetailResponse = {
  firm: FirmListItem;
  members: { id: string; name: string; email: string; role: string }[];
  total_clients: number;
  total_document_requests: number;
  subscription_history: {
    previous_plan: string;
    new_plan: string;
    changed_at: string;
  }[];
};

// Usage API

export type UsageRequest = {
  date_from?: string;
  date_to?: string;
  page?: number;
  page_size?: number;
};

export type UsageResponse = {
  summary: {
    total_logins_7d: number;
    total_logins_30d: number;
    active_members_7d: number;
    total_clients: number;
    total_requests_sent: number;
    total_requests_completed: number;
  };
  per_firm: {
    data: FirmUsageItem[];
    pagination: {
      page: number;
      page_size: number;
      total: number;
      total_pages: number;
    };
  };
  trend: { date: string; active_members: number; document_requests: number }[];
};

export type FirmUsageItem = {
  firm_id: string;
  firm_name: string;
  member_count: number;
  client_count: number;
  requests_sent: number;
  requests_completed: number;
  last_activity_date: string | null;
  is_inactive: boolean;
};

// Activity Log API

export type ActivityLogRequest = {
  action_type?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
};

export type ActivityLogEntry = {
  id: string;
  action_type: MemberActionType;
  description: string;
  timestamp: string;
  related_entity: string | null;
};

// Admin Actions API

export type AdminActionRequest = {
  action: "update_role" | "update_plan" | "suspend_member" | "reactivate_member";
  target_id: string;
  value?: string;
};

export type AdminActionResponse = {
  success: boolean;
  message: string;
  warning?: string;
};
