import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Calendar, Rss } from "lucide-react";
import type { Metadata } from "next";
import { allPosts } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "MTD Blog — Guides for UK Accountants",
  description:
    "Practical guides on Making Tax Digital compliance, client readiness tracking, and document collection for small UK accounting practices.",
  openGraph: {
    title: "PracticeNudge Blog — MTD Guides for UK Accountants",
    description:
      "Practical guides on Making Tax Digital compliance, client readiness tracking, and document collection.",
  },
  alternates: {
    canonical: "https://www.practicenudge.com/blog",
    types: { "application/rss+xml": "https://www.practicenudge.com/blog/rss.xml" },
  },
};

const fmt = (date: string) =>
  new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b sticky top-0 bg-white/95 backdrop-blur z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <span className="text-lg font-bold text-primary cursor-pointer">PracticeNudge</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-foreground">Home</Link>
            <Link href="/blog" className="font-medium">Blog</Link>
            <Link href="/updates" className="text-muted-foreground hover:text-foreground">MTD Updates</Link>
            <Link href="/register" className="text-primary font-medium">Free Trial</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            MTD Guides for UK Accountants
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Practical advice on Making Tax Digital compliance, client readiness tracking,
            and running a more efficient small practice.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Looking for short, dated notes on what HMRC has just published?{" "}
            <Link href="/updates" className="text-primary font-medium hover:underline">
              See MTD Updates
            </Link>
            .{" "}
            <a href="/blog/rss.xml" className="inline-flex items-center gap-1 text-primary font-medium hover:underline">
              <Rss className="h-3.5 w-3.5" aria-hidden="true" /> RSS feed
            </a>
          </p>
        </div>

        <div className="space-y-6">
          {allPosts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {post.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <time dateTime={post.date}>{fmt(post.date)}</time>
                    </span>
                    {post.updated > post.date && (
                      <span className="text-xs text-muted-foreground">
                        Updated <time dateTime={post.updated}>{fmt(post.updated)}</time>
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">{post.readTime}</span>
                  </div>
                  <CardTitle className="text-xl hover:text-primary transition-colors">
                    {post.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-3">{post.excerpt}</p>
                  <span className="text-sm text-primary font-medium flex items-center gap-1">
                    Read more <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-4 mt-12">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/">
            <span className="font-semibold text-primary">PracticeNudge</span>
          </Link>
          <p className="text-xs text-muted-foreground text-center">
            MTD client readiness tracking for small UK practices. Not tax filing software.
          </p>
        </div>
      </footer>
    </div>
  );
}
