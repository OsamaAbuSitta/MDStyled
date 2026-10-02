// Unit tests for src/engine/sourceMap.ts
// Functions: splitSourceLines, computeLineOffset, annotateSourceLines, SOURCE_LINE_ATTR
const { test, expect } = require('@playwright/test');
const { engine } = require('../harness/build');
const E = engine();
const { splitSourceLines, computeLineOffset, annotateSourceLines, SOURCE_LINE_ATTR } = E;

// ── splitSourceLines ──────────────────────────────────────────────────────

test.describe('splitSourceLines', () => {
  test('splits LF line endings', () => {
    expect(splitSourceLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  test('splits CRLF line endings', () => {
    expect(splitSourceLines('a\r\nb\r\nc')).toEqual(['a', 'b', 'c']);
  });

  test('splits bare CR line endings', () => {
    expect(splitSourceLines('a\rb\rc')).toEqual(['a', 'b', 'c']);
  });

  test('trailing newline produces a trailing empty string', () => {
    const lines = splitSourceLines('a\nb\n');
    expect(lines[lines.length - 1]).toBe('');
  });

  test('single line with no newline', () => {
    expect(splitSourceLines('hello')).toEqual(['hello']);
  });

  test('empty string returns one empty line', () => {
    expect(splitSourceLines('')).toEqual(['']);
  });
});

// ── computeLineOffset ─────────────────────────────────────────────────────

test.describe('computeLineOffset', () => {
  test('no frontmatter: content equals raw → offset 0', () => {
    const raw = '# Hello\n\nparagraph';
    expect(computeLineOffset(raw, raw)).toBe(0);
  });

  test('empty content returns 0', () => {
    expect(computeLineOffset('# Hello', '')).toBe(0);
  });

  test('content not found in raw returns 0', () => {
    expect(computeLineOffset('hello', 'world')).toBe(0);
  });

  test('frontmatter of 3 lines gives offset 2', () => {
    // raw = '---\ntitle: T\n---\n\n# Hello'
    // content starts at the '\n\n# Hello' after the closing ---
    const raw = '---\ntitle: T\n---\n\n# Hello';
    const content = '\n\n# Hello';
    // prefix = '---\ntitle: T\n---'  → 3 lines → offset = 3-1 = 2
    expect(computeLineOffset(raw, content)).toBe(2);
  });

  test('single-line frontmatter gives offset 1', () => {
    // raw = '---\n---\n\nbody'
    const raw = '---\n---\n\nbody';
    const content = '\n\nbody';
    // prefix = '---\n---' → 2 lines → offset = 2-1 = 1
    expect(computeLineOffset(raw, content)).toBe(1);
  });
});

// ── annotateSourceLines ───────────────────────────────────────────────────

const ANNOTATABLE_TYPES = [
  'heading_open', 'paragraph_open', 'blockquote_open',
  'bullet_list_open', 'ordered_list_open', 'table_open',
  'fence', 'code_block', 'hr',
];

function makeAnnotatableToken(type, map, extra = {}) {
  return { type, tag: '', attrs: null, map, nesting: 1, level: 0, ...extra };
}

test.describe('annotateSourceLines', () => {
  test('annotates an annotatable token with data-mdstyled-line', () => {
    const token = makeAnnotatableToken('paragraph_open', [2, 4]);
    annotateSourceLines([token], 0);
    const attr = token.attrs.find(a => a[0] === SOURCE_LINE_ATTR);
    expect(attr).toBeDefined();
    expect(attr[1]).toBe('2,4');
  });

  test('applies line offset to start and end', () => {
    const token = makeAnnotatableToken('paragraph_open', [1, 3]);
    annotateSourceLines([token], 5);
    const attr = token.attrs.find(a => a[0] === SOURCE_LINE_ATTR);
    expect(attr[1]).toBe('6,8');
  });

  test('skips tokens that are not annotatable', () => {
    const token = { type: 'inline', tag: '', attrs: null, map: [1, 2], nesting: 0, level: 0 };
    annotateSourceLines([token], 0);
    expect(token.attrs).toBeNull();
  });

  test('skips tokens without a map', () => {
    const token = { type: 'paragraph_open', tag: 'p', attrs: null, map: null, nesting: 1, level: 0 };
    annotateSourceLines([token], 0);
    expect(token.attrs).toBeNull();
  });

  test('skips nested tokens (level > 0)', () => {
    const token = makeAnnotatableToken('paragraph_open', [2, 4], { level: 1 });
    annotateSourceLines([token], 0);
    expect(token.attrs).toBeNull();
  });

  test('trims trailing blank lines from end using sourceLines', () => {
    const sourceLines = ['# H', '', 'para', '', ''];
    // token.map = [2, 5] → end 5, but sourceLines[4]='' and sourceLines[3]='' are blank
    // trimming stops when end-1 is non-blank: sourceLines[2]='para'
    const token = makeAnnotatableToken('paragraph_open', [2, 5]);
    annotateSourceLines([token], 0, sourceLines);
    const attr = token.attrs.find(a => a[0] === SOURCE_LINE_ATTR);
    // 5 → trim blank [4] → 4 → trim blank [3] → 3  (3 > 2+1? no: 3 > 3 is false) → stop
    expect(attr[1]).toBe('2,3');
  });

  test('does not trim below start+1', () => {
    const sourceLines = ['', '', ''];
    const token = makeAnnotatableToken('paragraph_open', [0, 1]);
    annotateSourceLines([token], 0, sourceLines);
    const attr = token.attrs.find(a => a[0] === SOURCE_LINE_ATTR);
    expect(attr[1]).toBe('0,1');
  });

  test('incorporates mdstyledSelectorLine into start when earlier', () => {
    const token = makeAnnotatableToken('paragraph_open', [5, 7]);
    token.mdstyledSelectorLine = 3;
    annotateSourceLines([token], 0);
    const attr = token.attrs.find(a => a[0] === SOURCE_LINE_ATTR);
    // start = min(5, 3) = 3
    expect(attr[1]).toMatch(/^3,/);
  });

  test('mdstyledSelectorLine that is later than token.map[0] does not change start', () => {
    const token = makeAnnotatableToken('paragraph_open', [2, 5]);
    token.mdstyledSelectorLine = 4;
    annotateSourceLines([token], 0);
    const attr = token.attrs.find(a => a[0] === SOURCE_LINE_ATTR);
    // start = min(2, 4) = 2
    expect(attr[1]).toMatch(/^2,/);
  });

  test('returns the token array', () => {
    const token = makeAnnotatableToken('paragraph_open', [0, 1]);
    const result = annotateSourceLines([token], 0);
    expect(result).toBeInstanceOf(Array);
  });

  test('all annotatable token types get the attribute', () => {
    for (const type of ANNOTATABLE_TYPES) {
      const token = makeAnnotatableToken(type, [0, 2]);
      annotateSourceLines([token], 0);
      const attr = token.attrs && token.attrs.find(a => a[0] === SOURCE_LINE_ATTR);
      expect(attr, `expected ${type} to be annotated`).toBeDefined();
    }
  });

  test('SOURCE_LINE_ATTR is the expected attribute name', () => {
    expect(SOURCE_LINE_ATTR).toBe('data-mdstyled-line');
  });
});
