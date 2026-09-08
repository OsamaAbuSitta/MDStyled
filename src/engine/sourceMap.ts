/**
 * Maps rendered blocks back to the lines of the Markdown file they came from,
 * so the preview can offer in-place editing.
 */

export const SOURCE_LINE_ATTR = 'data-mdstyled-line';

/** Top-level block tokens whose renderer emits the token's own attributes. */
const ANNOTATABLE = new Set([
  'heading_open',
  'paragraph_open',
  'blockquote_open',
  'bullet_list_open',
  'ordered_list_open',
  'table_open',
  'fence',
  'code_block',
  'hr',
]);

/** Splits a document the same way the webview does, so line indexes line up. */
export function splitSourceLines(markdownRaw: string): string[] {
  return markdownRaw.split(/\r\n|\r|\n/);
}

/**
 * How many lines of the raw file come before `content` (frontmatter, mostly).
 * markdown-it works on the frontmatter-stripped body, so every token map has to
 * be shifted by this before it means anything to the editor.
 */
export function computeLineOffset(markdownRaw: string, content: string): number {
  if (!content) return 0;
  const index = markdownRaw.indexOf(content);
  if (index <= 0) return 0;
  return splitSourceLines(markdownRaw.slice(0, index)).length - 1;
}

/**
 * Tags every top-level block with the `start,end` source lines it was rendered from.
 * `end` is exclusive and never covers the blank lines that separate blocks - a list's
 * token map includes them, and swallowing them would glue the next block onto the list.
 */
export function annotateSourceLines(tokens: any[], lineOffset = 0, sourceLines?: string[]): any[] {
  for (const token of tokens) {
    if (!token || token.level !== 0 || !Array.isArray(token.map)) continue;
    if (!ANNOTATABLE.has(token.type)) continue;

    const start = token.map[0] + lineOffset;
    let end = token.map[1] + lineOffset;
    if (sourceLines) {
      while (end > start + 1 && (sourceLines[end - 1] || '').trim() === '') end--;
    }

    const value = start + ',' + end;
    if (!token.attrs) token.attrs = [];
    const existing = token.attrs.find((a: [string, string]) => a[0] === SOURCE_LINE_ATTR);
    if (existing) existing[1] = value;
    else token.attrs.push([SOURCE_LINE_ATTR, value]);
  }
  return tokens;
}
