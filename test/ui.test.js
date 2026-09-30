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
  check('toolbar carries Back, Edit, zoom, Export and Source',
    bar && bar.querySelectorAll('.mdstyled-edit-btn, .mdstyled-zoom').length === 5,
    bar && Array.from(bar.children).map(b => b.textContent).join(' | '));
  check('the toolbar splits into a left and right group',
    !!bar.querySelector('.mdstyled-bar-spacer'));
  check('bar labels are elements, so they can collapse to icons',
    bar.querySelectorAll('.mdstyled-btn-label').length === 4,
    Array.from(bar.querySelectorAll('.mdstyled-btn-label')).map(l => l.textContent).join(', '));
  check('the export button offers both formats, not just PDF',
    bar.querySelector('.mdstyled-edit-export .mdstyled-btn-label').textContent === 'Export',
    bar.querySelector('.mdstyled-edit-export .mdstyled-btn-label').textContent);
  check('the right group is separated by a divider', !!bar.querySelector('.mdstyled-bar-divider'));
  check('zoom is one segmented control',
    bar.querySelector('.mdstyled-zoom').children.length === 3);
  check('Back is hidden until a link has been followed', doc.querySelector('.mdstyled-edit-back').hidden);

  // ── zoom
  const zoomIn = doc.querySelector('.mdstyled-zoom-in');
  const zoomOut = doc.querySelector('.mdstyled-zoom-out');
  const zoomLabel = doc.querySelector('.mdstyled-zoom-level');
  const rootEl = doc.querySelector('.mdstyled-root');
  check('zoom starts at 100%', zoomLabel.textContent === '100%' && !rootEl.style.zoom);
  click(window, zoomIn);
  check('zoom in scales the document', rootEl.style.zoom === '1.1' && zoomLabel.textContent === '110%',
    zoomLabel.textContent + ' / ' + rootEl.style.zoom);
  check('zoom is remembered across a re-render', stateStore.zoom === 1.1, JSON.stringify(stateStore.zoom));
  click(window, zoomOut);
  click(window, zoomOut);
  check('zoom out steps back down', zoomLabel.textContent === '90%', zoomLabel.textContent);
  click(window, zoomLabel);
  check('clicking the level resets to 100%', zoomLabel.textContent === '100%' && !rootEl.style.zoom);

  // ── following a link to another Markdown file
  fs.writeFileSync(TMP + '/other.md', '# Other\n');
  const linkDoc = doc.createElement('p');
  linkDoc.innerHTML = '<a href="./other.md">go</a>';
  rootEl.appendChild(linkDoc);
  posted.length = 0;
  click(window, linkDoc.querySelector('a'));
  await tick();
  check('clicking an .md link asks the extension to navigate',
    posted[0] && posted[0].type === 'mdstyled.navigate' && posted[0].href === './other.md',
    JSON.stringify(posted[0]));

  const httpLink = doc.createElement('p');
  httpLink.innerHTML = '<a href="https://example.com/page.md">out</a>';
  rootEl.appendChild(httpLink);
  posted.length = 0;
  click(window, httpLink.querySelector('a'));
  await tick();
  check('an absolute URL is left alone', posted.length === 0, JSON.stringify(posted));

  // ── insert lines sit between the blocks, one before the first and one after each
  const lines = doc.querySelectorAll('.mdstyled-insert-line');
  const blocks = doc.querySelectorAll('.mdstyled-editable');
  check('an insert line per gap (blocks + 1)', lines.length === blocks.length + 1,
    lines.length + ' lines for ' + blocks.length + ' blocks');
  check('first insert line sits directly above the first block',
    lines[0].nextElementSibling.contains(doc.querySelector('h1.mdstyled-editable')),
    lines[0].nextElementSibling.className);
  check('insert lines carry a + button', Array.from(lines).every(l => l.querySelector('.mdstyled-insert-plus')));
  check('the + is an icon, matching the toolbar',
    !!lines[0].querySelector('.mdstyled-insert-plus svg.mdstyled-icon'));

  click(window, doc.querySelector('.mdstyled-edit-toggle'));
  check('edit mode on', doc.body.classList.contains('mdstyled-edit-mode'));
  check('the Edit button offers the way back to Preview',
    doc.querySelector('.mdstyled-edit-toggle .mdstyled-btn-label').textContent === 'Preview',
    doc.querySelector('.mdstyled-edit-toggle .mdstyled-btn-label').textContent);
  check('and is styled as the active action',
    doc.querySelector('.mdstyled-edit-toggle').classList.contains('active'));
  check('its icon becomes an eye, matching the label',
    doc.querySelector('.mdstyled-edit-toggle svg path').getAttribute('d').startsWith('M2 12s'),
    doc.querySelector('.mdstyled-edit-toggle svg path').getAttribute('d').slice(0, 12));

  // ── open a paragraph: rich surface
  click(window, doc.querySelector('p.mdstyled-editable'));
  await tick();
  const ed = doc.querySelector('.mdstyled-block-editor');
  check('block editor opened', !!ed);
  const groups = ed.querySelectorAll('.mdstyled-tool-group');
  check('toolbar has a block-type group and a formatting group', groups.length === 2);
  // the two most-used block types stay on the bar, the other seven live in the dropdown
  const typeSelect = ed.querySelector('.mdstyled-select');
  const typeMenu = ed.querySelector('.mdstyled-select-menu');
  check('block group is a dropdown plus two quick icons',
    !!typeSelect && groups[0].querySelectorAll('.mdstyled-tool').length === 2,
    Array.from(groups[0].querySelectorAll('.mdstyled-tool')).map(b => b.getAttribute('aria-label')).join(', '));
  const menuLabels = Array.from(typeMenu.querySelectorAll('.mdstyled-select-item'))
    .map(b => b.textContent.trim().replace(/^H[1-6]/, ''));
  check('the dropdown is split into Turn into / Style',
    Array.from(typeMenu.querySelectorAll('.mdstyled-select-title')).map(t => t.textContent).join('|') === 'Turn into|Style');
  check('every default Markdown block is offered',
    ['Text', 'Heading 1', 'Heading 2', 'Heading 3', 'Heading 4', 'Heading 5', 'Heading 6',
     'Bullet list', 'Numbered list', 'Checklist', 'Quote', 'Code block', 'Table']
      .every(l => menuLabels.includes(l)),
    menuLabels.join(', '));
  check('there is one card style - the designer\'s card',
    !['Half card', 'Doc card', 'Cards grid'].some(l => menuLabels.includes(l)), menuLabels.join(', '));
  check('every styled template component is offered',
    ['Note', 'Warning', 'Danger', 'Success'].every(l => menuLabels.includes(l)),
    menuLabels.join(', '));
  check('Divider, Card, Hero, Endpoint, Lead paragraph and Steps are not in the dropdown',
    !['Divider', 'Card', 'Hero', 'Endpoint', 'Lead paragraph', 'Steps'].some(l => menuLabels.includes(l)),
    menuLabels.join(', '));
  check('every style left in the dropdown applies to a paragraph',
    Array.from(typeMenu.querySelectorAll('.mdstyled-select-item')).filter(b => b.disabled).map(b => b.textContent.trim()).join(', ') === 'No style',
    Array.from(typeMenu.querySelectorAll('.mdstyled-select-item')).filter(b => b.disabled).map(b => b.textContent.trim()).join(', '));
  check('the dropdown reads out the current block type',
    typeSelect.querySelector('.mdstyled-select-label').textContent === 'Text',
    typeSelect.querySelector('.mdstyled-select-label').textContent);
  check('the dropdown starts closed', typeMenu.hidden);
  click(window, typeSelect);
  check('clicking it opens the menu', !typeMenu.hidden && typeSelect.getAttribute('aria-expanded') === 'true');
  check('the current type is marked in the menu',
    Array.from(typeMenu.children).filter(b => b.classList.contains('active')).map(b => b.textContent.trim()).join() === 'Text');

  check('formatting has bold/italic/strike/code/link/colour/emoji/clear', groups[1].children.length === 8,
    Array.from(groups[1].children).map(b => b.getAttribute('aria-label')).join(', '));
  check('tools render SVG icons', ed.querySelectorAll('svg.mdstyled-icon').length >= 12,
    ed.querySelectorAll('svg.mdstyled-icon').length + ' icons');
  check('colour picker offers text and highlight swatches',
    ed.querySelectorAll('.mdstyled-swatch').length === 12);
  check('has Save / Cancel / Delete', ['Save','Cancel','Delete'].every(l =>
    Array.from(ed.querySelectorAll('.mdstyled-edit-actions button')).some(b => b.textContent === l)));

  const rich = ed.querySelector('.mdstyled-rich');
  const ta = ed.querySelector('.mdstyled-edit-textarea');
  check('rich surface visible, textarea hidden', !rich.hidden && ta.hidden);
  check('rich surface rendered from markdown', /<strong>bold<\/strong>/.test(rich.innerHTML), rich.innerHTML.trim());
  const typeItem = label => Array.from(typeMenu.children).find(b => b.textContent.trim().endsWith(label));
  check('Text is the active block type', typeItem('Text').classList.contains('active'),
    Array.from(typeMenu.children).filter(b => b.classList.contains('active')).map(b => b.textContent.trim()).join());

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

  // ── change block type: the less-used ones from the dropdown
  click(window, typeItem('Heading 2'));
  await tick();
  check('Heading 2 rewrites the markdown', ta.value === '## A paragraph with **bold**.', JSON.stringify(ta.value));
  check('Heading 2 is now the active type', typeItem('Heading 2').classList.contains('active'));
  check('the dropdown label follows the block type',
    typeSelect.querySelector('.mdstyled-select-label').textContent === 'Heading 2',
    typeSelect.querySelector('.mdstyled-select-label').textContent);
  check('picking from the dropdown closes it', typeMenu.hidden);

  // ── and the most-used ones straight from the bar
  const quick = label => Array.from(groups[0].querySelectorAll('.mdstyled-tool'))
    .find(b => b.getAttribute('aria-label') === label);
  click(window, quick('Checklist'));
  await tick();
  check('Checklist rewrites the markdown', ta.value === '- [ ] A paragraph with **bold**.', JSON.stringify(ta.value));
  check('the quick Checklist icon lights up', quick('Checklist').classList.contains('active'));

  click(window, quick('Bullet list'));
  await tick();
  check('Bullet list rewrites the markdown', ta.value === '- A paragraph with **bold**.', JSON.stringify(ta.value));

  click(window, typeSelect);
  click(window, typeItem('Heading 5'));
  await tick();
  check('Heading 5 rewrites the markdown', ta.value === '##### A paragraph with **bold**.', JSON.stringify(ta.value));

  click(window, typeSelect);
  click(window, typeItem('Table'));
  await tick();
  check('Table conversion builds a real table',
    ta.value === '| A paragraph with **bold**. |\n| --- |\n| Cell |', JSON.stringify(ta.value));

  // ── applying a template component writes its class comment above the block
  ta.value = 'A paragraph with **bold**.';
  click(window, typeSelect);
  click(window, typeItem('Note'));
  await tick();
  check('the dropdown reads out the applied style',
    typeSelect.querySelector('.mdstyled-select-label').textContent === 'Note',
    typeSelect.querySelector('.mdstyled-select-label').textContent);

  click(window, typeSelect);
  click(window, Array.from(typeMenu.querySelectorAll('.mdstyled-select-item')).find(b => b.textContent.trim() === 'No style'));
  await tick();
  check('No style clears it again',
    typeSelect.querySelector('.mdstyled-select-label').textContent === 'Text',
    typeSelect.querySelector('.mdstyled-select-label').textContent);

  // ── save
  ta.value = 'Edited **text**.';
  posted.length = 0;
  click(window, Array.from(ed.querySelectorAll('.mdstyled-edit-actions button')).find(b => b.textContent === 'Save'));
  await tick();
  check('save posts the right range + text', posted[0] && posted[0].startLine === 2 && posted[0].endLine === 3 &&
    posted[0].text === 'Edited **text**.' && posted[0].original === 'A paragraph with **bold**.', JSON.stringify(posted[0]));
  check('editor closed after save', !doc.querySelector('.mdstyled-block-editor'));

  // ── a table opens in the table designer
  click(window, doc.querySelector('.table-wrapper.mdstyled-editable'));
  await tick();
  const ted = doc.querySelector('.mdstyled-block-editor');
  check('table opens in the table designer', ted.classList.contains('mdstyled-table-designer'));
  check('its Markdown view is exact', (() => {
    click(window, ted.querySelector('.mdstyled-mode-toggle'));
    const v = ted.querySelector('.mdstyled-edit-textarea').value;
    click(window, ted.querySelector('.mdstyled-mode-toggle'));
    return v === '| A   | B   |\n| --- | --- |\n| 1   | 2   |';
  })(), ted.querySelector('.mdstyled-edit-textarea').value);

  // ── delete needs confirming
  const del = ted.querySelector('.mdstyled-delete');
  check('Delete sits apart from Save, after a spacer',
    !!ted.querySelector('.mdstyled-actions-spacer') &&
    del.previousElementSibling.classList.contains('mdstyled-actions-spacer'));
  check('Delete is icon-only and quiet at rest',
    !del.classList.contains('armed') && !!del.querySelector('svg.mdstyled-icon'));

  posted.length = 0;
  click(window, del);
  check('first Delete click only arms', posted.length === 0 && del.classList.contains('armed'));
  check('and it says what the next click does',
    del.querySelector('.mdstyled-btn-label').textContent === 'Delete?',
    del.querySelector('.mdstyled-btn-label').textContent);
  check('the icon survives arming', !!del.querySelector('svg.mdstyled-icon'));

  // anything else puts the safety back on
  click(window, ted.querySelector('.mdstyled-edit-textarea'));
  check('clicking elsewhere disarms it',
    !del.classList.contains('armed') &&
    del.querySelector('.mdstyled-btn-label').textContent === 'Delete');

  click(window, del);
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
  check('insert menu offers callouts and cards', menuItems.length === 16,
    Array.from(menuItems).map(b => b.getAttribute('aria-label')).join(', '));
  check('the insert menu has a single Cards entry',
    Array.from(menuItems).filter(b => /card/i.test(b.getAttribute('aria-label'))).map(b => b.getAttribute('aria-label')).join() === 'Cards');
  check('insert items have icons', menu.querySelectorAll('.mdstyled-insert-item svg, .mdstyled-insert-item .mdstyled-tool-glyph').length === 16);

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

  // ── a block that already carries a class comment
  fs.writeFileSync(TMP + '/callout.md', '# T\n\n<!-- .note -->\n> Watch out.\n');
  const calloutRaw = await e.renderMdStyled(TMP + '/callout.md', [], undefined, {
    styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')],
  });
  const calloutPosted = [];
  const dom5 = new JSDOM(sanitizeHtml(calloutRaw, SANITIZE), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.acquireVsCodeApi = () => ({
        postMessage: m => { calloutPosted.push(m); respond(win, m); },
        getState: () => ({}), setState: () => {},
      });
    },
  });
  await new Promise(r => dom5.window.addEventListener('load', r));
  await tick();
  const d5 = dom5.window.document;
  click(dom5.window, d5.querySelector('.mdstyled-edit-toggle'));
  click(dom5.window, d5.querySelector('blockquote.mdstyled-editable'));
  await tick();

  const cEd = d5.querySelector('.mdstyled-block-editor');
  check('an existing class comment is recognised',
    cEd.querySelector('.mdstyled-select-label').textContent === 'Note',
    cEd.querySelector('.mdstyled-select-label').textContent);
  check('the editor shows the block, not the comment line',
    cEd.querySelector('.mdstyled-edit-textarea').value === '> Watch out.' ||
    cEd.querySelector('.mdstyled-rich').textContent.trim() === 'Watch out.',
    JSON.stringify(cEd.querySelector('.mdstyled-edit-textarea').value));

  calloutPosted.length = 0;
  click(dom5.window, Array.from(cEd.querySelectorAll('.mdstyled-edit-actions button')).find(b => b.textContent === 'Save'));
  await tick();
  const cSave = calloutPosted.find(m => m.type === 'mdstyled.saveBlock');
  check('saving covers the class line and keeps it',
    cSave && cSave.startLine === 2 && cSave.endLine === 4 &&
    cSave.text === '<!-- .note -->\n> Watch out.' && cSave.original === '<!-- .note -->\n> Watch out.',
    JSON.stringify(cSave));

  // ── an empty file must still offer a way in
  fs.writeFileSync(TMP + '/empty.md', '');
  const emptyRaw = await e.renderMdStyled(TMP + '/empty.md', [], undefined, {
    styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')],
  });
  const emptyPosted = [];
  const dom6 = new JSDOM(sanitizeHtml(emptyRaw, SANITIZE), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.acquireVsCodeApi = () => ({
        postMessage: m => { emptyPosted.push(m); respond(win, m); },
        getState: () => ({}), setState: () => {},
      });
    },
  });
  await new Promise(r => dom6.window.addEventListener('load', r));
  await tick();
  const d6 = dom6.window.document;

  const emptyLine = d6.querySelector('.mdstyled-insert-line-empty');
  check('an empty document offers the same insert line as any gap',
    !!emptyLine && emptyLine.classList.contains('mdstyled-insert-line'));
  check('no bespoke empty-state panel', !d6.querySelector('.mdstyled-empty'));
  check('it is there without turning on Edit first',
    !d6.body.classList.contains('mdstyled-edit-mode'));

  click(dom6.window, emptyLine.querySelector('.mdstyled-insert-plus'));
  await tick();
  check('its + opens the insert menu', !d6.querySelector('.mdstyled-insert-menu').hidden);
  check('and turns on edit mode', d6.body.classList.contains('mdstyled-edit-mode'));

  emptyPosted.length = 0;
  click(dom6.window, Array.from(d6.querySelectorAll('.mdstyled-insert-menu .mdstyled-insert-item'))
    .find(b => b.textContent.trim().endsWith('Heading 1')));
  await tick();
  check('adding to an empty file writes at line 0',
    emptyPosted[0] && emptyPosted[0].startLine === 0 && emptyPosted[0].text === '# Heading',
    JSON.stringify(emptyPosted[0]));

  // ── zoom must take the contents sidebar with it (needs 2+ headings for a TOC)
  fs.writeFileSync(TMP + '/toc.md', '# One\n\ntext\n\n## Two\n\nmore\n');
  const tocRaw = await e.renderMdStyled(TMP + '/toc.md', [], undefined, {
    styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')],
  });
  const dom7 = new JSDOM(sanitizeHtml(tocRaw, SANITIZE), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.acquireVsCodeApi = () => ({
        postMessage: m => respond(win, m), getState: () => ({}), setState: () => {},
      });
    },
  });
  await new Promise(r => dom7.window.addEventListener('load', r));
  await tick();
  const d7 = dom7.window.document;
  const toc = d7.querySelector('.mdstyled-toc');
  const root7 = d7.querySelector('.mdstyled-root');
  check('the page has a contents sidebar', !!toc);

  click(dom7.window, d7.querySelector('.mdstyled-zoom-in'));
  check('zoom scales the document', root7.style.zoom === '1.1', root7.style.zoom);
  check('zoom scales the sidebar too', toc.style.zoom === '1.1', toc.style.zoom);

  click(dom7.window, d7.querySelector('.mdstyled-zoom-level'));
  check('reset clears both', !root7.style.zoom && !toc.style.zoom);

  check('no uncaught JS errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error('FAILED:', err); process.exit(1); });
