"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, ShieldCheck, XCircle } from "lucide-react";

export default function ConsentPage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [clientName, setClientName] = useState("");
  const [firmName, setFirmName] = useState("");
  const [alreadyConsented, setAlreadyConsented] = useState(false);
  const [consented, setConsented] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchConsent() {
      const { data, error } = await supabase
        .from("clients")
        .select("name, gdpr_consent, firm_id, firms(name)")
        .eq("gdpr_consent_token", token)
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setClientName(data.name);
      setFirmName((data.firms as any)?.name || "Your accountant");

      if (data.gdpr_consent) {
        setAlreadyConsented(true);
      }

      setLoading(false);
    }
    fetchConsent();
  }, [token]);

  const handleConsent = async () => {
    setSubmitting(true);
    const { error } = await supabase
      .from("clients")
      .update({
        gdpr_consent: true,
        gdpr_consented_at: new Date().toISOString(),
      })
      .eq("gdpr_consent_token", token);

    if (!error) {
      setConsented(true);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Invalid Link</h2>
            <p className="text-sm text-muted-foreground">
              This consent link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (alreadyConsented || consented) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-2">Consent Confirmed</h2>
            <p className="text-sm text-muted-foreground">
              Thank you, {clientName}. {firmName} can now send you document requests via PracticeNudge.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <ShieldCheck className="h-10 w-10 text-primary mx-auto mb-2" />
          <CardTitle className="text-xl">Communication Consent</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Hi {clientName}, <strong>{firmName}</strong> would like to send you secure document requests and reminders via PracticeNudge.
          </p>
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-2">
            <p><strong>By giving consent, you agree that:</strong></p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>{firmName} can send you document upload requests</li>
              <li>You may receive email reminders about pending documents</li>
              <li>Your email is only used for communication with {firmName}</li>
              <li>You can withdraw consent at any time</li>
            </ul>
          </div>
          <Button onClick={handleConsent} disabled={submitting} className="w-full">
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="mr-2 h-4 w-4" />
            )}
            I Consent
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            If you do not consent, simply close this page. No further emails will be sent.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
