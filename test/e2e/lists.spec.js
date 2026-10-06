// Lists in the block editor: clicking to place the caret, Enter / Tab / Shift+Enter in
// the rich surface, ticking boxes, loose lists, and list typing in Markdown mode.
// Everything is real keyboard and mouse input; every save is checked against the file.
const { test, expect } = require('./fixtures');

const wrap = list => `# T\n\n${list}\n\nAfter.\n`;

/* Clicks the middle of the characters of `text` inside the rich editor. */
async function clickInRich(page, text) {
  const point = await page.evaluate(text => {
    const rich = document.querySelector('.mdstyled-block-editor .mdstyled-rich');
    const walker = document.createTreeWalker(rich, NodeFilter.SHOW_TEXT);
    let loose = null;
    let node;
    while ((node = walker.nextNode())) {
      if (node.parentElement.closest('[contenteditable="false"]')) continue;
      const at = node.nodeValue.indexOf(text);
      if (at === -1) continue;
      const exact = node.nodeValue.trim() === text;
      if (!exact && loose) continue;
      const range = document.createRange();
      range.setStart(node, at);
      range.setEnd(node, at + text.length);
      const box = range.getBoundingClientRect();
      const found = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      if (exact) return found;
      loose = found;
    }
    return loose;
  }, text);
  if (!point) throw new Error('No text "' + text + '" in the editor');
  await page.mouse.click(point.x, point.y);
}

/* Puts the caret in the rich editor's item `text`: a click on it, then End, or Home and `n` characters in. */
async function goTo(preview, page, text, where = 'end') {
  await clickInRich(page, text);
  if (where === 'end') await page.keyboard.press('End');
  else {
    await page.keyboard.press('Home');
    for (let i = 0; i < where; i++) await page.keyboard.press('ArrowRight');
  }
}

/* The items in the rich editor, top level and nested alike, in document order. */
const items = page => page.evaluate(() => [...document.querySelectorAll('.mdstyled-block-editor .mdstyled-rich li')].map(li => ({
  text: [...li.childNodes].filter(n => !(n.nodeType === 1 && /^(UL|OL)$/.test(n.tagName))).map(n => n.textContent).join('').replace(/\s+/g, ' ').trim(),
  boxes: li.querySelectorAll(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]').length,
  checked: !!li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]')?.checked,
  boxFirst: !!li.firstElementChild && li.firstElementChild.tagName === 'INPUT',
})));
const texts = async page => (await items(page)).map(i => i.text);

/* Opens `list` (inside a small document) and puts the caret in the item `text`. */
async function openList(preview, list, text, opts) {
  await preview.open(wrap(list));
  await preview.openText(text, opts);
  if (!(opts && opts.markdown)) await expect(preview.rich()).toBeVisible();
}

const CHECKLIST = '- [ ] alpha\n- [x] beta\n- [ ] gamma';
const BULLETS = '- apple\n- banana\n- cherry';
const NUMBERED = '1. one\n2. two\n3. three';

const KINDS = [
  { name: 'checklist', list: CHECKLIST, a: 'alpha', b: 'beta', c: 'gamma', box: true },
  { name: 'bullet list', list: BULLETS, a: 'apple', b: 'banana', c: 'cherry' },
  { name: 'numbered list', list: NUMBERED, a: 'one', b: 'two', c: 'three' },
];

test.describe('clicking an item', () => {
  for (const k of KINDS) {
    test(`in a ${k.name} puts the caret in that item, where clicked`, async ({ preview, page }) => {
      await preview.open(wrap(k.list));
      for (const [word, fraction] of [[k.a, 0.5], [k.b, 0.5], [k.c, 0.5]]) {
        await preview.openText(word, { at: fraction });
        const caret = await preview.caret();
        expect(caret.item).toBe(word);
        expect(caret.before + caret.after).toBe(word);
        expect(caret.before.length, 'caret is inside the text, not at an edge').toBeGreaterThan(0);
        expect(caret.after.length).toBeGreaterThan(0);
        await page.keyboard.press('Escape');
        await expect(preview.editor()).toHaveCount(0);
      }
    });

    test(`in a ${k.name} near the end of the text puts the caret near the end`, async ({ preview, page }) => {
      await preview.open(wrap(k.list));
      await preview.openText(k.b, { at: 0.9 });
      const caret = await preview.caret();
      expect(caret.item).toBe(k.b);
      expect(caret.after.length).toBeLessThanOrEqual(1);
    });
  }

  // PRODUCT BUG (reproduced): in a checklist, a click in the row to the right of an item's
  // text, or on the first pixels of it, puts the caret in the PREVIOUS item.
  //   1. file: "- [ ] alpha\n- [x] beta\n- [ ] gamma"; Edit on
  //   2. click 20px right of the end of "beta" (anywhere in the row past the text)
  //   Observed: editor opens with the caret at the end of "alpha" (for "alpha" itself: the start of "alpha").
  //   Checklist <li>s are display:flex; caretRangeFromPoint answers with a position in
  //   the list rather than in the text, so textOffsetAt() counts only what precedes the item.
  test.fixme('clicking in the row beside a checklist item puts the caret in that item', async ({ preview, page }) => {
    await preview.open(wrap(CHECKLIST));
    await preview.edit();
    const point = await page.evaluate(() => {
      const li = [...document.querySelectorAll('.mdstyled-root li')].find(l => l.textContent.includes('beta'));
      const text = [...li.childNodes].find(n => n.nodeType === 3 && n.nodeValue.includes('beta'));
      const r = document.createRange();
      r.selectNodeContents(text);
      const b = r.getBoundingClientRect();
      return { x: b.right + 200, y: b.y + b.height / 2 };
    });
    await page.mouse.click(point.x, point.y);
    await preview.editor().waitFor();
    expect((await preview.caret()).item).toBe('beta');
  });

  // PRODUCT BUG (reproduced): in a checklist, End after clicking an item's row in the
  // editor jumps to the end of the NEXT item, so "click, End, Enter" adds the new item in
  // the wrong place (after "gamma" instead of after "beta").
  //   1. file: "- [ ] alpha\n- [x] beta\n- [ ] gamma"; Edit, click "beta"
  //   2. click the centre of the "beta" row inside the editor (Playwright getByText('beta').click())
  //      -> caret is at the START of "beta"
  //   3. press End  -> caret is at the end of "gamma" (observed), expected: end of "beta"
  test.fixme('End after clicking a checklist row in the editor stays in that item', async ({ preview, page }) => {
    await openList(preview, CHECKLIST, 'alpha');
    await preview.rich().getByText('beta').first().click();
    await page.keyboard.press('End');
    expect((await preview.caret()).item).toBe('beta');
  });

  test('inside the editor, clicking another item moves the caret there', async ({ preview, page }) => {
    await openList(preview, CHECKLIST, 'alpha');
    await preview.rich().getByText('gamma').click();
    expect((await preview.caret()).item).toBe('gamma');
    await preview.rich().getByText('beta').click();
    expect((await preview.caret()).item).toBe('beta');
  });
});

test.describe('Enter at the end of an item', () => {
  for (const k of KINDS) {
    test(`adds an item after it in a ${k.name}`, async ({ preview, page }) => {
      await openList(preview, k.list, k.b);
      await goTo(preview, page, k.b);
      await page.keyboard.press('Enter');
      await page.keyboard.type('brand new');
      const now = await items(page);
      expect(now.map(i => i.text)).toEqual([k.a, k.b, 'brand new', k.c]);
      if (k.box) {
        expect(now.map(i => i.boxes), 'exactly one checkbox per item').toEqual([1, 1, 1, 1]);
        expect(now[2].boxFirst, 'the new checkbox comes before the text').toBe(true);
        expect(now[2].checked, 'and is unticked, although the item above is ticked').toBe(false);
        expect(now[1].checked).toBe(true);
      }
      await preview.save();
      const expected = {
        checklist: '- [ ] alpha\n- [x] beta\n- [ ] brand new\n- [ ] gamma',
        'bullet list': '- apple\n- banana\n- brand new\n- cherry',
        'numbered list': '1. one\n2. two\n3. brand new\n4. three',
      }[k.name];
      expect(preview.read()).toBe(wrap(expected));
    });
  }

  test('after the last item of a checklist adds a last item', async ({ preview, page }) => {
    await openList(preview, CHECKLIST, 'gamma');
    await goTo(preview, page, 'gamma');
    await page.keyboard.press('Enter');
    await page.keyboard.type('delta');
    await preview.save();
    expect(preview.read()).toBe(wrap(CHECKLIST + '\n- [ ] delta'));
  });

  test('keeps typing in the new item, caret and all', async ({ preview, page }) => {
    await openList(preview, CHECKLIST, 'beta');
    await goTo(preview, page, 'beta');
    await page.keyboard.press('Enter');
    const caret = await preview.caret();
    expect(caret.item).toBe('');
    await page.keyboard.type('x');
    expect((await preview.caret()).item).toBe('x');
  });
});

test.describe('Enter in the middle of an item', () => {
  for (const k of KINDS) {
    test(`splits the item in a ${k.name}`, async ({ preview, page }) => {
      await openList(preview, k.list, k.b);
      await goTo(preview, page, k.b, 2);
      await page.keyboard.press('Enter');
      const now = await items(page);
      expect(now.map(i => i.text)).toEqual([k.a, k.b.slice(0, 2), k.b.slice(2), k.c]);
      if (k.box) {
        expect(now.map(i => i.boxes)).toEqual([1, 1, 1, 1]);
        expect(now[2].checked, 'the second half starts unticked').toBe(false);
      }
      expect(await preview.caret()).toMatchObject({ item: k.b.slice(2), before: '' });
      await preview.save();
      const tail = { checklist: '- [ ] alpha\n- [x] be\n- [ ] ta\n- [ ] gamma', 'bullet list': '- apple\n- ba\n- nana\n- cherry', 'numbered list': '1. one\n2. tw\n3. o\n4. three' };
      expect(preview.read()).toBe(wrap(tail[k.name]));
    });
  }
});

test.describe('Enter at the start of an item', () => {
  for (const k of KINDS) {
    test(`inserts an empty item above it in a ${k.name}`, async ({ preview, page }) => {
      await openList(preview, k.list, k.b);
      await goTo(preview, page, k.b, 0);
      await page.keyboard.press('Enter');
      const now = await items(page);
      expect(now.map(i => i.text)).toEqual([k.a, '', k.b, k.c]);
      if (k.box) expect(now.map(i => i.boxes)).toEqual([1, 1, 1, 1]);
      expect(await preview.caret(), 'the caret stays with the text').toMatchObject({ item: k.b, before: '' });
      // fill the empty item in
      await page.keyboard.press('ArrowUp');
      await page.keyboard.type('inserted');
      await preview.save();
      const expected = { checklist: '- [ ] alpha\n- [ ] inserted\n- [x] beta\n- [ ] gamma', 'bullet list': '- apple\n- inserted\n- banana\n- cherry', 'numbered list': '1. one\n2. inserted\n3. two\n4. three' };
      expect(preview.read()).toBe(wrap(expected[k.name]));
    });
  }
});

test.describe('Enter on an empty item', () => {
  for (const k of KINDS) {
    test(`leaves the ${k.name} for a paragraph, and the items after it form a list of their own`, async ({ preview, page }) => {
      await openList(preview, k.list, k.b);
      await goTo(preview, page, k.b);
      await page.keyboard.press('Enter');   // a new empty item
      await expect.poll(() => texts(page)).toEqual([k.a, k.b, '', k.c]);
      await page.keyboard.press('Enter');   // leave the list
      await page.keyboard.type('a paragraph');
      await expect(preview.rich().locator(':scope > p')).toHaveText('a paragraph');
      expect(await preview.rich().locator(':scope > ul, :scope > ol').count(), 'two lists around the paragraph').toBe(2);
      await preview.save();
      const expected = {
        checklist: '- [ ] alpha\n- [x] beta\n\na paragraph\n\n- [ ] gamma',
        'bullet list': '- apple\n- banana\n\na paragraph\n\n- cherry',
        'numbered list': '1. one\n2. two\n\na paragraph\n\n3. three',
      };
      expect(preview.read()).toBe(wrap(expected[k.name]));
    });
  }

  test('numbering carries on after the paragraph (the start attribute)', async ({ preview, page }) => {
    await openList(preview, NUMBERED, 'two');
    await goTo(preview, page, 'two');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await expect(preview.rich().locator('ol').nth(1)).toHaveAttribute('start', '3');
    await page.keyboard.type('between');
    await preview.save();
    expect(preview.read()).toBe(wrap('1. one\n2. two\n\nbetween\n\n3. three'));
    await expect(page.locator('.mdstyled-root ol').nth(1)).toHaveAttribute('start', '3');
  });

  test('on the last item ends the list with nothing after it', async ({ preview, page }) => {
    await openList(preview, CHECKLIST, 'gamma');
    await goTo(preview, page, 'gamma');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('done here');
    await preview.save();
    expect(preview.read()).toBe(wrap(CHECKLIST + '\n\ndone here'));
  });

  // PRODUCT BUG (reproduced): Enter on an empty NESTED item (leaveList -> execCommand('outdent'))
  // mangles the list and the typed text lands in the parent item on save.
  //   1. file: "- [ ] parent\n  - [ ] child"; Edit, click "child", End, Enter, Enter, type "sibling"
  //   Observed file: "- [ ] parent sibling\n  - [ ] child"
  //   Editor DOM after the second Enter (Chromium's outdent leaves invalid nesting):
  //     <li>parent<ul><li>child</li></ul><li><input type=checkbox></li><ul></ul></li>
  //   i.e. an <li> inside the parent <li>, which serializeList() flattens into the parent's text.
  //   The same happens in a plain bullet list ("- a\n  - b\n  - c", Enter twice on "c").
  test.fixme('on a nested empty item moves it out one level', async ({ preview, page }) => {
    await openList(preview, '- a\n  - b\n  - c', 'c');
    await goTo(preview, page, 'c');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('x');
    expect(await preview.rich().locator(':scope > p').count(), 'still inside the list').toBe(0);
    await preview.save();
    expect(preview.read()).toBe(wrap('- a\n  - b\n  - c\n- x'));
  });

  test.fixme('on a nested empty checklist item moves it out one level and keeps its checkbox', async ({ preview, page }) => {
    await openList(preview, '- [ ] parent\n  - [ ] child', 'child');
    await goTo(preview, page, 'child');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('sibling');
    await preview.save();
    expect(preview.read()).toBe(wrap('- [ ] parent\n  - [ ] child\n- [ ] sibling'));
  });
});

// PRODUCT BUG (reproduced): Tab on a list item in the rich editor loses that item on save.
//   1. file: "- apple\n- banana\n- cherry"; Edit, click "banana", press Tab
//   2. Ctrl/Cmd+Enter
//   Observed file: "- apple\n- cherry"  ("banana" is gone). Same for a numbered list
//   ("1. one\n2. two\n3. three" -> "1. one\n2. three") and for Tab on the FIRST item
//   ("apple" vanishes).
//   Cause: Chromium's execCommand('indent') nests a <ul> directly inside the <ul>:
//     <ul><li>apple</li><ul><li>banana</li></ul><li>cherry</li></ul>
//   and serializeList() (serializer.js) only visits the <li> children of a list, so the
//   stray nested <ul> is dropped. (Shift+Tab has the mirror-image problem for what Tab made.)
test.describe('Tab and Shift+Tab', () => {
  test.fixme('Tab indents a bullet under the item above, Shift+Tab brings it back', async ({ preview, page }) => {
    await openList(preview, BULLETS, 'banana');
    await goTo(preview, page, 'banana');
    await page.keyboard.press('Tab');
    await expect(preview.rich().locator('li li')).toHaveText(['banana']);
    await preview.save();
    expect(preview.read()).toBe(wrap('- apple\n  - banana\n- cherry'));

    await preview.openText('banana');
    await goTo(preview, page, 'banana');
    await page.keyboard.press('Shift+Tab');
    await expect(preview.rich().locator('li li')).toHaveCount(0);
    await preview.save();
    expect(preview.read()).toBe(wrap(BULLETS));
  });

  test.fixme('Tab indents a checklist item and keeps its state', async ({ preview, page }) => {
    await openList(preview, CHECKLIST, 'beta');
    await goTo(preview, page, 'beta');
    await page.keyboard.press('Tab');
    await expect(preview.rich().locator('li li')).toHaveText([/beta/]);
    await preview.save();
    expect(preview.read()).toBe(wrap('- [ ] alpha\n  - [x] beta\n- [ ] gamma'));
  });

  test.fixme('Tab indents a numbered item', async ({ preview, page }) => {
    await openList(preview, NUMBERED, 'two');
    await goTo(preview, page, 'two');
    await page.keyboard.press('Tab');
    await preview.save();
    expect(preview.read()).toBe(wrap('1. one\n  1. two\n2. three'));
  });

  test.fixme('Tab on the first item has nothing above to go under and keeps focus in the editor', async ({ preview, page }) => {
    await openList(preview, BULLETS, 'apple');
    await goTo(preview, page, 'apple');
    await page.keyboard.press('Tab');
    await expect(preview.rich()).toBeFocused();
    await preview.save();
    expect(preview.read()).toBe(wrap(BULLETS));
  });

  test('Tab outside a list still moves focus on', async ({ preview, page }) => {
    await preview.open('# T\n\nJust a paragraph.\n');
    await preview.openText('Just a paragraph');
    await page.keyboard.press('Tab');
    await expect(preview.rich()).not.toBeFocused();
  });
});

test.describe('Shift+Enter', () => {
  for (const k of KINDS) {
    test(`is not a new item in a ${k.name}`, async ({ preview, page }) => {
      await openList(preview, k.list, k.b);
      await goTo(preview, page, k.b);
      await page.keyboard.press('Shift+Enter');
      await page.keyboard.type('more');
      const now = await items(page);
      expect(now, 'still three items').toHaveLength(3);
      if (k.box) expect(now.map(i => i.boxes)).toEqual([1, 1, 1]);
      await preview.save();
      const saved = preview.read();
      // the line break stays inside the item as a hard break
      expect(saved.split('\n').filter(l => /^(- |\d+\. )/.test(l))).toHaveLength(3);
      expect(saved).toContain('more');
    });
  }
});

test.describe('checkboxes inside the editor', () => {
  test('ticking and unticking saves [x] and [ ]', async ({ preview, page }) => {
    await openList(preview, CHECKLIST, 'alpha');
    const boxes = preview.rich().locator('li input[type="checkbox"]');
    await boxes.nth(0).click();
    await boxes.nth(1).click();
    await expect(boxes.nth(0)).toBeChecked();
    await expect(boxes.nth(1)).not.toBeChecked();
    await preview.save();
    expect(preview.read()).toBe(wrap('- [x] alpha\n- [ ] beta\n- [ ] gamma'));
  });

  test('a ticked box survives Enter, typing and saving', async ({ preview, page }) => {
    await openList(preview, CHECKLIST, 'gamma');
    await preview.rich().locator('li input[type="checkbox"]').nth(2).click();
    await goTo(preview, page, 'gamma');
    await page.keyboard.press('Enter');
    await page.keyboard.type('delta');
    await preview.save();
    expect(preview.read()).toBe(wrap('- [ ] alpha\n- [x] beta\n- [x] gamma\n- [ ] delta'));
  });

  test('clicking a box does not open a second editor or move the list', async ({ preview, page }) => {
    await openList(preview, CHECKLIST, 'alpha');
    await preview.rich().locator('li input[type="checkbox"]').nth(0).click();
    await expect(preview.editor()).toHaveCount(1);
    expect(preview.read()).toBe(wrap(CHECKLIST));
  });
});

test.describe('empty items', () => {
  for (const k of KINDS) {
    test(`save without a stray backslash in a ${k.name}`, async ({ preview, page }) => {
      await openList(preview, k.list, k.b);
      await goTo(preview, page, k.b);
      await page.keyboard.press('Enter');
      await preview.save();
      const saved = preview.read();
      expect(saved).not.toContain('\\');
      const lines = saved.split('\n');
      const empty = { checklist: '- [ ]', 'bullet list': '-', 'numbered list': '3.' }[k.name];
      expect(lines.map(l => l.trimEnd())).toContain(empty);
    });
  }

  test('an empty item in the middle survives another round trip', async ({ preview, page }) => {
    await openList(preview, BULLETS, 'banana');
    await goTo(preview, page, 'banana');
    await page.keyboard.press('Enter');
    await preview.save();
    const first = preview.read();
    expect(first).not.toContain('\\');
    await preview.openText('banana');
    await preview.save();
    expect(preview.read()).toBe(first);
  });
});

test.describe('numbered list styles', () => {
  test('a two-digit list keeps its numbers and grows by one', async ({ preview, page }) => {
    const list = '9. nine\n10. ten\n11. eleven';
    await openList(preview, list, 'ten');
    await goTo(preview, page, 'ten');
    await page.keyboard.press('Enter');
    await page.keyboard.type('and a half');
    await preview.save();
    expect(preview.read()).toBe(wrap('9. nine\n10. ten\n11. and a half\n12. eleven'));
  });

  test('a list that starts high keeps its start', async ({ preview, page }) => {
    await openList(preview, '10. ten\n11. eleven\n12. twelve', 'eleven');
    await goTo(preview, page, 'eleven');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('break');
    await preview.save();
    expect(preview.read()).toBe(wrap('10. ten\n11. eleven\n\nbreak\n\n12. twelve'));
  });

  test('a two-digit list that is left unchanged saves byte for byte', async ({ preview, page }) => {
    const list = '9. nine\n10. ten\n11. eleven';
    await openList(preview, list, 'ten');
    await expect(preview.rich()).toBeVisible();
    await preview.save();
    expect(preview.read()).toBe(wrap(list));
  });

  test('a list written with `3)` opens and round-trips', async ({ preview, page }) => {
    const list = '3) three\n4) four\n5) five';
    await openList(preview, list, 'four', { markdown: true });
    await preview.save();
    // whichever surface it opened in, nothing is lost or renumbered
    const saved = preview.read();
    expect(saved).toContain('three');
    expect(saved).toContain('four');
    expect(saved).toContain('five');
    expect(saved.match(/^\s*\d+[.)] /gm)).toHaveLength(3);
    expect(saved).toMatch(/^3[.)] three$/m);
    expect(saved).toMatch(/^5[.)] five$/m);
  });

  test('a `3)` list is left exactly as written when nothing changed', async ({ preview, page }) => {
    const list = '3) three\n4) four\n5) five';
    await openList(preview, list, 'four', { markdown: true });
    await preview.save();
    expect(preview.read()).toBe(wrap(list));
  });
});

test.describe('loose lists', () => {
  const LOOSE_BOLD = '- **Loose A**\n\n  body a\n\n- **Loose B**\n\n  body b';
  const LOOSE_PLAIN = '- first\n\n- second\n\n- third';
  const LOOSE_NUMBERED = '1. **One**\n\n   body one\n\n2. **Two**\n\n   body two';
  const LOOSE_TASKS = '- [ ] first\n\n- [ ] second\n\n- [ ] third';

  for (const [name, list, word] of [
    ['bold headers with body paragraphs', LOOSE_BOLD, 'body a'],
    ['plain items with blank lines between', LOOSE_PLAIN, 'second'],
    ['a numbered list with indented bodies', LOOSE_NUMBERED, 'body two'],
    ['a checklist with blank lines between', LOOSE_TASKS, 'second'],
  ]) {
    test(`${name} opens in the rich editor and saves unchanged, byte for byte`, async ({ preview, page }) => {
      await openList(preview, list, word);
      await expect(preview.rich()).toBeVisible();
      await expect(page.locator('.mdstyled-block-editor.mdstyled-prefers-markdown')).toHaveCount(0);
      await preview.save();
      expect(preview.read()).toBe(wrap(list));
      // and once more
      await preview.openText(word);
      await preview.save();
      expect(preview.read()).toBe(wrap(list));
    });
  }

  test('Enter at the end of a body paragraph adds an item, not a paragraph', async ({ preview, page }) => {
    await openList(preview, LOOSE_BOLD, 'body a');
    await goTo(preview, page, 'body a');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Loose C');
    await expect(preview.rich().locator(':scope > ul > li')).toHaveCount(3);
    await preview.save();
    expect(preview.read()).toBe(wrap('- **Loose A**\n\n  body a\n\n- Loose C\n\n- **Loose B**\n\n  body b'));
  });

  test('Enter in a loose plain list adds a loose item', async ({ preview, page }) => {
    await openList(preview, LOOSE_PLAIN, 'second');
    await goTo(preview, page, 'second');
    await page.keyboard.press('Enter');
    await page.keyboard.type('between');
    await preview.save();
    expect(preview.read()).toBe(wrap('- first\n\n- second\n\n- between\n\n- third'));
  });

  test('Enter in a loose numbered list renumbers and keeps the body indent', async ({ preview, page }) => {
    await openList(preview, LOOSE_NUMBERED, 'body one');
    await goTo(preview, page, 'body one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('Inserted');
    await preview.save();
    expect(preview.read()).toBe(wrap('1. **One**\n\n   body one\n\n2. Inserted\n\n3. **Two**\n\n   body two'));
  });

  test('Enter in a loose checklist gives the new item one unticked box', async ({ preview, page }) => {
    await openList(preview, LOOSE_TASKS, 'second');
    await goTo(preview, page, 'second');
    await page.keyboard.press('Enter');
    await page.keyboard.type('between');
    await preview.save();
    expect(preview.read()).toBe(wrap('- [ ] first\n\n- [ ] second\n\n- [ ] between\n\n- [ ] third'));
  });

  test('Enter on an empty loose item leaves the list', async ({ preview, page }) => {
    await openList(preview, LOOSE_PLAIN, 'third');
    await goTo(preview, page, 'third');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('after the list');
    await preview.save();
    expect(preview.read()).toBe(wrap(LOOSE_PLAIN + '\n\nafter the list'));
  });

  test('splitting a loose item in the middle of its title', async ({ preview, page }) => {
    await openList(preview, LOOSE_PLAIN, 'second');
    await goTo(preview, page, 'second', 3);
    await page.keyboard.press('Enter');
    await preview.save();
    expect(preview.read()).toBe(wrap('- first\n\n- sec\n\n- ond\n\n- third'));
  });

  test('a nested list inside a loose item keeps its indentation', async ({ preview, page }) => {
    const list = '- **Parent**\n\n  explanation\n\n  - child one\n  - child two\n\n- **Other**\n\n  more';
    await openList(preview, list, 'explanation');
    await preview.save();
    expect(preview.read()).toBe(wrap(list));
  });

  test('ticking the first box of a loose checklist saves [x] on that item', async ({ preview, page }) => {
    await openList(preview, LOOSE_TASKS, 'first');
    await preview.rich().locator('li').first().locator('input[type="checkbox"]').first().click();
    await preview.save();
    expect(preview.read()).toBe(wrap(LOOSE_TASKS.replace('- [ ] first', '- [x] first')));
  });

  // PRODUCT BUG (reproduced): a ticked item of a loose checklist is silently unticked by
  // opening the list and saving, and every loose item shows two checkboxes.
  //   1. file: "- [ ] first\n\n- [x] second\n\n- [ ] third"
  //   2. Edit, click "second" (editor shows two boxes per item; the extra one is unticked)
  //   3. Ctrl/Cmd+Enter without touching anything
  //   Observed file: "- [ ] first\n\n- [ ] second\n\n- [ ] third"   ([x] lost)
  //   Editor DOM per item: <li class="task-list-item"><input ...> <p><input checked> second</p></li>
  //   The renderer puts a loose item's checkbox inside its <p>; normaliseTaskLists()
  //   (editor.js) only looks at the <li>'s direct children, so it adds a second, unticked
  //   box at the start of the <li>, and serializeList() reads the first box it finds.
  test.fixme('a ticked item of a loose checklist stays ticked when the list is opened and saved', async ({ preview, page }) => {
    const list = '- [ ] first\n\n- [x] second\n\n- [ ] third';
    await openList(preview, list, 'second');
    expect(await page.locator('.mdstyled-rich li input[type="checkbox"]').count(), 'one box per item').toBe(3);
    await preview.save();
    expect(preview.read()).toBe(wrap(list));
  });
});

test.describe('lists in Markdown mode', () => {
  /* A block in Markdown mode whose text is exactly `value`, with the caret at `caret` (default: the end). */
  async function markdownMode(preview, page, value, caret) {
    await preview.open('# T\n\nPlaceholder.\n\nAfter.\n');
    await preview.openText('Placeholder');
    await page.locator('.mdstyled-mode-toggle').click();
    const ta = page.locator('.mdstyled-edit-textarea');
    await expect(ta).toBeVisible();
    await ta.fill(value);
    if (caret === undefined) await page.keyboard.press('ControlOrMeta+End');
    else await ta.evaluate((el, at) => { el.focus(); el.setSelectionRange(at, at); }, caret);
    return ta;
  }

  test('Enter in a checklist carries an unchecked box', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '- [ ] first task');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('- [ ] first task\n- [ ] ');
  });

  test('Enter after a ticked item still yields an unchecked one', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '- [x] done task');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('- [x] done task\n- [ ] ');
  });

  test('Enter in a bullet list carries the bullet', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '- a bullet');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('- a bullet\n- ');
  });

  test('Enter in a numbered list counts up', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '1. first');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('1. first\n2. ');
    await page.keyboard.type('second');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('1. first\n2. second\n3. ');
  });

  test('a two-digit number counts up to three digits', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '99. last');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('99. last\n100. ');
  });

  test('the numbering style `3)` is kept', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '3) third');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('3) third\n4) ');
  });

  test('Enter in a quote carries the marker', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '> quoted');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('> quoted\n> ');
  });

  test('Enter on an empty item ends the list', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '- [ ] ');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('');
  });

  test('Enter on an empty bullet or number ends the list too', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, 'text\n\n- ');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('text\n\n');
    await ta.fill('1. one\n2. ');
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('1. one\n');
  });

  test('an empty nested item steps out one level instead', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '  - [ ] ');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('- [ ] ');
  });

  test('Enter inside the marker is left to the browser', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '- [ ] first\n- [ ] second', 13);
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('- [ ] first\n-\n [ ] second');
  });

  test('Enter mid-item splits it into two tasks', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '- [ ] alpha beta', 11);
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('- [ ] alpha\n- [ ] beta');
  });

  test('indentation carries down a nested list', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '  - [ ] nested item');
    await page.keyboard.press('Enter');
    await expect(ta).toHaveValue('  - [ ] nested item\n  - [ ] ');
  });

  test('Shift+Enter is left to the browser', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '- [ ] item');
    await page.keyboard.press('Shift+Enter');
    await expect(ta).toHaveValue('- [ ] item\n');
  });

  test('Shift+Enter in plain text is a newline', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, 'Just a paragraph');
    await page.keyboard.press('Shift+Enter');
    await expect(ta).toHaveValue('Just a paragraph\n');
  });

  test('Tab indents a list line and Shift+Tab takes it back', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '- [ ] indent me');
    await page.keyboard.press('Tab');
    await expect(ta).toHaveValue('  - [ ] indent me');
    await expect(ta).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(ta).toHaveValue('- [ ] indent me');
    await expect(ta).toBeFocused();
  });

  test('Tab on a line that is not a list moves focus on', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, 'plain text');
    await page.keyboard.press('Tab');
    await expect(ta).not.toBeFocused();
  });

  test('a whole list typed with the keyboard saves as written', async ({ preview, page }) => {
    const ta = await markdownMode(preview, page, '- [ ] one');
    await page.keyboard.press('Enter');
    await page.keyboard.type('two');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await page.keyboard.type('nested');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('three');
    await expect(ta).toHaveValue('- [ ] one\n- [ ] two\n  - [ ] nested\n- [ ] three');
    await preview.save();
    expect(preview.read()).toBe('# T\n\n- [ ] one\n- [ ] two\n  - [ ] nested\n- [ ] three\n\nAfter.\n');
    await preview.openText('nested');
    await expect(preview.rich().locator('li input[type="checkbox"]')).toHaveCount(4);
  });
});
