import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPublishedUpdate } from "@/lib/mtd-updates/queries";
import { renderMarkdown } from "@/lib/markdown";
import { jsonLdString } from "@/lib/json-ld";
import { plainSummary } from "@/lib/mtd-updates/text";

export const revalidate = 3600;

const SITE = "https://www.practicenudge.com";

type Props = { params: { slug: string } };

/** Start of the note as plain text, for search result descriptions. */
const describe = (body: string) => plainSummary(body, 155);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const update = await getPublishedUpdate(params.slug);
  if (!update) return {};
  return {
    title: update.title,
    description: describe(update.body),
    alternates: { canonical: `${SITE}/updates/${update.slug}` },
    openGraph: {
      title: update.title,
      description: describe(update.body),
      type: "article",
      publishedTime: update.publishedAt,
      modifiedTime: update.publishedAt,
      authors: ["PracticeNudge Team"],
    },
  };
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export default async function UpdatePage({ params }: Props) {
  const update = await getPublishedUpdate(params.slug);
  if (!update) notFound();

  const url = `${SITE}/updates/${update.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: update.title,
    description: describe(update.body),
    datePublished: update.publishedAt,
    dateModified: update.publishedAt,
    author: { "@type": "Organization", name: "PracticeNudge Team", url: SITE },
    publisher: {
      "@type": "Organization",
      name: "PracticeNudge",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/logo.svg` },
    },
    mainEntityOfPage: url,
    citation: [update.sourceUrl],
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "MTD Updates", item: `${SITE}/updates` },
      { "@type": "ListItem", position: 3, name: update.title, item: url },
    ],
  };

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-lg font-bold text-primary">PracticeNudge</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
            <Link href="/updates" className="text-muted-foreground hover:text-foreground">MTD Updates</Link>
            <Link href="/register" className="text-primary font-medium">Free Trial</Link>
          </div>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/updates" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> All MTD updates
        </Link>

        <header className="mb-6">
          <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
            <time dateTime={update.publishedAt}>{fmt(update.publishedAt)}</time>
          </p>
          <h1 className="text-3xl font-bold tracking-tight">{update.title}</h1>
        </header>

        <div>{renderMarkdown(update.body)}</div>

        <section aria-labelledby="source-title" className="mt-8 rounded-lg border bg-slate-50 p-5">
          <h2 id="source-title" className="text-base font-semibold mb-2">Source</h2>
          <p className="text-sm text-muted-foreground mb-3">
            This note summarises a GOV.UK page and was reviewed by a person before it was published. GOV.UK is the
            authority: check the page before you act.
          </p>
          <a
            href={update.sourceUrl}
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary font-medium underline underline-offset-2 hover:no-underline"
          >
            {update.sourceTitle} (updated {fmt(update.sourceUpdatedAt)}) <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        </section>

        <div className="mt-10 p-6 bg-primary/5 rounded-lg border border-primary/20 text-center">
          <h3 className="text-xl font-bold mb-2">Keep track of MTD across all your clients</h3>
          <p className="text-muted-foreground mb-4">
            PracticeNudge tracks which clients are ready, sends the reminders and collects the records. Free during pilot.
          </p>
          <Link href="/register">
            <Button>
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="mt-8 text-sm text-muted-foreground">
          Related:{" "}
          <Link href="/what-is-mtd" className="text-primary font-medium hover:underline">What is MTD for Income Tax?</Link>
          {" · "}
          <Link href="/blog/mtd-quarterly-update-7-november-2026" className="text-primary font-medium hover:underline">The 7 November quarterly deadline</Link>
          {" · "}
          <Link href="/blog/mtd-itsa-agent-authorisation-guide" className="text-primary font-medium hover:underline">Agent authorisation guide</Link>
        </div>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(articleJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd) }} />
      </article>
    </div>
  );
}
