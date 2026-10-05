import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getTokenSecret, verifyUnsubscribeToken } from "@/lib/outreach/tokens";

export const metadata: Metadata = {
  title: "Unsubscribe | PracticeNudge",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

// Opening this page changes nothing: a person confirms with a button, since mail scanners follow links.
export default function UnsubscribePage({ searchParams }: { searchParams: { token?: string; done?: string; error?: string } }) {
  const token = typeof searchParams.token === "string" ? searchParams.token : null;
  const validToken = token && verifyUnsubscribeToken(token, getTokenSecret()) ? token : null;

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        {searchParams.done ? (
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto" aria-hidden />
            <h1 className="text-lg font-semibold">You&apos;re unsubscribed</h1>
            <p className="text-sm text-muted-foreground">
              You won&apos;t get follow-up emails from PracticeNudge any more. Messages you need to use your
              account, such as password resets, can still be sent.
            </p>
            <Link href="/" className="inline-block text-sm text-primary hover:underline">Go to practicenudge.com</Link>
          </CardContent>
        ) : (
          <>
            <CardHeader className="text-center">
              <MailX className="h-10 w-10 text-muted-foreground mx-auto mb-2" aria-hidden />
              <h1 className="text-xl font-semibold leading-none tracking-tight">Unsubscribe from PracticeNudge emails</h1>
              <CardDescription>
                {validToken
                  ? "Confirm below and we'll stop sending you follow-up emails."
                  : "Enter your email address and we'll stop sending you follow-up emails."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {searchParams.error && (
                <p role="alert" className="mb-4 text-sm text-destructive">
                  That didn&apos;t work. Please try again, or reply to any of our emails with &ldquo;unsubscribe&rdquo;.
                </p>
              )}
              <form method="post" action="/api/outreach/unsubscribe" className="space-y-4">
                {validToken ? (
                  <input type="hidden" name="token" value={validToken} />
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email address</Label>
                    <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
                  </div>
                )}
                <Button type="submit" className="w-full">Unsubscribe</Button>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </main>
  );
}
