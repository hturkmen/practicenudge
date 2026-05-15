"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const supabase = createClient();
  const [totalClients, setTotalClients] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [overdueRequests, setOverdueRequests] = useState<any[]>([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [clientsRes, requestsRes, overdueRes, upcomingRes, activityRes] =
        await Promise.all([
          supabase
            .from("clients")
            .select("id", { count: "exact", head: true })
            .eq("status", "active"),
          supabase
            .from("document_requests")
            .select("id", { count: "exact", head: true })
            .in("status", ["pending", "in_progress"]),
          supabase
            .from("document_requests")
            .select("id, title, deadline, clients(id, name, email)")
            .eq("status", "overdue")
            .order("deadline", { ascending: true })
            .limit(10),
          supabase
            .from("document_requests")
            .select("id, title, deadline, status, clients(id, name, email)")
            .in("status", ["pending", "in_progress"])
            .gte("deadline", new Date().toISOString().split("T")[0])
            .lte(
              "deadline",
              new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0]
            )
            .order("deadline", { ascending: true })
            .limit(10),
          supabase
            .from("activity_logs")
            .select("id, action, details, created_at, clients(name)")
            .order("created_at", { ascending: false })
            .limit(10),
        ]);

      setTotalClients(clientsRes.count || 0);
      setPendingRequests(requestsRes.count || 0);
      setOverdueRequests(overdueRes.data || []);
      setUpcomingDeadlines(upcomingRes.data || []);
      setRecentActivity(activityRes.data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const statusColor: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    in_progress: "bg-yellow-100 text-yellow-700",
    completed: "bg-green-100 text-green-700",
    overdue: "bg-red-100 text-red-700",
  };

  const actionLabels: Record<string, string> = {
    request_created: "Request created",
    reminder_sent: "Reminder sent",
    document_uploaded: "Document uploaded",
    request_completed: "Request completed",
    item_approved: "Item approved",
    item_rejected: "Item rejected",
    client_created: "Client added",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your client document requests
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Requests</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Requests</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {overdueRequests.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Due This Week</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingDeadlines.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Overdue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Overdue Requests
            </CardTitle>
            <CardDescription>Clients who have missed their deadline</CardDescription>
          </CardHeader>
          <CardContent>
            {overdueRequests.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No overdue requests. Great job! 🎉
              </p>
            ) : (
              <div className="space-y-3">
                {overdueRequests.map((req: any) => (
                  <Link key={req.id} href={`/requests/${req.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div>
                      <p className="font-medium text-sm">{req.clients?.name}</p>
                      <p className="text-xs text-muted-foreground">{req.title}</p>
                    </div>
                    <Badge variant="destructive" className="text-xs">Overdue</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              Upcoming Deadlines
            </CardTitle>
            <CardDescription>Due within the next 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming deadlines this week
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingDeadlines.map((req: any) => (
                  <Link key={req.id} href={`/requests/${req.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent transition-colors">
                    <div>
                      <p className="font-medium text-sm">{req.clients?.name}</p>
                      <p className="text-xs text-muted-foreground">{req.title}</p>
                    </div>
                    <Badge className={(statusColor[req.status] || "") + " text-xs"}>
                      {req.status.replace("_", " ")}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Latest actions across your firm</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No activity yet. Start by adding clients and creating document requests.
              </p>
              <div className="flex gap-3 justify-center mt-4">
                <Link href="/clients"><Button size="sm">Add clients</Button></Link>
                <Link href="/requests"><Button size="sm" variant="outline">Create request</Button></Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 text-sm py-2 border-b last:border-0">
                  <div className="flex-1">
                    <span className="font-medium">{actionLabels[log.action] || log.action}</span>
                    {log.clients?.name && (
                      <span className="text-muted-foreground"> — {log.clients.name}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.created_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
