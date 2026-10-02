// Unit tests for src/engine/transformer.ts
// Tests applyMdStyledDirectives via direct token manipulation and via renderMarkdownFragment.
const { test, expect } = require('@playwright/test');
const { engine } = require('../harness/build');
const E = engine();
const { applyMdStyledDirectives, renderMarkdownFragment } = E;

// ── Token factory helpers ──────────────────────────────────────────────────

function makeToken(type, opts = {}) {
  return {
    type,
    tag: opts.tag || '',
    attrs: opts.attrs !== undefined ? opts.attrs : null,
    map: opts.map !== undefined ? opts.map : null,
    nesting: opts.nesting !== undefined ? opts.nesting : 0,
    level: opts.level !== undefined ? opts.level : 0,
    children: null,
    content: opts.content || '',
    markup: '',
    info: '',
    meta: null,
    block: true,
    hidden: false,
  };
}

function htmlBlock(content, map = [0, 1]) {
  return makeToken('html_block', { content, map });
}

function paraOpen(map = [1, 3]) {
  return makeToken('paragraph_open', { tag: 'p', nesting: 1, map });
}

function headingOpen(level, map = [1, 2]) {
  return makeToken('heading_open', { tag: `h${level}`, nesting: 1, map });
}

// ── Direct applyMdStyledDirectives tests ──────────────────────────────────

test.describe('class selector applied to next renderable token', () => {
  test('class is added to a following paragraph', () => {
    const tokens = [
      htmlBlock('<!-- .note -->', [0, 1]),
      paraOpen([1, 3]),
    ];
    const result = applyMdStyledDirectives(tokens);
    const para = result.find(t => t.type === 'paragraph_open');
    expect(para).toBeDefined();
    const classAttr = para.attrs && para.attrs.find(a => a[0] === 'class');
    expect(classAttr).toBeDefined();
    expect(classAttr[1]).toBe('note');
  });

  test('id is added to a following heading', () => {
    const tokens = [
      htmlBlock('<!-- #sec1 -->', [0, 1]),
      headingOpen(2, [1, 2]),
    ];
    const result = applyMdStyledDirectives(tokens);
    const h = result.find(t => t.type === 'heading_open');
    const idAttr = h.attrs && h.attrs.find(a => a[0] === 'id');
    expect(idAttr).toBeDefined();
    expect(idAttr[1]).toBe('sec1');
  });

  test('multiple classes are accumulated on the target token', () => {
    const tokens = [
      htmlBlock('<!-- .foo .bar -->', [0, 1]),
      paraOpen([1, 3]),
    ];
    const result = applyMdStyledDirectives(tokens);
    const para = result.find(t => t.type === 'paragraph_open');
    const classAttr = para.attrs.find(a => a[0] === 'class');
    expect(classAttr[1]).toBe('foo bar');
  });

  test('the comment token is removed from the output', () => {
    const tokens = [
      htmlBlock('<!-- .note -->', [0, 1]),
      paraOpen([1, 3]),
    ];
    const result = applyMdStyledDirectives(tokens);
    const commentTokens = result.filter(t => t.type === 'html_block' && t.content.includes('.note'));
    expect(commentTokens).toHaveLength(0);
  });

  test('selector line is recorded on the decorated token', () => {
    const comment = htmlBlock('<!-- .note -->', [3, 4]);
    const para = paraOpen([4, 6]);
    const result = applyMdStyledDirectives([comment, para]);
    const decoratedPara = result.find(t => t.type === 'paragraph_open');
    expect(decoratedPara.mdstyledSelectorLine).toBe(3);
  });

  test('non-mdstyled html block passes through unchanged', () => {
    const regular = htmlBlock('<div>hello</div>', [0, 1]);
    const result = applyMdStyledDirectives([regular]);
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('<div>hello</div>');
  });

  test('tokens that are not renderable open tokens are skipped when looking for target', () => {
    // inline token is not in RENDERABLE_TYPES, so the selector skips it
    const comment = htmlBlock('<!-- .note -->', [0, 1]);
    const inline = makeToken('inline', { map: [1, 2] });
    const para = paraOpen([2, 4]);
    const result = applyMdStyledDirectives([comment, inline, para]);
    const para2 = result.find(t => t.type === 'paragraph_open');
    const classAttr = para2.attrs && para2.attrs.find(a => a[0] === 'class');
    expect(classAttr).toBeDefined();
    expect(classAttr[1]).toBe('note');
  });
});

test.describe('@page directive', () => {
  test('wraps all content in a mdstyled-root div with the page class', () => {
    const tokens = [
      htmlBlock('<!-- @page: my-page -->', [0, 1]),
      paraOpen([1, 3]),
    ];
    const result = applyMdStyledDirectives(tokens);
    expect(result[0].type).toBe('html_block');
    expect(result[0].content).toBe('<div class="mdstyled-root my-page">');
    expect(result[result.length - 1].content).toBe('</div>');
  });

  test('@page token is removed from middle of output', () => {
    const tokens = [
      htmlBlock('<!-- @page: hero -->', [0, 1]),
      paraOpen([1, 3]),
    ];
    const result = applyMdStyledDirectives(tokens);
    const pageDirs = result.filter(t =>
      t.type === 'html_block' && t.content.includes('@page')
    );
    expect(pageDirs).toHaveLength(0);
  });
});

test.describe('@style and @script directives', () => {
  test('@style directive is stripped from token output', () => {
    const tokens = [
      htmlBlock('<!-- @style: theme.css -->', [0, 1]),
      paraOpen([1, 3]),
    ];
    const result = applyMdStyledDirectives(tokens);
    const styleTokens = result.filter(t =>
      t.type === 'html_block' && t.content.includes('@style')
    );
    expect(styleTokens).toHaveLength(0);
  });

  test('@script directive is stripped from token output', () => {
    const tokens = [
      htmlBlock('<!-- @script: app.js -->', [0, 1]),
      paraOpen([1, 3]),
    ];
    const result = applyMdStyledDirectives(tokens);
    const scriptTokens = result.filter(t =>
      t.type === 'html_block' && t.content.includes('@script')
    );
    expect(scriptTokens).toHaveLength(0);
  });
});

// ── Integration tests via renderMarkdownFragment ──────────────────────────

test.describe('renderMarkdownFragment integration', () => {
  test('class comment applies class attribute to the following paragraph', () => {
    const html = renderMarkdownFragment('<!-- .callout -->\n\nhello world');
    expect(html).toContain('class="callout"');
    expect(html).toContain('hello world');
  });

  test('multiple classes in one comment are all applied', () => {
    const html = renderMarkdownFragment('<!-- .note .warning -->\n\ntext');
    expect(html).toContain('note');
    expect(html).toContain('warning');
  });

  test('id comment applies id attribute to the following heading', () => {
    const html = renderMarkdownFragment('<!-- #section-one -->\n\n## My Heading');
    expect(html).toContain('id="section-one"');
  });

  test('@page directive wraps output in div with given class', () => {
    const html = renderMarkdownFragment('<!-- @page: landing -->\n\n# Title');
    expect(html).toContain('<div class="mdstyled-root landing">');
    expect(html).toContain('</div>');
  });

  test('@section directive wraps heading and content in <section>', () => {
    const md = '<!-- @section: intro -->\n\n## Title\n\nparagraph\n\n## Next';
    const html = renderMarkdownFragment(md);
    expect(html).toContain('<section class="intro">');
    expect(html).toContain('</section>');
    // The second h2 should appear outside the section (after </section>)
    const sectionClose = html.indexOf('</section>');
    const nextH2 = html.indexOf('<h2>Next</h2>', sectionClose);
    expect(nextH2).toBeGreaterThan(sectionClose);
  });

  test('@style directive does not appear in rendered HTML', () => {
    const html = renderMarkdownFragment('<!-- @style: foo.css -->\n\n# Title');
    expect(html).not.toContain('@style');
  });

  test('bare Markdown renders without errors', () => {
    const html = renderMarkdownFragment('# Hello\n\nworld');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('world');
  });

  test('empty input returns empty string', () => {
    expect(renderMarkdownFragment('')).toBe('');
  });
});
