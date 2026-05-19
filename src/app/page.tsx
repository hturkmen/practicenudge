import Link from "next/link";
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
  Mail,
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
import { WebsiteStructuredData } from "@/components/structured-data";
import { getTranslations } from "next-intl/server";

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <WebsiteStructuredData />

      {/* Nav — glassmorphism style */}
      <nav className="border-b sticky top-0 bg-white/85 backdrop-blur-xl saturate-[1.4] z-50">
        <div className="max-w-[1180px] mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <img src="/logo.svg" alt="PracticeNudge" className="h-7 cursor-pointer" />
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-6 text-[13.5px] font-medium text-slate-600">
            <a href="#problem" className="hover:text-slate-900 transition-colors">{t("navProblem")}</a>
            <a href="#solution" className="hover:text-slate-900 transition-colors">{t("navSolution")}</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">{t("navHowItWorks")}</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">{t("navPricing")}</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">{t("navFaq")}</a>
          </div>
          <div className="flex items-center gap-2">
            <LandingLanguageSwitcher />
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-[13.5px] shadow-sm">{tc("signIn")}</Button>
            </Link>
            <Link href="#pricing">
              <Button size="sm" className="text-[13.5px] bg-slate-900 hover:bg-slate-800 text-white">
                {t("ctaPrimary")}
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — split layout */}
      <section className="py-16 md:py-20 px-6" style={{ background: "radial-gradient(ellipse 80% 60% at 50% -20%, rgba(15,118,110,0.07), transparent 60%), #F8FAFC" }}>
        <div className="max-w-[1180px] mx-auto">
          <div className="grid md:grid-cols-[5fr_6fr] gap-14 items-center">
            <div>
              {/* Eyebrow badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium mb-5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />
                {t("badge")}
              </div>

              <h1 className="text-4xl md:text-[56px] leading-[1.04] tracking-[-0.035em] font-semibold text-slate-900 mb-5" style={{ textWrap: "balance" as any }}>
                {t("heroTitle").split("\n").map((line, i) => (
                  <span key={i}>
                    {i > 0 && " "}
                    {line.includes("MTD") ? (
                      <>
                        {line.split("MTD")[0]}
                        <span className="text-teal-700 italic font-serif font-medium">MTD</span>
                        {line.split("MTD")[1]}
                      </>
                    ) : (
                      line
                    )}
                    {i === 0 && <br />}
                  </span>
                ))}
              </h1>

              <p className="text-lg text-slate-600 mb-7 max-w-[520px] leading-relaxed" style={{ textWrap: "pretty" as any }}>
                {t("heroSubtitle")}
              </p>

              <div className="flex gap-2.5 flex-wrap">
                <Link href="#pricing">
                  <Button size="lg" className="text-[14.5px] px-5 bg-slate-900 hover:bg-slate-800 text-white h-12 rounded-lg shadow-lg shadow-slate-900/20">
                    {t("ctaPrimary")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <p className="text-sm text-slate-500 mt-4">
                {t("ctaSubtext")}
              </p>
            </div>

            {/* Dashboard mock preview */}
            <div className="hidden md:block">
              <div className="bg-white border border-slate-200 rounded-[14px] shadow-[0_20px_60px_-20px_rgba(15,23,42,0.18),0_4px_12px_rgba(15,23,42,0.04)] overflow-hidden">
                {/* Mock top bar */}
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-slate-100 bg-[#F8FAFC]">
                  <div className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center">
                    <ArrowRight className="w-3 h-3 text-teal-400" />
                  </div>
                  <span className="text-xs font-semibold">PracticeNudge</span>
                  <span className="text-[11.5px] text-slate-500 ml-2">Dashboard</span>
                  <div className="flex-1" />
                  <span className="w-1.5 h-1.5 rounded-full bg-red-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-300" />
                  <span className="w-1.5 h-1.5 rounded-full bg-green-300" />
                </div>
                {/* Metrics row */}
                <div className="grid grid-cols-4">
                  {[
                    { lbl: "Total clients", val: "128", color: "text-slate-900" },
                    { lbl: "MTD ready", val: "42", color: "text-green-700" },
                    { lbl: "Follow-up due", val: "31", color: "text-amber-700" },
                    { lbl: "High risk", val: "14", color: "text-red-700" },
                  ].map((m, i) => (
                    <div key={i} className={`px-4 py-3.5 ${i < 3 ? "border-r border-slate-100" : ""}`}>
                      <div className="text-[11px] text-slate-500 mb-1">{m.lbl}</div>
                      <div className={`text-[22px] font-semibold tracking-tight ${m.color}`}>{m.val}</div>
                    </div>
                  ))}
                </div>
                {/* Chase list + funnel */}
                <div className="grid grid-cols-2 border-t border-slate-100">
                  <div className="px-4 py-3 border-r border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">Who needs chasing next</span>
                      <span className="text-[11px] text-slate-500">Today · 5</span>
                    </div>
                    {[
                      { n: "Sarah W.", risk: "High" },
                      { n: "Ahmed K.", risk: "High" },
                      { n: "Roy B.", risk: "High" },
                      { n: "James P.", risk: "Med" },
                    ].map((x, i) => (
                      <div key={i} className={`flex items-center gap-2 py-1.5 ${i > 0 ? "border-t border-slate-50" : ""}`}>
                        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-semibold text-slate-600">
                          {x.n.split(" ").map(w => w[0]).join("")}
                        </div>
                        <span className="text-[11px] font-medium text-slate-900 flex-1">{x.n}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${x.risk === "High" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                          {x.risk}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold">Readiness funnel</span>
                      <span className="text-[11px] text-slate-500">128 clients</span>
                    </div>
                    {[
                      { stage: "Not assessed", pct: 14, color: "bg-slate-300" },
                      { stage: "Info missing", pct: 20, color: "bg-yellow-400" },
                      { stage: "Software chosen", pct: 11, color: "bg-teal-300" },
                      { stage: "Records ready", pct: 5, color: "bg-teal-500" },
                      { stage: "MTD ready", pct: 33, color: "bg-teal-700" },
                    ].map((f, i) => (
                      <div key={i} className="grid grid-cols-[80px_1fr_24px] gap-2 items-center py-0.5">
                        <span className="text-[10px] text-slate-600">{f.stage}</span>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${f.color} rounded-full`} style={{ width: `${f.pct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-700 text-right">{Math.round(128 * f.pct / 100)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="py-20 px-6 bg-white border-y border-slate-200">
        <div className="max-w-[1080px] mx-auto">
          <div className="grid md:grid-cols-2 gap-14">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-700" />
                {t("navProblem")}
              </div>
              <h2 className="text-3xl md:text-[38px] tracking-tight font-semibold text-slate-900 mb-4 leading-tight" style={{ textWrap: "balance" as any }}>
                {t("problemTitle")}
              </h2>
              <p className="text-base text-slate-600 max-w-[480px]" style={{ textWrap: "pretty" as any }}>
                {t("problemText1")}
              </p>
            </div>
            <div className="grid gap-3.5">
              {[
                { icon: FileSpreadsheet, title: t("problemCard1Title"), body: t("problemCard1Body") },
                { icon: Mail, title: t("problemCard2Title"), body: t("problemCard2Body") },
                { icon: AlertTriangle, title: t("problemCard3Title"), body: t("problemCard3Body") },
                { icon: Clock, title: t("problemCard4Title"), body: t("problemCard4Body") },
              ].map((x, i) => (
                <div key={i} className="grid grid-cols-[36px_1fr] gap-3.5 p-4 bg-[#F8FAFC] border border-slate-200 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                    <x.icon className="h-[17px] w-[17px]" />
                  </div>
                  <div>
                    <div className="text-[14.5px] font-semibold text-slate-900 mb-0.5">{x.title}</div>
                    <div className="text-[13px] text-slate-600">{x.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Solution / Features */}
      <section id="solution" className="py-20 px-6 bg-[#F8FAFC]">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />
              {t("navSolution")}
            </div>
            <h2 className="text-3xl md:text-[40px] tracking-tight font-semibold text-slate-900 mb-3" style={{ textWrap: "balance" as any }}>
              {t("solutionTitle")}
            </h2>
            <p className="text-base text-slate-600 max-w-[580px] mx-auto">
              {t("solutionSubtitle")}
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { icon: Tag, title: t("feature1Title"), body: t("feature1Body"), color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
              { icon: AlertTriangle, title: t("feature2Title"), body: t("feature2Body"), color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
              { icon: Send, title: t("feature3Title"), body: t("feature3Body"), color: "text-slate-800", bg: "bg-slate-100", border: "border-slate-200" },
              { icon: BarChart3, title: t("feature4Title"), body: t("feature4Body"), color: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200" },
              { icon: Calendar, title: t("feature5Title"), body: t("feature5Body"), color: "text-slate-800", bg: "bg-slate-100", border: "border-slate-200" },
              { icon: Shield, title: t("feature6Title"), body: t("feature6Body"), color: "text-slate-800", bg: "bg-slate-100", border: "border-slate-200" },
            ].map((f, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-[14px] shadow-[0_1px_0_rgba(15,23,42,0.04)] p-[22px]">
                <div className={`w-[38px] h-[38px] rounded-[10px] ${f.bg} ${f.color} border ${f.border} flex items-center justify-center mb-4`}>
                  <f.icon className="h-[18px] w-[18px]" />
                </div>
                <h3 className="text-[15.5px] font-semibold text-slate-900 mb-1.5 tracking-tight">{f.title}</h3>
                <p className="text-[13.5px] text-slate-600 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-6 bg-white border-y border-slate-200">
        <div className="max-w-[1080px] mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />
            {t("navHowItWorks")}
          </div>
          <h2 className="text-3xl md:text-4xl tracking-tight font-semibold text-slate-900 mb-10 max-w-[640px]" style={{ textWrap: "balance" as any }}>
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
                <div className="text-xs font-semibold text-teal-700 mb-2.5 tracking-wider">{s.n}</div>
                <div className="text-[16.5px] font-semibold text-slate-900 mb-1.5 tracking-tight">{s.title}</div>
                <div className="text-[13.5px] text-slate-600 leading-relaxed">{s.body}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 bg-white border-b border-slate-200">
        <div className="max-w-[1080px] mx-auto">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />
              {t("navPricing")}
            </div>
            <h2 className="text-3xl md:text-4xl tracking-tight font-semibold text-slate-900 mb-2.5">
              {t("pricingTitle")}
            </h2>
            <p className="text-[15.5px] text-slate-600">
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
                className={`relative bg-white border rounded-[14px] p-6 ${
                  p.primary
                    ? "border-teal-700 shadow-[0_20px_50px_-20px_rgba(15,118,110,0.3),0_2px_6px_rgba(15,23,42,0.04)]"
                    : "border-slate-200 shadow-[0_1px_0_rgba(15,23,42,0.04)]"
                }`}
              >
                {p.pill && (
                  <div className={`absolute -top-2.5 right-4 text-[11px] px-2.5 py-0.5 rounded-full font-medium text-white ${
                    p.primary ? "bg-teal-700" : "bg-slate-900"
                  }`}>
                    {p.pill}
                  </div>
                )}
                <div className={`text-[13px] font-semibold tracking-wide ${p.primary ? "text-teal-700" : "text-slate-700"}`}>
                  {p.name}
                </div>
                <div className="flex items-baseline gap-1.5 mt-2.5 mb-1.5">
                  <span className="text-4xl font-semibold tracking-tight">{p.price}</span>
                  <span className="text-[13px] text-slate-500">{p.per}</span>
                </div>
                <p className="text-[13.5px] text-slate-600 mb-5">{p.desc}</p>
                <div className="flex flex-col gap-2 mb-5">
                  {p.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2 text-[13.5px] text-slate-700">
                      <Check className="h-3.5 w-3.5 text-teal-700 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <Link href="/register" className="block">
                  <Button
                    className={`w-full ${
                      p.primary
                        ? "bg-slate-900 hover:bg-slate-800 text-white"
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
      <section id="faq" className="py-20 px-6 bg-[#F8FAFC]">
        <div className="max-w-[760px] mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-700" />
            FAQ
          </div>
          <h2 className="text-3xl tracking-tight font-semibold text-slate-900 mb-7">
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
              <details key={i} className="border-b border-slate-200 group" open={i === 0}>
                <summary className="flex items-center justify-between py-5 cursor-pointer list-none">
                  <span className="text-[15.5px] font-semibold text-slate-900">{item.q}</span>
                  <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-[14px] text-slate-600 pb-5 max-w-[640px]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-8 px-6 bg-white border-t border-slate-200">
        <div className="max-w-[1080px] mx-auto">
          <div className="grid grid-cols-[auto_1fr] gap-3.5 bg-[#F8FAFC] border border-slate-200 rounded-xl p-4">
            <Shield className="h-[18px] w-[18px] text-slate-500 mt-0.5" />
            <p className="text-[13px] text-slate-600 leading-relaxed">
              <strong className="text-slate-800">Not tax advice.</strong> {t("footerDisclaimer")}
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-[72px] px-6 bg-slate-900">
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
      <footer className="py-8 px-6 bg-slate-900 border-t border-white/10">
        <div className="max-w-[1180px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-[13px] text-white/60">
          <div className="flex items-center gap-3">
            <Link href="/">
              <span className="font-semibold text-white cursor-pointer">PracticeNudge</span>
            </Link>
            <span>· Built for UK accountancy practices</span>
          </div>
          <p className="text-xs text-white/50">
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
      </footer>
    </div>
  );
}
