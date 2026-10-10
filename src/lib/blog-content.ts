/**
 * Blog posts live as Markdown files in content/blog/*.md with a small frontmatter block:
 *
 *   ---
 *   title: "A title"            (JSON string)
 *   excerpt: "One or two sentences for search results and cards."
 *   date: 2026-10-10            (publication date, YYYY-MM-DD)
 *   updated: 2026-10-12         (optional: last substantive review, YYYY-MM-DD)
 *   category: MTD Compliance
 *   author: PracticeNudge Team  (optional)
 *   keywords:
 *     - making tax digital
 *   sources:
 *     - GOV.UK guidance title | https://www.gov.uk/...
 *   ---
 *
 * This file only parses text, so it has no imports: scripts/build-blog-data.mjs runs it directly
 * (Node strips the types) to produce src/lib/blog-data.generated.ts, which the pages import.
 * Reading the files at request time would not work on the edge runtime used by the share images.
 */

export type BlogSource = { title: string; url: string }

export type BlogPostData = {
  slug: string
  title: string
  excerpt: string
  date: string
  updated?: string
  category: string
  author?: string
  keywords: string[]
  sources: BlogSource[]
  content: string
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** Splits `---` frontmatter from the body. Throws when the block is missing or unterminated. */
export function splitFrontmatter(raw: string): { meta: string[]; body: string } {
  const lines = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n').split('\n')
  if (lines[0].trim() !== '---') throw new Error('missing frontmatter (file must start with ---)')
  const end = lines.indexOf('---', 1)
  if (end === -1) throw new Error('unterminated frontmatter (no closing ---)')
  return { meta: lines.slice(1, end), body: lines.slice(end + 1).join('\n').replace(/^\n+/, '').replace(/\s+$/, '') + '\n' }
}

function scalar(value: string): string {
  const v = value.trim()
  if (v.startsWith('"')) return JSON.parse(v) as string
  return v
}

/** Parses the frontmatter lines into key -> string | string[] (a key with no value starts a list). */
export function parseMeta(lines: string[]): Record<string, string | string[]> {
  const out: Record<string, string | string[]> = {}
  let listKey: string | null = null
  for (const line of lines) {
    if (!line.trim()) continue
    const item = /^\s+-\s+(.*)$/.exec(line)
    if (item) {
      if (!listKey) throw new Error(`list item without a key: ${line}`)
      ;(out[listKey] as string[]).push(scalar(item[1]))
      continue
    }
    const kv = /^([A-Za-z][A-Za-z0-9_]*):\s*(.*)$/.exec(line)
    if (!kv) throw new Error(`cannot read frontmatter line: ${line}`)
    const [, key, value] = kv
    if (value.trim() === '') {
      listKey = key
      out[key] = []
    } else {
      listKey = null
      out[key] = scalar(value)
    }
  }
  return out
}

function required(meta: Record<string, string | string[]>, key: string, slug: string): string {
  const v = meta[key]
  if (typeof v !== 'string' || !v) throw new Error(`${slug}: frontmatter "${key}" is required`)
  return v
}

function sourcesOf(value: string | string[] | undefined, slug: string): BlogSource[] {
  if (!value) return []
  if (!Array.isArray(value)) throw new Error(`${slug}: "sources" must be a list`)
  return value.map((entry) => {
    const [title, url] = entry.split('|').map((s) => s.trim())
    if (!title || !url || !/^https:\/\//.test(url)) {
      throw new Error(`${slug}: a source must look like "Title | https://..." (got "${entry}")`)
    }
    return { title, url }
  })
}

/** Turns one markdown file into a post. Validates what search results and the sitemap depend on. */
export function parsePost(slug: string, raw: string): BlogPostData {
  const { meta: metaLines, body } = splitFrontmatter(raw)
  const meta = parseMeta(metaLines)

  const date = required(meta, 'date', slug)
  if (!DATE_RE.test(date)) throw new Error(`${slug}: "date" must be YYYY-MM-DD`)
  const updated = typeof meta.updated === 'string' && meta.updated ? meta.updated : undefined
  if (updated && !DATE_RE.test(updated)) throw new Error(`${slug}: "updated" must be YYYY-MM-DD`)
  if (updated && updated < date) throw new Error(`${slug}: "updated" is before "date"`)

  const excerpt = required(meta, 'excerpt', slug)
  if (excerpt.length > 300) throw new Error(`${slug}: "excerpt" is ${excerpt.length} characters (max 300)`)

  const keywords = meta.keywords
  if (keywords !== undefined && !Array.isArray(keywords)) throw new Error(`${slug}: "keywords" must be a list`)

  return {
    slug,
    title: required(meta, 'title', slug),
    excerpt,
    date,
    ...(updated ? { updated } : {}),
    category: required(meta, 'category', slug),
    ...(typeof meta.author === 'string' && meta.author ? { author: meta.author } : {}),
    keywords: (keywords as string[] | undefined) ?? [],
    sources: sourcesOf(meta.sources, slug),
    content: body,
  }
}

/** Newest first; ties broken by slug so the order is stable. */
export function sortPosts<T extends { date: string; slug: string }>(posts: T[]): T[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug))
}

/** "6 min read", from the word count of the markdown body. */
export function readTimeOf(markdown: string): string {
  const words = markdown.replace(/[#*`>|\-\[\]()_]/g, ' ').split(/\s+/).filter(Boolean).length
  return `${Math.max(1, Math.round(words / 200))} min read`
}

/** Serialises one post back to a markdown file (used by the one-off migration). */
export function serialisePost(post: Omit<BlogPostData, 'slug'>): string {
  const lines = ['---', `title: ${JSON.stringify(post.title)}`, `excerpt: ${JSON.stringify(post.excerpt)}`, `date: ${post.date}`]
  if (post.updated) lines.push(`updated: ${post.updated}`)
  lines.push(`category: ${post.category}`)
  if (post.author) lines.push(`author: ${post.author}`)
  if (post.keywords.length) lines.push('keywords:', ...post.keywords.map((k) => `  - ${JSON.stringify(k)}`))
  if (post.sources.length) lines.push('sources:', ...post.sources.map((s) => `  - ${JSON.stringify(`${s.title} | ${s.url}`)}`))
  lines.push('---', '', post.content.trim(), '')
  return lines.join('\n')
}
