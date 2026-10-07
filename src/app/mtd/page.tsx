import type { Metadata } from "next";
import { MTDLeadForm } from "./lead-form";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeadlineBanner } from "@/components/deadline-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { deadlineImage, formatDeadlineDate, formatDeadlineDay, nextDeadline } from "@/lib/mtd-deadlines";
import {
  FileSpreadsheet,
  Download,
  Users,
  AlertTriangle,
  ArrowRight,
  Check,
} from "lucide-react";

const PAGE_URL = "https://www.practicenudge.com/mtd";
const SHARE_IMAGE = "/images/mtd-client-records.webp";

export const metadata: Metadata = {
  title: "Free MTD Client Readiness Tracker",
  description:
    "A free MTD client readiness tracker for UK accountants, plus the PracticeNudge pilot that collects your clients' records for you: checklist, secure upload link and automatic reminders.",
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
      "Know which clients are MTD-ready. Start with the free tracker, or let PracticeNudge collect the records for you.",
    type: "website",
    url: PAGE_URL,
    images: [{ url: SHARE_IMAGE, width: 1672, height: 941, alt: "A small business owner entering records on a laptop, with receipts on the desk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free MTD Client Readiness Tracker",
    description:
      "A free tracker for UK accountants, and the PracticeNudge pilot that collects client records for you.",
    images: [SHARE_IMAGE],
  },
  alternates: {
    canonical: PAGE_URL,
  },
};

const PRIMARY_BUTTON =
  "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200";
const SECONDARY_BUTTON =
  "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800";

const FAQS = [
  {
    q: "Is the tracker really free?",
    a: "Yes. No credit card and no trial period. We email you the Google Sheet link and you make a copy to your own Drive.",
  },
  {
    q: "What format is it?",
    a: "Google Sheets. Make a copy to your Drive and start using it. You can also download it as Excel (.xlsx).",
  },
  {
    q: "How many clients can I track?",
    a: "There is no hard limit in the spreadsheet. It works well up to about 500 clients. Beyond that, PracticeNudge is built for it.",
  },
  {
    q: "What is the difference between the tracker and PracticeNudge?",
    a: "The tracker is a spreadsheet you update by hand. PracticeNudge asks your clients for their records through a secure upload link, sends the reminders for you and keeps every client's status up to date automatically.",
  },
  {
    q: "Do I need PracticeNudge to use the tracker?",
    a: "No. The sheet works on its own. PracticeNudge is there for when you want something else to do the chasing.",
  },
  {
    q: "What does the pilot cost?",
    a: "It is free for the first 3 months and open to the first 50 small UK practices. No credit card.",
  },
  {
    q: "Does PracticeNudge file returns or send anything to HMRC?",
    a: "No. It is not tax filing software. Your accounting software does the filing. PracticeNudge collects the records and documents behind it.",
  },
];

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
    <figure>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18),0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-none overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <FileSpreadsheet className="h-4 w-4 text-teal-700 dark:text-teal-400 shrink-0" />
          <span className="text-[13px] font-semibold text-slate-900 dark:text-white">
            Client readiness
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
            <span className="text-slate-500 truncate">{r.missing}</span>
            <span
              className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] font-medium w-fit ${riskStyles[r.risk]}`}
            >
              {r.risk}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">Sample data</figcaption>
    </figure>
  );
}

const TRACKER_POINTS = ["One row per client, colour-coded risk", "Sample data included, copy and go", "Works with any accounting software"];
const PILOT_POINTS = [
  "A checklist and secure upload link for every client, with no client login",
  "Automatic reminders before and after each deadline",
  "Live status for every client on one screen",
  "Import your client list from a CSV",
];

export default function MTDLandingPage() {
  const next = nextDeadline(new Date());
  const deadlinePhoto = deadlineImage(next);

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
    url: PAGE_URL,
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
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

      <DeadlineBanner />

      {/* Nav */}
      <header>
        <nav
          aria-label="Main navigation"
          className="border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl saturate-[1.4] z-50"
        >
          <div className="max-w-[1180px] mx-auto px-6 py-3.5 flex items-center justify-between gap-3">
            <Link href="/">
              <Image src="/logo.svg" alt="PracticeNudge" width={112} height={28} priority className="dark:hidden" />
              <Image src="/logo-dark.svg" alt="" width={112} height={28} priority className="hidden dark:block" />
            </Link>
            <div className="hidden md:flex items-center gap-6 text-[13.5px] font-medium text-slate-600 dark:text-slate-400">
              <Link href="/what-is-mtd" className="hover:text-slate-900 dark:hover:text-white transition-colors">MTD explained</Link>
              <a href="#options" className="hover:text-slate-900 dark:hover:text-white transition-colors">Tracker or pilot</a>
              <Link href="/blog" className="hover:text-slate-900 dark:hover:text-white transition-colors">Blog</Link>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <ThemeToggle />
                <Link href="/login">
                  <Button variant="outline" size="sm" className="text-[13.5px] shadow-sm">Sign in</Button>
                </Link>
              </div>
              <Link href="/register">
                <Button size="sm" className={`text-[13.5px] ${PRIMARY_BUTTON}`}>
                  <span className="sm:hidden">Join pilot</span>
                  <span className="hidden sm:inline">Join the free pilot</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main>
        {/* Hero */}
        <section className="py-14 md:py-20 px-6">
          <div className="max-w-[1180px] mx-auto grid md:grid-cols-[5fr_6fr] gap-12 items-center">
            <div>
              <Badge className="mb-4" variant="outline">
                For small UK accounting practices
              </Badge>
              <h1 className="text-4xl md:text-[52px] leading-[1.08] font-bold tracking-tight mb-5 text-slate-900 dark:text-white">
                Know who&apos;s <span className="whitespace-nowrap">MTD-ready.</span>
                <br />
                <span className="text-teal-700 dark:text-teal-400">One glance, not one guess.</span>
              </h1>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-7 max-w-[480px] leading-relaxed">
                See every client&apos;s MTD status and what&apos;s missing. Fill it in yourself with
                our free tracker, or let PracticeNudge collect the records from your clients for you.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register">
                  <Button size="lg" className={`w-full sm:w-auto h-12 px-6 rounded-lg shadow-lg shadow-slate-900/20 dark:shadow-none ${PRIMARY_BUTTON}`}>
                    Join the free pilot
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#get-tracker">
                  <Button size="lg" variant="outline" className={`w-full sm:w-auto h-12 px-6 rounded-lg ${SECONDARY_BUTTON}`}>
                    Get the free tracker
                  </Button>
                </a>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                Pilot free for 3 months · No credit card · Not tax filing software
              </p>
              <p className="text-sm mt-3">
                <Link href="/what-is-mtd" className="font-medium text-teal-700 dark:text-teal-300 underline underline-offset-4 hover:text-teal-900 dark:hover:text-teal-100">
                  New to MTD? Read the plain-English explanation →
                </Link>
              </p>
            </div>

            <div className="hidden md:block">
              <TrackerPreview />
            </div>
          </div>
        </section>

        {/* The next deadline, with the desk photo that shows the same date */}
        {next && deadlinePhoto && (
          <section aria-labelledby="next-deadline" className="px-6 pb-16">
            <div className="max-w-[1180px] mx-auto grid md:grid-cols-[5fr_6fr] gap-10 md:gap-14 items-center rounded-3xl bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-3">Next quarterly deadline</p>
                <h2 id="next-deadline" className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4" style={{ textWrap: "balance" as never }}>
                  {formatDeadlineDay(next.date)}: are your clients&apos; records in?
                </h2>
                <p className="text-[16.5px] text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  Every in-scope client now owes you records four times a year, not once. PracticeNudge
                  asks for them, reminds your clients and shows you who is late.
                </p>
                <Link href="/register">
                  <Button size="lg" className={`h-12 px-6 rounded-lg ${PRIMARY_BUTTON}`}>
                    Join the free pilot
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <figure>
                <Image
                  src={deadlinePhoto.src}
                  alt={`A desk with receipts, invoices and a Making Tax Digital checklist, and a note marking the next quarterly deadline: ${formatDeadlineDate(next.date)}`}
                  width={deadlinePhoto.width}
                  height={deadlinePhoto.height}
                  sizes="(min-width: 768px) 600px, calc(100vw - 96px)"
                  className="w-full h-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] dark:shadow-none"
                />
              </figure>
            </div>
          </section>
        )}

        {/* Two ways */}
        <section id="options" className="py-16 px-6 bg-[#F8FAFC] dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800 scroll-mt-20">
          <div className="max-w-[1080px] mx-auto">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-3">Two ways to get MTD-ready</h2>
            <p className="text-[16.5px] text-slate-600 dark:text-slate-400 mb-8 max-w-[640px] leading-relaxed">
              Start with the sheet today. Move to the pilot when updating it by hand stops making sense.
            </p>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Free tracker</p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">A Google Sheet you fill in yourself</h3>
                <p className="text-[14.5px] text-slate-600 dark:text-slate-400 mb-4">Quick to start, and you update it by hand.</p>
                <ul className="space-y-2.5 mb-6 text-[14.5px] text-slate-700 dark:text-slate-300">
                  {TRACKER_POINTS.map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                      {point}
                    </li>
                  ))}
                </ul>
                <a href="#get-tracker" className="mt-auto">
                  <Button variant="outline" className={`w-full ${SECONDARY_BUTTON}`}>Get the free tracker</Button>
                </a>
              </div>

              <div className="relative rounded-2xl border-2 border-teal-700 dark:border-teal-500 bg-white dark:bg-slate-950 p-6 flex flex-col">
                <span className="absolute -top-3 left-6 rounded-full bg-teal-700 px-3 py-0.5 text-xs font-semibold text-white dark:bg-teal-500 dark:text-slate-950">Recommended</span>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-2">PracticeNudge pilot</p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">The same view, filled in by your clients</h3>
                <p className="text-[14.5px] text-slate-600 dark:text-slate-400 mb-4">Free for the first 3 months, no credit card.</p>
                <ul className="space-y-2.5 mb-6 text-[14.5px] text-slate-700 dark:text-slate-300">
                  {PILOT_POINTS.map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-teal-700 dark:text-teal-400" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-auto">
                  <Button className={`w-full h-11 ${PRIMARY_BUTTON}`}>
                    Join the free pilot
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* What's Inside + Form */}
        <section id="get-tracker" className="py-16 px-6 scroll-mt-20">
          <div className="max-w-[1080px] mx-auto">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-8">Get the free tracker</h2>
            <div className="grid md:grid-cols-2 gap-12">
              {/* What's Inside */}
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-5">What&apos;s inside</h3>
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
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-3">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <h4 className="font-semibold text-sm mb-1 text-slate-900 dark:text-white">{item.title}</h4>
                      <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-snug">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 text-slate-900 dark:text-white">What you&apos;ll stop doing</h4>
                  <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                    {[
                      "Manually checking who's MTD-ready",
                      "Guessing which clients need chasing",
                      "Losing track of missing documents",
                      "Worrying about missed deadlines",
                    ].map((line) => (
                      <li key={line} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Form (client component) */}
              <MTDLeadForm />
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-6 bg-[#F8FAFC] dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-6">Frequently asked questions</h2>
            <div>
              {FAQS.map((item) => (
                <details key={item.q} className="border-b border-slate-200 dark:border-slate-700 group">
                  <summary className="flex items-center justify-between gap-4 py-4 cursor-pointer list-none">
                    <span className="text-[15px] font-semibold text-slate-900 dark:text-white">{item.q}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <p className="text-sm text-slate-600 dark:text-slate-400 pb-4 leading-relaxed">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="py-[72px] px-6 bg-slate-900">
          <div className="max-w-[760px] mx-auto text-center">
            <h2 className="text-3xl md:text-[40px] font-semibold text-white mb-3.5 tracking-tight" style={{ textWrap: "balance" as never }}>
              Stop chasing clients for MTD records.
            </h2>
            <p className="text-[16.5px] text-white/70 mb-7 max-w-[540px] mx-auto">
              Join the free pilot. Import your clients from a CSV and set up in an afternoon.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link href="/register">
                <Button size="lg" className="text-[14.5px] px-6 h-12 rounded-lg bg-teal-700 hover:bg-teal-600 text-white shadow-lg">
                  Join the free pilot
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#get-tracker" className="text-sm font-medium text-white/80 underline underline-offset-4 hover:text-white">
                or get the free tracker
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-white/10 py-10 px-6">
        <div className="max-w-[1180px] mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <Link href="/" className="font-semibold text-white">
              PracticeNudge
            </Link>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-white/60">
              <Link href="/" className="hover:text-white transition-colors">Home</Link>
              <Link href="/what-is-mtd" className="hover:text-white transition-colors">What is MTD?</Link>
              <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
              <Link href="/compare/sage-mtd-agent" className="hover:text-white transition-colors">vs Sage MTD Agent</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <a href="mailto:hello@practicenudge.com" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <p className="text-[12px] text-white/40 leading-relaxed">
            PracticeNudge is a client readiness tracking and follow-up tool. It is not tax filing software and does not send data to HMRC.
          </p>
        </div>
      </footer>
    </div>
  );
}
