# Implementation Plan: Super Admin Panel

## Overview

This plan implements a comprehensive platform management interface for super administrators in PracticeNudge. The implementation follows an incremental approach: database schema first, then type definitions and utility modules, followed by API routes, shared UI components, and finally page-level integration. Each step builds on the previous, ensuring no orphaned code.

## Tasks

- [x] 1. Set up database schema and type definitions
  - [x] 1.1 Create database migration for new tables and column modifications
    - Create SQL migration file with `admin_audit_logs`, `member_activity_logs`, and `subscription_history` tables
    - Add `status` column to `firm_users` table with default 'active' and CHECK constraint
    - Create all indexes defined in the design (admin_user_id, target_entity_id, created_at, user_id, firm_id, action_type)
    - _Requirements: 2.4, 3.4, 5.1, 5.2, 6.5_

  - [x] 1.2 Create admin type definitions
    - Create `src/lib/types/admin.ts` with all types: `MemberStatus`, `AdminActionType`, `MemberActionType`, `AdminAuditLog`, `MemberActivityLog`, `SubscriptionHistoryEntry`
    - Add API request/response interfaces: `MembersListRequest`, `MembersListResponse`, `MemberListItem`, `FirmsListRequest`, `FirmsListResponse`, `FirmListItem`, `FirmDetailResponse`, `UsageRequest`, `UsageResponse`, `FirmUsageItem`, `ActivityLogRequest`, `ActivityLogEntry`, `AdminActionRequest`, `AdminActionResponse`
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.2_

- [ ] 2. Implement admin utility modules
  - [x] 2.1 Implement metrics utility functions
    - Create `src/lib/admin/metrics.ts` with: `computeCompletionRate`, `computeMonthOverMonth`, `isInactive`, `formatActivityTimestamp`, `getRelatedEntity`
    - `computeCompletionRate(total, completed)` returns `Math.floor(completed / total * 100)` when total > 0, else 0
    - `computeMonthOverMonth(current, previous)` returns `Math.round((current - previous) / previous * 100)` when previous > 0, else 0
    - `isInactive(lastActivityDate, thresholdDays)` returns true if last activity is older than threshold or null
    - `formatActivityTimestamp(isoTimestamp)` formats to "DD MMM YYYY, HH:mm"
    - `getRelatedEntity(actionType, metadata)` returns client name for client actions, request ID for document request actions, null otherwise
    - _Requirements: 4.4, 5.4, 7.1, 7.5_

  - [ ]* 2.2 Write property tests for metrics utilities
    - **Property 21: Completion rate computation**
    - **Property 23: Month-over-month growth calculation**
    - **Validates: Requirements 7.1, 7.5**

  - [ ]* 2.3 Write property test for activity log formatting
    - **Property 18: Activity log entry formatting**
    - **Validates: Requirements 5.4**

  - [x] 2.4 Implement admin query functions
    - Create `src/lib/admin/queries.ts` with: `getMembers`, `getMemberDetail`, `getFirms`, `getFirmDetail`, `getUsageMetrics`, `getActivityLog`
    - `getMembers` supports pagination (20/page), search (min 2 chars, case-insensitive on name/email/firm), filters (firm, role, plan, status with AND logic), and sorting
    - `getFirms` supports pagination (25/page), search on name/email, filters (plan, date range)
    - `getUsageMetrics` computes summary metrics, per-firm breakdown (50/page, sorted by last activity), and trend data
    - `getActivityLog` returns max 100 entries sorted by timestamp DESC, with action type and date range filters
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 3.1, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.3_

  - [ ]* 2.5 Write property tests for member queries
    - **Property 1: Member list pagination invariant**
    - **Property 2: Member search correctness**
    - **Property 3: Filter AND logic for members**
    - **Property 4: Column sorting correctness**
    - **Property 5: Member detail completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 2.1**

  - [ ]* 2.6 Write property tests for firm queries
    - **Property 8: Firm list pagination invariant**
    - **Property 10: Firm search correctness**
    - **Property 11: Firm filter correctness**
    - **Validates: Requirements 3.1, 3.5, 3.6**

  - [ ]* 2.7 Write property tests for usage and activity log queries
    - **Property 12: Date-range metric computation**
    - **Property 13: Per-firm usage sorting and pagination**
    - **Property 14: Trend chart data accuracy**
    - **Property 15: Activity log limit and ordering**
    - **Property 16: Activity log action type validation**
    - **Property 17: Activity log filter correctness**
    - **Property 22: Recent entities list constraint**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 7.2, 7.3**

  - [x] 2.8 Implement admin action functions
    - Create `src/lib/admin/actions.ts` with: `updateMemberRole`, `updateFirmPlan`, `suspendMember`, `reactivateMember`, `logAdminAction`
    - `updateMemberRole` updates firm_users role and logs audit entry
    - `updateFirmPlan` updates firms plan, creates subscription_history entry, and logs audit entry
    - `suspendMember` sets firm_users status to 'suspended', returns warning if last owner, logs audit entry
    - `reactivateMember` sets firm_users status to 'active', logs audit entry
    - `logAdminAction` inserts into admin_audit_logs
    - _Requirements: 2.2, 2.4, 2.5, 2.6, 3.2, 6.5_

  - [ ]* 2.9 Write property tests for admin actions
    - **Property 6: Role update persistence**
    - **Property 7: Suspend/reactivate round-trip**
    - **Property 9: Firm plan update persistence**
    - **Property 19: Destructive action confirmation requirement**
    - **Property 20: Admin audit log completeness**
    - **Validates: Requirements 2.2, 2.4, 2.5, 3.2, 6.4, 6.5**

- [x] 3. Checkpoint - Core utilities verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement API routes
  - [x] 4.1 Implement members API route
    - Create `src/app/api/admin/members/route.ts` with GET handler
    - Verify super admin status via `super_admins` table lookup
    - Parse and validate query params (page, page_size, search, firm_id, role, plan, status, sort_by, sort_order)
    - Call `getMembers` from queries module and return paginated response
    - Return 401 for unauthenticated, 403 for non-admin, 400 for invalid params
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3_

  - [x] 4.2 Implement member detail API route
    - Create `src/app/api/admin/members/[id]/route.ts` with GET handler
    - Verify super admin status, fetch member detail and activity log
    - Return member data with activity log entries
    - _Requirements: 2.1, 5.1_

  - [x] 4.3 Implement firms API route
    - Create `src/app/api/admin/firms/route.ts` with GET handler
    - Verify super admin status, parse query params (page, page_size, search, plan, date_from, date_to)
    - Call `getFirms` from queries module and return paginated response
    - _Requirements: 3.1, 3.5, 3.6, 6.1, 6.2, 6.3_

  - [x] 4.4 Implement firm detail API route
    - Create `src/app/api/admin/firms/[id]/route.ts` with GET handler
    - Verify super admin status, fetch firm detail with members, client count, document request count, and subscription history
    - _Requirements: 3.4_

  - [x] 4.5 Implement usage API route
    - Create `src/app/api/admin/usage/route.ts` with GET handler
    - Verify super admin status, parse date range params (default last 30 days, max 365 days)
    - Call `getUsageMetrics` and return summary, per-firm breakdown, and trend data
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

  - [x] 4.6 Implement activity logs API route
    - Create `src/app/api/admin/activity-logs/[userId]/route.ts` with GET handler
    - Verify super admin status, parse filters (action_type, date_from, date_to, limit)
    - Call `getActivityLog` and return filtered entries
    - _Requirements: 5.1, 5.3_

  - [x] 4.7 Implement admin actions API route
    - Create `src/app/api/admin/actions/route.ts` with POST handler
    - Verify super admin status, validate action request body
    - Route to appropriate action function (updateMemberRole, updateFirmPlan, suspendMember, reactivateMember)
    - Return success/failure response with optional warning
    - _Requirements: 2.2, 2.4, 2.5, 3.2, 6.4, 6.5_

- [x] 5. Checkpoint - API routes verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement shared admin UI components
  - [x] 6.1 Create admin-guard component
    - Create `src/components/admin/admin-guard.tsx`
    - Wrap admin pages with auth check: verify session via `supabase.auth.getUser()`, then check `super_admins` table
    - Redirect to `/login` if unauthenticated, redirect to `/dashboard` if not super admin
    - Show loading spinner during verification
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [x] 6.2 Create reusable admin UI components
    - Create `src/components/admin/confirmation-dialog.tsx` — modal dialog for destructive actions with action description and confirm/cancel buttons
    - Create `src/components/admin/pagination.tsx` — page navigation with page size display and total count
    - Create `src/components/admin/search-input.tsx` — debounced input (500ms) with minimum 2-character threshold
    - Create `src/components/admin/stat-card.tsx` — clickable summary card with title, value, optional trend indicator
    - Create `src/components/admin/activity-log-table.tsx` — table displaying activity entries with action type, description, timestamp, related entity, and filters
    - Create `src/components/admin/trend-chart.tsx` — line chart for daily active members and document requests
    - _Requirements: 1.2, 1.5, 4.5, 5.4, 6.4, 7.1_

- [x] 7. Implement admin page routes
  - [x] 7.1 Implement Platform Overview Dashboard page
    - Enhance existing `src/app/(dashboard)/admin/page.tsx` to display summary cards (total firms, members, clients, document requests, completion rate)
    - Add recently registered firms list (up to 5, sorted by creation date DESC)
    - Add recently registered members list (up to 5, sorted by registration date DESC)
    - Add platform growth metrics (new firms/members this month, MoM change percentage)
    - Make summary cards clickable: firms → /admin/firms, members → /admin/members, clients/requests/completion → /admin/usage
    - Show loading indicator with 5-second timeout
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 7.2 Implement Members List page
    - Create `src/app/(dashboard)/admin/members/page.tsx`
    - Display paginated member table (20/page) with columns: name, email, firm name, role, plan, status, registration date
    - Integrate search-input component with 500ms debounce and 2-char minimum
    - Add filter dropdowns for firm, role, plan, status (AND logic)
    - Add column sorting with ascending/descending toggle
    - Display total matching count and empty state when no results
    - Each row links to member detail page
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 7.3 Implement Member Detail page
    - Create `src/app/(dashboard)/admin/members/[id]/page.tsx`
    - Display member profile: name, email, firm name, role, plan, status, registration date
    - Add role update dropdown with confirmation dialog
    - Add suspend/reactivate button with confirmation dialog (show last-owner warning when applicable)
    - Display activity log with last 100 entries, sorted by timestamp DESC
    - Add activity log filters: action type dropdown, date range picker
    - Show empty state when no activity matches filters
    - Handle errors with toast notifications and retain previous values on failure
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 5.1, 5.2, 5.3, 5.4, 5.5, 6.4_

  - [x] 7.4 Implement Firms List page
    - Create `src/app/(dashboard)/admin/firms/page.tsx`
    - Display paginated firm table (25/page) with columns: name, email, phone, plan, member count, client count, creation date
    - Integrate search-input component for name/email search
    - Add filter for plan type and creation date range
    - Each row links to firm detail page
    - _Requirements: 3.1, 3.5, 3.6_

  - [x] 7.5 Implement Firm Detail page
    - Create `src/app/(dashboard)/admin/firms/[id]/page.tsx`
    - Display firm info with plan change dropdown and confirmation dialog
    - Show associated members list (name, email, role)
    - Show total client count and total document requests count
    - Show subscription history table (previous plan, new plan, date)
    - Handle plan change errors with toast and retain previous value
    - _Requirements: 3.2, 3.3, 3.4, 6.4_

  - [x] 7.6 Implement Usage Analytics Dashboard page
    - Create `src/app/(dashboard)/admin/usage/page.tsx`
    - Display summary metrics: total logins (7d/30d), active members (7d), total clients, requests sent, requests completed
    - Display per-firm usage breakdown table (50/page) sorted by last activity DESC
    - Mark inactive firms (no activity in 30 days) with 'inactive' label
    - Add date range picker (default last 30 days, max 365 days)
    - Display trend chart with daily active members and document requests
    - Show error state with retry button on data fetch failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [x] 8. Install fast-check dependency
  - [x] 8.1 Add fast-check as dev dependency
    - Install `fast-check@^3.15.0` as a dev dependency for property-based testing
    - _Requirements: Testing infrastructure_

- [x] 9. Final checkpoint - Full integration verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The design uses TypeScript throughout, consistent with the existing Next.js + Supabase codebase
- All admin pages use client-side rendering with API routes, matching the existing admin page pattern
- Shared UI components leverage existing shadcn/ui primitives already in the project

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "8.1"] },
    { "id": 2, "tasks": ["2.2", "2.3", "2.4", "2.8"] },
    { "id": 3, "tasks": ["2.5", "2.6", "2.7", "2.9"] },
    { "id": 4, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6", "4.7"] },
    { "id": 5, "tasks": ["6.1", "6.2"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.4", "7.6"] },
    { "id": 7, "tasks": ["7.3", "7.5"] }
  ]
}
```
