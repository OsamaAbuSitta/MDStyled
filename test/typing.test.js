// Typing inside a list: Enter carries the marker down (checkbox included), an empty
// item ends the list, and Tab moves items in and out a level.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { JSDOM } = require('jsdom');
const sanitizeHtml = require('sanitize-html');
const e = require('./helpers/engine');

const REPO = path.join(__dirname, '..');
const T = path.join(REPO, 'templates', 'editable-light');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mdstyled-typing-'));

const SANITIZE = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['html', 'head', 'body', 'meta', 'style', 'script', 'section', 'input']),
  allowedAttributes: { '*': ['id', 'class', 'style', 'data-mdstyled-line', 'data-mdstyled-uri'], 'input': ['type', 'checked', 'disabled', 'class'] },
  allowVulnerableTags: true,
};

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  cond ? pass++ : fail++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
};
const tick = () => new Promise(r => setTimeout(r, 20));

(async () => {
  const md = TMP + '/lists.md';
  fs.writeFileSync(md, '# T\n\n- [ ] first task\n- [x] done task\n');

  const raw = await e.renderMdStyled(md, [], undefined, {
    styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')],
  });

  const dom = new JSDOM(sanitizeHtml(raw, SANITIZE), {
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
  const { window } = dom;
  const doc = window.document;
  const errors = [];
  window.addEventListener('error', ev => errors.push(ev.message || String(ev.error)));
  await new Promise(r => window.addEventListener('load', r));
  await tick();

  const click = node => node.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  click(doc.querySelector('.mdstyled-edit-toggle'));
  click(doc.querySelector('ul.mdstyled-editable'));
  await tick();

  const ed = doc.querySelector('.mdstyled-block-editor');
  const ta = ed.querySelector('.mdstyled-edit-textarea');
  const rich = ed.querySelector('.mdstyled-rich');

  // ── rich surface: a new item must come with a checkbox
  check('checklist opens in the rich surface', !rich.hidden);
  check('checkboxes in the editor are tickable',
    Array.from(rich.querySelectorAll('input[type="checkbox"]')).every(b => !b.disabled),
    Array.from(rich.querySelectorAll('input[type="checkbox"]')).map(b => b.disabled).join());
  check('rendered items already have checkboxes',
    rich.querySelectorAll('li input[type="checkbox"]').length === 2);
  check('checked state is preserved',
    Array.from(rich.querySelectorAll('input[type="checkbox"]')).map(b => b.checked).join() === 'false,true');
  check('checkboxes are atomic to the caret',
    Array.from(rich.querySelectorAll('input[type="checkbox"]')).every(b => b.getAttribute('contenteditable') === 'false'));

  // what the browser leaves behind when Enter splits an <li>
  const list = rich.querySelector('ul');
  const bare = doc.createElement('li');
  bare.textContent = 'typed after Enter';
  list.appendChild(bare);
  rich.dispatchEvent(new window.Event('input', { bubbles: true }));

  check('a new item gets its checkbox back',
    !!bare.querySelector('input[type="checkbox"]'), bare.innerHTML);
  check('the new checkbox starts unchecked', !bare.querySelector('input').checked);
  check('the new item is marked as a task item', bare.classList.contains('task-list-item'));

  const serialized = require('vm').runInNewContext('1'); // keep vm out of it; use the editor's own save path
  const saveBtn = Array.from(ed.querySelectorAll('.mdstyled-edit-actions button')).find(b => b.textContent === 'Save');
  const posted = [];
  window.acquireVsCodeApi = undefined;
  // capture the save by listening on the runtime's request path
  const realSave = window.mdstyled.editor.saveBlock;
  window.mdstyled.editor.saveBlock = function (a, b, text, original) {
    posted.push(text);
    return Promise.resolve({});
  };
  click(saveBtn);
  await tick();
  check('the new item saves as an unchecked task',
    posted[0] === '- [ ] first task\n- [x] done task\n- [ ] typed after Enter', JSON.stringify(posted[0]));
  window.mdstyled.editor.saveBlock = realSave;

  // ── markdown mode: Enter carries the marker down
  const dom2 = new JSDOM(sanitizeHtml(raw, SANITIZE), {
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
  await new Promise(r => dom2.window.addEventListener('load', r));
  await tick();
  const d2 = dom2.window.document;
  d2.querySelector('.mdstyled-edit-toggle').dispatchEvent(new dom2.window.MouseEvent('click', { bubbles: true }));
  d2.querySelector('ul.mdstyled-editable').dispatchEvent(new dom2.window.MouseEvent('click', { bubbles: true }));
  await tick();
  const ed2 = d2.querySelector('.mdstyled-block-editor');
  ed2.querySelector('.mdstyled-mode-toggle').dispatchEvent(new dom2.window.MouseEvent('click', { bubbles: true }));
  await tick();
  const ta2 = ed2.querySelector('.mdstyled-edit-textarea');

  function pressEnter(shift) {
    ta2.dispatchEvent(new dom2.window.KeyboardEvent('keydown', { key: 'Enter', shiftKey: !!shift, bubbles: true, cancelable: true }));
  }
  function pressTab(shift) {
    ta2.dispatchEvent(new dom2.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: !!shift, bubbles: true, cancelable: true }));
  }
  function type(value, caret) {
    ta2.value = value;
    ta2.setSelectionRange(caret === undefined ? value.length : caret, caret === undefined ? value.length : caret);
  }

  type('- [ ] first task');
  pressEnter();
  check('Enter in a checklist adds another checkbox',
    ta2.value === '- [ ] first task\n- [ ] ', JSON.stringify(ta2.value));

  type('- [x] done task');
  pressEnter();
  check('a ticked item still yields an unchecked one',
    ta2.value === '- [x] done task\n- [ ] ', JSON.stringify(ta2.value));

  type('- a bullet');
  pressEnter();
  check('Enter in a bullet list carries the bullet', ta2.value === '- a bullet\n- ', JSON.stringify(ta2.value));

  type('1. first');
  pressEnter();
  check('Enter in a numbered list counts up', ta2.value === '1. first\n2. ', JSON.stringify(ta2.value));

  type('3) third');
  pressEnter();
  check('the numbering style is kept', ta2.value === '3) third\n4) ', JSON.stringify(ta2.value));

  type('> quoted');
  pressEnter();
  check('Enter in a quote carries the marker', ta2.value === '> quoted\n> ', JSON.stringify(ta2.value));

  type('- [ ] ');
  pressEnter();
  check('Enter on an empty item ends the list', ta2.value === '', JSON.stringify(ta2.value));

  type('  - [ ] ');
  pressEnter();
  check('an empty nested item steps out one level instead',
    ta2.value === '- [ ] ', JSON.stringify(ta2.value));

  type('- [ ] first\n- [ ] second', 12);
  const untouched = ta2.value;
  pressEnter();
  check('Enter before the marker is left to the browser', ta2.value === untouched, JSON.stringify(ta2.value));

  type('- [ ] alpha beta', 11);
  pressEnter();
  check('Enter mid-item splits it into two tasks',
    ta2.value === '- [ ] alpha\n- [ ] beta', JSON.stringify(ta2.value));

  type('  - [ ] nested item');
  pressEnter();
  check('indentation carries down a nested list',
    ta2.value === '  - [ ] nested item\n  - [ ] ', JSON.stringify(ta2.value));

  type('Just a paragraph');
  const before = ta2.value;
  pressEnter(true);
  check('Shift+Enter is left to the browser', ta2.value === before);

  type('- [ ] indent me');
  pressTab();
  check('Tab indents a list line', ta2.value === '  - [ ] indent me', JSON.stringify(ta2.value));
  pressTab(true);
  check('Shift+Tab outdents it again', ta2.value === '- [ ] indent me', JSON.stringify(ta2.value));

  // ── the preview is read-only until Edit is on
  const dom3 = new JSDOM(sanitizeHtml(raw, SANITIZE), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.acquireVsCodeApi = () => ({
        postMessage: m => setTimeout(() => win.postMessage({ type: 'mdstyled.result', id: m.id, ok: true }, '*'), 0),
        getState: () => ({}), setState: () => {},
      });
    },
  });
  await new Promise(r => dom3.window.addEventListener('load', r));
  await tick();
  const d3 = dom3.window.document;
  const previewBoxes = () => Array.from(d3.querySelectorAll('.mdstyled-root input[type="checkbox"]'));

  check('preview checkboxes are disabled in view mode',
    previewBoxes().every(b => b.disabled), previewBoxes().map(b => b.disabled).join());
  check('and they say why', previewBoxes()[0].title === 'Turn on Edit to change this', previewBoxes()[0].title);

  d3.querySelector('.mdstyled-edit-toggle').dispatchEvent(new dom3.window.MouseEvent('click', { bubbles: true }));
  check('turning on Edit makes them tickable',
    previewBoxes().every(b => !b.disabled), previewBoxes().map(b => b.disabled).join());

  d3.querySelector('.mdstyled-edit-toggle').dispatchEvent(new dom3.window.MouseEvent('click', { bubbles: true }));
  check('leaving Edit locks them again', previewBoxes().every(b => b.disabled));

  // with no way to write the file, nothing is tickable
  const dom4 = new JSDOM(sanitizeHtml(raw, SANITIZE), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) { win.acquireVsCodeApi = undefined; },
  });
  await new Promise(r => dom4.window.addEventListener('load', r));
  await tick();
  check('a read-only preview leaves them disabled',
    Array.from(dom4.window.document.querySelectorAll('.mdstyled-root input[type="checkbox"]')).every(b => b.disabled));

  // ── clicking blank space in the editor must still give you a caret
  click(doc.querySelector('ul.mdstyled-editable'));
  await tick();
  const richSurface = doc.querySelector('.mdstyled-block-editor .mdstyled-rich');
  window.getSelection().removeAllRanges();
  richSurface.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true, cancelable: true, clientY: 9999 }));
  check('clicking the empty area below the text places a caret',
    window.getSelection().rangeCount > 0 &&
    richSurface.contains(window.getSelection().getRangeAt(0).commonAncestorContainer),
    'ranges: ' + window.getSelection().rangeCount);
  check('the editor surface reserves space to click',
    /\.mdstyled-rich\s*\{[^}]*min-height/.test(fs.readFileSync(path.join(T, 'style.css'), 'utf8')));

  check('no uncaught JS errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error('FAILED:', err); process.exit(1); });
