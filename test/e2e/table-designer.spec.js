// The table designer: a table is edited as a grid of cells and written back as a
// padded GFM table. Everything here is driven with real clicks and keys.
const { test, expect } = require('./fixtures');

const TABLE = '# T\n\n| Name | Role |\n|---|---|\n| Ada | Eng |\n| Bob | Ops |\n\nAfter.\n';
const AFTER = '\n\nAfter.\n';

const designer = page => page.locator('.mdstyled-table-designer');
const cell = (page, r, c) => designer(page).locator(`input[data-row="${r}"][data-col="${c}"]`);
const headerCount = page => designer(page).locator('thead .mdstyled-tdesign-header input');
const bodyRows = page => designer(page).locator('tbody tr');
const coltools = (page, c) => designer(page).locator('.mdstyled-tdesign-coltools').nth(c);
/** A row's tools only show while the pointer is on the row, so hover it like a user would. */
async function rowBtn(page, r, name) {
  const row = bodyRows(page).nth(r);
  await row.hover();
  return row.getByRole('button', { name });
}
const barButton = (page, name) => designer(page).locator('.mdstyled-designer-bar .mdstyled-card-add', { hasText: name });
const saveButton = page => designer(page).getByRole('button', { name: 'Save', exact: true });

/** Opens the designer by clicking a rendered body cell, or a header when `header` is set. */
async function openDesigner(preview, markdown, text, { header = false } = {}) {
  await preview.open(markdown);
  await preview.edit();
  const tag = header ? 'th' : 'td';
  await preview.page.locator(`.table-wrapper ${tag}`, { hasText: text }).first().click();
  await expect(designer(preview.page)).toBeVisible();
  return preview.page;
}

async function saveAndRead(preview) {
  await preview.save();
  return preview.read();
}

test.describe('opening', () => {
  test('clicking a body cell opens the designer focused on that cell, the table hidden', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ops');
    await expect(cell(page, 1, 1)).toBeFocused();
    await expect(cell(page, 1, 1)).toHaveValue('Ops');
    await expect(page.locator('.table-wrapper')).toHaveClass(/mdstyled-editable-hidden/);
    await expect(designer(page).locator('.mdstyled-tdesign-input')).toHaveCount(6);
    await expect(cell(page, -1, 1)).toHaveValue('Role');
    await expect(designer(page).locator('.mdstyled-designer-count')).toHaveText('2 columns × 2 rows');
    await expect(page.locator('.mdstyled-block-editor .mdstyled-edit-textarea:visible')).toHaveCount(0);
  });

  test('focus lands on the clicked cell even after the preview table was sorted', async ({ preview }) => {
    const md = '# T\n\n| Name | Score |\n|---|---|\n| Ada | 3 |\n| Bob | 1 |\n| Cy | 2 |\n';
    await preview.open(md);
    await preview.edit();
    const page = preview.page;
    // sorting is a view-only header click; in edit mode the click may also open the designer,
    // so sort first in view mode
    await page.locator('.mdstyled-edit-toggle').click();
    await page.locator('.table-wrapper th', { hasText: 'Score' }).click();
    await expect(page.locator('.table-wrapper th.sort-asc')).toHaveCount(1);
    await expect(page.locator('.table-wrapper tbody tr').first()).toContainText('Bob');
    await preview.edit();
    await page.locator('.table-wrapper td', { hasText: 'Cy' }).click();
    await expect(designer(page)).toBeVisible();
    await expect(cell(page, 2, 0)).toBeFocused();
    await expect(cell(page, 2, 0)).toHaveValue('Cy');
  });

  test('clicking a header focuses that header cell', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Role', { header: true });
    await expect(cell(page, -1, 1)).toBeFocused();
  });

  test('an irregular table (row wider than the header) opens in the Markdown editor', async ({ preview }) => {
    await preview.open('# T\n\n| A |\n|---|\n| 1 | 2 |\n');
    await preview.edit();
    await preview.page.locator('.table-wrapper td').first().click();
    await expect(preview.editor()).toBeVisible();
    await expect(designer(preview.page)).toHaveCount(0);
    await expect(preview.editor().locator('.mdstyled-edit-textarea')).toBeVisible();
  });
});

test.describe('editing', () => {
  test('header and cells are editable and saved as a padded table', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ada');
    await cell(page, -1, 0).fill('Person');
    await cell(page, 0, 1).fill('Engineer');
    expect(await saveAndRead(preview)).toBe(
      '# T\n\n| Person | Role     |\n| ------ | -------- |\n| Ada    | Engineer |\n| Bob    | Ops      |' + AFTER);
  });

  test('Row adds a row at the bottom; Column adds a column on the right, header selected', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ada');
    await barButton(page, 'Row').click();
    await expect(bodyRows(page)).toHaveCount(3);
    await expect(cell(page, 2, 0)).toBeFocused();
    await cell(page, 2, 0).fill('Cy');
    await barButton(page, 'Column').click();
    await expect(headerCount(page)).toHaveCount(3);
    await expect(cell(page, -1, 2)).toBeFocused();
    await expect(cell(page, -1, 2)).toHaveValue('Column');
    await page.keyboard.type('Team'); // the default header text is selected
    await expect(designer(page).locator('.mdstyled-designer-count')).toHaveText('3 columns × 3 rows');
    expect(await saveAndRead(preview)).toBe(
      '# T\n\n| Name | Role | Team |\n| ---- | ---- | ---- |\n| Ada  | Eng  |      |\n| Bob  | Ops  |      |\n| Cy   |      |      |' + AFTER);
  });

  test('insert row below and at the top', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ada');
    await (await rowBtn(page, 0, 'Insert row below')).click();
    await expect(bodyRows(page)).toHaveCount(3);
    await expect(cell(page, 1, 0)).toBeFocused();
    await cell(page, 1, 0).fill('Mid');
    await designer(page).getByRole('button', { name: 'Insert row at the top' }).click();
    await expect(bodyRows(page)).toHaveCount(4);
    await cell(page, 0, 0).fill('First');
    expect(await saveAndRead(preview)).toBe(
      '# T\n\n| Name  | Role |\n| ----- | ---- |\n| First |      |\n| Ada   | Eng  |\n| Mid   |      |\n| Bob   | Ops  |' + AFTER);
  });

  test('insert column to the right of a column', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ada');
    await coltools(page, 0).getByRole('button', { name: 'Insert column to the right' }).click();
    await expect(headerCount(page)).toHaveCount(3);
    await expect(cell(page, -1, 1)).toBeFocused();
    await page.keyboard.type('Mid');
    expect(await saveAndRead(preview)).toBe(
      '# T\n\n| Name | Mid | Role |\n| ---- | --- | ---- |\n| Ada  |     | Eng  |\n| Bob  |     | Ops  |' + AFTER);
  });

  test('rows move up and down, columns left and right', async ({ preview }) => {
    const page = await openDesigner(preview, '# T\n\n| A | B | C |\n|---|---|---|\n| 1 | 2 | 3 |\n| 4 | 5 | 6 |\n| 7 | 8 | 9 |\n', '4');
    await expect((await rowBtn(page, 0, 'Move row up'))).toBeDisabled();
    await expect((await rowBtn(page, 2, 'Move row down'))).toBeDisabled();
    await (await rowBtn(page, 1, 'Move row up')).click();
    await expect(cell(page, 0, 0)).toHaveValue('4');
    await (await rowBtn(page, 0, 'Move row down')).click();
    await (await rowBtn(page, 1, 'Move row down')).click();
    await expect(cell(page, 2, 0)).toHaveValue('4');
    await expect(coltools(page, 0).getByRole('button', { name: 'Move column left' })).toBeDisabled();
    await expect(coltools(page, 2).getByRole('button', { name: 'Move column right' })).toBeDisabled();
    await coltools(page, 0).getByRole('button', { name: 'Move column right' }).click();
    await expect(cell(page, -1, 1)).toHaveValue('A');
    await coltools(page, 2).getByRole('button', { name: 'Move column left' }).click();
    await expect(cell(page, -1, 1)).toHaveValue('C');
    expect(await saveAndRead(preview)).toBe(
      '# T\n\n| B   | C   | A   |\n| --- | --- | --- |\n| 2   | 3   | 1   |\n| 8   | 9   | 7   |\n| 5   | 6   | 4   |\n');
  });

  test('delete a row and a column; the last column cannot be deleted', async ({ preview }) => {
    const page = await openDesigner(preview, '# T\n\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n', '3');
    await (await rowBtn(page, 0, 'Delete row')).click();
    await expect(bodyRows(page)).toHaveCount(1);
    await expect(cell(page, 0, 0)).toHaveValue('3');
    await coltools(page, 0).getByRole('button', { name: 'Delete column' }).click();
    await expect(headerCount(page)).toHaveCount(1);
    await expect(cell(page, -1, 0)).toHaveValue('B');
    await expect(coltools(page, 0).getByRole('button', { name: 'Delete column' })).toBeDisabled();
    await expect(designer(page).locator('.mdstyled-designer-count')).toHaveText('1 column × 1 row');
    expect(await saveAndRead(preview)).toBe('# T\n\n| B   |\n| --- |\n| 4   |\n');
  });

  test('alignment buttons set an alignment; the active one clears it', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ada');
    const right = coltools(page, 1).getByRole('button', { name: 'Align right' });
    await right.click();
    await expect(right).toHaveAttribute('aria-pressed', 'true');
    await expect(cell(page, 0, 1)).toHaveCSS('text-align', 'right');
    await coltools(page, 0).getByRole('button', { name: 'Align centre' }).click();
    await coltools(page, 0).getByRole('button', { name: 'Align left' }).click();
    await expect(cell(page, 0, 0)).toHaveCSS('text-align', 'left');
    await coltools(page, 0).getByRole('button', { name: 'Align centre' }).click();
    await expect(cell(page, 0, 0)).toHaveCSS('text-align', 'center');
    expect(await saveAndRead(preview)).toBe(
      '# T\n\n| Name | Role |\n| :--: | ---: |\n| Ada  | Eng  |\n| Bob  | Ops  |' + AFTER);
  });

  test('clicking the active alignment clears it', async ({ preview }) => {
    const page = await openDesigner(preview, '# T\n\n| A | B |\n|:-:|--:|\n| 1 | 2 |\n', '1');
    const centre = coltools(page, 0).getByRole('button', { name: 'Align centre' });
    await expect(centre).toHaveAttribute('aria-pressed', 'true');
    await centre.click();
    await expect(centre).toHaveAttribute('aria-pressed', 'false');
    await cell(page, 0, 1).fill('two');
    expect(await saveAndRead(preview)).toBe('# T\n\n| A   | B   |\n| --- | --: |\n| 1   | two |\n');
  });
});

test.describe('keyboard', () => {
  test('Enter moves down and adds a row at the end; Shift+Enter and arrows move up and down', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ada');
    await expect(cell(page, 0, 0)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(cell(page, 1, 0)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(bodyRows(page)).toHaveCount(3);
    await expect(cell(page, 2, 0)).toBeFocused();
    await page.keyboard.type('Cy');
    await page.keyboard.press('Shift+Enter');
    await expect(cell(page, 1, 0)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(cell(page, 0, 0)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(cell(page, -1, 0)).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(cell(page, -1, 0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(cell(page, 0, 0)).toBeFocused();
    // ArrowDown on the last row does not add a row
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(cell(page, 2, 0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(bodyRows(page)).toHaveCount(3);
    expect(await saveAndRead(preview)).toBe(
      '# T\n\n| Name | Role |\n| ---- | ---- |\n| Ada  | Eng  |\n| Bob  | Ops  |\n| Cy   |      |' + AFTER);
  });

  test('pasting tab-separated cells fills rows and grows columns', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Bob');
    await cell(page, 1, 0).focus();
    await cell(page, 1, 0).evaluate(input => {
      const data = new DataTransfer();
      data.setData('text/plain', 'Dee\tQA\tTest\tExtra\nEd\tPM\tProd\n');
      input.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    });
    // pasted at row 2, column 1: four wide, two tall, so two more columns and one more row
    await expect(headerCount(page)).toHaveCount(4);
    await expect(bodyRows(page)).toHaveCount(3);
    await expect(designer(page).locator('.mdstyled-designer-count')).toHaveText('4 columns × 3 rows');
    await expect(cell(page, 2, 3)).toBeFocused();
    await expect(cell(page, 1, 3)).toHaveValue('Extra');
    await expect(cell(page, 2, 2)).toHaveValue('Prod');
    expect(await saveAndRead(preview)).toBe([
      '# T', '',
      '| Name | Role | Column | Column |',
      '| ---- | ---- | ------ | ------ |',
      '| Ada  | Eng  |        |        |',
      '| Dee  | QA   | Test   | Extra  |',
      '| Ed   | PM   | Prod   |        |',
    ].join('\n') + AFTER);
  });
});

test.describe('round trips', () => {
  test('escaped pipes survive', async ({ preview }) => {
    const page = await openDesigner(preview, '# T\n\n| Name | Note |\n|---|---|\n| a \\| b | x |\n', 'a | b');
    await expect(cell(page, 0, 0)).toHaveValue('a | b');
    await cell(page, 0, 1).fill('y | z');
    expect(await saveAndRead(preview)).toBe('# T\n\n| Name   | Note   |\n| ------ | ------ |\n| a \\| b | y \\| z |\n');
  });

  test('a class comment above the table is kept', async ({ preview }) => {
    const page = await openDesigner(preview, '# T\n\n<!-- .compact -->\n| A | B |\n|---|---|\n| 1 | 2 |\n', '1');
    await cell(page, 0, 0).fill('one');
    expect(await saveAndRead(preview)).toBe('# T\n\n<!-- .compact -->\n| A   | B   |\n| --- | --- |\n| one | 2   |\n');
  });

  test('Markdown toggle shows the source and comes back to the designer', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ada');
    await cell(page, 0, 0).fill('Zed');
    await designer(page).getByRole('button', { name: 'Edit as Markdown' }).click();
    const ta = designer(page).locator('.mdstyled-edit-textarea');
    await expect(ta).toBeVisible();
    await expect(ta).toHaveValue('| Name | Role |\n| ---- | ---- |\n| Zed  | Eng  |\n| Bob  | Ops  |');
    await ta.fill('| Name | Role |\n| --- | --- |\n| Zed | Eng |\n| Bob | Ops |\n| Cy | QA |');
    await designer(page).getByRole('button', { name: 'Back to the table designer' }).click();
    await expect(ta).toBeHidden();
    await expect(bodyRows(page)).toHaveCount(3);
    await expect(cell(page, 2, 0)).toHaveValue('Cy');
    expect(await saveAndRead(preview)).toBe(
      '# T\n\n| Name | Role |\n| ---- | ---- |\n| Zed  | Eng  |\n| Bob  | Ops  |\n| Cy   | QA   |' + AFTER);
  });

  test('Markdown that is not a table keeps the user in Markdown with a message', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ada');
    await designer(page).getByRole('button', { name: 'Edit as Markdown' }).click();
    await designer(page).locator('.mdstyled-edit-textarea').fill('not a table');
    await designer(page).getByRole('button', { name: 'Back to the table designer' }).click();
    await expect(designer(page).locator('.mdstyled-edit-status.error')).toBeVisible();
    await expect(designer(page).locator('.mdstyled-edit-textarea')).toBeVisible();
  });
});

test.describe('closing', () => {
  test('saving without changes writes nothing and does not re-render', async ({ preview }) => {
    const src = '# T\n\n| Name |   Role |\n|---|---|\n| Ada | Eng |\n';
    const page = await openDesigner(preview, src, 'Ada');
    await saveButton(page).click();
    await expect(designer(page)).toHaveCount(0);
    // a wrongly scheduled re-render would reload the page within the harness' 300 ms debounce
    await expect(page.waitForEvent('load', { timeout: 800 })).rejects.toThrow();
    expect(preview.server.state.saves.length).toBe(0);
    expect(preview.server.state.renders).toBe(0);
    expect(preview.read()).toBe(src);
  });

  test('Esc cancels without writing', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ada');
    await cell(page, 0, 0).fill('Changed');
    await page.keyboard.press('Escape');
    await expect(designer(page)).toHaveCount(0);
    await expect(page.locator('.table-wrapper')).not.toHaveClass(/mdstyled-editable-hidden/);
    expect(preview.server.state.saves.length).toBe(0);
    expect(preview.read()).toBe(TABLE);
  });

  test('Delete needs two clicks and removes the table', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ada');
    const del = designer(page).getByRole('button', { name: 'Delete this table' });
    await del.click();
    await expect(del).toHaveText('Delete?');
    expect(preview.server.state.saves.length).toBe(0);
    await preview.rerender(() => del.click());
    expect(preview.read()).toBe('# T\n\nAfter.\n');
    await expect(page.locator('.table-wrapper')).toHaveCount(0);
  });

  test('another action disarms the Delete confirmation', async ({ preview }) => {
    const page = await openDesigner(preview, TABLE, 'Ada');
    const del = designer(page).getByRole('button', { name: 'Delete this table' });
    await del.click();
    await expect(del).toHaveText('Delete?');
    await cell(page, 0, 0).click();
    await page.keyboard.type('x');
    await expect(del).toHaveText('Delete');
  });
});

test.describe('scrolling', () => {
  test('the page does not scroll or jump when adding rows and columns', async ({ preview }) => {
    const filler = Array.from({ length: 40 }, (_, i) => `Filler paragraph ${i}.`).join('\n\n');
    const rows = Array.from({ length: 6 }, (_, i) => `| r${i} | v${i} |`).join('\n');
    const md = `# T\n\n${filler}\n\n| Name | Role |\n|---|---|\n${rows}\n\n${filler}\n`;
    await preview.open(md);
    await preview.edit();
    const page = preview.page;
    await page.locator('.table-wrapper td', { hasText: 'r3' }).scrollIntoViewIfNeeded();
    await page.locator('.table-wrapper td', { hasText: 'r3' }).click();
    await expect(designer(page)).toBeVisible();
    const scroll = () => page.evaluate(() => Math.round(window.scrollY));
    const top = () => designer(page).evaluate(el => Math.round(el.getBoundingClientRect().top));
    const y0 = await scroll();
    const t0 = await top();
    expect(y0).toBeGreaterThan(0);
    for (let i = 0; i < 3; i++) {
      await barButton(page, 'Row').click();
      await barButton(page, 'Column').click();
      await (await rowBtn(page, 2, 'Insert row below')).click();
    }
    await expect(bodyRows(page)).toHaveCount(12);
    await expect(headerCount(page)).toHaveCount(5);
    expect(await scroll()).toBe(y0);
    expect(await top()).toBe(t0);
  });
});
