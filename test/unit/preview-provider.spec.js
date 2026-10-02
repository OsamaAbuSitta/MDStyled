'use strict';
/**
 * Tests for src/previewProvider.ts.
 *
 * Two layers:
 *  1. Source inspection — verifies constants and SANITIZE_OPTIONS by reading the
 *     TypeScript source.  Safe regardless of bundling complexity.
 *  2. Bundle + export check — bundles the module (aliasing vscode, marking the
 *     engine/blockEdit/defaultTemplate as external) and asserts that the public
 *     API is exported correctly.
 */
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs   = require('fs');
const { buildUnit, ROOT } = require('./build-unit');

const SRC = path.join(ROOT, 'src', 'previewProvider.ts');

// ── Source-inspection: EDIT_TEMPLATE ─────────────────────────────────────────

test('EDIT_TEMPLATE is exported and equals "editable-auto"', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  expect(src).toMatch(/export const EDIT_TEMPLATE\s*=\s*['"]editable-auto['"]/);
});

// ── Source-inspection: SANITIZE_OPTIONS ──────────────────────────────────────

test('SANITIZE_OPTIONS allows html, head, and body tags', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  expect(src).toContain("'html'");
  expect(src).toContain("'head'");
  expect(src).toContain("'body'");
});

test('SANITIZE_OPTIONS allows script and style tags', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  expect(src).toContain("'script'");
  expect(src).toContain("'style'");
});

test('SANITIZE_OPTIONS allows SVG-related tags (path, svg)', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  expect(src).toContain("'svg'");
  expect(src).toContain("'path'");
});

test('SANITIZE_OPTIONS allows data: URI scheme', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  expect(src).toContain("'data'");
});

test('SANITIZE_OPTIONS allows the mdstyled data attributes', () => {
  const src = fs.readFileSync(SRC, 'utf8');
  expect(src).toContain('data-mdstyled-line');
  expect(src).toContain('data-mdstyled-uri');
});

// ── Bundle + exports ──────────────────────────────────────────────────────────

test.describe('bundled previewProvider', () => {
  let mod;

  test.beforeAll(() => {
    mod = buildUnit('preview-provider', 'src/previewProvider.ts', {
      externals: ['./engine', './defaultTemplate', './blockEdit'],
    });
  });

  test('EDIT_TEMPLATE export equals "editable-auto"', () => {
    expect(mod.EDIT_TEMPLATE).toBe('editable-auto');
  });

  test('MdStyledPreviewProvider is exported as a constructor/class', () => {
    expect(typeof mod.MdStyledPreviewProvider).toBe('function');
  });
});
