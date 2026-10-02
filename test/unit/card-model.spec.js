// Card designer data layer (scripts/editable-template/cards.js): card grids and card
// lists as a model, and back to Markdown. Anything unrecognised parses to null.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'editable-template', 'cards.js'), 'utf8');
const lib = new Function(src + '; return { parseCardGrid, serializeCardGrid, parseCardList, serializeCardList };')();

const GRID = [
  '<div class="mdstyled-cards cols-2">', '',
  '<!-- .card -->', '> ### First card', '>', '> One.', '',
  '<!-- .card -->', '> ### Second card', '>', '> Two.', '',
  '</div>',
].join('\n');

test.describe('card grid', () => {
  test('parses cards, columns and heading level', () => {
    const m = lib.parseCardGrid(GRID);
    expect(m.kind).toBe('grid');
    expect(m.cols).toBe(2);
    expect(m.level).toBe(3);
    expect(m.cards.map(c => [c.title, c.level, c.body, c.classes.join(' ')])).toEqual([
      ['First card', 3, 'One.', 'card'],
      ['Second card', 3, 'Two.', 'card'],
    ]);
  });

  test('round-trips byte-for-byte', () => {
    expect(lib.serializeCardGrid(lib.parseCardGrid(GRID))).toBe(GRID);
  });

  test('round-trips byte-for-byte with extra card and grid classes, a bold title and multi-paragraph body', () => {
    const g = [
      '<div class="mdstyled-cards wide cols-3">', '',
      '<!-- .card .half -->', '> **Bold title**', '>', '> Para one.', '>', '> Para two.', '',
      '<!-- .card -->', '> ## Second', '',
      '</div>',
    ].join('\n');
    const m = lib.parseCardGrid(g);
    expect(m.cols).toBe(3);
    expect(m.gridClasses).toEqual(['wide']);
    expect(m.cards[0].level).toBe(0);
    expect(m.cards[0].classes).toEqual(['card', 'half']);
    expect(lib.serializeCardGrid(m)).toBe(g);
  });

  for (const n of [1, 2, 3, 4]) {
    test(`cols-${n} is parsed`, () => {
      const m = lib.parseCardGrid(`<div class="mdstyled-cards cols-${n}">\n\n<!-- .card -->\n> ### A\n\n</div>`);
      expect(m.cols).toBe(n);
    });
  }

  test('columns beyond the maximum are clamped, and no cols class defaults to 2', () => {
    expect(lib.parseCardGrid('<div class="mdstyled-cards cols-9">\n\n<!-- .card -->\n> ### A\n\n</div>').cols).toBe(4);
    expect(lib.parseCardGrid('<div class="mdstyled-cards">\n\n<!-- .card -->\n> ### A\n\n</div>').cols).toBe(2);
  });

  test('serialize writes cols from the model', () => {
    const m = lib.parseCardGrid(GRID);
    m.cols = 4;
    expect(lib.serializeCardGrid(m).split('\n')[0]).toBe('<div class="mdstyled-cards cols-4">');
  });

  test('empty cards are dropped on serialize', () => {
    const m = lib.parseCardGrid(GRID);
    m.cards.splice(1, 0, { title: '  ', level: 3, body: '\n ', classes: ['card'] });
    expect(lib.serializeCardGrid(m)).toBe(GRID);
  });

  test('a grid of only empty cards serializes to an empty wrapper', () => {
    const m = lib.parseCardGrid(GRID);
    m.cards = [{ title: '', level: 3, body: '', classes: ['card'] }];
    expect(lib.serializeCardGrid(m)).toBe('<div class="mdstyled-cards cols-2">\n\n</div>');
  });

  const unparseable = [
    ['plain text', 'Just a paragraph.'],
    ['empty string', ''],
    ['no closing div', '<div class="mdstyled-cards cols-2">\n\n<!-- .card -->\n> ### A\n'],
    ['wrong wrapper class', '<div class="other">\n\n<!-- .card -->\n> ### A\n\n</div>'],
    ['a non-card selector comment', '<div class="mdstyled-cards">\n\n<!-- .note -->\n> A\n\n</div>'],
    ['content before any card', '<div class="mdstyled-cards">\n\nstray text\n\n</div>'],
    ['text after a card ended', '<div class="mdstyled-cards">\n\n<!-- .card -->\n> A\n\nstray\n\n</div>'],
    ['a card that is not a quote', '<div class="mdstyled-cards">\n\n<!-- .card -->\nnot a quote\n\n</div>'],
  ];
  for (const [name, input] of unparseable) {
    test('unparseable grid returns null: ' + name, () => {
      expect(lib.parseCardGrid(input)).toBeNull();
    });
  }
});

test.describe('card list', () => {
  const LIST = ['- ### First', '', '  One.', '', '- ### Second', '', '  Two.'].join('\n');

  test('parses items as cards, with columns from the comment classes', () => {
    const m = lib.parseCardList(['cards', 'cols-3'], LIST);
    expect(m.kind).toBe('list');
    expect(m.cols).toBe(3);
    expect(m.ordered).toBe(false);
    expect(m.listClasses).toEqual(['cards']);
    expect(m.cards.map(c => [c.title, c.level, c.body])).toEqual([['First', 3, 'One.'], ['Second', 3, 'Two.']]);
  });

  test('round-trips with its <!-- .cards --> comment', () => {
    const m = lib.parseCardList(['cards', 'cols-3'], LIST);
    expect(lib.serializeCardList(m)).toBe('<!-- .cards .cols-3 -->\n' + LIST);
  });

  test('round-trips a list without a cols class', () => {
    const m = lib.parseCardList(['cards'], LIST);
    expect(m.cols).toBe(0);
    expect(lib.serializeCardList(m)).toBe('<!-- .cards -->\n' + LIST);
  });

  test('round-trips bold-titled items', () => {
    const l = '- **Alpha**\n\n  About alpha.\n\n- **Beta**\n\n  About beta.';
    const m = lib.parseCardList(['cards', 'cols-2'], l);
    expect(m.cards[0].level).toBe(0);
    expect(lib.serializeCardList(m)).toBe('<!-- .cards .cols-2 -->\n' + l);
  });

  test('a numbered list stays numbered', () => {
    const l = '1. **One**\n\n   a\n\n2. **Two**\n\n   b';
    const m = lib.parseCardList(['cards'], l);
    expect(m.ordered).toBe(true);
    expect(lib.serializeCardList(m)).toBe('<!-- .cards -->\n' + l);
  });

  test('cols-N parsing: clamps to the maximum', () => {
    expect(lib.parseCardList(['cards', 'cols-2'], '- A').cols).toBe(2);
    expect(lib.parseCardList(['cards', 'cols-4'], '- A').cols).toBe(4);
    expect(lib.parseCardList(['cards', 'cols-9'], '- A').cols).toBe(4);
  });

  test('serialize adds the cards class and cols when missing from the model', () => {
    const m = lib.parseCardList(['cards'], '- A');
    m.listClasses = ['wide'];
    m.cols = 2;
    expect(lib.serializeCardList(m).split('\n')[0]).toBe('<!-- .cards .wide .cols-2 -->');
  });

  test('empty cards are dropped on serialize, and numbering stays contiguous', () => {
    const m = lib.parseCardList(['cards'], '1. **A**\n\n2. **B**');
    m.cards.splice(1, 0, { title: '', level: 0, body: '', classes: [] });
    expect(lib.serializeCardList(m)).toBe('<!-- .cards -->\n1. **A**\n\n2. **B**');
  });

  test('unparseable list returns null: text before any item', () => {
    expect(lib.parseCardList(['cards'], 'stray\n- A')).toBeNull();
  });
  test('unparseable list returns null: no items', () => {
    expect(lib.parseCardList(['cards'], '')).toBeNull();
    expect(lib.parseCardList(['cards'], '\n\n')).toBeNull();
  });
});
