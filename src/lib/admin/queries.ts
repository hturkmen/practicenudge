import { SupabaseClient } from "@supabase/supabase-js";
import { isInactive } from "./metrics";
import type {
  MembersListRequest,
  MembersListResponse,
  MemberListItem,
  FirmsListRequest,
  FirmsListResponse,
  FirmListItem,
  FirmDetailResponse,
  UsageRequest,
  UsageResponse,
  FirmUsageItem,
  ActivityLogRequest,
  ActivityLogEntry,
  MemberActionType,
} from "@/lib/types/admin";

/**
 * Fetches a paginated, searchable, filterable list of members.
 * Supports pagination (20/page default), search (min 2 chars, case-insensitive on name/email/firm),
 * filters (firm, role, plan, status with AND logic), and sorting.
 */
export async function getMembers(
  supabase: SupabaseClient,
  params: MembersListRequest
): Promise<MembersListResponse> {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.page_size ?? 20, 100);
  const sortBy = params.sort_by ?? "created_at";
  const sortOrder = params.sort_order ?? "desc";

  // Build the query on firm_users with a join to firms
  let query = supabase
    .from("firm_users")
    .select("id, user_id, role, status, created_at, firm_id, firms(id, name, email, plan)", {
      count: "exact",
    });

  // Apply filters (AND logic)
  if (params.firm_id) {
    query = query.eq("firm_id", params.firm_id);
  }
  if (params.role) {
    query = query.eq("role", params.role);
  }
  if (params.status) {
    query = query.eq("status", params.status);
  }
  if (params.plan) {
    query = query.eq("firms.plan", params.plan);
  }

  // Apply sorting
  const ascending = sortOrder === "asc";
  if (sortBy === "firm_name") {
    query = query.order("name", { ascending, referencedTable: "firms" });
  } else if (sortBy === "plan") {
    query = query.order("plan", { ascending, referencedTable: "firms" });
  } else {
    query = query.order(sortBy, { ascending });
  }

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch members: ${error.message}`);
  }

  // Get user IDs to fetch auth user data (name/email)
  const userIds = (data || []).map((row: any) => row.user_id);

  // Fetch user metadata from auth.users via admin API
  let userMap: Record<string, { name: string; email: string }> = {};
  if (userIds.length > 0) {
    const { data: usersData } = await supabase.auth.admin.listUsers({
      perPage: userIds.length,
    });

    if (usersData?.users) {
      for (const u of usersData.users) {
        if (userIds.includes(u.id)) {
          userMap[u.id] = {
            name: (u.user_metadata?.full_name as string) || u.email?.split("@")[0] || "Unknown",
            email: u.email || "",
          };
        }
      }
    }
  }

  // If we have a search term, we need to filter results after fetching user data
  // because name/email come from auth.users which can't be filtered in the DB query
  let members: MemberListItem[] = (data || []).map((row: any) => {
    const firm = row.firms as any;
    const user = userMap[row.user_id] || { name: "Unknown", email: "" };
    return {
      id: row.id,
      user_id: row.user_id,
      name: user.name,
      email: user.email,
      firm_name: firm?.name || "",
      firm_id: row.firm_id,
      role: row.role,
      plan: firm?.plan || "free",
      status: row.status || "active",
      created_at: row.created_at,
    };
  });

  // Apply search filter (min 2 chars, case-insensitive on name/email/firm name)
  let total = count ?? 0;
  if (params.search && params.search.length >= 2) {
    const searchLower = params.search.toLowerCase();
    members = members.filter(
      (m) =>
        m.name.toLowerCase().includes(searchLower) ||
        m.email.toLowerCase().includes(searchLower) ||
        m.firm_name.toLowerCase().includes(searchLower)
    );
    total = members.length;
  }

  const totalPages = Math.ceil(total / pageSize);

  return {
    data: members,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
    },
  };
}

/**
 * Fetches detailed information about a single member including their activity log.
 */
export async function getMemberDetail(
  supabase: SupabaseClient,
  memberId: string
): Promise<{ member: MemberListItem; activity_log: ActivityLogEntry[] }> {
  // Fetch the firm_user record with firm data
  const { data: firmUser, error: fetchError } = await supabase
    .from("firm_users")
    .select("id, user_id, role, status, created_at, firm_id, firms(id, name, email, plan)")
    .eq("id", memberId)
    .single();

  if (fetchError || !firmUser) {
    throw new Error(`Failed to fetch member: ${fetchError?.message || "Not found"}`);
  }

  // Fetch user metadata from auth
  const { data: userData } = await supabase.auth.admin.getUserById(firmUser.user_id);
  const user = userData?.user;
  const name = (user?.user_metadata?.full_name as string) || user?.email?.split("@")[0] || "Unknown";
  const email = user?.email || "";

  const firm = firmUser.firms as any;

  const member: MemberListItem = {
    id: firmUser.id,
    user_id: firmUser.user_id,
    name,
    email,
    firm_name: firm?.name || "",
    firm_id: firmUser.firm_id,
    role: firmUser.role,
    plan: firm?.plan || "free",
    status: firmUser.status || "active",
    created_at: firmUser.created_at,
  };

  // Fetch activity log for this user (last 100 entries, sorted by timestamp DESC)
  const activityLog = await getActivityLog(supabase, firmUser.user_id, { limit: 100 });

  return { member, activity_log: activityLog };
}

/**
 * Fetches a paginated, searchable, filterable list of firms.
 * Supports pagination (25/page default), search on name/email, filters (plan, date range).
 */
export async function getFirms(
  supabase: SupabaseClient,
  params: FirmsListRequest
): Promise<FirmsListResponse> {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.page_size ?? 25, 100);

  // Build the query
  let query = supabase
    .from("firms")
    .select("id, name, email, phone, plan, created_at", { count: "exact" });

  // Apply search filter (case-insensitive on name/email)
  if (params.search && params.search.length >= 2) {
    const searchTerm = `%${params.search}%`;
    query = query.or(`name.ilike.${searchTerm},email.ilike.${searchTerm}`);
  }

  // Apply plan filter
  if (params.plan) {
    query = query.eq("plan", params.plan);
  }

  // Apply date range filter
  if (params.date_from) {
    query = query.gte("created_at", params.date_from);
  }
  if (params.date_to) {
    query = query.lte("created_at", params.date_to);
  }

  // Order by creation date descending
  query = query.order("created_at", { ascending: false });

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: firmsData, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch firms: ${error.message}`);
  }

  // For each firm, get member count and client count
  const firmIds = (firmsData || []).map((f: any) => f.id);

  // Fetch member counts per firm
  const { data: memberCounts } = await supabase
    .from("firm_users")
    .select("firm_id")
    .in("firm_id", firmIds);

  // Fetch client counts per firm
  const { data: clientCounts } = await supabase
    .from("clients")
    .select("firm_id")
    .in("firm_id", firmIds);

  // Build count maps
  const memberCountMap: Record<string, number> = {};
  const clientCountMap: Record<string, number> = {};

  for (const m of memberCounts || []) {
    memberCountMap[m.firm_id] = (memberCountMap[m.firm_id] || 0) + 1;
  }
  for (const c of clientCounts || []) {
    clientCountMap[c.firm_id] = (clientCountMap[c.firm_id] || 0) + 1;
  }

  const firms: FirmListItem[] = (firmsData || []).map((f: any) => ({
    id: f.id,
    name: f.name,
    email: f.email,
    phone: f.phone,
    plan: f.plan,
    member_count: memberCountMap[f.id] || 0,
    client_count: clientCountMap[f.id] || 0,
    created_at: f.created_at,
  }));

  const total = count ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    data: firms,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: totalPages,
    },
  };
}

/**
 * Fetches detailed information about a single firm including members,
 * client count, document request count, and subscription history.
 */
export async function getFirmDetail(
  supabase: SupabaseClient,
  firmId: string
): Promise<FirmDetailResponse> {
  // Fetch firm data
  const { data: firmData, error: firmError } = await supabase
    .from("firms")
    .select("id, name, email, phone, plan, created_at")
    .eq("id", firmId)
    .single();

  if (firmError || !firmData) {
    throw new Error(`Failed to fetch firm: ${firmError?.message || "Not found"}`);
  }

  // Fetch firm members
  const { data: firmMembers } = await supabase
    .from("firm_users")
    .select("id, user_id, role")
    .eq("firm_id", firmId);

  // Get user details for members
  const memberUserIds = (firmMembers || []).map((m: any) => m.user_id);
  let memberUserMap: Record<string, { name: string; email: string }> = {};

  if (memberUserIds.length > 0) {
    const { data: usersData } = await supabase.auth.admin.listUsers({
      perPage: memberUserIds.length,
    });

    if (usersData?.users) {
      for (const u of usersData.users) {
        if (memberUserIds.includes(u.id)) {
          memberUserMap[u.id] = {
            name: (u.user_metadata?.full_name as string) || u.email?.split("@")[0] || "Unknown",
            email: u.email || "",
          };
        }
      }
    }
  }

  const members = (firmMembers || []).map((m: any) => ({
    id: m.id,
    name: memberUserMap[m.user_id]?.name || "Unknown",
    email: memberUserMap[m.user_id]?.email || "",
    role: m.role,
  }));

  // Fetch client count
  const { count: clientCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("firm_id", firmId);

  // Fetch document request count
  const { count: requestCount } = await supabase
    .from("document_requests")
    .select("id", { count: "exact", head: true })
    .eq("firm_id", firmId);

  // Fetch member count for the firm list item
  const memberCount = firmMembers?.length || 0;

  // Fetch subscription history
  const { data: historyData } = await supabase
    .from("subscription_history")
    .select("previous_plan, new_plan, created_at")
    .eq("firm_id", firmId)
    .order("created_at", { ascending: false });

  const firm: FirmListItem = {
    id: firmData.id,
    name: firmData.name,
    email: firmData.email,
    phone: firmData.phone,
    plan: firmData.plan,
    member_count: memberCount,
    client_count: clientCount || 0,
    created_at: firmData.created_at,
  };

  return {
    firm,
    members,
    total_clients: clientCount || 0,
    total_document_requests: requestCount || 0,
    subscription_history: (historyData || []).map((h: any) => ({
      previous_plan: h.previous_plan,
      new_plan: h.new_plan,
      changed_at: h.created_at,
    })),
  };
}

/**
 * Computes usage metrics including summary, per-firm breakdown, and trend data.
 * Per-firm breakdown is paginated (50/page) and sorted by last activity date DESC.
 */
export async function getUsageMetrics(
  supabase: SupabaseClient,
  params: UsageRequest
): Promise<UsageResponse> {
  const now = new Date();
  const dateFrom = params.date_from || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const dateTo = params.date_to || now.toISOString();
  const page = params.page ?? 1;
  const pageSize = Math.min(params.page_size ?? 50, 50);

  // Compute date boundaries for 7d and 30d metrics
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  // --- Summary Metrics ---

  // Total logins in last 7 days
  const { count: logins7d } = await supabase
    .from("member_activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("action_type", "login")
    .gte("created_at", sevenDaysAgo);

  // Total logins in last 30 days
  const { count: logins30d } = await supabase
    .from("member_activity_logs")
    .select("id", { count: "exact", head: true })
    .eq("action_type", "login")
    .gte("created_at", thirtyDaysAgo);

  // Active members in last 7 days (unique users who logged in)
  const { data: activeMembers7dData } = await supabase
    .from("member_activity_logs")
    .select("user_id")
    .eq("action_type", "login")
    .gte("created_at", sevenDaysAgo);

  const uniqueActiveMembers7d = new Set(
    (activeMembers7dData || []).map((r: any) => r.user_id)
  ).size;

  // Total clients
  const { count: totalClients } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true });

  // Total document requests sent
  const { count: totalRequestsSent } = await supabase
    .from("document_requests")
    .select("id", { count: "exact", head: true });

  // Total document requests completed
  const { count: totalRequestsCompleted } = await supabase
    .from("document_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "completed");

  // --- Per-Firm Breakdown ---

  // Fetch all firms
  const { data: allFirms, count: totalFirms } = await supabase
    .from("firms")
    .select("id, name", { count: "exact" });

  const firmIds = (allFirms || []).map((f: any) => f.id);
  const firmNameMap: Record<string, string> = {};
  for (const f of allFirms || []) {
    firmNameMap[f.id] = f.name;
  }

  // Fetch member counts per firm
  const { data: membersByFirm } = await supabase
    .from("firm_users")
    .select("firm_id")
    .in("firm_id", firmIds);

  const memberCountMap: Record<string, number> = {};
  for (const m of membersByFirm || []) {
    memberCountMap[m.firm_id] = (memberCountMap[m.firm_id] || 0) + 1;
  }

  // Fetch client counts per firm
  const { data: clientsByFirm } = await supabase
    .from("clients")
    .select("firm_id")
    .in("firm_id", firmIds);

  const clientCountMap: Record<string, number> = {};
  for (const c of clientsByFirm || []) {
    clientCountMap[c.firm_id] = (clientCountMap[c.firm_id] || 0) + 1;
  }

  // Fetch document request counts per firm (sent and completed)
  const { data: requestsByFirm } = await supabase
    .from("document_requests")
    .select("firm_id, status")
    .in("firm_id", firmIds);

  const requestsSentMap: Record<string, number> = {};
  const requestsCompletedMap: Record<string, number> = {};
  for (const r of requestsByFirm || []) {
    requestsSentMap[r.firm_id] = (requestsSentMap[r.firm_id] || 0) + 1;
    if (r.status === "completed") {
      requestsCompletedMap[r.firm_id] = (requestsCompletedMap[r.firm_id] || 0) + 1;
    }
  }

  // Fetch last activity date per firm
  const { data: lastActivities } = await supabase
    .from("member_activity_logs")
    .select("firm_id, created_at")
    .in("firm_id", firmIds)
    .order("created_at", { ascending: false });

  const lastActivityMap: Record<string, string> = {};
  for (const a of lastActivities || []) {
    if (!lastActivityMap[a.firm_id]) {
      lastActivityMap[a.firm_id] = a.created_at;
    }
  }

  // Build per-firm usage items
  let firmUsageItems: FirmUsageItem[] = (allFirms || []).map((f: any) => {
    const lastActivityDate = lastActivityMap[f.id] || null;
    return {
      firm_id: f.id,
      firm_name: f.name,
      member_count: memberCountMap[f.id] || 0,
      client_count: clientCountMap[f.id] || 0,
      requests_sent: requestsSentMap[f.id] || 0,
      requests_completed: requestsCompletedMap[f.id] || 0,
      last_activity_date: lastActivityDate,
      is_inactive: isInactive(lastActivityDate, 30),
    };
  });

  // Sort by last activity date descending (nulls last)
  firmUsageItems.sort((a, b) => {
    if (!a.last_activity_date && !b.last_activity_date) return 0;
    if (!a.last_activity_date) return 1;
    if (!b.last_activity_date) return -1;
    return new Date(b.last_activity_date).getTime() - new Date(a.last_activity_date).getTime();
  });

  // Paginate per-firm breakdown
  const totalFirmCount = firmUsageItems.length;
  const perFirmFrom = (page - 1) * pageSize;
  const paginatedFirms = firmUsageItems.slice(perFirmFrom, perFirmFrom + pageSize);

  // --- Trend Data ---
  // Compute daily active members and document requests for the date range
  const { data: trendActivities } = await supabase
    .from("member_activity_logs")
    .select("user_id, created_at, action_type")
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo);

  const { data: trendRequests } = await supabase
    .from("document_requests")
    .select("created_at")
    .gte("created_at", dateFrom)
    .lte("created_at", dateTo);

  // Build trend map: date -> { active_members: Set, document_requests: number }
  const trendMap: Record<string, { activeMembers: Set<string>; documentRequests: number }> = {};

  // Initialize all dates in range
  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateKey = d.toISOString().split("T")[0];
    trendMap[dateKey] = { activeMembers: new Set(), documentRequests: 0 };
  }

  // Count active members per day (members who logged in)
  for (const activity of trendActivities || []) {
    if (activity.action_type === "login") {
      const dateKey = new Date(activity.created_at).toISOString().split("T")[0];
      if (trendMap[dateKey]) {
        trendMap[dateKey].activeMembers.add(activity.user_id);
      }
    }
  }

  // Count document requests per day
  for (const req of trendRequests || []) {
    const dateKey = new Date(req.created_at).toISOString().split("T")[0];
    if (trendMap[dateKey]) {
      trendMap[dateKey].documentRequests++;
    }
  }

  const trend = Object.entries(trendMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, data]) => ({
      date,
      active_members: data.activeMembers.size,
      document_requests: data.documentRequests,
    }));

  return {
    summary: {
      total_logins_7d: logins7d || 0,
      total_logins_30d: logins30d || 0,
      active_members_7d: uniqueActiveMembers7d,
      total_clients: totalClients || 0,
      total_requests_sent: totalRequestsSent || 0,
      total_requests_completed: totalRequestsCompleted || 0,
    },
    per_firm: {
      data: paginatedFirms,
      pagination: {
        page,
        page_size: pageSize,
        total: totalFirmCount,
        total_pages: Math.ceil(totalFirmCount / pageSize),
      },
    },
    trend,
  };
}

/**
 * Fetches the activity log for a specific user.
 * Returns max 100 entries sorted by timestamp DESC, with optional action type and date range filters.
 */
export async function getActivityLog(
  supabase: SupabaseClient,
  userId: string,
  params: ActivityLogRequest = {}
): Promise<ActivityLogEntry[]> {
  const limit = Math.min(params.limit ?? 100, 100);

  let query = supabase
    .from("member_activity_logs")
    .select("id, action_type, description, related_entity_name, metadata, created_at")
    .eq("user_id", userId);

  // Apply action type filter
  if (params.action_type) {
    query = query.eq("action_type", params.action_type);
  }

  // Apply date range filters
  if (params.date_from) {
    query = query.gte("created_at", params.date_from);
  }
  if (params.date_to) {
    query = query.lte("created_at", params.date_to);
  }

  // Order by timestamp descending and limit
  query = query.order("created_at", { ascending: false }).limit(limit);

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch activity log: ${error.message}`);
  }

  // Map to ActivityLogEntry format
  return (data || []).map((entry: any) => {
    const actionType = entry.action_type as MemberActionType;
    let relatedEntity: string | null = null;

    // Determine related entity based on action type
    if (actionType === "client_added" || actionType === "client_updated") {
      relatedEntity = entry.related_entity_name || (entry.metadata?.client_name as string) || null;
    } else if (actionType === "document_request_sent" || actionType === "document_request_completed") {
      relatedEntity = entry.related_entity_name || (entry.metadata?.request_id as string) || null;
    }

    return {
      id: entry.id,
      action_type: actionType,
      description: (entry.description || "").slice(0, 200),
      timestamp: entry.created_at,
      related_entity: relatedEntity,
    };
  });
}
