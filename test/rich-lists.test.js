// Enter inside lists in the rich editor, clicking to place the caret, and what the
// result saves as. The browser's own Enter knows nothing about task checkboxes and
// splits loose items into paragraphs, so the editor handles it; these pin that down.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { JSDOM } = require('jsdom');
const sanitizeHtml = require('sanitize-html');
const e = require('./helpers/engine');

const T = path.join(__dirname, '..', 'templates', 'editable-light');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mdstyled-rich-lists-'));
const SANITIZE = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['html', 'head', 'body', 'meta', 'style', 'script', 'section', 'input', 'svg', 'path']),
  allowedAttributes: {
    '*': ['id', 'class', 'style', 'data-mdstyled-line', 'data-mdstyled-uri', 'type', 'checked', 'disabled', 'start'],
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

/* Opens the block editor on the list in `markdown` and returns helpers around it. */
async function editList(markdown) {
  const file = path.join(TMP, Math.random().toString(36).slice(2) + '.md');
  fs.writeFileSync(file, '# T\n\n' + markdown + '\n');
  const raw = await e.renderMdStyled(file, [], undefined, { styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')] });
  const saves = [];
  const dom = new JSDOM(sanitizeHtml(raw, SANITIZE), {
    runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(win) {
      win.acquireVsCodeApi = () => ({
        postMessage: m => {
          if (m.type === 'mdstyled.saveBlock') saves.push(m.text);
          setTimeout(() => win.postMessage({ type: 'mdstyled.result', id: m.id, ok: true,
            html: m.markdown !== undefined ? e.renderMarkdownFragment(m.markdown) : undefined }, '*'), 0);
        },
        getState: () => ({}), setState: () => {},
      });
    },
  });
  const { window } = dom;
  window.addEventListener('error', ev => errors.push(ev.message || String(ev.error)));
  await new Promise(r => window.addEventListener('load', r));
  await tick();
  const doc = window.document;
  const click = n => n.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  click(doc.querySelector('.mdstyled-edit-toggle'));
  click(doc.querySelector('.mdstyled-root ul.mdstyled-editable, .mdstyled-root ol.mdstyled-editable'));
  await tick();
  const rich = doc.querySelector('.mdstyled-rich');

  /* Caret into the text node containing `text`, `at` characters into that text. */
  function caret(text, at) {
    const walker = doc.createTreeWalker(rich, window.NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const i = node.nodeValue.indexOf(text);
      if (i === -1) continue;
      const range = doc.createRange();
      range.setStart(node, i + (at === undefined ? text.length : at));
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    throw new Error('no text ' + text);
  }
  function enter() {
    const ev = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    rich.dispatchEvent(ev);
    return ev.defaultPrevented;
  }
  /* What typing would do: text at the caret. */
  function typeText(text) {
    const sel = window.getSelection();
    const range = sel.getRangeAt(0);
    const node = doc.createTextNode(text);
    range.insertNode(node);
    range.setStartAfter(node);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  function caretText() {
    const sel = window.getSelection();
    const n = sel.anchorNode;
    const li = n && (n.nodeType === 3 ? n.parentElement : n).closest('li');
    return li ? li.textContent.trim() : null;
  }
  async function save() {
    click(Array.from(doc.querySelectorAll('.mdstyled-edit-actions button')).find(b => b.textContent === 'Save'));
    await tick();
    return saves[saves.length - 1];
  }
  return { rich, caret, enter, typeText, caretText, save, doc, window };
}

(async () => {
  // ── checklist
  {
    const L = await editList('- [ ] first task\n- [x] second task\n- [ ] third task');
    check('checklist opens in the rich editor', !L.rich.hidden);
    L.caret('second task');
    check('Enter in a list item is handled by the editor', L.enter());
    L.typeText('brand new');
    const items = L.rich.querySelectorAll('li');
    check('Enter at the end of an item adds a new item below it', items.length === 4 && items[2].textContent.trim() === 'brand new',
      Array.from(items).map(li => li.textContent.trim()).join(' | '));
    const box = items[2].firstElementChild;
    check('the new item starts with its own checkbox, before the text',
      box && box.tagName === 'INPUT' && box.type === 'checkbox' && items[2].textContent.trim() === 'brand new');
    check('the new checkbox is unticked, even after a ticked item', !box.checked);
    check('only one checkbox per item', Array.from(items).every(li => li.querySelectorAll('input').length === 1));

    L.enter();
    check('Enter again on the new empty item...', true);
    L.enter();
    L.typeText('a paragraph');
    check('...on an empty item leaves the list for a paragraph',
      L.rich.querySelector(':scope > p') && L.rich.querySelector(':scope > p').textContent === 'a paragraph');
    check('the saved Markdown splits the checklist around the paragraph',
      await L.save() === '- [ ] first task\n- [x] second task\n- [ ] brand new\n\na paragraph\n\n- [ ] third task');
  }

  // ── numbered list: splitting mid-text, and an empty item above
  {
    const L = await editList('1. one\n2. two\n3. three');
    L.caret('two', 1);
    L.enter();
    check('Enter mid-text splits the item in two', L.rich.querySelectorAll('li')[1].textContent.trim() === 't' &&
      L.rich.querySelectorAll('li')[2].textContent.trim() === 'wo');
    check('with the caret at the start of the second half', L.caretText() === 'wo');
    L.caret('one', 0);
    L.enter();
    check('Enter at the very start of an item adds an empty item above it',
      L.rich.querySelectorAll('li')[0].textContent.trim() === '' && L.rich.querySelectorAll('li')[1].textContent.trim() === 'one');
    const saved = await L.save();
    check('an empty item saves as an empty item, with no stray backslash',
      !saved.includes('\\') && saved.split('\n')[0].trim() === '1.' && saved.split('\n').slice(1).join('\n') === '2. one\n3. t\n4. wo\n5. three',
      JSON.stringify(saved));
  }
  {
    const L = await editList('1. one\n2. two\n3. three');
    L.caret('two');
    L.enter();
    L.enter();
    L.typeText('between');
    check('leaving a numbered list mid-way keeps the numbering going after it',
      await L.save() === '1. one\n2. two\n\nbetween\n\n3. three');
  }

  // ── bullets
  {
    const L = await editList('- apple\n- banana\n- cherry');
    L.caret('banana');
    L.enter();
    L.typeText('blueberry');
    check('a bullet list gains a bullet', await L.save() === '- apple\n- banana\n- blueberry\n- cherry');
  }

  // ── loose list: a new item, not a new paragraph inside the item
  {
    const L = await editList('- **Loose A**\n\n  body a\n\n- **Loose B**\n\n  body b');
    check('a loose list opens in the rich editor now that it round-trips', !L.rich.hidden);
    L.caret('body a');
    L.enter();
    L.typeText('Loose C');
    const items = L.rich.querySelectorAll(':scope > ul > li');
    check('Enter in a loose item adds an item, not a paragraph', items.length === 3 && items[1].textContent.trim() === 'Loose C',
      Array.from(items).map(li => li.textContent.trim()).join(' | '));
    check('the loose list saves loose, with the new item in place',
      await L.save() === '- **Loose A**\n\n  body a\n\n- Loose C\n\n- **Loose B**\n\n  body b');
  }

  // ── outside a list Enter is still the browser's
  {
    const file = path.join(TMP, 'para.md');
    fs.writeFileSync(file, '# T\n\nJust a paragraph.\n');
    const raw = await e.renderMdStyled(file, [], undefined, { styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')] });
    const dom = new JSDOM(sanitizeHtml(raw, SANITIZE), { runScripts: 'dangerously', pretendToBeVisual: true,
      beforeParse(win) { win.acquireVsCodeApi = () => ({ postMessage: m => setTimeout(() => win.postMessage({ type: 'mdstyled.result', id: m.id, ok: true, html: m.markdown !== undefined ? e.renderMarkdownFragment(m.markdown) : undefined }, '*'), 0), getState: () => ({}), setState: () => {} }); } });
    await new Promise(r => dom.window.addEventListener('load', r));
    await tick();
    const d = dom.window.document;
    d.querySelector('.mdstyled-edit-toggle').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    d.querySelector('p.mdstyled-editable').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    await tick();
    const ev = new dom.window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    d.querySelector('.mdstyled-rich').dispatchEvent(ev);
    check('Enter in a plain paragraph is left to the browser', !ev.defaultPrevented);
  }

  check('no uncaught JS errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error('FAILED:', err); process.exit(1); });
