---
inclusion: auto
---

# PracticeNudge - Project Context

## What is PracticeNudge?
MTD (Making Tax Digital) client readiness tracking tool for small UK accountancy practices. Helps accountants track which clients are MTD-ready, send document requests, and manage follow-ups.

## Tech Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **UI**: shadcn/ui + Tailwind CSS
- **Database**: Supabase (PostgreSQL + Row Level Security)
- **Auth**: Supabase Auth (Google OAuth + email/password)
- **Email**: Resend (noreply@practicenudge.com)
- **Hosting**: Vercel (www.practicenudge.com)
- **i18n**: next-intl (en, tr, + other languages)

## Data Hierarchy (Master/Child)
```
Firm (muhasebe firması)
  └── firm_users (members - muhasebeciler, owner/admin/member rolleri)
  └── Clients (firmanın müşterileri - vergi mükellefleri)
       └── Document Requests (belge talepleri)
            └── Request Items (checklist items)
            └── Reminder Logs
```

## Key Business Rules

### Status Cascade (yukarıdan aşağıya)
- Firm suspended → firm_users suspended, clients on_hold, requests on_hold
- Client on_hold/inactive/archived → all active requests go on_hold
- Client activated → on_hold requests restored to pending
- Request cannot be resumed if parent client is not active

### GDPR Consent (current implementation)
- `clients` table has: `gdpr_consent` (boolean), `gdpr_consent_token` (UUID), `gdpr_consented_at`
- Client added → GDPR consent email sent automatically
- Consent page: `/consent/[token]` (public, uses service_role API)
- No reminders sent to clients without `gdpr_consent = true`
- **TODO**: Convert to channel-based (email_consent, sms_consent) with pending/accepted/rejected states

### Delete Rules (only inactive items can be deleted)
- Firm: only suspended firms can be deleted (admin only, deletes auth users too)
- Client: only on_hold/inactive/archived clients can be deleted
- Request: only on_hold/cancelled requests can be deleted

### Reminder Blocking
- Client on_hold → no reminders
- Client gdpr_consent = false → no reminders
- Request on_hold/cancelled → no reminders

## Key Files
- `src/app/(dashboard)/layout.tsx` - Auth check, firm creation, suspended user screen
- `src/app/(dashboard)/clients/page.tsx` - Client list with hold/delete actions
- `src/app/(dashboard)/requests/page.tsx` - Request list with hold/cancel/delete
- `src/app/api/clients/update-status/route.ts` - Client status change with cascade
- `src/app/api/reminders/send/route.ts` - Manual reminder with all checks
- `src/app/api/cron/reminders/route.ts` - Auto reminders with all checks
- `src/app/api/admin/actions/route.ts` - Admin actions (suspend/reactivate firm/member)
- `src/app/api/admin/delete-firm/route.ts` - Firm deletion (service_role)
- `src/app/api/consent/[token]/route.ts` - GDPR consent API (service_role, public)
- `src/app/consent/[token]/page.tsx` - GDPR consent page (public)
- `src/lib/email/resend.ts` - Reminder email sending
- `src/lib/email/welcome.ts` - Welcome email for new users
- `src/lib/email/gdpr-consent.ts` - GDPR consent email
- `src/lib/email/admin-notify.ts` - Admin notifications
- `src/lib/admin/actions.ts` - suspendFirm, reactivateFirm, etc.
- `src/lib/types/database.ts` - Client type (status includes "on_hold")
- `src/lib/types/admin.ts` - Admin types (FirmListItem, AdminActionRequest)

## Database Tables
- `firms` - id, name, email, phone, plan (free/starter/pro)
- `firm_users` - firm_id, user_id, role, status (active/suspended)
- `clients` - firm_id, name, email, phone, client_type, status (active/inactive/archived/on_hold), gdpr_consent, gdpr_consent_token
- `document_requests` - firm_id, client_id, title, deadline, status (pending/in_progress/completed/overdue/on_hold/cancelled), magic_token
- `request_items` - request_id, label, status (pending/uploaded/approved/rejected)
- `reminder_logs` - request_id, client_id, channel, status
- `templates` - firm_id, name, items (JSONB)
- `super_admins` - user_id
- `subscription_history` - firm_id, previous_plan, new_plan
- `admin_audit_logs` - admin_user_id, target_entity_id, action_type
- `notification_logs`, `notification_types`, `notification_queue` - notification system

## Super Admin
- Email: halil.turkmen@gmail.com (SUPER_ADMIN_EMAIL env var)
- Gets notified on: new firm registration, reminder failures, cron errors
- Can: suspend/reactivate/delete firms, change plans, manage members

## Environment Variables
- NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- RESEND_API_KEY
- SUPER_ADMIN_EMAIL
- CRON_SECRET
- NEXT_PUBLIC_APP_URL (https://www.practicenudge.com)
