"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MailIcon } from "lucide-react";
import { NotificationLogTable } from "./notification-log-table";
import type { NotificationLogEntry } from "./notification-log-table";
import {
  NotificationLogFilters,
  type NotificationLogFilterValues,
} from "./notification-log-filters";
import { NotificationStatsCards } from "./notification-stats-cards";

type StatsResponse = {
  totals: {
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    queued: number;
    stopped: number;
  };
  by_type: Array<{
    notification_type_id: string;
    type_name: string;
    total: number;
    sent: number;
    delivered: number;
    failed: number;
    queued: number;
    stopped: number;
  }>;
};

export default function NotificationsPage() {
  const [logs, setLogs] = useState<NotificationLogEntry[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    page_size: 25,
    total: 0,
    total_pages: 0,
  });
  const [filters, setFilters] = useState<NotificationLogFilterValues>({
    clientSearch: "",
    notificationType: "all",
    channel: "all",
    status: "all",
    dateFrom: "",
    dateTo: "",
  });

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/stats");
      if (res.ok) {
        const data: StatsResponse = await res.json();
        setStats(data);
      }
    } catch {
      // Stats fetch failed silently
    }
  }, []);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: "25",
      });

      if (filters.clientSearch) {
        params.set("client_search", filters.clientSearch);
      }
      if (filters.notificationType !== "all") {
        params.set("notification_type_id", filters.notificationType);
      }
      if (filters.channel !== "all") {
        params.set("channel", filters.channel);
      }
      if (filters.status !== "all") {
        params.set("status", filters.status);
      }
      if (filters.dateFrom) {
        params.set("date_from", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.set("date_to", filters.dateTo);
      }

      const res = await fetch(`/api/notifications/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setPagination(data.pagination);
      }
    } catch {
      // Fetch failed silently
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
    fetchLogs();
  }, [fetchStats, fetchLogs]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-muted-foreground">
          View and manage notification logs for your firm
        </p>
      </div>

      {/* Stats Cards */}
      <NotificationStatsCards
        totals={stats?.totals ?? { total: 0, sent: 0, delivered: 0, failed: 0, queued: 0, stopped: 0 }}
      />

      {/* Filters */}
      <NotificationLogFilters
        filters={filters}
        onFiltersChange={(newFilters) => {
          setFilters(newFilters);
        }}
      />

      {/* Notification Log Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MailIcon className="h-5 w-5" />
            Notification Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <NotificationLogTable
              logs={logs}
              pagination={pagination}
              onPageChange={fetchLogs}
              onActionComplete={() => {
                fetchLogs(pagination.page);
                fetchStats();
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
