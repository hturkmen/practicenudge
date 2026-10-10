import Link from "next/link";
import type { Metadata } from "next";
import { Calendar, ExternalLink, Rss } from "lucide-react";
import { getPublishedUpdates } from "@/lib/mtd-updates/queries";
import { renderMarkdown } from "@/lib/markdown";
import { jsonLdString } from "@/lib/json-ld";

// Refreshed when a note is published or unpublished (revalidatePath), and at least hourly.
export const revalidate = 3600;

const SITE = "https://www.practicenudge.com";

export const metadata: Metadata = {
  title: "MTD Updates: what HMRC and GOV.UK just published, for UK accountants",
  description:
    "Short, dated notes on new GOV.UK and HMRC guidance about Making Tax Digital for Income Tax, summarised for small UK accounting practices. Every note is reviewed by a person and links to its source.",
  alternates: {
    canonical: `${SITE}/updates`,
    types: { "application/rss+xml": `${SITE}/updates/rss.xml` },
  },
  openGraph: {
    title: "MTD Updates for UK accountants | PracticeNudge",
    description: "Short, dated notes on new GOV.UK and HMRC guidance about Making Tax Digital for Income Tax.",
    type: "website",
  },
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function UpdatesPage() {
  const updates = await getPublishedUpdates(50);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "MTD Updates",
    url: `${SITE}/updates`,
    description: "Short, dated notes on new GOV.UK and HMRC guidance about Making Tax Digital for Income Tax.",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: updates.map((u, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${SITE}/updates/${u.slug}`,
        name: u.title,
      })),
    },
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-lg font-bold text-primary">PracticeNudge</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
            <Link href="/updates" className="font-medium">MTD Updates</Link>
            <Link href="/register" className="text-primary font-medium">Free Trial</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <header className="mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">MTD Updates</h1>
          <p className="text-lg text-muted-foreground">
            Short, dated notes on what HMRC and GOV.UK have just published about Making Tax Digital for
            Income Tax, written for small UK accounting practices.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Each note is a summary: it is reviewed by a person before it appears here and links to the GOV.UK page
            it is based on. GOV.UK is the authority, so check the source before you act.{" "}
            <a href="/updates/rss.xml" className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
              <Rss className="h-3.5 w-3.5" aria-hidden="true" /> RSS feed
            </a>
          </p>
        </header>

        {updates.length === 0 ? (
          <div className="rounded-lg border bg-slate-50 p-6 text-muted-foreground">
            <p className="font-medium text-foreground mb-1">The first notes are on their way.</p>
            <p className="text-sm">
              Meanwhile, the <Link href="/blog" className="text-primary font-medium hover:underline">guides</Link> and the{" "}
              <Link href="/what-is-mtd" className="text-primary font-medium hover:underline">plain-English MTD page</Link>{" "}
              cover the dates and thresholds.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {updates.map((u) => (
              <article key={u.slug} className="border-b pb-10 last:border-b-0">
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  <time dateTime={u.publishedAt}>{fmt(u.publishedAt)}</time>
                </p>
                <h2 className="text-2xl font-bold tracking-tight">
                  <Link href={`/updates/${u.slug}`} className="hover:text-primary transition-colors">
                    {u.title}
                  </Link>
                </h2>
                <div>{renderMarkdown(u.body)}</div>
                <p className="mt-4 text-sm">
                  <span className="text-muted-foreground">Source: </span>
                  <a
                    href={u.sourceUrl}
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary font-medium underline underline-offset-2 hover:no-underline"
                  >
                    {u.sourceTitle} (GOV.UK, updated {fmt(u.sourceUpdatedAt)}) <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </p>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t py-8 px-4 mt-12">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/">
            <span className="font-semibold text-primary">PracticeNudge</span>
          </Link>
          <p className="text-xs text-muted-foreground text-center">
            MTD client readiness tracking for small UK practices. Not tax filing software. Contains public sector
            information licensed under the Open Government Licence v3.0.
          </p>
        </div>
      </footer>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(jsonLd) }} />
    </div>
  );
}
