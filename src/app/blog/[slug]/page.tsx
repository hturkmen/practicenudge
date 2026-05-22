import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import type { Metadata } from "next";

type Props = { params: { slug: string } };

const posts: Record<string, {
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
  content: string;
  keywords: string[];
}> = {
  "mtd-client-readiness-checklist-2026": {
    title: "MTD Client Readiness Checklist for 2026: What Every Small Practice Needs",
    excerpt: "A practical checklist for UK accountants to assess which clients are MTD-ready, what documents are missing, and how to prioritise your workload before HMRC deadlines.",
    date: "2026-05-10",
    category: "MTD Compliance",
    readTime: "8 min read",
    keywords: ["MTD readiness checklist", "MTD 2026", "client readiness", "UK accountants", "Making Tax Digital checklist"],
    content: `Making Tax Digital for Income Tax (MTD ITSA) is now live. Since 6 April 2026, sole traders and landlords with qualifying income over £50,000 must keep digital records and submit quarterly updates to HMRC.

For small practices managing 50–200 clients, the challenge is not understanding MTD — it is tracking which clients are ready and which are not.

## Who Needs to Comply Now?

**From April 2026 (NOW):** Sole traders and landlords with total qualifying income over £50,000 in the 2024/25 tax year.

**From April 2027:** Those with income over £30,000.

**From April 2028:** Those with income over £20,000.

## The Client Readiness Checklist

For each client, you need to confirm:

### 1. Income Threshold Assessment
- [ ] Total self-employment income calculated
- [ ] Total property income calculated
- [ ] Combined income checked against current threshold (£50k)
- [ ] Client notified of their MTD obligation status

### 2. Digital Record Keeping
- [ ] Client has MTD-compatible software (Xero, QuickBooks, FreeAgent, etc.)
- [ ] Software is connected to HMRC
- [ ] Client understands quarterly submission requirements
- [ ] Digital records are being maintained (not paper)

### 3. Agent Authorisation
- [ ] Agent authorisation submitted to HMRC for MTD ITSA
- [ ] Authorisation confirmed and active
- [ ] Client's Government Gateway credentials available if needed

### 4. Missing Information
- [ ] Bank statements accessible digitally
- [ ] Property income records complete
- [ ] Expense receipts digitised
- [ ] Mileage logs maintained
- [ ] Capital allowances documented

### 5. Quarterly Submission Schedule
- [ ] Q1 submission deadline noted (7 August 2026 for first cohort, covering 6 Apr–5 Jul)
- [ ] Q2 submission deadline noted (7 November 2026, covering 6 Jul–5 Oct)
- [ ] Q3 submission deadline noted (7 February 2027, covering 6 Oct–5 Jan)
- [ ] Q4 submission deadline noted (7 May 2027, covering 6 Jan–5 Apr)
- [ ] Final declaration deadline noted (31 January 2028)

## The Problem With Spreadsheets

Most small practices track this in Excel or Google Sheets. This works for 10 clients. It breaks down at 50+.

Common problems:
- Spreadsheets go stale within days
- No automated reminders when deadlines approach
- No way for clients to self-serve (upload documents)
- No audit trail of what was chased and when
- Multiple team members editing creates conflicts

## A Better Approach

Instead of maintaining a spreadsheet, consider a dedicated tracking tool that:

1. **Shows status at a glance** — which clients are ready, at risk, or overdue
2. **Sends automated reminders** — so you are not manually chasing every week
3. **Provides upload links** — clients can submit documents without email attachments
4. **Tracks history** — see when reminders were sent and documents received

## Getting Started

If you manage a small UK practice and want to stop the manual chase, PracticeNudge offers a free pilot programme specifically for this problem. No tax filing, no HMRC submissions — just clear tracking of who is ready and who needs a nudge.

[Join the free pilot →](https://www.practicenudge.com/register)`,
  },
  "how-to-track-mtd-compliance-small-practice": {
    title: "How to Track MTD Compliance Across 50–200 Clients Without Spreadsheets",
    excerpt: "Spreadsheets break down at scale. Here's how small practices can track MTD readiness, missing documents, and follow-ups without the manual overhead.",
    date: "2026-05-05",
    category: "Practice Management",
    readTime: "6 min read",
    keywords: ["MTD compliance tracking", "practice management", "client tracking tool", "accountant productivity"],
    content: `If you run a small UK practice with 50 to 200 clients, you have probably already felt the pain of MTD tracking.

## The Scale Problem

At 10 clients, a spreadsheet works fine. You know each client personally, you remember who has sent what, and deadlines are manageable.

At 50+ clients, everything changes:
- You cannot remember who you chased last week
- Deadlines overlap and things slip through
- Team members duplicate effort or miss clients entirely
- Clients email documents that get lost in inboxes

## What You Actually Need to Track

For each client under MTD, you need visibility on:

1. **Readiness status** — Are they set up with compatible software?
2. **Missing documents** — What specific items are outstanding?
3. **Follow-up schedule** — When was the last reminder sent?
4. **Deadline proximity** — Which clients are approaching their quarterly deadline?

## Why Spreadsheets Fail

| Problem | Impact |
|---------|--------|
| No automated reminders | You spend hours manually chasing |
| Stale data | Status is always out of date |
| No client self-service | Every document comes via email |
| No audit trail | Cannot prove you chased a client |
| Single point of failure | One person holds all the knowledge |

## The Alternative

Modern practice management for MTD does not require expensive enterprise software. What small practices need is:

- A simple dashboard showing all clients and their status
- Automated email reminders on a schedule you control
- Magic links that let clients upload documents directly
- A history of all communications and submissions

## Taking Action

The practices that will thrive under MTD are those that systematise their client communication early. Whether you build your own system or use a tool like PracticeNudge, the key is moving away from reactive chasing toward proactive tracking.

[Try PracticeNudge free →](https://www.practicenudge.com/register)`,
  },
  "stop-chasing-clients-mtd-documents": {
    title: "Stop Chasing Clients for MTD Documents: Automated Reminders That Work",
    excerpt: "Most accountants spend 5+ hours per week chasing clients for missing records. Learn how automated reminders and magic upload links can cut that to minutes.",
    date: "2026-04-28",
    category: "Productivity",
    readTime: "5 min read",
    keywords: ["client chasing", "automated reminders", "document collection", "accountant productivity", "MTD documents"],
    content: `Every accountant knows the feeling. You send an email asking for documents. Nothing. You follow up a week later. Still nothing. You call. They promise to send it tomorrow. Tomorrow never comes.

## The Hidden Cost of Chasing

Research from practice management consultants suggests the average small practice spends 5–8 hours per week on client chasing. That is:
- 250+ hours per year
- The equivalent of 6 working weeks
- Time that could be spent on billable work or business development

## Why Clients Do Not Respond

It is rarely malicious. Clients do not respond because:
1. **The email gets buried** — they intend to do it later and forget
2. **They do not know what you need** — vague requests get ignored
3. **It feels like effort** — finding and attaching files is friction
4. **No urgency** — without a clear deadline, it drops down their list

## What Actually Works

### 1. Be Specific
Instead of "please send your records", list exactly what you need:
- P60 for 2024/25
- Bank statements (April–June 2025)
- Rental income summary

### 2. Make It Easy
Give clients a single link where they can upload files. No email attachments, no portals with passwords they have forgotten.

### 3. Automate the Follow-Up
Set reminders that go out automatically:
- First reminder: 2 weeks before deadline
- Second reminder: 1 week before
- Overdue notice: 1 day after deadline

### 4. Show Progress
When clients can see "3 of 5 documents uploaded", it creates momentum. They want to complete the list.

## The PracticeNudge Approach

PracticeNudge combines all four principles:
- **Specific checklists** per client with named documents
- **Magic upload links** — one click, drag and drop, done
- **Automated reminders** on your schedule
- **Progress tracking** visible to both you and the client

The result: less chasing, more compliance, happier clients.

[Start your free trial →](https://www.practicenudge.com/register)`,
  },
  "mtd-itsa-deadlines-2026-2027-2028": {
    title: "MTD ITSA Deadlines: Complete Timeline for 2026, 2027, and 2028",
    excerpt: "The full timeline of Making Tax Digital for Income Tax thresholds — £50k (April 2026), £30k (April 2027), £20k (April 2028) — and what each means for your practice.",
    date: "2026-04-20",
    category: "MTD Compliance",
    readTime: "7 min read",
    keywords: ["MTD ITSA deadlines", "MTD timeline", "Making Tax Digital 2026", "MTD thresholds", "HMRC deadlines"],
    content: `Making Tax Digital for Income Tax Self Assessment (MTD ITSA) is rolling out in phases. Here is the complete timeline every UK accountant needs to know.

## Phase 1: April 2026 (NOW LIVE)

**Who:** Sole traders and landlords with qualifying income over £50,000 (based on 2024/25 tax year).

**What they must do:**
- Keep digital records using MTD-compatible software
- Submit quarterly updates to HMRC
- File an End of Period Statement (EOPS)
- Submit a final declaration (replacing the Self Assessment return)

**Quarterly deadlines for 2026/27:**
| Quarter | Period | Deadline |
|---------|--------|----------|
| Q1 | 6 Apr – 5 Jul 2026 | 7 Aug 2026 |
| Q2 | 6 Jul – 5 Oct 2026 | 7 Nov 2026 |
| Q3 | 6 Oct – 5 Jan 2027 | 7 Feb 2027 |
| Q4 | 6 Jan – 5 Apr 2027 | 7 May 2027 |

## Phase 2: April 2027

**Who:** Sole traders and landlords with qualifying income over £30,000 (based on 2025/26 tax year).

**Impact on practices:** This roughly doubles the number of affected clients. Practices should begin preparing these clients now.

## Phase 3: April 2028

**Who:** Sole traders and landlords with qualifying income over £20,000 (based on 2026/27 tax year).

**Impact on practices:** This brings in the majority of self-employed clients. For a typical small practice, this could mean 60–80% of your client base is under MTD.

## What This Means for Your Practice

### Client Segmentation Is Critical

You need to know, right now:
- How many clients fall into each threshold band
- Which are already set up with compatible software
- Which still need agent authorisation
- Which have gaps in their digital records

### The Workload Compounds

Each phase adds more clients while you are still managing quarterly submissions for the previous cohort. By 2028, you could be managing quarterly submissions for 100+ clients simultaneously.

### Start Tracking Now

The practices that will manage this smoothly are those that:
1. Segment their client base by income threshold today
2. Track readiness status systematically (not in their head)
3. Automate client communications where possible
4. Build processes that scale from 20 clients to 200

## How PracticeNudge Helps

PracticeNudge gives you a single dashboard showing every client's MTD readiness status, missing documents, and follow-up schedule. No spreadsheets, no guessing.

[Join the free pilot →](https://www.practicenudge.com/register)`,
  },
  "sole-trader-landlord-mtd-what-accountants-need": {
    title: "Sole Traders & Landlords Under MTD: What Accountants Need to Prepare",
    excerpt: "Your sole trader and landlord clients face MTD obligations now. Here's what information you need from them, common gaps, and how to get ahead.",
    date: "2026-04-15",
    category: "Client Management",
    readTime: "6 min read",
    keywords: ["sole trader MTD", "landlord MTD", "MTD preparation", "accountant client management", "MTD documents needed"],
    content: `MTD for Income Tax affects two main groups: sole traders and landlords. Each has different document requirements and common gaps.

## Sole Traders: What You Need

### Essential Documents
- Trading income records (invoices, sales records)
- Business expense receipts (categorised)
- Bank statements for business accounts
- Mileage logs (if claiming vehicle expenses)
- Home office calculations (if applicable)
- Capital allowances schedule

### Common Gaps
1. **Mixed personal/business accounts** — clients who do not separate finances
2. **Paper receipts only** — no digital copies available
3. **Irregular record keeping** — months of catch-up needed each quarter
4. **No compatible software** — still using paper or basic spreadsheets

## Landlords: What You Need

### Essential Documents
- Rental income records (tenancy agreements, rent received)
- Property expense receipts (repairs, maintenance, insurance)
- Mortgage interest statements
- Agent statements (if using letting agents)
- Capital improvements vs repairs classification

### Common Gaps
1. **Multiple properties, no central record** — information scattered
2. **Letting agent statements not reconciled** — discrepancies between agent reports and bank
3. **Capital vs revenue confusion** — clients unsure what counts as an improvement
4. **Shared ownership complications** — joint landlords with different reporting needs

## The Conversation to Have Now

For each affected client, you need to:

1. **Confirm their obligation** — "Based on your 2024/25 income of £X, you are now required to comply with MTD for Income Tax."

2. **Assess their setup** — "Do you currently use accounting software? Is it MTD-compatible?"

3. **Identify gaps** — "To submit your Q1 update by August, I need the following from you: [specific list]"

4. **Set expectations** — "You will receive quarterly reminders from us. Please respond within 7 days to avoid delays."

## Systematising the Process

With 50+ clients in this position, you cannot have these conversations ad hoc. You need:
- A checklist per client type (sole trader vs landlord)
- A tracking system showing who has been contacted
- Automated follow-ups for non-responders
- A simple way for clients to submit documents

## Getting Ahead

The accountants who are thriving under MTD are those who treated it as a process problem, not just a compliance problem. They built systems early, automated what they could, and focused their time on the clients who genuinely need help.

PracticeNudge was built specifically for this workflow. Track readiness, send reminders, collect documents — without the spreadsheet overhead.

[Try it free →](https://www.practicenudge.com/register)`,
  },
};

export async function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = posts[params.slug];
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: ["PracticeNudge"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
    alternates: {
      canonical: `https://www.practicenudge.com/blog/${params.slug}`,
    },
  };
}

export default function BlogPost({ params }: Props) {
  const post = posts[params.slug];
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-lg font-bold text-primary">PracticeNudge</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
            <Link href="/register" className="text-primary font-medium">Free Trial</Link>
          </div>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to blog
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="secondary">{post.category}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="text-sm text-muted-foreground">{post.readTime}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{post.title}</h1>
          <p className="text-lg text-muted-foreground">{post.excerpt}</p>
        </header>

        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:text-base prose-li:text-base">
          {post.content.split("\n\n").map((block, i) => {
            if (block.startsWith("## ")) {
              return <h2 key={i} className="text-2xl font-bold mt-8 mb-4">{block.replace("## ", "")}</h2>;
            }
            if (block.startsWith("### ")) {
              return <h3 key={i} className="text-xl font-semibold mt-6 mb-3">{block.replace("### ", "")}</h3>;
            }
            if (block.startsWith("| ")) {
              const rows = block.split("\n").filter(r => !r.startsWith("|--"));
              const headers = rows[0]?.split("|").filter(Boolean).map(h => h.trim());
              const data = rows.slice(1).map(r => r.split("|").filter(Boolean).map(c => c.trim()));
              return (
                <div key={i} className="overflow-x-auto my-4">
                  <table className="w-full text-sm border">
                    <thead><tr className="bg-gray-50">{headers?.map((h, j) => <th key={j} className="border px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
                    <tbody>{data.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="border px-3 py-2">{cell}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              );
            }
            if (block.startsWith("- [ ]") || block.startsWith("- **")) {
              const items = block.split("\n");
              return (
                <ul key={i} className="space-y-1 my-4 list-disc pl-5">
                  {items.map((item, j) => (
                    <li key={j} className="text-sm">{item.replace(/^- \[.\] /, "").replace(/^- /, "")}</li>
                  ))}
                </ul>
              );
            }
            if (block.startsWith("1. ")) {
              const items = block.split("\n");
              return (
                <ol key={i} className="space-y-1 my-4 list-decimal pl-5">
                  {items.map((item, j) => (
                    <li key={j} className="text-sm">{item.replace(/^\d+\. /, "")}</li>
                  ))}
                </ol>
              );
            }
            if (block.includes("[") && block.includes("](")) {
              const match = block.match(/\[(.+?)\]\((.+?)\)/);
              if (match) {
                return (
                  <p key={i} className="my-4">
                    <Link href={match[2]} className="text-primary font-medium hover:underline">
                      {match[1]}
                    </Link>
                  </p>
                );
              }
            }
            return <p key={i} className="my-4 text-muted-foreground leading-relaxed">{block}</p>;
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 p-6 bg-primary/5 rounded-lg border border-primary/20 text-center">
          <h3 className="text-xl font-bold mb-2">Ready to stop chasing clients?</h3>
          <p className="text-muted-foreground mb-4">
            PracticeNudge tracks MTD readiness, sends reminders, and collects documents — free during pilot.
          </p>
          <Link href="/register">
            <Button>
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Related articles */}
        <div className="mt-10 pt-8 border-t">
          <h3 className="text-lg font-bold mb-4">Related articles</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {Object.entries(posts)
              .filter(([slug]) => slug !== params.slug)
              .slice(0, 4)
              .map(([slug, relatedPost]) => (
                <Link key={slug} href={`/blog/${slug}`} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                  <Badge variant="secondary" className="text-xs mb-2">{relatedPost.category}</Badge>
                  <h4 className="text-sm font-semibold line-clamp-2">{relatedPost.title}</h4>
                </Link>
              ))}
          </div>
        </div>

        {/* Free tracker CTA */}
        <div className="mt-8 p-4 bg-slate-50 rounded-lg border text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Want a free spreadsheet to track all of this?
          </p>
          <Link href="/mtd" className="text-sm text-primary font-medium hover:underline">
            Download the free MTD Client Readiness Tracker →
          </Link>
        </div>

        {/* Article structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: post.title,
              description: post.excerpt,
              datePublished: post.date,
              author: { "@type": "Organization", name: "PracticeNudge" },
              publisher: { "@type": "Organization", name: "PracticeNudge", url: "https://www.practicenudge.com" },
              mainEntityOfPage: `https://www.practicenudge.com/blog/${params.slug}`,
            }),
          }}
        />
        {/* Breadcrumb structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.practicenudge.com" },
                { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.practicenudge.com/blog" },
                { "@type": "ListItem", position: 3, name: post.title, item: `https://www.practicenudge.com/blog/${params.slug}` },
              ],
            }),
          }}
        />
      </article>
    </div>
  );
}
