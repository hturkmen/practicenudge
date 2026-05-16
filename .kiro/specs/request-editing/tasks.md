# Implementation Plan: Request Editing

## Overview

This implementation adds the ability to edit existing document requests and fixes the dashboard logo navigation. The edit page mirrors the existing "New Request" form but operates in update mode, pre-populating fields from the existing request and performing updates (including item reconciliation) rather than inserts. The logo fix is a one-line change to the sidebar component.

## Tasks

- [x] 1. Fix dashboard logo navigation and add Edit button to request detail page
  - [x] 1.1 Update sidebar logo link to navigate to /dashboard
    - In `src/components/layout/sidebar.tsx`, change the logo `<Link href="/">` to `<Link href="/dashboard">`
    - This component only renders in the dashboard context, so it always points to /dashboard
    - _Requirements: 6.1, 6.3_

  - [x] 1.2 Add Edit button to request detail page header
    - In `src/app/(dashboard)/requests/[id]/page.tsx`, add an "Edit" button in the header actions `<div className="flex gap-2">` area
    - The button should use `<Link href={/requests/${requestId}/edit}>` wrapping a `<Button variant="outline" size="sm">` with a Pencil icon
    - Import `Pencil` from lucide-react
    - _Requirements: 1.1, 1.2_

- [x] 2. Implement the Edit Request page
  - [x] 2.1 Create the edit page route and data fetching
    - Create `src/app/(dashboard)/requests/[id]/edit/page.tsx` as a client component
    - Use `useParams()` to get the request ID
    - Fetch the existing `document_requests` record (with client join), `request_items` ordered by sort_order, and available clients list
    - Show a loading spinner during fetch, and "Request not found" with back button if request doesn't exist
    - Store fetched items in both `items` (editable) and `existingItems` (original snapshot for reconciliation) state
    - _Requirements: 1.3, 3.1_

  - [x] 2.2 Implement the edit form UI with pre-populated fields
    - Render a form matching the structure of the new request page (`/requests/new/page.tsx`)
    - Pre-populate title, deadline, selectedClientId from the fetched request
    - Pre-populate items array from fetched request_items (map to EditableItem type with id, label, description, required, status)
    - Include client selector (Select), title input, deadline input, and checklist items section
    - Items with status "uploaded" or "approved" should show a visual Badge indicator (e.g., "Has submissions")
    - _Requirements: 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 3.5_

  - [x] 2.3 Implement add/remove/modify checklist item interactions
    - Add "Add item" button that appends a new empty EditableItem (isNew: true, no id)
    - Add remove button per item that removes it from the items array
    - Allow editing label, description, and required checkbox for each item
    - _Requirements: 3.2, 3.3, 3.4_

  - [x] 2.4 Implement form validation logic
    - Validate title is not empty/whitespace-only — show toast "Please enter a title"
    - Validate a client is selected — show toast "Please select a client"
    - Validate at least one item has a non-empty label — show toast "Add at least one checklist item"
    - Prevent form submission when validation fails
    - _Requirements: 2.5, 2.6, 3.6_

  - [x] 2.5 Implement form submission with item reconciliation
    - On valid submission, update `document_requests` record (title, deadline, client_id)
    - Perform item reconciliation: compare current items list against existingItems
      - Items with existing `id` still in list → UPDATE label, description, required, sort_order
      - Items without `id` (new) → INSERT with request_id
      - Items from existingItems whose id is absent from current list → DELETE
    - Insert activity_logs entry with action "request_updated", firm_id, client_id, request_id, details: { title }
    - On success, show toast and navigate to `/requests/{id}`
    - On error, show error toast and re-enable form
    - _Requirements: 2.4, 3.2, 3.3, 3.4, 5.1, 5.2_

  - [x] 2.6 Implement cancel button
    - Add a "Cancel" button that navigates back to `/requests/{id}` without making any API calls
    - Use `<Link href={/requests/${requestId}}>` wrapping a Button with variant="outline"
    - _Requirements: 4.1, 4.2_

- [x] 3. Checkpoint - Ensure all components render and basic flow works
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement validation and reconciliation utilities
  - [x] 4.1 Extract validation functions as testable utilities
    - Create `src/lib/utils/request-validation.ts`
    - Export `validateTitle(title: string): boolean` — returns false for empty/whitespace-only strings
    - Export `validateItems(items: { label: string }[]): boolean` — returns false if no item has a non-empty label
    - Export `validateClientSelected(clientId: string): boolean` — returns false for empty string
    - Use these functions in the edit page form submission
    - _Requirements: 2.5, 2.6, 3.6_

  - [x] 4.2 Extract item reconciliation logic as a testable utility
    - Create `src/lib/utils/item-reconciliation.ts`
    - Export `reconcileItems(existingItems: ExistingItem[], currentItems: EditableItem[]): ReconciliationResult`
    - ReconciliationResult contains: `toUpdate`, `toInsert`, `toDelete` arrays
    - Items with matching id → toUpdate; items without id → toInsert; existing ids not in current → toDelete
    - Use this function in the edit page form submission
    - _Requirements: 3.2, 3.3, 3.4_

  - [ ]* 4.3 Write property test for empty title rejection
    - **Property 3: Empty title rejection**
    - Generate whitespace-only strings (spaces, tabs, newlines, empty), verify `validateTitle` rejects all
    - Use fast-check library with minimum 100 iterations
    - **Validates: Requirements 2.5**

  - [ ]* 4.4 Write property test for zero valid items rejection
    - **Property 4: Zero valid items rejection**
    - Generate arrays of items where every label is whitespace-only, verify `validateItems` rejects all
    - Use fast-check library with minimum 100 iterations
    - **Validates: Requirements 3.6**

  - [ ]* 4.5 Write property test for item reconciliation correctness
    - **Property 5: Item reconciliation correctness**
    - Generate random sets of existing items (with IDs) and modified item lists (mix of kept, removed, new)
    - Verify: items with matching IDs go to toUpdate, items without IDs go to toInsert, missing IDs go to toDelete, no duplicates across categories
    - Use fast-check library with minimum 100 iterations
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The edit page reuses the same UI patterns as the new request page for consistency
- Item reconciliation preserves existing item IDs and associated file uploads
- Property tests validate the pure utility functions (validation and reconciliation) which are the core logic
- Properties 1, 2, 6, and 7 involve database I/O and are covered by integration tests rather than property-based tests

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "4.1", "4.2"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.6"] },
    { "id": 3, "tasks": ["2.3", "2.4"] },
    { "id": 4, "tasks": ["2.5", "4.3", "4.4", "4.5"] }
  ]
}
```
