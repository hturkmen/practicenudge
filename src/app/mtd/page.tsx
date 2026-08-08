import type { Metadata } from "next";
import { MTDLeadForm } from "./lead-form";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Download,
  Users,
  AlertTriangle,
  ArrowRight,
  Check,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Free MTD Client Readiness Tracker",
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

function TrackerPreview() {
  const rows: {
    name: string;
    status: string;
    missing: string;
    risk: "Low" | "Med" | "High";
  }[] = [
    { name: "Sarah Williams", status: "Ready", missing: "—", risk: "Low" },
    { name: "Ahmed Khan", status: "In progress", missing: "Software confirm", risk: "Med" },
    { name: "Roy Baxter", status: "Not started", missing: "Income band, software", risk: "High" },
    { name: "James Patel", status: "Ready", missing: "—", risk: "Low" },
    { name: "Fatima Noor", status: "In progress", missing: "Bank feed link", risk: "Med" },
  ];

  const riskStyles: Record<string, string> = {
    Low: "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-400",
    Med: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
    High: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400",
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18),0_4px_12px_rgba(15,23,42,0.04)] overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
        <FileSpreadsheet className="h-4 w-4 text-teal-700 dark:text-teal-400 shrink-0" />
        <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
          MTD Client Readiness Tracker
        </span>
        <div className="flex-1" />
        <span className="w-2 h-2 rounded-full bg-red-300" />
        <span className="w-2 h-2 rounded-full bg-yellow-300" />
        <span className="w-2 h-2 rounded-full bg-green-300" />
      </div>
      <div className="grid grid-cols-[1.3fr_1fr_1.2fr_0.7fr] gap-2 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
        <span>Client</span>
        <span>Status</span>
        <span>Missing</span>
        <span>Risk</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.name}
          className="grid grid-cols-[1.3fr_1fr_1.2fr_0.7fr] gap-2 px-4 py-2.5 text-[12px] border-b border-slate-50 dark:border-slate-800/60 last:border-0 items-center"
        >
          <span className="font-medium text-slate-900 dark:text-white truncate">{r.name}</span>
          <span className="text-slate-600 dark:text-slate-400">{r.status}</span>
          <span className="text-slate-500 dark:text-slate-500 truncate">{r.missing}</span>
          <span
            className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium w-fit ${riskStyles[r.risk]}`}
          >
            {r.risk}
          </span>
        </div>
      ))}
    </div>
  );
}

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
      <section className="py-16 md:py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[5fr_6fr] gap-12 items-center">
          <div className="text-center md:text-left">
            <Badge className="mb-4" variant="outline">
              <FileSpreadsheet className="h-3 w-3 mr-1" />
              Free Google Sheet Template
            </Badge>
            <h1 className="text-4xl md:text-[52px] leading-[1.08] font-bold tracking-tight mb-5">
              Know who&apos;s MTD-ready.
              <br />
              <span className="text-teal-700 dark:text-teal-400">One glance, not one guess.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-7 max-w-md mx-auto md:mx-0">
              Every client. Their MTD status. What&apos;s missing. Colour-coded,
              in one free spreadsheet.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
              <a href="#get-tracker">
                <Button size="lg" className="w-full sm:w-auto">
                  Get the free tracker
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Free forever · No credit card · Ready in 10 minutes
            </p>
          </div>

          <div className="hidden md:block">
            <TrackerPreview />
          </div>
        </div>
      </section>

      {/* What's Inside + Form */}
      <section id="get-tracker" className="py-12 px-4 bg-gray-50 dark:bg-slate-900 scroll-mt-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12">
          {/* What's Inside */}
          <div>
            <h2 className="text-2xl font-bold mb-6">What&apos;s inside</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                {
                  icon: Users,
                  title: "Client overview",
                  desc: "One row per client. Status at a glance.",
                },
                {
                  icon: AlertTriangle,
                  title: "Risk scoring",
                  desc: "Colour-coded. Know who to chase first.",
                },
                {
                  icon: FileSpreadsheet,
                  title: "Missing info",
                  desc: "See exactly what's still needed.",
                },
                {
                  icon: Download,
                  title: "Ready to use",
                  desc: "Sample data included. Copy and go.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
                >
                  <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-3">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <h3 className="font-semibold text-sm mb-1">{item.title}</h3>
                  <p className="text-[13px] text-muted-foreground leading-snug">{item.desc}</p>
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
