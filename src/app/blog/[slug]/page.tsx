import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar, RefreshCw } from "lucide-react";
import type { Metadata } from "next";
import { allPosts, posts, relatedPosts } from "@/lib/blog-posts";
import { renderMarkdown } from "@/lib/markdown";
import { jsonLdString } from "@/lib/json-ld";

type Props = { params: { slug: string } };

const SITE = "https://www.practicenudge.com";

export async function generateStaticParams() {
  return allPosts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = posts[params.slug];
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.updated,
      authors: [post.author],
      section: post.category,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
    alternates: {
      canonical: `${SITE}/blog/${params.slug}`,
    },
  };
}

const fmtLong = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

export default function BlogPost({ params }: Props) {
  const post = posts[params.slug];
  if (!post) notFound();

  const url = `${SITE}/blog/${params.slug}`;
  const isUpdated = post.updated > post.date;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.updated,
    articleSection: post.category,
    keywords: post.keywords.join(", "),
    image: [`${url}/opengraph-image`],
    author: { "@type": "Organization", name: post.author, url: SITE },
    publisher: {
      "@type": "Organization",
      name: "PracticeNudge",
      url: SITE,
      logo: { "@type": "ImageObject", url: `${SITE}/logo.svg` },
    },
    mainEntityOfPage: url,
    ...(post.sources.length ? { citation: post.sources.map((s) => s.url) } : {}),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
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
        <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to blog
        </Link>

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge variant="secondary">{post.category}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <time dateTime={post.date}>{fmtLong(post.date)}</time>
            </span>
            {isUpdated && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-3.5 w-3.5" />
                Updated <time dateTime={post.updated}>{fmtLong(post.updated)}</time>
              </span>
            )}
            <span className="text-sm text-muted-foreground">{post.readTime}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{post.title}</h1>
          <p className="text-lg text-muted-foreground">{post.excerpt}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            By {post.author}. Last reviewed <time dateTime={post.updated}>{fmtLong(post.updated)}</time>.
          </p>
        </header>

        <div className="max-w-none">{renderMarkdown(post.content)}</div>

        {post.sources.length > 0 && (
          <section aria-labelledby="sources-title" className="mt-10 rounded-lg border bg-slate-50 p-5">
            <h2 id="sources-title" className="text-base font-semibold mb-2">Sources</h2>
            <p className="text-sm text-muted-foreground mb-3">
              Rules and dates come from HMRC and GOV.UK. Check them there before you rely on this page.
            </p>
            <ul className="space-y-1.5 text-sm">
              {post.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:no-underline">
                    {s.title}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CTA */}
        <div className="mt-12 p-6 bg-primary/5 rounded-lg border border-primary/20 text-center">
          <h3 className="text-xl font-bold mb-2">Ready to stop chasing clients?</h3>
          <p className="text-muted-foreground mb-4">
            PracticeNudge tracks MTD readiness, sends reminders, and collects documents — free during pilot.
          </p>
          <Link href="/register">
            <Button>
              Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Related articles */}
        <div className="mt-10 pt-8 border-t">
          <h3 className="text-lg font-bold mb-4">Related articles</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {relatedPosts(params.slug).map((related) => (
              <Link key={related.slug} href={`/blog/${related.slug}`} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                <Badge variant="secondary" className="text-xs mb-2">{related.category}</Badge>
                <h4 className="text-sm font-semibold line-clamp-2">{related.title}</h4>
              </Link>
            ))}
          </div>
        </div>

        {/* Free tracker CTA */}
        <div className="mt-8 p-4 bg-slate-50 rounded-lg border text-center">
          <p className="text-sm text-muted-foreground mb-2">
            Want a free spreadsheet to track all of this?
          </p>
          <Link href="/mtd" className="text-sm text-primary font-medium hover:underline">
            Download the free MTD Client Readiness Tracker →
          </Link>
        </div>

        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(articleJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumbJsonLd) }} />
      </article>
    </div>
  );
}
