"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
import { trackEvent } from "@/lib/analytics";

export function MTDLeadForm() {
  const t = useTranslations("mtdPage");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

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
      trackEvent("generate_lead", { lead_source: "mtd_tracker", client_range: String(data.clients ?? "") });
      setSubmitted(true);
    } catch {
      setError(t("fError"));
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-4" role="status">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-6">
          <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-2xl font-bold mb-3 text-slate-900 dark:text-white">{t("okTitle")}</h3>
        <p className="text-slate-600 dark:text-slate-400 mb-1">
          {t("okText")}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{t("okSpam")}</p>
        <Card className="text-left border-2 border-teal-700 dark:border-teal-500">
          <CardHeader>
            <CardTitle className="text-lg">{t("nextTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("nextP1")}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t("nextP2")}
            </p>
            <Link href="/register">
              <Button className="w-full mt-2 h-11 bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200">
                {t("joinPilot")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <p className="text-center text-sm">
              <Link href="/what-is-mtd" className="font-medium text-teal-700 dark:text-teal-300 underline underline-offset-4 hover:text-teal-900 dark:hover:text-teal-100">
                {t("nextExplain")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("formTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("fName")}</Label>
            <Input id="name" name="name" placeholder={t("fNamePh")} autoComplete="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("fEmail")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t("fEmailPh")}
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="practice">{t("fPractice")}</Label>
            <Input
              id="practice"
              name="practice"
              placeholder={t("fPracticePh")}
              autoComplete="organization"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="clients">{t("fClients")}</Label>
            <Select name="clients" required>
              <SelectTrigger id="clients">
                <SelectValue placeholder={t("fSelect")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-20">{t("fRange1")}</SelectItem>
                <SelectItem value="21-50">{t("fRange2")}</SelectItem>
                <SelectItem value="51-100">{t("fRange3")}</SelectItem>
                <SelectItem value="101-200">{t("fRange4")}</SelectItem>
                <SelectItem value="200+">{t("fRange5")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <div role="alert" className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading ? t("fSending") : t("fSubmit")}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            {LEAD_FORM_PROMISE}{" "}
            <Link href="/privacy" className="underline hover:text-foreground">{t("fPrivacy")}</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
