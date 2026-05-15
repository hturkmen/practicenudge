"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowRight,
  Check,
  FileSpreadsheet,
  Download,
  Users,
  AlertTriangle,
} from "lucide-react";

export default function MTDLandingPage() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Connect to form handler (email or sheet)
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSubmitted(true);
    setLoading(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-primary">
              PracticeNudge
            </Link>
          </div>
        </nav>
        <section className="py-20 px-4">
          <div className="max-w-lg mx-auto text-center">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-4">You&apos;re in!</h1>
            <p className="text-lg text-muted-foreground mb-6">
              Check your inbox — we&apos;ve sent you the MTD Client Readiness Tracker Template.
            </p>
            <Card className="text-left">
              <CardHeader>
                <CardTitle className="text-lg">While you&apos;re here...</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  We&apos;re building PracticeNudge — a dashboard that does what this spreadsheet does,
                  but automatically. Live status tracking, follow-up reminders, and risk scoring
                  for every client.
                </p>
                <p className="text-sm text-muted-foreground">
                  We&apos;re looking for 10 small UK practices to pilot it (free).
                </p>
                <Link href="/#pricing">
                  <Button className="w-full mt-2">
                    Learn about the pilot
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            PracticeNudge
          </Link>
          <Badge variant="secondary">Free Template</Badge>
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
      <section className="py-12 px-4 bg-gray-50">
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
          </div>

          {/* Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Get the free tracker</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your name</Label>
                    <Input id="name" name="name" placeholder="Jane Smith" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Work email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="jane@yourpractice.co.uk"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="practice">Practice name</Label>
                    <Input
                      id="practice"
                      name="practice"
                      placeholder="Smith & Co Accountants"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clients">How many clients do you have?</Label>
                    <Select name="clients" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-20">1–20 clients</SelectItem>
                        <SelectItem value="21-50">21–50 clients</SelectItem>
                        <SelectItem value="51-100">51–100 clients</SelectItem>
                        <SelectItem value="101-200">101–200 clients</SelectItem>
                        <SelectItem value="200+">200+ clients</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" size="lg" disabled={loading}>
                    {loading ? "Sending..." : "Send me the tracker"}
                    {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    No spam. We&apos;ll send the template link and one follow-up about PracticeNudge.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="font-semibold text-primary">
            PracticeNudge
          </Link>
          <p className="text-xs text-muted-foreground">
            PracticeNudge is a client readiness tracking tool. Not tax filing software.
          </p>
        </div>
      </footer>
    </div>
  );
}
