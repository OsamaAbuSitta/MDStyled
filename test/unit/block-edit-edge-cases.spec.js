// Additional edge-case coverage for planBlockEdit, applyBlockEditPlan, and applyBlockEdit.
// Fills gaps not covered by the main block-edit.spec.js suite.

const { test, expect } = require('@playwright/test');
const { blockEdit } = require('../harness/build');

const { planBlockEdit, applyBlockEditPlan, applyBlockEdit } = blockEdit();

const apply  = (text, edit) => applyBlockEdit(text, edit);
const textOf = (text, edit) => {
  const r = apply(text, edit);
  if (!r.ok) throw new Error('edit refused: ' + r.error);
  return r.text;
};

// ─── first-block edits ────────────────────────────────────────────────────────

test.describe('first-block edits (line 0)', () => {
  const file = '# Title\n\nFirst paragraph\n\nLast paragraph\n';

  test('edit the heading at line 0', () => {
    expect(textOf(file, { startLine: 0, endLine: 1, text: '# New Title', original: '# Title' }))
      .toBe('# New Title\n\nFirst paragraph\n\nLast paragraph\n');
  });

  test('replace heading with a plain paragraph at line 0', () => {
    expect(textOf(file, { startLine: 0, endLine: 1, text: 'Just a paragraph', original: '# Title' }))
      .toBe('Just a paragraph\n\nFirst paragraph\n\nLast paragraph\n');
  });

  test('replace heading with a multi-line block at line 0', () => {
    expect(textOf(file, { startLine: 0, endLine: 1, text: '# A\n## B', original: '# Title' }))
      .toBe('# A\n## B\n\nFirst paragraph\n\nLast paragraph\n');
  });

  test('stale check works at line 0', () => {
    const r = apply(file, { startLine: 0, endLine: 1, text: '# X', original: '## Wrong' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/changed/);
  });
});

// ─── insert before the first block ───────────────────────────────────────────

test.describe('inserting before the first block', () => {
  const file = 'First paragraph\n';

  test('insert at line 0 (zero-width) places content before everything', () => {
    expect(textOf(file, { startLine: 0, endLine: 0, text: '\n# Title\n\n', original: '' }))
      .toBe('\n# Title\n\nFirst paragraph\n');
  });
});

// ─── single-line files ────────────────────────────────────────────────────────

test.describe('single-line files', () => {
  test('edit the only line in a file with no trailing newline', () => {
    expect(textOf('hello', { startLine: 0, endLine: 1, text: 'world', original: 'hello' }))
      .toBe('world');
  });

  test('edit the only line in a file with a trailing newline', () => {
    expect(textOf('hello\n', { startLine: 0, endLine: 1, text: 'world', original: 'hello' }))
      .toBe('world\n');
  });

  test('delete the only line leaves an empty document', () => {
    expect(textOf('hello\n', { startLine: 0, endLine: 1, text: '', original: 'hello' }))
      .toBe('');
  });

  test('replace the only line with a multi-line block (no trailing newline)', () => {
    expect(textOf('hello', { startLine: 0, endLine: 1, text: 'one\ntwo', original: 'hello' }))
      .toBe('one\ntwo');
  });
});

// ─── files with YAML front matter (treated as plain text) ────────────────────

test.describe('files with YAML-style front matter', () => {
  const frontMatter = '---\ntitle: My Doc\n---\n\n# Content\n\nBody paragraph\n';
  // Lines: ['---', 'title: My Doc', '---', '', '# Content', '', 'Body paragraph', '']

  test('editing a block after front matter leaves front matter intact', () => {
    expect(textOf(frontMatter, { startLine: 4, endLine: 5, text: '# New Content', original: '# Content' }))
      .toBe('---\ntitle: My Doc\n---\n\n# New Content\n\nBody paragraph\n');
  });

  test('editing inside front matter treats --- as regular lines', () => {
    expect(textOf(frontMatter, { startLine: 1, endLine: 2, text: 'title: Changed', original: 'title: My Doc' }))
      .toBe('---\ntitle: Changed\n---\n\n# Content\n\nBody paragraph\n');
  });
});

// ─── planBlockEdit: boundary and clamping behaviour ──────────────────────────

test.describe('planBlockEdit – boundary cases', () => {
  test('empty lines array: start and end both clamp to 0, no trailing newline added', () => {
    const plan = planBlockEdit([], '\n', { startLine: 0, endLine: 1, text: 'hello', original: '' });
    expect(plan).toEqual({ ok: true, start: 0, end: 0, replacement: 'hello' });
  });

  test('zero-width range at a non-zero line inserts without removing anything', () => {
    const plan = planBlockEdit(['a', 'b', 'c', ''], '\n',
      { startLine: 2, endLine: 2, text: 'X', original: '' });
    expect(plan).toEqual({ ok: true, start: 2, end: 2, replacement: 'X\n' });
  });

  test('startLine equal to endLine equal to 0 in a populated file inserts before everything', () => {
    const plan = planBlockEdit(['a', 'b', ''], '\n',
      { startLine: 0, endLine: 0, text: 'prefix', original: '' });
    expect(plan).toEqual({ ok: true, start: 0, end: 0, replacement: 'prefix\n' });
  });

  test('startLine at the very last real line (before trailing empty)', () => {
    // lines = ['text', ''], last real line = 0; endLine = 1 is the trailing empty
    const plan = planBlockEdit(['text', ''], '\n',
      { startLine: 0, endLine: 1, text: 'replaced', original: 'text' });
    expect(plan).toEqual({ ok: true, start: 0, end: 1, replacement: 'replaced\n' });
  });

  test('CRLF eol is used in the replacement', () => {
    const plan = planBlockEdit(['a', 'b', ''], '\r\n',
      { startLine: 0, endLine: 1, text: 'x\ny', original: 'a' });
    expect(plan).toEqual({ ok: true, start: 0, end: 1, replacement: 'x\r\ny\r\n' });
  });
});

// ─── applyBlockEditPlan: direct application cases ────────────────────────────

test.describe('applyBlockEditPlan – direct application', () => {
  test('empty replacement removes a middle line', () => {
    expect(applyBlockEditPlan('a\nb\nc\n', { start: 1, end: 2, replacement: '' }))
      .toBe('a\nc\n');
  });

  test('start = end = 0 inserts before the first line', () => {
    expect(applyBlockEditPlan('hello\n', { start: 0, end: 0, replacement: 'prefix\n' }))
      .toBe('prefix\nhello\n');
  });

  test('end past the last line replaces to the end of the document', () => {
    expect(applyBlockEditPlan('a\nb', { start: 1, end: 10, replacement: 'Z' }))
      .toBe('a\nZ');
  });

  test('start = end past the last line appends to the document', () => {
    expect(applyBlockEditPlan('a\nb\n', { start: 3, end: 3, replacement: 'c\n' }))
      .toBe('a\nb\nc\n');
  });

  test('applies correctly with CRLF line endings', () => {
    expect(applyBlockEditPlan('a\r\nb\r\nc\r\n', { start: 1, end: 2, replacement: 'X\r\n' }))
      .toBe('a\r\nX\r\nc\r\n');
  });

  test('replacing the entire content of a file', () => {
    expect(applyBlockEditPlan('old\n', { start: 0, end: 2, replacement: 'new\n' }))
      .toBe('new\n');
  });
});

// ─── stale-edit detection: additional cases ───────────────────────────────────

test.describe('stale-edit detection – additional cases', () => {
  const file = 'Para one\n\nPara two\n';

  test('original that is a substring of the actual content is rejected', () => {
    const r = apply(file, { startLine: 0, endLine: 1, text: 'X', original: 'Para' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/changed/);
  });

  test('original with extra whitespace is tolerated via normalize', () => {
    // normalize strips trailing newlines, so 'Para one\n\n' normalizes to 'Para one'
    const r = apply(file, { startLine: 0, endLine: 1, text: 'X', original: 'Para one\n\n' });
    expect(r.ok).toBe(true);
  });

  test('missing original field skips the stale check even when content differs', () => {
    const r = apply(file, { startLine: 0, endLine: 1, text: 'X' });
    expect(r.ok).toBe(true);
  });

  test('original set to undefined skips the stale check', () => {
    const r = apply(file, { startLine: 0, endLine: 1, text: 'X', original: undefined });
    expect(r.ok).toBe(true);
  });
});

// ─── blank-block and empty-replacement edge cases ─────────────────────────────

test.describe('blank blocks and empty replacements', () => {
  const file = '# T\n\nbody\n\nlast\n';

  test('replacing a blank separator line with empty text leaves just the gap', () => {
    // The blank line between heading and body is at line 1 (the '' in lines array)
    // planBlockEdit from line 1 to 2 replaces that blank line
    const plan = planBlockEdit(file.split('\n'), '\n', { startLine: 1, endLine: 2, text: '', original: '' });
    expect(plan.ok).toBe(true);
    expect(plan.replacement).toBe('');
  });

  test('zero-length insert with blank-line padding keeps adjacent blocks separated', () => {
    // Existing tests cover this pattern; verify the blank line is written through
    const out = textOf(file, { startLine: 3, endLine: 3, text: '\n## New', original: '' });
    expect(out).toBe('# T\n\nbody\n\n## New\n\nlast\n');
  });
});

// ─── selector comment preserved alongside its block ──────────────────────────

test.describe('selector comment lives with its block', () => {
  // The serializer outputs `<!-- .note -->\n> text` as a single string for a block.
  // blockEdit treats these two physical lines as one logical block and replaces them together.
  const file = '# Intro\n\n<!-- .note -->\n> A note\n\nLast\n';
  // Lines: ['# Intro', '', '<!-- .note -->', '> A note', '', 'Last', '']
  //         0          1   2               3           4    5      6

  test('editing the commented block replaces both the comment and the quote', () => {
    expect(textOf(file, { startLine: 2, endLine: 4, text: '<!-- .note -->\n> Updated note', original: '<!-- .note -->\n> A note' }))
      .toBe('# Intro\n\n<!-- .note -->\n> Updated note\n\nLast\n');
  });

  test('editing only the blockquote without the comment is detected as stale', () => {
    const r = apply(file, { startLine: 3, endLine: 4, text: '> Updated note', original: '<!-- .note -->' });
    expect(r.ok).toBe(false);
  });
});
