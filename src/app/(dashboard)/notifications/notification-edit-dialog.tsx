"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface NotificationLogEntry {
  id: string;
  client_id: string;
  notification_type_id: string;
  channel: "email" | "sms";
  recipient_address: string;
  status: string;
  subject: string | null;
  content_preview: string | null;
  full_content?: string | null;
  clients: { name: string } | null;
  notification_types: { display_name: string } | null;
}

interface NotificationEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: NotificationLogEntry | null;
  onSuccess?: () => void;
}

export function NotificationEditDialog({
  open,
  onOpenChange,
  notification,
  onSuccess,
}: NotificationEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    content: "",
    recipient_address: "",
    channel: "email" as "email" | "sms",
  });

  // Pre-fill form when notification changes or dialog opens
  useEffect(() => {
    if (notification && open) {
      setForm({
        subject: notification.subject || "",
        content: notification.full_content || notification.content_preview || "",
        recipient_address: notification.recipient_address,
        channel: notification.channel,
      });
    }
  }, [notification, open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!notification) return;

    if (!form.recipient_address.trim()) {
      toast.error("Recipient address is required");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/notifications/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "edit",
          notification_log_id: notification.id,
          updates: {
            subject: form.subject || null,
            content: form.content || null,
            recipient_address: form.recipient_address,
            channel: form.channel,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.message || `Failed with status ${res.status}`
        );
      }

      toast.success("Notification updated and re-sent");
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      toast.error("Failed to update notification", {
        description: message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Update & Re-send Notification</DialogTitle>
          <DialogDescription>
            Edit the notification content and recipient before re-sending.
            {notification?.clients?.name && (
              <>
                {" "}
                Client:{" "}
                <span className="font-medium text-foreground">
                  {notification.clients.name}
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-channel">Channel</Label>
              <Select
                value={form.channel}
                onValueChange={(v) =>
                  setForm({ ...form, channel: v as "email" | "sms" })
                }
              >
                <SelectTrigger id="edit-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-recipient">Recipient address *</Label>
              <Input
                id="edit-recipient"
                value={form.recipient_address}
                onChange={(e) =>
                  setForm({ ...form, recipient_address: e.target.value })
                }
                placeholder={
                  form.channel === "email"
                    ? "email@example.com"
                    : "+44 7700 900000"
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="Notification subject"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-content">Content</Label>
              <Textarea
                id="edit-content"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Notification content..."
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update & Re-send
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
