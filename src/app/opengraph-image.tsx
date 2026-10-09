import { ogCard, OG_SIZE } from "@/lib/og-card";

export const alt = "PracticeNudge: collect your clients' MTD records without chasing them";
export const size = OG_SIZE;
export const contentType = "image/png";
// Edge runtime: the generator then needs no Node font or WASM loading.
export const runtime = "edge";

export default function Image() {
  return ogCard({
    eyebrow: "For small UK accounting practices",
    title: "Collect your clients' MTD records without chasing them.",
    footer: "Making Tax Digital for Income Tax · Free pilot",
  });
}