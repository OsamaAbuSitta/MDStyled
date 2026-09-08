// Renders Markdown -> HTML with the real pipeline, then serializes back with the
// template's htmlToMarkdown, and checks the result renders identically.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');
const e = require('./helpers/engine');

const script = fs.readFileSync(path.join(__dirname, '..', 'templates') + '/editable-light/script.js', 'utf8');
// pull the serializer helpers out of the template IIFE for direct testing
const body = script.replace(/^\(function \(\) \{\n  'use strict';/, '').replace(/\}\)\(\);\s*$/, '');
const dom = new JSDOM('<!doctype html><body></body>');
global.window = dom.window; global.document = dom.window.document;
const factory = new Function('window', 'document', body + '\n; return { htmlToMarkdown, retypeMarkdown, detectBlockType, plainLines };');
const S = factory(dom.window, dom.window.document);

let pass = 0, fail = 0;
function roundtrip(name, markdown, expected) {
  const html = e.renderMarkdownFragment(markdown);
  const container = dom.window.document.createElement('div');
  container.innerHTML = html;
  const out = S.htmlToMarkdown(container);
  const want = expected === undefined ? markdown : expected;
  const ok = out === want;
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n   got:  ' + JSON.stringify(out) + '\n   want: ' + JSON.stringify(want)));
  // even when normalized differently, it must render to the same HTML
  if (!ok) {
    const same = e.renderMarkdownFragment(out) === html;
    console.log('        renders identically anyway: ' + same);
  }
}

roundtrip('paragraph', 'Just some text.');
roundtrip('bold + italic', 'Some **bold** and *italic* text.');
roundtrip('strikethrough + code', 'A ~~removed~~ and `inline code` bit.');
roundtrip('link', 'See [the docs](./guide.md) for more.');
roundtrip('image', '![a cat](./cat.png)');
roundtrip('heading', '## A heading');
roundtrip('deep heading', '###### Six');
roundtrip('bullet list', '- One\n- Two\n- Three');
roundtrip('nested bullets', '- One\n  - Nested\n- Two');
roundtrip('ordered list', '1. First\n2. Second');
roundtrip('checklist', '- [ ] Todo\n- [x] Done');
roundtrip('quote', '> Something quoted');
roundtrip('code fence', '```js\nvar x = 1;\n```');
roundtrip('code fence no lang', '```\nplain\n```');
roundtrip('divider', '---');
roundtrip('table', '| A | B |\n| --- | --- |\n| 1 | 2 |');
roundtrip('table aligned', '| A | B |\n| :---: | ---: |\n| 1 | 2 |');
roundtrip('mixed inline in list', '- Item with **bold** and [link](http://x.com)');
roundtrip('literal asterisk', 'A \\* literal star.');
roundtrip('multi-paragraph', 'One.\n\nTwo.');
roundtrip('list then paragraph', '- a\n- b\n\nAfter.');

// mdstyled selector comments: callouts and cards are a class on the block below
roundtrip('note callout', '<!-- .note -->\n> **Note** - something worth knowing.');
roundtrip('warning callout', '<!-- .warning -->\n> **Careful** - read this first.');
roundtrip('card', '<!-- .card -->\n> ### Card title\n>\n> What this card is about.');
roundtrip('half card', '<!-- .card .half -->\n> ### Card title\n>\n> Two of these sit side by side.');
roundtrip('id selector', '<!-- #intro -->\nSome text.');
roundtrip('coloured text', 'A <span style="color: #e11d48">red</span> word.');
roundtrip('highlighted text', 'A <span style="background-color: #fef08a">marked</span> word.');

console.log('\n-- retype --');
function retype(name, md, type, want) {
  const out = S.retypeMarkdown(md, type);
  const ok = out === want;
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n   got:  ' + JSON.stringify(out) + '\n   want: ' + JSON.stringify(want)));
}
retype('para -> h2', 'Hello there', 'h2', '## Hello there');
retype('h2 -> para', '## Hello there', 'p', 'Hello there');
retype('para -> checklist', 'Buy milk', 'task', '- [ ] Buy milk');
retype('bullets -> checklist', '- a\n- b', 'task', '- [ ] a\n- [ ] b');
retype('checklist -> numbered', '- [x] a\n- [ ] b', 'ol', '1. a\n2. b');
retype('bullets -> h1 joins', '- a\n- b', 'h1', '# a b');
retype('quote -> para', '> quoted', 'p', 'quoted');
retype('para -> code', 'x = 1', 'code', '```\nx = 1\n```');
retype('code -> para', '```js\nx = 1\n```', 'p', 'x = 1');

console.log('\n-- detect --');
function detect(md, want) {
  const out = S.detectBlockType(md);
  const ok = out === want;
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + JSON.stringify(md.slice(0, 22)) + ' -> ' + out + (ok ? '' : ' (want ' + want + ')'));
}
detect('# T', 'h1'); detect('### T', 'h3'); detect('- a', 'ul'); detect('- [ ] a', 'task');
detect('1. a', 'ol'); detect('> q', 'quote'); detect('```js\nx\n```', 'code');
detect('| a |\n| --- |', 'table'); detect('---', 'hr'); detect('plain', 'p');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
