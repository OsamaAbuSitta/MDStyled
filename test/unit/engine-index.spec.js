// Unit tests for src/engine/index.ts
// Functions: sanitizeHtml, hasFileLevelStyling, renderMdStyled (end-to-end render)
const { test, expect } = require('@playwright/test');
const { engine } = require('../harness/build');
const fs = require('fs');
const path = require('path');
const os = require('os');
const E = engine();
const { sanitizeHtml, hasFileLevelStyling, renderMdStyled } = E;

// ── sanitizeHtml ──────────────────────────────────────────────────────────

test.describe('sanitizeHtml', () => {
  test('plain text passes through unchanged', () => {
    expect(sanitizeHtml('hello world')).toBe('hello world');
  });

  test('HTML tags are stripped', () => {
    expect(sanitizeHtml('<b>bold</b>')).toBe('bold');
  });

  test('nested tags are stripped, text is preserved', () => {
    expect(sanitizeHtml('<p>hello <b>world</b></p>')).toBe('hello world');
  });

  test('<script> tag content is not passed through', () => {
    // sanitize-html removes script tags AND their content
    const result = sanitizeHtml('<script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).not.toContain('alert(1)');
  });

  test('onclick attribute is stripped with its tag', () => {
    const result = sanitizeHtml('<button onclick="evil()">click</button>');
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('evil()');
    expect(result).toBe('click');
  });

  test('href with javascript: scheme is not preserved as a link', () => {
    const result = sanitizeHtml('<a href="javascript:void(0)">click</a>');
    expect(result).not.toContain('javascript:');
    expect(result).not.toContain('<a');
  });

  test('empty string returns empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  test('strips multiple tag types in one pass', () => {
    const result = sanitizeHtml('<h1>Title</h1><p>body</p>');
    expect(result).not.toContain('<h1>');
    expect(result).not.toContain('<p>');
    expect(result).toContain('Title');
    expect(result).toContain('body');
  });
});

// ── hasFileLevelStyling ───────────────────────────────────────────────────

test.describe('hasFileLevelStyling', () => {
  function makeTmp(stem = 'doc') {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdstyled-has-'));
    return { dir, mdPath: path.join(dir, stem + '.md') };
  }

  test('plain markdown without any style refs returns false', async () => {
    const { dir, mdPath } = makeTmp();
    try {
      fs.writeFileSync(mdPath, '# Hello\n\nworld\n');
      expect(await hasFileLevelStyling(mdPath)).toBe(false);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('@style directive comment returns true', async () => {
    const { dir, mdPath } = makeTmp();
    try {
      fs.writeFileSync(mdPath, '<!-- @style: nonexistent.css -->\n\n# Hello\n');
      expect(await hasFileLevelStyling(mdPath)).toBe(true);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('@script directive comment returns true', async () => {
    const { dir, mdPath } = makeTmp();
    try {
      fs.writeFileSync(mdPath, '<!-- @script: app.js -->\n\n# Hello\n');
      expect(await hasFileLevelStyling(mdPath)).toBe(true);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('front matter styles entry returns true', async () => {
    const { dir, mdPath } = makeTmp();
    try {
      const md = '---\nmdstyled:\n  styles:\n    - custom.css\n---\n\n# Hello\n';
      fs.writeFileSync(mdPath, md);
      expect(await hasFileLevelStyling(mdPath)).toBe(true);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('auto-discovered sibling .css file returns true', async () => {
    const { dir, mdPath } = makeTmp('slides');
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      fs.writeFileSync(path.join(dir, 'slides.css'), '/* auto */');
      expect(await hasFileLevelStyling(mdPath)).toBe(true);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('file that does not exist returns false (not an error)', async () => {
    expect(await hasFileLevelStyling('/nonexistent/no-file.md')).toBe(false);
  });
});

// ── renderMdStyled ────────────────────────────────────────────────────────

function makeTmp(stem = 'doc') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdstyled-render-'));
  return { dir, mdPath: path.join(dir, stem + '.md') };
}

test.describe('renderMdStyled', () => {
  test('renders a basic markdown file to a complete HTML page', async () => {
    const { dir, mdPath } = makeTmp();
    try {
      fs.writeFileSync(mdPath, '# Hello\n\nworld\n');
      const html = await renderMdStyled(mdPath, []);
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Hello');
      expect(html).toContain('world');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('output includes the mdstyled runtime script', async () => {
    const { dir, mdPath } = makeTmp();
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      const html = await renderMdStyled(mdPath, []);
      expect(html).toContain('window.mdstyled');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('editable=true embeds source lines in the runtime', async () => {
    const { dir, mdPath } = makeTmp();
    const md = '# Hello\n\nworld\n';
    try {
      fs.writeFileSync(mdPath, md);
      // editable is the 5th positional arg (default true)
      const html = await renderMdStyled(mdPath, [], undefined, undefined, true);
      expect(html).toContain('"# Hello"');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('editable=false embeds null instead of source lines', async () => {
    const { dir, mdPath } = makeTmp();
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      const html = await renderMdStyled(mdPath, [], undefined, undefined, false);
      expect(html).toContain('var source = null');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('canGoBack=true is reflected in the runtime', async () => {
    const { dir, mdPath } = makeTmp();
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      const html = await renderMdStyled(mdPath, [], undefined, undefined, true, true);
      expect(html).toContain('var canGoBack = true');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('injected CSS from a sibling file appears in the output', async () => {
    const { dir, mdPath } = makeTmp('slides');
    const cssPath = path.join(dir, 'slides.css');
    try {
      fs.writeFileSync(mdPath, '# Slides\n');
      fs.writeFileSync(cssPath, 'body { background: hotpink; }');
      const html = await renderMdStyled(mdPath, []);
      expect(html).toContain('body { background: hotpink; }');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('showApplyTemplate banner appears when no styles or scripts are configured', async () => {
    const { dir, mdPath } = makeTmp();
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      const html = await renderMdStyled(mdPath, [], undefined, undefined, false);
      expect(html).toContain('MdStyled: Apply Template');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('showApplyTemplate banner is absent when styles are configured', async () => {
    const { dir, mdPath } = makeTmp('styled');
    const cssPath = path.join(dir, 'styled.css');
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      fs.writeFileSync(cssPath, '/* styled */');
      const html = await renderMdStyled(mdPath, [], undefined, undefined, false);
      expect(html).not.toContain('MdStyled: Apply Template');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('fallback template is used when no file-level styling exists', async () => {
    const { dir, mdPath } = makeTmp();
    const fallbackCssPath = path.join(dir, 'fallback.css');
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      fs.writeFileSync(fallbackCssPath, '/* fallback-sentinel */');
      const html = await renderMdStyled(
        mdPath, [],
        undefined,
        { styles: [fallbackCssPath], scripts: [] },
        false
      );
      expect(html).toContain('/* fallback-sentinel */');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('fallback template is NOT used when file already has styling', async () => {
    const { dir, mdPath } = makeTmp('doc');
    const fileCssPath = path.join(dir, 'doc.css');
    const fallbackCssPath = path.join(dir, 'fallback.css');
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      fs.writeFileSync(fileCssPath, '/* file-level */');
      fs.writeFileSync(fallbackCssPath, '/* fallback-sentinel */');
      const html = await renderMdStyled(
        mdPath, [],
        undefined,
        { styles: [fallbackCssPath], scripts: [] },
        false
      );
      // File-level CSS is used, fallback is NOT
      expect(html).toContain('/* file-level */');
      expect(html).not.toContain('/* fallback-sentinel */');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('non-existent markdown file returns an error HTML page', async () => {
    const html = await renderMdStyled('/nonexistent/no-file.md', []);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('MdStyled Error');
  });

  test('startEditing option sets editMode in state init', async () => {
    const { dir, mdPath } = makeTmp();
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      const html = await renderMdStyled(
        mdPath, [], undefined, undefined, true, false,
        { startEditing: true }
      );
      expect(html).toContain('var startEditing = true');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('templateOverride in options uses the given styles instead of file config', async () => {
    const { dir, mdPath } = makeTmp('plain');
    const overrideCssPath = path.join(dir, 'override.css');
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      fs.writeFileSync(overrideCssPath, '/* override-sentinel */');
      const html = await renderMdStyled(
        mdPath, [], undefined, undefined, false, false,
        { templateOverride: { styles: [overrideCssPath], scripts: [] } }
      );
      expect(html).toContain('/* override-sentinel */');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('class directives in the markdown appear in the rendered HTML', async () => {
    const { dir, mdPath } = makeTmp();
    try {
      fs.writeFileSync(mdPath, '<!-- .hero -->\n\n# Hello\n');
      const html = await renderMdStyled(mdPath, []);
      expect(html).toContain('class="hero"');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });

  test('front matter is stripped from rendered body', async () => {
    const { dir, mdPath } = makeTmp();
    const md = '---\ntitle: Test Doc\n---\n\n# Hello\n';
    try {
      fs.writeFileSync(mdPath, md);
      // editable=false so sourceLines is null and the raw file is not serialised
      // into the runtime JS — the YAML front matter must not appear anywhere.
      const html = await renderMdStyled(mdPath, [], undefined, undefined, false);
      expect(html).not.toContain('title: Test Doc');
      expect(html).toContain('Hello');
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  });
});
