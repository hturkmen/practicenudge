import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Calendar } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MTD Blog — Guides for UK Accountants",
  description:
    "Practical guides on Making Tax Digital compliance, client readiness tracking, and document collection for small UK accounting practices.",
  openGraph: {
    title: "PracticeNudge Blog — MTD Guides for UK Accountants",
    description:
      "Practical guides on Making Tax Digital compliance, client readiness tracking, and document collection.",
  },
};

const posts = [
  {
    slug: "mtd-client-readiness-checklist-2026",
    title: "MTD Client Readiness Checklist for 2026: What Every Small Practice Needs",
    excerpt:
      "A practical checklist for UK accountants to assess which clients are MTD-ready, what documents are missing, and how to prioritise your workload before HMRC deadlines.",
    date: "2026-05-10",
    category: "MTD Compliance",
    readTime: "8 min read",
  },
  {
    slug: "how-to-track-mtd-compliance-small-practice",
    title: "How to Track MTD Compliance Across 50–200 Clients Without Spreadsheets",
    excerpt:
      "Spreadsheets break down at scale. Here's how small practices can track MTD readiness, missing documents, and follow-ups without the manual overhead.",
    date: "2026-05-05",
    category: "Practice Management",
    readTime: "6 min read",
  },
  {
    slug: "stop-chasing-clients-mtd-documents",
    title: "Stop Chasing Clients for MTD Documents: Automated Reminders That Work",
    excerpt:
      "Most accountants spend 5+ hours per week chasing clients for missing records. Learn how automated reminders and magic upload links can cut that to minutes.",
    date: "2026-04-28",
    category: "Productivity",
    readTime: "5 min read",
  },
  {
    slug: "mtd-itsa-deadlines-2026-2027-2028",
    title: "MTD ITSA Deadlines: Complete Timeline for 2026, 2027, and 2028",
    excerpt:
      "The full timeline of Making Tax Digital for Income Tax thresholds — £50k (April 2026), £30k (April 2027), £20k (April 2028) — and what each means for your practice.",
    date: "2026-04-20",
    category: "MTD Compliance",
    readTime: "7 min read",
  },
  {
    slug: "sole-trader-landlord-mtd-what-accountants-need",
    title: "Sole Traders & Landlords Under MTD: What Accountants Need to Prepare",
    excerpt:
      "Your sole trader and landlord clients face MTD obligations now. Here's what information you need from them, common gaps, and how to get ahead.",
    date: "2026-04-15",
    category: "Client Management",
    readTime: "6 min read",
  },
];

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
        </div>

        <div className="space-y-6">
          {posts.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {post.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.date).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
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
