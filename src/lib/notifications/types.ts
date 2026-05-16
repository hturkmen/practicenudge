import type {
  NotificationStatus,
  NotificationChannel,
  NotificationFrequency,
  QueueStatus,
  NotificationLog,
  ClientNotificationSubscription,
  NotificationQueueItem,
  NotificationType,
} from "@/lib/types/database";

// Re-export database types for convenience
export type {
  NotificationStatus,
  NotificationChannel,
  NotificationFrequency,
  QueueStatus,
  NotificationLog,
  ClientNotificationSubscription,
  NotificationQueueItem,
  NotificationType,
};

// Parameters for sending a notification
export interface SendNotificationParams {
  firm_id: string;
  client_id: string;
  notification_type_id: string;
  channel: NotificationChannel;
  recipient_address: string;
  subject?: string;
  content?: string;
  triggered_by?: string;
  metadata?: Record<string, unknown>;
}

// Parameters for creating a log entry
export interface CreateLogParams {
  firm_id: string;
  client_id: string;
  notification_type_id: string;
  channel: NotificationChannel;
  recipient_address: string;
  subject?: string;
  content_preview?: string;
  full_content?: string;
  triggered_by?: string;
  status: NotificationStatus;
  metadata?: Record<string, unknown>;
  scheduled_at?: string;
}

// Parameters for triggering a notification
export interface TriggerParams {
  client_id: string;
  notification_type_id: string;
  channel: NotificationChannel;
  recipient_address?: string;
}

// Parameters for editing a notification before re-send
export interface EditUpdates {
  content?: string;
  recipient_address?: string;
  channel?: NotificationChannel;
  subject?: string;
}

// Parameters for enqueueing a notification
export interface EnqueueParams {
  notification_log_id?: string;
  client_id: string;
  firm_id: string;
  notification_type_id: string;
  scheduled_for: string;
}

// Result of processing a batch
export interface ProcessResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ queue_item_id: string; error: string }>;
}
