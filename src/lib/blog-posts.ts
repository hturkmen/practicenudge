// The blog posts, read from the generated data (content/blog/*.md is the source: see
// src/lib/blog-content.ts and `npm run blog:build`). Kept as one module so the pages, the sitemap,
// the feed and the share images all agree. Edge-safe: no file access here.

import { BLOG_DATA } from "./blog-data.generated";
import { readTimeOf, type BlogSource } from "./blog-content";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  /** Publication date, YYYY-MM-DD. */
  date: string;
  /** Last substantive review, YYYY-MM-DD (falls back to `date`). */
  updated: string;
  category: string;
  readTime: string;
  author: string;
  content: string;
  keywords: string[];
  sources: BlogSource[];
};

export const DEFAULT_AUTHOR = "PracticeNudge Team";

/** Newest first. */
export const allPosts: BlogPost[] = BLOG_DATA.map((p) => ({
  slug: p.slug,
  title: p.title,
  excerpt: p.excerpt,
  date: p.date,
  updated: p.updated ?? p.date,
  category: p.category,
  readTime: readTimeOf(p.content),
  author: p.author ?? DEFAULT_AUTHOR,
  content: p.content,
  keywords: p.keywords,
  sources: p.sources,
}));

export const posts: Record<string, BlogPost> = Object.fromEntries(allPosts.map((p) => [p.slug, p]));

/** Other posts, same category first, then newest. */
export function relatedPosts(slug: string, limit = 4): BlogPost[] {
  const current = posts[slug];
  return allPosts
    .filter((p) => p.slug !== slug)
    .sort((a, b) => Number(b.category === current?.category) - Number(a.category === current?.category))
    .slice(0, limit);
}
