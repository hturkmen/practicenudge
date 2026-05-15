# Implementation Plan:

## Overview

This implementation plan covers the complete PracticeNudge launch operations across 10 workstreams, from DNS infrastructure through to outreach execution. Tasks are ordered by dependency and priority.

## Tasks

- [x] 1. Create Cloudflare account and add practicenudge.com as a site on the Free plan
- [x] 2. Update nameservers at domain registrar to Cloudflare-provided nameservers
- [x] 3. Create Vercel project for the PracticeNudge landing page
- [x] 4. Add practicenudge.com domain in Vercel project settings
- [x] 5. Add A record (@→76.76.21.21) and CNAME (www→cname.vercel-dns.com) in Cloudflare with DNS-only mode
- [x] 6. Verify domain in Vercel and confirm SSL certificate provisioning
- [x] 7. Add mtdnudge.com to Cloudflare with placeholder A record (proxied)
- [x] 8. Create Cloudflare Redirect Rule: mtdnudge.com → https://practicenudge.com/mtd (301)
- [x] 9. Verify both domains resolve correctly using dig/nslookup
- [x] 10. Set up email forwarding via Cloudflare Email Routing (hello@ and halil@ → halil.turkmen@gmail.com)
- [x] 11. Configure SPF record for email forwarding
- [x] 12. Verify email delivery to personal Gmail
- [ ] 13. Sign up for email warm-up tool (Instantly.ai free tier) and activate warm-up
- [ ] 14. Generate three wordmark options using Canva/Figma with provided prompts and colour palette
- [ ] 15. Select final wordmark option and export in PNG (transparent) and SVG formats
- [ ] 16. Document final colour palette hex codes and font choices in a brand-guide file
- [ ] 17. Create favicon (32x32, 16x16) from wordmark for website use
- [x] 18. Set up landing page project (Next.js App Router + Tailwind + shadcn/ui) in the Vercel project
- [x] 19. Build hero section with headline, subheadline, and CTA button from design doc content
- [x] 20. Build problem section with "Sound familiar?" content
- [x] 21. Build solution section with dashboard benefits and bullet points
- [x] 22. Build "How it works" three-step section
- [x] 23. Build pricing/pilot offer section with early access details
- [x] 24. Build FAQ section with 5 questions from design doc
- [x] 25. Build footer with disclaimer text and basic links
- [x] 26. Add navigation bar with logo, section links, and CTA button
- [x] 27. Create sign-up/waitlist form (linked to /register)
- [ ] 28. Ensure mobile responsiveness and test on mobile viewport
- [x] 29. Deploy to Vercel and verify live at practicenudge.com
- [x] 30. Create /mtd route or page in the Vercel project
- [x] 31. Build hero section with MTD-specific headline and lead magnet CTA
- [x] 32. Build "What's inside" section describing the tracker template
- [x] 33. Build lead capture form with fields: name, email, practice name, client count dropdown
- [ ] 34. Set up form submission handler (email delivery or direct Google Sheet link)
- [x] 35. Build thank-you message with pilot waitlist upsell CTA
- [ ] 36. Test end-to-end: form submit → delivery → thank you display
- [ ] 37. Verify mtdnudge.com redirect lands on this page correctly
- [ ] 38. Create LinkedIn company page with name "PracticeNudge"
- [ ] 39. Add tagline, About section, website URL, industry, and company size from design doc
- [ ] 40. Upload wordmark as company logo and banner image
- [ ] 41. Publish first LinkedIn post using the ready-to-copy content from design doc
- [ ] 42. Create new Google Sheet named "MTD Client Readiness Tracker Template"
- [ ] 43. Set up "Client Tracker" tab with all 11 columns (A-K) and header formatting
- [ ] 44. Create "Dropdowns" tab with data validation lists for Client Type, Income Band, MTD Required, Current Software, MTD Status
- [ ] 45. Apply data validation dropdowns to columns B, C, D, E, F on Client Tracker tab
- [ ] 46. Add risk score formula to column J using the IF/AND logic from design doc
- [ ] 47. Apply conditional formatting to Risk Level column (red/yellow/green/grey)
- [ ] 48. Add 10 sample rows of dummy data from design doc
- [ ] 49. Create "Instructions" tab with usage guide and column explanations
- [ ] 50. Set sharing to "Anyone with link can view" and generate "Make a copy" link
- [ ] 51. Create lead research spreadsheet with all 12 columns from design doc
- [ ] 52. Research 40 leads from LinkedIn using provided search queries across 5 regions
- [ ] 53. Research 20 leads from Xero Advisor Directory across 5 regions
- [ ] 54. Research 15 leads from QuickBooks ProAdvisor Directory across 5 regions
- [ ] 55. Research 15 leads from Google Maps searches across 5 regions
- [ ] 56. Research 10 leads from FreeAgent Directory and local directories
- [ ] 57. Score all leads using prioritisation criteria and sort by score
- [ ] 58. Write personalised opener for each lead scoring 3+
- [ ] 59. Customise all 8 message templates with personal details and save as reusable templates
- [ ] 60. Begin LinkedIn connection requests (max 20/day) starting with highest-scored leads
- [ ] 61. Send follow-up messages to accepted connections using Message 2 template
- [ ] 62. Begin cold email outreach (5/day week 1) using Message 3 or 4 templates
- [ ] 63. Send Follow-up 1 (day 3) and Follow-up 2 (day 7) to non-responders
- [ ] 64. Send tracker offer (Message 7) to engaged prospects
- [ ] 65. Send pilot invitation (Message 8) to prospects who used the tracker
- [ ] 66. Track all outreach activity in lead spreadsheet with status and follow-up dates

## Task Dependency Graph

```
1-9 (DNS) ✅ DONE
10-12 (Email Forwarding) ✅ DONE
13 (Warm-up) → pending
14-17 (Branding) → pending
18-29 (Landing Page) → mostly done, mobile test pending
30-37 (MTD Landing) → mostly done, form handler + redirect test pending
38-41 (LinkedIn) → pending
42-50 (Lead Magnet Sheet) → pending
51-58 (Lead Research) → pending
59-66 (Outreach) → pending (depends on 13, 50, 58)
```

## Progress Summary

**Completed: 27/66 tasks**
**Remaining: 39 tasks**

### What's done:
- ✅ DNS & Hosting (Cloudflare + Vercel + domains)
- ✅ Email forwarding (Cloudflare → Gmail)
- ✅ Supabase (new project, tables, auth, Google OAuth)
- ✅ Landing page (full PracticeNudge rebrand with all sections)
- ✅ /mtd lead magnet page (form UI + thank you)
- ✅ GitHub repo (hturkmen/practicenudge, auto-deploy to Vercel)
- ✅ Dashboard app (clients, requests, templates — working)

### What's next (priority order):
1. Form handler for /mtd (connect to email or sheet)
2. Mobile responsiveness check
3. mtdnudge.com redirect verification
4. Branding (wordmark, favicon)
5. LinkedIn company page
6. Lead magnet Google Sheet
7. Lead research
8. Outreach

## Notes

- Email setup changed from Google Workspace to Cloudflare Email Routing (forwarding to halil.turkmen@gmail.com)
- Original task list was 71 items, consolidated to 66 after email simplification
- Supabase project: eyjvlbggkcaugcwznwru (Europe region)
- GitHub: hturkmen/practicenudge (private)
- Vercel: hermesyazilim team, practicenudge project
