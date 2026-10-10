import { MetadataRoute } from "next";
import { allPosts } from "@/lib/blog-posts";
import { getPublishedUpdates } from "@/lib/mtd-updates/queries";

const baseUrl = "https://www.practicenudge.com";

/** Latest of several YYYY-MM-DD or ISO dates. */
const latest = (dates: string[], fallback: string) =>
  new Date(dates.length ? dates.reduce((a, b) => (a > b ? a : b)) : fallback);

// Rebuilt when a note is published (revalidatePath) and at least hourly.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const updates = await getPublishedUpdates(200);

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date("2026-10-08"), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/what-is-mtd`, lastModified: new Date("2026-10-07"), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/mtd`, lastModified: new Date("2026-10-08"), changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/compare/sage-mtd-agent`, lastModified: new Date("2026-05-20"), changeFrequency: "monthly", priority: 0.8 },
    {
      url: `${baseUrl}/blog`,
      lastModified: latest(allPosts.map((p) => p.updated), "2026-10-08"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/updates`,
      lastModified: latest(updates.map((u) => u.publishedAt), "2026-10-10"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    { url: `${baseUrl}/register`, lastModified: new Date("2026-10-08"), changeFrequency: "monthly", priority: 0.5 },
  ];

  // Dates come from each post's own frontmatter, so the sitemap cannot drift from the page.
  const blogPosts: MetadataRoute.Sitemap = allPosts.map((p) => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: new Date(p.updated),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const updatePages: MetadataRoute.Sitemap = updates.map((u) => ({
    url: `${baseUrl}/updates/${u.slug}`,
    lastModified: new Date(u.publishedAt),
    changeFrequency: "yearly",
    priority: 0.6,
  }));

  return [...staticPages, ...blogPosts, ...updatePages];
}
