# Requirements Document

## Introduction

PracticeNudge Launch Operations covers the complete go-to-market infrastructure for PracticeNudge, a micro-SaaS product providing MTD client readiness tracking and client chasing dashboards for small UK accountants and bookkeepers. This document specifies requirements across 10 workstreams: DNS/hosting, landing pages, branding, social presence, email infrastructure, lead magnets, lead research, outreach messaging, and daily operational checklists.

## Glossary

- **Launch_Ops_System**: The complete set of infrastructure, content, and processes required to bring PracticeNudge to market
- **DNS_Configuration**: The domain name system records connecting practicenudge.com and mtdnudge.com to hosting and email services
- **Landing_Page**: The public-facing web page at practicenudge.com presenting the product value proposition and capturing interest
- **MTD_Landing_Page**: The lead-capture page at mtdnudge.com focused on MTD readiness content and lead magnet delivery
- **Lead_Magnet**: The Google Sheet template "MTD Client Readiness Tracker" offered as a free download to capture leads
- **Outreach_System**: The set of LinkedIn and email messages used to contact prospective accountant users
- **Lead_List**: The structured spreadsheet of 100 target accountant/bookkeeper prospects in specified UK regions
- **Email_Infrastructure**: The email sending setup including mailboxes, DNS authentication records, and domain reputation management
- **Brand_Assets**: The wordmark, colour palette, and typography choices for PracticeNudge
- **Day_End_Checklist**: The daily operational checklist tracking completion of launch tasks
- **MTD**: Making Tax Digital, the UK HMRC programme requiring digital tax record keeping and submission
- **SPF**: Sender Policy Framework, a DNS record authorising email senders for a domain
- **DKIM**: DomainKeys Identified Mail, a DNS record providing email authentication via cryptographic signatures
- **DMARC**: Domain-based Message Authentication, Reporting and Conformance, a DNS policy record for email authentication enforcement

## Requirements

### Requirement 1: DNS and Hosting Configuration

**User Story:** As the product owner, I want practicenudge.com and mtdnudge.com correctly configured with DNS and hosting, so that both domains resolve to the correct web properties and email services.

#### Acceptance Criteria

1. WHEN the DNS_Configuration is applied, THE Launch_Ops_System SHALL resolve practicenudge.com root domain to the Vercel-hosted landing page within 24 hours
2. WHEN the DNS_Configuration is applied, THE Launch_Ops_System SHALL resolve www.practicenudge.com to the same Vercel-hosted landing page as the root domain
3. WHEN the DNS_Configuration is applied, THE Launch_Ops_System SHALL resolve mtdnudge.com to either a separate Vercel project or redirect to practicenudge.com/mtd
4. THE DNS_Configuration SHALL include A records, CNAME records, and TXT records as required by Vercel domain verification
5. THE DNS_Configuration SHALL include MX records, SPF TXT record, DKIM TXT record, and DMARC TXT record for email delivery from practicenudge.com
6. WHEN Cloudflare is used as DNS provider, THE DNS_Configuration SHALL set DNS-only mode (grey cloud) for Vercel-proxied records to avoid SSL conflicts
7. IF a DNS record is misconfigured, THEN THE Launch_Ops_System SHALL be verifiable via dig or nslookup commands within the Cloudflare dashboard

### Requirement 2: Main Landing Page Content

**User Story:** As a visiting accountant or bookkeeper, I want to understand what PracticeNudge does within 10 seconds of landing on practicenudge.com, so that I can decide whether to sign up or learn more.

#### Acceptance Criteria

1. THE Landing_Page SHALL display a hero section containing a headline, subheadline, and a single primary call-to-action button
2. THE Landing_Page SHALL include a problem section describing the pain of chasing clients for MTD information manually
3. THE Landing_Page SHALL include a solution section describing PracticeNudge as a client readiness and chasing dashboard
4. THE Landing_Page SHALL include a pricing section with a pilot offer for early adopters
5. THE Landing_Page SHALL include a FAQ section addressing common objections
6. THE Landing_Page SHALL display a disclaimer stating PracticeNudge is not tax filing software, does not submit to HMRC, and does not provide tax advice
7. THE Landing_Page SHALL use professional B2B SaaS visual style with concise English copy
8. WHEN a visitor clicks the primary CTA, THE Landing_Page SHALL direct the visitor to a sign-up or waitlist form

### Requirement 3: MTD Lead Capture Landing Page

**User Story:** As an accountant searching for MTD readiness resources, I want to find a focused MTD page offering a free tracker template, so that I can download a useful tool and learn about PracticeNudge.

#### Acceptance Criteria

1. THE MTD_Landing_Page SHALL display a hero section with an MTD-specific headline, subheadline, and call-to-action for downloading the Lead_Magnet
2. THE MTD_Landing_Page SHALL describe the Lead_Magnet contents and benefits in a dedicated section
3. WHEN a visitor submits the lead capture form, THE MTD_Landing_Page SHALL collect the visitor name, email address, and practice name
4. WHEN a visitor submits the lead capture form, THE MTD_Landing_Page SHALL deliver the Lead_Magnet via email or direct download link
5. WHEN a visitor submits the lead capture form, THE MTD_Landing_Page SHALL display a thank-you message confirming delivery
6. THE MTD_Landing_Page SHALL be written in English with a professional, non-salesy tone

### Requirement 4: Brand Wordmark and Visual Identity

**User Story:** As the product owner, I want a professional wordmark and colour palette for PracticeNudge, so that all marketing materials have consistent, trust-building branding suitable for an accountant audience.

#### Acceptance Criteria

1. THE Brand_Assets SHALL include three wordmark design options for "PracticeNudge" in clean, professional styles
2. THE Brand_Assets SHALL include a colour palette of 3-5 colours suitable for a B2B financial services audience
3. THE Brand_Assets SHALL include a font recommendation for headings and body text
4. THE Brand_Assets SHALL include generation prompts compatible with Canva, Figma, or AI design tools
5. THE Brand_Assets SHALL avoid overly startup, tech-heavy, or AI-focused visual styles
6. THE Brand_Assets SHALL use wordmark-only format without a separate icon or logomark

### Requirement 5: LinkedIn Company Page

**User Story:** As the product owner, I want a LinkedIn company page for PracticeNudge, so that prospects can find and verify the business through professional social channels.

#### Acceptance Criteria

1. THE Launch_Ops_System SHALL specify the LinkedIn company page name as "PracticeNudge"
2. THE Launch_Ops_System SHALL provide a tagline of 120 characters or fewer describing PracticeNudge
3. THE Launch_Ops_System SHALL provide an About section of 200-500 words describing the product, target audience, and problem solved
4. THE Launch_Ops_System SHALL specify the website URL as https://practicenudge.com
5. THE Launch_Ops_System SHALL recommend appropriate LinkedIn industry category and company size
6. THE Launch_Ops_System SHALL provide a first LinkedIn post in English with professional, early-stage tone focused on the MTD readiness problem

### Requirement 6: Email Infrastructure

**User Story:** As the product owner, I want professional email addresses with proper authentication, so that outreach emails are delivered reliably and the domain reputation is protected.

#### Acceptance Criteria

1. THE Email_Infrastructure SHALL support sending and receiving email from hello@practicenudge.com and halil@practicenudge.com
2. THE Email_Infrastructure SHALL include a comparison of Cloudflare Email Routing, ImprovMX, Google Workspace, Zoho Mail, and Proton Mail against criteria of cost, professionalism, cold outreach reliability, and SPF/DKIM/DMARC ease
3. THE Email_Infrastructure SHALL recommend a specific provider for the first 30 days of operation with justification
4. THE Email_Infrastructure SHALL specify the exact SPF, DKIM, and DMARC DNS records required for the recommended provider
5. THE Email_Infrastructure SHALL include domain reputation protection guidance for cold email sending
6. IF the recommended provider has sending volume limits, THEN THE Email_Infrastructure SHALL document those limits and recommend a warm-up schedule

### Requirement 7: Lead Magnet Google Sheet

**User Story:** As an accountant downloading the free tracker, I want a well-structured Google Sheet template for tracking MTD client readiness, so that I can immediately use it with my client list.

#### Acceptance Criteria

1. THE Lead_Magnet SHALL be a Google Sheet with clearly labelled tabs for client tracking
2. THE Lead_Magnet SHALL include columns for: Client Name, Client Type, Income Band, MTD Required, Current Software, MTD Status, Missing Information, Last Contacted, Next Follow-up, Risk Level, and Notes
3. THE Lead_Magnet SHALL include a risk score logic using conditional formatting or formula based on MTD Status and Missing Information fields
4. THE Lead_Magnet SHALL include status dropdown options for MTD readiness stages
5. THE Lead_Magnet SHALL include 10 sample rows of realistic dummy data representing typical UK accountant clients
6. THE Lead_Magnet SHALL be simple enough for non-technical accountants to use without training

### Requirement 8: Lead List Research Plan

**User Story:** As the product owner, I want a structured process for finding 100 target accountant prospects, so that I can execute outreach systematically across specified UK regions.

#### Acceptance Criteria

1. THE Lead_List SHALL contain 100 prospect entries from the regions: Milton Keynes, Luton, Bedford, Northampton, and London
2. THE Lead_List SHALL include columns for: Business Name, Contact Name, Role, Website, LinkedIn URL, Email, Location, Software Used, Sole Trader/Landlord Clients Mentioned, Personalised Opener, Outreach Status, and Follow-up Date
3. THE Launch_Ops_System SHALL provide a step-by-step manual research process using LinkedIn, Google Maps, Xero Advisor Directory, QuickBooks ProAdvisor Directory, FreeAgent Directory, local UK directories, and Facebook groups
4. THE Launch_Ops_System SHALL specify search queries and filters for each research source
5. THE Launch_Ops_System SHALL prioritise prospects who mention Xero, QuickBooks, or FreeAgent usage and serve sole trader or landlord clients

### Requirement 9: Outreach Messages

**User Story:** As the product owner, I want ready-to-send outreach messages for LinkedIn and email, so that I can contact prospects consistently with a professional, non-spammy tone.

#### Acceptance Criteria

1. THE Outreach_System SHALL include a LinkedIn connection request message of 300 characters or fewer
2. THE Outreach_System SHALL include a LinkedIn accepted follow-up message
3. THE Outreach_System SHALL include a cold email short version of 100 words or fewer
4. THE Outreach_System SHALL include a cold email detailed version of 200 words or fewer
5. THE Outreach_System SHALL include a follow-up email 1 sent 3 days after initial contact
6. THE Outreach_System SHALL include a follow-up email 2 sent 7 days after initial contact
7. THE Outreach_System SHALL include a "Can I send you the free tracker?" message
8. THE Outreach_System SHALL include a "Would you test the dashboard?" message
9. THE Outreach_System SHALL use English, short sentences, respectful tone, and avoid overuse of the term "AI"
10. THE Outreach_System SHALL validate the prospect's problem before introducing the product in each message sequence

### Requirement 10: Day-End Operational Checklist

**User Story:** As the product owner, I want a clear daily checklist of launch tasks, so that I can track progress and ensure nothing is missed each working day.

#### Acceptance Criteria

1. THE Day_End_Checklist SHALL present tasks in checkbox format grouped by workstream
2. THE Day_End_Checklist SHALL cover all 10 workstreams defined in this requirements document
3. THE Day_End_Checklist SHALL list tasks in priority order within each workstream group
4. THE Day_End_Checklist SHALL be completable within a single working day for a solo operator
5. WHEN all checklist items for a workstream are completed, THE Day_End_Checklist SHALL indicate that workstream as done
