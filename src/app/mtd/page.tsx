import type { Metadata } from "next";
import { MTDLeadForm } from "./lead-form";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  FileSpreadsheet,
  Download,
  Users,
  AlertTriangle,
  ArrowRight,
  Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Free MTD Client Readiness Tracker | PracticeNudge",
  description:
    "Download our free MTD Client Readiness Tracker — a Google Sheet template that shows which clients are MTD-ready, who needs chasing, and what documents are missing. Built for UK accountants.",
  keywords: [
    "MTD tracker",
    "MTD spreadsheet",
    "MTD client tracking template",
    "free MTD tool",
    "Making Tax Digital tracker",
    "accountant MTD template",
    "MTD readiness tracker",
  ],
  openGraph: {
    title: "Free MTD Client Readiness Tracker | PracticeNudge",
    description:
      "Track which clients are MTD-ready with this free Google Sheet template. Built for small UK accounting practices.",
    type: "website",
    url: "https://www.practicenudge.com/mtd",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free MTD Client Readiness Tracker",
    description:
      "A free Google Sheet template for UK accountants to track MTD client readiness, missing documents, and deadlines.",
  },
  alternates: {
    canonical: "https://www.practicenudge.com/mtd",
  },
};

export default function MTDLandingPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MTD Client Readiness Tracker",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "GBP",
      description: "Free Google Sheets template",
    },
    description:
      "Free MTD client readiness tracking spreadsheet for UK accountants. Track client status, missing documents, and quarterly deadlines.",
    url: "https://www.practicenudge.com/mtd",
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Is the MTD tracker really free?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Yes, completely free. No credit card, no trial period. We send you the Google Sheet link and you make a copy to your own Drive.",
        },
      },
      {
        "@type": "Question",
        name: "What format is the MTD tracker?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "It is a Google Sheets template. You make a copy to your own Google Drive and can start using it immediately. You can also download it as Excel (.xlsx) if you prefer.",
        },
      },
      {
        "@type": "Question",
        name: "How many clients can I track?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The spreadsheet has no hard limit, but performance may slow above 500 rows. For larger client bases, PracticeNudge offers a dedicated dashboard.",
        },
      },
      {
        "@type": "Question",
        name: "Do I need PracticeNudge to use the tracker?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "No. The spreadsheet is a standalone tool that works independently. PracticeNudge automates what the spreadsheet does manually — reminders, status tracking, and document collection.",
        },
      },
    ],
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Nav */}
      <nav className="border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            PracticeNudge
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">
              Blog
            </Link>
            <Badge variant="secondary">Free Template</Badge>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4" variant="outline">
            <FileSpreadsheet className="h-3 w-3 mr-1" />
            Free Google Sheet Template
          </Badge>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">
            Are your clients ready for MTD?
            <br />
            <span className="text-primary">Find out in 10 minutes.</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Download our free MTD Client Readiness Tracker — a simple Google Sheet
            that shows you exactly which clients are ready, which are at risk, and
            what&apos;s missing.
          </p>
        </div>
      </section>

      {/* What's Inside + Form */}
      <section className="py-12 px-4 bg-gray-50 dark:bg-slate-900">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
          {/* What's Inside */}
          <div>
            <h2 className="text-2xl font-bold mb-6">What&apos;s inside the tracker</h2>
            <div className="space-y-4">
              {[
                {
                  icon: Users,
                  title: "Client overview",
                  desc: "Track every client's MTD status, software, and income band in one place.",
                },
                {
                  icon: AlertTriangle,
                  title: "Automatic risk scoring",
                  desc: "Built-in formula flags high-risk clients so you know who to chase first.",
                },
                {
                  icon: FileSpreadsheet,
                  title: "Missing info checklist",
                  desc: "See exactly what's missing for each client — no more guessing.",
                },
                {
                  icon: Download,
                  title: "Ready to use",
                  desc: "Pre-filled with sample data. Make a copy and start tracking in minutes.",
                },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-3">
                  <item.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
              <h3 className="font-semibold text-sm mb-2">What you&apos;ll stop doing:</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                  Manually checking who&apos;s MTD-ready
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                  Guessing which clients need chasing
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                  Losing track of missing documents
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                  Worrying about missed deadlines
                </li>
              </ul>
            </div>
          </div>

          {/* Form (client component) */}
          <MTDLeadForm />
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
          <div className="space-y-0">
            {[
              {
                q: "Is this really free?",
                a: "Yes. No credit card, no trial period, no catch. We send you the Google Sheet link and you make a copy.",
              },
              {
                q: "What format is it?",
                a: "Google Sheets. Make a copy to your Drive and start using it. You can also download as Excel (.xlsx).",
              },
              {
                q: "How many clients can I track?",
                a: "No hard limit in the spreadsheet. It works well up to ~500 clients. Beyond that, PracticeNudge offers a dedicated dashboard.",
              },
              {
                q: "Do I need PracticeNudge to use it?",
                a: "No. The spreadsheet is completely standalone. PracticeNudge automates what the spreadsheet does manually — if you outgrow it, we're here.",
              },
              {
                q: "What if I outgrow the spreadsheet?",
                a: "That's exactly what PracticeNudge is for. Automated reminders, live status tracking, magic upload links for clients. Free during pilot.",
              },
            ].map((item, i) => (
              <details key={i} className="border-b border-slate-200 dark:border-slate-700 group">
                <summary className="flex items-center justify-between py-4 cursor-pointer list-none">
                  <span className="text-[15px] font-semibold text-slate-900 dark:text-white">{item.q}</span>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" />
                </summary>
                <p className="text-sm text-muted-foreground pb-4">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Related content links */}
      <section className="py-8 px-4 bg-gray-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-lg font-semibold mb-4">Related resources</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/blog/mtd-client-readiness-checklist-2026" className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-shadow">
              <span className="text-sm font-medium text-slate-900 dark:text-white">MTD Readiness Checklist 2026</span>
              <p className="text-xs text-muted-foreground mt-1">Step-by-step assessment guide</p>
            </Link>
            <Link href="/blog/how-to-track-mtd-compliance-small-practice" className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-shadow">
              <span className="text-sm font-medium text-slate-900 dark:text-white">Tracking MTD Without Spreadsheets</span>
              <p className="text-xs text-muted-foreground mt-1">When to upgrade your system</p>
            </Link>
            <Link href="/compare/sage-mtd-agent" className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:shadow-sm transition-shadow">
              <span className="text-sm font-medium text-slate-900 dark:text-white">PracticeNudge vs Sage MTD Agent</span>
              <p className="text-xs text-muted-foreground mt-1">Feature comparison</p>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-semibold text-primary">
            PracticeNudge
          </Link>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/blog" className="hover:text-foreground">Blog</Link>
            <Link href="/compare/sage-mtd-agent" className="hover:text-foreground">Comparisons</Link>
            <span>PracticeNudge is a client readiness tracking tool. Not tax filing software.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
