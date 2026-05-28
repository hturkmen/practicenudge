"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminGuard } from "@/components/admin/admin-guard";
import { StatCard } from "@/components/admin/stat-card";
import { computeCompletionRate } from "@/lib/admin/metrics";
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
  totalLeads: number;
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
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    totalFirms: 0,
    totalMembers: 0,
    totalClients: 0,
    totalRequests: 0,
    totalCompleted: 0,
    totalLeads: 0,
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
      const response = await fetch("/api/admin/dashboard");
      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();

      setStats(data.stats);
      setRecentFirms(data.recentFirms);
      setRecentMembers(data.recentMembers);
      setGrowth(data.growth);

      clearTimeout(timeoutId);
      setLoading(false);
    } catch (error) {
      clearTimeout(timeoutId);
      setLoading(false);
      toast.error("Failed to load dashboard data");
    }
  }, []);

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
          <div className="flex gap-2">
            <Link href="/admin/leads">
              <Button variant="outline" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Leads
              </Button>
            </Link>
            <Link href="/admin/notifications">
              <Button variant="outline" className="gap-2">
                <Bell className="h-4 w-4" />
                Notifications
              </Button>
            </Link>
          </div>
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
            <div className="grid gap-4 md:grid-cols-6">
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
                title="Total Leads"
                value={stats.totalLeads}
                icon={UserPlus}
                href="/admin/leads"
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
