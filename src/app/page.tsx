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

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">PracticeNudge</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#problem" className="hover:text-foreground transition-colors">Problem</a>
            <a href="#solution" className="hover:text-foreground transition-colors">Solution</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="#pricing">
              <Button size="sm">Join the Pilot</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4" variant="secondary">
            🇬🇧 Built for small UK practices
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
            Stop chasing clients
            <br />
            for MTD information.
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            PracticeNudge shows you which clients are MTD-ready, what&apos;s missing,
            and who needs a nudge — all in one dashboard built for small UK practices.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="#pricing">
              <Button size="lg" className="text-base px-8">
                Join the Early Access Pilot
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            Free during pilot · No credit card required
          </p>
        </div>
      </section>

      {/* Problem */}
      <section id="problem" className="py-16 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-6">Sound familiar?</h2>
          <div className="text-lg text-muted-foreground space-y-4 text-left md:text-center">
            <p>
              You&apos;re spending hours every week chasing clients for missing records.
              Spreadsheets are out of date. You don&apos;t know which clients are MTD-ready
              and which are going to be a last-minute scramble.
            </p>
            <p>
              Meanwhile, HMRC deadlines keep moving closer.
            </p>
            <p>
              For small practices without a dedicated ops team, keeping track of 50–200
              clients&apos; MTD readiness is a manual, repetitive headache.
            </p>
          </div>
        </div>
      </section>

      {/* Solution */}
      <section id="solution" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-6">
            One dashboard. Every client. No more guessing.
          </h2>
          <p className="text-lg text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            PracticeNudge gives you a clear view of every client&apos;s MTD readiness
            status, missing information, and follow-up schedule.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: Search,
                text: "See who's ready, who's at risk, and who needs chasing",
              },
              {
                icon: FileCheck,
                text: "Track missing documents and information per client",
              },
              {
                icon: Bell,
                text: "Set follow-up reminders so nothing slips through",
              },
              {
                icon: Users,
                text: "Built specifically for small UK accountants and bookkeepers using Xero, QuickBooks, or FreeAgent",
              },
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
            Three steps to stop the chase
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                1. Connect your practice
              </h3>
              <p className="text-muted-foreground">
                Import your client list or add clients manually. Takes 5 minutes.
              </p>
            </div>
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                2. See the full picture
              </h3>
              <p className="text-muted-foreground">
                Instantly see MTD readiness status, missing info, and risk levels for every client.
              </p>
            </div>
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Bell className="h-7 w-7 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                3. Nudge and track
              </h3>
              <p className="text-muted-foreground">
                Set follow-up reminders, send nudges, and watch clients move from &quot;at risk&quot; to &quot;ready.&quot;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing / Pilot */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Early Access Pilot</h2>
          <p className="text-lg text-muted-foreground mb-10">
            We&apos;re looking for 10 small UK practices to test PracticeNudge and shape the product.
          </p>

          <Card className="max-w-lg mx-auto border-primary shadow-md">
            <CardHeader>
              <Badge className="w-fit mx-auto mb-2">Limited to 10 practices</Badge>
              <CardTitle className="text-2xl">Pilot Programme</CardTitle>
              <div>
                <span className="text-4xl font-bold">Free</span>
                <span className="text-muted-foreground ml-2">during pilot</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-8 text-left">
                {[
                  "Full dashboard access during the pilot period",
                  "Direct input into features and priorities",
                  "Founding member pricing when we launch (locked in permanently)",
                  "No commitment — leave anytime",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mb-4">
                Price at launch: From £29/month (pilot members get 50% off forever)
              </p>
              <Link href="/register">
                <Button className="w-full" size="lg">
                  Apply for the Pilot
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
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            {[
              {
                q: "Is this tax filing software?",
                a: "No. PracticeNudge does not file taxes or submit anything to HMRC. It's a tracking and chasing tool that sits alongside your existing software.",
              },
              {
                q: "Does it replace Xero / QuickBooks / FreeAgent?",
                a: "No. PracticeNudge works with your existing accounting software. It tracks client readiness and follow-ups — your accounting software handles the numbers.",
              },
              {
                q: "How is this different from a spreadsheet?",
                a: "Spreadsheets go stale. PracticeNudge gives you live status tracking, automated reminders, and a clear view without manual updates.",
              },
              {
                q: "Is my data safe?",
                a: "Yes. All data is encrypted in transit and at rest. We follow UK data protection standards and never share your client information.",
              },
              {
                q: "What size practice is this for?",
                a: "PracticeNudge is built for sole practitioners and small practices with 20–200 clients. If you're too small for enterprise tools but too busy for spreadsheets, this is for you.",
              },
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
            Ready to stop chasing?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Join the pilot and help shape the tool that small UK practices actually need.
          </p>
          <Link href="/register">
            <Button size="lg" variant="secondary" className="text-base px-8">
              Apply for Early Access
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
            PracticeNudge is a client readiness tracking and follow-up tool. It is not tax filing software,
            does not submit data to HMRC, and does not provide tax, legal, or financial advice.
            Always consult a qualified professional for tax matters.
          </p>
        </div>
      </footer>
    </div>
  );
}
