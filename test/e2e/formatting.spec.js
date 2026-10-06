// Additional formatting and editor-interaction tests:
//   – pasting and inserting text into the rich editor and textarea
//   – keyboard shortcuts and toolbar focus behavior
//   – images: clicking in edit mode opens the block editor in rich mode
//   – link removal via Markdown mode
const { test, expect } = require('./fixtures');

const END = process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End';
const tool = (preview, label) => preview.editor().locator(`[aria-label="${label}"]`);
const textarea = preview => preview.editor().locator('.mdstyled-edit-textarea');

// ─── Inserting text programmatically (simulating paste) ───────────────────────

test.describe('inserting text into the editor', () => {
  test('execCommand insertText inserts at the caret in the rich editor', async ({ preview, page }) => {
    await preview.open('Start end.\n');
    await preview.openBlock('Start end');

    // Place caret between "Start " and "end."
    await preview.rich().click();
    await page.keyboard.press('Home');
    for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowRight');

    await page.evaluate(() => {
      document.execCommand('insertText', false, 'middle ');
    });

    await preview.save();
    expect(preview.read()).toBe('Start middle end.\n');
  });

  test('typing into the rich editor appends to existing text', async ({ preview, page }) => {
    await preview.open('Content.\n');
    await preview.openBlock('Content');
    await page.keyboard.press(END);
    await page.keyboard.type(' appended');
    await preview.save();
    expect(preview.read()).toBe('Content. appended\n');
  });

  test('programmatic text insertion via execCommand in Markdown mode', async ({ preview, page }) => {
    await preview.open('Write here.\n');
    await preview.openBlock('Write here');
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    const ta = textarea(preview);
    await ta.focus();
    // Move caret to position 6 ("Write ")
    await ta.evaluate(el => { el.setSelectionRange(6, 6); });
    await page.evaluate(() => {
      const ta = document.querySelector('.mdstyled-block-editor .mdstyled-edit-textarea');
      const pos = ta.selectionStart;
      const insert = 'inserted ';
      ta.value = ta.value.slice(0, pos) + insert + ta.value.slice(pos);
      ta.setSelectionRange(pos + insert.length, pos + insert.length);
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await preview.save();
    expect(preview.read()).toBe('Write inserted here.\n');
  });

  test('inserting bold HTML via execCommand in the rich editor serializes correctly', async ({ preview, page }) => {
    await preview.open('Hello.\n');
    await preview.openBlock('Hello');
    await page.keyboard.press(END);
    // Insert bold text via execCommand (same as clicking the bold button would do)
    await page.evaluate(() => {
      document.execCommand('bold', false, '');
      document.execCommand('insertText', false, 'world');
      document.execCommand('bold', false, '');
    });
    await preview.save();
    expect(preview.read()).toBe('Hello.**world**\n');
  });
});

// ─── Keyboard shortcuts and toolbar focus ────────────────────────────────────

test.describe('keyboard shortcuts from the editing surface', () => {
  test('Escape closes the editor from the rich surface', async ({ preview, page }) => {
    await preview.open('Some text.\n');
    await preview.openBlock('Some text');
    await preview.rich().focus();
    await page.keyboard.press('Escape');
    await expect(preview.editor()).toHaveCount(0);
    expect(preview.read()).toBe('Some text.\n');
  });

  test('Escape closes the editor from the Markdown textarea', async ({ preview, page }) => {
    await preview.open('Some text.\n');
    await preview.openBlock('Some text');
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    await textarea(preview).focus();
    await page.keyboard.press('Escape');
    await expect(preview.editor()).toHaveCount(0);
    expect(preview.read()).toBe('Some text.\n');
  });

  // BUG: Escape only closes the editor when the rich surface or textarea has focus.
  // If a toolbar button has focus, Escape does NOT close the editor because the
  // keydown listener is bound only to `rich` and `ta`, not to the editor container
  // or the document. The user must click back into the text area before Escape works.
  test.fail('Escape closes the editor when focus is on a toolbar button', async ({ preview, page }) => {
    await preview.open('Some text.\n');
    await preview.openBlock('Some text');
    await tool(preview, 'Bold').focus();
    await expect(tool(preview, 'Bold')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(preview.editor()).toHaveCount(0);
  });

  // BUG: same cause — Ctrl/Cmd+Enter saves only from the rich surface or textarea.
  test.fail('Ctrl/Cmd+Enter saves when focus is on a toolbar button', async ({ preview, page }) => {
    await preview.open('Save me.\n');
    await preview.openBlock('Save me');
    await page.keyboard.press(END);
    await page.keyboard.type(' more');
    await tool(preview, 'Bold').focus();
    await preview.rerender(() => page.keyboard.press('ControlOrMeta+Enter'));
    expect(preview.read()).toBe('Save me. more\n');
  });

  test('Tab moves focus through the editor toolbar buttons', async ({ preview, page }) => {
    await preview.open('Some text.\n');
    await preview.openBlock('Some text');
    // Focus the Bold button and Tab to the next one
    await tool(preview, 'Bold').focus();
    await expect(tool(preview, 'Bold')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(tool(preview, 'Bold')).not.toBeFocused();
  });
});

// ─── Images ───────────────────────────────────────────────────────────────────

test.describe('images in edit mode', () => {
  test('a standalone image paragraph is editable and opens in the rich editor', async ({ preview, page }) => {
    // Images round-trip through htmlToMarkdown (![alt](url) → <p><img> → ![alt](url)),
    // so they open in rich mode, not Markdown mode.
    const md = '# Doc\n\n![alt text](https://example.com/img.png)\n\nAfter.\n';
    await preview.open(md);
    await preview.edit();
    const imgBlock = preview.page.locator('.mdstyled-root .mdstyled-editable').filter({ has: preview.page.locator('img') });
    await expect(imgBlock).toHaveCount(1);
    await imgBlock.click();
    await expect(preview.editor()).toBeVisible();
    // The editor opens in rich mode (textarea is hidden)
    await expect(textarea(preview)).toBeHidden();
    await expect(preview.rich()).toBeVisible();
  });

  test('saving an image block unchanged leaves the file byte-exact', async ({ preview, page }) => {
    const md = '# Doc\n\n![alt text](https://example.com/img.png)\n\nAfter.\n';
    await preview.open(md);
    await preview.edit();
    const imgBlock = preview.page.locator('.mdstyled-root .mdstyled-editable').filter({ has: preview.page.locator('img') });
    await imgBlock.click();
    await expect(preview.editor()).toBeVisible();
    await preview.save();
    expect(preview.read()).toBe(md);
  });

  test('switching an image block to Markdown mode shows the image syntax', async ({ preview, page }) => {
    await preview.open('![My image](https://example.com/pic.jpg)\n');
    await preview.edit();
    const imgBlock = preview.page.locator('.mdstyled-root .mdstyled-editable').filter({ has: preview.page.locator('img') });
    await imgBlock.click();
    await expect(preview.editor()).toBeVisible();
    // Switch to Markdown mode to see the raw syntax
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    const ta = textarea(preview);
    await expect(ta).toBeVisible();
    const value = await ta.inputValue();
    expect(value).toContain('![My image]');
    expect(value).toContain('https://example.com/pic.jpg');
  });

  test('editing the alt text of an image in Markdown mode saves the new markdown', async ({ preview, page }) => {
    await preview.open('Before.\n\n![old alt](https://example.com/img.png)\n\nAfter.\n');
    await preview.edit();
    const imgBlock = preview.page.locator('.mdstyled-root .mdstyled-editable').filter({ has: preview.page.locator('img') });
    await imgBlock.click();
    // Switch to Markdown mode and edit
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    const ta = textarea(preview);
    await ta.fill('![new alt](https://example.com/img.png)');
    await preview.save();
    expect(preview.read()).toBe('Before.\n\n![new alt](https://example.com/img.png)\n\nAfter.\n');
  });
});

// ─── Link removal ─────────────────────────────────────────────────────────────

test.describe('link removal', () => {
  test('switching to Markdown mode and removing the link syntax removes the link', async ({ preview, page }) => {
    await preview.open('Check [this link](https://example.com) out.\n');
    await preview.openBlock('this link');
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    const ta = textarea(preview);
    // Replace the markdown link syntax with just the text
    await ta.fill('Check this link out.');
    await preview.save();
    expect(preview.read()).toBe('Check this link out.\n');
  });

  test('clear formatting in rich mode strips inline markup but keeps links', async ({ preview, page }) => {
    // execCommand('removeFormat') strips bold/italic but does NOT remove <a> tags.
    // This is expected browser behaviour; link removal requires Markdown mode.
    await preview.open('A **[linked](https://example.com) word**.\n');
    await preview.openBlock('linked');
    await page.keyboard.press('ControlOrMeta+a');
    await tool(preview, 'Clear formatting').click();
    await preview.save();
    const saved = preview.read();
    // Bold is stripped
    expect(saved).not.toContain('**');
    // The link url survives (no remove-link button; removeFormat doesn't remove <a>)
    expect(saved).toContain('https://example.com');
  });
});

// ─── Code block → Markdown mode interaction ───────────────────────────────────

test.describe('code block in Markdown mode textarea', () => {
  test('switching to rich mode from a code block shows a PRE with the code content', async ({ preview }) => {
    await preview.open('```js\nconst x = 1;\n```\n');
    await preview.openBlock('const x');
    await expect(textarea(preview)).toBeVisible();
    // Switch to rich mode
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    await expect(preview.rich()).toBeVisible();
    await expect(preview.rich()).toContainText('const x = 1;');
  });

  test('Tab in the code block textarea (non-list content) moves focus out', async ({ preview, page }) => {
    await preview.open('```\nsome code\n```\n');
    await preview.openBlock('some code');
    const ta = textarea(preview);
    await ta.focus();
    await page.keyboard.press('Tab');
    // Tab should move focus out of the textarea (indentListLine returns false for non-list)
    await expect(ta).not.toBeFocused();
  });
});
