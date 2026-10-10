import { describe, it, expect } from "vitest";
import { buildRss, escapeXml } from "../rss";
import { jsonLdString } from "../json-ld";
import { plainSummary } from "../mtd-updates/text";

describe("escapeXml", () => {
  it("escapes the five XML characters and drops illegal control characters", () => {
    expect(escapeXml(`<a href="x">Tom & 'Jerry'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;Tom &amp; &apos;Jerry&apos;&lt;/a&gt;");
    expect(escapeXml("a\u0000b\u0008c")).toBe("abc");
  });
});

describe("buildRss", () => {
  const channel = {
    title: "Blog & news",
    description: "d",
    siteUrl: "https://www.practicenudge.com/blog",
    feedUrl: "https://www.practicenudge.com/blog/rss.xml",
    items: [
      { title: "Older <post>", link: "https://www.practicenudge.com/blog/a", date: "2026-04-20", description: "old" },
      { title: "Newer", link: "https://www.practicenudge.com/blog/b", date: "2026-10-10", description: "new", category: "MTD" },
    ],
  };

  it("lists items newest first with escaped text, permalinks and RFC 822 dates", () => {
    const xml = buildRss(channel);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml.indexOf("Newer")).toBeLessThan(xml.indexOf("Older"));
    expect(xml).toContain("<title>Blog &amp; news</title>");
    expect(xml).toContain("<title>Older &lt;post&gt;</title>");
    expect(xml).toContain('<guid isPermaLink="true">https://www.practicenudge.com/blog/b</guid>');
    expect(xml).toContain("<pubDate>Sat, 10 Oct 2026 08:00:00 GMT</pubDate>");
    expect(xml).toContain("<category>MTD</category>");
    expect(xml).toContain('<atom:link href="https://www.practicenudge.com/blog/rss.xml" rel="self" type="application/rss+xml" />');
  });

  it("is valid with no items", () => {
    expect(buildRss({ ...channel, items: [] })).toContain("<lastBuildDate>Thu, 01 Jan 1970 00:00:00 GMT</lastBuildDate>");
  });
});

describe("jsonLdString", () => {
  it("cannot be used to close the script tag early", () => {
    const out = jsonLdString({ headline: "</script><script>alert(1)</script>", note: "a & b" });
    expect(out).not.toContain("<");
    expect(out).not.toContain(">");
    expect(JSON.parse(out)).toEqual({ headline: "</script><script>alert(1)</script>", note: "a & b" });
  });

  it("escapes the unicode line separators", () => {
    const ls = String.fromCharCode(0x2028);
    const ps = String.fromCharCode(0x2029);
    const value = `a${ls}b${ps}c`;
    const out = jsonLdString({ t: value });
    expect(out.includes(ls)).toBe(false);
    expect(out.includes(ps)).toBe(false);
    expect(JSON.parse(out).t).toBe(value);
  });
});

describe("plainSummary", () => {
  it("removes markup but keeps hyphens inside words", () => {
    const md = "**What changed**: the [Self-Assessment page](/x) was updated for self-employed agents.\n\n- point one\n- point two";
    expect(plainSummary(md, 200)).toBe("What changed: the Self-Assessment page was updated for self-employed agents. point one point two");
  });

  it("cuts at a word boundary with an ellipsis", () => {
    const out = plainSummary("alpha beta gamma delta epsilon", 18);
    expect(out.endsWith("...")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(18);
    expect(out).toBe("alpha beta...");
  });

  it("leaves short text alone", () => {
    expect(plainSummary("Short.", 100)).toBe("Short.");
  });
});
