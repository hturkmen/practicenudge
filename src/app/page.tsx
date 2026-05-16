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
  Shield,
  BarChart3,
  Clock,
  FileCheck,
  AlertTriangle,
} from "lucide-react";
import { LandingLanguageSwitcher } from "@/components/landing-language-switcher";
import { getTranslations } from "next-intl/server";

export default async function LandingPage() {
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="PracticeNudge" className="h-7" />
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#problem" className="hover:text-foreground transition-colors">{t("navProblem")}</a>
            <a href="#solution" className="hover:text-foreground transition-colors">{t("navSolution")}</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">{t("navHowItWorks")}</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">{t("navPricing")}</a>
            <a href="#faq" className="hover:text-foreground transition-colors">{t("navFaq")}</a>
          </div>
          <div className="flex items-center gap-3">
            <LandingLanguageSwitcher />
            <Link href="/login">
              <Button variant="ghost" size="sm">{tc("signIn")}</Button>
            </Link>
            <Link href="#pricing">
              <Button size="sm">{t("ctaPrimary")}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4" variant="secondary">
            {t("badge")}
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            {t("heroTitle").split("\n").map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("heroSubtitle")}
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="#pricing">
              <Button size="lg" className="text-base px-8">
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
      <section id="problem" className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">{t("problemTitle")}</h2>
          <div className="text-lg text-muted-foreground space-y-4 text-left md:text-center">
            <p>{t("problemText1")}</p>
            <p>{t("problemText2")}</p>
            <p>{t("problemText3")}</p>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section id="solution" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
            {t("solutionTitle")}
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            {t("solutionSubtitle")}
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Search, text: t("solutionFeature1") },
              { icon: FileCheck, text: t("solutionFeature2") },
              { icon: Bell, text: t("solutionFeature3") },
              { icon: Users, text: t("solutionFeature4") },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3 p-4 rounded-lg border">
                <item.icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
            {t("howItWorksTitle")}
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("step1Title")}</h3>
              <p className="text-muted-foreground">{t("step1Text")}</p>
            </div>
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("step2Title")}</h3>
              <p className="text-muted-foreground">{t("step2Text")}</p>
            </div>
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bell className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{t("step3Title")}</h3>
              <p className="text-muted-foreground">{t("step3Text")}</p>
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
      <section className="py-20 px-4 bg-primary text-primary-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            {t("finalCtaTitle")}
          </h2>
          <p className="text-lg opacity-90 mb-8">
            {t("finalCtaText")}
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-base px-8">
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
            <span className="font-semibold text-primary">PracticeNudge</span>
          </div>
          <p className="text-xs text-muted-foreground text-center max-w-2xl">
            {t("footerDisclaimer")}
          </p>
        </div>
      </footer>
    </div>
  );
}
