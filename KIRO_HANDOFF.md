# Kiro Handoff — SEO & Marketing Improvements

**Session date:** 2026-05-20
**Handoff from:** Claude Code (Opus 4.7) → Kiro
**Next action for Kiro:** Review the changes below, run a final build check, then `git commit` + `git push`.

---

## What this session did

Halil asked for an audit of practicenudge.com (live site) and the UK MTD SEO landscape, then to apply fixes. Four code changes were made plus one strategic blocker was identified for Halil to resolve manually.

Strategic findings (saved to Claude Code's auto-memory, not in repo):
- **Sage MTD Agent** is the biggest competitor — free for Sage Accountants subscribers, does client segmentation + reminders + chasing. Direct overlap with PracticeNudge's value prop. Position non-Sage stacks.
- mtdnudge.com currently 301-redirects to practicenudge.com/mtd/ which renders the login form, not the lead magnet. SEO value of the second domain is wasted.

---

## Files changed

### Modified
1. **`src/app/blog/[slug]/page.tsx`** — Bug fix
   Post `mtd-client-readiness-checklist-2026` had wrong Q1 deadline (6 July 2026). 6 July is the end of the Q1 window, not the submission deadline. Replaced with correct submission deadlines for Q1–Q4 (7 Aug 2026, 7 Nov 2026, 7 Feb 2027, 7 May 2027) plus final declaration deadline (31 Jan 2028). The deadlines table in the `mtd-itsa-deadlines-2026-2027-2028` post was already correct and was not touched.

2. **`src/app/sitemap.ts`** — Sitemap fixes
   - Added `/mtd` (priority 0.9) — was missing despite live page
   - Added `/compare/sage-mtd-agent` (priority 0.8) — new page in this session
   - Bumped `lastModified` on `/` and `/blog` from 2025 dates to 2026-05-20 / 2026-05-15 (avoids Google stale-content signal)
   - Reordered for clarity: high-priority pages first

3. **`src/app/page.tsx`** — Banner integration
   - Imported new `DeadlineBanner` component
   - Added `export const revalidate = 3600;` so the days-remaining counter refreshes hourly (page is otherwise statically generated)
   - Rendered `<DeadlineBanner />` directly under `<WebsiteStructuredData />`, above the sticky nav

### Created
4. **`src/app/compare/sage-mtd-agent/page.tsx`** — New comparison landing page
   - Targets long-tail SEO: "Sage MTD Agent alternative", "Sage MTD Agent vs", "non-Sage MTD software"
   - 12-row feature comparison table with Check/Minus/X icons
   - Two positioning sections: "When Sage MTD Agent is the right choice" + "When PracticeNudge is the right choice"
   - Article schema JSON-LD for rich-result eligibility
   - Sage trademark disclaimer in footer (legal hygiene)
   - Tone: brand-guide compliant (UK English, direct, not salesy, no "AI-powered/revolutionary" language)

5. **`src/components/deadline-banner.tsx`** — New reusable component
   - Server component (no `"use client"`)
   - Hardcoded array of 4 MTD ITSA quarterly deadlines (Q1 2026 → Q4 2026)
   - `nextDeadline(now)` picks the first future deadline — banner auto-advances Q1 → Q2 → Q3 → Q4 → null
   - Visual urgency: amber theme when ≤30 days remaining, teal otherwise
   - Renders nothing if all four deadlines have passed (safe to leave in production indefinitely)

---

## Verification done in-session

```
npx tsc --noEmit          → No errors in any file I touched.
                            (Pre-existing errors in src/lib/admin/__tests__/actions.property.test.ts
                            are unrelated to this session.)
npx next lint --file ...  → ✔ No ESLint warnings or errors
```

No `next build` was run locally because pre-existing type errors in `src/lib/admin/__tests__/actions.property.test.ts` (Promise<void> vs `boolean | void` in fast-check predicates) would surface. Those errors predate this session and are not in the files I changed. The hosting platform's build pipeline should handle the production build as it has been.

**Hosting note:** Confirmed Vercel (per Halil 2026-05-20). `vercel.json` cron stays as-is.

---

## Suggested commit message

```
feat(seo): add Sage comparison page, MTD deadline banner, sitemap/blog fixes

- New /compare/sage-mtd-agent landing page with feature comparison table,
  positioning ("when Sage fits / when we fit"), and Article schema.
  Targets long-tail SEO and defends against the main free competitor.
- New DeadlineBanner server component on the landing page. Auto-advances
  through Q1-Q4 MTD ITSA submission deadlines; turns amber within 30 days.
  Page revalidates hourly so the day count stays accurate.
- Fix incorrect Q1 deadline in mtd-client-readiness-checklist-2026 blog
  post (was "6 July 2026", the window end; corrected to 7 August 2026,
  the actual submission deadline). Same fix applied to Q2-Q4 + final
  declaration row.
- Sitemap: add /mtd and /compare/sage-mtd-agent, refresh lastModified
  on homepage and blog index to 2026 dates.
```

If your house style is Conventional Commits with a different prefix (e.g. `chore`, `content`), adjust the type but keep the bullet list intact — each bullet maps to a deliberate change.

---

## Outstanding items for Halil (not done in this session)

These are out of scope for the commit but were identified during the audit:

1. **mtdnudge.com is wasted.** It 301s to practicenudge.com/mtd/ but that path renders a login form, not the lead-magnet page that actually exists in `src/app/mtd/page.tsx`. Two likely causes:
   - **Vercel Domain redirect rule:** Vercel Dashboard → practicenudge → Settings → Domains → mtdnudge.com. The forwarding target probably points at `/login` or hits middleware before reaching the page. Set it to `https://www.practicenudge.com/mtd`.
   - **Middleware interception:** `src/lib/supabase/middleware.ts`'s `updateSession` is invoked for every non-asset path by the matcher in `src/middleware.ts`. If `/mtd` is being treated as a protected route, the public lead-magnet page will redirect to login on first visit. Confirm `/mtd` is allowlisted as public.

   Goal: mtdnudge.com should reach the public lead-magnet page (Google Sheet download form), not a login wall.

2. **Localisation scope.** `src/messages/` has 10 locales (en, tr, de, es, fr, pa, pl, ro, ur, bn). For UK MTD targeting, Polish / Romanian / Urdu / Bengali / Punjabi map to UK immigrant accountant demographics — defensible. Turkish / German / Spanish / French likely have low ROI in this niche and dilute hreflang signals. Consider pruning to {en-GB, pl, ro, ur, bn, pa}. Not urgent.

3. **Compare-page series.** The `/compare/sage-mtd-agent` template can be replicated for `/compare/karbon`, `/compare/taxdome`, `/compare/senta` (Senta is the UK incumbent, IRIS-owned, ~£40-50/user/mo per Claude memory). Each compare page is a high-intent long-tail target.

---

## Context Kiro already has from steering

`.kiro/steering/project-context.md` already covers: tech stack (Next.js 14 + Supabase + Resend + Vercel), data hierarchy (Firm → firm_users → Clients → Requests), status cascade rules, GDPR consent flow, key files, env vars. No need to re-read those; this session's changes are isolated to public marketing surfaces (landing, blog, sitemap, new compare route) and do not touch the dashboard, auth, or database layer.
