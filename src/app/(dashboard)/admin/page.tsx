"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { AdminGuard } from "@/components/admin/admin-guard";
import { StatCard } from "@/components/admin/stat-card";
import { computeCompletionRate, computeMonthOverMonth } from "@/lib/admin/metrics";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Shield,
  Users,
  Building2,
  FileText,
  Activity,
  Loader2,
  Bell,
  TrendingUp,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface DashboardStats {
  totalFirms: number;
  totalMembers: number;
  totalClients: number;
  totalRequests: number;
  totalCompleted: number;
}

interface RecentFirm {
  id: string;
  name: string;
  plan: string;
  member_count: number;
  created_at: string;
}

interface RecentMember {
  id: string;
  name: string;
  firm_name: string;
  role: string;
  created_at: string;
}

interface GrowthMetrics {
  newFirmsThisMonth: number;
  newMembersThisMonth: number;
  firmsMoM: number;
  membersMoM: number;
}

export default function AdminPage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalFirms: 0,
    totalMembers: 0,
    totalClients: 0,
    totalRequests: 0,
    totalCompleted: 0,
  });
  const [recentFirms, setRecentFirms] = useState<RecentFirm[]>([]);
  const [recentMembers, setRecentMembers] = useState<RecentMember[]>([]);
  const [growth, setGrowth] = useState<GrowthMetrics>({
    newFirmsThisMonth: 0,
    newMembersThisMonth: 0,
    firmsMoM: 0,
    membersMoM: 0,
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setTimedOut(false);

    // Set up 5-second timeout
    const timeoutId = setTimeout(() => {
      setTimedOut(true);
      setLoading(false);
    }, 5000);

    try {
      // Fetch summary stats
      const [firmsRes, membersRes, clientsRes, requestsRes, completedRes] =
        await Promise.all([
          supabase.from("firms").select("id, name, plan, created_at", { count: "exact" }),
          supabase.from("firm_users").select("id, user_id, role, firm_id, created_at, firms(name)", { count: "exact" }),
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

      setStats({
        totalFirms,
        totalMembers,
        totalClients,
        totalRequests,
        totalCompleted,
      });

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

      setRecentFirms(
        (recentFirmsData || []).map((f: any) => ({
          id: f.id,
          name: f.name,
          plan: f.plan,
          member_count: memberCountMap[f.id] || 0,
          created_at: f.created_at,
        }))
      );

      // Recent members (up to 5, sorted by registration date DESC)
      const { data: recentMembersData } = await supabase
        .from("firm_users")
        .select("id, user_id, role, created_at, firms(name)")
        .order("created_at", { ascending: false })
        .limit(5);

      // Get user names for recent members
      const recentMemberUserIds = (recentMembersData || []).map((m: any) => m.user_id);
      let userNameMap: Record<string, string> = {};

      if (recentMemberUserIds.length > 0) {
        const { data: usersData } = await supabase.auth.admin.listUsers({
          perPage: recentMemberUserIds.length,
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

      setRecentMembers(
        (recentMembersData || []).map((m: any) => ({
          id: m.id,
          name: userNameMap[m.user_id] || "Unknown",
          firm_name: (m.firms as any)?.name || "—",
          role: m.role,
          created_at: m.created_at,
        }))
      );

      // Growth metrics: new firms/members this month and MoM
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

      setGrowth({
        newFirmsThisMonth,
        newMembersThisMonth,
        firmsMoM: computeMonthOverMonth(newFirmsThisMonth, newFirmsPrevMonth),
        membersMoM: computeMonthOverMonth(newMembersThisMonth, newMembersPrevMonth),
      });

      clearTimeout(timeoutId);
      setLoading(false);
    } catch (error) {
      clearTimeout(timeoutId);
      setLoading(false);
      toast.error("Failed to load dashboard data");
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const completionRate = computeCompletionRate(stats.totalRequests, stats.totalCompleted);

  const planColors: Record<string, string> = {
    free: "bg-gray-100 text-gray-700",
    starter: "bg-blue-100 text-blue-700",
    pro: "bg-purple-100 text-purple-700",
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Platform Overview</h1>
              <p className="text-muted-foreground">
                Platform-wide management and statistics
              </p>
            </div>
          </div>
          <Link href="/admin/notifications">
            <Button variant="outline" className="gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </Button>
          </Link>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {timedOut && !loading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10">
              <p className="text-muted-foreground mb-4">
                Dashboard data took too long to load. Please try again.
              </p>
              <Button onClick={fetchDashboardData}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {!loading && !timedOut && (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-5">
              <StatCard
                title="Total Firms"
                value={stats.totalFirms}
                icon={Building2}
                href="/admin/firms"
              />
              <StatCard
                title="Total Members"
                value={stats.totalMembers}
                icon={Users}
                href="/admin/members"
              />
              <StatCard
                title="Total Clients"
                value={stats.totalClients}
                icon={Users}
                href="/admin/usage"
              />
              <StatCard
                title="Document Requests"
                value={stats.totalRequests}
                icon={FileText}
                href="/admin/usage"
              />
              <StatCard
                title="Completion Rate"
                value={`${completionRate}%`}
                icon={Activity}
                href="/admin/usage"
              />
            </div>

            {/* Growth Metrics */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">New Firms This Month</CardTitle>
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{growth.newFirmsThisMonth}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span
                      className={`text-xs ${
                        growth.firmsMoM >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {growth.firmsMoM >= 0 ? "+" : ""}
                      {growth.firmsMoM}% MoM
                    </span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">New Members This Month</CardTitle>
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{growth.newMembersThisMonth}</div>
                  <div className="flex items-center gap-1 mt-1">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span
                      className={`text-xs ${
                        growth.membersMoM >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {growth.membersMoM >= 0 ? "+" : ""}
                      {growth.membersMoM}% MoM
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Firms and Members */}
            <div className="grid gap-4 md:grid-cols-2">
              {/* Recently Registered Firms */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recently Registered Firms</CardTitle>
                  <CardDescription>Last 5 firms to join the platform</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead className="text-right">Members</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentFirms.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                            No firms registered yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentFirms.map((firm) => (
                          <TableRow key={firm.id}>
                            <TableCell className="font-medium">{firm.name}</TableCell>
                            <TableCell>
                              <Badge className={(planColors[firm.plan] || "") + " text-xs"}>
                                {firm.plan}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">{firm.member_count}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Recently Registered Members */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recently Registered Members</CardTitle>
                  <CardDescription>Last 5 members to join the platform</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Firm</TableHead>
                        <TableHead>Role</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                            No members registered yet
                          </TableCell>
                        </TableRow>
                      ) : (
                        recentMembers.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell className="text-muted-foreground">{member.firm_name}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {member.role}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
