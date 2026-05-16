"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, X } from "lucide-react";

export interface NotificationLogFilterValues {
  clientSearch: string;
  notificationType: string;
  channel: string;
  status: string;
  dateFrom: string;
  dateTo: string;
}

interface NotificationLogFiltersProps {
  filters: NotificationLogFilterValues;
  onFiltersChange: (filters: NotificationLogFilterValues) => void;
}

interface NotificationTypeOption {
  id: string;
  display_name: string;
}

export function NotificationLogFilters({
  filters,
  onFiltersChange,
}: NotificationLogFiltersProps) {
  const [notificationTypes, setNotificationTypes] = useState<
    NotificationTypeOption[]
  >([]);
  const supabase = createClient();

  const fetchNotificationTypes = useCallback(async () => {
    const { data } = await supabase
      .from("notification_types")
      .select("id, display_name")
      .order("display_name");
    if (data) {
      setNotificationTypes(data);
    }
  }, [supabase]);

  useEffect(() => {
    fetchNotificationTypes();
  }, [fetchNotificationTypes]);

  const updateFilter = (key: keyof NotificationLogFilterValues, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      clientSearch: "",
      notificationType: "all",
      channel: "all",
      status: "all",
      dateFrom: "",
      dateTo: "",
    });
  };

  const hasActiveFilters =
    filters.clientSearch !== "" ||
    filters.notificationType !== "all" ||
    filters.channel !== "all" ||
    filters.status !== "all" ||
    filters.dateFrom !== "" ||
    filters.dateTo !== "";

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          {/* Row 1: Search + Type + Channel */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name..."
                value={filters.clientSearch}
                onChange={(e) => updateFilter("clientSearch", e.target.value)}
                className="pl-9"
                aria-label="Search by client name"
              />
            </div>
            <Select
              value={filters.notificationType}
              onValueChange={(value) => updateFilter("notificationType", value)}
            >
              <SelectTrigger className="w-full sm:w-[200px]" aria-label="Notification type">
                <SelectValue placeholder="Notification type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {notificationTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.display_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.channel}
              onValueChange={(value) => updateFilter("channel", value)}
            >
              <SelectTrigger className="w-full sm:w-[150px]" aria-label="Channel">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Row 2: Status + Date Range + Clear */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Select
              value={filters.status}
              onValueChange={(value) => updateFilter("status", value)}
            >
              <SelectTrigger className="w-full sm:w-[160px]" aria-label="Status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 flex-1">
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter("dateFrom", e.target.value)}
                className="w-full sm:w-[160px]"
                aria-label="Date from"
              />
              <span className="text-sm text-muted-foreground whitespace-nowrap">to</span>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter("dateTo", e.target.value)}
                className="w-full sm:w-[160px]"
                aria-label="Date to"
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="self-center"
              >
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
