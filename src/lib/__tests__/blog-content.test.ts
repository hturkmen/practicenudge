import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parsePost, parseMeta, readTimeOf, serialisePost, sortPosts, splitFrontmatter } from "../blog-content";
import { allPosts, posts, relatedPosts } from "../blog-posts";

const FILE = (extra = "") =>
  [
    "---",
    'title: "A clear title for the post"',
    'excerpt: "Short summary."',
    "date: 2026-10-10",
    "category: MTD Compliance",
    extra,
    "---",
    "",
    "Body text.",
    "",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

describe("frontmatter parsing", () => {
  it("reads scalars, lists and quoted strings", () => {
    const meta = parseMeta(['title: "He said: \\"hi\\""', "date: 2026-10-10", "keywords:", '  - "a"', "  - b"]);
    expect(meta).toEqual({ title: 'He said: "hi"', date: "2026-10-10", keywords: ["a", "b"] });
  });

  it("rejects a file with no frontmatter or an unterminated block", () => {
    expect(() => splitFrontmatter("no frontmatter")).toThrow(/missing frontmatter/);
    expect(() => splitFrontmatter("---\ntitle: x\n")).toThrow(/unterminated/);
  });

  it("handles Windows line endings and a byte order mark", () => {
    const post = parsePost("p", "﻿" + FILE().replace(/\n/g, "\r\n"));
    expect(post.title).toBe("A clear title for the post");
    expect(post.content).toBe("Body text.\n");
  });
});

describe("parsePost validation", () => {
  it("requires title, excerpt, date and category", () => {
    for (const key of ["title", "excerpt", "date", "category"]) {
      const lines = FILE().split("\n").filter((l) => !l.startsWith(`${key}:`));
      expect(() => parsePost("p", lines.join("\n"))).toThrow(new RegExp(`"${key}" is required`));
    }
  });

  it("checks dates, excerpt length and sources", () => {
    expect(() => parsePost("p", FILE().replace("2026-10-10", "10/10/2026"))).toThrow(/YYYY-MM-DD/);
    expect(() => parsePost("p", FILE("updated: 2026-01-01"))).toThrow(/before "date"/);
    expect(() => parsePost("p", FILE().replace('"Short summary."', JSON.stringify("x".repeat(301))))).toThrow(/max 300/);
    expect(() => parsePost("p", FILE('sources:\n  - "Title | http://insecure.example"'))).toThrow(/Title \| https/);
    const ok = parsePost("p", FILE('sources:\n  - "GOV.UK | https://www.gov.uk/x"'));
    expect(ok.sources).toEqual([{ title: "GOV.UK", url: "https://www.gov.uk/x" }]);
  });

  it("round-trips through serialisePost", () => {
    const original = parsePost("p", FILE('updated: 2026-10-12\nkeywords:\n  - "one"\nsources:\n  - "S | https://www.gov.uk/s"'));
    const { slug: _slug, ...rest } = original;
    expect(parsePost("p", serialisePost(rest))).toEqual(original);
  });
});

describe("helpers", () => {
  it("sorts newest first with a stable tie-break", () => {
    const sorted = sortPosts([
      { slug: "b", date: "2026-01-01" },
      { slug: "a", date: "2026-01-01" },
      { slug: "c", date: "2026-05-01" },
    ]);
    expect(sorted.map((p) => p.slug)).toEqual(["c", "a", "b"]);
  });

  it("estimates reading time from the word count", () => {
    expect(readTimeOf("word ".repeat(10))).toBe("1 min read");
    expect(readTimeOf("word ".repeat(1000))).toBe("5 min read");
  });
});

describe("the real blog content", () => {
  const dir = path.join(process.cwd(), "content/blog");
  const files = readdirSync(dir).filter((f) => f.endsWith(".md"));

  it("every markdown file is valid and appears in the generated data", () => {
    expect(files.length).toBeGreaterThanOrEqual(7);
    for (const f of files) {
      const slug = f.replace(/\.md$/, "");
      expect(() => parsePost(slug, readFileSync(path.join(dir, f), "utf8"))).not.toThrow();
      expect(posts[slug], `${slug} missing from blog-data.generated.ts: run npm run blog:build`).toBeDefined();
    }
    expect(allPosts).toHaveLength(files.length);
  });

  it("the generated file is up to date (npm run blog:build)", () => {
    const major = Number(process.versions.node.split(".")[0]);
    if (major < 22) return; // the generator needs Node 22.6+ to import TypeScript
    expect(() => execFileSync(process.execPath, ["scripts/build-blog-data.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  });

  it("lists posts newest first and gives each a unique slug", () => {
    const dates = allPosts.map((p) => p.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(new Set(allPosts.map((p) => p.slug)).size).toBe(allPosts.length);
  });

  it("internal links in posts point at pages that exist", () => {
    const staticPages = new Set(["/what-is-mtd", "/mtd", "/blog", "/updates", "/register", "/compare/sage-mtd-agent"]);
    for (const p of allPosts) {
      for (const m of Array.from(p.content.matchAll(/\]\((\/[^)\s]*)\)/g))) {
        const href = m[1].split("#")[0];
        const ok = staticPages.has(href) || (href.startsWith("/blog/") && posts[href.slice("/blog/".length)] !== undefined);
        expect(ok, `${p.slug} links to ${href}`).toBe(true);
      }
    }
  });

  it("the two October 2026 posts carry their GOV.UK sources and the verified facts", () => {
    const quarterly = posts["mtd-quarterly-update-7-november-2026"];
    expect(quarterly.sources.map((s) => s.url)).toContain("https://www.gov.uk/guidance/penalties-for-making-tax-digital-for-income-tax");
    expect(quarterly.content).toContain("7 November 2026");
    expect(quarterly.content).toContain("Saturday");
    expect(quarterly.content).toMatch(/no penalties for missing a quarterly update deadline/i);
    const agent = posts["mtd-itsa-agent-authorisation-guide"];
    expect(agent.sources[0].url).toContain("how-to-get-authorised-to-act-as-a-tax-agent");
    expect(agent.content).toMatch(/digital handshake/i);
  });

  it("related posts never include the post itself and prefer the same category", () => {
    const slug = "mtd-quarterly-update-7-november-2026";
    const related = relatedPosts(slug, 4);
    expect(related.map((p) => p.slug)).not.toContain(slug);
    expect(related[0].category).toBe(posts[slug].category);
    expect(related).toHaveLength(4);
  });
});
