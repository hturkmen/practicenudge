# Tasks: Notification Log Management

## Task 1: Database Schema and Types

### Description
Create the Supabase migration for new tables and update TypeScript types.

### Steps
- [ ] 1.1 Create Supabase migration file with `notification_types`, `notification_logs`, `client_notification_subscriptions`, and `notification_queue` tables including all constraints, indexes, and foreign keys
- [ ] 1.2 Add Row Level Security (RLS) policies for all new tables: firm-scoped access for firm users, full access for super admins, service role for queue operations
- [ ] 1.3 Seed `notification_types` table with initial types: document_reminder, deadline_alert, status_update, general_announcement
- [ ] 1.4 Update `src/lib/types/database.ts` with TypeScript types for NotificationType, NotificationLog, ClientNotificationSubscription, and NotificationQueue

## Task 2: Notification Service Layer

### Description
Create the core notification service that handles sending, logging, and queue management.

### Steps
- [ ] 2.1 Create `src/lib/notifications/types.ts` with interfaces for SendNotificationParams, NotificationLogEntry, SubscriptionRecord, and QueueItem
- [ ] 2.2 Create `src/lib/notifications/logger.ts` with functions: createNotificationLog, updateNotificationStatus, getNotificationLog
- [ ] 2.3 Create `src/lib/notifications/scheduler.ts` with functions: checkFrequencyAllowance, addToQueue, getNextDeliveryWindow, processQueueBatch
- [ ] 2.4 Create `src/lib/notifications/service.ts` with main sendNotification function that integrates logger, scheduler, and existing Resend email sending
- [ ] 2.5 Update existing `/api/cron/reminders/route.ts` to use the new notification service for logging (dual-write to both reminder_logs and notification_logs)

## Task 3: Notification Logs API

### Description
Create API routes for fetching and managing notification logs.

### Steps
- [ ] 3.1 Create `src/app/api/notifications/logs/route.ts` with GET handler: paginated listing with filters (client_id, notification_type_id, channel, status, date_from, date_to, firm_id for master admin, triggered_by for master admin)
- [ ] 3.2 Create `src/app/api/notifications/actions/route.ts` with POST handler supporting: retry (re-send with original params, create new log), delete (remove log record), stop (cancel queued notification), trigger (send new notification immediately), edit (modify and re-send)
- [ ] 3.3 Implement authorization checks in actions route: verify firm ownership for firm admins, verify super_admin status for master admin actions
- [ ] 3.4 Create `src/app/api/notifications/stats/route.ts` with GET handler returning aggregated counts by notification type and status

## Task 4: Subscription Management API

### Description
Create API routes for client notification subscription management.

### Steps
- [ ] 4.1 Create `src/app/api/notifications/subscriptions/route.ts` with GET handler (list subscriptions for a client) and POST handler (create new subscription with uniqueness enforcement)
- [ ] 4.2 Create `src/app/api/notifications/subscriptions/[id]/route.ts` with PATCH handler for updating frequency and is_active status
- [ ] 4.3 Add subscription validation: ensure notification_type is subscribable, frequency is valid, and client belongs to the requesting firm

## Task 5: Notification Queue Cron Job

### Description
Create the cron endpoint that processes the notification queue based on subscription frequencies.

### Steps
- [ ] 5.1 Create `src/app/api/cron/notifications/route.ts` with GET handler: fetch pending queue items where scheduled_for <= now(), group by client, send batched notifications, create individual notification_logs entries
- [ ] 5.2 Implement frequency window calculation: determine next delivery time based on subscription frequency (daily = next day 9am, weekly = next Monday 9am, monthly = 1st of next month 9am)
- [ ] 5.3 Update subscription `last_delivered_at` after successful batch delivery
- [ ] 5.4 Add error handling: mark failed queue items, log failures, continue processing remaining items

## Task 6: Firm Admin Notification Logs Page

### Description
Create the firm admin UI for viewing and managing notification logs.

### Steps
- [ ] 6.1 Create `src/app/(dashboard)/notifications/page.tsx` with main page layout including stats cards and log table
- [ ] 6.2 Create `src/app/(dashboard)/notifications/notification-log-filters.tsx` with filter components: client selector, notification type dropdown, channel toggle, status dropdown, date range picker
- [ ] 6.3 Create `src/app/(dashboard)/notifications/notification-log-table.tsx` with sortable data table showing: client name, type, channel, status, subject, sent_at, delivered_at
- [ ] 6.4 Create `src/app/(dashboard)/notifications/notification-action-menu.tsx` with dropdown actions: retry, delete, trigger, update (with confirmation dialogs)
- [ ] 6.5 Create `src/app/(dashboard)/notifications/notification-edit-dialog.tsx` with form for editing notification content and recipient before re-sending
- [ ] 6.6 Create `src/app/(dashboard)/notifications/notification-stats-cards.tsx` showing total, sent, delivered, failed, queued counts

## Task 7: Master Admin Notification Logs Page

### Description
Create the master admin UI for cross-firm notification log management.

### Steps
- [ ] 7.1 Create `src/app/(dashboard)/admin/notifications/page.tsx` with extended page including firm filter and user filter
- [ ] 7.2 Add firm selector and triggered-by user filter to the admin notification page
- [ ] 7.3 Add "stop" action to the action menu for queued/scheduled notifications
- [ ] 7.4 Add cross-firm statistics view with grouping by notification type

## Task 8: Client Subscription Management Page

### Description
Create the client-facing subscription management UI accessible via magic token.

### Steps
- [ ] 8.1 Create `src/app/upload/[token]/subscriptions/page.tsx` with subscription management layout
- [ ] 8.2 Create subscription card component showing each available notification type with toggle and frequency selector (daily/weekly/monthly)
- [ ] 8.3 Implement subscribe/unsubscribe/update-frequency actions calling the subscriptions API
- [ ] 8.4 Add visual feedback for subscription state changes (toast notifications, loading states)

## Task 9: Navigation and Integration

### Description
Integrate the new pages into the existing navigation and dashboard.

### Steps
- [ ] 9.1 Add "Notifications" link to the dashboard sidebar navigation
- [ ] 9.2 Add "Notifications" tab to the master admin page
- [ ] 9.3 Add notification log summary widget to the main dashboard page
- [ ] 9.4 Add "Manage Subscriptions" link to the client upload page
- [ ] 9.5 Update the existing manual reminder send (`/api/reminders/send`) to also write to notification_logs
