import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { isSafeHref, parseBlocks, parseInline, renderMarkdown } from "../markdown";

const html = (md: string) => renderToStaticMarkup(<div>{renderMarkdown(md)}</div>);

describe("parseInline", () => {
  it("parses bold, italic, code and links", () => {
    expect(parseInline("a **b** c *d* `e` [f](/g)")).toEqual([
      { type: "text", text: "a " },
      { type: "strong", children: [{ type: "text", text: "b" }] },
      { type: "text", text: " c " },
      { type: "em", children: [{ type: "text", text: "d" }] },
      { type: "text", text: " " },
      { type: "code", text: "e" },
      { type: "text", text: " " },
      { type: "link", href: "/g", children: [{ type: "text", text: "f" }] },
    ]);
  });

  it("leaves unmatched markers and snake_case alone", () => {
    expect(parseInline("a * b and snake_case_name and **open")).toEqual([
      { type: "text", text: "a * b and snake_case_name and **open" },
    ]);
  });

  it("nests emphasis inside bold", () => {
    expect(parseInline("**a *b* c**")).toEqual([
      {
        type: "strong",
        children: [
          { type: "text", text: "a " },
          { type: "em", children: [{ type: "text", text: "b" }] },
          { type: "text", text: " c" },
        ],
      },
    ]);
  });
});

describe("isSafeHref", () => {
  it("allows site paths, http(s) and mailto only", () => {
    for (const ok of ["/blog", "/mtd#top", "https://www.gov.uk/x", "http://a.example", "mailto:a@b.example"]) {
      expect(isSafeHref(ok)).toBe(true);
    }
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "//evil.example", "vbscript:x", "ftp://x", "foo", "/\\evil"]) {
      expect(isSafeHref(bad)).toBe(false);
    }
  });
});

describe("parseBlocks", () => {
  it("reads headings, paragraphs, lists, tables, quotes and rules", () => {
    const blocks = parseBlocks(
      ["## H2", "", "Para one", "continues here.", "", "- a", "- b", "", "1. x", "2. y", "", "> quote", "", "---", "", "| A | B |", "|---|---|", "| 1 | 2 |"].join("\n")
    );
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "list", "list", "quote", "rule", "table"]);
    expect(blocks[1]).toMatchObject({ type: "paragraph", children: [{ type: "text", text: "Para one continues here." }] });
    expect(blocks[3]).toMatchObject({ type: "list", ordered: true });
    expect(blocks[6]).toMatchObject({ type: "table" });
  });

  it("recognises checklist items", () => {
    const [list] = parseBlocks("- [ ] one\n- [x] two");
    expect(list).toMatchObject({ type: "list", checklist: true });
    expect((list as { items: unknown[] }).items).toHaveLength(2);
  });

  it("handles Windows line endings", () => {
    expect(parseBlocks("## A\r\n\r\ntext\r\n").map((b) => b.type)).toEqual(["heading", "paragraph"]);
  });
});

describe("renderMarkdown", () => {
  it("renders bold text as markup, not as literal asterisks", () => {
    const out = html("**From April 2026:** sole traders over £50,000.");
    expect(out).toContain("<strong");
    expect(out).not.toContain("**");
  });

  it("renders a checklist with box glyphs and a table", () => {
    const out = html("- [ ] Check income\n- [ ] Confirm software\n\n| A | B |\n|---|---|\n| 1 | 2 |");
    expect(out).toContain("☐");
    expect(out).toContain("<table");
    expect(out).toContain("<td");
  });

  it("never emits raw HTML or unsafe links from the source", () => {
    const out = html('<script>alert(1)</script> [x](javascript:alert(1)) <img src=x onerror=alert(1)>');
    expect(out).not.toContain("<script");
    expect(out).not.toContain("<img");
    expect(out).not.toContain("javascript:");
    expect(out).toContain("&lt;script&gt;");
    expect(out).toContain("x"); // the link label stays as text
  });

  it("opens external links safely", () => {
    const out = html("[GOV.UK](https://www.gov.uk/x)");
    expect(out).toContain('href="https://www.gov.uk/x"');
    expect(out).toContain('rel="noopener noreferrer"');
  });
});
