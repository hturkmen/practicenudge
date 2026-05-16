"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Shield,
  Bell,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  StopCircle,
  MoreHorizontal,
  Loader2,
  RefreshCw,
  Trash2,
  Square,
  ChevronDown,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";

interface NotificationLogEntry {
  id: string;
  firm_id: string;
  client_id: string;
  notification_type_id: string;
  triggered_by: string | null;
  channel: string;
  recipient_address: string;
  subject: string | null;
  content_preview: string | null;
  status: string;
  failure_reason: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  clients: { name: string } | null;
  notification_types: { display_name: string } | null;
  firms?: { name: string } | null;
}

interface Stats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  queued: number;
  stopped: number;
}

interface TypeStats {
  notification_type_id: string;
  type_name: string;
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  queued: number;
  stopped: number;
}

interface Firm {
  id: string;
  name: string;
}

interface FirmUser {
  user_id: string;
  firms: { name: string } | { name: string }[] | null;
}

export default function AdminNotificationsPage() {
  const supabase = createClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [logs, setLogs] = useState<NotificationLogEntry[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    sent: 0,
    delivered: 0,
    failed: 0,
    queued: 0,
    stopped: 0,
  });
  const [byTypeStats, setByTypeStats] = useState<TypeStats[]>([]);
  const [typeStatsExpanded, setTypeStatsExpanded] = useState(true);
  const [firms, setFirms] = useState<Firm[]>([]);
  const [firmUsers, setFirmUsers] = useState<FirmUser[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [selectedFirm, setSelectedFirm] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchLogs = useCallback(
    async (page = 1) => {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      params.set("page_size", "25");

      if (selectedFirm !== "all") params.set("firm_id", selectedFirm);
      if (selectedUser !== "all") params.set("triggered_by", selectedUser);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (selectedChannel !== "all") params.set("channel", selectedChannel);

      const response = await fetch(`/api/notifications/logs?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setLogs(result.data || []);
        setPagination({
          page: result.pagination.page,
          pageSize: result.pagination.page_size,
          total: result.pagination.total,
          totalPages: result.pagination.total_pages,
        });
      }
    },
    [selectedFirm, selectedUser, selectedStatus, selectedChannel]
  );

  const fetchStats = useCallback(async () => {
    const params = new URLSearchParams();
    if (selectedFirm !== "all") params.set("firm_id", selectedFirm);

    const response = await fetch(`/api/notifications/stats?${params.toString()}`);
    if (response.ok) {
      const result = await response.json();
      setStats(result.totals || { total: 0, sent: 0, delivered: 0, failed: 0, queued: 0, stopped: 0 });
      setByTypeStats(result.by_type || []);
    }
  }, [selectedFirm]);

  useEffect(() => {
    async function checkAdminAndFetch() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Check if super admin
      const { data: adminRecord } = await supabase
        .from("super_admins")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!adminRecord) {
        router.push("/dashboard");
        return;
      }

      setIsAdmin(true);

      // Fetch firms for filter
      const { data: firmsData } = await supabase
        .from("firms")
        .select("id, name")
        .order("name");

      setFirms(firmsData || []);

      // Fetch firm users for triggered-by filter
      const { data: firmUsersData } = await supabase
        .from("firm_users")
        .select("user_id, firms(name)");

      setFirmUsers(firmUsersData || []);

      setLoading(false);
    }

    checkAdminAndFetch();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    fetchLogs(1);
    fetchStats();
  }, [isAdmin, fetchLogs, fetchStats]);

  const handleAction = async (
    action: "retry" | "delete" | "stop",
    logId: string
  ) => {
    setActionLoading(logId);
    try {
      const response = await fetch("/api/notifications/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          notification_log_id: logId,
        }),
      });

      if (response.ok) {
        toast.success(
          action === "retry"
            ? "Notification retried"
            : action === "delete"
            ? "Notification deleted"
            : "Notification stopped"
        );
        fetchLogs(pagination.page);
        fetchStats();
      } else {
        const err = await response.json();
        toast.error(err.message || "Action failed");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      queued: "bg-yellow-100 text-yellow-700",
      sent: "bg-blue-100 text-blue-700",
      delivered: "bg-green-100 text-green-700",
      failed: "bg-red-100 text-red-700",
      stopped: "bg-gray-100 text-gray-700",
    };
    return (
      <Badge className={variants[status] || "bg-gray-100 text-gray-700"}>
        {status}
      </Badge>
    );
  };

  const getChannelBadge = (channel: string) => {
    return (
      <Badge variant="outline" className="text-xs">
        {channel}
      </Badge>
    );
  };

  const getFirmName = (log: NotificationLogEntry) => {
    // Try to find firm name from the firms list
    const firm = firms.find((f) => f.id === log.firm_id);
    return firm?.name || log.firm_id.slice(0, 8) + "...";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Notification Logs (Admin)
          </h1>
          <p className="text-muted-foreground">
            Platform-wide notification monitoring and management
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.delivered}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Queued</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.queued}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Stopped</CardTitle>
            <StopCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {stats.stopped}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cross-Firm Statistics by Notification Type */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setTypeStatsExpanded(!typeStatsExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                Statistics by Notification Type
              </CardTitle>
            </div>
            {typeStatsExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </CardHeader>
        {typeStatsExpanded && (
          <CardContent className="p-0">
            {byTypeStats.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No notification type statistics available
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Notification Type</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Delivered</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Queued</TableHead>
                    <TableHead className="text-right">Stopped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byTypeStats.map((typeStat) => (
                    <TableRow key={typeStat.notification_type_id}>
                      <TableCell className="font-medium">
                        {typeStat.type_name}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeStat.total}
                      </TableCell>
                      <TableCell className="text-right text-blue-600">
                        {typeStat.sent}
                      </TableCell>
                      <TableCell className="text-right text-green-600">
                        {typeStat.delivered}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {typeStat.failed}
                      </TableCell>
                      <TableCell className="text-right text-yellow-600">
                        {typeStat.queued}
                      </TableCell>
                      <TableCell className="text-right text-gray-600">
                        {typeStat.stopped}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        )}
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Firm Filter */}
            <div className="w-[200px]">
              <Select value={selectedFirm} onValueChange={setSelectedFirm}>
                <SelectTrigger>
                  <SelectValue placeholder="All Firms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Firms</SelectItem>
                  {firms.map((firm) => (
                    <SelectItem key={firm.id} value={firm.id}>
                      {firm.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Triggered By User Filter */}
            <div className="w-[200px]">
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {firmUsers.map((fu) => (
                    <SelectItem key={fu.user_id} value={fu.user_id}>
                      {Array.isArray(fu.firms) ? fu.firms[0]?.name : fu.firms?.name || fu.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="w-[160px]">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="stopped">Stopped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Channel Filter */}
            <div className="w-[140px]">
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notification Logs</CardTitle>
          <div className="text-sm text-muted-foreground">
            {pagination.total} total records
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Firm</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Sent At</TableHead>
                <TableHead>Delivered At</TableHead>
                <TableHead className="w-[60px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground py-8"
                  >
                    No notification logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-sm">
                      {getFirmName(log)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.clients?.name || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.notification_types?.display_name || "—"}
                    </TableCell>
                    <TableCell>{getChannelBadge(log.channel)}</TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm max-w-[200px] truncate">
                      {log.subject || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.sent_at
                        ? new Date(log.sent_at).toLocaleString("en-GB", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.delivered_at
                        ? new Date(log.delivered_at).toLocaleString("en-GB", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={actionLoading === log.id}
                          >
                            {actionLoading === log.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <MoreHorizontal className="h-4 w-4" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {log.status === "failed" && (
                            <DropdownMenuItem
                              onClick={() => handleAction("retry", log.id)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              Retry
                            </DropdownMenuItem>
                          )}
                          {(log.status === "queued" ||
                            log.status === "scheduled") && (
                            <DropdownMenuItem
                              onClick={() => handleAction("stop", log.id)}
                            >
                              <Square className="mr-2 h-4 w-4" />
                              Stop
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleAction("delete", log.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
