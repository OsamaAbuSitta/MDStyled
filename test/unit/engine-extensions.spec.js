// Unit tests for src/engine/extensions.ts
// Functions: getExtensionCss, getExtensionJs, BUILTIN_EXTENSIONS
const { test, expect } = require('@playwright/test');
const { engine } = require('../harness/build');
const E = engine();
const { getExtensionCss, getExtensionJs, BUILTIN_EXTENSIONS } = E;

test.describe('BUILTIN_EXTENSIONS registry', () => {
  test('contains copy-code entry', () => {
    expect(BUILTIN_EXTENSIONS['copy-code']).toBeDefined();
  });

  test('contains mermaid entry', () => {
    expect(BUILTIN_EXTENSIONS['mermaid']).toBeDefined();
  });

  test('contains highlight entry', () => {
    expect(BUILTIN_EXTENSIONS['highlight']).toBeDefined();
  });

  test('copy-code has both css and js', () => {
    const ext = BUILTIN_EXTENSIONS['copy-code'];
    expect(ext.css).toBeTruthy();
    expect(ext.js).toBeTruthy();
  });

  test('mermaid has both css and js', () => {
    const ext = BUILTIN_EXTENSIONS['mermaid'];
    expect(ext.css).toBeTruthy();
    expect(ext.js).toBeTruthy();
  });

  test('highlight has css but no js', () => {
    const ext = BUILTIN_EXTENSIONS['highlight'];
    expect(ext.css).toBeTruthy();
    expect(ext.js).toBeFalsy();
  });
});

test.describe('getExtensionCss', () => {
  test('returns CSS for copy-code', () => {
    const css = getExtensionCss(['copy-code']);
    expect(typeof css).toBe('string');
    expect(css.length).toBeGreaterThan(0);
    expect(css).toContain('mdstyled-copy-btn');
  });

  test('returns CSS for mermaid', () => {
    const css = getExtensionCss(['mermaid']);
    expect(css).toContain('mdstyled-mermaid');
  });

  test('returns CSS for highlight', () => {
    const css = getExtensionCss(['highlight']);
    expect(css).toContain('hljs');
  });

  test('unknown extension name is silently ignored', () => {
    const css = getExtensionCss(['nonexistent-ext']);
    expect(css).toBe('');
  });

  test('empty list returns empty string', () => {
    expect(getExtensionCss([])).toBe('');
  });

  test('multiple extensions are concatenated', () => {
    const css = getExtensionCss(['copy-code', 'mermaid', 'highlight']);
    expect(css).toContain('mdstyled-copy-btn');
    expect(css).toContain('mdstyled-mermaid');
    expect(css).toContain('hljs');
  });

  test('mix of valid and unknown extensions only returns valid CSS', () => {
    const css = getExtensionCss(['copy-code', 'unknown-ext']);
    expect(css).toContain('mdstyled-copy-btn');
    expect(css).not.toContain('unknown-ext');
  });
});

test.describe('getExtensionJs', () => {
  test('returns JS for copy-code', () => {
    const js = getExtensionJs(['copy-code']);
    expect(typeof js).toBe('string');
    expect(js.length).toBeGreaterThan(0);
    expect(js).toContain('mdstyled-copy-btn');
  });

  test('returns JS for mermaid', () => {
    const js = getExtensionJs(['mermaid']);
    expect(js).toContain('mermaid');
  });

  test('highlight has no JS → returns empty string', () => {
    const js = getExtensionJs(['highlight']);
    expect(js).toBe('');
  });

  test('unknown extension is silently ignored', () => {
    const js = getExtensionJs(['nonexistent-ext']);
    expect(js).toBe('');
  });

  test('empty list returns empty string', () => {
    expect(getExtensionJs([])).toBe('');
  });

  test('mermaid JS embeds the default CDN src', () => {
    const js = getExtensionJs(['mermaid']);
    expect(js).toContain('cdn.jsdelivr.net');
  });

  test('mermaid JS uses custom mermaidSrc when provided', () => {
    const js = getExtensionJs(['mermaid'], { mermaidSrc: 'https://example.com/mermaid.min.js' });
    expect(js).toContain('https://example.com/mermaid.min.js');
    expect(js).not.toContain('cdn.jsdelivr.net');
  });

  test('multiple extensions with JS are concatenated', () => {
    const js = getExtensionJs(['copy-code', 'mermaid']);
    expect(js).toContain('mdstyled-copy-btn');
    expect(js).toContain('mermaid');
  });
});
