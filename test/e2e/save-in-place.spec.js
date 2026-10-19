// Saving from the preview patches the edited block in place - like any editor, the page
// does not reload and the reader stays exactly where they were.
const { test, expect } = require('./fixtures');

const FILLER = Array.from({ length: 40 }, (_, i) => `Filler paragraph ${i + 1}.`).join('\n\n');
const DOC = `# Long doc\n\n${FILLER}\n\n| Name | Role |\n|---|---|\n| Ada | Eng |\n\nTarget paragraph.\n\n- [ ] a task\n\nLast paragraph.\n`;

/** Fails the test if the page reloads while `action` runs. */
async function withoutReload(page, action) {
  let reloaded = false;
  const onLoad = () => { reloaded = true; };
  page.on('load', onLoad);
  await action();
  page.off('load', onLoad);
  expect(reloaded).toBe(false);
}

async function scrollTo(page, locator) {
  await locator.evaluate(node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
  return page.evaluate(() => window.scrollY);
}

test.describe('saving without a reload', () => {
  test('a table edit is patched in and the page does not move', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    const y = await scrollTo(page, page.locator('.table-wrapper td', { hasText: 'Ada' }));
    expect(y).toBeGreaterThan(500);

    await page.locator('.table-wrapper td', { hasText: 'Ada' }).click();
    const designer = page.locator('.mdstyled-table-designer');
    await expect(designer).toBeVisible();
    await designer.locator('input[data-row="0"][data-col="0"]').fill('Grace');

    await withoutReload(page, () => preview.rerender(() =>
      designer.getByRole('button', { name: 'Save', exact: true }).click()));

    await expect(page.locator('.table-wrapper td', { hasText: 'Grace' })).toBeVisible();
    expect(preview.read()).toContain('| Grace');
    expect(preview.server.state.patches).toBe(1);
    expect(preview.server.state.renders).toBe(0);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - y)).toBeLessThanOrEqual(1);
    // still interactive: the patched table got its search box
    await expect(page.locator('.table-interactive-controls')).toHaveCount(1);
  });

  test('a paragraph edit keeps the blocks after it editable at their new lines', async ({ preview, page }) => {
    await preview.open(DOC);
    const y = await scrollTo(page, page.locator('p', { hasText: 'Target paragraph' }));

    await preview.openText('Target paragraph');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('Target paragraph.');
    await page.keyboard.press('Shift+Enter');
    await page.keyboard.type('Second line.');
    await withoutReload(page, () => preview.save());

    expect(preview.read()).toContain('Target paragraph.\\\nSecond line.\n');
    expect(preview.server.state.renders).toBe(0);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - y)).toBeLessThanOrEqual(1);

    // A later block now sits one line further down; editing it must hit the right lines.
    await preview.openText('Last paragraph');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('Last paragraph. Edited');
    await withoutReload(page, () => preview.save());
    expect(preview.read()).toMatch(/Last paragraph\. Edited\n$/);
    expect(preview.server.state.patches).toBe(2);
  });

  test('ticking a task is patched in', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    await withoutReload(page, () => preview.rerender(() =>
      page.locator('.mdstyled-root input[type="checkbox"]').first().check()));
    expect(preview.read()).toContain('- [x] a task');
    expect(preview.server.state.renders).toBe(0);
    await expect(page.locator('.mdstyled-root input[type="checkbox"]').first()).toBeChecked();
  });

  test('a heading edit, which reshapes the sections, still re-renders', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.openText('Long doc');
    await page.keyboard.press('ControlOrMeta+A');
    await page.keyboard.type('Long doc renamed');
    await preview.save();
    expect(preview.read()).toMatch(/^# Long doc renamed\n/);
    await expect(page.locator('h1', { hasText: 'Long doc renamed' })).toBeVisible();
    await expect.poll(() => preview.server.state.renders).toBeGreaterThan(0);
  });
});
