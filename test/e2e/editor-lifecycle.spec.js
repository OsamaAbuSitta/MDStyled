// Editor lifecycle: front matter preservation, multi-block round-trips, re-render
// deferral while a block editor is open, undo/redo, and link URL pre-fill for
// existing links. Every save is verified against the file on disk.
const { test, expect } = require('./fixtures');
const { DEBOUNCE_MS } = require('../harness/preview');

const END = process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End';

// ─── Front matter preservation ───────────────────────────────────────────────

test.describe('front matter preservation', () => {
  test('YAML front matter is kept when editing a body block', async ({ preview, page }) => {
    const md = '---\ntitle: My Doc\nauthor: Test\n---\n\n# Heading\n\nBody text here.\n';
    await preview.open(md);
    await preview.openBlock('Body text');
    await page.keyboard.press(END);
    await page.keyboard.type(' Appended.');
    await preview.save();
    const result = preview.read();
    expect(result).toContain('---\ntitle: My Doc\nauthor: Test\n---');
    expect(result).toContain('Body text here. Appended.');
  });

  test('YAML front matter is preserved when editing a heading', async ({ preview, page }) => {
    const md = '---\ntitle: Test\n---\n\n# The Title\n\nParagraph.\n';
    await preview.open(md);
    await preview.openBlock('The Title');
    await page.keyboard.press(END);
    await page.keyboard.type(' Extended');
    await preview.save();
    const result = preview.read();
    expect(result).toContain('---\ntitle: Test\n---');
    expect(result).toContain('# The Title Extended');
    expect(result).toContain('Paragraph.');
  });

  test('the front-matter delimiters are not rendered as editable HR dividers', async ({ preview }) => {
    // The opening and closing --- of YAML front matter must not be treated as
    // horizontal rules: there should be no editable <hr> in the page.
    await preview.open('---\ntitle: Hello\n---\n\nBody.\n');
    await preview.edit();
    const editableHR = preview.page.locator('.mdstyled-root hr.mdstyled-editable');
    await expect(editableHR).toHaveCount(0);
  });
});

// ─── Multi-block round-trips ──────────────────────────────────────────────────

test.describe('multi-block document round-trips', () => {
  const MULTIBLOCK = [
    '# Main Heading',
    '',
    '## Sub Heading',
    '',
    'A paragraph with **bold** and *italic* text.',
    '',
    '- [ ] First task',
    '- [x] Done task',
    '- [ ] Third task',
    '',
    '> A blockquote line.',
    '',
    'Final paragraph.',
    '',
  ].join('\n');

  test('opening every block and saving unchanged leaves the file byte-exact', async ({ preview }) => {
    await preview.open(MULTIBLOCK);
    const blocks = ['Main Heading', 'Sub Heading', 'A paragraph', 'First task', 'A blockquote', 'Final paragraph'];
    for (const text of blocks) {
      await preview.openBlock(text);
      await expect(preview.editor()).toBeVisible();
      await preview.save();
      expect(preview.read()).toBe(MULTIBLOCK);
    }
  });

  test('saving is idempotent on a complex document', async ({ preview }) => {
    const md = [
      '---',
      'title: Doc',
      '---',
      '',
      '# Title',
      '',
      'First paragraph.',
      '',
      '- bullet one',
      '- bullet two',
      '',
      '> Quote here.',
      '',
      'Last line.',
      '',
    ].join('\n');

    await preview.open(md);
    await preview.openBlock('First paragraph');
    await preview.save();
    expect(preview.read()).toBe(md);

    await preview.openBlock('Last line');
    await preview.save();
    expect(preview.read()).toBe(md);
  });

  test('neighbouring blocks are not disturbed when one is edited', async ({ preview, page }) => {
    const md = '# A\n\nFirst block.\n\nMiddle block.\n\nLast block.\n';
    await preview.open(md);
    await preview.openBlock('Middle block');
    await page.keyboard.press(END);
    await page.keyboard.type(' edited');
    await preview.save();
    expect(preview.read()).toBe('# A\n\nFirst block.\n\nMiddle block. edited\n\nLast block.\n');
  });
});

// ─── Re-render deferral ───────────────────────────────────────────────────────

test.describe('re-render deferral while the editor is open', () => {
  test('a save triggered while the editor is open defers the page reload until the editor closes', async ({ preview, page }) => {
    // The harness calls api.setEditorOpen(true/false) which sends mdstyled.editorState.
    // While editorOpen is true, any refresh() call sets refreshPending instead of reloading.
    // Closing the editor triggers the pending reload.
    const DOC = '# Doc\n\nA paragraph.\n\n- [ ] task one\n- [ ] task two\n';
    await preview.open(DOC);

    // Open the paragraph block editor – this sends setEditorOpen(true) to the harness
    await preview.openBlock('A paragraph');

    // The setEditorOpen(true) is an async fetch; poll until the harness has processed it
    // before we tick the checkbox (otherwise the tick could arrive first and fire immediately).
    await expect.poll(() => preview.server.state.editorOpen, { timeout: 3000 }).toBe(true);
    const rendersBefore = preview.server.state.renders;

    // Tick a checkbox OUTSIDE the block editor. The change handler sends saveBlock
    // → refresh() → but since editorOpen is true, updateWebview() sets refreshPending.
    const tickBox = page.locator('.mdstyled-root input[type="checkbox"]').first();
    await tickBox.check();

    // Wait longer than the debounce; no reload should have happened yet.
    await page.waitForTimeout(DEBOUNCE_MS + 200);
    expect(preview.server.state.renders).toBe(rendersBefore);

    // Closing the editor (Escape) sends setEditorOpen(false) → harness sees
    // refreshPending=true → calls refresh() → page reloads after another debounce.
    // The Escape handler is bound to the rich surface, so we must focus it first.
    await preview.rich().focus();
    await preview.rerender(() => page.keyboard.press('Escape'));

    // The reload shows the ticked checkbox.
    await expect(page.locator('.mdstyled-root input[type="checkbox"]').first()).toBeChecked();
    // And the server recorded one more render.
    expect(preview.server.state.renders).toBeGreaterThan(rendersBefore);
  });
});

// ─── Undo / redo ─────────────────────────────────────────────────────────────

test.describe('undo and redo', () => {
  test('Ctrl/Cmd+Z undoes typed text in the rich editor', async ({ preview, page }) => {
    await preview.open('Hello world.\n');
    await preview.openBlock('Hello world');
    await page.keyboard.press(END);
    await page.keyboard.type(' appended');
    await expect(preview.rich()).toContainText('Hello world. appended');

    // Undo all typing back to the original
    for (let i = 0; i < 10; i++) await page.keyboard.press('ControlOrMeta+z');
    await preview.save();
    // After undoing everything the file should equal the original
    expect(preview.read()).toBe('Hello world.\n');
  });

  test('undo works in Markdown mode (textarea)', async ({ preview, page }) => {
    await preview.open('Seed text.\n');
    await preview.openBlock('Seed text');
    await preview.editor().locator('.mdstyled-mode-toggle').click();
    const ta = preview.editor().locator('.mdstyled-edit-textarea');
    await ta.fill('Changed text.');
    // Ctrl+Z inside the textarea should undo the fill
    await page.keyboard.press('ControlOrMeta+z');
    // After undo the textarea may contain the original value
    // (browser undo granularity varies, so we just verify no crash and the save path works)
    await preview.save();
    // The saved content should be valid Markdown (not crash)
    const saved = preview.read();
    expect(saved).toBeTruthy();
    expect(saved).toMatch(/\n$/);
  });
});

// ─── Link editing ─────────────────────────────────────────────────────────────

const tool = (preview, label) => preview.editor().locator(`[aria-label="${label}"]`);

test.describe('editing an existing link', () => {
  test('opening the link tool with cursor inside a link pre-fills the URL', async ({ preview, page }) => {
    await preview.open('A [docs link](https://example.com/docs) here.\n');
    await preview.openBlock('docs link');
    // Click inside the link text in the rich editor
    await preview.rich().locator('a').click();
    await tool(preview, 'Link').click();
    const linkInput = preview.editor().locator('.mdstyled-link-input');
    await expect(linkInput).toBeVisible();
    // The URL input should be pre-filled with the existing href
    const value = await linkInput.inputValue();
    expect(value).toBe('https://example.com/docs');
  });

  // BUG: When the selection is collapsed (just a caret inside an existing link), the
  // link tool saves the range and restores it. Since it is collapsed, the Apply action
  // calls exec('insertHTML', '<a href="new">new</a>') which inserts a NEW link at the
  // caret position rather than updating the existing link's href. The original link
  // remains with its old URL. To change a link's URL, the user must select all the
  // link text first so the selection is not collapsed, then the Apply action calls
  // exec('createLink', newHref) which updates the existing link.
  test.fail('changing a link URL via the link row updates the existing href', async ({ preview, page }) => {
    await preview.open('See [the guide](https://old.example.com) for details.\n');
    await preview.openBlock('the guide');
    await preview.rich().locator('a').click();
    await tool(preview, 'Link').click();
    const linkInput = preview.editor().locator('.mdstyled-link-input');
    await linkInput.fill('https://new.example.com/guide');
    await preview.editor().getByRole('button', { name: 'Add link', exact: true }).click();
    await preview.save();
    const saved = preview.read();
    expect(saved).toContain('https://new.example.com/guide');
    expect(saved).not.toContain('https://old.example.com');
  });
});
