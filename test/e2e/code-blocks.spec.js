// Editing fenced code blocks, blockquotes and horizontal rules in the block editor.
// Code blocks and blockquotes round-trip through the serialiser; HRs are read-only
// dividers. Every save is checked against the file on disk.
const { test, expect } = require('./fixtures');

const textarea = preview => preview.editor().locator('.mdstyled-edit-textarea');
const typeLabel = preview => preview.editor().locator('.mdstyled-select-label');

// ─── Code blocks ─────────────────────────────────────────────────────────────

test.describe('code block editing', () => {
  test('a fenced code block opens in the textarea (markdown mode)', async ({ preview }) => {
    // Code blocks do not round-trip cleanly through the rich editor (the rendered
    // HTML includes syntax-highlight markup), so the editor opens in Markdown mode.
    await preview.open('Before.\n\n```\nconsole.log("hi");\n```\n\nAfter.\n');
    await preview.openBlock('console.log');
    await expect(textarea(preview)).toBeVisible();
    await expect(preview.rich()).toBeHidden();
    await expect(typeLabel(preview)).toHaveText('Code block');
  });

  test('a code block with a language identifier round-trips unchanged', async ({ preview }) => {
    const md = 'Intro.\n\n```js\nconsole.log("hello");\n```\n\nAfter.\n';
    await preview.open(md);
    await preview.openBlock('console.log');
    await preview.save();
    expect(preview.read()).toBe(md);
  });

  test('a code block without a language round-trips unchanged', async ({ preview }) => {
    const md = 'Intro.\n\n```\nplain code here\n```\n\nAfter.\n';
    await preview.open(md);
    await preview.openBlock('plain code here');
    await preview.save();
    expect(preview.read()).toBe(md);
  });

  test('the mode toggle is available for a code block (not disabled)', async ({ preview }) => {
    // Code blocks open in Markdown mode; the toggle is present and can switch to rich
    await preview.open('```py\nprint("hello")\n```\n');
    await preview.openBlock('print');
    await expect(textarea(preview)).toBeVisible();
    const modeBtn = preview.editor().locator('.mdstyled-mode-toggle');
    await expect(modeBtn).not.toBeDisabled();
  });

  test('the textarea for a code block contains the full fenced source', async ({ preview }) => {
    // Code blocks open directly in Markdown mode; the textarea shows the raw fence.
    const fence = '```js\nconsole.log("test");\n```';
    await preview.open(fence + '\n');
    await preview.openBlock('console.log');
    await expect(textarea(preview)).toBeVisible();
    const value = await textarea(preview).inputValue();
    expect(value).toContain('```js');
    expect(value).toContain('console.log("test");');
  });

  test('editing code content in Markdown mode preserves the language identifier', async ({ preview, page }) => {
    // Code blocks open directly in Markdown mode, so no toggle click is needed.
    await preview.open('```py\nprint("hello")\n```\n');
    await preview.openBlock('print');
    const ta = textarea(preview);
    await expect(ta).toBeVisible();
    await ta.fill('```py\nprint("world")\n```');
    await preview.save();
    expect(preview.read()).toBe('```py\nprint("world")\n```\n');
  });

  test('a multi-line code block saves byte-exact when untouched', async ({ preview }) => {
    const md = '# Doc\n\n```bash\necho "a"\necho "b"\necho "c"\n```\n\nAfter.\n';
    await preview.open(md);
    await preview.openBlock('echo');
    await preview.save();
    expect(preview.read()).toBe(md);
  });

  test('Tab in the code block textarea moves focus out (non-list content)', async ({ preview, page }) => {
    // Code blocks open in Markdown textarea. Tab calls indentListLine; since
    // the content is not a list line, indentListLine returns false, so Tab moves
    // focus rather than inserting indentation.
    await preview.open('```\nsome code\n```\n');
    await preview.openBlock('some code');
    const ta = textarea(preview);
    await expect(ta).toBeVisible();
    await ta.focus();
    await page.keyboard.press('Tab');
    // Tab should leave the textarea
    await expect(ta).not.toBeFocused();
  });

  test('converting a paragraph to a code block and back', async ({ preview, page }) => {
    await preview.open('# T\n\nHello world\n\nAfter.\n');
    await preview.openBlock('Hello');

    // Turn into Code block
    await preview.editor().locator('.mdstyled-select').click();
    await preview.editor().locator('.mdstyled-select-item').filter({ hasText: 'Code block' }).click();
    await expect(typeLabel(preview)).toHaveText('Code block');
    await preview.save();
    expect(preview.read()).toBe('# T\n\n```\nHello world\n```\n\nAfter.\n');

    // Turn back to Text
    await preview.openBlock('Hello world');
    await preview.editor().locator('.mdstyled-select').click();
    await preview.editor().locator('.mdstyled-select-item').filter({ hasText: /^Text$/ }).click();
    await expect(typeLabel(preview)).toHaveText('Text');
    await preview.save();
    expect(preview.read()).toBe('# T\n\nHello world\n\nAfter.\n');
  });
});

// ─── Blockquotes ──────────────────────────────────────────────────────────────

test.describe('blockquote editing', () => {
  test('a blockquote opens in the rich editor with type "Quote"', async ({ preview }) => {
    await preview.open('> Quoted text here.\n');
    await preview.openBlock('Quoted text');
    await expect(preview.rich()).toBeVisible();
    await expect(typeLabel(preview)).toHaveText('Quote');
  });

  test('a blockquote saves byte-exact when untouched', async ({ preview }) => {
    const md = '# Doc\n\n> This is a quote.\n\nAfter.\n';
    await preview.open(md);
    await preview.openBlock('This is a quote');
    await preview.save();
    expect(preview.read()).toBe(md);
  });

  test('editing a blockquote rewrites the quoted line', async ({ preview, page }) => {
    const END = process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End';
    await preview.open('# Doc\n\n> Original text.\n\nAfter.\n');
    await preview.openBlock('Original text');
    await page.keyboard.press(END);
    await page.keyboard.type(' Extra.');
    await preview.save();
    expect(preview.read()).toBe('# Doc\n\n> Original text. Extra.\n\nAfter.\n');
  });

  test('a multi-line blockquote saves byte-exact when untouched', async ({ preview }) => {
    const md = 'Before.\n\n> Line one.\n> Line two.\n> Line three.\n\nAfter.\n';
    await preview.open(md);
    await preview.openBlock('Line one');
    await preview.save();
    expect(preview.read()).toBe(md);
  });

  test('converting a paragraph to a quote and saving', async ({ preview }) => {
    await preview.open('Some text.\n');
    await preview.openBlock('Some text');
    await preview.editor().locator('.mdstyled-select').click();
    await preview.editor().locator('.mdstyled-select-item').filter({ hasText: 'Quote' }).click();
    await expect(typeLabel(preview)).toHaveText('Quote');
    await preview.save();
    expect(preview.read()).toBe('> Some text.\n');
  });
});

// ─── Horizontal rules (Dividers) ─────────────────────────────────────────────

test.describe('horizontal rule (divider)', () => {
  test('a divider is rendered as an editable block', async ({ preview }) => {
    await preview.open('# Doc\n\nBefore.\n\n---\n\nAfter.\n');
    await preview.edit();
    // An <hr> gets the mdstyled-editable class just like other blocks
    await expect(preview.page.locator('.mdstyled-root hr.mdstyled-editable')).toBeVisible();
  });

  test('clicking a divider opens the block editor', async ({ preview, page }) => {
    await preview.open('# Doc\n\nBefore.\n\n---\n\nAfter.\n');
    await preview.edit();
    await page.locator('.mdstyled-root hr.mdstyled-editable').click();
    await expect(preview.editor()).toBeVisible();
  });

  test('saving a divider unchanged leaves the file byte-exact', async ({ preview, page }) => {
    const md = '# Doc\n\nBefore.\n\n---\n\nAfter.\n';
    await preview.open(md);
    await preview.edit();
    await page.locator('.mdstyled-root hr.mdstyled-editable').click();
    await expect(preview.editor()).toBeVisible();
    await preview.save();
    expect(preview.read()).toBe(md);
  });

  test('a divider between sections round-trips with surrounding blocks untouched', async ({ preview, page }) => {
    const md = '# Title\n\nFirst section.\n\n---\n\nSecond section.\n';
    await preview.open(md);
    await preview.edit();
    await page.locator('.mdstyled-root hr.mdstyled-editable').click();
    await preview.save();
    expect(preview.read()).toBe(md);
  });
});
