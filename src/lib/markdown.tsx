import Link from "next/link";
import type { ReactNode } from "react";

/**
 * A small Markdown renderer for blog posts and MTD updates. It builds React elements and never
 * injects raw HTML, so text from the database or an AI draft cannot add markup or scripts.
 *
 * Blocks: ## / ### / #### headings, paragraphs, - lists (with [ ] / [x] checklist items),
 * 1. lists, | tables |, > quotes, --- rules.
 * Inline: **bold**, *italic* / _italic_, `code`, [text](url). Only /paths, https://, http:// and
 * mailto: links are linked; anything else (javascript:, data:, ...) is shown as plain text.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; children: Inline[] };

export type Block =
  | { type: "heading"; level: 2 | 3 | 4; children: Inline[] }
  | { type: "paragraph"; children: Inline[] }
  | { type: "list"; ordered: boolean; checklist: boolean; items: Inline[][] }
  | { type: "table"; head: Inline[][]; rows: Inline[][][] }
  | { type: "quote"; children: Inline[] }
  | { type: "rule" };

/** The only link targets we render as links. */
export function isSafeHref(href: string): boolean {
  const h = href.trim();
  if (/[\u0000-\u001f\u007f\\]/.test(h)) return false;
  if (h.startsWith("//")) return false;
  return h.startsWith("/") || /^https?:\/\//i.test(h) || /^mailto:/i.test(h);
}

const SPECIAL = /(\*\*|\*|_|`|\[)/;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  const pushText = (t: string) => {
    if (!t) return;
    const last = out[out.length - 1];
    if (last && last.type === "text") last.text += t;
    else out.push({ type: "text", text: t });
  };

  while (rest) {
    const m = SPECIAL.exec(rest);
    if (!m) {
      pushText(rest);
      break;
    }
    pushText(rest.slice(0, m.index));
    rest = rest.slice(m.index);

    if (rest.startsWith("`")) {
      const end = rest.indexOf("`", 1);
      if (end > 1) {
        out.push({ type: "code", text: rest.slice(1, end) });
        rest = rest.slice(end + 1);
        continue;
      }
    } else if (rest.startsWith("**")) {
      const end = rest.indexOf("**", 2);
      if (end > 2) {
        out.push({ type: "strong", children: parseInline(rest.slice(2, end)) });
        rest = rest.slice(end + 2);
        continue;
      }
    } else if (rest.startsWith("*") || rest.startsWith("_")) {
      const mark = rest[0];
      const end = rest.indexOf(mark, 1);
      // `_` inside a word (snake_case) is not emphasis; `*` followed by a space is a bullet or maths.
      const prev = text.slice(0, text.length - rest.length).slice(-1);
      const intraWord = mark === "_" && /[A-Za-z0-9]/.test(prev);
      if (end > 1 && !intraWord && !/\s/.test(rest[1])) {
        out.push({ type: "em", children: parseInline(rest.slice(1, end)) });
        rest = rest.slice(end + 1);
        continue;
      }
    } else if (rest.startsWith("[")) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
      if (link) {
        const [whole, label, href] = link;
        if (isSafeHref(href)) out.push({ type: "link", href, children: parseInline(label) });
        else pushText(label);
        rest = rest.slice(whole.length);
        continue;
      }
    }
    // Not valid markup after all: keep the character as text.
    pushText(rest[0]);
    rest = rest.slice(1);
  }
  return out;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

const isRule = (l: string) => /^(-{3,}|\*{3,}|_{3,})$/.test(l.trim());
const isTableSeparator = (l: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(l);

export function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) {
      i++;
      continue;
    }

    const heading = /^(#{2,4})\s+(.*)$/.exec(trimmed);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length as 2 | 3 | 4, children: parseInline(heading[2].trim()) });
      i++;
      continue;
    }

    if (isRule(trimmed)) {
      blocks.push({ type: "rule" });
      i++;
      continue;
    }

    if (trimmed.startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      const head = splitRow(trimmed).map(parseInline);
      i += 2;
      const rows: Inline[][][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]).map(parseInline));
        i++;
      }
      blocks.push({ type: "table", head, rows });
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", children: parseInline(quote.join(" ")) });
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/;
    const numbered = /^\d+[.)]\s+(.*)$/;
    if (bullet.test(trimmed) || numbered.test(trimmed)) {
      const ordered = numbered.test(trimmed);
      const marker = ordered ? numbered : bullet;
      const items: Inline[][] = [];
      let checklist = false;
      while (i < lines.length && marker.test(lines[i].trim())) {
        let text = marker.exec(lines[i].trim())![1];
        const box = /^\[( |x|X)\]\s+(.*)$/.exec(text);
        if (box) {
          checklist = true;
          text = box[2];
        }
        items.push(parseInline(text));
        i++;
      }
      blocks.push({ type: "list", ordered, checklist, items });
      continue;
    }

    // Paragraph: consecutive plain lines.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{2,4}\s/.test(lines[i].trim()) &&
      !isRule(lines[i]) &&
      !lines[i].trim().startsWith(">") &&
      !(lines[i].trim().startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1])) &&
      !(para.length > 0 && (bullet.test(lines[i].trim()) || numbered.test(lines[i].trim())))
    ) {
      para.push(lines[i].trim());
      i++;
    }
    blocks.push({ type: "paragraph", children: parseInline(para.join(" ")) });
  }
  return blocks;
}

function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.type) {
      case "text":
        return n.text;
      case "strong":
        return <strong key={i} className="font-semibold text-foreground">{renderInline(n.children)}</strong>;
      case "em":
        return <em key={i}>{renderInline(n.children)}</em>;
      case "code":
        return <code key={i} className="rounded bg-slate-100 px-1 py-0.5 text-[0.9em]">{n.text}</code>;
      case "link": {
        const external = /^(https?:|mailto:)/i.test(n.href);
        return external ? (
          <a key={i} href={n.href} rel="noopener noreferrer" className="text-primary font-medium underline underline-offset-2 hover:no-underline">
            {renderInline(n.children)}
          </a>
        ) : (
          <Link key={i} href={n.href} className="text-primary font-medium underline underline-offset-2 hover:no-underline">
            {renderInline(n.children)}
          </Link>
        );
      }
    }
  });
}

export function renderBlocks(blocks: Block[]): ReactNode {
  return blocks.map((b, i) => {
    switch (b.type) {
      case "heading":
        if (b.level === 2) return <h2 key={i} className="text-2xl font-bold mt-10 mb-4 text-foreground">{renderInline(b.children)}</h2>;
        if (b.level === 3) return <h3 key={i} className="text-xl font-semibold mt-8 mb-3 text-foreground">{renderInline(b.children)}</h3>;
        return <h4 key={i} className="text-lg font-semibold mt-6 mb-2 text-foreground">{renderInline(b.children)}</h4>;
      case "paragraph":
        return <p key={i} className="my-4 text-muted-foreground leading-relaxed">{renderInline(b.children)}</p>;
      case "list": {
        const Tag = b.ordered ? "ol" : "ul";
        return (
          <Tag
            key={i}
            className={`my-4 space-y-1.5 text-muted-foreground ${b.checklist ? "list-none pl-0" : b.ordered ? "list-decimal pl-5" : "list-disc pl-5"}`}
          >
            {b.items.map((item, j) => (
              <li key={j} className="leading-relaxed">
                {b.checklist && <span aria-hidden="true" className="mr-2 text-primary">☐</span>}
                {renderInline(item)}
              </li>
            ))}
          </Tag>
        );
      }
      case "table":
        return (
          <div key={i} className="overflow-x-auto my-6">
            <table className="w-full text-sm border">
              <thead>
                <tr className="bg-gray-50">
                  {b.head.map((h, j) => <th key={j} className="border px-3 py-2 text-left font-medium">{renderInline(h)}</th>)}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((row, ri) => (
                  <tr key={ri}>{row.map((cell, ci) => <td key={ci} className="border px-3 py-2">{renderInline(cell)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case "quote":
        return <blockquote key={i} className="my-6 border-l-4 border-primary/40 pl-4 italic text-muted-foreground">{renderInline(b.children)}</blockquote>;
      case "rule":
        return <hr key={i} className="my-8" />;
    }
  });
}

export function renderMarkdown(src: string): ReactNode {
  return renderBlocks(parseBlocks(src));
}
