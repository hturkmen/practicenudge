import { posts } from "@/lib/blog-posts";
import { ogCard, OG_SIZE } from "@/lib/og-card";

export const alt = "PracticeNudge guide for UK accountants";
export const size = OG_SIZE;
export const contentType = "image/png";
// Edge runtime: the generator then needs no Node font or WASM loading.
export const runtime = "edge";

export default function Image({ params }: { params: { slug: string } }) {
  const post = posts[params.slug];
  return ogCard({
    eyebrow: post?.category ?? "Guide",
    title: post?.title ?? "MTD guides for UK accountants",
    footer: "practicenudge.com/blog",
  });
}