const fs = require('fs');
const os = require('os');
const path = require('path');
const { JSDOM } = require('jsdom');
const sanitizeHtml = require('sanitize-html');
const e = require('./helpers/engine');

const REPO = require('path').join(__dirname, '..');
const TMP = fs.mkdtempSync(require('path').join(os.tmpdir(), 'mdstyled-test-'));
const T = path.join(REPO, 'templates', 'editable-light');
const MD = TMP + '/ui.md';

fs.writeFileSync(MD, [
  '# Title', '', 'A paragraph with **bold**.', '', '- one', '- two', '',
  '| A | B |', '| --- | --- |', '| 1 | 2 |', ''
].join('\n'));

const SANITIZE = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['html','head','body','meta','style','script','section','input','svg','path']),
  allowedAttributes: {
    '*': ['id','class','style','data-mdstyled-line','data-mdstyled-uri'],
    'a': ['href','target','rel','title'], 'input': ['type','checked','disabled','class'],
    'td': ['colspan','rowspan'], 'th': ['colspan','rowspan'], 'script': ['src','type'],
    'meta': ['charset','name','content','http-equiv'],
  },
  allowedSchemes: ['http','https','data','vscode-webview-resource'],
  allowVulnerableTags: true,
};

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  cond ? pass++ : fail++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
};
const click = (win, node) => node.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
const tick = () => new Promise(r => setTimeout(r, 20));

(async () => {
  const raw = await e.renderMdStyled(MD, [], undefined, {
    styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')],
  });
  const html = sanitizeHtml(raw, SANITIZE);

  const posted = [];
  let stateStore = {};
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(window) {
      window.acquireVsCodeApi = () => ({
        postMessage: m => { posted.push(m); respond(window, m); },
        getState: () => stateStore,
        setState: s => { stateStore = s; },
      });
    },
  });
  // stand in for MdStyledPreviewProvider.handleMessage
  function respond(window, msg) {
    setTimeout(() => {
      if (msg.type === 'mdstyled.render') {
        window.postMessage({ type: 'mdstyled.result', id: msg.id, ok: true, html: e.renderMarkdownFragment(msg.markdown) }, '*');
      } else {
        window.postMessage({ type: 'mdstyled.result', id: msg.id, ok: true }, '*');
      }
    }, 0);
  }

  const { window } = dom;
  const doc = window.document;
  const errors = [];
  window.addEventListener('error', ev => errors.push(ev.message || String(ev.error)));
  await new Promise(r => window.addEventListener('load', r));
  await tick();

  const bar = doc.querySelector('.mdstyled-edit-bar');
  check('toolbar is just Edit / Source', bar && bar.children.length === 2,
    bar && Array.from(bar.children).map(b => b.textContent).join(' | '));

  // ── insert lines sit between the blocks, one before the first and one after each
  const lines = doc.querySelectorAll('.mdstyled-insert-line');
  const blocks = doc.querySelectorAll('.mdstyled-editable');
  check('an insert line per gap (blocks + 1)', lines.length === blocks.length + 1,
    lines.length + ' lines for ' + blocks.length + ' blocks');
  check('first insert line sits directly above the first block',
    lines[0].nextElementSibling.contains(doc.querySelector('h1.mdstyled-editable')),
    lines[0].nextElementSibling.className);
  check('insert lines carry a + button', Array.from(lines).every(l => l.querySelector('.mdstyled-insert-plus')));

  click(window, doc.querySelector('.mdstyled-edit-toggle'));
  check('edit mode on', doc.body.classList.contains('mdstyled-edit-mode'));

  // ── open a paragraph: rich surface
  click(window, doc.querySelector('p.mdstyled-editable'));
  await tick();
  const ed = doc.querySelector('.mdstyled-block-editor');
  check('block editor opened', !!ed);
  const groups = ed.querySelectorAll('.mdstyled-tool-group');
  check('toolbar has a block-type group and a formatting group', groups.length === 2);
  check('block types are icon buttons', groups[0].children.length === 9,
    Array.from(groups[0].children).map(b => b.getAttribute('aria-label')).join(', '));
  check('formatting has bold/italic/strike/code/link/colour/clear', groups[1].children.length === 7,
    Array.from(groups[1].children).map(b => b.getAttribute('aria-label')).join(', '));
  check('tools render SVG icons', ed.querySelectorAll('.mdstyled-tool svg.mdstyled-icon').length >= 12,
    ed.querySelectorAll('.mdstyled-tool svg.mdstyled-icon').length + ' icons');
  check('colour picker offers text and highlight swatches',
    ed.querySelectorAll('.mdstyled-swatch').length === 12);
  check('has Save / Cancel / Delete', ['Save','Cancel','Delete'].every(l =>
    Array.from(ed.querySelectorAll('.mdstyled-edit-actions button')).some(b => b.textContent === l)));

  const rich = ed.querySelector('.mdstyled-rich');
  const ta = ed.querySelector('.mdstyled-edit-textarea');
  check('rich surface visible, textarea hidden', !rich.hidden && ta.hidden);
  check('rich surface rendered from markdown', /<strong>bold<\/strong>/.test(rich.innerHTML), rich.innerHTML.trim());
  const typeBtn = label => Array.from(groups[0].children).find(b => b.getAttribute('aria-label') === label);
  check('Text is the active block type', typeBtn('Text').classList.contains('active'),
    Array.from(groups[0].children).filter(b => b.classList.contains('active')).map(b => b.getAttribute('aria-label')).join());

  // ── toggle to markdown source
  click(window, ed.querySelector('.mdstyled-mode-toggle'));
  await tick();
  check('markdown mode shows source', !ta.hidden && rich.hidden && ta.value === 'A paragraph with **bold**.', JSON.stringify(ta.value));
  check('toggle now says Rich text', ed.querySelector('.mdstyled-mode-toggle').textContent === 'Rich text');

  // ── bold/italic must actually toggle, not keep stacking markers
  const fmtBtn = label => Array.from(groups[1].children).find(b => b.getAttribute('aria-label') === label);

  ta.setSelectionRange(2, 11);
  click(window, fmtBtn('Bold'));
  check('bold wraps the selection', ta.value === 'A **paragraph** with **bold**.', JSON.stringify(ta.value));
  check('bold now reads as active', fmtBtn('Bold').getAttribute('aria-pressed') === 'true');

  click(window, fmtBtn('Bold'));
  check('bold again unwraps it', ta.value === 'A paragraph with **bold**.', JSON.stringify(ta.value));
  check('bold no longer active', fmtBtn('Bold').getAttribute('aria-pressed') === 'false');

  // markers just outside the selection also come off
  ta.value = 'A **paragraph** here.';
  ta.setSelectionRange(4, 13);
  click(window, fmtBtn('Bold'));
  check('bold unwraps markers outside the selection', ta.value === 'A paragraph here.', JSON.stringify(ta.value));

  ta.value = 'A paragraph here.';
  ta.setSelectionRange(2, 11);
  click(window, fmtBtn('Italic'));
  check('italic wraps with one marker', ta.value === 'A *paragraph* here.', JSON.stringify(ta.value));
  click(window, fmtBtn('Italic'));
  check('italic toggles back off', ta.value === 'A paragraph here.', JSON.stringify(ta.value));

  // colour writes a span the serializer keeps
  ta.value = 'A paragraph here.';
  ta.setSelectionRange(2, 11);
  click(window, fmtBtn('Colour'));
  const swatch = ed.querySelector('.mdstyled-swatch');
  click(window, swatch);
  check('colour wraps the selection in a styled span',
    /^A <span style="color: #[0-9a-f]{6}">paragraph<\/span> here\.$/.test(ta.value), JSON.stringify(ta.value));

  ta.value = 'A paragraph with **bold**.';

  // ── change block type from the icon buttons
  click(window, typeBtn('Heading 2'));
  await tick();
  check('Heading 2 rewrites the markdown', ta.value === '## A paragraph with **bold**.', JSON.stringify(ta.value));
  check('Heading 2 is now the active type', typeBtn('Heading 2').classList.contains('active'));

  click(window, typeBtn('Checklist'));
  await tick();
  check('Checklist rewrites the markdown', ta.value === '- [ ] A paragraph with **bold**.', JSON.stringify(ta.value));

  // ── save
  ta.value = 'Edited **text**.';
  posted.length = 0;
  click(window, Array.from(ed.querySelectorAll('.mdstyled-edit-actions button')).find(b => b.textContent === 'Save'));
  await tick();
  check('save posts the right range + text', posted[0] && posted[0].startLine === 2 && posted[0].endLine === 3 &&
    posted[0].text === 'Edited **text**.' && posted[0].original === 'A paragraph with **bold**.', JSON.stringify(posted[0]));
  check('editor closed after save', !doc.querySelector('.mdstyled-block-editor'));

  // ── table opens as markdown, rich toggle disabled
  click(window, doc.querySelector('.table-wrapper.mdstyled-editable'));
  await tick();
  const ted = doc.querySelector('.mdstyled-block-editor');
  check('table opens in markdown mode', !ted.querySelector('.mdstyled-edit-textarea').hidden);
  check('table markdown is exact', ted.querySelector('.mdstyled-edit-textarea').value === '| A | B |\n| --- | --- |\n| 1 | 2 |');
  check('rich toggle disabled for tables', ted.querySelector('.mdstyled-mode-toggle').disabled);

  // ── delete needs confirming
  const del = Array.from(ted.querySelectorAll('.mdstyled-edit-actions button')).find(b => b.textContent === 'Delete');
  posted.length = 0;
  click(window, del);
  check('first Delete click only arms', posted.length === 0 && del.textContent === 'Confirm delete');
  click(window, del);
  await tick();
  check('second click deletes block + its trailing blank line', posted[0] && posted[0].text === '' &&
    posted[0].startLine === 7 && posted[0].endLine === 11, JSON.stringify(posted[0]));

  // ── insert menu, opened from the line above the list (not a button at the end)
  const listBlock = doc.querySelector('ul.mdstyled-editable');
  const lineAboveList = listBlock.previousElementSibling;
  check('the gap above the list is an insert line', lineAboveList.classList.contains('mdstyled-insert-line'));
  click(window, lineAboveList.querySelector('.mdstyled-insert-plus'));
  await tick();
  const menu = doc.querySelector('.mdstyled-insert-menu');
  check('insert menu opens', menu && !menu.hidden);
  const menuItems = menu.querySelectorAll('.mdstyled-insert-item');
  check('insert menu is grouped', menu.querySelectorAll('.mdstyled-insert-title').length === 4,
    Array.from(menu.querySelectorAll('.mdstyled-insert-title')).map(t => t.textContent).join(', '));
  check('insert menu offers callouts and cards', menuItems.length === 17,
    Array.from(menuItems).map(b => b.getAttribute('aria-label')).join(', '));
  check('insert items have icons', menu.querySelectorAll('.mdstyled-insert-item svg, .mdstyled-insert-item .mdstyled-tool-glyph').length === 17);

  posted.length = 0;
  click(window, Array.from(menuItems).find(b => b.getAttribute('aria-label') === 'Checklist'));
  await tick();
  check('insert lands exactly at that gap, not at the end', posted[0] && posted[0].startLine === posted[0].endLine &&
    posted[0].startLine === 3 && posted[0].text === '\n- [ ] First task\n- [ ] Second task', JSON.stringify(posted[0]));
  check('menu closed after insert', doc.querySelector('.mdstyled-insert-menu').hidden);
  check('focusLine remembered for after the reload', stateStore.focusLine === 4, JSON.stringify(stateStore.focusLine));

  // ── the last insert line appends at the end of the document
  const allLines = doc.querySelectorAll('.mdstyled-insert-line');
  posted.length = 0;
  click(window, allLines[allLines.length - 1].querySelector('.mdstyled-insert-plus'));
  await tick();
  click(window, Array.from(doc.querySelectorAll('.mdstyled-insert-menu .mdstyled-insert-item')).find(b => b.getAttribute('aria-label') === 'Divider'));
  await tick();
  check('last insert line appends after the last block', posted[0] && posted[0].startLine === 10,
    JSON.stringify(posted[0]));

  // ── ticking a checkbox writes it back
  fs.writeFileSync(TMP + '/task.md', '# T\n\n- [ ] one\n- [ ] two\n');
  const taskRaw = await e.renderMdStyled(TMP + '/task.md', [], undefined, {
    styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')],
  });
  const taskPosted = [];
  const dom3 = new JSDOM(sanitizeHtml(taskRaw, SANITIZE), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.acquireVsCodeApi = () => ({
        postMessage: m => { taskPosted.push(m); respond(win, m); },
        getState: () => ({}), setState: () => {},
      });
    },
  });
  await new Promise(r => dom3.window.addEventListener('load', r));
  await tick();
  const boxes = dom3.window.document.querySelectorAll('input[type="checkbox"]');
  check('checkboxes are interactive', boxes.length === 2);
  boxes[1].checked = true;
  boxes[1].dispatchEvent(new dom3.window.Event('change', { bubbles: true }));
  await tick();
  const save = taskPosted.filter(m => m.type === 'mdstyled.saveBlock')[0];
  check('ticking the second box rewrites only that marker',
    save && save.text === '- [ ] one\n- [x] two' && save.startLine === 2 && save.endLine === 4,
    JSON.stringify(save));

  // ── whole-file source editor still there
  click(window, doc.querySelector('.mdstyled-edit-source'));
  const overlay = doc.querySelector('.mdstyled-source-editor');
  check('source editor opens with the whole file', overlay &&
    overlay.querySelector('textarea').value === fs.readFileSync(MD, 'utf8'));

  // ── a reload with focusLine set must reopen that block ready to edit
  const dom2 = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.acquireVsCodeApi = () => ({
        postMessage: m => respond(win, m),
        getState: () => ({ editMode: true, focusLine: 4, scrollY: 0 }),
        setState: () => {},
      });
    },
  });
  await new Promise(r => dom2.window.addEventListener('load', r));
  await tick();
  const reopened = dom2.window.document.querySelector('.mdstyled-block-editor');
  check('reload reopens the block at focusLine', !!reopened);
  check('reopened block holds the right source',
    reopened && /one/.test(reopened.querySelector('.mdstyled-rich').textContent),
    reopened && reopened.querySelector('.mdstyled-rich').textContent.trim());
  check('reload restores edit mode', dom2.window.document.body.classList.contains('mdstyled-edit-mode'));

  // ── a block whose source style we cannot reproduce opens as Markdown, not rich
  fs.writeFileSync(TMP + '/wrap.md', '# T\n\nThis paragraph is wrapped\nacross two source lines.\n');
  const wrapRaw = await e.renderMdStyled(TMP + '/wrap.md', [], undefined, {
    styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')],
  });
  const dom4 = new JSDOM(sanitizeHtml(wrapRaw, SANITIZE), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.acquireVsCodeApi = () => ({ postMessage: m => respond(win, m), getState: () => ({}), setState: () => {} });
    },
  });
  await new Promise(r => dom4.window.addEventListener('load', r));
  await tick();
  const d4 = dom4.window.document;
  click(dom4.window, d4.querySelector('.mdstyled-edit-toggle'));
  click(dom4.window, d4.querySelector('p.mdstyled-editable'));
  await tick();
  const wrapEd = d4.querySelector('.mdstyled-block-editor');
  check('hard-wrapped block opens as Markdown, not rich',
    wrapEd && !wrapEd.querySelector('.mdstyled-edit-textarea').hidden && wrapEd.querySelector('.mdstyled-rich').hidden);
  check('and keeps its original line break',
    wrapEd && wrapEd.querySelector('.mdstyled-edit-textarea').value === 'This paragraph is wrapped\nacross two source lines.',
    wrapEd && JSON.stringify(wrapEd.querySelector('.mdstyled-edit-textarea').value));

  check('no uncaught JS errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error('FAILED:', err); process.exit(1); });
