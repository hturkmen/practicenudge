/**
 * GOV.UK search Atom feed for Making Tax Digital, newest update first. Plain text parsing with no
 * XML library: the feed has a simple, stable shape and we only need four fields per entry.
 */

export const GOVUK_MTD_FEED =
  "https://www.gov.uk/search/all.atom?keywords=%22making+tax+digital%22&order=updated-newest";

export type FeedEntry = {
  title: string;
  /** Absolute https://www.gov.uk/... address of the page. */
  url: string;
  /** ISO 8601 timestamp of the page's last update. */
  updatedAt: string;
  /** The summary GOV.UK shows in search results; may be empty. */
  summary: string;
};

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  pound: "£",
  rsquo: "’",
  lsquo: "‘",
  ndash: "–",
  mdash: "—",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

/**
 * Plain text of a feed field. GOV.UK sends summaries as escaped HTML (&lt;mark&gt;word&lt;/mark&gt;), so the
 * text is decoded, stripped of tags, and decoded again for entities that were nested inside the HTML.
 * The result is only ever shown as text (React escapes it), never inserted as markup.
 */
export function plainText(html: string): string {
  const unescaped = decodeEntities(html.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
  return decodeEntities(unescaped.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function tag(entry: string, name: string): string {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i").exec(entry);
  return m ? m[1] : "";
}

/** Only pages on gov.uk over https are accepted as a source. */
export function isGovUkUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && (u.hostname === "www.gov.uk" || u.hostname === "gov.uk");
  } catch {
    return false;
  }
}

export function parseAtomEntries(xml: string): FeedEntry[] {
  const entries = xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ?? [];
  const out: FeedEntry[] = [];
  for (const raw of entries) {
    const title = plainText(tag(raw, "title"));
    const link = /<link[^>]*\bhref="([^"]+)"/i.exec(raw)?.[1];
    const url = link ? decodeEntities(link) : "";
    const updated = plainText(tag(raw, "updated")) || plainText(tag(raw, "published"));
    const time = Date.parse(updated);
    if (!title || !isGovUkUrl(url) || Number.isNaN(time)) continue;
    out.push({
      title,
      url: url.split("#")[0],
      updatedAt: new Date(time).toISOString(),
      // Search snippets start with an ellipsis ("…Learn more about Making Tax Digital").
      summary: plainText(tag(raw, "summary") || tag(raw, "content")).replace(/^…+\s*/, ""),
    });
  }
  return out;
}

/** Entries updated within the last `days` days, newest first. */
export function recentEntries(entries: FeedEntry[], now: Date, days: number): FeedEntry[] {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return entries
    .filter((e) => Date.parse(e.updatedAt) >= cutoff && Date.parse(e.updatedAt) <= now.getTime() + 60 * 60 * 1000)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** The gov.uk content API address of a page, e.g. https://www.gov.uk/api/content/guidance/x */
export function contentApiUrl(pageUrl: string): string | null {
  if (!isGovUkUrl(pageUrl)) return null;
  const { pathname } = new URL(pageUrl);
  return `https://www.gov.uk/api/content${pathname}`;
}

/** Readable text of a content API response (body or all parts), capped at `max` characters. */
export function textFromContentApi(json: unknown, max = 6000): string {
  const details = (json as { details?: { body?: string; parts?: Array<{ title?: string; body?: string }> } })?.details;
  if (!details) return "";
  const html = details.body
    ? details.body
    : (details.parts ?? []).map((p) => `<h2>${p.title ?? ""}</h2>${p.body ?? ""}`).join("\n");
  // Keep block boundaries as line breaks so the model sees structure.
  const withBreaks = html.replace(/<\/(p|li|h\d|tr)>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
  return decodeEntities(withBreaks.replace(/<[^>]*>/g, " "))
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .slice(0, max);
}
