import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.practicenudge.com";

  // Static pages
  const staticPages = [
    { url: baseUrl, lastModified: new Date("2026-05-20"), changeFrequency: "weekly" as const, priority: 1 },
    { url: `${baseUrl}/mtd`, lastModified: new Date("2026-05-20"), changeFrequency: "monthly" as const, priority: 0.9 },
    { url: `${baseUrl}/compare/sage-mtd-agent`, lastModified: new Date("2026-05-20"), changeFrequency: "monthly" as const, priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date("2026-05-15"), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: `${baseUrl}/register`, lastModified: new Date("2025-01-10"), changeFrequency: "monthly" as const, priority: 0.5 },
    { url: `${baseUrl}/login`, lastModified: new Date("2025-01-10"), changeFrequency: "monthly" as const, priority: 0.3 },
  ];

  // Blog posts with actual publish dates
  const blogPostDates: Record<string, string> = {
    "mtd-client-readiness-checklist-2026": "2025-01-15",
    "how-to-track-mtd-compliance-small-practice": "2025-02-01",
    "stop-chasing-clients-mtd-documents": "2025-02-15",
    "mtd-itsa-deadlines-2026-2027-2028": "2025-03-01",
    "sole-trader-landlord-mtd-what-accountants-need": "2025-03-15",
  };

  const blogPosts = Object.entries(blogPostDates).map(([slug, date]) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(date),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...blogPosts];
}
