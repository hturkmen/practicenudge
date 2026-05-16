"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatActivityTimestamp } from "@/lib/admin/metrics";
import type { ActivityLogEntry } from "@/lib/types/admin";

interface ActivityLogTableProps {
  entries: ActivityLogEntry[];
  onFilterChange?: (actionType: string) => void;
}

const actionTypeBadgeColors: Record<string, string> = {
  login: "bg-blue-100 text-blue-700",
  client_added: "bg-green-100 text-green-700",
  client_updated: "bg-yellow-100 text-yellow-700",
  document_request_sent: "bg-purple-100 text-purple-700",
  document_request_completed: "bg-emerald-100 text-emerald-700",
  settings_changed: "bg-gray-100 text-gray-700",
};

const actionTypeLabels: Record<string, string> = {
  login: "Login",
  client_added: "Client Added",
  client_updated: "Client Updated",
  document_request_sent: "Request Sent",
  document_request_completed: "Request Completed",
  settings_changed: "Settings Changed",
};

export function ActivityLogTable({
  entries,
  onFilterChange,
}: ActivityLogTableProps) {
  return (
    <div className="space-y-4">
      {onFilterChange && (
        <div className="flex items-center gap-2">
          <Select onValueChange={onFilterChange} defaultValue="all">
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="login">Login</SelectItem>
              <SelectItem value="client_added">Client Added</SelectItem>
              <SelectItem value="client_updated">Client Updated</SelectItem>
              <SelectItem value="document_request_sent">Request Sent</SelectItem>
              <SelectItem value="document_request_completed">
                Request Completed
              </SelectItem>
              <SelectItem value="settings_changed">Settings Changed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Related Entity</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                No activity entries found
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <Badge
                    className={
                      (actionTypeBadgeColors[entry.action_type] || "") +
                      " text-xs"
                    }
                  >
                    {actionTypeLabels[entry.action_type] || entry.action_type}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[300px] truncate">
                  {entry.description}
                </TableCell>
                <TableCell className="text-muted-foreground whitespace-nowrap">
                  {formatActivityTimestamp(entry.timestamp)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {entry.related_entity || "—"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
