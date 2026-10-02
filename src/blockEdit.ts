/**
 * How a block edit from the preview is applied to the Markdown file. Kept free of the
 * VS Code API so the extension and the end-to-end test harness run exactly the same
 * rules.
 */

export interface BlockEdit {
  startLine: number;
  endLine: number;
  text: string;
  /** What the preview loaded for these lines; the edit is refused if the file differs. */
  original?: string;
}

export type BlockEditPlan =
  | { ok: true; start: number; end: number; replacement: string }
  | { ok: false; error: string };

const normalize = (s: string) => s.replace(/\r\n?/g, '\n').replace(/\n+$/, '');

/**
 * Works out which lines to replace and with what. `lines` are the file's lines as
 * VS Code counts them: a file ending in a newline has an empty last line.
 */
export function planBlockEdit(lines: string[], eol: '\n' | '\r\n', edit: BlockEdit): BlockEditPlan {
  const startLine = Number(edit.startLine);
  const endLine = Number(edit.endLine);
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 0 || endLine < startLine) {
    return { ok: false, error: 'Invalid edit range.' };
  }

  const lineCount = lines.length;
  const start = Math.min(startLine, lineCount);
  const end = Math.min(endLine, lineCount);

  // The preview was rendered from an older version of the file - don't clobber it.
  if (typeof edit.original === 'string' && normalize(lines.slice(start, end).join('\n')) !== normalize(edit.original)) {
    return { ok: false, error: 'The file changed since this block was loaded. Reload the preview and try again.' };
  }

  // The range stops at the start of the next line, or at the end of the file.
  const keepsTrailingEol = end < lineCount;
  const fileEndsWithEol = lineCount > 0 && lines[lineCount - 1].length === 0;

  let body = (typeof edit.text === 'string' ? edit.text : '').replace(/\r\n?/g, '\n');
  if (body === '') {
    // An empty replacement means "remove these lines", not "leave a blank one".
  } else if (keepsTrailingEol) {
    // Blank lines the caller asked for are kept - that is how a block is separated
    // from the one after it when inserting.
    if (!body.endsWith('\n')) body += '\n';
  } else {
    body = body.replace(/\n+$/, '');
    if (fileEndsWithEol) body += '\n';
  }

  return { ok: true, start, end, replacement: body.split('\n').join(eol) };
}

/** Applies a plan to the whole file text, as VS Code applies it to the document. */
export function applyBlockEditPlan(text: string, plan: { start: number; end: number; replacement: string }): string {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const lines = text.split(/\r\n|\n/);
  const offsetOf = (line: number) => {
    if (line >= lines.length) return text.length;
    let offset = 0;
    for (let i = 0; i < line; i++) offset += lines[i].length + eol.length;
    return offset;
  };
  // Range(end, 0) past the last line is clamped to the end of the document.
  const from = offsetOf(plan.start);
  const to = plan.end >= lines.length ? text.length : offsetOf(plan.end);
  return text.slice(0, from) + plan.replacement + text.slice(to);
}

/** Convenience for callers holding the whole file as a string. */
export function applyBlockEdit(text: string, edit: BlockEdit): { ok: true; text: string } | { ok: false; error: string } {
  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const plan = planBlockEdit(text.split(/\r\n|\n/), eol, edit);
  if (!plan.ok) return plan;
  return { ok: true, text: applyBlockEditPlan(text, plan) };
}
