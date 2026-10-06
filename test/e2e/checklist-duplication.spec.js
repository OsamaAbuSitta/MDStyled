// Bug hunt: "when I add a checklist, save, then click again to edit it, the items are
// duplicated". Every route a user could take to a saved checklist is walked here, and
// each ends the same way: the file is what it should be, the preview shows each item
// once, and the editor that opens on it shows each item once (one checkbox apiece).
const { test, expect } = require('./fixtures');

const TASKS = ['First task', 'Second task', 'Third task'];

/* What the page shows right now: list items outside any open editor, progress bars. */
function shown(page) {
  return page.evaluate(() => {
    const visible = n => n.offsetParent !== null;
    const items = [...document.querySelectorAll('.mdstyled-root li')]
      .filter(li => !li.closest('.mdstyled-block-editor') && visible(li));
    return {
      items: items.map(li => li.textContent.trim()),
      boxes: items.reduce((n, li) => n + li.querySelectorAll(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]').length, 0),
      bars: [...document.querySelectorAll('.task-progress')].filter(visible).length,
      editors: document.querySelectorAll('.mdstyled-block-editor').length,
    };
  });
}

function editorItems(page) {
  return page.evaluate(() => {
    const rich = document.querySelector('.mdstyled-block-editor .mdstyled-rich');
    if (!rich) return null;
    return [...rich.querySelectorAll('li')].map(li => ({
      text: li.textContent.trim(),
      boxes: li.querySelectorAll(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]').length,
      checked: li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]')?.checked ?? null,
    }));
  });
}

/* The file, the preview and a freshly opened editor all agree on `items`. */
async function expectChecklist(preview, page, file, items, { open = items[0], checked = [] } = {}) {
  expect(preview.read()).toBe(file);
  const now = await shown(page);
  expect(now.items, 'rendered items').toEqual(items);
  expect(now.boxes, 'rendered checkboxes').toBe(items.length);
  expect(now.bars, 'progress bars').toBe(1);

  await preview.openText(open);
  const inEditor = await editorItems(page);
  expect(inEditor.map(i => i.text), 'editor items').toEqual(items);
  expect(inEditor.map(i => i.boxes), 'checkboxes per editor item').toEqual(items.map(() => 1));
  expect(inEditor.map(i => i.checked), 'ticked state in the editor').toEqual(items.map((_, i) => checked.includes(i)));
  expect((await shown(page)).items, 'the rendered list is hidden while editing').toEqual([]);
}

async function saveWithButton(preview, page) {
  await preview.rerender(() => page.locator('.mdstyled-edit-actions button', { hasText: /^Save$/ }).click());
}

const CHECKLIST = '- [ ] First task\n- [ ] Second task\n- [ ] Third task';
const DOC = `# Tasks\n\nIntro.\n\n${CHECKLIST}\n\nAfter.\n`;

test.describe('checklist opened again after saving', () => {
  test('ticking boxes inside the editor before saving', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openText('Second task');
    await preview.rich().locator('li', { hasText: 'Second task' }).locator('input').click();
    await preview.rich().locator('li', { hasText: 'Third task' }).locator('input').click();
    await preview.rich().locator('li', { hasText: 'Third task' }).locator('input').click(); // and back
    await preview.save();
    const file = DOC.replace('- [ ] Second', '- [x] Second');
    await expectChecklist(preview, page, file, TASKS, { checked: [1] });
    await preview.save();
    expect(preview.read()).toBe(file);
    await preview.openText('Third task');
    expect(await editorItems(page)).toHaveLength(3);
  });

  test('ticking a box in the preview, then opening the list', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await preview.rerender(() => page.locator('.mdstyled-root li', { hasText: 'First task' }).locator('input').click());
    const file = DOC.replace('- [ ] First', '- [x] First');
    await expectChecklist(preview, page, file, TASKS, { checked: [0] });
    await preview.save();
    await expectChecklist(preview, page, file, TASKS, { checked: [0] });
  });

  test('ticking in the preview while the page is not in edit mode first (edit toggled after)', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await preview.rerender(() => page.locator('.mdstyled-root li', { hasText: 'Second task' }).locator('input').click());
    await preview.rerender(() => page.locator('.mdstyled-root li', { hasText: 'Second task' }).locator('input').click());
    await expectChecklist(preview, page, DOC, TASKS);
  });

  for (const [label, turnInto] of [
    ['the Turn into dropdown', async (page) => {
      await page.locator('.mdstyled-select').click();
      await page.getByRole('menuitemradio', { name: 'Checklist' }).click();
    }],
    ['the checklist quick button', async (page) => {
      await page.locator('.mdstyled-editor-toolbar .mdstyled-tool[aria-label="Checklist"]').click();
    }],
  ]) {
    test(`a paragraph turned into a checklist with ${label}`, async ({ preview, page }) => {
      await preview.open('# Tasks\n\nFirst task\n\nAfter.\n');
      await preview.openText('First task');
      await turnInto(page);
      await expect(preview.rich().locator('li')).toHaveCount(1);
      await preview.rich().locator('li').click();
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Second task');
      await preview.save();
      await expectChecklist(preview, page, '# Tasks\n\n- [ ] First task\n- [ ] Second task\n\nAfter.\n', ['First task', 'Second task']);
      await preview.save();
      await expectChecklist(preview, page, '# Tasks\n\n- [ ] First task\n- [ ] Second task\n\nAfter.\n', ['First task', 'Second task']);
    });

    test(`a bullet list turned into a checklist with ${label}, several times over`, async ({ preview, page }) => {
      await preview.open('# Tasks\n\n- First task\n- Second task\n\nAfter.\n');
      await preview.openText('First task');
      await turnInto(page);
      await turnInto(page);
      await preview.save();
      await expectChecklist(preview, page, '# Tasks\n\n- [ ] First task\n- [ ] Second task\n\nAfter.\n', ['First task', 'Second task']);
    });
  }

  test('editing in Markdown mode, saving and opening again', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openText('First task');
    await page.locator('.mdstyled-mode-toggle').click();
    const ta = page.locator('.mdstyled-edit-textarea');
    await expect(ta).toHaveValue(CHECKLIST);
    await ta.press('ControlOrMeta+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Fourth task');
    await preview.save();
    await expectChecklist(preview, page, DOC.replace(CHECKLIST, CHECKLIST + '\n- [ ] Fourth task'), [...TASKS, 'Fourth task']);
  });

  test('Markdown mode and back to rich text before saving', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openText('First task');
    await page.locator('.mdstyled-mode-toggle').click();
    await page.locator('.mdstyled-mode-toggle').click();
    await page.locator('.mdstyled-mode-toggle').click();
    await page.locator('.mdstyled-mode-toggle').click();
    await expect(preview.rich().locator('li')).toHaveCount(3);
    await preview.save();
    await expectChecklist(preview, page, DOC, TASKS);
  });

  test('typing a new checklist in Markdown mode on a fresh paragraph', async ({ preview, page }) => {
    await preview.open('# Tasks\n\nPlaceholder\n\nAfter.\n');
    await preview.openText('Placeholder');
    await page.locator('.mdstyled-mode-toggle').click();
    const ta = page.locator('.mdstyled-edit-textarea');
    await ta.fill('- [ ] First task');
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Second task');
    await preview.save();
    await expectChecklist(preview, page, '# Tasks\n\n- [ ] First task\n- [ ] Second task\n\nAfter.\n', ['First task', 'Second task']);
  });

  test('Enter on the last empty item, then Enter again to leave the list', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openText('Third task');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await expect(preview.rich().locator('li')).toHaveCount(4);
    await page.keyboard.press('Enter');
    await expect(preview.rich().locator('li')).toHaveCount(3);
    await page.keyboard.press('Enter'); // in the paragraph now: a second paragraph, which is dropped on save
    await page.keyboard.type('Afterwards');
    await preview.save();
    await expect(preview.block('Afterwards')).toBeVisible();
    expect(preview.read()).toBe(DOC.replace(CHECKLIST, CHECKLIST + '\n\nAfterwards'));
    await expectChecklist(preview, page, preview.read(), TASKS);
  });

  test('leaving the list with an empty item and saving right away', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openText('Third task');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await preview.save();
    await expectChecklist(preview, page, DOC, TASKS);
  });

  test('saving with the Save button, then with the keyboard', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openText('Third task');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Fourth task');
    await saveWithButton(preview, page);
    const file = DOC.replace(CHECKLIST, CHECKLIST + '\n- [ ] Fourth task');
    const items = [...TASKS, 'Fourth task'];
    await expectChecklist(preview, page, file, items);
    await saveWithButton(preview, page);
    await expectChecklist(preview, page, file, items);
    await preview.save();
    await expectChecklist(preview, page, file, items);
  });

  test('opening, cancelling and opening again', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openText('Second task');
    await page.keyboard.press('End');
    await page.keyboard.type(' changed');
    await page.locator('.mdstyled-edit-actions button', { hasText: /^Cancel$/ }).click();
    await expect(preview.editor()).toHaveCount(0);
    await expectChecklist(preview, page, DOC, TASKS);
    await page.keyboard.press('Escape');
    await expect(preview.editor()).toHaveCount(0);
    await expectChecklist(preview, page, DOC, TASKS);
  });

  test('opening and closing with Escape, repeatedly', async ({ preview, page }) => {
    await preview.open(DOC);
    for (let i = 0; i < 3; i++) {
      await preview.openText('Second task');
      expect(await editorItems(page)).toHaveLength(3);
      await page.keyboard.press('Escape');
      await expect(preview.editor()).toHaveCount(0);
    }
    await expectChecklist(preview, page, DOC, TASKS);
  });

  test('clicking the list twice quickly', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await page.locator('.mdstyled-root li', { hasText: 'Second task' }).dblclick();
    await expect(preview.editor()).toHaveCount(1);
    expect(await editorItems(page)).toHaveLength(3);
    await preview.save();
    await expectChecklist(preview, page, DOC, TASKS);
  });

  test('clicking the list again straight after saving, before the page re-renders', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openText('Third task');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Fourth task');
    await page.keyboard.press('ControlOrMeta+Enter');
    // whatever is on screen right now, a click must not leave two copies of the list
    await page.locator('.mdstyled-root li', { hasText: 'Second task' }).first().click({ force: true }).catch(() => {});
    await page.waitForLoadState('load');
    await expect.poll(() => page.locator('.mdstyled-root .mdstyled-editable').count()).toBeGreaterThan(0);
    const file = DOC.replace(CHECKLIST, CHECKLIST + '\n- [ ] Fourth task');
    await page.reload();
    await page.locator('.mdstyled-root').waitFor();
    await expectChecklist(preview, page, file, [...TASKS, 'Fourth task']);
  });

  // PRODUCT BUG (reproduced): items are duplicated when the editor is saved twice with
  // the keyboard - a held-down or double-tapped Ctrl/Cmd+Enter.
  //   1. file: "- [ ] First task\n- [ ] Second task\n- [ ] Third task" (lines 4-6)
  //   2. Edit, click "Third task", End, Enter, type "Fourth task"
  //   3. press Ctrl/Cmd+Enter twice in a row (key auto-repeat does the same)
  //   Observed file: First, Second, Third, Fourth, Fourth  - "Fourth task" twice
  //   Both mdstyled.saveBlock messages carry startLine 4, endLine 7 and original =
  //   the three old lines. The first replaces those lines with four; the second finds
  //   the same three lines still sitting at 4-7, replaces them with the four again and
  //   leaves the first save's fourth line behind. commit() (editor.js) disables the
  //   buttons but the Ctrl/Cmd+Enter keydown handler calls commit() again regardless,
  //   and blockEdit accepts the stale range because its first lines still match.
  test.fixme('saving twice in quick succession with the keyboard does not duplicate the new items', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openText('Third task');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Fourth task');
    await page.keyboard.press('ControlOrMeta+Enter');
    await page.keyboard.press('ControlOrMeta+Enter');
    await expect.poll(() => preview.read()).toContain('Fourth task');
    await expect.poll(() => preview.server.state.saves.length).toBeGreaterThan(0);
    await page.waitForLoadState('load');
    await expect.poll(() => shown(page).then(s => s.items)).toEqual([...TASKS, 'Fourth task']);
    expect(preview.read()).toBe(DOC.replace(CHECKLIST, CHECKLIST + '\n- [ ] Fourth task'));
  });

  test('double-clicking the Save button saves once', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openText('Third task');
    await page.keyboard.press('End');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Fourth task');
    await preview.rerender(() => page.locator('.mdstyled-edit-actions button', { hasText: /^Save$/ }).dblclick());
    expect(preview.server.state.saves).toHaveLength(1);
    await expectChecklist(preview, page, DOC.replace(CHECKLIST, CHECKLIST + '\n- [ ] Fourth task'), [...TASKS, 'Fourth task']);
  });

  for (const [label, doc] of [
    ['at the end of the file with a trailing newline', '# Tasks\n\n- [ ] First task\n- [ ] Second task\n- [ ] Third task\n'],
    ['at the end of the file with no trailing newline', '# Tasks\n\n- [ ] First task\n- [ ] Second task\n- [ ] Third task'],
    ['directly after a heading', '# Tasks\n- [ ] First task\n- [ ] Second task\n- [ ] Third task\n\nAfter.\n'],
    ['as the whole file', '- [ ] First task\n- [ ] Second task\n- [ ] Third task\n'],
  ]) {
    test(`a checklist ${label}`, async ({ preview, page }) => {
      await preview.open(doc);
      await preview.edit();
      const lists = await page.locator('.mdstyled-root .mdstyled-editable', { hasText: 'First task' }).count();
      expect(lists).toBe(1);
      await preview.openText('Third task');
      expect(await editorItems(page)).toHaveLength(3);
      await page.keyboard.press('End');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Fourth task');
      await preview.save();
      const saved = preview.read();
      expect(saved).toContain('- [ ] Third task\n- [ ] Fourth task');
      expect(saved.match(/Fourth task/g)).toHaveLength(1);
      await preview.openText('Fourth task');
      expect((await editorItems(page)).map(i => i.text)).toEqual([...TASKS, 'Fourth task']);
      await preview.save();
      expect(preview.read()).toBe(saved);
      await preview.openText('Fourth task');
      expect(await editorItems(page)).toHaveLength(4);
    });
  }

  test('a checklist inserted at the very end of a file without a trailing newline', async ({ preview, page }) => {
    await preview.open('# Tasks\n\nLast paragraph.');
    await preview.edit();
    const gap = page.locator('.mdstyled-root .mdstyled-insert-line').last();
    await gap.hover();
    await gap.locator('.mdstyled-insert-plus').click();
    await preview.rerender(() => page.getByRole('menuitem', { name: 'Checklist' }).click());
    await expect(preview.editor()).toBeVisible();
    await preview.save();
    const saved = preview.read();
    expect(saved.match(/First task/g)).toHaveLength(1);
    await preview.openText('First task');
    expect(await editorItems(page)).toHaveLength(2);
  });

  test('a loose checklist opens with every item once and saves unchanged', async ({ preview, page }) => {
    const loose = '- [ ] First task\n\n- [ ] Second task\n\n- [ ] Third task';
    const doc = `# Tasks\n\n${loose}\n\nAfter.\n`;
    await preview.open(doc);
    await preview.openText('Second task');
    await expect(preview.rich()).toBeVisible();
    expect((await editorItems(page)).map(i => i.text)).toEqual(TASKS);
    await preview.save();
    expect(preview.read()).toBe(doc);
    const now = await shown(page);
    expect(now.items).toEqual(TASKS);
    expect(now.bars).toBe(1);
  });

  // PRODUCT BUG (reproduced): a loose checklist shows two checkboxes per item in the editor.
  //   1. file: "- [ ] First task\n\n- [ ] Second task\n\n- [ ] Third task"
  //   2. Edit, click "Second task"
  //   Observed editor DOM per item: <li><input type=checkbox> <p><input type=checkbox> First task</p></li>
  //   The renderer puts each loose item's checkbox inside its <p>; normaliseTaskLists()
  //   (editor.js) only looks at the <li>'s direct children, finds none, and inserts a
  //   second checkbox at the start of the <li>. The serializer still writes one "[ ]".
  test.fixme('a loose checklist has exactly one checkbox per item in the editor', async ({ preview, page }) => {
    await preview.open('# Tasks\n\n- [ ] First task\n\n- [ ] Second task\n\n- [ ] Third task\n\nAfter.\n');
    await preview.openText('Second task');
    expect((await editorItems(page)).map(i => i.boxes)).toEqual([1, 1, 1]);
  });

  test('a nested checklist', async ({ preview, page }) => {
    const doc = '# Tasks\n\n- [ ] Parent\n  - [ ] Child one\n  - [x] Child two\n- [ ] Sibling\n\nAfter.\n';
    await preview.open(doc);
    await preview.openText('Child one');
    expect((await editorItems(page)).map(i => i.boxes)).toEqual([1, 1, 1, 1]);
    await preview.save();
    expect(preview.read()).toBe(doc);
  });

  test('a checklist with a plain bullet list around it', async ({ preview, page }) => {
    const doc = '# Mixed\n\n- plain one\n- plain two\n\nBetween.\n\n- [ ] task one\n- [x] task two\n\n1. numbered\n';
    await preview.open(doc);
    await preview.edit();
    await preview.openText('task two');
    const items = await editorItems(page);
    expect(items.map(i => i.text)).toEqual(['task one', 'task two']);
    await preview.save();
    expect(preview.read()).toBe(doc);
  });

  test('a checklist right under the task progress bar, opened from the bar', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await page.locator('.task-progress-label').click({ force: true });
    // the bar is not part of the list; either nothing opens or the list opens once
    const count = await preview.editor().count();
    if (count) {
      expect(await editorItems(page)).toHaveLength(3);
      await preview.save();
    }
    await expectChecklist(preview, page, DOC, TASKS);
  });

  test('the progress bar is not doubled after several saves', async ({ preview, page }) => {
    await preview.open(DOC);
    for (let i = 0; i < 3; i++) {
      await preview.openText('Second task');
      await preview.save();
      await expect(page.locator('.task-progress')).toHaveCount(1);
    }
    await expectChecklist(preview, page, DOC, TASKS);
  });
});
