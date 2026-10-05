"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { ArrowRight, Check } from "lucide-react";
import { LEAD_FORM_PROMISE } from "@/lib/outreach/consent";

export function MTDLeadForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name"),
      email: formData.get("email"),
      practice: formData.get("practice"),
      clients: formData.get("clients"),
    };

    try {
      const res = await fetch("/api/lead-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-6">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold mb-4">You&apos;re in!</h2>
        <p className="text-muted-foreground mb-6">
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
    );
  }

  return (
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
            {LEAD_FORM_PROMISE}{" "}
            <Link href="/privacy" className="underline hover:text-foreground">Privacy notice</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
