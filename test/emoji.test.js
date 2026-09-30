// Emoji: a picker in the toolbar, and `:shortcode` autocomplete while typing.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { JSDOM } = require('jsdom');
const sanitizeHtml = require('sanitize-html');
const e = require('./helpers/engine');

const T = path.join(__dirname, '..', 'templates', 'editable-light');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mdstyled-emoji-'));

const SANITIZE = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['html', 'head', 'body', 'meta', 'style', 'script', 'section', 'input', 'svg', 'path']),
  allowedAttributes: {
    '*': ['id', 'class', 'style', 'data-mdstyled-line'],
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

// the search helper, exercised directly
const script = fs.readFileSync(path.join(T, 'script.js'), 'utf8');
const dataSrc = script.slice(script.indexOf('var EMOJI_GROUPS'), script.indexOf('/* ═══════════════════════════════════════\n     HTML -> Markdown'));
const data = new Function(dataSrc + '; return { EMOJI_ALL, EMOJI_GROUPS, searchEmoji };')();

check('the set covers the common ground', data.EMOJI_ALL.length > 150, data.EMOJI_ALL.length + ' emoji');
check('grouped for browsing', data.EMOJI_GROUPS.length === 6,
  data.EMOJI_GROUPS.map(g => g.name).join(', '));
check('search prefers a prefix match', data.searchEmoji('check', 1)[0].char === '✅');
check('search finds by an alternate word', data.searchEmoji('done', 1)[0].char === '✅');
check('search matches partway through a word', data.searchEmoji('rock', 1)[0].char === '🚀');
check('an empty search still returns something', data.searchEmoji('', 5).length === 5);
check('a nonsense search returns nothing', data.searchEmoji('zzzzz', 5).length === 0);

(async () => {
  const md = TMP + '/emoji.md';
  fs.writeFileSync(md, '# T\n\nA paragraph.\n');
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
  click(doc.querySelector('p.mdstyled-editable'));
  await tick();

  const ed = doc.querySelector('.mdstyled-block-editor');
  const emojiBtn = ed.querySelector('.mdstyled-format-emoji');
  check('the toolbar has an emoji button', !!emojiBtn);

  const popover = ed.querySelector('.mdstyled-emoji-popover');
  check('the picker starts closed', popover.hidden);
  click(emojiBtn);
  check('clicking opens it', !popover.hidden);
  check('it opens on all groups',
    popover.querySelectorAll('.mdstyled-emoji-title').length === 6);
  check('with a search box', !!popover.querySelector('.mdstyled-emoji-search'));

  const search = popover.querySelector('.mdstyled-emoji-search');
  search.value = 'rocket';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  check('searching narrows it down',
    popover.querySelectorAll('.mdstyled-emoji').length === 1 &&
    popover.querySelector('.mdstyled-emoji').textContent === '🚀',
    popover.querySelectorAll('.mdstyled-emoji').length + ' results');

  // ── inserting from the picker, in markdown mode
  click(ed.querySelector('.mdstyled-mode-toggle'));
  await tick();
  const ta = ed.querySelector('.mdstyled-edit-textarea');
  ta.value = 'Ship it ';
  ta.setSelectionRange(8, 8);

  click(emojiBtn);
  const s2 = popover.querySelector('.mdstyled-emoji-search');
  s2.value = 'rocket';
  s2.dispatchEvent(new window.Event('input', { bubbles: true }));
  click(popover.querySelector('.mdstyled-emoji'));
  check('picking one inserts it at the caret', ta.value === 'Ship it 🚀', JSON.stringify(ta.value));
  check('and closes the picker', popover.hidden);

  // ── `:shortcode` autocomplete
  const suggest = ed.querySelector('.mdstyled-emoji-suggest');
  check('the suggestion strip starts hidden', suggest.hidden);

  ta.value = 'Ship it :rock';
  ta.setSelectionRange(13, 13);
  ta.dispatchEvent(new window.Event('input', { bubbles: true }));
  check('typing :rock suggests the rocket',
    !suggest.hidden && suggest.querySelector('.mdstyled-emoji-glyph').textContent === '🚀',
    suggest.hidden ? 'hidden' : Array.from(suggest.querySelectorAll('.mdstyled-emoji-glyph')).map(g => g.textContent).join(''));
  check('the first suggestion is preselected',
    suggest.children[0].classList.contains('active'));

  const press = key => {
    const ev = new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    ta.dispatchEvent(ev);
    return ev;
  };

  press('Enter');
  check('Enter replaces the :shortcode with the emoji',
    ta.value === 'Ship it 🚀', JSON.stringify(ta.value));
  check('and the strip goes away', suggest.hidden);

  // a query with several matches, to steer with the arrow keys
  ta.value = 'pick :ch';
  ta.setSelectionRange(8, 8);
  ta.dispatchEvent(new window.Event('input', { bubbles: true }));
  check('a broad shortcode offers several', suggest.children.length > 1,
    Array.from(suggest.querySelectorAll('.mdstyled-emoji-name')).map(n => n.textContent).join(' '));

  const second = suggest.children[1].querySelector('.mdstyled-emoji-glyph').textContent;
  press('ArrowDown');
  check('arrow keys move through the list',
    !suggest.children[0].classList.contains('active') && suggest.children[1].classList.contains('active'));
  press('ArrowUp');
  check('and back again', suggest.children[0].classList.contains('active'));

  press('ArrowDown');
  press('Tab');
  check('Tab inserts whichever one is highlighted',
    ta.value === 'pick ' + second, JSON.stringify(ta.value) + ' vs ' + second);

  ta.value = 'Ship it :rock';
  ta.setSelectionRange(13, 13);
  ta.dispatchEvent(new window.Event('input', { bubbles: true }));
  check('the strip comes back for a new shortcode', !suggest.hidden);
  press('Escape');
  check('Escape dismisses it without inserting',
    suggest.hidden && ta.value === 'Ship it :rock', JSON.stringify(ta.value));

  ta.value = 'a ratio of 3:2 here';
  ta.setSelectionRange(13, 13);
  ta.dispatchEvent(new window.Event('input', { bubbles: true }));
  check('a colon mid-word is not a shortcode', suggest.hidden, ta.value);

  check('no uncaught JS errors', errors.length === 0, errors.join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error('FAILED:', err); process.exit(1); });
