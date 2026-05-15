# Design Document: PracticeNudge Launch Operations

## Overview

Launch PracticeNudge with a lean, solo-operator approach: get domains live, establish professional email, create a compelling landing page, build a lead magnet, and start outreach within the first week. Priority order: DNS/email (foundation) → landing pages (credibility) → brand/LinkedIn (presence) → lead magnet (value offer) → lead list + outreach (revenue).

**Key decisions made:**
- Cloudflare for DNS (free, fast propagation, email routing)
- Vercel for hosting (free tier, instant deploys, SSL included)
- Google Workspace for email (best deliverability for cold outreach)
- mtdnudge.com redirects to practicenudge.com/mtd (simpler to maintain)
- Wordmark-only branding (professional, no icon needed at this stage)

**Implementation Priority Order:**

| Priority | Workstream | Why First |
|----------|-----------|-----------|
| 1 | DNS & Hosting | Foundation — everything else depends on domains working |
| 2 | Email Setup | Needed before any outreach; warm-up takes time |
| 3 | Brand/Wordmark | Quick win; needed for landing page and LinkedIn |
| 4 | Landing Page | Credibility — gives outreach somewhere to point |
| 5 | LinkedIn Page | Social proof; takes 15 minutes |
| 6 | Lead Magnet Sheet | Value offer for outreach; takes 30-60 minutes |
| 7 | MTD Landing Page | Lead capture funnel for the magnet |
| 8 | Lead Research | Start building the list (ongoing daily task) |
| 9 | Outreach Messages | Ready to send once list has 20+ leads |
| 10 | Day-End Checklist | Use from day 1 to track everything above |

## Architecture

### Infrastructure Architecture

```
practicenudge.com (Cloudflare DNS) → Vercel (Next.js/static site)
mtdnudge.com (Cloudflare DNS) → 301 redirect to practicenudge.com/mtd
Email: practicenudge.com → Google Workspace MX records
```

### DNS Flow

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Domain Registrar│────▶│  Cloudflare  │────▶│     Vercel      │
│  (nameservers)   │     │  (DNS + Rules)│     │  (hosting + SSL)│
└─────────────────┘     └──────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │   Google     │
                        │  Workspace   │
                        │  (email MX)  │
                        └──────────────┘
```

### Email Delivery Flow

```
halil@practicenudge.com (Google Workspace)
        │
        ▼
┌─────────────────────────────────────┐
│  Authentication Chain:              │
│  SPF → DKIM → DMARC                │
│  (all via Cloudflare TXT records)   │
└─────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────┐
│  Warm-up Schedule:                  │
│  Week 1: 5/day → Week 4: 30/day    │
└─────────────────────────────────────┘
```

### Outreach Funnel Flow

```
Lead Research (100 prospects)
        │
        ▼
LinkedIn Connection Request / Cold Email
        │
        ▼
Follow-up Messages (Day 3, Day 7)
        │
        ▼
Lead Magnet Offer (Free Tracker)
        │
        ▼
Pilot Invitation (Dashboard Access)
```

## Components and Interfaces

### Component 1: Cloudflare/Vercel DNS Configuration

#### Deliverables
- Cloudflare DNS zones for practicenudge.com and mtdnudge.com
- Vercel domain connection with SSL
- mtdnudge.com redirect rule
- Email DNS records (MX, SPF, DKIM, DMARC)

#### Step-by-Step Instructions

##### 1.1 Cloudflare Setup for practicenudge.com

1. Log into Cloudflare → Add site → Enter `practicenudge.com`
2. Select Free plan
3. Cloudflare provides two nameservers — update these at your domain registrar
4. Wait for nameserver propagation (usually 15-60 minutes)

##### 1.2 Vercel Connection for practicenudge.com

1. In Vercel dashboard → Project Settings → Domains → Add `practicenudge.com`
2. Vercel will show required DNS records. Add these in Cloudflare:

```
Type: A
Name: @
Value: 76.76.21.21
Proxy: DNS only (grey cloud) ⚠️ IMPORTANT
TTL: Auto

Type: CNAME
Name: www
Value: cname.vercel-dns.com
Proxy: DNS only (grey cloud) ⚠️ IMPORTANT
TTL: Auto
```

⚠️ **CRITICAL**: Set proxy status to "DNS only" (grey cloud icon). Orange cloud causes SSL conflicts with Vercel.

3. Back in Vercel, click "Verify" — should confirm within minutes
4. Vercel auto-provisions SSL certificate

##### 1.3 mtdnudge.com Redirect Setup

1. Add `mtdnudge.com` to Cloudflare (same process as above)
2. Add a placeholder A record:

```
Type: A
Name: @
Value: 192.0.2.1
Proxy: Proxied (orange cloud)
TTL: Auto
```

3. Go to Rules → Redirect Rules → Create Rule:
   - Rule name: "Redirect to practicenudge.com/mtd"
   - When: Hostname equals `mtdnudge.com` OR `www.mtdnudge.com`
   - Then: Dynamic redirect to `https://practicenudge.com/mtd`
   - Status code: 301 (permanent)
   - Preserve query string: Yes

##### 1.4 Email DNS Records

```
Type: MX  Name: @  Value: ASPMX.L.GOOGLE.COM        Priority: 1
Type: MX  Name: @  Value: ALT1.ASPMX.L.GOOGLE.COM   Priority: 5
Type: MX  Name: @  Value: ALT2.ASPMX.L.GOOGLE.COM   Priority: 5
Type: MX  Name: @  Value: ALT3.ASPMX.L.GOOGLE.COM   Priority: 10
Type: MX  Name: @  Value: ALT4.ASPMX.L.GOOGLE.COM   Priority: 10

Type: TXT  Name: @  Value: "v=spf1 include:_spf.google.com ~all"
Type: TXT  Name: google._domainkey  Value: [Generated by Google Workspace]
Type: TXT  Name: _dmarc  Value: "v=DMARC1; p=quarantine; rua=mailto:halil@practicenudge.com; pct=100"
```

#### Risk Warnings

- ⚠️ Never use orange cloud (Cloudflare proxy) for Vercel domains — causes infinite redirect loops
- ⚠️ DNS propagation can take up to 48 hours in rare cases — plan accordingly
- ⚠️ Do not add email DNS records until the email provider is fully configured
- ⚠️ Test with `dig practicenudge.com` and `dig mx practicenudge.com` after changes

---

### Component 2: practicenudge.com Landing Page

#### Deliverables
- Fully deployed landing page on Vercel
- Hero, Problem, Solution, How It Works, Pricing, FAQ, and Footer sections
- CTA linked to sign-up/waitlist form

#### Page Structure

```
[Navigation: Logo | Features | Pricing | FAQ | CTA button]
[Hero Section]
[Problem Section]
[Solution Section]
[How It Works - 3 steps]
[Pricing / Pilot Offer]
[FAQ]
[Final CTA]
[Footer with disclaimer]
```

#### Ready-to-Copy Content

**Hero Headline:**
```
Stop chasing clients for MTD information.
```

**Hero Subheadline:**
```
PracticeNudge shows you which clients are MTD-ready, what's missing, and who needs a nudge — all in one dashboard built for small UK practices.
```

**CTA Button:**
```
Join the Early Access Pilot
```

**Problem Section Heading:**
```
Sound familiar?
```

**Problem Section Body:**
```
You're spending hours every week chasing clients for missing records. Spreadsheets are out of date. You don't know which clients are MTD-ready and which are going to be a last-minute scramble.

Meanwhile, HMRC deadlines keep moving closer.

For small practices without a dedicated ops team, keeping track of 50-200 clients' MTD readiness is a manual, repetitive headache.
```

**Solution Section Heading:**
```
One dashboard. Every client. No more guessing.
```

**Solution Section Body:**
```
PracticeNudge gives you a clear view of every client's MTD readiness status, missing information, and follow-up schedule.

• See who's ready, who's at risk, and who needs chasing
• Track missing documents and information per client
• Set follow-up reminders so nothing slips through
• Built specifically for small UK accountants and bookkeepers using Xero, QuickBooks, or FreeAgent
```

**How It Works Heading:**
```
Three steps to stop the chase
```

**How It Works Steps:**
```
1. Connect your practice — Import your client list or add clients manually. Takes 5 minutes.
2. See the full picture — Instantly see MTD readiness status, missing info, and risk levels for every client.
3. Nudge and track — Set follow-up reminders, send nudges, and watch clients move from "at risk" to "ready."
```

**Pricing Heading:**
```
Early Access Pilot
```

**Pricing Body:**
```
We're looking for 10 small UK practices to test PracticeNudge and shape the product.

Pilot includes:
• Full dashboard access during the pilot period
• Direct input into features and priorities
• Founding member pricing when we launch (locked in permanently)
• No commitment — leave anytime

Price during pilot: Free
Price at launch: From £29/month (pilot members get 50% off forever)
```

**Pricing CTA:**
```
Apply for the Pilot →
```

**FAQ:**
```
Q: Is this tax filing software?
A: No. PracticeNudge does not file taxes or submit anything to HMRC. It's a tracking and chasing tool that sits alongside your existing software.

Q: Does it replace Xero / QuickBooks / FreeAgent?
A: No. PracticeNudge works with your existing accounting software. It tracks client readiness and follow-ups — your accounting software handles the numbers.

Q: How is this different from a spreadsheet?
A: Spreadsheets go stale. PracticeNudge gives you live status tracking, automated reminders, and a clear view without manual updates.

Q: Is my data safe?
A: Yes. All data is encrypted in transit and at rest. We follow UK data protection standards and never share your client information.

Q: What size practice is this for?
A: PracticeNudge is built for sole practitioners and small practices with 20-200 clients. If you're too small for enterprise tools but too busy for spreadsheets, this is for you.
```

**Footer Disclaimer:**
```
PracticeNudge is a client readiness tracking and follow-up tool. It is not tax filing software, does not submit data to HMRC, and does not provide tax, legal, or financial advice. Always consult a qualified professional for tax matters.
```
