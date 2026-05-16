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
} from "lucide-react";
import { LandingLanguageSwitcher } from "@/components/landing-language-switcher";
import { WebsiteStructuredData } from "@/components/structured-data";
import { getTranslations } from "next-intl/server";

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  return (
    <div className="min-h-screen bg-white">
      <WebsiteStructuredData />
      {/* Nav */}
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/">
              <img src="/logo.svg" alt="PracticeNudge" className="h-7 cursor-pointer" />
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#problem" className="hover:text-slate-900 transition-colors">{t("navProblem")}</a>
            <a href="#solution" className="hover:text-slate-900 transition-colors">{t("navSolution")}</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">{t("navHowItWorks")}</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">{t("navPricing")}</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">{t("navFaq")}</a>
          </div>
          <div className="flex items-center gap-2">
            <LandingLanguageSwitcher />
            <Link href="/login">
              <Button variant="outline" size="sm" className="text-sm">{tc("signIn")}</Button>
            </Link>
            <Link href="#pricing">
              <Button size="sm" className="text-sm bg-[#1e3a5f] hover:bg-[#162d4a]">{t("ctaPrimary")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-28 px-4 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-6 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 px-4 py-1.5 text-sm font-medium">
            {t("badge")}
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 mb-6 leading-tight">
            {t("heroTitle").split("\n").map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h1>
          <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t("heroSubtitle")}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="#pricing">
              <Button size="lg" className="text-base px-8 bg-[#1e3a5f] hover:bg-[#162d4a] h-12 rounded-lg shadow-lg shadow-blue-900/20">
                {t("ctaPrimary")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            {t("ctaSubtext")}
          </p>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="py-20 px-4 bg-slate-50 border-y">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mb-8">{t("problemTitle")}</h2>
          <div className="text-lg text-slate-600 space-y-4 text-left md:text-center leading-relaxed">
            <p>{t("problemText1")}</p>
            <p className="font-medium text-slate-700">{t("problemText2")}</p>
            <p>{t("problemText3")}</p>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section id="solution" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-4">
            {t("solutionTitle")}
          </h2>
          <p className="text-lg text-slate-600 text-center mb-12 max-w-2xl mx-auto">
            {t("solutionSubtitle")}
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Search, text: t("solutionFeature1") },
              { icon: FileCheck, text: t("solutionFeature2") },
              { icon: Bell, text: t("solutionFeature3") },
              { icon: Users, text: t("solutionFeature4") },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-4 p-5 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-[#1e3a5f]" />
                </div>
                <span className="text-sm text-slate-700 leading-relaxed pt-2">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-slate-50 border-y">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 text-center mb-14">
            {t("howItWorksTitle")}
          </h2>
          <div className="grid md:grid-cols-3 gap-10">
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-[#1e3a5f] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-900/20">
                <Users className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">{t("step1Title")}</h3>
              <p className="text-slate-600">{t("step1Text")}</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-[#1e3a5f] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-900/20">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">{t("step2Title")}</h3>
              <p className="text-slate-600">{t("step2Text")}</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-2xl bg-[#1e3a5f] flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-900/20">
                <Bell className="h-7 w-7 text-white" />
              </div>
              <h3 className="font-semibold text-lg text-slate-900 mb-2">{t("step3Title")}</h3>
              <p className="text-slate-600">{t("step3Text")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Pilot */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">{t("pricingTitle")}</h2>
          <p className="text-lg text-muted-foreground mb-10">
            {t("pricingSubtitle")}
          </p>

          <Card className="max-w-lg mx-auto border-primary shadow-md">
            <CardHeader>
              <Badge className="w-fit mx-auto mb-2">{t("pilotBadge")}</Badge>
              <CardTitle className="text-2xl">{t("pilotTitle")}</CardTitle>
              <div>
                <span className="text-4xl font-bold">{t("pilotPrice")}</span>
                <span className="text-muted-foreground ml-2">{t("pilotPeriod")}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-8 text-left">
                {[
                  t("pilotFeature1"),
                  t("pilotFeature2"),
                  t("pilotFeature3"),
                  t("pilotFeature4"),
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mb-4">
                {t("pilotNote")}
              </p>
              <Link href="/register">
                <Button className="w-full" size="lg">
                  {t("pilotCta")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            {t("faqTitle")}
          </h2>
          <div className="space-y-6">
            {[
              { q: t("faq1q"), a: t("faq1a") },
              { q: t("faq2q"), a: t("faq2a") },
              { q: t("faq3q"), a: t("faq3a") },
              { q: t("faq4q"), a: t("faq4a") },
              { q: t("faq5q"), a: t("faq5a") },
            ].map((item) => (
              <div key={item.q} className="border-b pb-4">
                <h3 className="font-semibold mb-2">{item.q}</h3>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-[#1e3a5f]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4 text-white">
            {t("finalCtaTitle")}
          </h2>
          <p className="text-lg text-blue-100 mb-8">
            {t("finalCtaText")}
          </p>
          <Link href="/register">
            <Button size="lg" className="text-base px-8 bg-white text-[#1e3a5f] hover:bg-blue-50 h-12 rounded-lg shadow-lg">
              {t("finalCtaButton")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Link href="/">
              <span className="font-semibold text-primary cursor-pointer">PracticeNudge</span>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-2xl">
            {t("footerDisclaimer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
