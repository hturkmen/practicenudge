import type { Metadata } from "next";
import { MTDLeadForm } from "./lead-form";
import Link from "next/link";
import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DeadlineBanner } from "@/components/deadline-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageContinueLinks } from "@/components/language-continue-links";
import { deadlineImage, formatDeadlineDate, formatDeadlineDay, nextDeadline } from "@/lib/mtd-deadlines";
import {
  FileSpreadsheet,
  Download,
  Users,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
} from "lucide-react";

const PAGE_URL = "https://www.practicenudge.com/mtd";
const SHARE_IMAGE = "/images/mtd-client-records.webp";

// This page is written in these languages; any other language shows the English text.
const WRITTEN_IN = ["en", "tr"];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("mtdPage");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
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
      title: `${t("metaTitle")} | PracticeNudge`,
      description: t("ogDescription"),
      type: "website",
      url: PAGE_URL,
      images: [{ url: SHARE_IMAGE, width: 1672, height: 941, alt: "A small business owner entering records on a laptop, with receipts on the desk" }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("metaTitle"),
      description: t("ogDescription"),
      images: [SHARE_IMAGE],
    },
    alternates: {
      canonical: PAGE_URL,
    },
  };
}

const PRIMARY_BUTTON =
  "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200";
const SECONDARY_BUTTON =
  "border border-slate-300 bg-white text-slate-900 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800";

type Translate = (key: string) => string;

function TrackerPreview({ t }: { t: Translate }) {
  const rows: {
    name: string;
    status: string;
    missing: string;
    risk: "Low" | "Med" | "High";
  }[] = [
    { name: "Sarah Williams", status: t("statusReady"), missing: "—", risk: "Low" },
    { name: "Ahmed Khan", status: t("statusProgress"), missing: t("missSoftware"), risk: "Med" },
    { name: "Roy Baxter", status: t("statusNotStarted"), missing: t("missIncome"), risk: "High" },
    { name: "James Patel", status: t("statusReady"), missing: "—", risk: "Low" },
    { name: "Fatima Noor", status: t("statusProgress"), missing: t("missBank"), risk: "Med" },
  ];

  const riskLabels: Record<string, string> = { Low: t("riskLow"), Med: t("riskMed"), High: t("riskHigh") };
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
            {t("previewTitle")}
          </span>
          <div className="flex-1" />
          <span className="w-2 h-2 rounded-full bg-red-300" />
          <span className="w-2 h-2 rounded-full bg-yellow-300" />
          <span className="w-2 h-2 rounded-full bg-green-300" />
        </div>
        <div className="grid grid-cols-[1.3fr_1fr_1.2fr_0.7fr] gap-2 px-4 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
          <span>{t("colClient")}</span>
          <span>{t("colStatus")}</span>
          <span>{t("colMissing")}</span>
          <span>{t("colRisk")}</span>
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
              {riskLabels[r.risk]}
            </span>
          </div>
        ))}
      </div>
      <figcaption className="mt-2 text-center text-xs text-slate-500 dark:text-slate-400">{t("previewSample")}</figcaption>
    </figure>
  );
}

export default async function MTDLandingPage() {
  const t = await getTranslations("mtdPage");
  const tl = await getTranslations("landing");
  const tc = await getTranslations("common");
  const locale = await getLocale();
  const contentProps = WRITTEN_IN.includes(locale) ? {} : { lang: "en", dir: "ltr" as const };
  const dateLocale = locale === "tr" ? "tr-TR" : "en-GB";

  const next = nextDeadline(new Date());
  const deadlinePhoto = deadlineImage(next);

  const trackerPoints = [t("trackerP1"), t("trackerP2"), t("trackerP3")];
  const pilotPoints = [t("pilotP1"), t("pilotP2"), t("pilotP3"), t("pilotP4")];
  const faqs = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ q: t(`faq${n}q`), a: t(`faq${n}a`) }));

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
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950" {...contentProps}>
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
              <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t("navHome")}</Link>
              <Link href="/what-is-mtd" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t("navExplained")}</Link>
              <a href="#options" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t("navOptions")}</a>
              <Link href="/blog" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t("navBlog")}</Link>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <ThemeToggle />
                <Link href="/login">
                  <Button variant="outline" size="sm" className="text-[13.5px] shadow-sm">{tc("signIn")}</Button>
                </Link>
              </div>
              <Link href="/register">
                <Button size="sm" className={`text-[13.5px] ${PRIMARY_BUTTON}`}>
                  <span className="sm:hidden">{tl("ctaShort")}</span>
                  <span className="hidden sm:inline">{t("joinPilot")}</span>
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
              <Link href="/" className="flex w-fit items-center gap-1.5 text-sm font-medium text-teal-700 dark:text-teal-300 hover:text-teal-900 dark:hover:text-teal-100 mb-5">
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                {t("backHome")}
              </Link>
              <Badge className="mb-4" variant="outline">
                {t("heroBadge")}
              </Badge>
              <h1 className="text-4xl md:text-[52px] leading-[1.08] font-bold tracking-tight mb-5 text-slate-900 dark:text-white">
                {t("heroT1a")} <span className="whitespace-nowrap">{t("heroT1b")}</span>
                <br />
                <span className="text-teal-700 dark:text-teal-400">{t("heroT2")}</span>
              </h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-3">{t("mtdFull")}</p>
              <p className="text-lg text-slate-600 dark:text-slate-400 mb-7 max-w-[480px] leading-relaxed">
                {t("heroLead")}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register">
                  <Button size="lg" className={`w-full sm:w-auto h-12 px-6 rounded-lg shadow-lg shadow-slate-900/20 dark:shadow-none ${PRIMARY_BUTTON}`}>
                    {t("joinPilot")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="#get-tracker">
                  <Button size="lg" variant="outline" className={`w-full sm:w-auto h-12 px-6 rounded-lg ${SECONDARY_BUTTON}`}>
                    {t("btnTracker")}
                  </Button>
                </a>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                {t("heroMicro")}
              </p>
              <p className="text-sm mt-3">
                <Link href="/what-is-mtd" className="font-medium text-teal-700 dark:text-teal-300 underline underline-offset-4 hover:text-teal-900 dark:hover:text-teal-100">
                  {t("heroExplain")}
                </Link>
              </p>
              <LanguageContinueLinks />
            </div>

            <div className="hidden md:block">
              <TrackerPreview t={t} />
            </div>
          </div>
        </section>

        {/* The next deadline, with the desk photo that shows the same date */}
        {next && deadlinePhoto && (
          <section aria-labelledby="next-deadline" className="px-6 pb-16">
            <div className="max-w-[1180px] mx-auto grid md:grid-cols-[5fr_6fr] gap-10 md:gap-14 items-center rounded-3xl bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-3">{t("dlEyebrow")}</p>
                <h2 id="next-deadline" className="text-3xl md:text-4xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4" style={{ textWrap: "balance" as never }}>
                  {t("dlTitle", { date: formatDeadlineDay(next.date, dateLocale) })}
                </h2>
                <p className="text-[16.5px] text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
                  {t("dlText")}
                </p>
                <Link href="/register">
                  <Button size="lg" className={`h-12 px-6 rounded-lg ${PRIMARY_BUTTON}`}>
                    {t("joinPilot")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <figure>
                <Image
                  src={deadlinePhoto.src}
                  alt={t("dlAlt", { date: formatDeadlineDate(next.date, dateLocale) })}
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
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-3">{t("optTitle")}</h2>
            <p className="text-[16.5px] text-slate-600 dark:text-slate-400 mb-8 max-w-[640px] leading-relaxed">
              {t("optIntro")}
            </p>
            <div className="grid md:grid-cols-2 gap-5">
              <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-6 flex flex-col">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t("trackerLabel")}</p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">{t("trackerHeading")}</h3>
                <p className="text-[14.5px] text-slate-600 dark:text-slate-400 mb-4">{t("trackerSub")}</p>
                <ul className="space-y-2.5 mb-6 text-[14.5px] text-slate-700 dark:text-slate-300">
                  {trackerPoints.map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-slate-400" />
                      {point}
                    </li>
                  ))}
                </ul>
                <a href="#get-tracker" className="mt-auto">
                  <Button variant="outline" className={`w-full ${SECONDARY_BUTTON}`}>{t("btnTracker")}</Button>
                </a>
              </div>

              <div className="relative rounded-2xl border-2 border-teal-700 dark:border-teal-500 bg-white dark:bg-slate-950 p-6 flex flex-col">
                <span className="absolute -top-3 left-6 rounded-full bg-teal-700 px-3 py-0.5 text-xs font-semibold text-white dark:bg-teal-500 dark:text-slate-950">{t("pilotRecommended")}</span>
                <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-2">{t("pilotLabel")}</p>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">{t("pilotHeading")}</h3>
                <p className="text-[14.5px] text-slate-600 dark:text-slate-400 mb-4">{t("pilotSub")}</p>
                <ul className="space-y-2.5 mb-6 text-[14.5px] text-slate-700 dark:text-slate-300">
                  {pilotPoints.map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-teal-700 dark:text-teal-400" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-auto">
                  <Button className={`w-full h-11 ${PRIMARY_BUTTON}`}>
                    {t("joinPilot")}
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
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-8">{t("gtTitle")}</h2>
            <div className="grid md:grid-cols-2 gap-12">
              {/* What's Inside */}
              <div>
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-5">{t("insideTitle")}</h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { icon: Users, n: 1 },
                    { icon: AlertTriangle, n: 2 },
                    { icon: FileSpreadsheet, n: 3 },
                    { icon: Download, n: 4 },
                  ].map((item) => (
                    <div
                      key={item.n}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 flex items-center justify-center mb-3">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <h4 className="font-semibold text-sm mb-1 text-slate-900 dark:text-white">{t(`inside${item.n}Title`)}</h4>
                      <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-snug">{t(`inside${item.n}Desc`)}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-[#F8FAFC] dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2 text-slate-900 dark:text-white">{t("stopTitle")}</h4>
                  <ul className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                    {[1, 2, 3, 4].map((n) => (
                      <li key={n} className="flex items-center gap-2">
                        <Check className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                        {t(`stop${n}`)}
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
            <h2 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-white mb-6">{t("faqTitle")}</h2>
            <div>
              {faqs.map((item) => (
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
              {t("closeTitle")}
            </h2>
            <p className="text-[16.5px] text-white/70 mb-7 max-w-[540px] mx-auto">
              {t("closeText")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <Link href="/register">
                <Button size="lg" className="text-[14.5px] px-6 h-12 rounded-lg bg-teal-700 hover:bg-teal-600 text-white shadow-lg">
                  {t("joinPilot")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#get-tracker" className="text-sm font-medium text-white/80 underline underline-offset-4 hover:text-white">
                {t("closeTracker")}
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
              <Link href="/" className="hover:text-white transition-colors">{t("footHome")}</Link>
              <Link href="/what-is-mtd" className="hover:text-white transition-colors">{t("footWhat")}</Link>
              <Link href="/blog" className="hover:text-white transition-colors">{t("footBlog")}</Link>
              <Link href="/compare/sage-mtd-agent" className="hover:text-white transition-colors">{t("footCompare")}</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">{t("footPrivacy")}</Link>
              <a href="mailto:hello@practicenudge.com" className="hover:text-white transition-colors">{t("footContact")}</a>
            </div>
          </div>
          <p className="text-[12px] text-white/40 leading-relaxed">
            {tl("footerDisclaimer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
