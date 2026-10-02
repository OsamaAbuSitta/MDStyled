// The + insert line between blocks: where it appears, what each menu item writes, where
// it lands, and that the new block opens for editing.
const { test, expect } = require('./fixtures');

const DOC = '# Title\n\nAlpha paragraph.\n\nBeta paragraph.\n';

const lines = page => page.locator('.mdstyled-root .mdstyled-insert-line');
const menu = page => page.locator('.mdstyled-insert-menu');

/** Hovers insert line `index` and clicks its +, leaving the menu open. */
async function openMenu(preview, page, index) {
  await preview.edit();
  const line = lines(page).nth(index);
  await line.scrollIntoViewIfNeeded();
  await line.hover();
  await line.locator('.mdstyled-insert-plus').click();
  await expect(menu(page)).toBeVisible();
}

/** Inserts `label` at insert line `index` and waits for the re-render. */
async function insert(preview, page, index, label) {
  await openMenu(preview, page, index);
  await preview.rerender(() => menu(page).getByRole('menuitem', { name: label, exact: true }).click());
}

// Gap indexes in DOC: 0 above "Title", 1 after it, 2 after Alpha, 3 after Beta (the end).
const ITEMS = [
  ['Text', 'Write something.'],
  ['Heading 1', '# Heading'],
  ['Heading 2', '## Heading'],
  ['Heading 3', '### Heading'],
  ['Bullet list', '- First item\n- Second item'],
  ['Numbered list', '1. First item\n2. Second item'],
  ['Checklist', '- [ ] First task\n- [ ] Second task'],
  ['Note', '<!-- .note -->\n> **Note** - something worth knowing.'],
  ['Success', '<!-- .success -->\n> **Done** - this worked.'],
  ['Warning', '<!-- .warning -->\n> **Careful** - read this first.'],
  ['Danger', '<!-- .danger -->\n> **Stop** - this will break something.'],
  ['Quote', '> Quoted text'],
  ['Cards', [
    '<div class="mdstyled-cards cols-3">', '',
    '<!-- .card -->', '> ### First card', '>', '> What this card is about.', '',
    '<!-- .card -->', '> ### Second card', '>', '> What this card is about.', '',
    '<!-- .card -->', '> ### Third card', '>', '> What this card is about.', '',
    '</div>',
  ].join('\n')],
  ['Code block', '```js\nconsole.log("hello");\n```'],
  ['Table', '| Column | Column |\n| --- | --- |\n| Cell | Cell |'],
  ['Divider', '---'],
];

test.describe('insert lines', () => {
  test('there is one per gap: above the first block, between blocks and below the last', async ({ preview, page }) => {
    await preview.open(DOC);
    const blocks = await page.locator('.mdstyled-root .mdstyled-editable').count();
    await expect(lines(page)).toHaveCount(blocks + 1);
    await expect(lines(page).first().locator('xpath=following-sibling::*[1]')).toHaveText('Title');
    await expect(lines(page).last().locator('xpath=preceding-sibling::*[1]')).toHaveText('Beta paragraph.');
    for (const line of await lines(page).all()) {
      await expect(line.locator('.mdstyled-insert-plus svg.mdstyled-icon')).toHaveCount(1);
    }
  });

  test('the + is hidden until hovered, and does not move the document', async ({ preview, page }) => {
    await preview.open(DOC);
    await preview.edit();
    const beta = page.locator('.mdstyled-root p', { hasText: 'Beta paragraph.' });
    const before = (await beta.boundingBox()).y;
    const line = lines(page).nth(2);
    const plus = line.locator('.mdstyled-insert-plus');
    await expect(plus).toHaveCSS('opacity', '0');
    await line.hover();
    await expect(plus).not.toHaveCSS('opacity', '0');
    expect((await beta.boundingBox()).y).toBe(before);
  });

  test('insert lines are not shown outside edit mode', async ({ preview, page }) => {
    await preview.open(DOC);
    await expect(lines(page).first()).toBeHidden();
    await preview.edit();
    await lines(page).first().hover();
    await expect(lines(page).first().locator('.mdstyled-insert-plus')).toBeVisible();
  });

  test('the menu is grouped and lists every item with an icon', async ({ preview, page }) => {
    await preview.open(DOC);
    await openMenu(preview, page, 1);
    await expect(menu(page).locator('.mdstyled-insert-title')).toHaveText(['Text', 'Lists', 'Callouts', 'Blocks']);
    const names = await menu(page).locator('.mdstyled-insert-item').evaluateAll(nodes => nodes.map(n => n.getAttribute('aria-label')));
    expect(names).toEqual(ITEMS.map(([label]) => label));
    const withIcons = await menu(page).locator('.mdstyled-insert-item').evaluateAll(
      nodes => nodes.filter(n => n.querySelector('svg, .mdstyled-tool-glyph')).length);
    expect(withIcons).toBe(ITEMS.length);
  });

  test('the menu has exactly one card entry, named "Cards"', async ({ preview, page }) => {
    await preview.open(DOC);
    await openMenu(preview, page, 1);
    const cards = await menu(page).locator('.mdstyled-insert-item').evaluateAll(
      nodes => nodes.map(n => n.getAttribute('aria-label')).filter(l => /card/i.test(l)));
    expect(cards).toEqual(['Cards']);
  });

  test('the menu closes on an outside click and on picking an item', async ({ preview, page }) => {
    await preview.open(DOC);
    await openMenu(preview, page, 1);
    await page.locator('.mdstyled-root h1').click();
    await expect(menu(page)).toBeHidden();
    await expect(preview.editor()).toHaveCount(1);
  });

  test('opening the menu does not write anything', async ({ preview, page }) => {
    await preview.open(DOC);
    await openMenu(preview, page, 2);
    await page.locator('body').click({ position: { x: 5, y: 500 } });
    expect(preview.read()).toBe(DOC);
    expect(preview.server.state.saves).toHaveLength(0);
  });
});

test.describe('where a block lands', () => {
  test('between two blocks, separated by blank lines', async ({ preview, page }) => {
    await preview.open(DOC);
    await insert(preview, page, 2, 'Quote');
    expect(preview.read()).toBe('# Title\n\nAlpha paragraph.\n\n> Quoted text\n\nBeta paragraph.\n');
  });

  test('above the first block', async ({ preview, page }) => {
    await preview.open(DOC);
    await insert(preview, page, 0, 'Text');
    expect(preview.read()).toBe('Write something.\n\n' + DOC);
  });

  test('below the last block', async ({ preview, page }) => {
    await preview.open(DOC);
    await insert(preview, page, 3, 'Text');
    expect(preview.read()).toBe(DOC + '\nWrite something.\n');
  });

  test('below the last block of a file with no trailing newline', async ({ preview, page }) => {
    await preview.open('# Title\n\nLast paragraph.');
    await insert(preview, page, 2, 'Text');
    expect(preview.read()).toBe('# Title\n\nLast paragraph.\n\nWrite something.');
  });

  test('right after the first block', async ({ preview, page }) => {
    await preview.open(DOC);
    await insert(preview, page, 1, 'Heading 2');
    expect(preview.read()).toBe('# Title\n\n## Heading\n\nAlpha paragraph.\n\nBeta paragraph.\n');
  });

  test('blocks that are not separated by a blank line get one on each side', async ({ preview, page }) => {
    await preview.open('# Title\nAlpha paragraph.\n');
    await insert(preview, page, 1, 'Text');
    expect(preview.read()).toBe('# Title\n\nWrite something.\n\nAlpha paragraph.\n');
  });

  test('inserts lands at the gap that was clicked, not at the end', async ({ preview, page }) => {
    await preview.open('- a\n- b\n\nAfter.\n');
    await insert(preview, page, 0, 'Checklist');
    expect(preview.read()).toBe('- [ ] First task\n- [ ] Second task\n\n- a\n- b\n\nAfter.\n');
  });

  test('a block inserted at the end is inserted after a block that has a class comment', async ({ preview, page }) => {
    await preview.open('<!-- .note -->\n> Careful.\n');
    await insert(preview, page, 1, 'Text');
    expect(preview.read()).toBe('<!-- .note -->\n> Careful.\n\nWrite something.\n');
  });

  test('two inserts in a row stack up in order', async ({ preview, page }) => {
    await preview.open('# Title\n');
    await insert(preview, page, 1, 'Text');
    await page.keyboard.press('Escape');
    await expect(preview.editor()).toHaveCount(0);
    await insert(preview, page, 2, 'Quote');
    expect(preview.read()).toBe('# Title\n\nWrite something.\n\n> Quoted text\n');
  });
});

test.describe('every insert item', () => {
  for (const [label, markdown] of ITEMS) {
    test(`${label}`, async ({ preview, page }) => {
      await preview.open(DOC);
      await insert(preview, page, 2, label);
      expect(preview.read()).toBe(`# Title\n\nAlpha paragraph.\n\n${markdown}\n\nBeta paragraph.\n`);

      // the new block is open for editing
      if (label === 'Cards') {
        await expect(page.locator('.mdstyled-block-editor[aria-label="Card designer"], .mdstyled-block-editor.mdstyled-card-designer, [aria-label="Card designer"]').first()).toBeVisible();
      } else if (label === 'Table') {
        await expect(page.locator('[aria-label="Table designer"]').first()).toBeVisible();
      } else if (label === 'Divider') {
        await expect(page.locator('.mdstyled-root hr')).toHaveCount(1);
      } else {
        await expect(preview.editor()).toBeVisible();
      }
    });
  }

  test('Text opens with the placeholder text ready to overwrite', async ({ preview, page }) => {
    await preview.open(DOC);
    await insert(preview, page, 2, 'Text');
    await expect(preview.rich()).toHaveText('Write something.');
    await expect(preview.rich()).toBeFocused();
    await page.keyboard.type('!');
    await preview.save();
    expect(preview.read()).toContain('Alpha paragraph.\n\nWrite something.!\n\nBeta paragraph.\n');
  });

  test('Heading 1 opens as a heading in the editor', async ({ preview, page }) => {
    await preview.open(DOC);
    await insert(preview, page, 2, 'Heading 1');
    await expect(preview.editor().locator('.mdstyled-select-label')).toHaveText('Heading 1');
    await expect(preview.rich()).toHaveText('Heading');
  });

  test('Checklist opens with both tasks and can be saved straight away', async ({ preview, page }) => {
    await preview.open(DOC);
    await insert(preview, page, 2, 'Checklist');
    await expect(preview.rich().locator('li')).toHaveText(['First task', 'Second task']);
    await preview.save();
    expect(preview.read()).toBe('# Title\n\nAlpha paragraph.\n\n- [ ] First task\n- [ ] Second task\n\nBeta paragraph.\n');
  });

  test('a callout opens as that style', async ({ preview, page }) => {
    await preview.open(DOC);
    await insert(preview, page, 2, 'Warning');
    await expect(preview.editor().locator('.mdstyled-select-label')).toHaveText('Warning');
    await preview.save();
    expect(preview.read()).toBe('# Title\n\nAlpha paragraph.\n\n<!-- .warning -->\n> **Careful** - read this first.\n\nBeta paragraph.\n');
  });

  test('Cards opens the card designer on the new grid, showing three cards', async ({ preview, page }) => {
    await preview.open(DOC);
    await insert(preview, page, 2, 'Cards');
    const designer = page.locator('[aria-label="Card designer"]').first();
    await expect(designer).toBeVisible();
    await expect(designer.locator('.mdstyled-designer-title-input')).toHaveCount(3);
    await expect(designer.locator('.mdstyled-designer-title-input').first()).toHaveValue('First card');
    // cancelling leaves the inserted grid in the file
    await page.keyboard.press('Escape');
    expect(preview.read()).toContain('<div class="mdstyled-cards cols-3">');
  });

  test('the inserted Table opens the table designer and can be saved', async ({ preview, page }) => {
    await preview.open(DOC);
    await insert(preview, page, 2, 'Table');
    const designer = page.locator('[aria-label="Table designer"]').first();
    await expect(designer).toBeVisible();
    await preview.save();
    expect(preview.read()).toBe('# Title\n\nAlpha paragraph.\n\n| Column | Column |\n| ------ | ------ |\n| Cell   | Cell   |\n\nBeta paragraph.\n');
  });

  test('Escape on a freshly inserted block keeps it in the file', async ({ preview, page }) => {
    await preview.open(DOC);
    await insert(preview, page, 2, 'Quote');
    await page.keyboard.press('Escape');
    await expect(preview.editor()).toHaveCount(0);
    expect(preview.read()).toBe('# Title\n\nAlpha paragraph.\n\n> Quoted text\n\nBeta paragraph.\n');
  });
});

test.describe('an empty document', () => {
  test('offers an insert line without turning Edit on', async ({ preview, page }) => {
    await preview.open('');
    await expect(page.locator('.mdstyled-insert-line-empty')).toBeVisible();
    await expect(page.locator('.mdstyled-insert-line-empty .mdstyled-insert-plus')).toBeVisible();
    await expect(page.locator('.mdstyled-empty')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/mdstyled-edit-mode/);
  });

  test('its + opens the menu and turns on edit mode', async ({ preview, page }) => {
    await preview.open('');
    await page.locator('.mdstyled-insert-line-empty .mdstyled-insert-plus').click();
    await expect(menu(page)).toBeVisible();
    await expect(page.locator('body')).toHaveClass(/mdstyled-edit-mode/);
  });

  test('inserting a heading writes it at the top of the file and opens it', async ({ preview, page }) => {
    await preview.open('');
    await page.locator('.mdstyled-insert-line-empty .mdstyled-insert-plus').click();
    await preview.rerender(() => menu(page).getByRole('menuitem', { name: 'Heading 1', exact: true }).click());
    expect(preview.read()).toBe('# Heading\n');
    await expect(preview.editor()).toBeVisible();
    await expect(preview.rich()).toHaveText('Heading');
  });

  test('inserting into a file that only has blank lines', async ({ preview, page }) => {
    await preview.open('\n\n');
    await page.locator('.mdstyled-insert-line-empty .mdstyled-insert-plus').click();
    await preview.rerender(() => menu(page).getByRole('menuitem', { name: 'Text', exact: true }).click());
    expect(preview.read().trim()).toBe('Write something.');
    await expect(preview.editor()).toBeVisible();
  });
});

test.describe('inserting beside other block kinds', () => {
  test('after a table', async ({ preview, page }) => {
    await preview.open('| A | B |\n| - | - |\n| 1 | 2 |\n');
    await insert(preview, page, 1, 'Text');
    expect(preview.read()).toBe('| A | B |\n| - | - |\n| 1 | 2 |\n\nWrite something.\n');
  });

  test('after a code block', async ({ preview, page }) => {
    await preview.open('```js\nlet a = 1;\n```\n');
    await insert(preview, page, 1, 'Text');
    expect(preview.read()).toBe('```js\nlet a = 1;\n```\n\nWrite something.\n');
  });

  test('before a list', async ({ preview, page }) => {
    await preview.open('Intro.\n\n- one\n- two\n');
    await insert(preview, page, 1, 'Quote');
    expect(preview.read()).toBe('Intro.\n\n> Quoted text\n\n- one\n- two\n');
  });
});
