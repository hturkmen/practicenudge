# Requirements Document

## Introduction

PracticeNudge Super Admin Panel is a comprehensive platform management interface that enables super administrators to view, manage, and monitor all members (firms and users) across the entire PracticeNudge platform. The current admin page provides basic firm/user listing and plan management, but lacks detailed member management capabilities, usage analytics, and activity monitoring. This feature extends the existing admin section with full member lifecycle management and usage visibility.

## Glossary

- **Super_Admin_Panel**: The set of screens within PracticeNudge accessible only to super administrators for platform-wide management
- **Super_Admin**: A user with elevated privileges verified via the super_admins table, authorized to manage all platform entities
- **Member**: Any user registered on the PracticeNudge platform, associated with a Firm via the firm_users table
- **Firm**: An accounting firm entity registered on PracticeNudge with a subscription plan (free, starter, pro)
- **Usage_Dashboard**: The screen displaying aggregated and per-member activity metrics including logins, client operations, document requests, and feature usage
- **Member_Detail_View**: A dedicated screen showing comprehensive information about a single Member including profile, firm association, activity history, and usage statistics
- **Activity_Log**: A chronological record of actions performed by a Member on the platform (logins, client additions, document requests sent, etc.)

## Requirements

### Requirement 1: Member Listing and Search

**User Story:** As a Super_Admin, I want to see all registered members in a searchable and filterable list, so that I can quickly find and review any member on the platform.

#### Acceptance Criteria

1. WHEN the Super_Admin navigates to the Members screen, THE Super_Admin_Panel SHALL display a paginated list of all Members with columns: name, email, firm name, role, plan, status, and registration date, showing 20 Members per page sorted by registration date in descending order
2. WHEN the Super_Admin enters a search term of at least 2 characters, THE Super_Admin_Panel SHALL filter the Member list by partial match on name, email, or firm name within 500 milliseconds
3. THE Super_Admin_Panel SHALL provide filter options for: firm (selectable from all registered firms), role (owner, member), plan (free, starter, pro), and account status (active, suspended), where multiple active filters are combined using AND logic
4. WHEN the Super_Admin applies sorting to any column, THE Super_Admin_Panel SHALL reorder the list by the selected column in ascending or descending order, resetting pagination to the first page
5. THE Super_Admin_Panel SHALL display the total count of Members matching the current search and filter criteria
6. IF the current search or filter criteria match zero Members, THEN THE Super_Admin_Panel SHALL display an empty state message indicating no members were found and show the active filter criteria

### Requirement 2: Member Detail and Profile Management

**User Story:** As a Super_Admin, I want to view and edit detailed information about any member, so that I can manage their account and resolve issues.

#### Acceptance Criteria

1. WHEN the Super_Admin selects a Member from the list, THE Super_Admin_Panel SHALL display the Member_Detail_View showing: full name, email address, firm name, role (owner, admin, or member), firm plan (free, starter, or pro), account status (active or suspended), and registration date
2. WHEN the Super_Admin updates a Member's role to one of the allowed values (owner, admin, member), THE Super_Admin_Panel SHALL save the change and reflect the updated role in the interface within 2 seconds
3. IF the role update fails to save, THEN THE Super_Admin_Panel SHALL display an error message indicating the failure reason and retain the previous role value in the interface
4. WHEN the Super_Admin suspends a Member account, THE Super_Admin_Panel SHALL set the Member status to 'suspended' and prevent the Member from authenticating on any subsequent login attempt
5. WHEN the Super_Admin reactivates a suspended Member account, THE Super_Admin_Panel SHALL set the Member status to 'active' and restore the Member's ability to log in with their previously assigned role and firm association unchanged
6. IF the Super_Admin attempts to suspend the last owner of a Firm, THEN THE Super_Admin_Panel SHALL display a warning indicating the Firm will have no owner, and only proceed with the suspension after the Super_Admin explicitly confirms via a confirmation dialog

### Requirement 3: Firm Management

**User Story:** As a Super_Admin, I want to manage all firms on the platform including their plans and settings, so that I can control firm-level configurations.

#### Acceptance Criteria

1. WHEN the Super_Admin navigates to the Firms screen, THE Super_Admin_Panel SHALL display a paginated list of all Firms with columns: name, email, phone, plan, member count, client count, and creation date, showing 25 Firms per page
2. WHEN the Super_Admin changes a Firm's plan, THE Super_Admin_Panel SHALL update the Firm's plan value in the database and reflect the new plan in the Firms list within 2 seconds of confirmation
3. IF the plan change fails due to a server or database error, THEN THE Super_Admin_Panel SHALL display an error message indicating the plan was not updated and retain the Firm's previous plan value
4. WHEN the Super_Admin selects a Firm, THE Super_Admin_Panel SHALL display firm details including: all associated Members (name, email, role), total client count, total document requests count, and subscription history showing each plan change with the previous plan, new plan, and date of change
5. THE Super_Admin_Panel SHALL provide a filter for Firms by plan type (free, starter, pro) and creation date range with selectable start and end dates
6. WHEN the Super_Admin searches for a Firm, THE Super_Admin_Panel SHALL filter the Firm list by partial match on name or email within 500 milliseconds of input

### Requirement 4: Usage Analytics Dashboard

**User Story:** As a Super_Admin, I want to view usage statistics for all members and firms, so that I can understand platform adoption and identify inactive accounts.

#### Acceptance Criteria

1. THE Usage_Dashboard SHALL display platform-wide summary metrics: total logins (last 7/30 days), active members (logged in within 7 days), total clients created, total document requests sent, and total document requests completed
2. WHEN the Super_Admin views the Usage_Dashboard, THE Super_Admin_Panel SHALL display a per-firm usage breakdown showing: member count, client count, document requests sent, document requests completed, and last activity date, sorted by last activity date descending, with a maximum of 50 firms per page
3. WHEN the Super_Admin selects a date range with a maximum span of 365 days, THE Usage_Dashboard SHALL recalculate all metrics for the specified period within 3 seconds
4. THE Usage_Dashboard SHALL visually distinguish Firms with zero recorded actions (logins, client additions, or document requests) in the last 30 days by displaying an 'inactive' status label next to the firm name
5. THE Usage_Dashboard SHALL display a trend chart showing daily active members (members who logged in on that day) and document requests over the selected period
6. WHEN the Usage_Dashboard loads for the first time, THE Usage_Dashboard SHALL default the selected date range to the last 30 days
7. IF the Usage_Dashboard fails to retrieve usage data, THEN THE Usage_Dashboard SHALL display an error message indicating that metrics are temporarily unavailable and provide a retry option

### Requirement 5: Member Activity Log

**User Story:** As a Super_Admin, I want to view the activity history of any member, so that I can audit their actions and understand their usage patterns.

#### Acceptance Criteria

1. WHEN the Super_Admin views a Member_Detail_View, THE Super_Admin_Panel SHALL display the Member's Activity_Log showing the last 100 actions sorted by timestamp in descending order (most recent first)
2. THE Activity_Log SHALL record the following action types: login, client_added, client_updated, document_request_sent, document_request_completed, and settings_changed
3. WHEN the Super_Admin filters the Activity_Log by action type, by date range, or by both simultaneously, THE Super_Admin_Panel SHALL display only entries matching all applied filter criteria
4. THE Activity_Log SHALL display each entry with: action type, description (maximum 200 characters), timestamp in the format "DD MMM YYYY, HH:mm", and related entity — where related entity is the client name for client_added and client_updated actions, the request ID for document_request_sent and document_request_completed actions, and omitted for login and settings_changed actions
5. IF the Activity_Log contains no entries matching the current filters, THEN THE Super_Admin_Panel SHALL display an empty state message indicating no activity was found for the selected criteria

### Requirement 6: Access Control and Security

**User Story:** As a Super_Admin, I want the admin panel to be accessible only to authorized super administrators, so that sensitive platform data remains protected.

#### Acceptance Criteria

1. WHEN an unauthenticated user attempts to access any Super_Admin_Panel route, THE Super_Admin_Panel SHALL redirect the user to the login page
2. WHEN an authenticated non-super-admin user attempts to access any Super_Admin_Panel route, THE Super_Admin_Panel SHALL redirect the user to the dashboard page
3. THE Super_Admin_Panel SHALL verify super admin status on every page load by querying the super_admins table for the current user's ID, and IF the user is no longer present in the super_admins table, THEN THE Super_Admin_Panel SHALL redirect the user to the dashboard page
4. WHEN a Super_Admin performs a destructive action (suspend account, reactivate account, change plan, or change member role), THE Super_Admin_Panel SHALL display a confirmation dialog stating the action and affected entity, and SHALL only proceed if the Super_Admin confirms
5. THE Super_Admin_Panel SHALL log all administrative actions (plan changes, account suspensions, account reactivations, role changes) with the Super_Admin's user ID, the target entity ID, the action type, and a timestamp
6. IF the Super_Admin's session expires, THEN THE Super_Admin_Panel SHALL redirect to the login page and require re-authentication before granting access to any Super_Admin_Panel route

### Requirement 7: Platform Overview Dashboard

**User Story:** As a Super_Admin, I want a high-level overview of the entire platform upon entering the admin panel, so that I can quickly assess platform health and key metrics.

#### Acceptance Criteria

1. WHEN the Super_Admin navigates to the admin panel home, THE Super_Admin_Panel SHALL display summary cards showing: total firms, total members, total clients, total document requests, and completion rate percentage (calculated as total completed document requests divided by total document requests, displayed as an integer from 0 to 100; displayed as 0% when no document requests exist)
2. THE Super_Admin_Panel SHALL display a list of up to 5 most recently registered Firms ordered by creation date descending, showing each Firm's name, plan, and member count
3. THE Super_Admin_Panel SHALL display a list of up to 5 most recently registered Members ordered by registration date descending, showing each Member's name, firm name, and role
4. WHEN the Super_Admin clicks on a summary card, THE Super_Admin_Panel SHALL navigate to the corresponding detailed view: total firms card navigates to the Firms screen, total members card navigates to the Members screen, and total clients, total document requests, and completion rate cards navigate to the Usage_Dashboard
5. THE Super_Admin_Panel SHALL display the platform growth metrics: number of new firms registered in the current calendar month, number of new members registered in the current calendar month, and month-over-month change percentage for each (calculated as the difference between current calendar month count and previous calendar month count divided by previous calendar month count, displayed as 0% when the previous month count is zero)
6. WHEN the Super_Admin_Panel is loading dashboard data, THE Super_Admin_Panel SHALL display a loading indicator until all summary cards and lists are rendered, within a maximum of 5 seconds before showing a timeout error message
