// Table designer: a table is edited as a grid of cells - header, rows, columns and
// alignment - and written back as a padded GFM table.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { JSDOM } = require('jsdom');
const sanitizeHtml = require('sanitize-html');
const e = require('./helpers/engine');

const T = path.join(__dirname, '..', 'templates', 'editable-light');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mdstyled-tables-'));

const SANITIZE = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['html', 'head', 'body', 'meta', 'style', 'script', 'section', 'input', 'svg', 'path']),
  allowedAttributes: {
    '*': ['id', 'class', 'style', 'data-mdstyled-line', 'data-mdstyled-uri'],
    'svg': ['viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width'], 'path': ['d'],
  },
  allowVulnerableTags: true,
};

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  cond ? pass++ : fail++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
};
const tick = () => new Promise(r => setTimeout(r, 20));
const errors = [];

async function open(markdown, opts = {}) {
  const file = path.join(TMP, 'doc-' + Math.random().toString(36).slice(2) + '.md');
  fs.writeFileSync(file, markdown);
  const raw = await e.renderMdStyled(file, [], undefined, {
    styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')],
  });
  const posted = [];
  let state = opts.state || {};
  const dom = new JSDOM(sanitizeHtml(raw, SANITIZE), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.acquireVsCodeApi = () => ({
        postMessage: m => {
          posted.push(m);
          setTimeout(() => win.postMessage({ type: 'mdstyled.result', id: m.id, ok: true }, '*'), 0);
        },
        getState: () => JSON.parse(JSON.stringify(state)), setState: next => { state = next; },
      });
      if (opts.beforeParse) opts.beforeParse(win);
    },
  });
  dom.window.addEventListener('error', ev => errors.push(ev.message || String(ev.error)));
  await new Promise(r => dom.window.addEventListener('load', r));
  await tick();
  const { window } = dom;
  const doc = window.document;
  const click = node => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  const type = (node, value) => { node.value = value; node.dispatchEvent(new window.Event('input', { bubbles: true })); };
  const key = (node, k, opts = {}) => node.dispatchEvent(new window.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true }, opts)));
  const saves = () => posted.filter(m => m.type === 'mdstyled.saveBlock');
  if (!opts.state || !opts.state.editMode) click(doc.querySelector('.mdstyled-edit-toggle'));
  return { window, doc, posted, click, type, key, saves, state: () => state };
}

(async () => {
  // ── the data layer, pulled out of the built template
  const src = fs.readFileSync(path.join(__dirname, '..', 'scripts', 'editable-template', 'tables.js'), 'utf8');
  const lib = new Function(src + '; return { parseMarkdownTable, serializeMarkdownTable };')();

  const parsed = lib.parseMarkdownTable('| Name | Note |\n|:--|:-:|\n| a \\| b | `x` |\n| short |');
  check('parses header, alignment and rows',
    parsed && parsed.header.join() === 'Name,Note' && parsed.align.join() === 'left,center');
  check('an escaped pipe is part of the cell', parsed && parsed.rows[0][0] === 'a | b', parsed && parsed.rows[0][0]);
  check('a short row is padded out', parsed && parsed.rows[1].length === 2 && parsed.rows[1][1] === '');
  check('pipes are escaped again on the way out',
    lib.serializeMarkdownTable(parsed).split('\n')[2].startsWith('| a \\| b |'), lib.serializeMarkdownTable(parsed));
  check('alignment is written back',
    lib.serializeMarkdownTable(parsed).split('\n')[1] === '| :----- | :--: |', lib.serializeMarkdownTable(parsed).split('\n')[1]);
  check('a row wider than the header is not the designer\'s to touch',
    lib.parseMarkdownTable('| A |\n| --- |\n| 1 | 2 |') === null);
  check('no delimiter row, no table', lib.parseMarkdownTable('| A |\n| B |') === null);

  // ── the designer
  const TABLE = '# T\n\n| Name | Role |\n|---|---|\n| Ada | Eng |\n| Bob | Ops |\n\nAfter.\n';
  const P = await open(TABLE);
  P.click(P.doc.querySelectorAll('.table-wrapper tbody td')[3]);
  await tick();
  const ed = P.doc.querySelector('.mdstyled-table-designer');
  check('clicking a table opens the table designer', !!ed);
  check('the table itself is hidden while designing',
    P.doc.querySelector('.table-wrapper').classList.contains('mdstyled-editable-hidden'));
  const cell = (r, c) => ed.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
  check('every cell is an input, header included',
    ed.querySelectorAll('.mdstyled-tdesign-input').length === 6 && cell(-1, 1).value === 'Role' && cell(1, 0).value === 'Bob');
  check('the clicked cell has focus', P.doc.activeElement === cell(1, 1));
  check('it reads out the size', ed.querySelector('.mdstyled-designer-count').textContent === '2 columns × 2 rows',
    ed.querySelector('.mdstyled-designer-count').textContent);

  P.type(cell(-1, 0), 'Person');
  P.type(cell(0, 1), 'Engineer');

  const btn = (label, scope = ed) => scope.querySelector(`[aria-label="${label}"]`);
  P.click(Array.from(ed.querySelectorAll('.mdstyled-designer-bar .mdstyled-edit-btn')).find(b => b.textContent === 'Column'));
  check('Column adds a column on the right, focused on its header',
    ed.querySelectorAll('thead .mdstyled-tdesign-header input').length === 3 && P.doc.activeElement === cell(-1, 2));
  P.type(cell(-1, 2), 'Team');
  P.click(ed.querySelectorAll('.mdstyled-tdesign-coltools')[2].querySelector('[aria-label="Align right"]'));
  check('alignment shows in the cells', cell(0, 2).style.textAlign === 'right');
  P.click(ed.querySelectorAll('.mdstyled-tdesign-coltools')[2].querySelector('[aria-label="Move column left"]'));
  check('columns move', cell(-1, 1).value === 'Team' && cell(-1, 2).value === 'Role');

  P.click(ed.querySelectorAll('tbody tr')[0].querySelector('[aria-label="Insert row below"]'));
  check('Insert row below adds an empty row in place', ed.querySelectorAll('tbody tr').length === 3 && cell(1, 0).value === '');
  P.type(cell(1, 0), 'Cy');
  P.click(ed.querySelectorAll('tbody tr')[2].querySelector('[aria-label="Move row up"]'));
  check('rows move', cell(1, 0).value === 'Bob' && cell(2, 0).value === 'Cy');
  P.click(ed.querySelectorAll('tbody tr')[2].querySelector('[aria-label="Delete row"]'));
  check('rows delete', ed.querySelectorAll('tbody tr').length === 2);

  P.key(cell(1, 0), 'Enter');
  check('Enter on the last row adds a row and moves down',
    ed.querySelectorAll('tbody tr').length === 3 && P.doc.activeElement === cell(2, 0));

  // spreadsheet paste
  const pasteEvent = new P.window.Event('paste', { bubbles: true, cancelable: true });
  pasteEvent.clipboardData = { getData: () => 'Dee\tQA\tTest\tExtra\nEd\tPM\tProd\n' };
  cell(2, 0).dispatchEvent(pasteEvent);
  check('pasting tab-separated cells fills rows and grows columns',
    cell(2, 0).value === 'Dee' && cell(3, 1).value === 'PM' && cell(2, 3).value === 'Extra' &&
    ed.querySelectorAll('thead .mdstyled-tdesign-header input').length === 4);
  P.click(ed.querySelectorAll('.mdstyled-tdesign-coltools')[3].querySelector('[aria-label="Delete column"]'));
  check('columns delete', ed.querySelectorAll('thead .mdstyled-tdesign-header input').length === 3);

  P.posted.length = 0;
  P.click(Array.from(ed.querySelectorAll('.mdstyled-edit-btn')).find(b => b.textContent === 'Save'));
  await tick();
  const w = P.saves();
  check('Save writes the table over its own lines', w.length === 1 && w[0].startLine === 2 && w[0].endLine === 6,
    JSON.stringify(w.map(x => [x.startLine, x.endLine])));
  check('as a padded table with every change', w[0] && w[0].text === [
    '| Person | Team | Role     |',
    '| ------ | ---: | -------- |',
    '| Ada    |      | Engineer |',
    '| Bob    |      | Ops      |',
    '| Dee    | QA   | Test     |',
    '| Ed     | PM   | Prod     |',
  ].join('\n'), w[0] && '\n' + w[0].text);
  check('and closes', !P.doc.querySelector('.mdstyled-table-designer'));
  check('saving remembers where the table was on screen',
    P.state().place && P.state().place.line === 2 && typeof P.state().place.top === 'number',
    JSON.stringify(P.state().place));

  // ── the next render puts the table back in the same place instead of jumping
  const scrolls = [];
  const R2 = await open(TABLE, {
    state: { editMode: true, scrollY: 50, place: { line: 2, top: 120 } },
    beforeParse(win) {
      let y = 0;
      Object.defineProperty(win, 'scrollY', { get: () => y, configurable: true });
      win.scrollTo = (x, next) => { scrolls.push(next); y = next; };
      /* The table sits 520px down the page. */
      win.Element.prototype.getBoundingClientRect = function () {
        const inTable = this.matches && this.matches('.table-wrapper, .table-interactive-controls');
        return { top: inTable ? 520 - y : 0, left: 0, width: 0, height: 0, bottom: 0, right: 0 };
      };
    },
  });
  await new Promise(r => setTimeout(r, 200));
  check('it scrolls so the table is back where it was (520 - 120 = 400)',
    scrolls.length > 0 && scrolls[scrolls.length - 1] === 400, JSON.stringify(scrolls));
  check('and forgets the place once used', !R2.state().place);

  // ── untouched tables are not rewritten, and a class comment is kept
  const Q = await open('# T\n\n<!-- .compact -->\n| A | B |\n|---|---|\n| 1 | 2 |\n');
  Q.click(Q.doc.querySelector('.table-wrapper th'));
  await tick();
  const qed = Q.doc.querySelector('.mdstyled-table-designer');
  check('clicking a header focuses that header cell', Q.doc.activeElement === qed.querySelector('input[data-row="-1"][data-col="0"]'));
  Q.click(Array.from(qed.querySelectorAll('.mdstyled-edit-btn')).find(b => b.textContent === 'Save'));
  await tick();
  check('saving without changes writes nothing', Q.saves().length === 0);

  Q.click(Q.doc.querySelector('.table-wrapper td'));
  await tick();
  const qed2 = Q.doc.querySelector('.mdstyled-table-designer');
  Q.type(qed2.querySelector('input[data-row="0"][data-col="0"]'), 'one');
  Q.click(Array.from(qed2.querySelectorAll('.mdstyled-edit-btn')).find(b => b.textContent === 'Save'));
  await tick();
  const qw = Q.saves();
  check('the class comment stays on the table', qw[0] && qw[0].startLine === 2 &&
    qw[0].text.startsWith('<!-- .compact -->\n| A   | B   |'), qw[0] && JSON.stringify(qw[0].text));

  // ── Esc cancels
  Q.click(Q.doc.querySelector('.table-wrapper td'));
  await tick();
  Q.posted.length = 0;
  Q.key(Q.doc.querySelector('.mdstyled-tdesign-input'), 'Escape');
  check('Esc closes without saving', !Q.doc.querySelector('.mdstyled-table-designer') && Q.saves().length === 0);

  // ── irregular tables fall back to Markdown
  const R = await open('# T\n\n| A |\n|---|\n| 1 | 2 |\n');
  R.click(R.doc.querySelector('.table-wrapper td'));
  await tick();
  check('a table the designer cannot round-trip opens as Markdown',
    !R.doc.querySelector('.mdstyled-table-designer') && !R.doc.querySelector('.mdstyled-block-editor .mdstyled-edit-textarea').hidden);

  // ── a preview opened by MdStyled Edit starts with the editor on, the file untouched
  {
    const file = path.join(TMP, 'start-editing.md');
    fs.writeFileSync(file, '# Plain\n\nNo template declared.\n');
    const light = path.join(__dirname, '..', 'templates', 'editable-light');
    const raw = await e.renderMdStyled(file, [], undefined, undefined, true, false, {
      templateOverride: { styles: [path.join(light, 'style.css')], scripts: [path.join(light, 'script.js')] },
      startEditing: true,
    });
    const dom = new JSDOM(sanitizeHtml(raw, SANITIZE), {
      runScripts: 'dangerously', pretendToBeVisual: true,
      beforeParse(win) {
        let state = {};
        win.acquireVsCodeApi = () => ({ postMessage() {}, getState: () => state, setState: s => { state = s; } });
      },
    });
    await new Promise(r => dom.window.addEventListener('load', r));
    await tick();
    const d = dom.window.document;
    check('MdStyled Edit: the page opens already in edit mode',
      d.body.classList.contains('mdstyled-edit-mode') && !!d.querySelector('.mdstyled-edit-toggle.active'));
    check('MdStyled Edit: the template is applied though the file declares none', !!d.querySelector('.mdstyled-edit-bar'));
    check('MdStyled Edit: the file is untouched', fs.readFileSync(file, 'utf8') === '# Plain\n\nNo template declared.\n');
  }

  check('no uncaught JS errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error('FAILED:', err); process.exit(1); });
