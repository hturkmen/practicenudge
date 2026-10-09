import Link from "next/link";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Check, X, Minus } from "lucide-react";

export const metadata: Metadata = {
  title: "PracticeNudge vs Sage MTD Agent — Which is Right for Your Practice?",
  description:
    "Comparing PracticeNudge and Sage MTD Agent for UK accountants. Where Sage fits, where PracticeNudge fits, and how to choose if your clients use Xero, QuickBooks, FreeAgent, or a mix.",
  keywords: [
    "Sage MTD Agent alternative",
    "Sage MTD Agent review",
    "PracticeNudge vs Sage",
    "MTD agent software comparison",
    "MTD tracking tool",
    "Xero MTD agent alternative",
    "QuickBooks MTD client tracking",
    "non-Sage MTD software",
  ],
  alternates: {
    canonical: "https://www.practicenudge.com/compare/sage-mtd-agent",
  },
  openGraph: {
    title: "PracticeNudge vs Sage MTD Agent — UK Accountants Comparison",
    description:
      "An honest comparison for small UK practices choosing between Sage MTD Agent and PracticeNudge for MTD client tracking.",
    type: "article",
    url: "https://www.practicenudge.com/compare/sage-mtd-agent",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "PracticeNudge: collect your clients' MTD records without chasing them" }],
  },
};

const yes = <Check className="h-4 w-4 text-teal-700" />;
const no = <X className="h-4 w-4 text-slate-400" />;
const partial = <Minus className="h-4 w-4 text-amber-600" />;

const comparisonRows: Array<{
  feature: string;
  sage: React.ReactNode;
  pn: React.ReactNode;
  note?: string;
}> = [
  { feature: "Price", sage: "Free (for Sage Accountants subscribers)", pn: "Free pilot, then £39/mo" },
  { feature: "Requires Sage subscription", sage: yes, pn: no },
  { feature: "Works with Xero / QuickBooks / FreeAgent clients", sage: partial, pn: yes, note: "Sage MTD Agent is built around the Sage ecosystem." },
  { feature: "Software-agnostic client tracking", sage: no, pn: yes },
  { feature: "Readiness statuses (plain English)", sage: partial, pn: yes },
  { feature: "Per-client missing-document checklists", sage: partial, pn: yes },
  { feature: "Branded reminder templates", sage: yes, pn: yes },
  { feature: "Magic upload links for clients", sage: no, pn: yes },
  { feature: "GDPR per-channel consent capture", sage: partial, pn: yes },
  { feature: "Risk scoring view", sage: partial, pn: yes },
  { feature: "Setup time", sage: "Hours to a day", pn: "An afternoon" },
  { feature: "Best for practice size", sage: "Any Sage practice", pn: "1–5 person practices, 20–200 clients" },
];

export default function SageComparePage() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "PracticeNudge vs Sage MTD Agent — UK Accountants Comparison",
    description:
      "Honest comparison between Sage MTD Agent and PracticeNudge for UK accountants tracking MTD client readiness.",
    author: { "@type": "Organization", name: "PracticeNudge" },
    publisher: {
      "@type": "Organization",
      name: "PracticeNudge",
      url: "https://www.practicenudge.com",
    },
    mainEntityOfPage: "https://www.practicenudge.com/compare/sage-mtd-agent",
    datePublished: "2026-05-20",
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <nav className="border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl z-50">
        <div className="max-w-[1080px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/">
            <span className="font-semibold text-slate-900 dark:text-white">PracticeNudge</span>
          </Link>
          <div className="flex items-center gap-4 text-[13.5px]">
            <Link href="/blog" className="text-slate-600 dark:text-slate-400 hover:text-slate-900">Blog</Link>
            <Link href="/register">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white text-[13.5px]">
                Start free pilot
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <article className="max-w-[860px] mx-auto px-6 py-14">
        <Badge variant="outline" className="mb-4">Comparison · Updated May 2026</Badge>
        <h1 className="text-3xl md:text-[44px] tracking-tight font-semibold text-slate-900 dark:text-white mb-5 leading-[1.1]">
          PracticeNudge vs Sage MTD Agent: which fits your practice?
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
          Sage MTD Agent is a strong tool — and free if you are already a Sage Accountants subscriber. PracticeNudge solves the same problem with a different starting point: software-agnostic tracking for practices whose clients sit across Xero, QuickBooks, FreeAgent, Sage, or a mix. Here is how to choose.
        </p>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-6 mb-10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">Quick answer</h2>
          <ul className="space-y-2.5 text-[14.5px] text-slate-700 dark:text-slate-300">
            <li className="flex gap-2.5">
              <Check className="h-4 w-4 text-teal-700 dark:text-teal-400 mt-1 shrink-0" />
              <span><strong>Choose Sage MTD Agent</strong> if your practice runs on the Sage Accountants suite and most of your clients use Sage software.</span>
            </li>
            <li className="flex gap-2.5">
              <Check className="h-4 w-4 text-teal-700 dark:text-teal-400 mt-1 shrink-0" />
              <span><strong>Choose PracticeNudge</strong> if your client base is split across multiple platforms, or you do not want compliance tracking tied to a single software vendor.</span>
            </li>
          </ul>
        </div>

        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mt-12 mb-5">Feature-by-feature comparison</h2>
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 mb-3">
          <table className="w-full text-[14px]">
            <thead className="bg-[#F8FAFC] dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300 w-[44%]">Feature</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">Sage MTD Agent</th>
                <th className="text-left px-4 py-3 font-semibold text-teal-700 dark:text-teal-400">PracticeNudge</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((r, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.feature}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.sage}</td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{r.pn}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-500 mb-12 flex gap-4 flex-wrap">
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-teal-700" /> Full support</span>
          <span className="flex items-center gap-1.5"><Minus className="h-3.5 w-3.5 text-amber-600" /> Partial / conditional</span>
          <span className="flex items-center gap-1.5"><X className="h-3.5 w-3.5 text-slate-400" /> Not supported</span>
        </p>

        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mt-12 mb-4">When Sage MTD Agent is the right choice</h2>
        <p className="text-[15.5px] text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
          If you are already paying for Sage for Accountants, Sage MTD Agent is included at no additional cost and integrates directly with the Sage ecosystem. It is a sensible default when:
        </p>
        <ul className="space-y-2 text-[14.5px] text-slate-700 dark:text-slate-300 mb-10 list-disc pl-5">
          <li>The majority of your clients use Sage Accounting or Sage Business Cloud.</li>
          <li>Your team is already trained on Sage workflows.</li>
          <li>You do not need to track clients on other platforms in the same dashboard.</li>
        </ul>

        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mt-12 mb-4">When PracticeNudge is the right choice</h2>
        <p className="text-[15.5px] text-slate-600 dark:text-slate-400 mb-3 leading-relaxed">
          PracticeNudge was built for a specific reality: most small UK practices have clients spread across Xero, QuickBooks, FreeAgent, sometimes Sage, sometimes paper. A tracker tied to one vendor leaves gaps. PracticeNudge fits when:
        </p>
        <ul className="space-y-2 text-[14.5px] text-slate-700 dark:text-slate-300 mb-10 list-disc pl-5">
          <li>Your clients use a mix of accounting software — or none yet.</li>
          <li>You want one dashboard showing every client&apos;s MTD status regardless of where their books live.</li>
          <li>You prefer software-agnostic tracking that does not commit you to one accounting vendor long-term.</li>
          <li>You want clients to upload documents without learning a new portal — magic links, no login.</li>
          <li>You are a 1–5 person practice that needs to be set up in an afternoon, not a quarter.</li>
        </ul>

        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mt-12 mb-4">The honest take</h2>
        <p className="text-[15.5px] text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
          Sage MTD Agent and PracticeNudge are not direct competitors as much as they serve different shapes of practice. If Sage is your stack, use Sage MTD Agent. If your practice does not revolve around Sage, a software-agnostic tool will save you from forcing every client into one vendor just to keep your tracking tidy.
        </p>
        <p className="text-[15.5px] text-slate-600 dark:text-slate-400 mb-10 leading-relaxed">
          MTD tracking should follow your clients, not the other way round.
        </p>

        <div className="bg-slate-900 rounded-xl p-7 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Try PracticeNudge free during the pilot</h3>
          <p className="text-[14.5px] text-white/70 mb-5 max-w-[480px] mx-auto">
            Up to 75 clients, all readiness statuses, branded reminders, CSV import from Xero or QuickBooks. No credit card.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-teal-700 hover:bg-teal-600 text-white">
              Start free pilot
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </article>

      <footer className="py-8 px-6 border-t border-slate-200 dark:border-slate-800 mt-12">
        <div className="max-w-[1080px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[13px] text-slate-500 dark:text-slate-400">
          <Link href="/">
            <span className="font-semibold text-slate-700 dark:text-slate-300">PracticeNudge</span>
          </Link>
          <p>
            Sage and Sage MTD Agent are trademarks of The Sage Group plc. PracticeNudge is independent and not affiliated with Sage.
          </p>
        </div>
      </footer>
    </div>
  );
}
