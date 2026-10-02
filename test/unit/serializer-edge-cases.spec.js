// Additional edge-case coverage for htmlToMarkdown, retypeMarkdown, detectBlockType, and
// plainLines.  Fills gaps not already covered by serializer-fidelity, serializer-inline,
// and serializer-roundtrip.

const { test, expect } = require('@playwright/test');
const { S, dom } = require('./serializer-loader');

// Build a container from an HTML string and serialize it.
function h2m(html) {
  const c = dom.window.document.createElement('div');
  c.innerHTML = html;
  return S.htmlToMarkdown(c);
}

// ─── htmlToMarkdown: lists ────────────────────────────────────────────────────

test.describe('htmlToMarkdown – lists', () => {
  test('ordered list inside a bullet item', () => {
    const out = h2m('<ul><li>bullet<ol><li>one</li><li>two</li></ol></li></ul>');
    expect(out).toBe('- bullet\n  1. one\n  2. two');
  });

  test('bullet list inside an ordered item', () => {
    const out = h2m('<ol><li>first<ul><li>alpha</li><li>beta</li></ul></li><li>second</li></ol>');
    expect(out).toBe('1. first\n  - alpha\n  - beta\n2. second');
  });

  test('ordered list with non-default start attribute', () => {
    const out = h2m('<ol start="5"><li>five</li><li>six</li></ol>');
    expect(out).toBe('5. five\n6. six');
  });

  test('ordered list with invalid start falls back to 1', () => {
    const out = h2m('<ol start="bad"><li>one</li><li>two</li></ol>');
    expect(out).toBe('1. one\n2. two');
  });

  test('checklist with a nested bullet list inside a checked item', () => {
    const out = h2m('<ul><li><input type="checkbox" checked>done<ul><li>sub</li></ul></li></ul>');
    expect(out).toBe('- [x] done\n  - sub');
  });

  test('unchecked task item', () => {
    const out = h2m('<ul><li><input type="checkbox">todo</li></ul>');
    expect(out).toBe('- [ ] todo');
  });

  test('three-level deep nesting', () => {
    const out = h2m('<ul><li>a<ul><li>b<ul><li>c</li></ul></li></ul></li></ul>');
    expect(out).toBe('- a\n  - b\n    - c');
  });
});

// ─── htmlToMarkdown: inline combos ───────────────────────────────────────────

test.describe('htmlToMarkdown – inline combos', () => {
  test('bold+italic combined renders as ***text***', () => {
    const out = h2m('<p><strong><em>both</em></strong></p>');
    expect(out).toBe('***both***');
  });

  test('italic inside bold', () => {
    const out = h2m('<p><strong>outer <em>inner</em> end</strong></p>');
    expect(out).toBe('**outer *inner* end**');
  });

  test('strikethrough wrapping bold', () => {
    const out = h2m('<p><del><strong>struck bold</strong></del></p>');
    expect(out).toBe('~~**struck bold**~~');
  });

  test('code span with one backtick inside uses double-backtick fence', () => {
    const out = h2m('<p><code>a`b</code></p>');
    expect(out).toBe('``a`b``');
  });

  test('code span that starts and ends with a backtick gets padding spaces', () => {
    const out = h2m('<p><code>`hello`</code></p>');
    expect(out).toBe('`` `hello` ``');
  });

  test('code span with two consecutive backticks uses a three-backtick fence', () => {
    const out = h2m('<p><code>a``b</code></p>');
    expect(out).toBe('```a``b```');
  });

  test('bold text as a link label', () => {
    const out = h2m('<p><a href="http://x.com"><strong>bold link</strong></a></p>');
    expect(out).toBe('[**bold link**](http://x.com)');
  });

  test('empty strong produces no markers', () => {
    const out = h2m('<p><strong></strong></p>');
    expect(out).toBe('');
  });

  test('empty em produces no markers', () => {
    const out = h2m('<p><em></em></p>');
    expect(out).toBe('');
  });

  test('empty del produces no markers', () => {
    const out = h2m('<p><del></del></p>');
    expect(out).toBe('');
  });

  test('link with no href emits just the label text', () => {
    const out = h2m('<p><a>no href</a></p>');
    expect(out).toBe('no href');
  });

  test('link prefers data-mdstyled-uri over the rendered href', () => {
    const out = h2m('<p><a href="/rendered" data-mdstyled-uri="./original.md">click</a></p>');
    expect(out).toBe('[click](./original.md)');
  });

  test('image with empty alt attribute', () => {
    const out = h2m('<p><img src="photo.png" alt=""></p>');
    expect(out).toBe('![](photo.png)');
  });

  test('image prefers data-mdstyled-uri over the rendered src', () => {
    const out = h2m('<p><img src="/rendered.png" data-mdstyled-uri="./orig.png" alt="x"></p>');
    expect(out).toBe('![x](./orig.png)');
  });

  test('link with title attribute', () => {
    const out = h2m('<p><a href="./g.md" title="The guide">docs</a></p>');
    expect(out).toBe('[docs](./g.md "The guide")');
  });

  test('image with title attribute', () => {
    const out = h2m('<p><img src="./c.png" alt="cat" title="A cat"></p>');
    expect(out).toBe('![cat](./c.png "A cat")');
  });
});

// ─── htmlToMarkdown: text escaping ───────────────────────────────────────────

test.describe('htmlToMarkdown – text escaping', () => {
  test('backslash in text is doubled', () => {
    const out = h2m('<p>back\\slash</p>');
    expect(out).toBe('back\\\\slash');
  });

  test('asterisk in text is escaped', () => {
    const out = h2m('<p>a * b</p>');
    expect(out).toBe('a \\* b');
  });

  test('backtick in text is escaped', () => {
    const out = h2m('<p>a `b` c</p>');
    expect(out).toBe('a \\`b\\` c');
  });

  test('square brackets in text are escaped', () => {
    const out = h2m('<p>[not a link]</p>');
    expect(out).toBe('\\[not a link\\]');
  });

  test('less-than sign in text is escaped', () => {
    const out = h2m('<p>a &lt; b</p>');
    expect(out).toBe('a \\< b');
  });

  test('paragraph starting with # is escaped at the line start', () => {
    const out = h2m('<p># not a heading</p>');
    expect(out).toBe('\\# not a heading');
  });

  test('paragraph starting with > is escaped at the line start', () => {
    const out = h2m('<p>&gt; not a quote</p>');
    expect(out).toBe('\\> not a quote');
  });

  test('paragraph starting with - space is escaped at the line start', () => {
    const out = h2m('<p>- not a list</p>');
    expect(out).toBe('\\- not a list');
  });

  test('paragraph starting with digit-dot-space is escaped at the line start', () => {
    const out = h2m('<p>1. not an ol</p>');
    expect(out).toBe('\\1. not an ol');
  });

  test('paragraph starting with + space is escaped at the line start', () => {
    const out = h2m('<p>+ not a list</p>');
    expect(out).toBe('\\+ not a list');
  });
});

// ─── htmlToMarkdown: code blocks ─────────────────────────────────────────────

test.describe('htmlToMarkdown – code blocks', () => {
  test('code block with a hyphenated language tag', () => {
    const out = h2m('<pre><code class="language-my-lang">body</code></pre>');
    expect(out).toBe('```my-lang\nbody\n```');
  });

  test('code block body with multiple lines', () => {
    const out = h2m('<pre><code class="language-py">line1\nline2</code></pre>');
    expect(out).toBe('```py\nline1\nline2\n```');
  });

  test('code block whose content ends with a newline: trailing newline stripped once', () => {
    const out = h2m('<pre><code>body\n</code></pre>');
    expect(out).toBe('```\nbody\n```');
  });

  test('pre element without a code child uses the PRE text directly', () => {
    const out = h2m('<pre>raw code</pre>');
    expect(out).toBe('```\nraw code\n```');
  });
});

// ─── htmlToMarkdown: blockquotes ─────────────────────────────────────────────

test.describe('htmlToMarkdown – blockquotes', () => {
  test('blockquote with two paragraphs produces blank > line between them', () => {
    const out = h2m('<blockquote><p>first</p><p>second</p></blockquote>');
    expect(out).toBe('> first\n>\n> second');
  });

  test('blockquote containing a bullet list', () => {
    const out = h2m('<blockquote><ul><li>item a</li><li>item b</li></ul></blockquote>');
    expect(out).toBe('> - item a\n> - item b');
  });

  test('blockquote with a heading then a paragraph', () => {
    const out = h2m('<blockquote><h3>Title</h3><p>body</p></blockquote>');
    expect(out).toBe('> ### Title\n>\n> body');
  });
});

// ─── htmlToMarkdown: headings ─────────────────────────────────────────────────

test.describe('htmlToMarkdown – headings H1–H6', () => {
  for (let level = 1; level <= 6; level++) {
    const tag = `h${level}`;
    const hashes = '#'.repeat(level);
    test(`${tag.toUpperCase()} becomes ${hashes} prefix`, () => {
      const out = h2m(`<${tag}>Heading</${tag}>`);
      expect(out).toBe(`${hashes} Heading`);
    });
  }
});

// ─── htmlToMarkdown: horizontal rule ─────────────────────────────────────────

test.describe('htmlToMarkdown – horizontal rule', () => {
  test('HR element serializes to ---', () => {
    const out = h2m('<hr>');
    expect(out).toBe('---');
  });
});

// ─── htmlToMarkdown: hard line breaks ────────────────────────────────────────

test.describe('htmlToMarkdown – hard line breaks', () => {
  test('BR between two text runs becomes a backslash-newline', () => {
    const out = h2m('<p>first<br>second</p>');
    expect(out).toBe('first\\\nsecond');
  });

  test('trailing BR with no content after is silently dropped', () => {
    const out = h2m('<p>text<br></p>');
    expect(out).toBe('text');
  });
});

// ─── htmlToMarkdown: KEEP_HTML tags ──────────────────────────────────────────

test.describe('htmlToMarkdown – passthrough HTML tags', () => {
  test('kbd passes through verbatim', () => {
    const out = h2m('<p>Press <kbd>Ctrl</kbd>+<kbd>C</kbd></p>');
    expect(out).toContain('<kbd>Ctrl</kbd>');
    expect(out).toContain('<kbd>C</kbd>');
  });

  test('sup passes through verbatim', () => {
    const out = h2m('<p>x<sup>2</sup></p>');
    expect(out).toContain('<sup>2</sup>');
  });

  test('sub passes through verbatim', () => {
    const out = h2m('<p>H<sub>2</sub>O</p>');
    expect(out).toContain('<sub>2</sub>');
  });

  test('mark passes through verbatim', () => {
    const out = h2m('<p><mark>highlighted</mark></p>');
    expect(out).toContain('<mark>highlighted</mark>');
  });
});

// ─── htmlToMarkdown: span color handling ─────────────────────────────────────

test.describe('htmlToMarkdown – span colour handling', () => {
  test('span with only a color style is preserved', () => {
    const out = h2m('<p><span style="color: red">red text</span></p>');
    expect(out).toBe('<span style="color: red">red text</span>');
  });

  test('span with only a background-color style is preserved', () => {
    const out = h2m('<p><span style="background-color: yellow">highlighted</span></p>');
    expect(out).toBe('<span style="background-color: yellow">highlighted</span>');
  });

  test('span with both color and background preserves both', () => {
    const out = h2m('<p><span style="color: blue; background-color: white">both</span></p>');
    expect(out).toBe('<span style="color: blue; background-color: white">both</span>');
  });

  test('span with an unrelated style is unwrapped to plain text', () => {
    const out = h2m('<p><span style="font-weight: bold">plain span</span></p>');
    expect(out).toBe('plain span');
  });

  test('span with no style attribute at all is unwrapped', () => {
    const out = h2m('<p><span>plain</span></p>');
    expect(out).toBe('plain');
  });
});

// ─── htmlToMarkdown: tables with alignment and escaping ──────────────────────

test.describe('htmlToMarkdown – tables', () => {
  test('table cell containing a pipe character is escaped', () => {
    const out = h2m(
      '<table><thead><tr><th>A</th><th>B</th></tr></thead>' +
      '<tbody><tr><td>x|y</td><td>z</td></tr></tbody></table>'
    );
    expect(out).toContain('x\\|y');
  });

  test('centre-aligned column uses :---: separator', () => {
    const out = h2m(
      '<table><thead><tr><th style="text-align:center">H</th></tr></thead>' +
      '<tbody><tr><td>1</td></tr></tbody></table>'
    );
    expect(out).toContain(':---:');
  });

  test('right-aligned column uses ---: separator', () => {
    const out = h2m(
      '<table><thead><tr><th style="text-align:right">H</th></tr></thead>' +
      '<tbody><tr><td>1</td></tr></tbody></table>'
    );
    expect(out).toContain('---:');
  });

  test('left-aligned column uses :--- separator', () => {
    const out = h2m(
      '<table><thead><tr><th style="text-align:left">H</th></tr></thead>' +
      '<tbody><tr><td>1</td></tr></tbody></table>'
    );
    expect(out).toContain(':---');
  });
});

// ─── detectBlockType: additional markers ─────────────────────────────────────

test.describe('detectBlockType – additional markers', () => {
  test('star bullet line -> ul', () => {
    expect(S.detectBlockType('* item')).toBe('ul');
  });

  test('plus bullet line -> ul', () => {
    expect(S.detectBlockType('+ item')).toBe('ul');
  });

  test('task with uppercase X -> task', () => {
    expect(S.detectBlockType('- [X] done')).toBe('task');
  });

  test('ordered list with paren delimiter -> ol', () => {
    expect(S.detectBlockType('1) item')).toBe('ol');
  });

  test('h2 marker -> h2', () => {
    expect(S.detectBlockType('## Title')).toBe('h2');
  });

  test('h4 marker -> h4', () => {
    expect(S.detectBlockType('#### Title')).toBe('h4');
  });

  test('h6 marker -> h6', () => {
    expect(S.detectBlockType('###### Title')).toBe('h6');
  });

  test('triple-star hr -> hr', () => {
    expect(S.detectBlockType('***')).toBe('hr');
  });

  test('triple-underscore hr -> hr', () => {
    expect(S.detectBlockType('___')).toBe('hr');
  });

  test('code fence with language -> code', () => {
    expect(S.detectBlockType('```python\nx = 1\n```')).toBe('code');
  });

  test('code fence without language -> code', () => {
    expect(S.detectBlockType('```\nx\n```')).toBe('code');
  });

  // BUG: detectBlockType looks only at the first line, so a selector comment before a
  // blockquote makes it return 'p' rather than 'quote'.
  test.fail('selector comment before blockquote is misidentified as p', () => {
    expect(S.detectBlockType('<!-- .note -->\n> text')).toBe('quote');
  });
});

// ─── retypeMarkdown: additional target types ──────────────────────────────────

test.describe('retypeMarkdown – additional target types', () => {
  test('para -> ul', () => {
    expect(S.retypeMarkdown('item', 'ul')).toBe('- item');
  });

  test('para -> ol', () => {
    expect(S.retypeMarkdown('item', 'ol')).toBe('1. item');
  });

  test('para -> quote', () => {
    expect(S.retypeMarkdown('text', 'quote')).toBe('> text');
  });

  test('para -> hr (content is discarded)', () => {
    expect(S.retypeMarkdown('anything', 'hr')).toBe('---');
  });

  test('para -> table: single line becomes header + Cell row', () => {
    expect(S.retypeMarkdown('Header', 'table')).toBe('| Header |\n| --- |\n| Cell |');
  });

  test('para -> table: two lines become header + one body row', () => {
    expect(S.retypeMarkdown('Header\nrow1', 'table')).toBe('| Header |\n| --- |\n| row1 |');
  });

  test('multi-line text -> heading joins lines with a space', () => {
    expect(S.retypeMarkdown('line one\nline two', 'h2')).toBe('## line one line two');
  });

  test('multi-line text -> ul, each line becomes a bullet', () => {
    expect(S.retypeMarkdown('a\nb\nc', 'ul')).toBe('- a\n- b\n- c');
  });

  test('multi-line text -> ol, each line numbered', () => {
    expect(S.retypeMarkdown('a\nb\nc', 'ol')).toBe('1. a\n2. b\n3. c');
  });

  test('checklist -> ul strips checkbox markers', () => {
    expect(S.retypeMarkdown('- [x] done\n- [ ] pending', 'ul')).toBe('- done\n- pending');
  });

  test('ul -> ol converts bullets to numbered items', () => {
    expect(S.retypeMarkdown('- a\n- b', 'ol')).toBe('1. a\n2. b');
  });

  test('ol -> ul converts numbered items to bullets', () => {
    expect(S.retypeMarkdown('1. a\n2. b', 'ul')).toBe('- a\n- b');
  });

  test('code fence with lang -> para strips the fence and lang tag', () => {
    expect(S.retypeMarkdown('```js\nvar x = 1;\n```', 'p')).toBe('var x = 1;');
  });

  test('table -> para strips pipe syntax and delimiter row', () => {
    const md = '| A | B |\n| --- | --- |\n| 1 | 2 |';
    expect(S.retypeMarkdown(md, 'p')).toBe('A B\n1 2');
  });

  test('multi-line text -> code wraps all lines in a fence', () => {
    expect(S.retypeMarkdown('x = 1\ny = 2', 'code')).toBe('```\nx = 1\ny = 2\n```');
  });

  test('h3 -> para strips the hashes', () => {
    expect(S.retypeMarkdown('### My Title', 'p')).toBe('My Title');
  });

  test('quote multi-line -> para strips > prefixes', () => {
    expect(S.retypeMarkdown('> line one\n> line two', 'p')).toBe('line one\nline two');
  });

  test('empty markdown -> para returns empty string', () => {
    expect(S.retypeMarkdown('', 'p')).toBe('');
  });

  test('para -> h1', () => {
    expect(S.retypeMarkdown('Title', 'h1')).toBe('# Title');
  });

  test('para -> h5', () => {
    expect(S.retypeMarkdown('Title', 'h5')).toBe('##### Title');
  });
});

// ─── plainLines ───────────────────────────────────────────────────────────────

test.describe('plainLines', () => {
  test('plain paragraph returns its text', () => {
    expect(S.plainLines('hello')).toEqual(['hello']);
  });

  test('multi-line paragraph returns all lines', () => {
    expect(S.plainLines('a\nb\nc')).toEqual(['a', 'b', 'c']);
  });

  test('bullet list strips the - marker from each item', () => {
    expect(S.plainLines('- a\n- b')).toEqual(['a', 'b']);
  });

  test('ordered list strips the numbering', () => {
    expect(S.plainLines('1. first\n2. second')).toEqual(['first', 'second']);
  });

  test('blockquote strips the > prefix', () => {
    expect(S.plainLines('> quoted line')).toEqual(['quoted line']);
  });

  test('multi-line blockquote strips all > prefixes', () => {
    expect(S.plainLines('> line one\n> line two')).toEqual(['line one', 'line two']);
  });

  test('code fence with lang strips fence lines and returns body', () => {
    expect(S.plainLines('```js\nvar x = 1;\n```')).toEqual(['var x = 1;']);
  });

  test('code fence without lang returns body', () => {
    expect(S.plainLines('```\nplain\n```')).toEqual(['plain']);
  });

  test('table strips pipes and the delimiter row', () => {
    const lines = S.plainLines('| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(lines).toEqual(['A B', '1 2']);
  });

  test('aligned table strips pipes, alignment row and cell content', () => {
    const lines = S.plainLines('| A | B |\n| :---: | ---: |\n| 1 | 2 |');
    expect(lines).toEqual(['A B', '1 2']);
  });

  test('checklist strips checkbox markers', () => {
    expect(S.plainLines('- [ ] todo\n- [x] done')).toEqual(['todo', 'done']);
  });

  test('heading strips the hash prefix', () => {
    expect(S.plainLines('## My Heading')).toEqual(['My Heading']);
  });

  test('empty string returns an array with one empty string', () => {
    expect(S.plainLines('')).toEqual(['']);
  });

  test('blank lines between paragraphs are dropped', () => {
    expect(S.plainLines('first\n\nsecond')).toEqual(['first', 'second']);
  });
});
