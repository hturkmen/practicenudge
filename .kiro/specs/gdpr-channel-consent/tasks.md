# Implementation Plan: GDPR Channel-Based Consent

## Overview

Bu plan, mevcut tek boolean GDPR onay sistemini kanal bazlı (email/sms) bağımsız onay yapısına dönüştürmek için gerekli tüm implementasyon adımlarını içerir. Supabase migration, consent service, API routes, consent page UI, firma paneli entegrasyonu ve notification service consent kontrolü adımlarını kapsar.

## Tasks

- [x] 1. Veritabanı migrasyonu ve tip tanımları
  - [x] 1.1 Create database migration file `supabase/migrations/014_channel_consent.sql`
    - Create `client_consents` table with id, client_id, channel, status, consent_token, created_at, updated_at columns
    - Add CHECK constraints for channel ('email', 'sms') and status ('pending', 'accepted', 'rejected')
    - Add UNIQUE constraint on (client_id, channel)
    - Create indexes on client_id, consent_token, and status
    - Enable RLS and create policies for firm users and public token access
    - Migrate existing data: gdpr_consent=true → accepted, false/NULL → pending for all channels
    - Use COALESCE for consent_token and gdpr_consented_at preservation
    - Add WHERE NOT EXISTS clause for idempotency
    - Keep old gdpr_consent, gdpr_consent_token, gdpr_consented_at columns (do NOT drop)
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.8_

  - [x] 1.2 Create TypeScript type definitions in `src/lib/consent/types.ts`
    - Define `ConsentChannel` type ("email" | "sms")
    - Define `ConsentStatus` type ("pending" | "accepted" | "rejected")
    - Define `ClientConsent` interface matching database schema
    - Define `ConsentPageData` interface for consent page API response
    - Define `ConsentUpdateRequest` type for PATCH body
    - _Requirements: 1.1, 1.2_

- [x] 2. Consent Service implementasyonu
  - [x] 2.1 Implement core consent service in `src/lib/consent/service.ts`
    - Implement `createConsentsForClient(clientId)`: creates email + sms records with pending status and a shared consent_token UUID
    - Implement `getConsentsByToken(token)`: returns ConsentPageData with client name, firm name, channels, statuses, hasContactInfo flags, and descriptions
    - Implement `updateChannelConsent(token, channel, action)`: updates status to accepted/rejected and sets updated_at
    - Implement `getClientConsents(clientId)`: returns all consent records for a client
    - Implement `checkChannelConsent(clientId, channel)`: returns boolean (true only if accepted)
    - Handle duplicate creation attempts idempotently (ON CONFLICT DO NOTHING or check before insert)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6, 2.3, 2.4, 2.9_

  - [x] 2.2 Implement utility functions in `src/lib/consent/utils.ts`
    - Implement `getConsentStatusLabel(status)`: returns "Onay Bekleniyor" / "Onaylandı" / "Reddedildi"
    - Implement `formatConsentDate(date)`: returns dd/MM/yyyy formatted string
    - Implement channel description helper returning explanation text per channel
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 2.8_

  - [x]* 2.3 Write property tests for consent service in `src/lib/consent/__tests__/consent.property.test.ts`
    - **Property 1: Client creation initializes all channels in pending state**
    - **Validates: Requirements 1.3**
    - **Property 2: Unique client-channel constraint (idempotent duplicate handling)**
    - **Validates: Requirements 1.6**
    - **Property 3: Consent status transition correctness**
    - **Validates: Requirements 2.3, 2.4**
    - **Property 9: Status label mapping**
    - **Validates: Requirements 5.2, 5.3, 5.4**
    - **Property 10: Date formatting dd/MM/yyyy**
    - **Validates: Requirements 5.5**
    - **Property 11: Disabled channel when contact info missing**
    - **Validates: Requirements 2.9**

- [x] 3. Checkpoint - Consent service testleri
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. API Routes implementasyonu
  - [x] 4.1 Implement `GET /api/consent/[token]/route.ts`
    - Call `getConsentsByToken(token)` from consent service
    - Return 404 with error message if token not found or invalid
    - Return ConsentPageData JSON on success
    - _Requirements: 2.1, 2.7, 2.8, 2.9, 3.4_

  - [x] 4.2 Implement `PATCH /api/consent/[token]/route.ts`
    - Parse body for `{ channel, action }` with validation
    - Call `updateChannelConsent(token, channel, action)`
    - Return updated consent record on success
    - Return 404 if token invalid, 400 if body invalid, 500 on server error
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

  - [x] 4.3 Implement `POST /api/clients/send-consent/route.ts`
    - Accept `{ clientId }` in body
    - Validate client exists and has email address; return error if missing
    - Retrieve existing consent_token from client_consents
    - Send consent email via Resend with firm name, client name, and consent link
    - Return success or appropriate error response
    - _Requirements: 3.1, 3.2, 3.5, 3.6, 3.7_

  - [x]* 4.4 Write unit tests for API routes
    - Test GET returns correct data for valid token
    - Test GET returns 404 for invalid token
    - Test PATCH updates status correctly
    - Test PATCH returns error for invalid body
    - Test POST sends email with correct content
    - Test POST returns error when email missing
    - _Requirements: 2.1, 2.3, 2.4, 3.1, 3.4, 3.5_

- [x] 5. Consent e-posta servisi
  - [x] 5.1 Update consent email template in `src/lib/email/gdpr-consent.ts`
    - Update email template to include firm name, client name, and consent page link with token
    - Ensure consent link format: `{baseUrl}/consent/{token}`
    - _Requirements: 3.1, 3.2_

  - [x] 5.2 Add auto-send consent email on client creation
    - Hook into client creation flow to call `createConsentsForClient` and then trigger consent email send within 30 seconds
    - Only send if client has email address
    - _Requirements: 1.3, 3.3, 3.5_

  - [x]* 5.3 Write property tests for consent email
    - **Property 5: Consent email contains all required information (client name, firm name, token link)**
    - **Validates: Requirements 3.1, 3.2**
    - **Property 6: Consent token reuse on resend**
    - **Validates: Requirements 3.7**

- [x] 6. Checkpoint - API ve email testleri
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Consent Page UI
  - [x] 7.1 Refactor consent page component `src/app/consent/[token]/page.tsx`
    - Fetch consent data from GET /api/consent/[token] on mount
    - Display client name and firm name
    - Render each channel (email, sms) with current status badge
    - Show channel description text explaining purpose and withdrawal rights
    - Add accept/reject buttons per channel
    - Disable accept button for channels where hasContactInfo is false
    - Handle loading, error, and not-found states
    - Show error page with "invalid or expired link" message for invalid tokens
    - _Requirements: 2.1, 2.2, 2.7, 2.8, 2.9, 3.4_

  - [x] 7.2 Implement channel consent update interaction
    - On accept/reject button click, call PATCH /api/consent/[token] with channel and action
    - Show loading state on the specific channel being updated
    - Update UI to reflect new status within 2 seconds on success
    - Show error message on failure without changing current status
    - _Requirements: 2.3, 2.4, 2.5, 2.6_

  - [x]* 7.3 Write unit tests for consent page
    - Test all channels rendered with correct statuses
    - Test accept/reject buttons per channel
    - Test disabled state for channels without contact info
    - Test error display on update failure
    - Test invalid token error page
    - _Requirements: 2.1, 2.2, 2.5, 2.6, 2.9, 3.4_

- [x] 8. Firma paneli entegrasyonu
  - [x] 8.1 Create consent status component `src/components/consent-status.tsx`
    - Fetch client consents via consent service
    - Display each channel with status label ("Onay Bekleniyor", "Onaylandı", "Reddedildi")
    - Show last updated date in dd/MM/yyyy format per channel
    - Show "Onay Bekleniyor" for all channels if no consent records exist
    - Show error message if data fails to load, while preserving other client info
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

  - [x] 8.2 Integrate consent status into client detail page
    - Add ConsentStatusSection component to client detail page `src/app/(dashboard)/clients/[id]/page.tsx`
    - Add "Consent E-postası Gönder" button that calls POST /api/clients/send-consent
    - Show success/error feedback for consent email send action
    - _Requirements: 5.1, 3.1, 3.6_

  - [x]* 8.3 Write unit tests for consent status component
    - Test displays correct labels per status
    - Test date formatting
    - Test error state handling
    - Test missing records show pending
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 9. Notification service consent kontrolü
  - [x] 9.1 Update notification service in `src/lib/notifications/service.ts`
    - Add `checkConsentBeforeSend(clientId, channel)` function
    - Before sending any notification, check if client has accepted consent for the target channel
    - If consent is not accepted (pending or rejected), block notification and return `{ allowed: false, reason: "consent_not_granted" }`
    - If consent record is missing entirely, block and return `{ allowed: false, reason: "consent_record_missing" }`
    - Log blocked notifications with channel name, client ID, and reason to notification log table
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x]* 9.2 Write property tests for notification consent gate
    - **Property 4: Channel consent gate for notifications**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

  - [x]* 9.3 Write unit tests for notification consent check
    - Test notification allowed when consent is accepted
    - Test notification blocked when consent is pending
    - Test notification blocked when consent is rejected
    - Test notification blocked when consent record missing
    - Test log entry created on block
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 10. Migration idempotency ve integration testleri
  - [x]* 10.1 Write property tests for migration
    - **Property 7: Migration maps boolean consent to channel statuses**
    - **Validates: Requirements 1.5, 6.1, 6.2, 6.3, 6.4**
    - **Property 8: Migration idempotency**
    - **Validates: Requirements 6.8**

  - [x]* 10.2 Write integration tests in `src/lib/consent/__tests__/consent.integration.test.ts`
    - Test auto-send consent email on client creation
    - Test migration runs in single transaction
    - Test migration rollback on failure
    - Test old columns preserved after migration
    - _Requirements: 3.3, 6.5, 6.6, 6.7_

- [x] 11. Final checkpoint - Tüm testler
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- Migration preserves old columns for backward compatibility — no data loss risk
- Consent token is shared across all channels for the same client

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["2.3", "5.1"] },
    { "id": 3, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 4, "tasks": ["4.4", "5.2", "5.3"] },
    { "id": 5, "tasks": ["7.1", "8.1", "9.1"] },
    { "id": 6, "tasks": ["7.2", "8.2", "9.2"] },
    { "id": 7, "tasks": ["7.3", "8.3", "9.3"] },
    { "id": 8, "tasks": ["10.1", "10.2"] }
  ]
}
```
