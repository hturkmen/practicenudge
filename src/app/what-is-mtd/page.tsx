import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, ArrowRight, Check, ExternalLink, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LandingLanguageSwitcher } from "@/components/landing-language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";

const PAGE_URL = "https://www.practicenudge.com/what-is-mtd";
const IMAGE = { src: "/images/mtd-client-records.webp", width: 1672, height: 941 };

// The explainer is written in these languages; any other language shows the English text.
const WRITTEN_IN = ["en", "tr"];

const PRIMARY_BUTTON =
  "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200";

const SOURCES = [
  { label: "Use Making Tax Digital for Income Tax", href: "https://www.gov.uk/guidance/use-making-tax-digital-for-income-tax" },
  { label: "Check when to sign up for Making Tax Digital for Income Tax", href: "https://www.gov.uk/guidance/check-when-to-sign-up-for-making-tax-digital-for-income-tax" },
  { label: "Penalties for Making Tax Digital for Income Tax", href: "https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax" },
];

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("whatIsMtd");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { canonical: PAGE_URL },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      type: "article",
      url: PAGE_URL,
      images: [{ url: IMAGE.src, width: IMAGE.width, height: IMAGE.height, alt: t("imageAlt") }],
    },
  };
}

export default async function WhatIsMtdPage() {
  const t = await getTranslations("whatIsMtd");
  const tl = await getTranslations("landing");
  const locale = await getLocale();
  // An unwritten language falls back to English, so keep that text left-to-right.
  const contentProps = WRITTEN_IN.includes(locale) ? {} : { lang: "en", dir: "ltr" as const };

  const whoRows = [
    { starts: t("whoDate1"), income: "£50,000" },
    { starts: t("whoDate2"), income: "£30,000" },
    { starts: t("whoDate3"), income: "£20,000" },
  ];
  const dateRows = [1, 2, 3, 4].map((n) => ({ label: t(`datesRow${n}Label`), due: t(`datesRow${n}Due`) }));

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "What is MTD? Making Tax Digital for Income Tax explained",
    description: "Making Tax Digital for Income Tax in plain English: what it is, who must use it, the dates and thresholds, and what it means for UK accountants and their clients.",
    author: { "@type": "Organization", name: "PracticeNudge" },
    publisher: { "@type": "Organization", name: "PracticeNudge", url: "https://www.practicenudge.com" },
    mainEntityOfPage: PAGE_URL,
    image: `https://www.practicenudge.com${IMAGE.src}`,
    datePublished: "2026-10-07",
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />

      <header>
        <nav aria-label="Main navigation" className="border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl saturate-[1.4] z-50">
          <div className="max-w-[1080px] mx-auto px-6 py-3.5 flex items-center justify-between gap-3">
            <Link href="/">
              <Image src="/logo.svg" alt="PracticeNudge" width={112} height={28} priority className="dark:hidden" />
              <Image src="/logo-dark.svg" alt="" width={112} height={28} priority className="hidden dark:block" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2">
                <ThemeToggle />
                <LandingLanguageSwitcher />
              </div>
              <Link href="/register">
                <Button size="sm" className={`text-[13.5px] ${PRIMARY_BUTTON}`}>
                  <span className="sm:hidden">{tl("ctaShort")}</span>
                  <span className="hidden sm:inline">{tl("ctaPrimary")}</span>
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main {...contentProps}>
        {/* The answer first, with the picture beside it */}
        <section className="max-w-[1080px] mx-auto px-6 pt-10 pb-12 md:pt-14 md:pb-16">
          <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white mb-6">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("back")}
          </Link>
          <div className="grid md:grid-cols-[6fr_5fr] gap-10 md:gap-14 items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-3">{t("eyebrow")}</p>
              <h1 className="text-4xl md:text-[52px] leading-[1.06] tracking-[-0.03em] font-semibold text-slate-900 dark:text-white mb-5">
                {t("title")}
              </h1>
              <p className="text-lg text-slate-700 dark:text-slate-300 leading-relaxed mb-7 max-w-[560px]">{t("lead")}</p>
              <Link href="/register">
                <Button size="lg" className={`text-[14.5px] px-5 h-12 rounded-lg shadow-lg shadow-slate-900/20 dark:shadow-none ${PRIMARY_BUTTON}`}>
                  {tl("ctaPrimary")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">{tl("ctaSubtext2")}</p>
            </div>
            <figure>
              <Image
                src={IMAGE.src}
                alt={t("imageAlt")}
                width={IMAGE.width}
                height={IMAGE.height}
                priority
                sizes="(min-width: 768px) 440px, calc(100vw - 48px)"
                className="w-full h-auto rounded-2xl border border-slate-200 dark:border-slate-700 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.25)] dark:shadow-none"
              />
            </figure>
          </div>
        </section>

        <div className="max-w-[1080px] mx-auto px-6 pb-16">
          <div className="max-w-[780px] space-y-14">
            {/* What changes */}
            <section aria-labelledby="mtd-change">
              <h2 id="mtd-change" className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-5">{t("changeTitle")}</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t("beforeLabel")}</p>
                  <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed">{t("beforeText")}</p>
                </div>
                <div className="rounded-xl border-2 border-teal-700 dark:border-teal-500 bg-white dark:bg-slate-900 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-2">{t("nowLabel")}</p>
                  <p className="text-[15px] text-slate-800 dark:text-slate-200 leading-relaxed">{t("nowText")}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-4 leading-relaxed">{t("quarterlyNote")}</p>
            </section>

            {/* Who and when */}
            <section aria-labelledby="mtd-who">
              <h2 id="mtd-who" className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">{t("whoTitle")}</h2>
              <p className="text-[15.5px] text-slate-700 dark:text-slate-300 leading-relaxed mb-5">{t("whoIntro")}</p>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 mb-4">
                <table className="w-full text-[15px]">
                  <thead className="bg-[#F8FAFC] dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{t("whoColStarts")}</th>
                      <th scope="col" className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">{t("whoColIncome")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whoRows.map((row) => (
                      <tr key={row.starts} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                        <td className="px-4 py-3 text-slate-800 dark:text-slate-200">{row.starts}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-white">{row.income}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t("whoYearNote")}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-2">{t("whoOutOfScope")}</p>
            </section>

            {/* Calendar */}
            <section aria-labelledby="mtd-dates">
              <h2 id="mtd-dates" className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-4">{t("datesTitle")}</h2>
              <p className="text-[15.5px] text-slate-700 dark:text-slate-300 leading-relaxed mb-5">{t("datesIntro")}</p>
              <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 mb-4">
                <ul>
                  {dateRows.map((row) => (
                    <li key={row.label} className="flex items-center justify-between gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-800 text-[15px]">
                      <span className="text-slate-700 dark:text-slate-300">{row.label}</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">{row.due}</span>
                    </li>
                  ))}
                  <li className="flex items-center justify-between gap-4 px-4 py-3 bg-teal-50 dark:bg-teal-950/40 text-[15px]">
                    <span className="font-semibold text-teal-800 dark:text-teal-300">{t("datesFinalLabel")}</span>
                    <span className="font-semibold text-teal-800 dark:text-teal-300 text-right">{t("datesFinalDue")}</span>
                  </li>
                </ul>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">{t("datesCalendarNote")}</p>
              <div className="flex gap-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 p-4">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-amber-700 dark:text-amber-400" />
                <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">{t("penaltyNote")}</p>
              </div>
            </section>

            {/* For accountants */}
            <section aria-labelledby="mtd-accountant">
              <h2 id="mtd-accountant" className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white mb-5">{t("accountantTitle")}</h2>
              <ul className="space-y-3 mb-5">
                {[1, 2, 3].map((n) => (
                  <li key={n} className="flex gap-3 text-[15.5px] text-slate-700 dark:text-slate-300 leading-relaxed">
                    <Check className="h-4 w-4 mt-1 shrink-0 text-teal-700 dark:text-teal-400" />
                    <span>{t(`accountantItem${n}`)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-[15.5px] font-semibold text-teal-800 dark:text-teal-300">{t("accountantClose")}</p>
            </section>

            {/* What the product is not */}
            <section aria-labelledby="mtd-not" className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
              <h2 id="mtd-not" className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white mb-3">{t("notTitle")}</h2>
              <p className="text-[15.5px] text-slate-700 dark:text-slate-300 leading-relaxed">{t("notText")}</p>
            </section>

            {/* Sources */}
            <section aria-labelledby="mtd-sources">
              <h2 id="mtd-sources" className="text-lg font-semibold text-slate-900 dark:text-white mb-2">{t("sourcesTitle")}</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-3">{t("sourcesText")}</p>
              <ul className="space-y-1.5">
                {SOURCES.map((source) => (
                  <li key={source.href}>
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      lang="en"
                      className="inline-flex items-center gap-1.5 text-[14px] font-medium text-teal-700 dark:text-teal-300 underline underline-offset-4 hover:text-teal-900 dark:hover:text-teal-100"
                    >
                      {source.label}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            {/* Call to action */}
            <section className="rounded-2xl bg-slate-900 px-6 py-10 text-center">
              <h2 className="text-2xl md:text-3xl font-semibold tracking-tight text-white mb-3" style={{ textWrap: "balance" as never }}>{t("ctaTitle")}</h2>
              <p className="text-[15px] text-white/70 mb-6">{tl("ctaSubtext2")}</p>
              <Link href="/register">
                <Button size="lg" className="text-[14.5px] px-6 h-12 rounded-lg bg-teal-700 hover:bg-teal-600 text-white">
                  {tl("ctaPrimary")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </section>

            {/* Related */}
            <section aria-labelledby="mtd-related">
              <h2 id="mtd-related" className="text-lg font-semibold text-slate-900 dark:text-white mb-3">{t("relatedTitle")}</h2>
              <ul className="space-y-2 text-[15px]">
                <li><Link href="/blog/mtd-itsa-deadlines-2026-2027-2028" className="text-teal-700 dark:text-teal-300 underline underline-offset-4 hover:text-teal-900 dark:hover:text-teal-100">{t("relatedDeadlines")}</Link></li>
                <li><Link href="/blog/sole-trader-landlord-mtd-what-accountants-need" className="text-teal-700 dark:text-teal-300 underline underline-offset-4 hover:text-teal-900 dark:hover:text-teal-100">{t("relatedAccountants")}</Link></li>
                <li><Link href="/mtd" className="text-teal-700 dark:text-teal-300 underline underline-offset-4 hover:text-teal-900 dark:hover:text-teal-100">{t("relatedTracker")}</Link></li>
              </ul>
            </section>
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-8">
          <div className="max-w-[1080px] mx-auto">
            <p className="text-[12.5px] text-slate-500 dark:text-slate-400 leading-relaxed mb-4">{tl("footerDisclaimer")}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate-600 dark:text-slate-400">
              <Link href="/" className="hover:text-slate-900 dark:hover:text-white">PracticeNudge</Link>
              <Link href="/blog" className="hover:text-slate-900 dark:hover:text-white">Blog</Link>
              <Link href="/privacy" className="hover:text-slate-900 dark:hover:text-white">Privacy</Link>
              <a href="mailto:hello@practicenudge.com" className="hover:text-slate-900 dark:hover:text-white">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
