// Card grids: each card is its own editable block, cards are added from the card's
// own toolbar, and the column count is a property of the grid around them.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { JSDOM } = require('jsdom');
const sanitizeHtml = require('sanitize-html');
const e = require('./helpers/engine');

const T = path.join(__dirname, '..', 'templates', 'editable-light');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mdstyled-cards-'));

const SANITIZE = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['html', 'head', 'body', 'meta', 'style', 'script', 'section', 'input', 'svg', 'path']),
  allowedAttributes: {
    '*': ['id', 'class', 'style', 'data-mdstyled-line', 'data-mdstyled-uri'],
    'svg': ['viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width'], 'path': ['d'],
  },
  allowVulnerableTags: true,
};

const GRID = [
  '# Title', '',
  '<div class="mdstyled-cards cols-2">', '',
  '<!-- .card -->', '> ### First card', '>', '> One.', '',
  '<!-- .card -->', '> ### Second card', '>', '> Two.', '',
  '</div>', '',
].join('\n');

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  cond ? pass++ : fail++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
};
const tick = () => new Promise(r => setTimeout(r, 20));

(async () => {
  const md = TMP + '/cards.md';
  fs.writeFileSync(md, GRID);

  const raw = await e.renderMdStyled(md, [], undefined, {
    styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')],
  });
  const html = sanitizeHtml(raw, SANITIZE);

  // ── the grid renders as a real container of independently editable cards
  check('the wrapper survives to the DOM', /<div class="mdstyled-cards cols-2">/.test(html));
  check('each card is its own annotated block',
    (html.match(/<blockquote class="card" data-mdstyled-line/g) || []).length === 2,
    (html.match(/data-mdstyled-line/g) || []).length + ' annotated blocks');

  const open = async (file) => {
    const raw = await e.renderMdStyled(file, [], undefined, {
      styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')],
    });
    const posted = [];
    const dom = new JSDOM(sanitizeHtml(raw, SANITIZE), {
      runScripts: 'dangerously', pretendToBeVisual: true,
      beforeParse(win) {
        win.acquireVsCodeApi = () => ({
          postMessage: m => {
            posted.push(m);
            setTimeout(() => win.postMessage({
              type: 'mdstyled.result', id: m.id, ok: true,
              html: m.markdown !== undefined ? e.renderMarkdownFragment(m.markdown) : undefined,
            }, '*'), 0);
          },
          getState: () => ({}), setState: () => {},
        });
      },
    });
    dom.window.addEventListener('error', ev => errors.push(ev.message || String(ev.error)));
    await new Promise(r => dom.window.addEventListener('load', r));
    await tick();
    return { window: dom.window, doc: dom.window.document, posted };
  };
  const errors = [];
  const { window, doc, posted } = await open(md);

  const click = node => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const type = (node, value) => { node.value = value; node.dispatchEvent(new window.Event('input', { bubbles: true })); };
  const saves = () => posted.filter(m => m.type === 'mdstyled.saveBlock');
  const cards = doc.querySelectorAll('.mdstyled-cards > .mdstyled-editable');
  check('both cards are editable in place', cards.length === 2);

  click(doc.querySelector('.mdstyled-edit-toggle'));
  const gridEl = doc.querySelector('.mdstyled-cards');
  check('no insert line is built inside a grid, where it would take a cell',
    gridEl.querySelectorAll(':scope > .mdstyled-insert-line').length === 0,
    Array.from(gridEl.children).map(c => c.className).join(' | '));
  check('the grid\'s children are exactly its cards',
    Array.from(gridEl.children).every(c => c.classList.contains('card')));
  check('and the edit-mode rule cannot show one there either',
    /body\.mdstyled-edit-mode \.mdstyled-cards > \.mdstyled-insert-line\s*\{\s*display:\s*none/.test(
      fs.readFileSync(path.join(T, 'style.css'), 'utf8')));

  const after = gridEl.nextElementSibling;
  check('an insert line follows the whole grid', after && after.classList.contains('mdstyled-insert-line'));
  posted.length = 0;
  click(after.querySelector('.mdstyled-insert-plus'));
  click(Array.from(doc.querySelectorAll('.mdstyled-insert-item')).find(b => b.getAttribute('aria-label') === 'Text'));
  await tick();
  check('inserting after the grid lands below </div>, not inside it',
    saves()[0] && saves()[0].startLine === 15, JSON.stringify(saves()[0] && saves()[0].startLine));

  // ── clicking any card opens the designer on the whole grid
  click(cards[1]);
  await tick();
  const ed = doc.querySelector('.mdstyled-card-designer');
  check('clicking a card opens the card designer', !!ed);
  check('the grid itself is hidden while designing',
    doc.querySelector('.mdstyled-cards').classList.contains('mdstyled-editable-hidden'));
  let tiles = () => ed.querySelectorAll('.mdstyled-designer-card');
  check('every card is a tile', tiles().length === 2);
  check('tiles carry header and content',
    tiles()[0].querySelector('.mdstyled-designer-title-input').value === 'First card' &&
    tiles()[1].querySelector('.mdstyled-designer-body').value === 'Two.');
  check('the clicked card has focus',
    doc.activeElement === tiles()[1].querySelector('.mdstyled-designer-title-input'));
  check('it counts the cards', ed.querySelector('.mdstyled-designer-count').textContent === '2 cards');

  const cols = ed.querySelectorAll('.mdstyled-col-btn');
  check('columns 1 to 4 are offered', Array.from(cols).map(b => b.textContent).join('') === '1234');
  check('the current column count is marked',
    Array.from(cols).find(b => b.classList.contains('active')).textContent === '2');
  const rowValue = () => ed.querySelector('.mdstyled-stepper-value').textContent;
  check('it shows the row count', rowValue() === '1');

  // ── design: edit, columns, rows, add, move, remove
  type(tiles()[0].querySelector('.mdstyled-designer-title-input'), 'Renamed');
  type(tiles()[0].querySelector('.mdstyled-designer-body'), 'Line one\n\nLine two');
  click(Array.from(cols).find(b => b.textContent === '3'));
  check('picking columns relays the canvas out',
    ed.querySelector('.mdstyled-designer-grid').style.gridTemplateColumns.includes('repeat(3'));

  click(ed.querySelector('.mdstyled-stepper-btn[aria-label="Add a row of cards"]'));
  check('adding a row fills out two full rows', tiles().length === 6 && rowValue() === '2', tiles().length);
  click(ed.querySelector('.mdstyled-stepper-btn[aria-label="Remove the last row"]'));
  check('removing a row trims back to one', tiles().length === 3 && rowValue() === '1', tiles().length);

  click(ed.querySelector('.mdstyled-designer-add'));
  check('Add card appends a tile and starts a second row', tiles().length === 4 && rowValue() === '2');
  click(tiles()[3].querySelector('[aria-label="Remove card"]'));
  click(tiles()[2].querySelector('[aria-label="Remove card"]'));
  check('Remove card takes a tile out', tiles().length === 2);

  click(tiles()[1].querySelector('[aria-label="Move earlier"]'));
  check('Move earlier swaps the order',
    tiles()[0].querySelector('.mdstyled-designer-title-input').value === 'Second card');
  check('the first tile cannot move earlier',
    tiles()[0].querySelector('[aria-label="Move earlier"]').disabled);

  // ── markdown view round-trips
  click(ed.querySelector('.mdstyled-mode-toggle'));
  const ta = ed.querySelector('.mdstyled-edit-textarea');
  check('the Markdown view shows the grid source', !ta.hidden && ta.value.startsWith('<div class="mdstyled-cards cols-3">'));
  click(ed.querySelector('.mdstyled-mode-toggle'));
  check('and back again keeps every card', tiles().length === 2);

  posted.length = 0;
  click(Array.from(ed.querySelectorAll('.mdstyled-edit-btn')).find(b => b.textContent === 'Save'));
  await tick();
  const w = saves();
  check('Save writes the whole grid in one go',
    w.length === 1 && w[0].startLine === 2 && w[0].endLine === 15, JSON.stringify(w.map(x => [x.startLine, x.endLine])));
  check('with the layout, order and content from the designer', w[0] && w[0].text === [
    '<div class="mdstyled-cards cols-3">', '',
    '<!-- .card -->', '> ### Second card', '>', '> Two.', '',
    '<!-- .card -->', '> ### Renamed', '>', '> Line one', '>', '> Line two', '',
    '</div>',
  ].join('\n'), w[0] && JSON.stringify(w[0].text));

  // ── a `.cards` list gets the same designer, written back as a list
  fs.writeFileSync(TMP + '/list.md', [
    '# T', '',
    '<!-- .cards -->',
    '- **Alpha**', '', '  First body.', '',
    '- **Beta**', '', '  Second body.', '  More.', '',
    'After.', '',
  ].join('\n'));
  const L = await open(TMP + '/list.md');
  const lclick = node => node.dispatchEvent(new L.window.MouseEvent('click', { bubbles: true }));
  lclick(L.doc.querySelector('.mdstyled-edit-toggle'));
  lclick(L.doc.querySelectorAll('ul.cards > li')[1]);
  await tick();
  const led = L.doc.querySelector('.mdstyled-card-designer');
  check('a .cards list opens the designer', !!led);
  const ltiles = () => led.querySelectorAll('.mdstyled-designer-card');
  check('one tile per list item, bold line as header',
    ltiles().length === 2 &&
    ltiles()[1].querySelector('.mdstyled-designer-title-input').value === 'Beta' &&
    ltiles()[1].querySelector('.mdstyled-designer-body').value === 'Second body.\nMore.');
  check('the clicked item has focus',
    L.doc.activeElement === ltiles()[1].querySelector('.mdstyled-designer-title-input'));
  const lcols = Array.from(led.querySelectorAll('.mdstyled-col-btn'));
  check('a list offers Auto columns, and is on it',
    lcols[0].textContent === 'Auto' && lcols[0].classList.contains('active'));
  check('rows need a column count', led.querySelector('.mdstyled-stepper-btn[aria-label="Add a row of cards"]').disabled);
  lcols.find(b => b.textContent === '2').dispatchEvent(new L.window.MouseEvent('click', { bubbles: true }));
  lclick(led.querySelector('.mdstyled-designer-add'));
  const third = ltiles()[2];
  third.querySelector('.mdstyled-designer-title-input').value = 'Gamma';
  third.querySelector('.mdstyled-designer-title-input').dispatchEvent(new L.window.Event('input'));
  L.posted.length = 0;
  lclick(Array.from(led.querySelectorAll('.mdstyled-edit-btn')).find(b => b.textContent === 'Save'));
  await tick();
  const lw = L.posted.filter(m => m.type === 'mdstyled.saveBlock');
  check('the list is saved over its own lines only',
    lw.length === 1 && lw[0].startLine === 2 && lw[0].endLine === 11, JSON.stringify(lw.map(x => [x.startLine, x.endLine])));
  check('as a list with the column class', lw[0] && lw[0].text === [
    '<!-- .cards .cols-2 -->',
    '- **Alpha**', '', '  First body.', '',
    '- **Beta**', '', '  Second body.', '  More.', '',
    '- **Gamma**', '', '  What this card is about.',
  ].join('\n'), lw[0] && JSON.stringify(lw[0].text));

  // ── Esc cancels without writing
  lclick(L.doc.querySelectorAll('ul.cards > li')[0]);
  await tick();
  L.posted.length = 0;
  L.doc.querySelector('.mdstyled-designer-title-input').dispatchEvent(
    new L.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Esc closes the designer', !L.doc.querySelector('.mdstyled-card-designer'));
  check('without saving', L.posted.filter(m => m.type === 'mdstyled.saveBlock').length === 0);

  // ── a card outside any grid still offers Add card, but no column control
  fs.writeFileSync(TMP + '/single.md', '# T\n\n<!-- .card -->\n> ### Lone card\n>\n> Body.\n');
  const S = await open(TMP + '/single.md');
  const d2 = S.doc;
  d2.querySelector('.mdstyled-edit-toggle').dispatchEvent(new S.window.MouseEvent('click', { bubbles: true }));
  d2.querySelector('blockquote.mdstyled-editable').dispatchEvent(new S.window.MouseEvent('click', { bubbles: true }));
  await tick();
  const ed3 = d2.querySelector('.mdstyled-block-editor');
  check('a lone card opens the ordinary editor', !d2.querySelector('.mdstyled-card-designer'));
  check('it offers Add card', !!ed3.querySelector('.mdstyled-card-add'));
  check('but has no column control', !ed3.querySelector('.mdstyled-col-group'));
  check('and says it is on its own',
    ed3.querySelector('.mdstyled-card-count').textContent === 'Single card');

  S.posted.length = 0;
  ed3.querySelector('.mdstyled-card-add').dispatchEvent(new S.window.MouseEvent('click', { bubbles: true }));
  await tick();
  const sw = S.posted.filter(m => m.type === 'mdstyled.saveBlock');
  check('Add card turns it into a grid in one write',
    sw.length === 1 && sw[0].startLine === 2 && sw[0].endLine === 6 &&
    sw[0].text.startsWith('<div class="mdstyled-cards cols-2">\n\n<!-- .card -->\n> ### Lone card') &&
    sw[0].text.endsWith('> ### New card\n>\n> What this card is about.\n\n</div>'), JSON.stringify(sw[0]));

  // ── a plain block gets none of this
  fs.writeFileSync(TMP + '/plain.md', '# T\n\nJust a paragraph.\n');
  const plainRaw = await e.renderMdStyled(TMP + '/plain.md', [], undefined, {
    styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')],
  });
  const dom3 = new JSDOM(sanitizeHtml(plainRaw, SANITIZE), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.acquireVsCodeApi = () => ({
        postMessage: m => setTimeout(() => win.postMessage({
          type: 'mdstyled.result', id: m.id, ok: true,
          html: m.markdown !== undefined ? e.renderMarkdownFragment(m.markdown) : undefined,
        }, '*'), 0),
        getState: () => ({}), setState: () => {},
      });
    },
  });
  await new Promise(r => dom3.window.addEventListener('load', r));
  await tick();
  const d3 = dom3.window.document;
  d3.querySelector('.mdstyled-edit-toggle').dispatchEvent(new dom3.window.MouseEvent('click', { bubbles: true }));
  d3.querySelector('p.mdstyled-editable').dispatchEvent(new dom3.window.MouseEvent('click', { bubbles: true }));
  await tick();
  check('a plain paragraph has no card controls',
    !d3.querySelector('.mdstyled-block-editor .mdstyled-card-bar'));

  check('no uncaught JS errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error('FAILED:', err); process.exit(1); });
