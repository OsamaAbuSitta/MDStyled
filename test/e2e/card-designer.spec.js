// The card designer, for both card syntaxes: a `<div class="mdstyled-cards cols-N">`
// wrapper around `<!-- .card -->` quotes, and a `<!-- .cards -->` list.
const { test, expect } = require('./fixtures');

/** A card-grid document; `cards` are [title, body] pairs. */
const grid = (cols, cards, { before = '# Title\n\n', after = '' } = {}) =>
  before + `<div class="mdstyled-cards cols-${cols}">\n\n` +
  cards.map(([t, b]) => `<!-- .card -->\n> ### ${t}\n>\n> ${b}\n\n`).join('') + '</div>\n' + after;

const TWO = [['First card', 'One.'], ['Second card', 'Two.']];
const THREE = [['A', 'a.'], ['B', 'b.'], ['C', 'c.']];
const LIST = '# T\n\n<!-- .cards -->\n- **Alpha**\n\n  First body.\n\n- **Beta**\n\n  Second body.\n  More.\n\nAfter.\n';

const designer = page => page.locator('.mdstyled-card-designer');
const tiles = page => designer(page).locator('.mdstyled-designer-card');
const titleOf = (page, i) => tiles(page).nth(i).locator('.mdstyled-designer-title-input');
const bodyOf = (page, i) => tiles(page).nth(i).locator('.mdstyled-designer-body');
const tileBtn = (page, i, label) => tiles(page).nth(i).getByRole('button', { name: label, exact: true });
const colBtn = (page, label) => designer(page).locator('.mdstyled-col-btn', { hasText: new RegExp(`^${label}$`) });
const rowsLess = page => designer(page).getByRole('button', { name: 'Remove the last row' });
const rowsMore = page => designer(page).getByRole('button', { name: 'Add a row of cards' });
const rowValue = page => designer(page).locator('.mdstyled-stepper-value');
const count = page => designer(page).locator('.mdstyled-designer-count');
const addTile = page => designer(page).locator('.mdstyled-designer-add');

async function openGrid(preview, md, clickText, selector = '.mdstyled-cards > .card') {
  await preview.open(md);
  await preview.edit();
  await preview.page.locator(selector, { hasText: clickText }).first().click();
  await expect(designer(preview.page)).toBeVisible();
  return preview.page;
}

async function saveAndRead(preview) {
  await preview.save();
  return preview.read();
}

test.describe('card grid', () => {
  test('clicking any card opens the designer on the whole grid, focused on that card', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO), 'Second card');
    await expect(page.locator('.mdstyled-cards')).toHaveClass(/mdstyled-editable-hidden/);
    await expect(tiles(page)).toHaveCount(2);
    await expect(count(page)).toHaveText('2 cards');
    await expect(titleOf(page, 0)).toHaveValue('First card');
    await expect(bodyOf(page, 1)).toHaveValue('Two.');
    await expect(titleOf(page, 1)).toBeFocused();
    await expect(page.locator('.mdstyled-cards:visible')).toHaveCount(0);
  });

  test('clicking the first card focuses the first card', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO), 'First card');
    await expect(titleOf(page, 0)).toBeFocused();
  });

  test('editing header and content is written back', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO), 'First card');
    await titleOf(page, 0).fill('Renamed');
    await bodyOf(page, 0).fill('Line one\n\nLine two');
    expect(await saveAndRead(preview)).toBe([
      '# Title', '',
      '<div class="mdstyled-cards cols-2">', '',
      '<!-- .card -->', '> ### Renamed', '>', '> Line one', '>', '> Line two', '',
      '<!-- .card -->', '> ### Second card', '>', '> Two.', '',
      '</div>', '',
    ].join('\n'));
  });

  test('Enter in a header moves to its content', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO), 'First card');
    await page.keyboard.press('Enter');
    await expect(bodyOf(page, 0)).toBeFocused();
  });

  test('the Add card tile appends a card', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO), 'First card');
    await addTile(page).click();
    await expect(tiles(page)).toHaveCount(3);
    await expect(count(page)).toHaveText('3 cards');
    await expect(titleOf(page, 2)).toBeFocused();
    await expect(rowValue(page)).toHaveText('2');
    expect(await saveAndRead(preview)).toBe(grid(2, [...TWO, ['New card', 'What this card is about.']]));
  });

  test('duplicate copies a card right after itself', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO), 'First card');
    await tileBtn(page, 0, 'Duplicate card').click();
    await expect(tiles(page)).toHaveCount(3);
    await expect(titleOf(page, 1)).toHaveValue('First card');
    await expect(titleOf(page, 1)).toBeFocused();
    expect(await saveAndRead(preview)).toBe(grid(2, [TWO[0], TWO[0], TWO[1]]));
  });

  test('remove takes a card out and is disabled on the last one', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO), 'First card');
    await expect(tileBtn(page, 0, 'Remove card')).toBeEnabled();
    await tileBtn(page, 0, 'Remove card').click();
    await expect(tiles(page)).toHaveCount(1);
    await expect(count(page)).toHaveText('1 card');
    await expect(titleOf(page, 0)).toHaveValue('Second card');
    await expect(tileBtn(page, 0, 'Remove card')).toBeDisabled();
    expect(await saveAndRead(preview)).toBe(grid(2, [TWO[1]]));
  });

  test('move earlier and later reorder the cards; the ends are disabled', async ({ preview }) => {
    const page = await openGrid(preview, grid(3, THREE), 'C');
    await expect(tileBtn(page, 0, 'Move earlier')).toBeDisabled();
    await expect(tileBtn(page, 2, 'Move later')).toBeDisabled();
    await tileBtn(page, 2, 'Move earlier').click();
    await expect(titleOf(page, 1)).toHaveValue('C');
    await tileBtn(page, 0, 'Move later').click();
    await expect(titleOf(page, 1)).toHaveValue('A');
    expect(await saveAndRead(preview)).toBe(grid(3, [THREE[2], THREE[0], THREE[1]]));
  });

  test('dragging a card by its grip reorders', async ({ preview }) => {
    const page = await openGrid(preview, grid(3, THREE), 'A');
    await tiles(page).nth(0).locator('.mdstyled-designer-grip').dragTo(tiles(page).nth(2));
    await expect(titleOf(page, 0)).toHaveValue('B');
    await expect(titleOf(page, 1)).toHaveValue('C');
    await expect(titleOf(page, 2)).toHaveValue('A');
    expect(await saveAndRead(preview)).toBe(grid(3, [THREE[1], THREE[2], THREE[0]]));
  });

  test('dragging by the text fields does not start a drag', async ({ preview }) => {
    const page = await openGrid(preview, grid(3, THREE), 'A');
    await titleOf(page, 0).dragTo(tiles(page).nth(2));
    await expect(titleOf(page, 0)).toHaveValue('A');
    await expect(titleOf(page, 2)).toHaveValue('C');
  });

  test('columns 1 to 4 are offered, the current one is marked, and each is written', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO), 'First card');
    await expect(designer(page).locator('.mdstyled-col-btn')).toHaveText(['1', '2', '3', '4']);
    await expect(colBtn(page, '2')).toHaveClass(/active/);
    await colBtn(page, '3').click();
    await expect(colBtn(page, '3')).toHaveClass(/active/);
    await expect(colBtn(page, '2')).not.toHaveClass(/active/);
    await expect(designer(page).locator('.mdstyled-designer-grid')).toHaveCSS('grid-template-columns', /^(\d+(\.\d+)?px ){2}\d+(\.\d+)?px$/);
    expect(await saveAndRead(preview)).toBe(grid(3, TWO));
  });

  for (const n of [1, 4]) {
    test(`columns: ${n}`, async ({ preview }) => {
      const page = await openGrid(preview, grid(2, TWO), 'First card');
      await colBtn(page, String(n)).click();
      expect(await saveAndRead(preview)).toBe(grid(n, TWO));
    });
  }

  test('the Rows stepper adds and removes whole rows', async ({ preview }) => {
    const page = await openGrid(preview, grid(3, THREE), 'A');
    await expect(rowValue(page)).toHaveText('1');
    await expect(rowsLess(page)).toBeDisabled();
    await rowsMore(page).click();
    await expect(tiles(page)).toHaveCount(6);
    await expect(rowValue(page)).toHaveText('2');
    await rowsMore(page).click();
    await expect(tiles(page)).toHaveCount(9);
    await rowsLess(page).click();
    await expect(tiles(page)).toHaveCount(6);
    await expect(rowValue(page)).toHaveText('2');
    expect(await saveAndRead(preview)).toBe(
      grid(3, [...THREE, ['New card', 'What this card is about.'], ['New card', 'What this card is about.'], ['New card', 'What this card is about.']]));
  });

  test('removing a row trims from the end', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, [...TWO, ...THREE.slice(0, 2)]), 'First card');
    await expect(rowValue(page)).toHaveText('2');
    await rowsLess(page).click();
    await expect(tiles(page)).toHaveCount(2);
    expect(await saveAndRead(preview)).toBe(grid(2, TWO));
  });

  test('the Markdown toggle shows the source and comes back with every card', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO), 'First card');
    await colBtn(page, '3').click();
    await designer(page).getByRole('button', { name: 'Edit as Markdown' }).click();
    const ta = designer(page).locator('.mdstyled-edit-textarea');
    await expect(ta).toBeVisible();
    await expect(ta).toHaveValue(grid(3, TWO, { before: '' }).replace(/\n$/, ''));
    await expect(designer(page).locator('.mdstyled-designer-grid')).toBeHidden();
    await ta.fill(grid(3, [...TWO, ['Third card', 'Three.']], { before: '' }).replace(/\n$/, ''));
    await designer(page).getByRole('button', { name: 'Back to the card designer' }).click();
    await expect(tiles(page)).toHaveCount(3);
    await expect(titleOf(page, 2)).toHaveValue('Third card');
    expect(await saveAndRead(preview)).toBe(grid(3, [...TWO, ['Third card', 'Three.']]));
  });

  test('Esc cancels without writing', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO), 'First card');
    await titleOf(page, 0).fill('Changed');
    await page.keyboard.press('Escape');
    await expect(designer(page)).toHaveCount(0);
    await expect(page.locator('.mdstyled-cards')).not.toHaveClass(/mdstyled-editable-hidden/);
    expect(preview.server.state.saves.length).toBe(0);
    expect(preview.read()).toBe(grid(2, TWO));
  });

  test('saving without changes writes nothing', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO), 'First card');
    await designer(page).getByRole('button', { name: 'Save', exact: true }).click();
    await expect(designer(page)).toHaveCount(0);
    await expect(page.waitForEvent('load', { timeout: 800 })).rejects.toThrow();
    expect(preview.server.state.saves.length).toBe(0);
  });

  test('Delete needs two clicks and removes the whole grid', async ({ preview }) => {
    const page = await openGrid(preview, grid(2, TWO, { after: '\nAfter.\n' }), 'First card');
    const del = designer(page).getByRole('button', { name: 'Delete all of these cards' });
    await del.click();
    await expect(del).toHaveText('Delete?');
    expect(preview.server.state.saves.length).toBe(0);
    await preview.rerender(() => del.click());
    expect(preview.read()).toBe('# Title\n\nAfter.\n');
    await expect(page.locator('.mdstyled-cards')).toHaveCount(0);
  });

  const LONE = '# T\n\n<!-- .card -->\n> ### Lone card\n>\n> Body.\n';
  const LONE_GRID = grid(2, [['Lone card', 'Body.'], ['New card', 'What this card is about.']], { before: '# T\n\n' });

  test('a lone card opens the normal editor with Add card, and Add card writes a 2-column grid', async ({ preview }) => {
    await preview.open(LONE);
    await preview.edit();
    await preview.page.locator('blockquote.card').click();
    await expect(preview.editor()).toBeVisible();
    await expect(designer(preview.page)).toHaveCount(0);
    await expect(preview.editor().locator('.mdstyled-card-count')).toHaveText('Single card');
    await expect(preview.editor().locator('.mdstyled-col-group')).toHaveCount(0);
    await preview.editor().getByRole('button', { name: 'Add card' }).click();
    await expect.poll(() => preview.read()).toBe(LONE_GRID);
  });

  // PRODUCT BUG: "Add card" on a lone card saves the grid (the file is correct, see the test
  // above) but never closes the block editor (editor.js addCard(), ~line 997, only calls
  // api.saveBlock(...).catch(reportError)). The webview keeps reporting editorState open, so
  // the provider defers the re-render ("Never replace the page under someone who is
  // mid-edit") and the page stays on the stale single-card editor: the designer never
  // opens on the new grid until the user closes the editor by hand.
  test.fixme('Add card on a lone card re-renders and opens the designer on the new 2-column grid', async ({ preview }) => {
    await preview.open(LONE);
    await preview.edit();
    await preview.page.locator('blockquote.card').click();
    await preview.rerender(() => preview.editor().getByRole('button', { name: 'Add card' }).click());
    await expect(designer(preview.page)).toBeVisible();
    await expect(tiles(preview.page)).toHaveCount(2);
    await expect(colBtn(preview.page, '2')).toHaveClass(/active/);
    expect(preview.read()).toBe(LONE_GRID);
  });

  test('inserting Cards from the + menu creates a 3-column grid and opens the designer', async ({ preview }) => {
    const page = preview.page;
    await preview.open('# T\n\nIntro text.\n\nAfter.\n');
    await preview.edit();
    const gap = page.locator('.mdstyled-root p', { hasText: 'Intro text.' }).locator('xpath=following-sibling::div[contains(@class,"mdstyled-insert-line")][1]');
    await gap.hover();
    await gap.locator('.mdstyled-insert-plus').click();
    await preview.rerender(() => page.getByRole('menuitem', { name: 'Cards' }).click());
    await expect(designer(page)).toBeVisible();
    await expect(tiles(page)).toHaveCount(3);
    await expect(colBtn(page, '3')).toHaveClass(/active/);
    const card = n => `<!-- .card -->\n> ### ${n} card\n>\n> What this card is about.\n\n`;
    expect(preview.read()).toBe('# T\n\nIntro text.\n\n<div class="mdstyled-cards cols-3">\n\n' + card('First') + card('Second') + card('Third') + '</div>\n\nAfter.\n');
  });

  test('in edit mode a 3-column grid of 3 cards lays out on one row', async ({ preview }) => {
    await preview.open(grid(3, THREE));
    await preview.edit();
    const cards = preview.page.locator('.mdstyled-cards > .card');
    await expect(cards).toHaveCount(3);
    await expect.poll(async () => {
      const tops = await cards.evaluateAll(list => list.map(c => Math.round(c.getBoundingClientRect().top)));
      return new Set(tops).size;
    }).toBe(1);
    const lefts = await cards.evaluateAll(list => list.map(c => Math.round(c.getBoundingClientRect().left)));
    expect(lefts[0]).toBeLessThan(lefts[1]);
    expect(lefts[1]).toBeLessThan(lefts[2]);
  });

  // PRODUCT BUG: with the page scrolled to its very end, picking a column count that makes the
  // designer shorter (3 -> 4 columns on 6 cards) shrinks the document below scrollY + viewport,
  // so the browser clamps scrollY (1622 -> 1490) and the designer jumps down on screen
  // (top 276 -> 408). render() only holds the canvas height while the tiles are rebuilt
  // (canvas.style.minHeight is cleared again at its end), so a lasting height change is not
  // compensated near the end of the document.
  test.fixme('the page does not jump when switching columns near the end of the document', async ({ preview }) => {
    const filler = Array.from({ length: 50 }, (_, i) => `Filler paragraph ${i}.`).join('\n\n');
    const cards = [...THREE, ['D', 'd.'], ['E', 'e.'], ['F', 'f.']];
    const page = await openGrid(preview, grid(3, cards, { before: `# T\n\n${filler}\n\n` }), 'A');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const top = () => designer(page).evaluate(el => Math.round(el.getBoundingClientRect().top));
    const scroll = () => page.evaluate(() => Math.round(window.scrollY));
    const bar = designer(page).locator('.mdstyled-designer-bar');
    await expect(bar).toBeInViewport();
    const t0 = await top();
    const y0 = await scroll();
    for (const n of ['4', '2', '1', '3']) {
      await colBtn(page, n).click();
      await expect(colBtn(page, n)).toHaveClass(/active/);
      expect(await top(), `designer top after ${n} columns`).toBe(t0);
      expect(await scroll(), `scrollY after ${n} columns`).toBe(y0);
    }
  });
});

test.describe('cards list', () => {
  test('a .cards list opens the designer focused on the clicked item', async ({ preview }) => {
    const page = await openGrid(preview, LIST, 'Beta', 'ul.cards > li');
    await expect(tiles(page)).toHaveCount(2);
    await expect(titleOf(page, 1)).toHaveValue('Beta');
    await expect(bodyOf(page, 1)).toHaveValue('Second body.\nMore.');
    await expect(titleOf(page, 1)).toBeFocused();
    await expect(page.locator('ul.cards:visible')).toHaveCount(0);
  });

  test('Auto columns are offered and active; rows are disabled', async ({ preview }) => {
    const page = await openGrid(preview, LIST, 'Alpha', 'ul.cards > li');
    await expect(designer(page).locator('.mdstyled-col-btn')).toHaveText(['Auto', '1', '2', '3', '4']);
    await expect(colBtn(page, 'Auto')).toHaveClass(/active/);
    await expect(rowsMore(page)).toBeDisabled();
    await expect(rowsLess(page)).toBeDisabled();
    await expect(rowValue(page)).toHaveText('-');
  });

  test('columns write a cols class; Add card appends an item', async ({ preview }) => {
    const page = await openGrid(preview, LIST, 'Beta', 'ul.cards > li');
    await colBtn(page, '2').click();
    await expect(rowsMore(page)).toBeEnabled();
    await addTile(page).click();
    await expect(tiles(page)).toHaveCount(3);
    await titleOf(page, 2).fill('Gamma');
    expect(await saveAndRead(preview)).toBe([
      '# T', '',
      '<!-- .cards .cols-2 -->',
      '- **Alpha**', '', '  First body.', '',
      '- **Beta**', '', '  Second body.', '  More.', '',
      '- **Gamma**', '', '  What this card is about.', '',
      'After.', '',
    ].join('\n'));
  });

  test('the Rows stepper works once a column count is picked', async ({ preview }) => {
    const page = await openGrid(preview, LIST, 'Beta', 'ul.cards > li');
    await colBtn(page, '2').click();
    await expect(rowValue(page)).toHaveText('1');
    await rowsMore(page).click();
    await expect(tiles(page)).toHaveCount(4);
    await expect(rowValue(page)).toHaveText('2');
    await rowsLess(page).click();
    await expect(tiles(page)).toHaveCount(2);
  });

  test('back to Auto drops the cols class', async ({ preview }) => {
    const page = await openGrid(preview, LIST.replace('<!-- .cards -->', '<!-- .cards .cols-3 -->'), 'Alpha', 'ul.cards > li');
    await expect(colBtn(page, '3')).toHaveClass(/active/);
    await colBtn(page, 'Auto').click();
    await titleOf(page, 0).fill('Alpha!');
    expect(await saveAndRead(preview)).toBe(LIST.replace('**Alpha**', '**Alpha!**'));
  });

  test('duplicate, move and remove work on list items', async ({ preview }) => {
    const page = await openGrid(preview, LIST, 'Alpha', 'ul.cards > li');
    await tileBtn(page, 0, 'Duplicate card').click();
    await expect(tiles(page)).toHaveCount(3);
    await tileBtn(page, 2, 'Move earlier').click();
    await expect(titleOf(page, 1)).toHaveValue('Beta');
    await expect(titleOf(page, 2)).toHaveValue('Alpha');
    await tileBtn(page, 0, 'Remove card').click();
    await expect(tiles(page)).toHaveCount(2);
    expect(await saveAndRead(preview)).toBe([
      '# T', '',
      '<!-- .cards -->',
      '- **Beta**', '', '  Second body.', '  More.', '',
      '- **Alpha**', '', '  First body.', '',
      'After.', '',
    ].join('\n'));
  });

  test('dragging by the grip reorders list items', async ({ preview }) => {
    const page = await openGrid(preview, LIST, 'Alpha', 'ul.cards > li');
    await tiles(page).nth(0).locator('.mdstyled-designer-grip').dragTo(tiles(page).nth(1));
    await expect(titleOf(page, 0)).toHaveValue('Beta');
    expect(await saveAndRead(preview)).toBe([
      '# T', '',
      '<!-- .cards -->',
      '- **Beta**', '', '  Second body.', '  More.', '',
      '- **Alpha**', '', '  First body.', '',
      'After.', '',
    ].join('\n'));
  });

  test('Markdown toggle round trip, Esc, and Delete', async ({ preview }) => {
    const page = await openGrid(preview, LIST, 'Alpha', 'ul.cards > li');
    await designer(page).getByRole('button', { name: 'Edit as Markdown' }).click();
    const ta = designer(page).locator('.mdstyled-edit-textarea');
    await expect(ta).toHaveValue('<!-- .cards -->\n- **Alpha**\n\n  First body.\n\n- **Beta**\n\n  Second body.\n  More.');
    await designer(page).getByRole('button', { name: 'Back to the card designer' }).click();
    await expect(tiles(page)).toHaveCount(2);
    await page.keyboard.press('Escape');
    await expect(designer(page)).toHaveCount(0);
    expect(preview.server.state.saves.length).toBe(0);

    await page.locator('ul.cards > li', { hasText: 'Beta' }).click();
    const del = designer(page).getByRole('button', { name: 'Delete all of these cards' });
    await del.click();
    await preview.rerender(() => del.click());
    expect(preview.read()).toBe('# T\n\nAfter.\n');
  });
});
