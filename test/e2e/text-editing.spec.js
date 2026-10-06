// Editing a single block: inline formatting, links, colours, emoji, the Markdown
// toggle, changing block type and style, blocks the rich editor cannot reproduce,
// and deleting.
const { test, expect } = require('./fixtures');

// "End" scrolls the page on macOS instead of moving the caret.
const END = process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End';

const tool = (preview, label) => preview.editor().locator(`[aria-label="${label}"]`);
const textarea = preview => preview.editor().locator('.mdstyled-edit-textarea');
const selectAll = page => page.keyboard.press('ControlOrMeta+a');

/** Opens the "Turn into / Style" dropdown and clicks the item named `label`. */
async function pick(preview, label) {
  const editor = preview.editor();
  await editor.locator('.mdstyled-select').click();
  await expect(editor.locator('.mdstyled-select-menu')).toBeVisible();
  const items = editor.locator('.mdstyled-select-item');
  await items.filter({ hasText: new RegExp('^(?:H[1-6])?' + label + '$') }).click();
}

const typeLabel = preview => preview.editor().locator('.mdstyled-select-label');

test.describe('paragraphs', () => {
  test('editing a paragraph saves the exact Markdown', async ({ preview, page }) => {
    await preview.open('# Doc\n\nFirst paragraph.\n\nSecond paragraph.\n');
    await preview.openBlock('First paragraph');
    await page.keyboard.press(END);
    await page.keyboard.type(' Extended.');
    await preview.save();
    expect(preview.read()).toBe('# Doc\n\nFirst paragraph. Extended.\n\nSecond paragraph.\n');
    await expect(preview.block('Extended.')).toBeVisible();
  });

  test('existing inline formatting round-trips untouched', async ({ preview }) => {
    const md = 'Some **bold**, *italic*, ~~gone~~, `code` and a [link](https://example.com).\n';
    await preview.open(md);
    await preview.openBlock('Some');
    await preview.save();
    expect(preview.read()).toBe(md);
  });

  test('the editor opens on the rich surface with the block-type readout', async ({ preview }) => {
    await preview.open('Plain text.\n');
    await preview.openBlock('Plain');
    await expect(preview.rich()).toBeVisible();
    await expect(textarea(preview)).toBeHidden();
    await expect(typeLabel(preview)).toHaveText('Text');
  });
});

test.describe('inline formatting buttons', () => {
  async function formatted(preview, page, click) {
    await preview.open('Seed.\n');
    await preview.openBlock('Seed');
    await selectAll(page);
    await page.keyboard.type('word');
    await selectAll(page);
    await click();
    await preview.save();
    return preview.read();
  }

  test('Bold button', async ({ preview, page }) => {
    expect(await formatted(preview, page, () => tool(preview, 'Bold').click())).toBe('**word**\n');
  });

  test('Italic button', async ({ preview, page }) => {
    expect(await formatted(preview, page, () => tool(preview, 'Italic').click())).toBe('*word*\n');
  });

  test('Strikethrough button', async ({ preview, page }) => {
    expect(await formatted(preview, page, () => tool(preview, 'Strikethrough').click())).toBe('~~word~~\n');
  });

  test('Inline code button', async ({ preview, page }) => {
    expect(await formatted(preview, page, () => tool(preview, 'Inline code').click())).toBe('`word`\n');
  });

  test('Ctrl/Cmd+B makes the selection bold', async ({ preview, page }) => {
    expect(await formatted(preview, page, () => page.keyboard.press('ControlOrMeta+b'))).toBe('**word**\n');
  });

  test('Ctrl/Cmd+I makes the selection italic', async ({ preview, page }) => {
    expect(await formatted(preview, page, () => page.keyboard.press('ControlOrMeta+i'))).toBe('*word*\n');
  });

  test('Bold toggles off again and reports its state', async ({ preview, page }) => {
    await preview.open('Seed.\n');
    await preview.openBlock('Seed');
    await selectAll(page);
    await page.keyboard.type('word');
    await selectAll(page);
    await tool(preview, 'Bold').click();
    await expect(tool(preview, 'Bold')).toHaveAttribute('aria-pressed', 'true');
    await tool(preview, 'Bold').click();
    await expect(tool(preview, 'Bold')).toHaveAttribute('aria-pressed', 'false');
    await preview.save();
    expect(preview.read()).toBe('word\n');
  });

  test('formatting only part of a paragraph', async ({ preview, page }) => {
    await preview.open('Seed.\n');
    await preview.openBlock('Seed');
    await selectAll(page);
    await page.keyboard.type('one two three');
    await page.keyboard.press('Home');
    // select the middle word: move past "one ", then shift-select 3 chars
    for (let i = 0; i < 4; i++) await page.keyboard.press('ArrowRight');
    for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowRight');
    await tool(preview, 'Bold').click();
    await preview.save();
    expect(preview.read()).toBe('one **two** three\n');
  });
});

test.describe('links', () => {
  test('the link row turns the selection into a link', async ({ preview, page }) => {
    await preview.open('Seed.\n');
    await preview.openBlock('Seed');
    await selectAll(page);
    await page.keyboard.type('docs');
    await selectAll(page);
    await tool(preview, 'Link').click();
    const input = preview.editor().locator('.mdstyled-link-input');
    await expect(input).toBeVisible();
    await input.fill('https://example.com/docs');
    await preview.editor().getByRole('button', { name: 'Add link', exact: true }).click();
    await expect(preview.editor().locator('.mdstyled-link-row')).toBeHidden();
    await preview.save();
    expect(preview.read()).toBe('[docs](https://example.com/docs)\n');
  });

  test('Enter in the link field applies it', async ({ preview, page }) => {
    await preview.open('Seed.\n');
    await preview.openBlock('Seed');
    await selectAll(page);
    await page.keyboard.type('docs');
    await selectAll(page);
    await tool(preview, 'Link').click();
    await preview.editor().locator('.mdstyled-link-input').fill('./other.md');
    await page.keyboard.press('Enter');
    await preview.save();
    expect(preview.read()).toBe('[docs](./other.md)\n');
  });

  test('Cancel closes the link row without touching the text', async ({ preview, page }) => {
    await preview.open('Seed.\n');
    await preview.openBlock('Seed');
    await selectAll(page);
    await tool(preview, 'Link').click();
    await preview.editor().locator('.mdstyled-link-input').fill('https://example.com');
    await preview.editor().locator('.mdstyled-link-row').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(preview.editor().locator('.mdstyled-link-row')).toBeHidden();
    await expect(preview.rich().locator('a')).toHaveCount(0);
    await preview.rerender(() => preview.editor().getByRole('button', { name: 'Save', exact: true }).click());
    expect(preview.read()).toBe('Seed.\n');
  });

  // PRODUCT BUG: closeLinkRow() (Cancel) hides the button that has focus and does not
  // give focus back to the editing surface, so focus drops to <body>. The editor's
  // Ctrl/Cmd+Enter and Esc handlers live on the surface, so both stop working until the
  // user clicks back into the text. (Applying a link does refocus the surface.)
  test.fixme('focus returns to the text after cancelling the link row', async ({ preview, page }) => {
    await preview.open('Seed.\n');
    await preview.openBlock('Seed');
    await selectAll(page);
    await tool(preview, 'Link').click();
    await preview.editor().locator('.mdstyled-link-row').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(preview.rich()).toBeFocused();
  });

  test('with nothing selected the URL itself is inserted as a link', async ({ preview, page }) => {
    await preview.open('Seed.\n');
    await preview.openBlock('Seed');
    await page.keyboard.press(END);
    await page.keyboard.type(' ');
    await tool(preview, 'Link').click();
    await preview.editor().locator('.mdstyled-link-input').fill('https://example.com');
    await page.keyboard.press('Enter');
    await preview.save();
    expect(preview.read()).toBe('Seed. [https://example.com](https://example.com)\n');
  });
});

test.describe('colour and highlight', () => {
  async function swatched(preview, page, index) {
    await preview.open('Seed.\n');
    await preview.openBlock('Seed');
    await selectAll(page);
    await page.keyboard.type('word');
    await selectAll(page);
    await tool(preview, 'Colour').click();
    const swatches = preview.editor().locator('.mdstyled-swatch');
    await expect(swatches).toHaveCount(12);
    await swatches.nth(index).click();
    await preview.save();
    return preview.read();
  }

  test('a text colour wraps the selection in a coloured span', async ({ preview, page }) => {
    expect(await swatched(preview, page, 0)).toBe('<span style="color: #e11d48">word</span>\n');
  });

  test('a highlight wraps the selection in a background span', async ({ preview, page }) => {
    expect(await swatched(preview, page, 6)).toBe('<span style="background-color: #fef08a">word</span>\n');
  });

  test('Remove colour takes the span off again', async ({ preview, page }) => {
    await preview.open('A <span style="color: #e11d48">red</span> word.\n');
    await preview.openBlock('word');
    await page.locator('.mdstyled-block-editor .mdstyled-rich span').dblclick();
    await tool(preview, 'Colour').click();
    await preview.editor().getByRole('button', { name: 'Remove colour' }).click();
    await preview.save();
    expect(preview.read()).toBe('A red word.\n');
  });
});

test.describe('clear formatting', () => {
  test('strips bold, italic, strikethrough and code from the selection', async ({ preview, page }) => {
    await preview.open('A **bold**, *italic*, ~~struck~~ and `code` line.\n');
    await preview.openBlock('line');
    await selectAll(page);
    await tool(preview, 'Clear formatting').click();
    await preview.save();
    expect(preview.read()).toBe('A bold, italic, struck and code line.\n');
  });
});

test.describe('emoji', () => {
  // PRODUCT BUG (rich mode): opening the picker focuses its search box, which drops the
  // caret; insertEmoji() then calls rich.focus(), which puts the caret at the START of the
  // block. The emoji lands before "Ship it" instead of at the caret (end of text).
  // The Markdown textarea is not affected.
  test.fixme('the picker inserts at the caret in the rich editor', async ({ preview, page }) => {
    await preview.open('Ship it \n');
    await preview.openBlock('Ship');
    await page.keyboard.press(END);
    await tool(preview, 'Emoji').click();
    await preview.editor().locator('.mdstyled-emoji-search').fill('rocket');
    await preview.editor().locator('.mdstyled-emoji').click();
    await preview.save();
    expect(preview.read()).toBe('Ship it 🚀\n');
  });

  test('the picker lists all groups, searches, and inserts an emoji', async ({ preview, page }) => {
    await preview.open('Ship it \n');
    await preview.openBlock('Ship');
    await page.keyboard.press(END);
    const popover = preview.editor().locator('.mdstyled-emoji-popover');
    await expect(popover).toBeHidden();
    await tool(preview, 'Emoji').click();
    await expect(popover).toBeVisible();
    await expect(popover.locator('.mdstyled-emoji-title')).toHaveCount(6);
    await popover.locator('.mdstyled-emoji-search').fill('rocket');
    await expect(popover.locator('.mdstyled-emoji')).toHaveText(['🚀']);
    await popover.locator('.mdstyled-emoji').click();
    await expect(popover).toBeHidden();
    await preview.save();
    expect(preview.read()).toContain('🚀');
    expect(preview.read()).toContain('Ship it');
  });

  test('a nonsense search says nothing matches', async ({ preview }) => {
    await preview.open('Text.\n');
    await preview.openBlock('Text');
    await tool(preview, 'Emoji').click();
    await preview.editor().locator('.mdstyled-emoji-search').fill('zzzzz');
    await expect(preview.editor().locator('.mdstyled-emoji-none')).toBeVisible();
  });

  test('Enter in the search box inserts the first match', async ({ preview, page }) => {
    await preview.open('Go\n');
    await preview.openBlock('Go');
    await tool(preview, 'Emoji').click();
    await preview.editor().locator('.mdstyled-emoji-search').fill('rocket');
    await page.keyboard.press('Enter');
    await preview.save();
    expect(preview.read()).toContain('🚀');
  });

  test('typing :rock suggests the rocket and Enter accepts it', async ({ preview, page }) => {
    await preview.open('Ship it\n');
    await preview.openBlock('Ship');
    await page.keyboard.press(END);
    await page.keyboard.type(' :rock');
    const strip = preview.editor().locator('.mdstyled-emoji-suggest');
    await expect(strip).toBeVisible();
    await expect(strip.locator('.mdstyled-emoji-glyph').first()).toHaveText('🚀');
    await expect(strip.locator('.mdstyled-emoji-option').first()).toHaveClass(/active/);
    await page.keyboard.press('Enter');
    await expect(strip).toBeHidden();
    await preview.save();
    expect(preview.read()).toBe('Ship it 🚀\n');
  });

  test('Tab accepts the first suggestion', async ({ preview, page }) => {
    await preview.open('Ship it\n');
    await preview.openBlock('Ship');
    await page.keyboard.press(END);
    await page.keyboard.type(' :rock');
    await expect(preview.editor().locator('.mdstyled-emoji-suggest')).toBeVisible();
    await page.keyboard.press('Tab');
    await preview.save();
    expect(preview.read()).toBe('Ship it 🚀\n');
  });

  // PRODUCT BUG: the suggestion list is re-built on every keyup (updateSuggestions is bound
  // to 'keyup'), which resets the highlight to the first entry. ArrowDown moves it on
  // keydown and the keyup of that same key immediately snaps it back, so the highlight
  // can never be steered in a real browser and Tab/Enter always take the first emoji.
  test.fixme('Tab accepts the highlighted suggestion, arrow keys move through them', async ({ preview, page }) => {
    await preview.open('Pick\n');
    await preview.openBlock('Pick');
    await page.keyboard.press(END);
    await page.keyboard.type(' :ch');
    const options = preview.editor().locator('.mdstyled-emoji-option');
    await expect(options.nth(1)).toBeVisible();
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(1)).toHaveClass(/active/);
    const second = await options.nth(1).locator('.mdstyled-emoji-glyph').textContent();
    await page.keyboard.press('ArrowUp');
    await expect(options.nth(0)).toHaveClass(/active/);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Tab');
    await preview.save();
    expect(preview.read()).toBe(`Pick ${second}\n`);
  });

  // PRODUCT BUG: same cause as above. Escape hides the strip on keydown, then the keyup
  // runs updateSuggestions() again; the text before the caret still ends in ":rock", so the
  // strip re-opens at once. Esc cannot dismiss the suggestions.
  test.fixme('Escape dismisses the suggestions without inserting', async ({ preview, page }) => {
    await preview.open('Ship\n');
    await preview.openBlock('Ship');
    await page.keyboard.press(END);
    await page.keyboard.type(' :rock');
    await expect(preview.editor().locator('.mdstyled-emoji-suggest')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(preview.editor().locator('.mdstyled-emoji-suggest')).toBeHidden();
    // Escape only dismissed the strip: the editor is still open and the text intact
    await expect(preview.editor()).toBeVisible();
    await expect(preview.rich()).toHaveText('Ship :rock');
  });

  test('a colon in the middle of a word is not a shortcode', async ({ preview, page }) => {
    await preview.open('Ratio\n');
    await preview.openBlock('Ratio');
    await page.keyboard.press(END);
    await page.keyboard.type(' 3:2');
    await expect(preview.editor().locator('.mdstyled-emoji-suggest')).toBeHidden();
  });

  test('the picker inserts into the Markdown textarea too', async ({ preview, page }) => {
    await preview.open('Ship it\n');
    await preview.openBlock('Ship');
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    const ta = textarea(preview);
    await expect(ta).toBeVisible();
    await ta.fill('Ship it ');
    await ta.focus();
    await page.keyboard.press(END);
    await tool(preview, 'Emoji').click();
    await preview.editor().locator('.mdstyled-emoji-search').fill('rocket');
    await preview.editor().locator('.mdstyled-emoji').click();
    await expect(ta).toHaveValue('Ship it 🚀');
  });

  test(':shortcode suggestions work in the Markdown textarea', async ({ preview, page }) => {
    await preview.open('Ship it\n');
    await preview.openBlock('Ship');
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    const ta = textarea(preview);
    await ta.focus();
    await page.keyboard.press(END);
    await page.keyboard.type(' :rock');
    await expect(preview.editor().locator('.mdstyled-emoji-suggest')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('Ship it 🚀');
  });
});

test.describe('Markdown toggle', () => {
  test('rich -> markdown -> rich keeps the content', async ({ preview }) => {
    await preview.open('A paragraph with **bold** and *soft* text.\n');
    await preview.openBlock('A paragraph');
    const toggle = preview.editor().locator('.mdstyled-mode-toggle');
    await expect(toggle).toContainText('Markdown');

    await toggle.click();
    await expect(textarea(preview)).toBeVisible();
    await expect(preview.rich()).toBeHidden();
    await expect(textarea(preview)).toHaveValue('A paragraph with **bold** and *soft* text.');
    await expect(toggle).toContainText('Rich text');

    await toggle.click();
    await expect(preview.rich()).toBeVisible();
    await expect(textarea(preview)).toBeHidden();
    await expect(preview.rich().locator('strong')).toHaveText('bold');
    await expect(preview.rich().locator('em')).toHaveText('soft');

    await preview.save();
    expect(preview.read()).toBe('A paragraph with **bold** and *soft* text.\n');
  });

  test('editing in Markdown mode saves', async ({ preview, page }) => {
    await preview.open('# Doc\n\nOld text.\n\nAfter.\n');
    await preview.openBlock('Old text');
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    await textarea(preview).fill('New **markdown** text.');
    await preview.save();
    expect(preview.read()).toBe('# Doc\n\nNew **markdown** text.\n\nAfter.\n');
  });

  test('inline buttons work on the textarea selection and toggle off', async ({ preview, page }) => {
    await preview.open('A paragraph here.\n');
    await preview.openBlock('A paragraph');
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    const ta = textarea(preview);
    await ta.focus();
    await ta.evaluate(node => node.setSelectionRange(2, 11));
    await tool(preview, 'Bold').click();
    await expect(ta).toHaveValue('A **paragraph** here.');
    await expect(tool(preview, 'Bold')).toHaveAttribute('aria-pressed', 'true');
    await tool(preview, 'Bold').click();
    await expect(ta).toHaveValue('A paragraph here.');
    await tool(preview, 'Italic').click();
    await expect(ta).toHaveValue('A *paragraph* here.');
    await tool(preview, 'Italic').click();
    await expect(ta).toHaveValue('A paragraph here.');
  });

  test('italic on bold text wraps instead of splitting the ** pair', async ({ preview }) => {
    await preview.open('A bold word.\n');
    await preview.openBlock('A bold');
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    const ta = textarea(preview);
    await ta.fill('A **bold** word.');
    await ta.evaluate(node => { node.focus(); node.setSelectionRange(4, 8); });
    await tool(preview, 'Italic').click();
    await expect(ta).toHaveValue('A ***bold*** word.');
  });

  test('colour in the textarea writes a span', async ({ preview }) => {
    await preview.open('A paragraph here.\n');
    await preview.openBlock('A paragraph');
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    const ta = textarea(preview);
    await ta.focus();
    await ta.evaluate(node => node.setSelectionRange(2, 11));
    await tool(preview, 'Colour').click();
    await preview.editor().locator('.mdstyled-swatch').first().click();
    await expect(ta).toHaveValue('A <span style="color: #e11d48">paragraph</span> here.');
  });
});

test.describe('typing in lists (Markdown mode)', () => {
  async function inMarkdown(preview, md, click) {
    await preview.open(md);
    await preview.openBlock(click);
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    const ta = textarea(preview);
    await ta.focus();
    return ta;
  }

  test('Enter in a checklist adds an unchecked item', async ({ preview, page }) => {
    const ta = await inMarkdown(preview, '- [x] done task\n', 'done');
    await ta.evaluate(n => n.setSelectionRange(n.value.length, n.value.length));
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('- [x] done task\n- [ ] ');
  });

  test('Enter in a numbered list counts up', async ({ preview, page }) => {
    const ta = await inMarkdown(preview, '1. first\n', 'first');
    await ta.evaluate(n => n.setSelectionRange(n.value.length, n.value.length));
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('1. first\n2. ');
  });

  test('Enter in a quote carries the marker', async ({ preview, page }) => {
    const ta = await inMarkdown(preview, '> quoted\n', 'quoted');
    await ta.evaluate(n => n.setSelectionRange(n.value.length, n.value.length));
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('> quoted\n> ');
  });

  test('Enter on an empty item ends the list', async ({ preview, page }) => {
    const ta = await inMarkdown(preview, '- a bullet\n', 'bullet');
    await ta.fill('- [ ] ');
    await ta.evaluate(n => n.setSelectionRange(n.value.length, n.value.length));
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('');
  });

  test('Enter mid-item splits it', async ({ preview, page }) => {
    const ta = await inMarkdown(preview, '- [ ] alpha beta\n', 'alpha');
    await ta.evaluate(n => n.setSelectionRange(11, 11));
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('- [ ] alpha\n- [ ] beta');
  });

  test('Tab indents a list line and Shift+Tab outdents it', async ({ preview, page }) => {
    const ta = await inMarkdown(preview, '- [ ] indent me\n', 'indent');
    await ta.evaluate(n => n.setSelectionRange(n.value.length, n.value.length));
    await page.keyboard.press('Tab');
    await expect(ta).toHaveValue('  - [ ] indent me');
    await page.keyboard.press('Shift+Tab');
    await expect(ta).toHaveValue('- [ ] indent me');
  });

  test('Shift+Enter in plain text is left to the browser (a plain newline)', async ({ preview, page }) => {
    const ta = await inMarkdown(preview, 'Just a paragraph\n', 'Just');
    await ta.evaluate(n => n.setSelectionRange(n.value.length, n.value.length));
    await page.keyboard.press('Shift+Enter');
    await expect(ta).toHaveValue('Just a paragraph\n');
  });
});

test.describe('typing in lists (rich mode)', () => {
  test('Enter in a checklist gives the new item a checkbox and saves as an unchecked task', async ({ preview, page }) => {
    await preview.open('# T\n\n- [ ] first task\n- [x] done task\n');
    await preview.openBlock('done task');
    await expect(preview.rich().locator('input[type="checkbox"]')).toHaveCount(2);
    await page.keyboard.press(END);
    await page.keyboard.press('Enter');
    await page.keyboard.type('typed after Enter');
    await expect(preview.rich().locator('li input[type="checkbox"]')).toHaveCount(3);
    await expect(preview.rich().locator('input[type="checkbox"]').last()).not.toBeChecked();
    await preview.save();
    expect(preview.read()).toBe('# T\n\n- [ ] first task\n- [x] done task\n- [ ] typed after Enter\n');
  });

  test('checkboxes inside the editor are tickable and keep their state', async ({ preview, page }) => {
    await preview.open('- [ ] first task\n- [x] done task\n');
    await preview.openBlock('first');
    const boxes = preview.rich().locator('input[type="checkbox"]');
    await expect(boxes).toHaveCount(2);
    await expect(boxes.nth(0)).toBeEnabled();
    await expect(boxes.nth(0)).not.toBeChecked();
    await expect(boxes.nth(1)).toBeChecked();
    await boxes.nth(0).check();
    await preview.save();
    expect(preview.read()).toBe('- [x] first task\n- [x] done task\n');
  });

  test('clicking the empty area below the text still gives a caret', async ({ preview, page }) => {
    await preview.open('- one\n- two\n');
    await preview.openBlock('one');
    const box = await preview.rich().boundingBox();
    await page.mouse.click(box.x + 20, box.y + box.height - 3);
    await expect(preview.rich()).toBeFocused();
    await page.keyboard.type('Z');
    await expect(preview.rich()).toContainText('Z');
  });
});

test.describe('headings', () => {
  test('editing a heading keeps its level', async ({ preview, page }) => {
    await preview.open('# Title\n\n## Sub heading\n\nBody.\n');
    await preview.openBlock('Sub heading');
    await expect(typeLabel(preview)).toHaveText('Heading 2');
    await page.keyboard.press(END);
    await page.keyboard.type(' two');
    await preview.save();
    expect(preview.read()).toBe('# Title\n\n## Sub heading two\n\nBody.\n');
  });

  test('a level-1 heading opens as Heading 1', async ({ preview }) => {
    await preview.open('# Title\n');
    await preview.openBlock('Title');
    await expect(typeLabel(preview)).toHaveText('Heading 1');
  });
});

test.describe('Turn into', () => {
  const SEED = 'Hello world';

  test('the dropdown offers every visible type and style, and starts closed', async ({ preview }) => {
    await preview.open(SEED + '\n');
    await preview.openBlock('Hello');
    const editor = preview.editor();
    const menu = editor.locator('.mdstyled-select-menu');
    await expect(menu).toBeHidden();
    await expect(editor.locator('.mdstyled-select')).toHaveAttribute('aria-expanded', 'false');
    await editor.locator('.mdstyled-select').click();
    await expect(menu).toBeVisible();
    await expect(editor.locator('.mdstyled-select')).toHaveAttribute('aria-expanded', 'true');
    await expect(menu.locator('.mdstyled-select-title')).toHaveText(['Turn into', 'Style']);

    const labels = (await menu.locator('.mdstyled-select-item').allTextContents()).map(t => t.trim().replace(/^H[1-6](?=Heading)/, ''));
    expect(labels).toEqual([
      'Text', 'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6',
      'Bullet list', 'Numbered list', 'Checklist', 'Quote', 'Code block', 'Table',
      'Note', 'Warning', 'Danger', 'Success', 'No style',
    ]);
  });

  test('the dropdown does not offer Divider, Card, Hero, Endpoint, Lead paragraph or Steps', async ({ preview }) => {
    await preview.open(SEED + '\n');
    await preview.openBlock('Hello');
    await preview.editor().locator('.mdstyled-select').click();
    const labels = (await preview.editor().locator('.mdstyled-select-item').allTextContents()).map(t => t.trim());
    for (const banned of ['Divider', 'Card', 'Hero', 'Endpoint', 'Lead paragraph', 'Steps', 'Half card', 'Doc card', 'Cards grid']) {
      expect(labels).not.toContain(banned);
    }
  });

  test('the current type is marked in the menu and named on the trigger', async ({ preview }) => {
    await preview.open(SEED + '\n');
    await preview.openBlock('Hello');
    await expect(typeLabel(preview)).toHaveText('Text');
    await preview.editor().locator('.mdstyled-select').click();
    await expect(preview.editor().locator('.mdstyled-select-menu .mdstyled-select-item.active')).toHaveText('Text');
  });

  const CASES = [
    ['Heading 1', '# Hello world\n'],
    ['Heading 2', '## Hello world\n'],
    ['Heading 3', '### Hello world\n'],
    ['Heading 4', '#### Hello world\n'],
    ['Heading 5', '##### Hello world\n'],
    ['Heading 6', '###### Hello world\n'],
    ['Bullet list', '- Hello world\n'],
    ['Numbered list', '1. Hello world\n'],
    ['Checklist', '- [ ] Hello world\n'],
    ['Quote', '> Hello world\n'],
    ['Code block', '```\nHello world\n```\n'],
    ['Table', '| Hello world |\n| --- |\n| Cell |\n'],
  ];

  for (const [label, expected] of CASES) {
    test(`paragraph -> ${label}`, async ({ preview }) => {
      await preview.open(`${SEED}\n`);
      await preview.openBlock('Hello');
      await pick(preview, label);
      // a table has no rich block type: the converted table simply shows in the surface
      if (label === 'Table') await expect(preview.rich().locator('table')).toBeVisible();
      else await expect(typeLabel(preview)).toHaveText(label);
      await preview.save();
      expect(preview.read()).toBe(expected);
    });
  }

  test('heading -> Text', async ({ preview }) => {
    await preview.open('## Hello world\n');
    await preview.openBlock('Hello');
    await pick(preview, 'Text');
    await expect(typeLabel(preview)).toHaveText('Text');
    await preview.save();
    expect(preview.read()).toBe('Hello world\n');
  });

  test('the quick Bullet list and Checklist buttons on the bar', async ({ preview }) => {
    await preview.open(`${SEED}\n`);
    await preview.openBlock('Hello');
    await tool(preview, 'Checklist').click();
    await expect(tool(preview, 'Checklist')).toHaveAttribute('aria-pressed', 'true');
    await expect(typeLabel(preview)).toHaveText('Checklist');
    await tool(preview, 'Bullet list').click();
    await expect(tool(preview, 'Bullet list')).toHaveAttribute('aria-pressed', 'true');
    await preview.save();
    expect(preview.read()).toBe('- Hello world\n');
  });

  test('picking an item closes the menu; in Markdown mode it rewrites the textarea', async ({ preview }) => {
    await preview.open('A paragraph with **bold**.\n');
    await preview.openBlock('A paragraph');
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    await pick(preview, 'Heading 2');
    await expect(preview.editor().locator('.mdstyled-select-menu')).toBeHidden();
    await expect(textarea(preview)).toHaveValue('## A paragraph with **bold**.');
    await expect(typeLabel(preview)).toHaveText('Heading 2');
    await pick(preview, 'Heading 5');
    await expect(textarea(preview)).toHaveValue('##### A paragraph with **bold**.');
  });

  test('converting inside a document leaves the neighbours alone', async ({ preview }) => {
    await preview.open('# Doc\n\nHello world\n\nAfter.\n');
    await preview.openBlock('Hello');
    await pick(preview, 'Bullet list');
    await expect(typeLabel(preview)).toHaveText('Bullet list');
    await preview.save();
    expect(preview.read()).toBe('# Doc\n\n- Hello world\n\nAfter.\n');
  });
});

test.describe('callout styles', () => {
  for (const [label, cls] of [['Note', 'note'], ['Warning', 'warning'], ['Danger', 'danger'], ['Success', 'success']]) {
    test(`${label} writes the <!-- .${cls} --> comment`, async ({ preview }) => {
      await preview.open('# Doc\n\nHello world\n\nAfter.\n');
      await preview.openBlock('Hello');
      await pick(preview, label);
      await expect(typeLabel(preview)).toHaveText(label);
      await preview.save();
      expect(preview.read()).toBe(`# Doc\n\n<!-- .${cls} -->\nHello world\n\nAfter.\n`);
    });
  }

  test('a quote can be styled as a callout', async ({ preview }) => {
    await preview.open('> Watch out.\n');
    await preview.openBlock('Watch out');
    await pick(preview, 'Warning');
    await preview.save();
    expect(preview.read()).toBe('<!-- .warning -->\n> Watch out.\n');
  });

  test('choosing another style replaces the first', async ({ preview }) => {
    await preview.open('<!-- .note -->\n> Watch out.\n');
    await preview.openBlock('Watch out');
    await expect(typeLabel(preview)).toHaveText('Note');
    await pick(preview, 'Danger');
    await expect(typeLabel(preview)).toHaveText('Danger');
    await preview.save();
    expect(preview.read()).toBe('<!-- .danger -->\n> Watch out.\n');
  });

  test('choosing the active style again switches it off', async ({ preview }) => {
    await preview.open('<!-- .note -->\n> Watch out.\n');
    await preview.openBlock('Watch out');
    await pick(preview, 'Note');
    await expect(typeLabel(preview)).toHaveText('Quote');
    await preview.save();
    expect(preview.read()).toBe('> Watch out.\n');
  });

  test('"No style" removes the comment', async ({ preview }) => {
    await preview.open('# Doc\n\n<!-- .note -->\n> Watch out.\n\nAfter.\n');
    await preview.openBlock('Watch out');
    await expect(typeLabel(preview)).toHaveText('Note');
    await pick(preview, 'No style');
    await expect(typeLabel(preview)).not.toHaveText('Note');
    await preview.save();
    expect(preview.read()).toBe('# Doc\n\n> Watch out.\n\nAfter.\n');
  });

  test('opening a callout and saving unchanged keeps the class line', async ({ preview }) => {
    const md = '# T\n\n<!-- .note -->\n> Watch out.\n';
    await preview.open(md);
    await preview.openBlock('Watch out');
    await preview.save();
    expect(preview.read()).toBe(md);
  });

  test('a callout separated from its comment by a blank line is still recognised', async ({ preview }) => {
    await preview.open('<!-- .success -->\n\n> All good.\n');
    await preview.openBlock('All good');
    await expect(typeLabel(preview)).toHaveText('Success');
  });
});

test.describe('blocks the rich editor cannot reproduce open in Markdown mode', () => {
  const CASES = {
    'a hard-wrapped paragraph': 'This paragraph is wrapped\nacross two source lines.\n',
    'underscore italics': 'Some _italic_ text.\n',
    'star bullets': '* one\n* two\n',
    'a setext heading': 'Setext Heading\n==============\n',
  };

  for (const [name, md] of Object.entries(CASES)) {
    test(`${name} opens as Markdown and saving unchanged leaves the file byte-identical`, async ({ preview, page }) => {
      const doc = `# Top\n\n${md}\nAfter.\n`;
      await preview.open(doc);
      await preview.edit();
      const first = md.split('\n')[0].replace(/^\* /, '').replace(/_/g, '');
      await page.locator('.mdstyled-root .mdstyled-editable').filter({ hasText: first.slice(0, 8) }).first().click();
      await expect(preview.editor()).toBeVisible();
      await expect(textarea(preview)).toBeVisible();
      await expect(preview.rich()).toBeHidden();
      await expect(textarea(preview)).toHaveValue(md.trimEnd());
      await preview.save();
      expect(preview.read()).toBe(doc);
    });
  }
});

test.describe('delete', () => {
  test('needs two clicks and removes the block with its blank line', async ({ preview }) => {
    await preview.open('# Doc\n\nFirst.\n\nSecond.\n\nThird.\n');
    await preview.openBlock('Second');
    const del = preview.editor().locator('.mdstyled-delete');
    await expect(del.locator('.mdstyled-btn-label')).toHaveText('Delete');

    await del.click();
    await expect(del).toHaveClass(/armed/);
    await expect(del.locator('.mdstyled-btn-label')).toHaveText('Delete?');
    expect(preview.read()).toBe('# Doc\n\nFirst.\n\nSecond.\n\nThird.\n');
    expect(preview.server.state.saves).toHaveLength(0);

    await preview.rerender(() => del.click());
    expect(preview.read()).toBe('# Doc\n\nFirst.\n\nThird.\n');
    await expect(preview.block('Second')).toHaveCount(0);
  });

  test('clicking elsewhere in the editor disarms it', async ({ preview }) => {
    await preview.open('One.\n\nTwo.\n');
    await preview.openBlock('Two');
    const del = preview.editor().locator('.mdstyled-delete');
    await del.click();
    await expect(del).toHaveClass(/armed/);
    await preview.rich().click();
    await expect(del).not.toHaveClass(/armed/);
    await expect(del.locator('.mdstyled-btn-label')).toHaveText('Delete');
    await del.click();
    await expect(del).toHaveClass(/armed/);
    expect(preview.server.state.saves).toHaveLength(0);
    expect(preview.read()).toBe('One.\n\nTwo.\n');
  });

  // PRODUCT QUIRK: deleting the LAST block of a file leaves the blank separator that
  // preceded it, so the file becomes "One.\n\n" instead of "One.\n" (deleting a middle
  // block removes its blank line correctly). The trailing empty line that represents the
  // final newline is not counted as a blank line to take along.
  test.fixme('deleting the last block leaves the rest intact', async ({ preview }) => {
    await preview.open('One.\n\nTwo.\n');
    await preview.openBlock('Two');
    const del = preview.editor().locator('.mdstyled-delete');
    await del.click();
    await preview.rerender(() => del.click());
    expect(preview.read()).toBe('One.\n');
  });

  test('deleting a styled block also removes its class comment', async ({ preview }) => {
    await preview.open('One.\n\n<!-- .note -->\n> Careful.\n\nThree.\n');
    await preview.openBlock('Careful');
    const del = preview.editor().locator('.mdstyled-delete');
    await del.click();
    await preview.rerender(() => del.click());
    expect(preview.read()).toBe('One.\n\nThree.\n');
  });
});
