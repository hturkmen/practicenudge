# Design Document: Request Editing

## Overview

This feature introduces the ability to edit existing document requests in PracticeNudge and fixes the dashboard logo navigation to be context-aware. The edit functionality mirrors the existing "New Request" form but operates in update mode, pre-populating fields from the existing request and performing an update rather than an insert. The logo fix is a minimal change to the sidebar component's link target.

The design reuses existing patterns from the new request page (`/requests/new/page.tsx`) to maintain consistency in UI, validation, and data flow. The edit page will be a new route at `/requests/[id]/edit` that fetches the existing request data and renders a form identical in structure to the creation form.

## Architecture

The feature follows the existing client-side architecture pattern used throughout PracticeNudge:

```mermaid
graph TD
    A[Request Detail Page] -->|Edit button click| B[Edit Request Page]
    B -->|Fetch existing data| C[Supabase Client]
    C -->|document_requests + request_items| B
    B -->|Submit form| D[Update Logic]
    D -->|Update document_requests| C
    D -->|Upsert/Delete request_items| C
    D -->|Insert activity_logs| C
    D -->|Navigate on success| E[Request Detail Page]
    B -->|Cancel| E

    F[Sidebar Component] -->|Logo click| G{Context?}
    G -->|Dashboard| H[/dashboard]
    G -->|Marketing| I[/]
```

### Key Architectural Decisions

1. **Client-side data operations**: Consistent with the existing pattern, all Supabase operations happen client-side using `createClient()`. No server actions are introduced.
2. **Route structure**: The edit page lives at `/requests/[id]/edit/page.tsx` following Next.js App Router conventions and the existing `[id]` dynamic segment.
3. **Item reconciliation strategy**: On save, the system compares existing items with the edited list. Items are updated, inserted, or deleted as needed using individual Supabase operations rather than a bulk delete-and-reinsert approach. This preserves item IDs and any associated file uploads.
4. **No optimistic updates**: The form submits, waits for confirmation, then navigates — matching the existing creation flow.

## Components and Interfaces

### New Components

#### `EditRequestPage` (`src/app/(dashboard)/requests/[id]/edit/page.tsx`)

Client component that renders the edit form. Responsibilities:
- Fetch existing `document_requests` record with client join
- Fetch existing `request_items` for the request
- Fetch available clients list for the client selector
- Pre-populate form state from fetched data
- Handle form submission (update request, reconcile items, log activity)
- Handle cancellation (navigate back without changes)

**Props**: None (uses `useParams` for request ID)

**State**:
```typescript
{
  loading: boolean;          // Initial data fetch loading
  submitting: boolean;       // Form submission in progress
  title: string;
  deadline: string;
  selectedClientId: string;
  items: EditableItem[];     // Extended item type with tracking
  existingItems: RequestItem[]; // Original items for reconciliation
}
```

**EditableItem type**:
```typescript
type EditableItem = {
  id?: string;              // Existing item ID (undefined for new items)
  label: string;
  description: string;
  required: boolean;
  status?: string;          // Existing item status (for visual indicator)
  isNew?: boolean;          // Flag for newly added items
};
```

### Modified Components

#### `RequestDetailPage` (`src/app/(dashboard)/requests/[id]/page.tsx`)

Add an "Edit" button to the header actions area alongside existing Copy link, Preview, and Send Reminder buttons.

#### `Sidebar` (`src/components/layout/sidebar.tsx`)

Change the logo `<Link href="/">` to `<Link href="/dashboard">` since this component only renders in the dashboard context.

## Data Models

### Existing Tables Used (No Schema Changes Required)

**`document_requests`** — Updated fields on edit:
- `title` (TEXT)
- `deadline` (DATE, nullable)
- `client_id` (UUID FK)

**`request_items`** — Full CRUD during edit:
- `label` (TEXT)
- `description` (TEXT, nullable)
- `required` (BOOLEAN)
- `sort_order` (INTEGER)
- Items may be inserted, updated, or deleted

**`activity_logs`** — New entry on successful edit:
- `action`: `"request_updated"`
- `firm_id`: from firm_users lookup
- `client_id`: the request's client
- `request_id`: the edited request ID
- `details`: `{ title: string }` (JSONB)

### Item Reconciliation Logic

On form submission, the system performs a three-way reconciliation:

1. **Updated items**: Items with an existing `id` that are still present in the form → `UPDATE` their label, description, required, sort_order
2. **New items**: Items without an `id` (added during editing) → `INSERT` with the request_id
3. **Deleted items**: Existing items whose `id` is no longer in the form list → `DELETE`

This approach preserves file uploads on items that haven't been removed.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Edit form pre-population preserves data

*For any* existing Document_Request with associated Request_Items (with any combination of title, deadline, client_id, item labels, descriptions, required flags, and sort orders), loading the edit form SHALL produce form field values that exactly match the stored database values.

**Validates: Requirements 1.3, 3.1**

### Property 2: Valid edit submission persists all changes

*For any* valid edit form state (non-empty title, selected client, at least one item with a non-empty label), submitting the form SHALL result in the database containing exactly the submitted values for the request's title, deadline, and client_id, and the request_items set matching the submitted items list in content and order.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: Empty title rejection

*For any* string composed entirely of whitespace characters (including the empty string), submitting the edit form with that string as the title SHALL be rejected, and the database SHALL remain unchanged.

**Validates: Requirements 2.5**

### Property 4: Zero valid items rejection

*For any* array of checklist items where every item's label is composed entirely of whitespace characters, submitting the edit form SHALL be rejected, and the database SHALL remain unchanged.

**Validates: Requirements 3.6**

### Property 5: Item reconciliation correctness

*For any* set of existing items (with IDs) and a modified items list (mix of items with existing IDs, items with removed IDs, and new items without IDs), after a successful edit submission: (a) items present in both lists with matching IDs are updated to reflect new values, (b) items in the new list without IDs are inserted as new records, (c) items from the original list whose IDs are absent from the new list are deleted from the database, and (d) no other request_items records are affected.

**Validates: Requirements 3.2, 3.3, 3.4**

### Property 6: Cancellation preserves database state

*For any* edit session where the user makes arbitrary modifications to form fields and then cancels, the database state of the Document_Request and its Request_Items SHALL be identical to the state before the edit page was loaded.

**Validates: Requirements 4.1, 4.2**

### Property 7: Activity log creation on successful edit

*For any* successful edit submission, exactly one activity_log entry SHALL be created with action "request_updated", the correct request_id, and the correct firm_id.

**Validates: Requirements 5.1, 5.2**

## Error Handling

| Scenario | Handling |
|----------|----------|
| Request not found (invalid ID) | Display "Request not found" message with back button (same pattern as detail page) |
| Network error during fetch | Show error toast, allow retry |
| Validation failure (empty title) | Show toast error "Please enter a title", prevent submission |
| Validation failure (no client) | Show toast error "Please select a client", prevent submission |
| Validation failure (no items) | Show toast error "Add at least one checklist item", prevent submission |
| Database update failure | Show toast error with message, re-enable form for retry |
| Item deletion failure (FK constraint) | Should not occur due to CASCADE, but show generic error toast |
| Concurrent edit conflict | Not handled in v1 (last-write-wins, consistent with existing patterns) |
| Unauthorized access (RLS) | Supabase returns empty/error, show "Request not found" |

## Testing Strategy

### Unit Tests (Example-Based)

- Edit button renders on request detail page (validates 1.1)
- Edit button navigates to `/requests/{id}/edit` (validates 1.2)
- Form fields are editable: title, deadline, client (validates 2.1, 2.2, 2.3)
- Add item button adds a new empty item row (validates 3.3)
- Remove item button removes the item from the form (validates 3.4)
- Items with "uploaded"/"approved" status show visual indicator (validates 3.5)
- Cancel button navigates back without API calls (validates 4.1)
- Missing client shows validation error (validates 2.6)
- Sidebar logo links to `/dashboard` (validates 6.1, 6.3)
- Marketing site logo links to `/` (validates 6.2)

### Property-Based Tests

Property-based testing is applicable for the validation logic and item reconciliation logic. These are pure functions with clear input/output behavior where input variation reveals edge cases.

**Library**: fast-check (TypeScript property-based testing)

**Configuration**: Minimum 100 iterations per property test

**Properties to implement**:

| Property | Test Description | Tag |
|----------|-----------------|-----|
| 3 | Generate whitespace-only strings, verify title validation rejects all | `Feature: request-editing, Property 3: Empty title rejection` |
| 4 | Generate item arrays with all-whitespace labels, verify rejection | `Feature: request-editing, Property 4: Zero valid items rejection` |
| 5 | Generate random existing/new item sets, verify correct insert/update/delete classification | `Feature: request-editing, Property 5: Item reconciliation correctness` |

**Note**: Properties 1, 2, 6, and 7 involve database I/O and are better suited to integration tests with a few representative examples rather than 100+ iterations against Supabase.

### Integration Tests

- Full edit flow: load page → modify fields → submit → verify database state (validates Property 2)
- Pre-population: create request with known data, load edit page, verify form values (validates Property 1)
- Item reconciliation end-to-end: add new items, remove existing, modify others, submit, verify DB (validates Property 5)
- Cancellation: load edit, make changes, cancel, verify DB unchanged (validates Property 6)
- Activity log creation after successful edit (validates Property 7)
- RLS enforcement: user cannot edit another firm's request

### Manual Testing

- Visual indicator on items with uploads
- Form UX (focus, tab order, responsive layout)
- Navigation flow (edit button → edit page → save → detail page)
- Logo navigation in dashboard context
