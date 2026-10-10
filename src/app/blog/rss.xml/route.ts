import { allPosts } from "@/lib/blog-posts";
import { buildRss } from "@/lib/rss";

const SITE = "https://www.practicenudge.com";

export const dynamic = "force-static";

export function GET() {
  const xml = buildRss({
    title: "PracticeNudge Blog: MTD guides for UK accountants",
    description:
      "Practical guides on Making Tax Digital compliance, client readiness tracking and document collection for small UK accounting practices.",
    siteUrl: `${SITE}/blog`,
    feedUrl: `${SITE}/blog/rss.xml`,
    items: allPosts.map((p) => ({
      title: p.title,
      link: `${SITE}/blog/${p.slug}`,
      date: p.updated > p.date ? p.updated : p.date,
      description: p.excerpt,
      category: p.category,
    })),
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
