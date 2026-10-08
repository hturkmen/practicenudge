import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Users,
  Search,
  Bell,
  Check,
  ArrowRight,
  BarChart3,
  FileCheck,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  Tag,
  Send,
  Calendar,
  Shield,
  ChevronDown,
  Download,
} from "lucide-react";
import { LandingLanguageSwitcher } from "@/components/landing-language-switcher";
import { LanguageContinueLinks } from "@/components/language-continue-links";
import { MtdFiveAnswers } from "@/components/mtd-five-answers";
import { ThemeToggle } from "@/components/theme-toggle";
import { WebsiteStructuredData } from "@/components/structured-data";
import { DeadlineBanner } from "@/components/deadline-banner";
import { ExitIntentModal } from "@/components/exit-intent-modal";
import { getTranslations } from "next-intl/server";

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "https://www.practicenudge.com" },
};

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950">
      <WebsiteStructuredData />
      <DeadlineBanner />

      {/* Nav — glassmorphism style */}
      <header>
      <nav aria-label="Main navigation" className="border-b border-slate-200 dark:border-slate-800 sticky top-0 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl saturate-[1.4] z-50">
        <div className="max-w-[1180px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Image src="/logo.svg" alt="PracticeNudge - MTD Client Tracking Tool" width={112} height={28} priority className="dark:hidden" />
              <Image src="/logo-dark.svg" alt="" width={112} height={28} priority className="hidden dark:block" />
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[13.5px] font-medium text-slate-600 dark:text-slate-400">
            <Link href="/what-is-mtd" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t("navMtd")}</Link>
            <a href="#solution" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t("navSolution")}</a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t("navHowItWorks")}</a>
            <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t("navPricing")}</a>
            <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t("navFaq")}</a>
          </div>
          <div className="flex items-center gap-2">
            {/* On phones the hero's language links take over, so the bar fits a 375px screen */}
            <div className="hidden sm:flex items-center gap-2">
              <ThemeToggle />
              <LandingLanguageSwitcher />
            </div>
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-[13.5px] shadow-sm">{tc("signIn")}</Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="text-[13.5px] bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                <span className="sm:hidden">{t("ctaShort")}</span>
                <span className="hidden sm:inline">{t("ctaPrimary")}</span>
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>
      </header>

      {/* Hero — split layout */}
      <section data-cta-location="hero" className="py-16 md:py-20 px-6 dark:bg-slate-950" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(15,118,110,0.07), transparent 60%)" }}>
        <div className="max-w-[1180px] mx-auto">
          <div className="grid md:grid-cols-[5fr_6fr] gap-14 items-center">
            <div>
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 text-xs font-medium mb-5">
                <svg aria-label="UK" role="img" viewBox="0 0 60 30" className="w-4 h-auto rounded-[2px] shrink-0">
                  <clipPath id="uk-flag-clip"><path d="M0,0 v30 h60 v-30 z" /></clipPath>
                  <g clipPath="url(#uk-flag-clip)">
                    <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
                    <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
                    <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-flag-clip)" stroke="#C8102E" strokeWidth="4" />
                    <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
                    <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
                  </g>
                </svg>
                {t("badge")}
              </div>

              <h1 className="text-4xl md:text-[56px] leading-[1.04] tracking-[-0.035em] font-semibold text-slate-900 dark:text-white mb-5" style={{ textWrap: "balance" as any }}>
                {t("heroTitle2").split("\n").map((line, i) => (
                  <span key={i}>
                    {i > 0 && " "}
                    {line.includes("MTD") ? (
                      <>
                        {line.split("MTD")[0]}
                        <span className="text-teal-700 dark:text-teal-400 italic font-serif font-medium">MTD</span>
                        {line.split("MTD")[1]}
                      </>
                    ) : (
                      line
                    )}
                    {i === 0 && <br />}
                  </span>
                ))}
              </h1>

              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">{t("mtdFull")}</p>

              <p className="text-lg text-slate-600 dark:text-slate-400 mb-5 max-w-[520px] leading-relaxed" style={{ textWrap: "pretty" as any }}>
                {t("heroSubtitle2")}
              </p>

              {/* How it works, readable in one glance */}
              <ol className="mb-7 space-y-2">
                {[t("heroStep1"), t("heroStep2"), t("heroStep3")].map((step, i) => (
                  <li key={i} className="flex items-center gap-3 text-[15px] text-slate-700 dark:text-slate-300">
                    <span aria-hidden className="h-6 w-6 shrink-0 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center justify-center">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>

              <div className="flex gap-2.5 flex-wrap">
                <Link href="/register">
                  <Button size="lg" className="text-[14.5px] px-5 bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-lg shadow-lg shadow-slate-900/20 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 dark:shadow-none">
                    {t("ctaPrimary")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                {t("ctaSubtext2")}
              </p>

              <LanguageContinueLinks />
            </div>

            {/* The answers a visitor needs first, visible without scrolling on every screen size */}
            <aside aria-labelledby="mtd-in-30-seconds" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[14px] shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18),0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] p-6">
              <h2 id="mtd-in-30-seconds" className="text-xs font-semibold uppercase tracking-wider text-teal-700 dark:text-teal-400 mb-5">
                {t("mtdCardTitle")}
              </h2>
              <dl className="space-y-5">
                {[FileSpreadsheet, Calendar, Send, Clock, BarChart3].map((Icon, i) => (
                  <div key={i} className="flex gap-3.5">
                    <div aria-hidden className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <dt className="text-[15px] font-semibold text-slate-900 dark:text-white">{t(`mtdA${i + 1}Title`)}</dt>
                      <dd className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{t(`mtdA${i + 1}Body`)}</dd>
                    </div>
                  </div>
                ))}
              </dl>
            </aside>
          </div>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="hidden md:block px-6 pb-16 dark:bg-slate-950">
        <div className="max-w-[860px] mx-auto">
            <div className="hidden md:block">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[14px] shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18),0_4px_12px_rgba(15,23,42,0.04)] dark:shadow-[0_20px_60px_-20px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* Mock top bar */}
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-[#F8FAFC] dark:bg-slate-800/50">
                  <div className="w-5 h-5 rounded-md bg-slate-900 dark:bg-slate-700 flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-teal-400" />
                  </div>
                  <span className="text-xs font-semibold text-slate-900 dark:text-white">PracticeNudge</span>
                  <span className="text-[11.5px] text-slate-500 dark:text-slate-400 ml-2">Dashboard</span>
                  <div className="flex-1" />
                  <span className="w-1.5 h-1.5 rounded-full bg-red-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300" />
                </div>
                {/* Metrics row */}
                <div className="grid grid-cols-4">
                  {[
                    { lbl: "Total clients", val: "128", color: "text-slate-900 dark:text-white" },
                    { lbl: "MTD ready", val: "42", color: "text-green-700 dark:text-green-400" },
                    { lbl: "Follow-up due", val: "31", color: "text-amber-700 dark:text-amber-400" },
                    { lbl: "High risk", val: "14", color: "text-red-700 dark:text-red-400" },
                  ].map((m, i) => (
                    <div key={i} className={`px-4 py-3.5 ${i < 3 ? "border-r border-slate-100 dark:border-slate-800" : ""}`}>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">{m.lbl}</div>
                      <div className={`text-[22px] font-semibold tracking-tight ${m.color}`}>{m.val}</div>
                    </div>
                  ))}
                </div>
                {/* Chase list + funnel */}
                <div className="grid grid-cols-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="px-4 py-3 border-r border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">Who needs chasing next</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Today · 5</span>
                    </div>
                    {[
                      { n: "Sarah W.", risk: "High" },
                      { n: "Ahmed K.", risk: "High" },
                      { n: "Roy B.", risk: "High" },
                      { n: "James P.", risk: "Med" },
                    ].map((x, i) => (
                      <div key={i} className={`flex items-center gap-2 py-1.5 ${i > 0 ? "border-t border-slate-50 dark:border-slate-800" : ""}`}>
                        <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[9px] font-semibold text-slate-600 dark:text-slate-300">
                          {x.n.split(" ").map(w => w[0]).join("")}
                        </div>
                        <span className="text-[11px] font-medium text-slate-900 dark:text-slate-200 flex-1">{x.n}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${x.risk === "High" ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-400" : "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400"}`}>
                          {x.risk}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">Readiness funnel</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">128 clients</span>
                    </div>
                    {[
                      { stage: "Not assessed", pct: 14, color: "bg-slate-300 dark:bg-slate-600" },
                      { stage: "Info missing", pct: 20, color: "bg-yellow-400" },
                      { stage: "Software chosen", pct: 11, color: "bg-teal-300" },
                      { stage: "Records ready", pct: 5, color: "bg-teal-500" },
                      { stage: "MTD ready", pct: 33, color: "bg-teal-700" },
                    ].map((f, i) => (
                      <div key={i} className="grid grid-cols-[80px_1fr_24px] gap-2 items-center py-0.5">
                        <span className="text-[10px] text-slate-600 dark:text-slate-400">{f.stage}</span>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div className={`h-full ${f.color} rounded-full`} style={{ width: `${f.pct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-700 dark:text-slate-300 text-right">{Math.round(128 * f.pct / 100)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </div>
      </section>

      {/* MTD, in five answers (replaces the problem section) */}
      <MtdFiveAnswers />

      {/* Solution / Features */}
      <section id="solution" className="py-20 px-6 bg-[#F8FAFC] dark:bg-slate-950">
        <div className="max-w-[1080px] mx-auto">
          {/* Mid-page secondary CTA */}
          <div className="mb-12 p-5 bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-[15px] font-semibold text-slate-900 dark:text-white">Not ready to sign up? Grab the free MTD tracker first.</p>
              <p className="text-[13px] text-slate-600 dark:text-slate-400">A Google Sheet template to track client readiness — no account needed.</p>
            </div>
            <Link href="/mtd">
              <Button variant="outline" size="sm" className="whitespace-nowrap text-[13px]">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Get free tracker
              </Button>
            </Link>
          </div>
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-700 dark:bg-teal-400" />
              {t("navSolution")}
            </div>
            <h2 className="text-3xl md:text-[40px] tracking-tight font-semibold text-slate-900 dark:text-white mb-3" style={{ textWrap: "balance" as any }}>
              {t("solutionTitle")}
            </h2>
            <p className="text-base text-slate-600 dark:text-slate-400 max-w-[580px] mx-auto">
              {t("solutionSubtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Tag, title: t("feature1Title"), body: t("feature1Body"), color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
              { icon: AlertTriangle, title: t("feature2Title"), body: t("feature2Body"), color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
              { icon: Send, title: t("feature3Title"), body: t("feature3Body"), color: "text-slate-800 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700" },
              { icon: BarChart3, title: t("feature4Title"), body: t("feature4Body"), color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
              { icon: Calendar, title: t("feature5Title"), body: t("feature5Body"), color: "text-slate-800 dark:text-slate-300", bg: "bg-slate-100 dark:bg-slate-800", border: "border-slate-200 dark:border-slate-700" },
              { icon: Shield, title: t("feature6Title"), body: t("feature6Body"), color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
            ].map((f, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-[14px] shadow-[0_1px_0_rgba(15,23,42,0.04)] p-[22px]">
                <div className={`w-[38px] h-[38px] rounded-[10px] ${f.bg} ${f.color} border ${f.border} flex items-center justify-center mb-4`}>
                  <f.icon className="h-[18px] w-[18px]" />
                </div>
                <h3 className="text-[15.5px] font-semibold text-slate-900 dark:text-white mb-1.5 tracking-tight">{f.title}</h3>
                <p className="text-[13.5px] text-slate-600 dark:text-slate-400 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-[1080px] mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-700 dark:bg-teal-400" />
            {t("navHowItWorks")}
          </div>
          <h2 className="text-3xl md:text-4xl tracking-tight font-semibold text-slate-900 dark:text-white mb-10 max-w-[640px]" style={{ textWrap: "balance" as any }}>
            {t("howItWorksTitle")}
          </h2>
          <div className="grid md:grid-cols-4 gap-5">
            {[
              { n: "01", title: t("step1Title"), body: t("step1Text") },
              { n: "02", title: t("step2Title"), body: t("step2Text") },
              { n: "03", title: t("step3Title"), body: t("step3Text") },
              { n: "04", title: t("step4Title"), body: t("step4Text") },
            ].map((s, i) => (
              <div key={i}>
                <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-2.5 tracking-wider">{s.n}</div>
                <div className="text-[16.5px] font-semibold text-slate-900 dark:text-white mb-1.5 tracking-tight">{s.title}</div>
                <div className="text-[13.5px] text-slate-600 dark:text-slate-400 leading-relaxed">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-700 dark:bg-teal-400" />
              {t("navPricing")}
            </div>
            <h2 className="text-3xl md:text-4xl tracking-tight font-semibold text-slate-900 dark:text-white mb-2.5">
              {t("pricingTitle")}
            </h2>
            <p className="text-[15.5px] text-slate-600 dark:text-slate-400">
              {t("pricingSubtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 max-w-[920px] mx-auto">
            {[
              {
                name: t("planPilotName"),
                price: t("planPilotPrice"),
                per: t("planPilotPer"),
                desc: t("planPilotDesc"),
                features: [t("planPilotF1"), t("planPilotF2"), t("planPilotF3"), t("planPilotF4")],
                cta: t("planPilotCta"),
                primary: false,
                pill: t("planPilotPill"),
              },
              {
                name: t("planPracticeName"),
                price: t("planPracticePrice"),
                per: t("planPracticePer"),
                desc: t("planPracticeDesc"),
                features: [t("planPracticeF1"), t("planPracticeF2"), t("planPracticeF3"), t("planPracticeF4")],
                cta: t("planPracticeCta"),
                primary: true,
                pill: t("planPracticePill"),
              },
              {
                name: t("planFirmName"),
                price: t("planFirmPrice"),
                per: t("planFirmPer"),
                desc: t("planFirmDesc"),
                features: [t("planFirmF1"), t("planFirmF2"), t("planFirmF3"), t("planFirmF4")],
                cta: t("planFirmCta"),
                primary: false,
              },
            ].map((p, i) => (
              <div
                key={i}
                className={`relative bg-white dark:bg-slate-800 border rounded-[14px] p-6 ${
                  p.primary
                    ? "border-teal-700 shadow-[0_20px_50px_-20px_rgba(15,118,110,0.3),0_2px_6px_rgba(15,23,42,0.04)]"
                    : "border-slate-200 dark:border-slate-700 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                }`}
              >
                {p.pill && (
                  <div className={`absolute -top-2.5 right-4 text-[11px] px-2.5 py-0.5 rounded-full font-medium text-white ${
                    p.primary ? "bg-teal-700" : "bg-slate-900 dark:bg-slate-600"
                  }`}>
                    {p.pill}
                  </div>
                )}
                <div className={`text-[13px] font-semibold tracking-wide ${p.primary ? "text-teal-700 dark:text-teal-400" : "text-slate-700 dark:text-slate-300"}`}>
                  {p.name}
                </div>
                <div className="flex items-baseline gap-1.5 mt-2.5 mb-1.5">
                  <span className="text-4xl font-semibold tracking-tight dark:text-white">{p.price}</span>
                  <span className="text-[13px] text-slate-500 dark:text-slate-400">{p.per}</span>
                </div>
                <p className="text-[13.5px] text-slate-600 dark:text-slate-400 mb-5">{p.desc}</p>
                <div className="flex flex-col gap-2 mb-5">
                  {p.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2 text-[13.5px] text-slate-700 dark:text-slate-300">
                      <Check className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link href="/register" className="block">
                  <Button
                    className={`w-full ${
                      p.primary
                        ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
                        : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 shadow-sm"
                    }`}
                    variant={p.primary ? "default" : "outline"}
                  >
                    {p.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-6 bg-[#F8FAFC] dark:bg-slate-950">
        <div className="max-w-[760px] mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-400 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-700 dark:bg-teal-400" />
            FAQ
          </div>
          <h2 className="text-3xl tracking-tight font-semibold text-slate-900 dark:text-white mb-7">
            {t("faqTitle")}
          </h2>
          <div className="flex flex-col">
            {[
              { q: t("faq1q"), a: t("faq1a") },
              { q: t("faq2q"), a: t("faq2a") },
              { q: t("faq3q"), a: t("faq3a") },
              { q: t("faq4q"), a: t("faq4a") },
              { q: t("faq5q"), a: t("faq5a") },
            ].map((item, i) => (
              <details key={i} className="border-b border-slate-200 dark:border-slate-700 group" open={i === 0}>
                <summary className="flex items-center justify-between py-5 cursor-pointer list-none">
                  <span className="text-[15.5px] font-semibold text-slate-900 dark:text-white">{item.q}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-[14px] text-slate-600 dark:text-slate-400 pb-5 max-w-[640px]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 px-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-[1080px] mx-auto">
          <div className="grid grid-cols-[auto_1fr] gap-3.5 bg-[#F8FAFC] dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-4">
            <Shield className="h-[18px] w-[18px] text-slate-500 dark:text-slate-400 mt-0.5" />
            <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <strong className="text-slate-800 dark:text-slate-200">Not tax advice.</strong> {t("footerDisclaimer")}
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section data-cta-location="closing" className="py-[72px] px-6 bg-slate-900">
        <div className="max-w-[760px] mx-auto text-center">
          <h2 className="text-3xl md:text-[40px] font-semibold text-white mb-3.5 tracking-tight" style={{ textWrap: "balance" as any }}>
            {t("finalCtaTitle")}
          </h2>
          <p className="text-[16.5px] text-white/70 mb-7 max-w-[540px] mx-auto">
            {t("finalCtaText")}
          </p>
          <Link href="/register">
            <Button size="lg" className="text-[14.5px] px-6 bg-teal-700 hover:bg-teal-600 text-white h-12 rounded-lg shadow-lg">
              {t("finalCtaButton")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-6 bg-slate-900 border-t border-white/10">
        <div className="max-w-[1180px] mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <Link href="/">
                <span className="font-semibold text-white cursor-pointer">PracticeNudge</span>
              </Link>
              <p className="text-[13px] text-white/50 mt-2">
                MTD client readiness tracking for small UK accounting practices.
              </p>
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-white/80 mb-3">Product</h4>
              <div className="flex flex-col gap-2 text-[13px] text-white/50">
                <Link href="/mtd" className="hover:text-white transition-colors">Free MTD Tracker</Link>
                <Link href="/compare/sage-mtd-agent" className="hover:text-white transition-colors">vs Sage MTD Agent</Link>
                <Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link>
                <Link href="/register" className="hover:text-white transition-colors">Start Free Pilot</Link>
              </div>
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-white/80 mb-3">Resources</h4>
              <div className="flex flex-col gap-2 text-[13px] text-white/50">
                <Link href="/blog" className="hover:text-white transition-colors">Blog</Link>
                <Link href="/blog/mtd-itsa-deadlines-2026-2027-2028" className="hover:text-white transition-colors">MTD Deadlines</Link>
                <Link href="/blog/mtd-client-readiness-checklist-2026" className="hover:text-white transition-colors">MTD Checklist</Link>
                <Link href="/blog/stop-chasing-clients-mtd-documents" className="hover:text-white transition-colors">Stop Chasing Clients</Link>
                <Link href="/blog/how-to-track-mtd-compliance-small-practice" className="hover:text-white transition-colors">Track MTD Compliance</Link>
                <Link href="/blog/sole-trader-landlord-mtd-what-accountants-need" className="hover:text-white transition-colors">Sole Traders and Landlords</Link>
              </div>
            </div>
            <div>
              <h4 className="text-[13px] font-semibold text-white/80 mb-3">Company</h4>
              <div className="flex flex-col gap-2 text-[13px] text-white/50">
                <Link href="/login" className="hover:text-white transition-colors">Sign In</Link>
                <a href="mailto:hello@practicenudge.com" className="hover:text-white transition-colors">Contact</a>
                <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[12px] text-white/40">
            <span>© 2025–2026 PracticeNudge. Built for UK accountancy practices.</span>
            <p>
              Developed by{" "}
              <a
                href="https://hermesyazilim.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-400 hover:underline font-medium"
              >
                Hermes Yazılım
              </a>
            </p>
          </div>
        </div>
      </footer>

      <ExitIntentModal />
    </div>
  );
}
