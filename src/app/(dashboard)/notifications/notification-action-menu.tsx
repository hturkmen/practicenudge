"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Send,
  Pencil,
  Loader2,
} from "lucide-react";
import { NotificationEditDialog } from "./notification-edit-dialog";

type NotificationStatus = "queued" | "sent" | "delivered" | "failed" | "stopped";

interface NotificationLogEntry {
  id: string;
  client_id: string;
  notification_type_id: string;
  channel: "email" | "sms";
  recipient_address: string;
  status: NotificationStatus;
  subject: string | null;
  content_preview: string | null;
  full_content?: string | null;
  clients: { name: string } | null;
  notification_types: { display_name: string } | null;
}

interface NotificationActionMenuProps {
  notification: NotificationLogEntry;
  onActionComplete?: () => void;
}

type ActionType = "retry" | "delete" | "trigger" | "edit";

export function NotificationActionMenu({
  notification,
  onActionComplete,
}: NotificationActionMenuProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<ActionType | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const canRetry = notification.status === "failed";

  async function executeAction(action: ActionType) {
    setIsLoading(true);
    setLoadingAction(action);

    try {
      const body: Record<string, unknown> = {
        action,
        notification_log_id: notification.id,
      };

      if (action === "trigger") {
        body.trigger_params = {
          client_id: notification.client_id,
          notification_type_id: notification.notification_type_id,
          channel: notification.channel,
        };
      }

      const res = await fetch("/api/notifications/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.message || `Action failed with status ${res.status}`
        );
      }

      const actionLabels: Record<ActionType, string> = {
        retry: "Notification retried successfully",
        delete: "Notification deleted",
        trigger: "New notification triggered",
        edit: "Notification updated and re-sent",
      };

      toast.success(actionLabels[action]);
      onActionComplete?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error(`Failed to ${action} notification`, {
        description: message,
      });
    } finally {
      setIsLoading(false);
      setLoadingAction(null);
    }
  }

  function handleDeleteClick() {
    setShowDeleteConfirm(true);
  }

  function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    executeAction("delete");
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={isLoading}
            aria-label="Notification actions"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canRetry && (
            <DropdownMenuItem
              onClick={() => executeAction("retry")}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {loadingAction === "retry" ? "Retrying..." : "Retry"}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => executeAction("trigger")}
            disabled={isLoading}
          >
            <Send className="mr-2 h-4 w-4" />
            {loadingAction === "trigger" ? "Triggering..." : "Trigger New"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowEditDialog(true)}
            disabled={isLoading}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Update & Re-send
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleDeleteClick}
            disabled={isLoading}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {loadingAction === "delete" ? "Deleting..." : "Delete"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notification Log</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this notification log? This action
              cannot be undone.
              {notification.clients?.name && (
                <>
                  <br />
                  <span className="font-medium text-foreground">
                    Client: {notification.clients.name}
                  </span>
                </>
              )}
              {notification.subject && (
                <>
                  <br />
                  <span className="font-medium text-foreground">
                    Subject: {notification.subject}
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit & Re-send Dialog */}
      <NotificationEditDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        notification={notification}
        onSuccess={onActionComplete}
      />
    </>
  );
}
