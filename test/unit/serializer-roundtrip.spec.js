// Renders Markdown -> HTML with the real pipeline, then serializes back with the
// template's htmlToMarkdown, and checks the result renders identically.
const { test, expect } = require('@playwright/test');
const { engine } = require('../harness/build');
const { S, dom } = require('./serializer-loader');

const e = engine();

function roundtrip(name, markdown, expected) {
  test('roundtrip: ' + name, () => {
    const html = e.renderMarkdownFragment(markdown);
    const container = dom.window.document.createElement('div');
    container.innerHTML = html;
    const out = S.htmlToMarkdown(container);
    expect(out).toBe(expected === undefined ? markdown : expected);
  });
}

roundtrip('paragraph', 'Just some text.');
roundtrip('bold + italic', 'Some **bold** and *italic* text.');
roundtrip('strikethrough + code', 'A ~~removed~~ and `inline code` bit.');
roundtrip('link', 'See [the docs](./guide.md) for more.');
roundtrip('image', '![a cat](./cat.png)');
roundtrip('heading', '## A heading');
roundtrip('deep heading', '###### Six');
roundtrip('bullet list', '- One\n- Two\n- Three');
roundtrip('loose bullet list', '- One\n\n- Two');
roundtrip('loose list with bold headers and bodies', '- **Loose A**\n\n  body a\n\n- **Loose B**\n\n  body b');
roundtrip('loose numbered list, two-digit markers', '9. nine\n\n10. ten\n\n    ten body');
roundtrip('loose checklist', '- [ ] task a\n\n- [x] task b\n\n  more b');
roundtrip('loose item with a nested tight list', '- parent\n\n  - child one\n  - child two\n\n- next');
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

test.describe('retypeMarkdown', () => {
  const retype = (name, md, type, want) =>
    test('retype: ' + name, () => { expect(S.retypeMarkdown(md, type)).toBe(want); });

  retype('para -> h2', 'Hello there', 'h2', '## Hello there');
  retype('h2 -> para', '## Hello there', 'p', 'Hello there');
  retype('para -> checklist', 'Buy milk', 'task', '- [ ] Buy milk');
  retype('bullets -> checklist', '- a\n- b', 'task', '- [ ] a\n- [ ] b');
  retype('checklist -> numbered', '- [x] a\n- [ ] b', 'ol', '1. a\n2. b');
  retype('bullets -> h1 joins', '- a\n- b', 'h1', '# a b');
  retype('quote -> para', '> quoted', 'p', 'quoted');
  retype('para -> code', 'x = 1', 'code', '```\nx = 1\n```');
  retype('code -> para', '```js\nx = 1\n```', 'p', 'x = 1');
});

test.describe('detectBlockType', () => {
  const cases = [
    ['# T', 'h1'], ['### T', 'h3'], ['- a', 'ul'], ['- [ ] a', 'task'],
    ['1. a', 'ol'], ['> q', 'quote'], ['```js\nx\n```', 'code'],
    ['| a |\n| --- |', 'table'], ['---', 'hr'], ['plain', 'p'],
  ];
  for (const [md, want] of cases) {
    test('detect: ' + JSON.stringify(md.slice(0, 22)) + ' -> ' + want, () => {
      expect(S.detectBlockType(md)).toBe(want);
    });
  }
});
