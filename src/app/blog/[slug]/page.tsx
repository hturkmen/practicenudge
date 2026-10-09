import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calendar } from "lucide-react";
import type { Metadata } from "next";
import { posts } from "@/lib/blog-posts";

type Props = { params: { slug: string } };

export async function generateStaticParams() {
  return Object.keys(posts).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = posts[params.slug];
  if (!post) return {};

  return {
    title: post.title,
    description: post.excerpt,
    keywords: post.keywords,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.date,
      authors: ["PracticeNudge"],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
    alternates: {
      canonical: `https://www.practicenudge.com/blog/${params.slug}`,
    },
  };
}

export default function BlogPost({ params }: Props) {
  const post = posts[params.slug];
  if (!post) notFound();

  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-lg font-bold text-primary">PracticeNudge</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/blog" className="text-muted-foreground hover:text-foreground">Blog</Link>
            <Link href="/register" className="text-primary font-medium">Free Trial</Link>
          </div>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to blog
        </Link>

        <header className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Badge variant="secondary">{post.category}</Badge>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(post.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <span className="text-sm text-muted-foreground">{post.readTime}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{post.title}</h1>
          <p className="text-lg text-muted-foreground">{post.excerpt}</p>
        </header>

        <div className="prose prose-slate max-w-none prose-headings:font-bold prose-h2:text-2xl prose-h3:text-xl prose-p:text-base prose-li:text-base">
          {post.content.split("\n\n").map((block, i) => {
            if (block.startsWith("## ")) {
              return <h2 key={i} className="text-2xl font-bold mt-8 mb-4">{block.replace("## ", "")}</h2>;
            }
            if (block.startsWith("### ")) {
              return <h3 key={i} className="text-xl font-semibold mt-6 mb-3">{block.replace("### ", "")}</h3>;
            }
            if (block.startsWith("| ")) {
              const rows = block.split("\n").filter(r => !r.startsWith("|--"));
              const headers = rows[0]?.split("|").filter(Boolean).map(h => h.trim());
              const data = rows.slice(1).map(r => r.split("|").filter(Boolean).map(c => c.trim()));
              return (
                <div key={i} className="overflow-x-auto my-4">
                  <table className="w-full text-sm border">
                    <thead><tr className="bg-gray-50">{headers?.map((h, j) => <th key={j} className="border px-3 py-2 text-left font-medium">{h}</th>)}</tr></thead>
                    <tbody>{data.map((row, ri) => <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="border px-3 py-2">{cell}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              );
            }
            if (block.startsWith("- [ ]") || block.startsWith("- **")) {
              const items = block.split("\n");
              return (
                <ul key={i} className="space-y-1 my-4 list-disc pl-5">
                  {items.map((item, j) => (
                    <li key={j} className="text-sm">{item.replace(/^- \[.\] /, "").replace(/^- /, "")}</li>
                  ))}
                </ul>
              );
            }
            if (block.startsWith("1. ")) {
              const items = block.split("\n");
              return (
                <ol key={i} className="space-y-1 my-4 list-decimal pl-5">
                  {items.map((item, j) => (
                    <li key={j} className="text-sm">{item.replace(/^\d+\. /, "")}</li>
                  ))}
                </ol>
              );
            }
            if (block.includes("[") && block.includes("](")) {
              const match = block.match(/\[(.+?)\]\((.+?)\)/);
              if (match) {
                return (
                  <p key={i} className="my-4">
                    <Link href={match[2]} className="text-primary font-medium hover:underline">
                      {match[1]}
                    </Link>
                  </p>
                );
              }
            }
            return <p key={i} className="my-4 text-muted-foreground leading-relaxed">{block}</p>;
          })}
        </div>

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
            {Object.entries(posts)
              .filter(([slug]) => slug !== params.slug)
              .slice(0, 4)
              .map(([slug, relatedPost]) => (
                <Link key={slug} href={`/blog/${slug}`} className="p-4 border rounded-lg hover:shadow-sm transition-shadow">
                  <Badge variant="secondary" className="text-xs mb-2">{relatedPost.category}</Badge>
                  <h4 className="text-sm font-semibold line-clamp-2">{relatedPost.title}</h4>
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

        {/* Article structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: post.title,
              description: post.excerpt,
              datePublished: post.date,
              author: { "@type": "Organization", name: "PracticeNudge" },
              publisher: { "@type": "Organization", name: "PracticeNudge", url: "https://www.practicenudge.com" },
              mainEntityOfPage: `https://www.practicenudge.com/blog/${params.slug}`,
            }),
          }}
        />
        {/* Breadcrumb structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: "https://www.practicenudge.com" },
                { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.practicenudge.com/blog" },
                { "@type": "ListItem", position: 3, name: post.title, item: `https://www.practicenudge.com/blog/${params.slug}` },
              ],
            }),
          }}
        />
      </article>
    </div>
  );
}
