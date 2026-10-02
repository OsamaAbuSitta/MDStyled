// Unit tests for src/engine/renderer.ts
// Functions: buildPreviewHtml, loadCssFiles, loadJsFiles
const { test, expect } = require('@playwright/test');
const { engine } = require('../harness/build');
const fs = require('fs');
const path = require('path');
const os = require('os');
const E = engine();
const { buildPreviewHtml, loadCssFiles, loadJsFiles } = E;

// ── buildPreviewHtml ──────────────────────────────────────────────────────

test.describe('buildPreviewHtml', () => {
  test('returns a valid HTML document', () => {
    const html = buildPreviewHtml({ html: '<p>hello</p>', css: '', scripts: [], mode: 'safe' });
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  test('injects content HTML inside mdstyled-root div', () => {
    const html = buildPreviewHtml({ html: '<p>hello</p>', css: '', scripts: [], mode: 'safe' });
    expect(html).toContain('<div class="mdstyled-root">');
    expect(html).toContain('<p>hello</p>');
  });

  test('injects CSS inside a <style> tag', () => {
    const html = buildPreviewHtml({ html: '', css: 'body { color: red; }', scripts: [], mode: 'safe' });
    expect(html).toContain('<style>');
    expect(html).toContain('body { color: red; }');
  });

  test('injects script strings as <script> tags', () => {
    const html = buildPreviewHtml({ html: '', css: '', scripts: ['console.log("hi");'], mode: 'safe' });
    expect(html).toContain('<script>');
    expect(html).toContain('console.log("hi");');
  });

  test('multiple scripts each get their own <script> tag', () => {
    const html = buildPreviewHtml({ html: '', css: '', scripts: ['var a=1;', 'var b=2;'], mode: 'safe' });
    expect(html.match(/<script>/g).length).toBeGreaterThanOrEqual(2);
  });

  test('blank-only scripts are excluded from output', () => {
    const html = buildPreviewHtml({ html: '', css: '', scripts: ['   '], mode: 'safe' });
    // The runtime script is always present; an extra blank script should not appear
    const scriptTags = html.match(/<script>/g) || [];
    // Only the runtime script should be there
    expect(scriptTags.length).toBe(1);
  });

  test('extensionsCss is appended to the style block', () => {
    const html = buildPreviewHtml({
      html: '', css: '/* base */', scripts: [], mode: 'safe',
      extensionsCss: '/* ext */',
    });
    expect(html).toContain('/* base */');
    expect(html).toContain('/* ext */');
  });

  test('extensionsJs is included as a script block', () => {
    const html = buildPreviewHtml({
      html: '', css: '', scripts: [], mode: 'safe',
      extensionsJs: 'var ext=true;',
    });
    expect(html).toContain('var ext=true;');
  });

  test('sourceLines are embedded in runtime JS when provided', () => {
    const html = buildPreviewHtml({
      html: '', css: '', scripts: [], mode: 'safe',
      sourceLines: ['# Hello', '', 'world'],
    });
    expect(html).toContain('"# Hello"');
    expect(html).toContain('"world"');
  });

  test('null sourceLines embeds null in runtime JS', () => {
    const html = buildPreviewHtml({
      html: '', css: '', scripts: [], mode: 'safe',
      sourceLines: null,
    });
    // The embedded variable should be null
    expect(html).toContain('var source = null');
  });

  test('canGoBack: true is embedded in runtime JS', () => {
    const html = buildPreviewHtml({ html: '', css: '', scripts: [], mode: 'safe', canGoBack: true });
    expect(html).toContain('var canGoBack = true');
  });

  test('canGoBack: false (default) is embedded as false', () => {
    const html = buildPreviewHtml({ html: '', css: '', scripts: [], mode: 'safe' });
    expect(html).toContain('var canGoBack = false');
  });

  test('startEditing: true is embedded in runtime JS', () => {
    const html = buildPreviewHtml({ html: '', css: '', scripts: [], mode: 'safe', startEditing: true });
    expect(html).toContain('var startEditing = true');
  });

  test('showApplyTemplate: true renders the apply-template banner', () => {
    const html = buildPreviewHtml({ html: '', css: '', scripts: [], mode: 'safe', showApplyTemplate: true });
    expect(html).toContain('MdStyled: Apply Template');
  });

  test('showApplyTemplate: false (default) does not render the banner', () => {
    const html = buildPreviewHtml({ html: '', css: '', scripts: [], mode: 'safe', showApplyTemplate: false });
    expect(html).not.toContain('MdStyled: Apply Template');
  });

  test('Content-Security-Policy meta tag is present', () => {
    const html = buildPreviewHtml({ html: '', css: '', scripts: [], mode: 'safe' });
    expect(html).toContain('Content-Security-Policy');
  });
});

// ── loadCssFiles ──────────────────────────────────────────────────────────

test.describe('loadCssFiles', () => {
  test('loads content from an existing CSS file', async () => {
    const dir = os.tmpdir();
    const p = path.join(dir, `mdstyled-test-${Date.now()}.css`);
    fs.writeFileSync(p, 'body { margin: 0; }');
    try {
      const css = await loadCssFiles([p]);
      expect(css).toContain('body { margin: 0; }');
    } finally {
      fs.unlinkSync(p);
    }
  });

  test('returns a failure comment for a missing file', async () => {
    const css = await loadCssFiles(['/nonexistent/path/style.css']);
    expect(css).toContain('/* Failed to load:');
  });

  test('combines multiple files with double newlines', async () => {
    const dir = os.tmpdir();
    const p1 = path.join(dir, `mdstyled-a-${Date.now()}.css`);
    const p2 = path.join(dir, `mdstyled-b-${Date.now()}.css`);
    fs.writeFileSync(p1, '/* file-a */');
    fs.writeFileSync(p2, '/* file-b */');
    try {
      const css = await loadCssFiles([p1, p2]);
      expect(css).toContain('/* file-a */');
      expect(css).toContain('/* file-b */');
    } finally {
      fs.unlinkSync(p1);
      fs.unlinkSync(p2);
    }
  });

  test('empty list returns empty string', async () => {
    const css = await loadCssFiles([]);
    expect(css).toBe('');
  });

  test('mix of existing and missing files: error comment for missing only', async () => {
    const dir = os.tmpdir();
    const existing = path.join(dir, `mdstyled-exist-${Date.now()}.css`);
    fs.writeFileSync(existing, '/* real */');
    const missing = '/nonexistent/file.css';
    try {
      const css = await loadCssFiles([existing, missing]);
      expect(css).toContain('/* real */');
      expect(css).toContain('/* Failed to load:');
    } finally {
      fs.unlinkSync(existing);
    }
  });
});

// ── loadJsFiles ───────────────────────────────────────────────────────────

test.describe('loadJsFiles', () => {
  test('loads content from an existing JS file', async () => {
    const dir = os.tmpdir();
    const p = path.join(dir, `mdstyled-test-${Date.now()}.js`);
    fs.writeFileSync(p, 'console.log("hello");');
    try {
      const js = await loadJsFiles([p]);
      expect(js).toContain('console.log("hello");');
    } finally {
      fs.unlinkSync(p);
    }
  });

  test('returns a failure comment for a missing file', async () => {
    const js = await loadJsFiles(['/nonexistent/path/script.js']);
    expect(js).toContain('// Failed to load:');
  });

  test('empty list returns empty string', async () => {
    const js = await loadJsFiles([]);
    expect(js).toBe('');
  });

  test('combines multiple JS files', async () => {
    const dir = os.tmpdir();
    const p1 = path.join(dir, `mdstyled-js-a-${Date.now()}.js`);
    const p2 = path.join(dir, `mdstyled-js-b-${Date.now()}.js`);
    fs.writeFileSync(p1, '/* script-a */');
    fs.writeFileSync(p2, '/* script-b */');
    try {
      const js = await loadJsFiles([p1, p2]);
      expect(js).toContain('/* script-a */');
      expect(js).toContain('/* script-b */');
    } finally {
      fs.unlinkSync(p1);
      fs.unlinkSync(p2);
    }
  });
});
