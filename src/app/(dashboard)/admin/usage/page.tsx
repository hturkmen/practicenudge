"use client";

import { useEffect, useState, useCallback } from "react";
import { AdminGuard } from "@/components/admin/admin-guard";
import { StatCard } from "@/components/admin/stat-card";
import { Pagination } from "@/components/admin/pagination";
import { TrendChart } from "@/components/admin/trend-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  LogIn,
  Users,
  UserCheck,
  FolderOpen,
  Send,
  CheckCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import type { UsageResponse, FirmUsageItem } from "@/lib/types/admin";

function getDefaultDateRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 30);
  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}

export default function UsageAnalyticsPage() {
  const defaultRange = getDefaultDateRange();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState(defaultRange.from);
  const [dateTo, setDateTo] = useState(defaultRange.to);

  const fetchUsageData = useCallback(
    async (currentPage: number, from: string, to: string) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          page_size: "50",
          date_from: from,
          date_to: to,
        });

        const response = await fetch(`/api/admin/usage?${params.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.message || "Failed to fetch usage data"
          );
        }

        const result: UsageResponse = await response.json();
        setData(result);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to fetch usage data";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchUsageData(page, dateFrom, dateTo);
  }, [fetchUsageData, page, dateFrom, dateTo]);

  const handleDateChange = (newFrom: string, newTo: string) => {
    // Validate max 365 days
    const fromDate = new Date(newFrom);
    const toDate = new Date(newTo);
    const diffDays =
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays > 365) {
      toast.error("Date range must not exceed 365 days");
      return;
    }

    if (diffDays < 0) {
      toast.error("Start date must be before end date");
      return;
    }

    setDateFrom(newFrom);
    setDateTo(newTo);
    setPage(1);
  };

  const handleRetry = () => {
    fetchUsageData(page, dateFrom, dateTo);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Usage Analytics
          </h1>
          <p className="text-muted-foreground">
            Platform-wide usage metrics and per-firm breakdown
          </p>
        </div>

        {/* Date Range Picker */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <Label htmlFor="date-from">From</Label>
                <Input
                  id="date-from"
                  type="date"
                  value={dateFrom}
                  onChange={(e) =>
                    handleDateChange(e.target.value, dateTo)
                  }
                  className="w-[160px]"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="date-to">To</Label>
                <Input
                  id="date-to"
                  type="date"
                  value={dateTo}
                  onChange={(e) =>
                    handleDateChange(dateFrom, e.target.value)
                  }
                  className="w-[160px]"
                />
              </div>
              <p className="text-xs text-muted-foreground pb-2">
                Max range: 365 days
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {error && !loading && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center gap-4 py-8">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <div className="text-center">
                  <p className="font-medium text-destructive">
                    Failed to load usage data
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {error}
                  </p>
                </div>
                <Button onClick={handleRetry} variant="outline" className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Data Display */}
        {!loading && !error && data && (
          <>
            {/* Summary Metrics */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              <StatCard
                title="Logins (7d)"
                value={data.summary.total_logins_7d}
                icon={LogIn}
              />
              <StatCard
                title="Logins (30d)"
                value={data.summary.total_logins_30d}
                icon={LogIn}
              />
              <StatCard
                title="Active Members (7d)"
                value={data.summary.active_members_7d}
                icon={UserCheck}
              />
              <StatCard
                title="Total Clients"
                value={data.summary.total_clients}
                icon={FolderOpen}
              />
              <StatCard
                title="Requests Sent"
                value={data.summary.total_requests_sent}
                icon={Send}
              />
              <StatCard
                title="Requests Completed"
                value={data.summary.total_requests_completed}
                icon={CheckCircle}
              />
            </div>

            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Trend</CardTitle>
                <CardDescription>
                  Daily active members and document requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrendChart data={data.trend} />
              </CardContent>
            </Card>

            {/* Per-Firm Usage Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Per-Firm Usage Breakdown</CardTitle>
                <CardDescription>
                  Sorted by last activity date (most recent first)
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Firm Name</TableHead>
                      <TableHead className="text-center">Members</TableHead>
                      <TableHead className="text-center">Clients</TableHead>
                      <TableHead className="text-center">
                        Requests Sent
                      </TableHead>
                      <TableHead className="text-center">
                        Requests Completed
                      </TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.per_firm.data.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No firm usage data available for the selected period
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.per_firm.data.map((firm: FirmUsageItem) => (
                        <TableRow key={firm.firm_id}>
                          <TableCell className="font-medium">
                            {firm.firm_name}
                          </TableCell>
                          <TableCell className="text-center">
                            {firm.member_count}
                          </TableCell>
                          <TableCell className="text-center">
                            {firm.client_count}
                          </TableCell>
                          <TableCell className="text-center">
                            {firm.requests_sent}
                          </TableCell>
                          <TableCell className="text-center">
                            {firm.requests_completed}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {firm.last_activity_date
                              ? new Date(
                                  firm.last_activity_date
                                ).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "Never"}
                          </TableCell>
                          <TableCell>
                            {firm.is_inactive ? (
                              <Badge variant="secondary" className="text-xs">
                                inactive
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-xs text-green-600 border-green-200"
                              >
                                active
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>

                {data.per_firm.pagination.total > 0 && (
                  <Pagination
                    page={data.per_firm.pagination.page}
                    pageSize={data.per_firm.pagination.page_size}
                    total={data.per_firm.pagination.total}
                    totalPages={data.per_firm.pagination.total_pages}
                    onPageChange={handlePageChange}
                  />
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
