import type { Metadata } from "next";
import Link from "next/link";
import { CONTACT_EMAIL, CONTROLLER_ADDRESS, CONTROLLER_LEGAL_NAME, PRIVACY_LAST_UPDATED } from "@/lib/site-legal";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "How PracticeNudge collects and uses personal data.",
  alternates: { canonical: "https://www.practicenudge.com/privacy" },
};

const mail = <a href={"mailto:" + CONTACT_EMAIL} className="text-primary underline">{CONTACT_EMAIL}</a>;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

// Describes only what the product actually does today. Update it whenever data handling changes.
export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16 space-y-10">
        <header className="space-y-3">
          <Link href="/" className="text-sm font-semibold text-primary">PracticeNudge</Link>
          <h1 className="text-3xl font-bold tracking-tight">Privacy notice</h1>
          <p className="text-sm text-muted-foreground">Last updated {PRIVACY_LAST_UPDATED}</p>
        </header>

        <Section title="Who we are">
          <p>
            PracticeNudge is a client document tracking tool for UK accountancy practices.
            {CONTROLLER_LEGAL_NAME && <> It is run by {CONTROLLER_LEGAL_NAME}{CONTROLLER_ADDRESS && <>, {CONTROLLER_ADDRESS}</>}.</>}{" "}
            For anything about your data, email {mail}. A person reads every message.
          </p>
        </Section>

        <Section title="What we collect">
          <ul className="list-disc space-y-2 pl-5">
            <li><strong className="text-foreground">Your account:</strong> name, email address, firm name, how you sign in (email or Google) and when you last signed in.</li>
            <li><strong className="text-foreground">How you use the product:</strong> for example how many clients and document requests your firm has and when key steps happened. We use this to support you and to understand whether the product is working for you.</li>
            <li><strong className="text-foreground">The free tracker form:</strong> your name, email address, practice name, approximate client count and the IP address the form was sent from (used to limit abuse).</li>
            <li><strong className="text-foreground">Email delivery:</strong> whether our emails to you were delivered, bounced or reported as spam. We do not track whether you open our emails or click their links.</li>
            <li><strong className="text-foreground">Website visits:</strong> we use Google Analytics, which sets cookies, to count visits and see which pages are read, but only if you accept analytics in the cookie banner. If you decline, or have not chosen, nothing is sent to Google Analytics. You can change your choice at any time with "Cookie settings" in the page footer, which also removes the cookies from this site.</li>
          </ul>
          <p>
            Information your clients upload or that you add about your clients belongs to your firm. We store and process it
            only to provide the service to you, and your firm decides how it is used.
          </p>
        </Section>

        <Section title="Why we use it">
          <ul className="list-disc space-y-2 pl-5">
            <li>To provide the service you signed up for, including emails you need to use your account.</li>
            <li>To keep the service secure and prevent abuse.</li>
            <li>
              To send follow-up emails about getting set up and about PracticeNudge, but only if you ticked the box when you
              signed up. If you downloaded our tracker, we send the template and one follow-up email, as the form says.
            </li>
          </ul>
          <p>Every follow-up email has an unsubscribe link, and replying to any of our emails reaches a person.</p>
        </Section>

        <Section title="Who helps us run PracticeNudge">
          <p>
            We use these providers to run the service: Supabase (database and sign-in), Vercel (hosting), Resend (sending email),
            Cloudflare (domain and email routing), Google (sign-in with Google, if you choose it, and website analytics).
            Some of them may store data outside the UK. Email us if you would like details.
          </p>
          <p>We do not sell your data.</p>
        </Section>

        <Section title="How long we keep it">
          <p>
            We keep your account data while you have an account. If you unsubscribe, we keep your email address on a
            suppression list so that we never email you again. You can ask us to delete your data at any time.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            You can ask for a copy of your data, ask us to correct or delete it, object to how we use it, or withdraw consent
            at any time. Email {mail}. If you are unhappy with how we handle your data, you can complain to the Information
            Commissioner&apos;s Office at <a href="https://ico.org.uk" className="text-primary underline" rel="noopener noreferrer">ico.org.uk</a>.
          </p>
        </Section>
      </div>
    </main>
  );
}
