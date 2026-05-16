"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, BellOff, Loader2 } from "lucide-react";
import type { NotificationType, NotificationFrequency } from "@/lib/notifications/types";

interface SubscriptionWithType {
  id: string;
  client_id: string;
  firm_id: string;
  notification_type_id: string;
  frequency: NotificationFrequency;
  is_active: boolean;
  last_delivered_at: string | null;
  created_at: string;
  updated_at: string;
  notification_types: NotificationType;
}

interface SubscriptionCardProps {
  notificationType: NotificationType;
  subscription: SubscriptionWithType | undefined;
  isLoading: boolean;
  onToggle: (notificationType: NotificationType, subscription: SubscriptionWithType | undefined) => void;
  onFrequencyChange: (subscription: SubscriptionWithType, frequency: NotificationFrequency) => void;
}

export function SubscriptionCard({
  notificationType,
  subscription,
  isLoading,
  onToggle,
  onFrequencyChange,
}: SubscriptionCardProps) {
  const isActive = subscription?.is_active ?? false;

  return (
    <Card className={isActive ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">
            {isActive ? (
              <Bell className="h-5 w-5 text-primary" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium">{notificationType.display_name}</p>
              {isActive && (
                <Badge
                  variant="outline"
                  className="text-xs text-primary border-primary/30"
                >
                  Active
                </Badge>
              )}
            </div>
            {notificationType.description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {notificationType.description}
              </p>
            )}

            {/* Frequency selector - only shown when active */}
            {isActive && subscription && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Frequency:</span>
                <Select
                  value={subscription.frequency}
                  onValueChange={(value) =>
                    onFrequencyChange(subscription, value as NotificationFrequency)
                  }
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily" className="text-xs">
                      Daily
                    </SelectItem>
                    <SelectItem value="weekly" className="text-xs">
                      Weekly
                    </SelectItem>
                    <SelectItem value="monthly" className="text-xs">
                      Monthly
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Toggle button */}
          <Button
            variant={isActive ? "outline" : "default"}
            size="sm"
            disabled={isLoading}
            onClick={() => onToggle(notificationType, subscription)}
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isActive ? (
              "Unsubscribe"
            ) : (
              "Subscribe"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
