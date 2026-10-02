// Checkboxes in the rendered preview: a tick rewrites only that one marker in the file,
// the progress bar follows after the re-render, and nothing is tickable unless Edit is on.
const { test, expect } = require('./fixtures');

const boxes = page => page.locator('.mdstyled-root li input[type="checkbox"]');
const disabledStates = page => boxes(page).evaluateAll(list => list.map(b => b.disabled));

const DOC = [
  '# Release',
  '',
  'Intro text with [x] in it and a - [ ] that is not a task.',
  '',
  '- [ ] write code',
  '- [x] write tests',
  '- [ ] ship it',
  '',
  'Between the lists.',
  '',
  '* [ ] star item',
  '* [ ] second star',
  '',
  '1. [ ] numbered task',
  '2. [ ] another numbered',
  '',
  'The end.',
  '',
].join('\n');

test.describe('ticking in the preview (Edit on)', () => {
  test('ticks only that line: - [ ] becomes - [x]', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await preview.rerender(() => boxes(page).nth(0).click());
    expect(preview.read()).toBe(DOC.replace('- [ ] write code', '- [x] write code'));
    await expect(boxes(page).nth(0)).toBeChecked();
    await expect(preview.editor()).toHaveCount(0);
  });

  test('and back: - [x] becomes - [ ]', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await preview.rerender(() => boxes(page).nth(1).click());
    expect(preview.read()).toBe(DOC.replace('- [x] write tests', '- [ ] write tests'));
    await preview.rerender(() => boxes(page).nth(1).click());
    expect(preview.read()).toBe(DOC);
    await expect(boxes(page).nth(1)).toBeChecked();
  });

  test('ticks the right box in a later list, with the other marker styles untouched', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await preview.rerender(() => boxes(page).nth(4).click());       // "* [ ] second star"
    const afterStar = preview.read();
    expect(afterStar).toBe(DOC.replace('* [ ] second star', '* [x] second star'));

    await preview.rerender(() => boxes(page).nth(5).click());       // "1. [ ] numbered task"
    expect(preview.read()).toBe(afterStar.replace('1. [ ] numbered task', '1. [x] numbered task'));
  });

  test('a nested box keeps its indentation', async ({ preview, page }) => {
    const doc = '- [ ] parent\n  - [ ] child one\n  - [x] child two\n- [ ] sibling\n';
    await preview.open(doc);
    await preview.edit();
    await preview.rerender(() => boxes(page).nth(1).click());
    expect(preview.read()).toBe('- [ ] parent\n  - [x] child one\n  - [x] child two\n- [ ] sibling\n');
    await preview.rerender(() => boxes(page).nth(2).click());
    expect(preview.read()).toBe('- [ ] parent\n  - [x] child one\n  - [ ] child two\n- [ ] sibling\n');
  });

  test('a capital [X] is unticked to [ ]', async ({ preview, page }) => {
    await preview.open('- [X] shouting\n- [ ] quiet\n');
    await preview.edit();
    await preview.rerender(() => boxes(page).nth(0).click());
    expect(preview.read()).toBe('- [ ] shouting\n- [ ] quiet\n');
  });

  test('the rest of the line, other lines and the line endings are left alone', async ({ preview, page }) => {
    const doc = '# T\r\n\r\n- [ ] keep **bold** and `code` and a [link](https://example.com)  \r\n- [ ] two\r\n\r\nafter\r\n';
    await preview.open(doc);
    await preview.edit();
    await preview.rerender(() => boxes(page).nth(0).click());
    expect(preview.read()).toBe(doc.replace('- [ ] keep', '- [x] keep'));
  });

  test('a checklist at the end of a file with no trailing newline', async ({ preview, page }) => {
    await preview.open('# T\n\n- [ ] only\n- [ ] last');
    await preview.edit();
    await preview.rerender(() => boxes(page).nth(1).click());
    expect(preview.read()).toBe('# T\n\n- [ ] only\n- [x] last');
  });

  test('a loose checklist', async ({ preview, page }) => {
    await preview.open('- [ ] one\n\n- [ ] two\n\n- [ ] three\n');
    await preview.edit();
    await preview.rerender(() => boxes(page).nth(1).click());
    expect(preview.read()).toBe('- [ ] one\n\n- [x] two\n\n- [ ] three\n');
  });

  test('ticking does not open the block editor, and the page stays in edit mode', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await preview.rerender(() => boxes(page).nth(2).click());
    await expect(preview.editor()).toHaveCount(0);
    await expect(page.locator('body')).toHaveClass(/mdstyled-edit-mode/);
    await expect(page.locator('.mdstyled-edit-toggle')).toHaveAttribute('aria-pressed', 'true');
  });

  test('the progress bar text follows each tick after the re-render', async ({ preview, page }) => {
    await preview.open('- [ ] a\n- [x] b\n- [ ] c\n- [ ] d\n');
    await preview.edit();
    const label = page.locator('.task-progress-label');
    await expect(label).toHaveText('1 / 4 done');
    await preview.rerender(() => boxes(page).nth(0).click());
    await expect(label).toHaveText('2 / 4 done');
    await preview.rerender(() => boxes(page).nth(2).click());
    await expect(label).toHaveText('3 / 4 done');
    await preview.rerender(() => boxes(page).nth(3).click());
    await expect(label).toHaveText('4 / 4 done');
    await expect(page.locator('.task-progress-fill')).toHaveClass(/done/);
    await preview.rerender(() => boxes(page).nth(1).click());
    await expect(label).toHaveText('3 / 4 done');
    await expect(page.locator('.task-progress-fill')).not.toHaveClass(/done/);
    await expect(page.locator('.task-progress')).toHaveCount(1);
  });

  test('each list has its own progress bar', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await expect(page.locator('.task-progress-label')).toHaveText(['1 / 3 done', '0 / 2 done', '0 / 2 done']);
    await preview.rerender(() => boxes(page).nth(3).click());
    await expect(page.locator('.task-progress-label')).toHaveText(['1 / 3 done', '1 / 2 done', '0 / 2 done']);
  });
});

test.describe('checkboxes outside edit mode', () => {
  test('are disabled when the page opens, and say why', async ({ preview, page }) => {
    await preview.open(DOC);
    await page.evaluate(() => window.sessionStorage.clear());
    await page.reload();
    await page.locator('.mdstyled-root').waitFor();
    await expect(page.locator('body')).not.toHaveClass(/mdstyled-edit-mode/);
    expect(await disabledStates(page)).toEqual(Array(await boxes(page).count()).fill(true));
    await expect(boxes(page).first()).toHaveAttribute('title', 'Turn on Edit to change this');
  });

  test('cannot be ticked, even by force', async ({ preview, page }) => {
    await preview.open(DOC);
    await page.evaluate(() => window.sessionStorage.clear());
    await page.reload();
    await page.locator('.mdstyled-root').waitFor();
    await boxes(page).first().click({ force: true });
    await expect(boxes(page).first()).not.toBeChecked();
    expect(preview.read()).toBe(DOC);
    expect(preview.server.state.saves).toHaveLength(0);
  });

  test('turning Edit on makes them tickable, turning it off locks them again', async ({ preview, page }) => {
    await preview.open(DOC);
    await page.evaluate(() => window.sessionStorage.clear());
    await page.reload();
    await page.locator('.mdstyled-root').waitFor();
    const count = await boxes(page).count();

    await preview.edit();
    expect(await disabledStates(page)).toEqual(Array(count).fill(false));
    await expect(boxes(page).first()).toHaveAttribute('title', 'Tick to update the Markdown file');

    await page.locator('.mdstyled-edit-toggle').click();
    await expect(page.locator('body')).not.toHaveClass(/mdstyled-edit-mode/);
    expect(await disabledStates(page)).toEqual(Array(count).fill(true));
    await boxes(page).first().click({ force: true });
    expect(preview.read()).toBe(DOC);
  });

  test('stay tickable after a re-render while Edit is still on', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await preview.rerender(() => boxes(page).nth(0).click());
    expect(await disabledStates(page)).toEqual(Array(await boxes(page).count()).fill(false));
  });
});

test.describe('read-only preview (editing turned off)', () => {
  test('has no Edit button and leaves every checkbox disabled', async ({ preview, page }) => {
    await preview.open(DOC, { editing: false });
    await expect(page.locator('.mdstyled-edit-toggle')).toHaveCount(0);
    expect(await disabledStates(page)).toEqual(Array(await boxes(page).count()).fill(true));
  });

  test('ticking by force changes nothing in the file', async ({ preview, page }) => {
    await preview.open(DOC, { editing: false });
    await boxes(page).first().click({ force: true });
    await expect(boxes(page).first()).not.toBeChecked();
    expect(preview.read()).toBe(DOC);
    expect(preview.server.state.saves).toHaveLength(0);
  });

  test('blocks cannot be opened for editing either', async ({ preview, page }) => {
    await preview.open(DOC, { editing: false });
    await page.getByText('write tests').click();
    await expect(page.locator('.mdstyled-block-editor')).toHaveCount(0);
  });
});
