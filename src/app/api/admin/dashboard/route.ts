import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { computeCompletionRate, computeMonthOverMonth } from "@/lib/admin/metrics";

export async function GET() {
  const supabase = createClient();

  // 1. Authenticate the user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Authentication required" },
      { status: 401 }
    );
  }

  // 2. Verify super admin status
  const { data: adminRecord } = await supabase
    .from("super_admins")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminRecord) {
    return NextResponse.json(
      { error: "FORBIDDEN", message: "Super admin access required" },
      { status: 403 }
    );
  }

  // 3. Create service role client for auth.admin calls
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Fetch summary stats
    const [firmsRes, membersRes, clientsRes, requestsRes, completedRes] =
      await Promise.all([
        supabase.from("firms").select("id", { count: "exact", head: true }),
        supabase.from("firm_users").select("id", { count: "exact", head: true }),
        supabase.from("clients").select("id", { count: "exact", head: true }),
        supabase.from("document_requests").select("id", { count: "exact", head: true }),
        supabase
          .from("document_requests")
          .select("id", { count: "exact", head: true })
          .eq("status", "completed"),
      ]);

    const totalFirms = firmsRes.count || 0;
    const totalMembers = membersRes.count || 0;
    const totalClients = clientsRes.count || 0;
    const totalRequests = requestsRes.count || 0;
    const totalCompleted = completedRes.count || 0;

    // Recent firms (up to 5, sorted by creation date DESC)
    const { data: recentFirmsData } = await supabase
      .from("firms")
      .select("id, name, plan, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    // Get member counts for recent firms
    const recentFirmIds = (recentFirmsData || []).map((f: any) => f.id);
    const { data: firmMemberCounts } = await supabase
      .from("firm_users")
      .select("firm_id")
      .in("firm_id", recentFirmIds);

    const memberCountMap: Record<string, number> = {};
    for (const m of firmMemberCounts || []) {
      memberCountMap[m.firm_id] = (memberCountMap[m.firm_id] || 0) + 1;
    }

    const recentFirms = (recentFirmsData || []).map((f: any) => ({
      id: f.id,
      name: f.name,
      plan: f.plan,
      member_count: memberCountMap[f.id] || 0,
      created_at: f.created_at,
    }));

    // Recent members (up to 5, sorted by registration date DESC)
    const { data: recentMembersData } = await supabase
      .from("firm_users")
      .select("id, user_id, role, created_at, firms(name)")
      .order("created_at", { ascending: false })
      .limit(5);

    // Get user names using service role client
    const recentMemberUserIds = (recentMembersData || []).map((m: any) => m.user_id);
    let userNameMap: Record<string, string> = {};

    if (recentMemberUserIds.length > 0) {
      const { data: usersData } = await serviceSupabase.auth.admin.listUsers({
        perPage: 50,
      });

      if (usersData?.users) {
        for (const u of usersData.users) {
          if (recentMemberUserIds.includes(u.id)) {
            userNameMap[u.id] =
              (u.user_metadata?.full_name as string) ||
              u.email?.split("@")[0] ||
              "Unknown";
          }
        }
      }
    }

    const recentMembers = (recentMembersData || []).map((m: any) => ({
      id: m.id,
      name: userNameMap[m.user_id] || "Unknown",
      firm_name: (m.firms as any)?.name || "—",
      role: m.role,
      created_at: m.created_at,
    }));

    // Growth metrics
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

    const [newFirmsThisMonthRes, newFirmsPrevMonthRes, newMembersThisMonthRes, newMembersPrevMonthRes] =
      await Promise.all([
        supabase
          .from("firms")
          .select("id", { count: "exact", head: true })
          .gte("created_at", currentMonthStart),
        supabase
          .from("firms")
          .select("id", { count: "exact", head: true })
          .gte("created_at", previousMonthStart)
          .lte("created_at", previousMonthEnd),
        supabase
          .from("firm_users")
          .select("id", { count: "exact", head: true })
          .gte("created_at", currentMonthStart),
        supabase
          .from("firm_users")
          .select("id", { count: "exact", head: true })
          .gte("created_at", previousMonthStart)
          .lte("created_at", previousMonthEnd),
      ]);

    const newFirmsThisMonth = newFirmsThisMonthRes.count || 0;
    const newFirmsPrevMonth = newFirmsPrevMonthRes.count || 0;
    const newMembersThisMonth = newMembersThisMonthRes.count || 0;
    const newMembersPrevMonth = newMembersPrevMonthRes.count || 0;

    return NextResponse.json({
      stats: {
        totalFirms,
        totalMembers,
        totalClients,
        totalRequests,
        totalCompleted,
      },
      recentFirms,
      recentMembers,
      growth: {
        newFirmsThisMonth,
        newMembersThisMonth,
        firmsMoM: computeMonthOverMonth(newFirmsThisMonth, newFirmsPrevMonth),
        membersMoM: computeMonthOverMonth(newMembersThisMonth, newMembersPrevMonth),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch dashboard data";
    return NextResponse.json(
      { error: "QUERY_ERROR", message },
      { status: 500 }
    );
  }
}
