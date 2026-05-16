# Implementation Plan: Notification Log Management

## Overview

This implementation plan covers the full notification logging and management system for PracticeNudge. It includes database schema creation, a core notification service layer (logger, scheduler, action handler, subscription manager), REST API routes, a cron-based queue processor, and role-based admin/client UI pages. The plan is structured to build foundational layers first (schema, types, service) before wiring up API routes and frontend components.

## Tasks

- [x] 1. Database Schema and Types
  - [x] 1.1 Create Supabase migration file with `notification_types`, `notification_logs`, `client_notification_subscriptions`, and `notification_queue` tables including all constraints, indexes, and foreign keys
    - _Requirements: 1.1, 5.2, 7.4_
  - [x] 1.2 Add Row Level Security (RLS) policies for all new tables: firm-scoped access for firm users, full access for super admins, service role for queue operations
    - _Requirements: 2.1, 3.5, 4.1_
  - [x] 1.3 Seed `notification_types` table with initial types: document_reminder, deadline_alert, status_update, general_announcement
    - _Requirements: 5.1, 6.1_
  - [x] 1.4 Update `src/lib/types/database.ts` with TypeScript types for NotificationType, NotificationLog, ClientNotificationSubscription, and NotificationQueue
    - _Requirements: 1.1_

- [x] 2. Notification Service Layer
  - [x] 2.1 Create `src/lib/notifications/types.ts` with interfaces for SendNotificationParams, NotificationLogEntry, SubscriptionRecord, and QueueItem
    - _Requirements: 1.1_
  - [x] 2.2 Create `src/lib/notifications/logger.ts` with functions: createNotificationLog, updateNotificationStatus, getNotificationLog
    - _Requirements: 1.1, 1.2, 1.3_
  - [x] 2.3 Create `src/lib/notifications/scheduler.ts` with functions: checkFrequencyAllowance, addToQueue, getNextDeliveryWindow, processQueueBatch
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  - [x] 2.4 Create `src/lib/notifications/service.ts` with main sendNotification function that integrates logger, scheduler, and existing Resend email sending
    - _Requirements: 1.1, 7.4, 7.5_
  - [x] 2.5 Update existing `/api/cron/reminders/route.ts` to use the new notification service for logging (dual-write to both reminder_logs and notification_logs)
    - _Requirements: 1.1_
  - [ ]* 2.6 Write property test for firm isolation
    - **Property 1: Firm Isolation**
    - **Validates: Requirements 2.1, 3.5**
  - [ ]* 2.7 Write property test for log completeness
    - **Property 2: Log Completeness**
    - **Validates: Requirements 1.1**
  - [ ]* 2.8 Write property test for subscription uniqueness
    - **Property 5: Subscription Uniqueness**
    - **Validates: Requirements 5.2, 5.5**
  - [ ]* 2.9 Write property test for frequency enforcement
    - **Property 6: Frequency Enforcement**
    - **Validates: Requirements 7.4**

- [x] 3. Checkpoint - Ensure service layer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Notification Logs API
  - [x] 4.1 Create `src/app/api/notifications/logs/route.ts` with GET handler: paginated listing with filters (client_id, notification_type_id, channel, status, date_from, date_to, firm_id for master admin, triggered_by for master admin)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2_
  - [x] 4.2 Create `src/app/api/notifications/actions/route.ts` with POST handler supporting: retry (re-send with original params, create new log), delete (remove log record), stop (cancel queued notification), trigger (send new notification immediately), edit (modify and re-send)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.3, 4.4, 4.5, 4.6_
  - [x] 4.3 Implement authorization checks in actions route: verify firm ownership for firm admins, verify super_admin status for master admin actions
    - _Requirements: 3.5, 4.1_
  - [x] 4.4 Create `src/app/api/notifications/stats/route.ts` with GET handler returning aggregated counts by notification type and status
    - _Requirements: 6.3, 6.4_
  - [ ]* 4.5 Write property test for filter correctness
    - **Property 3: Filter Correctness**
    - **Validates: Requirements 2.2, 6.2**
  - [ ]* 4.6 Write property test for chronological ordering
    - **Property 4: Chronological Ordering**
    - **Validates: Requirements 2.3**
  - [ ]* 4.7 Write property test for statistics consistency
    - **Property 8: Statistics Consistency**
    - **Validates: Requirements 6.3**
  - [ ]* 4.8 Write property test for authorization enforcement
    - **Property 9: Authorization Enforcement**
    - **Validates: Requirements 3.5, 4.1**
  - [ ]* 4.9 Write property test for retry creates new log
    - **Property 10: Retry Creates New Log**
    - **Validates: Requirements 3.1, 4.5**

- [x] 5. Subscription Management API
  - [x] 5.1 Create `src/app/api/notifications/subscriptions/route.ts` with GET handler (list subscriptions for a client) and POST handler (create new subscription with uniqueness enforcement)
    - _Requirements: 5.1, 5.2_
  - [x] 5.2 Create `src/app/api/notifications/subscriptions/[id]/route.ts` with PATCH handler for updating frequency and is_active status
    - _Requirements: 5.3, 5.5_
  - [x] 5.3 Add subscription validation: ensure notification_type is subscribable, frequency is valid, and client belongs to the requesting firm
    - _Requirements: 5.1, 5.2_

- [x] 6. Notification Queue Cron Job
  - [x] 6.1 Create `src/app/api/cron/notifications/route.ts` with GET handler: fetch pending queue items where scheduled_for <= now(), group by client, send batched notifications, create individual notification_logs entries
    - _Requirements: 7.1, 7.2, 7.3, 7.5_
  - [x] 6.2 Implement frequency window calculation: determine next delivery time based on subscription frequency (daily = next day 9am, weekly = next Monday 9am, monthly = 1st of next month 9am)
    - _Requirements: 7.1, 7.2, 7.3_
  - [x] 6.3 Update subscription `last_delivered_at` after successful batch delivery
    - _Requirements: 7.4_
  - [x] 6.4 Add error handling: mark failed queue items, log failures, continue processing remaining items
    - _Requirements: 1.2_
  - [ ]* 6.5 Write property test for batch log integrity
    - **Property 7: Batch Log Integrity**
    - **Validates: Requirements 7.5**

- [x] 7. Checkpoint - Ensure API and cron tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Firm Admin Notification Logs Page
  - [x] 8.1 Create `src/app/(dashboard)/notifications/page.tsx` with main page layout including stats cards and log table
    - _Requirements: 2.1, 2.3, 2.4_
  - [x] 8.2 Create `src/app/(dashboard)/notifications/notification-log-filters.tsx` with filter components: client selector, notification type dropdown, channel toggle, status dropdown, date range picker
    - _Requirements: 2.2_
  - [x] 8.3 Create `src/app/(dashboard)/notifications/notification-log-table.tsx` with sortable data table showing: client name, type, channel, status, subject, sent_at, delivered_at
    - _Requirements: 2.3, 2.4_
  - [x] 8.4 Create `src/app/(dashboard)/notifications/notification-action-menu.tsx` with dropdown actions: retry, delete, trigger, update (with confirmation dialogs)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 8.5 Create `src/app/(dashboard)/notifications/notification-edit-dialog.tsx` with form for editing notification content and recipient before re-sending
    - _Requirements: 3.4_
  - [x] 8.6 Create `src/app/(dashboard)/notifications/notification-stats-cards.tsx` showing total, sent, delivered, failed, queued counts
    - _Requirements: 6.3_

- [x] 9. Master Admin Notification Logs Page
  - [x] 9.1 Create `src/app/(dashboard)/admin/notifications/page.tsx` with extended page including firm filter and user filter
    - _Requirements: 4.1, 4.2_
  - [x] 9.2 Add firm selector and triggered-by user filter to the admin notification page
    - _Requirements: 4.2_
  - [x] 9.3 Add "stop" action to the action menu for queued/scheduled notifications
    - _Requirements: 4.3_
  - [x] 9.4 Add cross-firm statistics view with grouping by notification type
    - _Requirements: 6.4_

- [x] 10. Client Subscription Management Page
  - [x] 10.1 Create `src/app/upload/[token]/subscriptions/page.tsx` with subscription management layout
    - _Requirements: 5.1_
  - [x] 10.2 Create subscription card component showing each available notification type with toggle and frequency selector (daily/weekly/monthly)
    - _Requirements: 5.1, 5.2, 5.5_
  - [x] 10.3 Implement subscribe/unsubscribe/update-frequency actions calling the subscriptions API
    - _Requirements: 5.2, 5.3, 5.5_
  - [x] 10.4 Add visual feedback for subscription state changes (toast notifications, loading states)
    - _Requirements: 5.2_

- [x] 11. Navigation and Integration
  - [x] 11.1 Add "Notifications" link to the dashboard sidebar navigation
    - _Requirements: 2.1_
  - [x] 11.2 Add "Notifications" tab to the master admin page
    - _Requirements: 4.1_
  - [x] 11.3 Add notification log summary widget to the main dashboard page
    - _Requirements: 6.3_
  - [x] 11.4 Add "Manage Subscriptions" link to the client upload page
    - _Requirements: 5.1_
  - [x] 11.5 Update the existing manual reminder send (`/api/reminders/send`) to also write to notification_logs
    - _Requirements: 1.1_

- [x] 12. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional property-based test sub-tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key integration points
- Property tests validate universal correctness properties defined in the design document
- The implementation builds foundational layers (schema → service → API → UI) to avoid orphaned code
- Existing `reminder_logs` table is preserved; dual-write ensures backward compatibility during migration

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4"] },
    { "id": 2, "tasks": ["2.1"] },
    { "id": 3, "tasks": ["2.2", "2.3"] },
    { "id": 4, "tasks": ["2.4", "2.5"] },
    { "id": 5, "tasks": ["2.6", "2.7", "2.8", "2.9"] },
    { "id": 6, "tasks": ["4.1", "5.1"] },
    { "id": 7, "tasks": ["4.2", "4.3", "5.2", "5.3"] },
    { "id": 8, "tasks": ["4.4", "4.5", "4.6", "4.7", "4.8", "4.9"] },
    { "id": 9, "tasks": ["6.1", "6.2"] },
    { "id": 10, "tasks": ["6.3", "6.4", "6.5"] },
    { "id": 11, "tasks": ["8.1", "9.1", "10.1"] },
    { "id": 12, "tasks": ["8.2", "8.3", "8.4", "9.2", "9.3", "10.2"] },
    { "id": 13, "tasks": ["8.5", "8.6", "9.4", "10.3", "10.4"] },
    { "id": 14, "tasks": ["11.1", "11.2", "11.3", "11.4", "11.5"] }
  ]
}
```
