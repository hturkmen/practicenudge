# Implementation Plan:

## Overview

This implementation plan covers the complete PracticeNudge launch operations across 10 workstreams, from DNS infrastructure through to outreach execution. Tasks are ordered by dependency and priority.

## Tasks

- [ ] 1. Create Cloudflare account and add practicenudge.com as a site on the Free plan
- [ ] 2. Update nameservers at domain registrar to Cloudflare-provided nameservers
- [ ] 3. Create Vercel project for the PracticeNudge landing page
- [ ] 4. Add practicenudge.com domain in Vercel project settings
- [ ] 5. Add A record (@→76.76.21.21) and CNAME (www→cname.vercel-dns.com) in Cloudflare with DNS-only mode
- [ ] 6. Verify domain in Vercel and confirm SSL certificate provisioning
- [ ] 7. Add mtdnudge.com to Cloudflare with placeholder A record (proxied)
- [ ] 8. Create Cloudflare Redirect Rule: mtdnudge.com → https://practicenudge.com/mtd (301)
- [ ] 9. Verify both domains resolve correctly using dig/nslookup
- [ ] 10. Sign up for Google Workspace Business Starter for practicenudge.com
- [ ] 11. Verify domain ownership in Google Admin via TXT record in Cloudflare
- [ ] 12. Add all 5 Google MX records in Cloudflare DNS
- [ ] 13. Add SPF TXT record: v=spf1 include:_spf.google.com ~all
- [ ] 14. Generate DKIM key in Google Admin and add TXT record in Cloudflare
- [ ] 15. Add DMARC TXT record: v=DMARC1; p=quarantine; rua=mailto:halil@practicenudge.com; pct=100
- [ ] 16. Create halil@practicenudge.com mailbox and hello@practicenudge.com alias
- [ ] 17. Send test emails to personal Gmail and verify delivery + authentication headers
- [ ] 18. Sign up for email warm-up tool (Instantly.ai free tier) and activate warm-up
- [ ] 19. Generate three wordmark options using Canva/Figma with provided prompts and colour palette
- [ ] 20. Select final wordmark option and export in PNG (transparent) and SVG formats
- [ ] 21. Document final colour palette hex codes and font choices in a brand-guide file
- [ ] 22. Create favicon (32x32, 16x16) from wordmark for website use
- [ ] 23. Set up landing page project (Next.js static export or HTML/Tailwind) in the Vercel project
- [ ] 24. Build hero section with headline, subheadline, and CTA button from design doc content
- [ ] 25. Build problem section with "Sound familiar?" content
- [ ] 26. Build solution section with dashboard benefits and bullet points
- [ ] 27. Build "How it works" three-step section
- [ ] 28. Build pricing/pilot offer section with early access details
- [ ] 29. Build FAQ section with 5 questions from design doc
- [ ] 30. Build footer with disclaimer text and basic links
- [ ] 31. Add navigation bar with logo, section links, and CTA button
- [ ] 32. Create sign-up/waitlist form (or link to Tally/Typeform)
- [ ] 33. Ensure mobile responsiveness and test on mobile viewport
- [ ] 34. Deploy to Vercel and verify live at practicenudge.com
- [ ] 35. Create /mtd route or page in the Vercel project
- [ ] 36. Build hero section with MTD-specific headline and lead magnet CTA
- [ ] 37. Build "What's inside" section describing the tracker template
- [ ] 38. Build lead capture form with fields: name, email, practice name, client count dropdown
- [ ] 39. Set up form submission handler (email delivery or direct Google Sheet link)
- [ ] 40. Build thank-you message with pilot waitlist upsell CTA
- [ ] 41. Test end-to-end: form submit → delivery → thank you display
- [ ] 42. Verify mtdnudge.com redirect lands on this page correctly
- [ ] 43. Create LinkedIn company page with name "PracticeNudge"
- [ ] 44. Add tagline, About section, website URL, industry, and company size from design doc
- [ ] 45. Upload wordmark as company logo and banner image
- [ ] 46. Publish first LinkedIn post using the ready-to-copy content from design doc
- [ ] 47. Create new Google Sheet named "MTD Client Readiness Tracker Template"
- [ ] 48. Set up "Client Tracker" tab with all 11 columns (A-K) and header formatting
- [ ] 49. Create "Dropdowns" tab with data validation lists for Client Type, Income Band, MTD Required, Current Software, MTD Status
- [ ] 50. Apply data validation dropdowns to columns B, C, D, E, F on Client Tracker tab
- [ ] 51. Add risk score formula to column J using the IF/AND logic from design doc
- [ ] 52. Apply conditional formatting to Risk Level column (red/yellow/green/grey)
- [ ] 53. Add 10 sample rows of dummy data from design doc
- [ ] 54. Create "Instructions" tab with usage guide and column explanations
- [ ] 55. Set sharing to "Anyone with link can view" and generate "Make a copy" link
- [ ] 56. Create lead research spreadsheet with all 12 columns from design doc
- [ ] 57. Research 40 leads from LinkedIn using provided search queries across 5 regions
- [ ] 58. Research 20 leads from Xero Advisor Directory across 5 regions
- [ ] 59. Research 15 leads from QuickBooks ProAdvisor Directory across 5 regions
- [ ] 60. Research 15 leads from Google Maps searches across 5 regions
- [ ] 61. Research 10 leads from FreeAgent Directory and local directories
- [ ] 62. Score all leads using prioritisation criteria and sort by score
- [ ] 63. Write personalised opener for each lead scoring 3+
- [ ] 64. Customise all 8 message templates with personal details and save as reusable templates
- [ ] 65. Begin LinkedIn connection requests (max 20/day) starting with highest-scored leads
- [ ] 66. Send follow-up messages to accepted connections using Message 2 template
- [ ] 67. Begin cold email outreach (5/day week 1) using Message 3 or 4 templates
- [ ] 68. Send Follow-up 1 (day 3) and Follow-up 2 (day 7) to non-responders
- [ ] 69. Send tracker offer (Message 7) to engaged prospects
- [ ] 70. Send pilot invitation (Message 8) to prospects who used the tracker
- [ ] 71. Track all outreach activity in lead spreadsheet with status and follow-up dates

## Task Dependency Graph

```
1 → 2 → 3 → 4 → 5 → 6 → 9
1 → 7 → 8 → 9
6 → 10 → 11 → 12,13,14,15 → 16 → 17 → 18
19 → 20 → 21,22
6,20 → 23 → 24,25,26,27,28,29,30,31 → 32 → 33 → 34
34 → 35 → 36,37,38 → 39 → 40 → 41 → 42
20 → 43 → 44 → 45 → 46
47 → 48 → 49 → 50 → 51 → 52 → 53 → 54 → 55
56 → 57,58,59,60,61 → 62 → 63
18,55,63 → 64 → 65 → 66
64 → 67 → 68 → 69 → 70
65,67 → 71
```

## Notes

- Tasks 1-9 (DNS) and 10-18 (Email) are the foundation — complete these first on Day 1
- Tasks 19-22 (Branding) can be done in parallel with DNS/Email setup
- Tasks 23-34 (Landing Page) depend on DNS being live and wordmark being ready
- Tasks 47-55 (Lead Magnet) can be done independently at any time
- Tasks 56-63 (Lead Research) is an ongoing daily activity — start on Day 2
- Tasks 64-71 (Outreach) should only begin after email warm-up has started and at least 20 leads are collected
- LinkedIn tasks (43-46) can be done as soon as the wordmark is ready
- The email warm-up (Task 18) takes 4 weeks to reach full volume — start immediately
