'use strict';
/**
 * Tests for src/export.ts.
 *
 * The module depends on vscode, the rendering engine, and the FS for writing
 * files.  These tests use two approaches:
 *
 *   1. Source inspection — reads the TypeScript file and asserts that the
 *      constants and injection patterns are structurally correct.  Fast and
 *      not affected by bundling complexity.
 *
 *   2. Bundle + execution — bundles export.ts with esbuild (aliasing vscode
 *      and marking the engine as external) and calls the exported functions
 *      end-to-end.  Verifies that the HTML written to disk has the right
 *      content for each format.
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');
const os   = require('os');
const { buildUnit, ROOT } = require('./build-unit');

const SRC = path.join(ROOT, 'src', 'export.ts');

// ── Source-inspection: PRINT_CSS ──────────────────────────────────────────────

test('PRINT_CSS constant is defined and non-empty', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  expect(src).toMatch(/const PRINT_CSS\s*=/);
  const match = src.match(/const PRINT_CSS\s*=\s*`([\s\S]*?)`/);
  expect(match).not.toBeNull();
  expect(match[1].trim().length).toBeGreaterThan(0);
});

test('PRINT_CSS contains @media print rule', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  expect(src).toContain('@media print');
});

test('PRINT_CSS contains @page margin rule', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  expect(src).toContain('@page');
  expect(src).toContain('margin:');
});

test('PRINT_CSS hides editor-UI classes in print', () => {
  const src  = fs.readFileSync(SRC, 'utf8');
  const printBlock = src.match(/@media print \{([\s\S]*?)@page/)?.[1] ?? src;
  // These UI classes must be suppressed in printed output.
  for (const cls of [
    '.mdstyled-toc',
    '.mdstyled-edit-bar',
    '.copy-code-button',
    '.table-interactive-controls',
    '.table-pagination',
  ]) {
    expect(printBlock, `PRINT_CSS should hide ${cls}`).toContain(cls);
  }
});

// BUG: PRINT_CSS references `.copy-code-button` but the engine's copy-code
// extension uses `.mdstyled-copy-btn`.  The print rule therefore has no effect
// and the copy button IS visible in printed/PDF output.
// Expected: PRINT_CSS contains `.mdstyled-copy-btn`
// Actual:   PRINT_CSS contains `.copy-code-button` (wrong class name)
test.fail('PRINT_CSS hides the actual copy-code button class', () => {
  const src        = fs.readFileSync(SRC, 'utf8');
  const engineExt  = fs.readFileSync(path.join(ROOT, 'src', 'engine', 'extensions.ts'), 'utf8');
  const match      = engineExt.match(/btn\.className\s*=\s*['"]([^'"]+)['"]/);
  const actualClass = match ? '.' + match[1] : null;
  expect(actualClass).not.toBeNull();   // guard: class was found in engine source
  const printBlock = src.match(/@media print \{([\s\S]*?)@page/)?.[1] ?? src;
  // This assertion currently fails because the CSS names the wrong class.
  expect(printBlock).toContain(actualClass);
});

// ── Source-inspection: PRINT_SCRIPT ──────────────────────────────────────────

test('PRINT_SCRIPT constant is defined and triggers window.print()', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  expect(src).toMatch(/const PRINT_SCRIPT\s*=/);
  expect(src).toContain('window.print()');
});

// ── Source-inspection: format-conditional injection ──────────────────────────

test('PRINT_CSS injection replaces </head> unconditionally', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  // The pattern must apply regardless of format.
  expect(src).toMatch(/\.replace\(['"]<\/head>['"]/);
  expect(src).toContain('PRINT_CSS');
});

test('PRINT_SCRIPT injection is guarded by format === "pdf"', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  // pdf-only path uses PRINT_SCRIPT; the html path skips it.
  expect(src).toMatch(/format\s*===\s*['"]pdf['"]/);
  expect(src).toMatch(/PRINT_SCRIPT/);
  // The else/ternary branch returns the page unchanged (no second replace).
  expect(src).toMatch(/format\s*===\s*['"]pdf['"]\s*\n?\s*\?.*replace.*PRINT_SCRIPT|format\s*===\s*['"]pdf['"][\s\S]{0,200}PRINT_SCRIPT/);
});

// ── Bundle + execution: html vs pdf format ────────────────────────────────────

test.describe('bundled exportDocument()', () => {
  let mod;
  let tmpDir;

  test.beforeAll(() => {
    mod = buildUnit('export', 'src/export.ts', {
      externals: ['./engine', './defaultTemplate'],
    });
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdstyled-export-'));
    // Write a minimal markdown file for the URI.
    fs.writeFileSync(path.join(tmpDir, 'doc.md'), '# Hello\n');
  });

  test.afterAll(() => {
    // Clean up temp files.
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    global.__vscodeSaveUri = null;
  });

  test('html export writes PRINT_CSS but not PRINT_SCRIPT', async () => {
    const savePath = path.join(tmpDir, 'out.html');
    global.__vscodeSaveUri = { fsPath: savePath, toString: () => 'file://' + savePath };

    const docUri = { fsPath: path.join(tmpDir, 'doc.md'), toString: () => '' };
    await mod.exportDocument(docUri, ROOT, 'html');

    expect(fs.existsSync(savePath)).toBe(true);
    const html = fs.readFileSync(savePath, 'utf8');
    expect(html).toContain('@media print');      // PRINT_CSS is present
    expect(html).not.toContain('window.print()'); // PRINT_SCRIPT is absent
  });

  test('pdf export writes PRINT_CSS and PRINT_SCRIPT', async () => {
    const savePath = path.join(tmpDir, 'out.pdf');
    global.__vscodeSaveUri = { fsPath: savePath, toString: () => 'file://' + savePath };

    const docUri = { fsPath: path.join(tmpDir, 'doc.md'), toString: () => '' };
    await mod.exportDocument(docUri, ROOT, 'pdf');

    // PDF writes a .mdstyled-print.html beside the chosen destination.
    const printPath = path.join(tmpDir, '.out.mdstyled-print.html');
    expect(fs.existsSync(printPath)).toBe(true);
    const html = fs.readFileSync(printPath, 'utf8');
    expect(html).toContain('@media print');      // PRINT_CSS is present
    expect(html).toContain('window.print()');    // PRINT_SCRIPT is present
  });
});
