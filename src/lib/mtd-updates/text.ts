/**
 * Plain-text start of a Markdown body, for search result descriptions and feed items. Removes the
 * markup but keeps hyphens inside words ("Self Assessment" stays, "self-employed" stays).
 */
export function plainSummary(markdown: string, max: number): string {
  const plain = markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*(?:[-*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?/gm, "")
    .replace(/(\*\*|__|`)/g, "")
    .replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,;:!?]|$)/g, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, max - 3).replace(/\s+\S*$/, "") + "...";
}
