# Design Document: Notification Log Management

## Overview

This design describes the technical implementation of the notification logging and management system for PracticeNudge. The system extends the existing `reminder_logs` infrastructure with a comprehensive `notification_logs` table, subscription management, frequency-based scheduling, and role-based admin interfaces.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                         │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ Firm Admin   │ Master Admin │ Client       │ Notification       │
│ Logs Page    │ Logs Page    │ Subscription │ Stats Dashboard    │
│              │              │ Page         │                    │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────────┘
       │              │              │                │
┌──────▼──────────────▼──────────────▼────────────────▼───────────┐
│                     API Routes (Next.js)                          │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ /api/        │ /api/        │ /api/        │ /api/              │
│ notifications│ notifications│ notifications│ notifications/     │
│ /logs        │ /actions     │ /subscribe   │ stats              │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────────┘
       │              │              │                │
┌──────▼──────────────▼──────────────▼────────────────▼───────────┐
│                   Notification Service Layer                      │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│ Logger       │ Action       │ Subscription │ Scheduler          │
│ Module       │ Handler      │ Manager      │ (Cron)             │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────────┘
       │              │              │                │
┌──────▼──────────────▼──────────────▼────────────────▼───────────┐
│                     Supabase (PostgreSQL)                         │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│notification_ │notification_ │client_       │notification_       │
│logs          │types         │subscriptions │queue               │
└──────────────┴──────────────┴──────────────┴────────────────────┘
```

### Data Flow

1. **Notification Sent** → Logger creates `notification_logs` entry with status "sent"
2. **Delivery Callback** → Logger updates status to "delivered" or "failed"
3. **Admin Views Logs** → API fetches logs scoped by firm (or all for master admin)
4. **Admin Action** → Action Handler processes retry/delete/stop/edit/trigger
5. **Client Subscribes** → Subscription Manager creates/updates subscription record
6. **Cron Runs** → Scheduler checks subscriptions, batches notifications by frequency, sends and logs

## Components and Interfaces

### Notification Service Layer

The core service layer is composed of four modules:

#### Logger Module (`src/lib/notifications/logger.ts`)

Responsible for creating and updating notification log records.

```typescript
interface NotificationLogger {
  createLog(params: CreateLogParams): Promise<NotificationLog>;
  updateStatus(logId: string, status: NotificationStatus, metadata?: Record<string, unknown>): Promise<void>;
  markDelivered(logId: string): Promise<void>;
  markFailed(logId: string, reason: string): Promise<void>;
}
```

#### Action Handler (`src/lib/notifications/service.ts`)

Processes admin actions on notification logs.

```typescript
interface NotificationActionHandler {
  retry(logId: string, userId: string): Promise<NotificationLog>;
  delete(logId: string, userId: string): Promise<void>;
  stop(logId: string, userId: string): Promise<void>;
  trigger(params: TriggerParams, userId: string): Promise<NotificationLog>;
  edit(logId: string, updates: EditUpdates, userId: string): Promise<NotificationLog>;
}
```

#### Subscription Manager (`src/lib/notifications/service.ts`)

Manages client notification subscriptions.

```typescript
interface SubscriptionManager {
  subscribe(clientId: string, typeId: string, frequency: NotificationFrequency): Promise<Subscription>;
  unsubscribe(subscriptionId: string): Promise<void>;
  updateFrequency(subscriptionId: string, frequency: NotificationFrequency): Promise<Subscription>;
  getSubscriptions(clientId: string): Promise<Subscription[]>;
  getAvailableTypes(): Promise<NotificationType[]>;
}
```

#### Scheduler (`src/lib/notifications/scheduler.ts`)

Handles frequency-based batching and queue processing.

```typescript
interface NotificationScheduler {
  shouldSendNow(clientId: string, typeId: string): Promise<boolean>;
  enqueue(params: EnqueueParams): Promise<QueueItem>;
  processBatch(): Promise<ProcessResult>;
  getNextDeliveryWindow(frequency: NotificationFrequency, lastDelivered: Date | null): Date;
}
```

### API Routes

#### GET /api/notifications/logs

Query parameters:
- `client_id` (optional): Filter by client
- `notification_type_id` (optional): Filter by type
- `channel` (optional): Filter by channel
- `status` (optional): Filter by status
- `date_from` (optional): Start date
- `date_to` (optional): End date
- `firm_id` (optional, master admin only): Filter by firm
- `triggered_by` (optional, master admin only): Filter by triggering user
- `page` (optional): Pagination page number
- `page_size` (optional): Items per page (default 25)

Response: Paginated list of notification logs with client and type details.

#### POST /api/notifications/actions

Body:
```json
{
  "action": "retry" | "delete" | "stop" | "trigger" | "edit",
  "notification_log_id": "uuid",
  "updates": {
    "content": "string (for edit)",
    "recipient_address": "string (for edit)",
    "channel": "string (for edit)"
  },
  "trigger_params": {
    "client_id": "uuid",
    "notification_type_id": "uuid",
    "channel": "email | sms"
  }
}
```

#### GET /api/notifications/subscriptions

Query parameters:
- `client_id` (required): Client to fetch subscriptions for

Response: List of subscriptions with notification type details.

#### POST /api/notifications/subscriptions

Body:
```json
{
  "client_id": "uuid",
  "notification_type_id": "uuid",
  "frequency": "daily" | "weekly" | "monthly"
}
```

#### PATCH /api/notifications/subscriptions/[id]

Body:
```json
{
  "frequency": "daily" | "weekly" | "monthly",
  "is_active": true | false
}
```

#### GET /api/notifications/stats

Query parameters:
- `notification_type_id` (optional): Filter by type
- `firm_id` (optional, master admin only): Filter by firm
- `date_from` (optional): Start date
- `date_to` (optional): End date

Response:
```json
{
  "by_type": [
    {
      "notification_type_id": "uuid",
      "type_name": "string",
      "total": 100,
      "sent": 45,
      "delivered": 40,
      "failed": 10,
      "queued": 5,
      "stopped": 0
    }
  ],
  "totals": { "total": 100, "sent": 45, "delivered": 40, "failed": 10, "queued": 5, "stopped": 0 }
}
```

#### GET /api/cron/notifications

Cron endpoint for processing notification queue:
1. Fetch all pending queue items where `scheduled_for <= now()`
2. Group by client + frequency
3. Send batched notifications
4. Create individual `notification_logs` entries
5. Update `last_delivered_at` on subscriptions

### Frontend Components

#### Firm Admin: Notification Logs Page

**Path:** `/notifications`

Components:
- `NotificationLogsPage` — Main page with filters and table
- `NotificationLogFilters` — Filter bar (client, type, channel, status, date range)
- `NotificationLogTable` — Data table with sortable columns
- `NotificationActionMenu` — Dropdown with retry/delete/trigger/update actions
- `NotificationEditDialog` — Dialog for editing notification before re-send
- `NotificationStatsCards` — Summary cards showing counts by status

#### Master Admin: Notification Logs Page

**Path:** `/admin/notifications`

Components:
- `AdminNotificationLogsPage` — Extended page with firm filter
- `AdminNotificationFilters` — Includes firm and user filters
- Uses same table/action components as firm admin with additional "stop" and "edit" actions

#### Client: Subscription Management

**Path:** `/upload/[token]/subscriptions` (accessible via magic token)

Components:
- `SubscriptionManagementPage` — List of available notification types
- `SubscriptionCard` — Toggle subscription on/off with frequency selector
- `FrequencySelector` — Daily/Weekly/Monthly radio group

## Data Models

### Table: `notification_types`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | Unique identifier |
| name | text | NOT NULL, UNIQUE | Machine-readable name (e.g., "document_reminder") |
| display_name | text | NOT NULL | Human-readable name |
| description | text | | Description of the notification type |
| category | text | NOT NULL | Category grouping (e.g., "reminders", "alerts", "updates") |
| is_subscribable | boolean | NOT NULL, default true | Whether clients can subscribe |
| created_at | timestamptz | NOT NULL, default now() | Creation timestamp |

### Table: `notification_logs`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | Unique identifier |
| firm_id | uuid | FK → firms.id, NOT NULL | Owning firm |
| client_id | uuid | FK → clients.id, NOT NULL | Recipient client |
| notification_type_id | uuid | FK → notification_types.id, NOT NULL | Type of notification |
| triggered_by | uuid | FK → auth.users.id | User who triggered (null for automated) |
| channel | text | NOT NULL, CHECK (channel IN ('email', 'sms')) | Delivery channel |
| recipient_address | text | NOT NULL | Email address or phone number |
| subject | text | | Notification subject line |
| content_preview | text | | First 200 chars of content |
| full_content | text | | Full notification content |
| status | text | NOT NULL, CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'stopped')) | Current status |
| failure_reason | text | | Reason for failure (if failed) |
| metadata | jsonb | default '{}' | Additional metadata (request_id, template_id, etc.) |
| scheduled_at | timestamptz | | When notification is scheduled for delivery |
| sent_at | timestamptz | | When notification was actually sent |
| delivered_at | timestamptz | | When delivery was confirmed |
| created_at | timestamptz | NOT NULL, default now() | Record creation time |

### Table: `client_notification_subscriptions`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | Unique identifier |
| client_id | uuid | FK → clients.id, NOT NULL | Subscribing client |
| firm_id | uuid | FK → firms.id, NOT NULL | Firm context |
| notification_type_id | uuid | FK → notification_types.id, NOT NULL | Subscribed type |
| frequency | text | NOT NULL, CHECK (frequency IN ('daily', 'weekly', 'monthly')) | Delivery frequency |
| is_active | boolean | NOT NULL, default true | Whether subscription is active |
| last_delivered_at | timestamptz | | Last delivery timestamp for frequency tracking |
| created_at | timestamptz | NOT NULL, default now() | Subscription creation time |
| updated_at | timestamptz | NOT NULL, default now() | Last update time |

**Unique constraint:** (client_id, firm_id, notification_type_id)

### Table: `notification_queue`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | uuid | PK, default gen_random_uuid() | Unique identifier |
| notification_log_id | uuid | FK → notification_logs.id | Associated log entry |
| client_id | uuid | FK → clients.id, NOT NULL | Target client |
| firm_id | uuid | FK → firms.id, NOT NULL | Owning firm |
| notification_type_id | uuid | FK → notification_types.id, NOT NULL | Type |
| scheduled_for | timestamptz | NOT NULL | When to deliver |
| status | text | NOT NULL, CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')) | Queue status |
| created_at | timestamptz | NOT NULL, default now() | Creation time |

### Row Level Security (RLS) Policies

- **notification_logs**: Firm users can SELECT/DELETE only rows where `firm_id` matches their firm. Super admins can SELECT/UPDATE/DELETE all rows.
- **client_notification_subscriptions**: Firm users can manage subscriptions for their firm's clients. Clients can manage their own subscriptions via magic token.
- **notification_queue**: Firm users can view queue items for their firm. Only service role can INSERT/UPDATE.

### TypeScript Types

```typescript
type NotificationStatus = 'queued' | 'sent' | 'delivered' | 'failed' | 'stopped';
type NotificationChannel = 'email' | 'sms';
type NotificationFrequency = 'daily' | 'weekly' | 'monthly';
type QueueStatus = 'pending' | 'processing' | 'completed' | 'cancelled';

interface NotificationLog {
  id: string;
  firm_id: string;
  client_id: string;
  notification_type_id: string;
  triggered_by: string | null;
  channel: NotificationChannel;
  recipient_address: string;
  subject: string | null;
  content_preview: string | null;
  full_content: string | null;
  status: NotificationStatus;
  failure_reason: string | null;
  metadata: Record<string, unknown>;
  scheduled_at: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  client_id: string;
  firm_id: string;
  notification_type_id: string;
  frequency: NotificationFrequency;
  is_active: boolean;
  last_delivered_at: string | null;
  created_at: string;
  updated_at: string;
}

interface NotificationType {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  category: string;
  is_subscribable: boolean;
  created_at: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Firm Isolation

*For any* notification log returned to a Firm_Admin, the log's `firm_id` must equal the requesting user's firm_id. No cross-firm data leakage is permitted.

**Validates: Requirements 2.1, 3.5**

### Property 2: Log Completeness

*For any* notification sent through the Notification_Service, exactly one corresponding `notification_logs` entry must exist with matching `client_id`, `channel`, `notification_type_id`, and `recipient_address`.

**Validates: Requirements 1.1**

### Property 3: Filter Correctness

*For any* filter applied to notification logs, every returned log must satisfy all active filter predicates. Applying a filter must return a subset (≤) of the unfiltered result set.

**Validates: Requirements 2.2, 6.2**

### Property 4: Chronological Ordering

*For any* default log listing, the results must be sorted such that for any two adjacent logs at positions i and i+1, `logs[i].created_at >= logs[i+1].created_at`.

**Validates: Requirements 2.3**

### Property 5: Subscription Uniqueness

*For any* (client_id, firm_id, notification_type_id) tuple, at most one active subscription record may exist. Creating a duplicate subscription must update the existing record rather than creating a new one.

**Validates: Requirements 5.2, 5.5**

### Property 6: Frequency Enforcement

*For any* client that has received a notification for a subscription within the current frequency window (day/week/month), any additional notification of the same type must be queued rather than sent immediately.

**Validates: Requirements 7.4**

### Property 7: Batch Log Integrity

*For any* scheduled batch of N notifications that is processed, exactly N new `notification_logs` entries must be created, one per notification in the batch.

**Validates: Requirements 7.5**

### Property 8: Statistics Consistency

*For any* notification type, the sum of (sent + delivered + failed + queued + stopped) counts must equal the total count of logs for that type.

**Validates: Requirements 6.3**

### Property 9: Authorization Enforcement

*For any* Firm_Admin performing any action (retry, delete, trigger, update) on a notification_log where `firm_id != user's firm_id`, the system must return an authorization error. A Master_Admin must be able to perform actions on any notification_log regardless of firm_id.

**Validates: Requirements 3.5, 4.1**

### Property 10: Retry Creates New Log

*For any* retry action performed on a notification_log, a new notification_log entry must be created (the original log is not modified). The new log must reference the same client, type, and channel as the original.

**Validates: Requirements 3.1, 4.5**

## Error Handling

### API Error Responses

All API endpoints return consistent error responses:

```typescript
interface ApiError {
  error: string;       // Machine-readable error code
  message: string;     // Human-readable description
  status: number;      // HTTP status code
}
```

### Error Categories

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| `UNAUTHORIZED` | 401 | User is not authenticated |
| `FORBIDDEN` | 403 | User lacks permission (e.g., firm admin accessing another firm's logs) |
| `NOT_FOUND` | 404 | Notification log or subscription not found |
| `VALIDATION_ERROR` | 400 | Invalid request parameters (missing fields, invalid channel/frequency) |
| `CONFLICT` | 409 | Duplicate subscription for same client/type/firm |
| `ACTION_NOT_ALLOWED` | 422 | Action cannot be performed on current status (e.g., retry on "delivered") |
| `DELIVERY_FAILED` | 502 | Upstream email/SMS provider returned an error |
| `RATE_LIMITED` | 429 | Too many notification actions in a short period |

### Error Handling Strategies

1. **Authentication Errors**: Redirect to login page. API returns 401.
2. **Authorization Errors**: Display "Access Denied" message. Log the attempt for audit.
3. **Validation Errors**: Return field-level error messages for form display.
4. **Delivery Failures**: Mark notification as "failed" with reason, allow retry. Do not throw to the user.
5. **Database Errors**: Return generic 500 error to client. Log full error server-side with request context.
6. **Cron Job Failures**: Log error, skip failed item, continue processing remaining queue items. Alert admin if failure rate exceeds threshold.
7. **Subscription Conflicts**: Upsert behavior — update existing subscription frequency instead of failing.

### Retry Logic

- Failed notification deliveries are eligible for manual retry by admins.
- The cron scheduler retries queue items up to 3 times with exponential backoff (1min, 5min, 30min).
- After 3 failed attempts, the queue item is marked as "completed" with a failed notification_log entry.

## Testing Strategy

### Unit Tests

Unit tests cover individual service functions and business logic:

- **Logger Module**: Verify log creation with correct fields, status transitions (queued → sent → delivered/failed)
- **Action Handler**: Verify retry creates new log, delete removes record, stop updates status, edit modifies content
- **Subscription Manager**: Verify subscribe/unsubscribe/update operations, uniqueness constraint handling
- **Scheduler**: Verify frequency window calculations, batch grouping logic, queue processing
- **Authorization**: Verify firm isolation checks, role-based access control

### Property-Based Tests

Property-based tests validate universal correctness properties using `fast-check`:

- Minimum 100 iterations per property test
- Each test references its design document property
- Tag format: **Feature: notification-log-management, Property {number}: {property_text}**

Properties to test:
- Firm isolation (Property 1): Generate random logs and users, verify no cross-firm access
- Filter correctness (Property 3): Generate random filter combinations, verify subset relationship
- Chronological ordering (Property 4): Generate random log sets, verify sort invariant
- Subscription uniqueness (Property 5): Generate random subscription attempts, verify at-most-one active
- Frequency enforcement (Property 6): Generate random delivery histories, verify queueing behavior
- Statistics consistency (Property 8): Generate random log distributions, verify sum invariant
- Authorization enforcement (Property 9): Generate random user/log combinations, verify access control
- Retry creates new log (Property 10): Generate random retry scenarios, verify new entry creation

### Integration Tests

Integration tests verify end-to-end flows against Supabase:

- Full notification send → log → delivery callback flow
- Admin log viewing with RLS enforcement
- Subscription creation and frequency-based delivery
- Cron job batch processing
- Cross-firm access denial via RLS policies

### Test File Structure

```
src/
├── lib/
│   └── notifications/
│       └── __tests__/
│           ├── logger.test.ts          # Unit tests for logger
│           ├── service.test.ts         # Unit tests for action handler
│           ├── scheduler.test.ts       # Unit tests for scheduler
│           ├── subscriptions.test.ts   # Unit tests for subscription manager
│           └── properties.test.ts      # Property-based tests
├── app/
│   └── api/
│       └── notifications/
│           └── __tests__/
│               ├── logs.test.ts        # API route integration tests
│               ├── actions.test.ts     # Action endpoint tests
│               └── subscriptions.test.ts # Subscription endpoint tests
```

## Integration with Existing System

### Migration from `reminder_logs`

The existing `reminder_logs` table will be preserved for backward compatibility. New notifications will write to both `reminder_logs` (for existing features) and `notification_logs` (for the new system). A migration script will backfill `notification_logs` from existing `reminder_logs` data.

### Notification Service Wrapper

A new `src/lib/notifications/service.ts` module will wrap the existing email sending logic:

```typescript
// Pseudocode
async function sendNotification(params: SendNotificationParams): Promise<NotificationLog> {
  // 1. Create notification_log with status "queued"
  // 2. Check subscription/frequency constraints
  // 3. If within frequency → send immediately, update status to "sent"
  // 4. If exceeds frequency → add to notification_queue
  // 5. On delivery confirmation → update status to "delivered"
  // 6. On failure → update status to "failed" with reason
  return notificationLog;
}
```

### Updated Cron Job

The existing `/api/cron/reminders` will be updated to use the notification service, ensuring all reminders are logged in the new `notification_logs` table.

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── notifications/
│   │   │   ├── page.tsx                    # Firm admin notification logs
│   │   │   └── notification-log-filters.tsx
│   │   │   └── notification-log-table.tsx
│   │   │   └── notification-action-menu.tsx
│   │   │   └── notification-edit-dialog.tsx
│   │   │   └── notification-stats-cards.tsx
│   │   └── admin/
│   │       └── notifications/
│   │           └── page.tsx                # Master admin notification logs
│   ├── api/
│   │   └── notifications/
│   │       ├── logs/
│   │       │   └── route.ts               # GET notification logs
│   │       ├── actions/
│   │       │   └── route.ts               # POST notification actions
│   │       ├── subscriptions/
│   │       │   ├── route.ts               # GET/POST subscriptions
│   │       │   └── [id]/
│   │       │       └── route.ts           # PATCH subscription
│   │       └── stats/
│   │           └── route.ts               # GET notification stats
│   └── upload/
│       └── [token]/
│           └── subscriptions/
│               └── page.tsx               # Client subscription management
├── lib/
│   ├── notifications/
│   │   ├── service.ts                     # Core notification service
│   │   ├── logger.ts                      # Notification logging utilities
│   │   ├── scheduler.ts                   # Frequency/queue management
│   │   └── types.ts                       # TypeScript types
│   └── types/
│       └── database.ts                    # Updated with new types
```
