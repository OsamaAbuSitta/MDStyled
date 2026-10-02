'use strict';
/**
 * E2E tests for the non-editable templates rendered in the preview harness.
 *
 * Covers: default-light / default-dark / interactive-light / interactive-dark
 * Templates tested as read-only (editing: false) unless noted.
 *
 * Topics: heading/table/code/blockquote rendering, TOC sidebar, copy-code
 * button, accordion sections (interactive), read-only property (no edit UI),
 * mermaid block handling (mermaid library is not loaded in the harness —
 * the fenced block still appears in the DOM in some form).
 */
const { test, expect } = require('./fixtures');

// ── Shared fixtures ───────────────────────────────────────────────────────────

const MULTI_HEADING_MD = `# Document Title

## First Section

Paragraph with **bold** and _italic_ text.

## Second Section

Another paragraph here.
`;

const TABLE_MD = `# Table Demo

| Name  | Score |
|-------|-------|
| Alice |    90 |
| Bob   |    75 |
| Carol |    85 |
`;

const CODE_MD = `# Code Demo

Here is some code:

\`\`\`javascript
function greet(name) {
  return 'Hello, ' + name;
}
\`\`\`

End.
`;

const FULL_MD = `# Full Document

## Features

Paragraph with **bold** text.

| Feature | Status |
|---------|--------|
| Tables  | Done   |
| TOC     | Done   |

\`\`\`js
const x = 42;
\`\`\`

> This is a blockquote.

## Summary

All done.
`;

const MERMAID_MD = `# Diagram

\`\`\`mermaid
graph TD
  A --> B
  B --> C
\`\`\`
`;

// ── default-light ─────────────────────────────────────────────────────────────

test.describe('default-light template', () => {
  test('renders an h1 heading', async ({ preview, page }) => {
    await preview.open(MULTI_HEADING_MD, { template: 'default-light', editing: false });
    await expect(page.locator('.mdstyled-root h1')).toHaveText('Document Title');
  });

  test('renders h2 headings', async ({ preview, page }) => {
    await preview.open(MULTI_HEADING_MD, { template: 'default-light', editing: false });
    const h2s = page.locator('.mdstyled-root h2');
    await expect(h2s).toHaveCount(2);
  });

  test('renders a table', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'default-light', editing: false });
    await expect(page.locator('.mdstyled-root table')).toBeVisible();
    await expect(page.locator('.mdstyled-root th').first()).toBeVisible();
    await expect(page.locator('.mdstyled-root td').first()).toBeVisible();
  });

  test('renders a fenced code block', async ({ preview, page }) => {
    await preview.open(CODE_MD, { template: 'default-light', editing: false });
    await expect(page.locator('.mdstyled-root pre')).toBeVisible();
    await expect(page.locator('.mdstyled-root pre code')).toBeVisible();
  });

  test('copy-code button is present inside code blocks', async ({ preview, page }) => {
    await preview.open(CODE_MD, { template: 'default-light', editing: false });
    // The copy-code extension adds a button with class mdstyled-copy-btn.
    await expect(page.locator('.mdstyled-copy-btn').first()).toBeVisible();
  });

  test('renders a blockquote', async ({ preview, page }) => {
    await preview.open(FULL_MD, { template: 'default-light', editing: false });
    await expect(page.locator('.mdstyled-root blockquote')).toBeVisible();
  });

  test('TOC sidebar appears when there are multiple headings', async ({ preview, page }) => {
    await preview.open(MULTI_HEADING_MD, { template: 'default-light', editing: false });
    await page.locator('.mdstyled-toc').waitFor({ timeout: 5000 });
    await expect(page.locator('.mdstyled-toc')).toBeVisible();
  });

  test('TOC links point to heading ids', async ({ preview, page }) => {
    await preview.open(MULTI_HEADING_MD, { template: 'default-light', editing: false });
    await page.locator('.mdstyled-toc').waitFor({ timeout: 5000 });
    const links = page.locator('.mdstyled-toc a');
    await expect(links.first()).toHaveAttribute('href', /^#/);
  });

  test('no edit toggle or edit bar (non-editable template)', async ({ preview, page }) => {
    await preview.open(FULL_MD, { template: 'default-light', editing: false });
    await expect(page.locator('.mdstyled-edit-toggle')).toHaveCount(0);
    await expect(page.locator('.mdstyled-edit-bar')).toHaveCount(0);
  });

  test('mermaid fenced block appears in the DOM', async ({ preview, page }) => {
    await preview.open(MERMAID_MD, { template: 'default-light', editing: false });
    // mermaid.js is not loaded in the harness; the block should still be present
    // in some form (pre.language-mermaid, .mermaid, etc.).
    const mermaidEl = page.locator('.mdstyled-root [class*="mermaid"]').first();
    await expect(mermaidEl).toBeVisible();
  });
});

// ── default-dark ──────────────────────────────────────────────────────────────

test.describe('default-dark template', () => {
  test('renders headings and table', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'default-dark', editing: false });
    await expect(page.locator('.mdstyled-root h1')).toBeVisible();
    await expect(page.locator('.mdstyled-root table')).toBeVisible();
  });

  test('no edit toggle (non-editable)', async ({ preview, page }) => {
    await preview.open(FULL_MD, { template: 'default-dark', editing: false });
    await expect(page.locator('.mdstyled-edit-toggle')).toHaveCount(0);
  });

  test('TOC sidebar appears for multi-heading documents', async ({ preview, page }) => {
    await preview.open(MULTI_HEADING_MD, { template: 'default-dark', editing: false });
    await page.locator('.mdstyled-toc').waitFor({ timeout: 5000 });
    await expect(page.locator('.mdstyled-toc')).toBeVisible();
  });
});

// ── interactive-light ─────────────────────────────────────────────────────────

test.describe('interactive-light template', () => {
  test('renders headings and paragraph text', async ({ preview, page }) => {
    await preview.open(MULTI_HEADING_MD, { template: 'interactive-light', editing: false });
    await expect(page.locator('.mdstyled-root h1')).toHaveText('Document Title');
    await expect(page.locator('.mdstyled-root p').first()).toBeVisible();
  });

  test('wraps tables in .table-wrapper', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-wrapper').waitFor({ timeout: 5000 });
    await expect(page.locator('.table-wrapper')).toBeVisible();
  });

  test('adds interactive table controls (.table-interactive-controls)', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-interactive-controls').waitFor({ timeout: 5000 });
    await expect(page.locator('.table-interactive-controls')).toBeVisible();
  });

  test('search input is present for tables', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.table-search-input').waitFor({ timeout: 5000 });
    await expect(page.locator('.table-search-input')).toBeVisible();
  });

  test('table headers become sortable (sortable-header class)', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-light', editing: false });
    await page.locator('.sortable-header').first().waitFor({ timeout: 5000 });
    await expect(page.locator('.sortable-header').first()).toBeVisible();
  });

  test('headings are wrapped in accordion sections', async ({ preview, page }) => {
    await preview.open(MULTI_HEADING_MD, { template: 'interactive-light', editing: false });
    await page.locator('.accordion-section').first().waitFor({ timeout: 5000 });
    await expect(page.locator('.accordion-section').first()).toBeVisible();
  });

  test('accordion toggles have aria-expanded', async ({ preview, page }) => {
    await preview.open(MULTI_HEADING_MD, { template: 'interactive-light', editing: false });
    await page.locator('.accordion-toggle').first().waitFor({ timeout: 5000 });
    await expect(page.locator('.accordion-toggle').first()).toHaveAttribute('aria-expanded', 'true');
  });

  test('TOC sidebar appears for multi-heading documents', async ({ preview, page }) => {
    await preview.open(MULTI_HEADING_MD, { template: 'interactive-light', editing: false });
    await page.locator('.mdstyled-toc').waitFor({ timeout: 5000 });
    await expect(page.locator('.mdstyled-toc')).toBeVisible();
  });

  test('no edit toggle (non-editable)', async ({ preview, page }) => {
    await preview.open(FULL_MD, { template: 'interactive-light', editing: false });
    await expect(page.locator('.mdstyled-edit-toggle')).toHaveCount(0);
  });

  test('copy-code button appears for fenced code blocks', async ({ preview, page }) => {
    await preview.open(CODE_MD, { template: 'interactive-light', editing: false });
    await expect(page.locator('.mdstyled-copy-btn').first()).toBeVisible();
  });
});

// ── interactive-dark ──────────────────────────────────────────────────────────

test.describe('interactive-dark template', () => {
  test('renders table with interactive controls', async ({ preview, page }) => {
    await preview.open(TABLE_MD, { template: 'interactive-dark', editing: false });
    await page.locator('.table-interactive-controls').waitFor({ timeout: 5000 });
    await expect(page.locator('.mdstyled-root table')).toBeVisible();
    await expect(page.locator('.table-search-input')).toBeVisible();
  });

  test('no edit toggle (non-editable)', async ({ preview, page }) => {
    await preview.open(FULL_MD, { template: 'interactive-dark', editing: false });
    await expect(page.locator('.mdstyled-edit-toggle')).toHaveCount(0);
  });
});
