const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

/**
 * Serialises structured data for a <script type="application/ld+json"> tag. JSON.stringify leaves
 * `<` untouched, so a title containing "</script>" would end the tag early; escaping `<`, `>` and `&`
 * as unicode escapes keeps the JSON identical for parsers and safe in HTML. Also escapes the two
 * line separators that are legal in JSON but not in older JavaScript.
 */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .split(LINE_SEPARATOR)
    .join("\\u2028")
    .split(PARAGRAPH_SEPARATOR)
    .join("\\u2029");
}
