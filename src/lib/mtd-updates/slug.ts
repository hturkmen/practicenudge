export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
}

/** "2026-10-10-how-to-get-authorised-as-a-tax-agent": dated, readable, stable. */
export function updateSlug(title: string, publishedAt: Date): string {
  const base = slugify(title) || "update";
  return `${publishedAt.toISOString().slice(0, 10)}-${base}`;
}

/** Appends -2, -3, ... until `exists` says the slug is free. */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  if (!(await exists(base))) return base;
  for (let n = 2; n < 50; n++) {
    const candidate = `${base}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }
  return `${base}-${Date.now()}`;
}
