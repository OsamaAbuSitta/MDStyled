// What does a rich-mode save do to Markdown that is written differently than we emit?
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const e = require('./helpers/engine');

const script = fs.readFileSync(path.join(__dirname, '..', 'templates') + '/editable-light/script.js', 'utf8');
const body = script.replace(/^\(function \(\) \{\n  'use strict';/, '').replace(/\}\)\(\);\s*$/, '');
const dom = new JSDOM('<!doctype html><body></body>');
const S = new Function('window', 'document', body + '\n; return { htmlToMarkdown };')(dom.window, dom.window.document);

let pass = 0, fail = 0;

/**
 * `exact` cases must come back byte-identical - anything else is content we dropped.
 * `normalized` cases are written in a style we do not emit; they are allowed to change
 * as long as they still render identically, and the editor opens them as Markdown
 * rather than rich text so an edit never silently restyles them.
 */
function trip(label, markdown, expectation) {
  const c = dom.window.document.createElement('div');
  c.innerHTML = e.renderMarkdownFragment(markdown);
  const out = S.htmlToMarkdown(c);
  const identical = out === markdown;
  // Whitespace-insensitive: a source line break renders as a space, not a difference.
  const flat = html => e.renderMarkdownFragment(html).replace(/\s+/g, ' ').trim();
  const rendersSame = flat(out) === flat(markdown);

  const ok = expectation === 'exact' ? identical : (identical || rendersSame);
  ok ? pass++ : fail++;

  console.log((ok ? 'PASS ' : 'FAIL ') + (identical ? 'exact     ' : 'normalized') + ' | ' + label);
  if (!ok || (expectation === 'exact' && !identical)) {
    console.log('        in:  ' + JSON.stringify(markdown));
    console.log('        out: ' + JSON.stringify(out));
  }
}

// Content that must survive a rich-mode save untouched.
trip('inline html', 'Text with <kbd>Ctrl</kbd> inside.', 'exact');
trip('inline code with a backtick', 'Use ``a`b`` here.', 'exact');
trip('link with title', '[docs](./g.md "The guide")', 'exact');
trip('image with title', '![cat](./c.png "A cat")', 'exact');
trip('ordered list starting at 3', '3. three\n4. four', 'exact');
trip('nested quote', '> outer\n>\n> > inner', 'exact');

// Written in another style: may be normalized, must still render the same.
trip('hard-wrapped paragraph', 'This paragraph is wrapped\nacross two source lines.', 'normalized');
trip('setext heading', 'Title\n=====', 'normalized');
trip('underscore emphasis', 'Some _italic_ and __bold__ text.', 'normalized');
trip('plus bullets', '+ one\n+ two', 'normalized');
trip('star bullets', '* one\n* two', 'normalized');
trip('reference link', '[docs][ref]\n\n[ref]: ./g.md', 'normalized');
trip('indented code block', '    indented code', 'normalized');
trip('autolink', 'Visit <https://example.com> today.', 'normalized');
trip('unlinked brackets', 'An [unlinked] bracket.', 'normalized');
trip('trailing two-space break', 'line one  \nline two', 'normalized');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
