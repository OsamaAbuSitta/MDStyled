// The Edit/Preview toggle, zoom, opening and closing block editors, the whole-file
// Source editor, read-only previews and keeping the reading position across saves.
const { test, expect } = require('./fixtures');

// "End" scrolls the page on macOS instead of moving the caret, so use the
// platform's own move-to-end-of-document chord.
const END = process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End';

const DOC = '# Title\n\nA paragraph with **bold** text.\n\n- [ ] one\n- [x] two\n';

test.describe('Edit / Preview toggle', () => {
  test('toggles aria-pressed, the body class and the label', async ({ preview, page }) => {
    await preview.open(DOC);
    const toggle = page.locator('.mdstyled-edit-toggle');
    const label = toggle.locator('.mdstyled-btn-label');

    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(label).toHaveText('Edit');
    await expect(page.locator('body')).not.toHaveClass(/mdstyled-edit-mode/);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(label).toHaveText('Preview');
    await expect(toggle).toHaveClass(/active/);
    await expect(page.locator('body')).toHaveClass(/mdstyled-edit-mode/);

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(label).toHaveText('Edit');
    await expect(page.locator('body')).not.toHaveClass(/mdstyled-edit-mode/);
  });

  test('turning Preview back on closes an open block editor', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openBlock('A paragraph');
    await page.locator('.mdstyled-edit-toggle').click();
    await expect(preview.editor()).toHaveCount(0);
  });

  test('edit mode survives a save re-render', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openBlock('A paragraph');
    await page.keyboard.press(END);
    await page.keyboard.type(' more');
    await preview.save();
    expect(preview.read()).toBe('# Title\n\nA paragraph with **bold** text. more\n\n- [ ] one\n- [x] two\n');
    await expect(page.locator('body')).toHaveClass(/mdstyled-edit-mode/);
    await expect(page.locator('.mdstyled-edit-toggle')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.mdstyled-edit-toggle .mdstyled-btn-label')).toHaveText('Preview');
  });

  test('the toolbar carries Back, Edit, zoom, Export and Source', async ({ preview, page }) => {
    await preview.open(DOC);
    const bar = page.locator('.mdstyled-edit-bar');
    await expect(bar.locator('.mdstyled-edit-toggle')).toBeVisible();
    await expect(bar.locator('.mdstyled-zoom')).toBeVisible();
    await expect(bar.locator('.mdstyled-edit-export')).toBeVisible();
    await expect(bar.locator('.mdstyled-edit-source')).toBeVisible();
    await expect(bar.locator('.mdstyled-edit-back')).toBeHidden();
  });
});

test.describe('preview checkboxes', () => {
  test('are disabled outside edit mode and enabled inside it', async ({ preview, page }) => {
    await preview.open(DOC);
    const boxes = page.locator('.mdstyled-root input[type="checkbox"]');
    await expect(boxes).toHaveCount(2);
    for (const box of await boxes.all()) {
      await expect(box).toBeDisabled();
      await expect(box).toHaveAttribute('title', 'Turn on Edit to change this');
    }

    await preview.edit();
    for (const box of await boxes.all()) await expect(box).toBeEnabled();

    await page.locator('.mdstyled-edit-toggle').click();
    for (const box of await boxes.all()) await expect(box).toBeDisabled();
  });

  test('ticking a box in edit mode rewrites only that marker', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await preview.rerender(() => page.locator('.mdstyled-root input[type="checkbox"]').first().check());
    expect(preview.read()).toBe('# Title\n\nA paragraph with **bold** text.\n\n- [x] one\n- [x] two\n');
  });
});

test.describe('zoom', () => {
  const root = page => page.locator('.mdstyled-root');
  const level = page => page.locator('.mdstyled-zoom-level');

  test('starts at 100% and steps with the buttons', async ({ preview, page }) => {
    await preview.open(DOC);
    await expect(level(page)).toHaveText('100%');
    await expect(root(page)).toHaveCSS('zoom', '1');

    await page.locator('.mdstyled-zoom-in').click();
    await expect(level(page)).toHaveText('110%');
    expect(await root(page).evaluate(n => n.style.zoom)).toBe('1.1');

    await page.locator('.mdstyled-zoom-out').click();
    await page.locator('.mdstyled-zoom-out').click();
    await expect(level(page)).toHaveText('90%');

    await level(page).click();
    await expect(level(page)).toHaveText('100%');
    expect(await root(page).evaluate(n => n.style.zoom)).toBe('');
  });

  test('keyboard shortcuts zoom in, out and reset', async ({ preview, page }) => {
    await preview.open(DOC);
    await page.keyboard.press('ControlOrMeta+=');
    await expect(level(page)).toHaveText('110%');
    await page.keyboard.press('ControlOrMeta+=');
    await expect(level(page)).toHaveText('125%');
    await page.keyboard.press('ControlOrMeta+-');
    await expect(level(page)).toHaveText('110%');
    await page.keyboard.press('ControlOrMeta+0');
    await expect(level(page)).toHaveText('100%');
  });

  test('zoom stops at both ends', async ({ preview, page }) => {
    await preview.open(DOC);
    for (let i = 0; i < 10; i++) await page.keyboard.press('ControlOrMeta+=');
    await expect(level(page)).toHaveText('200%');
    await expect(page.locator('.mdstyled-zoom-in')).toBeDisabled();
    await page.keyboard.press('ControlOrMeta+0');
    for (let i = 0; i < 10; i++) await page.keyboard.press('ControlOrMeta+-');
    await expect(level(page)).toHaveText('60%');
    await expect(page.locator('.mdstyled-zoom-out')).toBeDisabled();
  });

  test('zoom is remembered across a re-render', async ({ preview, page }) => {
    await preview.open(DOC);
    await page.locator('.mdstyled-zoom-in').click();
    await page.locator('.mdstyled-zoom-in').click();
    await expect(level(page)).toHaveText('125%');

    await preview.openBlock('A paragraph');
    await page.keyboard.type('X');
    await preview.save();

    await expect(level(page)).toHaveText('125%');
    expect(await root(page).evaluate(n => n.style.zoom)).toBe('1.25');
  });

  test('zoom also scales the contents sidebar', async ({ preview, page }) => {
    await preview.open('# One\n\ntext\n\n## Two\n\nmore\n');
    const toc = page.locator('.mdstyled-toc');
    await expect(toc).toHaveCount(1);
    await page.locator('.mdstyled-zoom-in').click();
    expect(await toc.evaluate(n => n.style.zoom)).toBe('1.1');
    expect(await root(page).evaluate(n => n.style.zoom)).toBe('1.1');
    await level(page).click();
    expect(await toc.evaluate(n => n.style.zoom)).toBe('');
  });
});

test.describe('opening a block', () => {
  test('clicking a block opens the editor with the caret where it was clicked', async ({ preview, page }) => {
    await preview.open('Alpha beta gamma delta.\n');
    await preview.edit();
    const p = page.locator('.mdstyled-root p.mdstyled-editable');
    const box = await p.boundingBox();
    // click on the word "gamma": find its position with a Range
    const point = await p.evaluate(node => {
      const text = node.firstChild;
      const i = text.data.indexOf('gamma');
      const r = document.createRange();
      r.setStart(text, i + 2);
      r.setEnd(text, i + 3);
      const rect = r.getBoundingClientRect();
      return { x: rect.left, y: rect.top + rect.height / 2 };
    });
    expect(box).not.toBeNull();
    await page.mouse.click(point.x, point.y);
    await expect(preview.editor()).toBeVisible();
    await expect(preview.rich()).toBeFocused();

    const caret = await page.evaluate(() => {
      const s = getSelection();
      return { collapsed: s.isCollapsed, text: s.anchorNode.data, offset: s.anchorOffset };
    });
    expect(caret.collapsed).toBe(true);
    expect(caret.text).toBe('Alpha beta gamma delta.');
    // clicked in the middle of "gamma": within one character of offset 'Alpha beta ga'
    expect(Math.abs(caret.offset - 'Alpha beta ga'.length)).toBeLessThanOrEqual(1);
  });

  test('clicking at the left edge of a later block puts the caret at its start', async ({ preview, page }) => {
    await preview.open('First one.\n\nSecond paragraph here.\n');
    await preview.edit();
    await page.locator('.mdstyled-root p.mdstyled-editable', { hasText: 'Second' }).click({ position: { x: 1, y: 14 } });
    await expect(preview.rich()).toBeFocused();
    await page.keyboard.type('Zz ');
    await expect(preview.rich()).toContainText('Zz Second paragraph here.');
    await preview.save();
    expect(preview.read()).toBe('First one.\n\nZz Second paragraph here.\n');
  });

  test('clicking in a checklist item opens a rich editor with the items', async ({ preview }) => {
    await preview.open(DOC);
    await preview.openBlock('two');
    await expect(preview.rich().locator('li')).toHaveText(['one', 'two']);
  });

  test('a preview (not edit) click does not open an editor', async ({ preview, page }) => {
    await preview.open(DOC);
    await page.locator('.mdstyled-root p').first().click();
    await expect(preview.editor()).toHaveCount(0);
  });

  test('only one block editor is open at a time', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openBlock('A paragraph');
    await page.locator('.mdstyled-root h1').click();
    await expect(preview.editor()).toHaveCount(1);
    await expect(preview.rich()).toContainText('Title');
  });
});

test.describe('closing without saving', () => {
  test('Escape closes the editor and leaves the file alone', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openBlock('A paragraph');
    await page.keyboard.type(' unsaved');
    await page.keyboard.press('Escape');
    await expect(preview.editor()).toHaveCount(0);
    await expect(preview.block('A paragraph')).toBeVisible();
    await expect(preview.block('A paragraph')).not.toContainText('unsaved');
    expect(preview.read()).toBe(DOC);
    expect(preview.server.state.saves).toHaveLength(0);
  });

  test('Cancel closes the editor and leaves the file alone', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openBlock('A paragraph');
    await page.keyboard.type(' unsaved');
    await preview.editor().getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(preview.editor()).toHaveCount(0);
    await expect(preview.block('A paragraph')).not.toContainText('unsaved');
    expect(preview.read()).toBe(DOC);
    expect(preview.server.state.saves).toHaveLength(0);
  });

  test('Save button writes and closes the editor', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openBlock('A paragraph');
    await page.keyboard.press(END);
    await page.keyboard.type('!');
    await preview.rerender(() => preview.editor().getByRole('button', { name: 'Save', exact: true }).click());
    expect(preview.read()).toBe('# Title\n\nA paragraph with **bold** text.!\n\n- [ ] one\n- [x] two\n');
    await expect(preview.editor()).toHaveCount(0);
  });

  test('saving without changes leaves the file byte-identical', async ({ preview }) => {
    await preview.open(DOC);
    await preview.openBlock('A paragraph');
    await preview.save();
    expect(preview.read()).toBe(DOC);
  });
});

test.describe('Source (whole-file) editor', () => {
  test('opens with the whole file, saving writes it', async ({ preview, page }) => {
    await preview.open(DOC);
    await page.locator('.mdstyled-edit-source').click();
    const ta = page.locator('.mdstyled-source-editor textarea');
    await expect(ta).toBeVisible();
    await expect(ta).toHaveValue(DOC);
    await expect(ta).toBeFocused();

    await ta.fill('# Brand new\n\nBody.\n');
    await preview.rerender(() => page.locator('.mdstyled-source-editor').getByRole('button', { name: 'Save', exact: true }).click());
    expect(preview.read()).toBe('# Brand new\n\nBody.\n');
    await expect(page.locator('.mdstyled-source-editor')).toHaveCount(0);
    await expect(page.locator('.mdstyled-root h1')).toHaveText('Brand new');
  });

  test('Ctrl/Cmd+Enter saves', async ({ preview, page }) => {
    await preview.open(DOC);
    await page.locator('.mdstyled-edit-source').click();
    await page.locator('.mdstyled-source-editor textarea').fill('Only line\n');
    await preview.save();
    expect(preview.read()).toBe('Only line\n');
  });

  test('Escape closes it without writing', async ({ preview, page }) => {
    await preview.open(DOC);
    await page.locator('.mdstyled-edit-source').click();
    const ta = page.locator('.mdstyled-source-editor textarea');
    await ta.fill('changed');
    await page.keyboard.press('Escape');
    await expect(page.locator('.mdstyled-source-editor')).toHaveCount(0);
    expect(preview.read()).toBe(DOC);
    expect(preview.server.state.saves).toHaveLength(0);
  });

  test('Cancel closes it without writing', async ({ preview, page }) => {
    await preview.open(DOC);
    await page.locator('.mdstyled-edit-source').click();
    await page.locator('.mdstyled-source-editor textarea').fill('changed');
    await page.locator('.mdstyled-source-editor').getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.locator('.mdstyled-source-editor')).toHaveCount(0);
    expect(preview.read()).toBe(DOC);
  });

  test('opening it leaves edit mode', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await page.locator('.mdstyled-edit-source').click();
    await expect(page.locator('body')).not.toHaveClass(/mdstyled-edit-mode/);
  });
});

test.describe('read-only preview', () => {
  test('has no editing affordances and never writes the file', async ({ preview, page }) => {
    await preview.open(DOC, { editing: false });
    await expect(page.locator('.mdstyled-edit-toggle')).toHaveCount(0);
    await expect(page.locator('.mdstyled-edit-source')).toHaveCount(0);
    await expect(page.locator('.mdstyled-insert-plus')).toHaveCount(0);
    await expect(page.locator('.mdstyled-editable')).toHaveCount(0);

    await page.locator('.mdstyled-root p').first().click();
    await expect(preview.editor()).toHaveCount(0);
    expect(preview.read()).toBe(DOC);
    expect(preview.server.state.saves).toHaveLength(0);
  });

  test('checkboxes stay disabled and ticking does nothing', async ({ preview, page }) => {
    await preview.open(DOC, { editing: false });
    const boxes = page.locator('.mdstyled-root input[type="checkbox"]');
    await expect(boxes).toHaveCount(2);
    for (const box of await boxes.all()) await expect(box).toBeDisabled();
    await boxes.first().click({ force: true });
    await expect(boxes.first()).not.toBeChecked();
    expect(preview.read()).toBe(DOC);
    expect(preview.server.state.saves).toHaveLength(0);
  });
});

test.describe('reading position', () => {
  test('a block saved far down the page stays where it was in the viewport', async ({ preview, page }) => {
    const filler = Array.from({ length: 60 }, (_, i) => `Filler paragraph number ${i + 1} with some words to take up room.`).join('\n\n');
    await preview.open(`# Top\n\n${filler}\n\nTarget paragraph here.\n\n${filler}\n`);
    await preview.edit();

    const target = page.locator('.mdstyled-root p.mdstyled-editable', { hasText: 'Target paragraph here.' });
    await target.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, 150));
    // let the throttled scroll handler store the position
    await expect.poll(() => page.evaluate(() => JSON.parse(sessionStorage.getItem('mdstyled-webview-state') || '{}').scrollY || 0)).toBeGreaterThan(1000);

    const before = (await target.boundingBox()).y;
    await target.click();
    await expect(preview.editor()).toBeVisible();
    await page.keyboard.press(END);
    await page.keyboard.type(' Edited.');
    await preview.save();

    const after = page.locator('.mdstyled-root p.mdstyled-editable', { hasText: 'Edited.' });
    await expect(after).toBeVisible();
    await expect.poll(async () => Math.abs((await after.boundingBox()).y - before), { timeout: 5000 }).toBeLessThanOrEqual(40);
    expect(preview.read()).toContain('Target paragraph here. Edited.');
  });
});
