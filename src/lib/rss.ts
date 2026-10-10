export type RssItem = {
  title: string;
  link: string;
  /** Publication date, YYYY-MM-DD or a full ISO timestamp. */
  date: string;
  description: string;
  category?: string;
};

export type RssChannel = {
  title: string;
  description: string;
  /** Page the feed is about. */
  siteUrl: string;
  /** URL of the feed itself. */
  feedUrl: string;
  items: RssItem[];
};

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Characters that are not allowed in XML 1.0.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

function rfc822(date: string): string {
  const d = new Date(/^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T08:00:00Z` : date);
  return d.toUTCString();
}

/** RSS 2.0, newest item first. */
export function buildRss(channel: RssChannel): string {
  const items = [...channel.items].sort((a, b) => b.date.localeCompare(a.date));
  const lastBuild = items.length ? rfc822(items[0].date) : new Date(0).toUTCString();
  const body = items
    .map(
      (i) =>
        `    <item>\n` +
        `      <title>${escapeXml(i.title)}</title>\n` +
        `      <link>${escapeXml(i.link)}</link>\n` +
        `      <guid isPermaLink="true">${escapeXml(i.link)}</guid>\n` +
        `      <pubDate>${rfc822(i.date)}</pubDate>\n` +
        (i.category ? `      <category>${escapeXml(i.category)}</category>\n` : "") +
        `      <description>${escapeXml(i.description)}</description>\n` +
        `    </item>`
    )
    .join("\n");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
    `  <channel>\n` +
    `    <title>${escapeXml(channel.title)}</title>\n` +
    `    <link>${escapeXml(channel.siteUrl)}</link>\n` +
    `    <description>${escapeXml(channel.description)}</description>\n` +
    `    <language>en-gb</language>\n` +
    `    <lastBuildDate>${lastBuild}</lastBuildDate>\n` +
    `    <atom:link href="${escapeXml(channel.feedUrl)}" rel="self" type="application/rss+xml" />\n` +
    `${body}\n` +
    `  </channel>\n` +
    `</rss>\n`
  );
}
