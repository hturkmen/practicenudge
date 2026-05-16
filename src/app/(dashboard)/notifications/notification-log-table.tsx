"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, ArrowUp, ArrowDown, Bell } from "lucide-react";
import { NotificationActionMenu } from "./notification-action-menu";

export type NotificationLogEntry = {
  id: string;
  firm_id: string;
  client_id: string;
  notification_type_id: string;
  triggered_by: string | null;
  channel: "email" | "sms";
  recipient_address: string;
  subject: string | null;
  content_preview: string | null;
  status: "queued" | "sent" | "delivered" | "failed" | "stopped";
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
  clients: { name: string } | null;
  notification_types: { display_name: string } | null;
};

type SortField =
  | "client_name"
  | "type"
  | "channel"
  | "status"
  | "subject"
  | "sent_at"
  | "delivered_at"
  | "created_at";

type SortDirection = "asc" | "desc";

interface NotificationLogTableProps {
  logs: NotificationLogEntry[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  onPageChange: (page: number) => void;
  onActionComplete?: () => void;
}

const statusColors: Record<string, string> = {
  queued: "bg-blue-100 text-blue-700",
  sent: "bg-yellow-100 text-yellow-700",
  delivered: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  stopped: "bg-gray-100 text-gray-700",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getSortValue(log: NotificationLogEntry, field: SortField): string {
  switch (field) {
    case "client_name":
      return log.clients?.name?.toLowerCase() ?? "";
    case "type":
      return log.notification_types?.display_name?.toLowerCase() ?? "";
    case "channel":
      return log.channel;
    case "status":
      return log.status;
    case "subject":
      return log.subject?.toLowerCase() ?? "";
    case "sent_at":
      return log.sent_at ?? "";
    case "delivered_at":
      return log.delivered_at ?? "";
    case "created_at":
      return log.created_at;
    default:
      return "";
  }
}

export function NotificationLogTable({
  logs,
  pagination,
  onPageChange,
  onActionComplete,
}: NotificationLogTableProps) {
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [logs, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-1 h-3 w-3" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3" />
    );
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-12">
        <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
        <h3 className="font-medium mb-1">No notification logs found</h3>
        <p className="text-sm text-muted-foreground">
          Notifications sent to your clients will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <button
                onClick={() => handleSort("client_name")}
                className="inline-flex items-center hover:text-foreground transition-colors"
              >
                Client
                <SortIcon field="client_name" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort("type")}
                className="inline-flex items-center hover:text-foreground transition-colors"
              >
                Type
                <SortIcon field="type" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort("channel")}
                className="inline-flex items-center hover:text-foreground transition-colors"
              >
                Channel
                <SortIcon field="channel" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort("status")}
                className="inline-flex items-center hover:text-foreground transition-colors"
              >
                Status
                <SortIcon field="status" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort("subject")}
                className="inline-flex items-center hover:text-foreground transition-colors"
              >
                Subject
                <SortIcon field="subject" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort("sent_at")}
                className="inline-flex items-center hover:text-foreground transition-colors"
              >
                Sent At
                <SortIcon field="sent_at" />
              </button>
            </TableHead>
            <TableHead>
              <button
                onClick={() => handleSort("delivered_at")}
                className="inline-flex items-center hover:text-foreground transition-colors"
              >
                Delivered At
                <SortIcon field="delivered_at" />
              </button>
            </TableHead>
            <TableHead className="w-[50px]">Actions</TableHead>
            {onActionComplete && (
              <TableHead className="w-[50px]">Actions</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedLogs.map((log) => (
            <TableRow key={log.id}>
              <TableCell className="font-medium">
                {log.clients?.name ?? "Unknown"}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="text-xs">
                  {log.notification_types?.display_name ?? "Unknown"}
                </Badge>
              </TableCell>
              <TableCell className="capitalize">{log.channel}</TableCell>
              <TableCell>
                <Badge
                  className={(statusColors[log.status] || "") + " text-xs"}
                >
                  {log.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground max-w-[200px] truncate">
                {log.subject || "—"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(log.sent_at)}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {formatDate(log.delivered_at)}
              </TableCell>
              <TableCell>
                <NotificationActionMenu
                  notification={log}
                  onActionComplete={onActionComplete}
                />
              </TableCell>
              {onActionComplete && (
                <TableCell>
                  <NotificationActionMenu
                    notification={log}
                    onActionComplete={onActionComplete}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.page_size + 1} to{" "}
            {Math.min(
              pagination.page * pagination.page_size,
              pagination.total
            )}{" "}
            of {pagination.total} results
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.total_pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
