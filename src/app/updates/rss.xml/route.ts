import { getPublishedUpdates } from "@/lib/mtd-updates/queries";
import { buildRss } from "@/lib/rss";
import { plainSummary } from "@/lib/mtd-updates/text";

const SITE = "https://www.practicenudge.com";

export const revalidate = 3600;

export async function GET() {
  const updates = await getPublishedUpdates(50);
  const xml = buildRss({
    title: "PracticeNudge MTD Updates",
    description: "Short, dated notes on new GOV.UK and HMRC guidance about Making Tax Digital for Income Tax.",
    siteUrl: `${SITE}/updates`,
    feedUrl: `${SITE}/updates/rss.xml`,
    items: updates.map((u) => ({
      title: u.title,
      link: `${SITE}/updates/${u.slug}`,
      date: u.publishedAt,
      description: plainSummary(u.body, 400),
    })),
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
