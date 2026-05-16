# Requirements Document

## Introduction

This feature adds the ability to edit existing document requests in PracticeNudge, and fixes logo navigation behavior to be context-aware. Currently, users can create document requests but cannot modify them after creation. Additionally, the PracticeNudge logo in the dashboard sidebar navigates to the marketing website instead of the dashboard, breaking the user's workflow context.

## Glossary

- **Request_Editor**: The page/form that allows users to modify an existing document request's details and checklist items
- **Document_Request**: A collection request sent to a client containing a title, deadline, status, and checklist items
- **Request_Item**: An individual checklist entry within a document request that a client must provide
- **Dashboard_Sidebar**: The fixed left navigation panel displayed in the authenticated dashboard area
- **Marketing_Website**: The public-facing landing page and related pages at the root URL
- **Dashboard_Context**: The authenticated area of the application accessible after login (routes under /dashboard, /requests, /clients, etc.)

## Requirements

### Requirement 1: Edit Request Access

**User Story:** As an accountant, I want to access an edit function from the request detail page, so that I can modify existing document requests without recreating them.

#### Acceptance Criteria

1. WHEN a user views a request detail page, THE Request_Editor SHALL display an "Edit" button in the page header actions area
2. WHEN the user clicks the "Edit" button, THE Request_Editor SHALL navigate the user to the edit page at `/requests/{id}/edit`
3. THE Request_Editor SHALL pre-populate all form fields with the current values of the Document_Request

### Requirement 2: Edit Request Details

**User Story:** As an accountant, I want to modify the title, deadline, and client assignment of an existing request, so that I can correct mistakes or update information as circumstances change.

#### Acceptance Criteria

1. THE Request_Editor SHALL allow modification of the Document_Request title field
2. THE Request_Editor SHALL allow modification of the Document_Request deadline field
3. THE Request_Editor SHALL allow modification of the Document_Request client assignment
4. WHEN the user submits the edit form with valid data, THE Request_Editor SHALL update the Document_Request in the database and navigate back to the request detail page
5. WHEN the user submits the edit form with an empty title, THE Request_Editor SHALL display a validation error and prevent submission
6. WHEN the user submits the edit form without a selected client, THE Request_Editor SHALL display a validation error and prevent submission

### Requirement 3: Edit Checklist Items

**User Story:** As an accountant, I want to add, remove, and modify checklist items on an existing request, so that I can adjust document requirements after initial creation.

#### Acceptance Criteria

1. THE Request_Editor SHALL display all existing Request_Items with their current label, description, and required status
2. THE Request_Editor SHALL allow modification of each Request_Item label, description, and required flag
3. THE Request_Editor SHALL allow adding new Request_Items to the Document_Request
4. THE Request_Editor SHALL allow removing existing Request_Items from the Document_Request
5. WHEN a Request_Item has already been uploaded by the client (status is "uploaded" or "approved"), THE Request_Editor SHALL display a visual indicator showing the item has submissions
6. WHEN the user submits the edit form with zero valid checklist items, THE Request_Editor SHALL display a validation error and prevent submission

### Requirement 4: Edit Form Cancellation

**User Story:** As an accountant, I want to cancel editing without saving changes, so that I can safely abandon modifications.

#### Acceptance Criteria

1. THE Request_Editor SHALL display a "Cancel" button that navigates back to the request detail page without saving changes
2. THE Request_Editor SHALL not modify any data in the database when the user cancels

### Requirement 5: Activity Logging for Edits

**User Story:** As an accountant, I want edits to be logged in the activity history, so that I have an audit trail of changes made to requests.

#### Acceptance Criteria

1. WHEN a Document_Request is successfully updated, THE Request_Editor SHALL create an activity log entry with the action "request_updated"
2. THE activity log entry SHALL include the Document_Request ID and the firm ID

### Requirement 6: Dashboard Logo Navigation

**User Story:** As an accountant, I want the PracticeNudge logo in the dashboard sidebar to navigate to the dashboard home, so that I stay within my workspace context.

#### Acceptance Criteria

1. WHILE the user is in the Dashboard_Context, THE Dashboard_Sidebar SHALL navigate to `/dashboard` when the PracticeNudge logo is clicked
2. WHILE the user is on the Marketing_Website, THE Marketing_Website navigation SHALL navigate to `/` when the PracticeNudge logo is clicked
3. THE Dashboard_Sidebar logo navigation SHALL remain consistent across all dashboard pages (requests, clients, templates, settings, billing, notifications, admin)
