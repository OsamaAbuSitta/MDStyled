// A reported bug: add a checklist, save, click it again to edit, and its items were
// duplicated. Driven exactly as a user does it, through the insert menu.
const { test, expect } = require('./fixtures');

test('a checklist inserted, saved, and opened again is not duplicated', async ({ preview, page }) => {
  await preview.open('# Tasks\n\nSome intro text.\n\nAfter the list.\n');
  await preview.edit();

  // insert a checklist after the intro, through the + menu
  const gap = page.locator('.mdstyled-root p', { hasText: 'Some intro text.' }).locator('xpath=following-sibling::div[contains(@class,"mdstyled-insert-line")][1]');
  await gap.hover();
  await gap.locator('.mdstyled-insert-plus').click();
  await preview.rerender(() => page.getByRole('menuitem', { name: 'Checklist' }).click());
  await expect(preview.editor()).toBeVisible();

  // add an item, save
  await preview.rich().getByText('Second task').click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Third task');
  await preview.save();
  expect(preview.read()).toBe('# Tasks\n\nSome intro text.\n\n- [ ] First task\n- [ ] Second task\n- [ ] Third task\n\nAfter the list.\n');

  // open it again: three items, once each
  await preview.openBlock('Second task');
  await expect(preview.rich().locator('li')).toHaveText(['First task', 'Second task', 'Third task']);
  await preview.save();
  expect(preview.read()).toBe('# Tasks\n\nSome intro text.\n\n- [ ] First task\n- [ ] Second task\n- [ ] Third task\n\nAfter the list.\n');

  // and once more, without changes in between
  await preview.openBlock('Third task');
  await expect(preview.rich().locator('li')).toHaveCount(3);
  // the rendered list is hidden behind the editor, not shown alongside it
  const visibleOutsideEditor = await page.evaluate(() => [...document.querySelectorAll('.mdstyled-root ul.contains-task-list')]
    .filter(ul => !ul.closest('.mdstyled-block-editor') && ul.offsetParent !== null).length);
  expect(visibleOutsideEditor).toBe(0);
});
