"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PROMPT_CONSENT_TEXT } from "@/lib/outreach/consent";

/** One-time opt-in for owners who never saw the sign-up box (e.g. Google sign-ups from /login). */
export function MarketingConsentPrompt() {
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/account/marketing-consent")
      .then((res) => (res.ok ? res.json() : { show: false }))
      .then((body) => { if (active) setShow(!!body.show); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const answer = async (choice: "yes" | "no") => {
    setSaving(true);
    try {
      const res = await fetch("/api/account/marketing-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
      if (!res.ok) throw new Error();
      setShow(false);
      toast.success(choice === "yes" ? "Thanks. We'll send the occasional tip." : "No problem. We won't send these emails.");
    } catch {
      toast.error("That didn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;
  return (
    <Card role="region" aria-label="Email preferences">
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm">
            {PROMPT_CONSENT_TEXT}{" "}
            <Link href="/privacy" className="text-muted-foreground underline hover:text-foreground">Privacy notice</Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" disabled={saving} onClick={() => answer("yes")}>Yes, email me tips</Button>
          <Button size="sm" variant="outline" disabled={saving} onClick={() => answer("no")}>No thanks</Button>
        </div>
      </CardContent>
    </Card>
  );
}
