// Unit tests for src/engine/parser.ts
// Functions: isMdStyledComment, parseSelectorComment, parseDirectiveComment
const { test, expect } = require('@playwright/test');
const { engine } = require('../harness/build');
const E = engine();
const { isMdStyledComment, parseSelectorComment, parseDirectiveComment } = E;

test.describe('isMdStyledComment', () => {
  test('class selector is recognised', () => {
    expect(isMdStyledComment('<!-- .note -->')).toBe(true);
  });

  test('id selector is recognised', () => {
    expect(isMdStyledComment('<!-- #myId -->')).toBe(true);
  });

  test('@style directive is recognised', () => {
    expect(isMdStyledComment('<!-- @style: foo.css -->')).toBe(true);
  });

  test('@script directive is recognised', () => {
    expect(isMdStyledComment('<!-- @script: app.js -->')).toBe(true);
  });

  test('attribute selector is recognised', () => {
    expect(isMdStyledComment('<!-- [key=val] -->')).toBe(true);
  });

  test('surrounding whitespace in content is tolerated', () => {
    expect(isMdStyledComment('  <!-- .note -->  ')).toBe(true);
  });

  test('ordinary text comment is false', () => {
    expect(isMdStyledComment('<!-- hello -->')).toBe(false);
  });

  test('TODO comment is false', () => {
    expect(isMdStyledComment('<!-- TODO -->')).toBe(false);
  });

  test('empty comment is false', () => {
    expect(isMdStyledComment('<!---->')).toBe(false);
  });

  test('whitespace-only comment is false', () => {
    expect(isMdStyledComment('<!--    -->')).toBe(false);
  });

  test('not a comment at all is false', () => {
    expect(isMdStyledComment('not a comment')).toBe(false);
  });

  test('missing closing --> is false', () => {
    expect(isMdStyledComment('<!-- .note')).toBe(false);
  });

  test('missing opening <!-- is false', () => {
    expect(isMdStyledComment('.note -->')).toBe(false);
  });
});

test.describe('parseSelectorComment', () => {
  test('single class', () => {
    const r = parseSelectorComment('<!-- .note -->');
    expect(r.classes).toEqual(['note']);
    expect(r.id).toBeUndefined();
    expect(r.attrs).toEqual([]);
  });

  test('multiple classes', () => {
    const r = parseSelectorComment('<!-- .note .warning .highlight -->');
    expect(r.classes).toEqual(['note', 'warning', 'highlight']);
  });

  test('id only', () => {
    const r = parseSelectorComment('<!-- #myId -->');
    expect(r.id).toBe('myId');
    expect(r.classes).toEqual([]);
    expect(r.attrs).toEqual([]);
  });

  test('id and class together', () => {
    const r = parseSelectorComment('<!-- #myId .note -->');
    expect(r.id).toBe('myId');
    expect(r.classes).toEqual(['note']);
  });

  test('attribute pair', () => {
    const r = parseSelectorComment('<!-- [data-col=2] -->');
    expect(r.attrs).toEqual([{ key: 'data-col', value: '2' }]);
  });

  test('multiple attribute pairs', () => {
    const r = parseSelectorComment('<!-- [a=1][b=2] -->');
    expect(r.attrs).toHaveLength(2);
    expect(r.attrs[0]).toEqual({ key: 'a', value: '1' });
    expect(r.attrs[1]).toEqual({ key: 'b', value: '2' });
  });

  test('class and attribute combined', () => {
    const r = parseSelectorComment('<!-- .card [data-type=info] -->');
    expect(r.classes).toEqual(['card']);
    expect(r.attrs).toEqual([{ key: 'data-type', value: 'info' }]);
  });

  test('hyphenated class names are accepted', () => {
    const r = parseSelectorComment('<!-- .my-class -->' );
    expect(r.classes).toEqual(['my-class']);
  });

  test('underscore class names are accepted', () => {
    const r = parseSelectorComment('<!-- .my_class -->');
    expect(r.classes).toEqual(['my_class']);
  });

  test('content without selectors returns empty arrays', () => {
    const r = parseSelectorComment('<!--  -->');
    expect(r.classes).toEqual([]);
    expect(r.id).toBeUndefined();
    expect(r.attrs).toEqual([]);
  });
});

test.describe('parseDirectiveComment', () => {
  test('@style directive returns type and value', () => {
    expect(parseDirectiveComment('<!-- @style: foo.css -->')).toEqual({ type: 'style', value: 'foo.css' });
  });

  test('@script directive returns type and value', () => {
    expect(parseDirectiveComment('<!-- @script: app.js -->')).toEqual({ type: 'script', value: 'app.js' });
  });

  test('@page directive returns type and value', () => {
    expect(parseDirectiveComment('<!-- @page: my-page -->')).toEqual({ type: 'page', value: 'my-page' });
  });

  test('@section directive returns type and value', () => {
    expect(parseDirectiveComment('<!-- @section: intro -->')).toEqual({ type: 'section', value: 'intro' });
  });

  test('unknown directive type returns null', () => {
    expect(parseDirectiveComment('<!-- @unknown: foo -->')).toBeNull();
  });

  test('class selector comment returns null', () => {
    expect(parseDirectiveComment('<!-- .note -->')).toBeNull();
  });

  test('id selector comment returns null', () => {
    expect(parseDirectiveComment('<!-- #myId -->')).toBeNull();
  });

  test('directive without colon separator returns null', () => {
    expect(parseDirectiveComment('<!-- @style -->')).toBeNull();
  });

  test('value with spaces is trimmed', () => {
    const r = parseDirectiveComment('<!-- @style:   theme.css   -->');
    expect(r).not.toBeNull();
    expect(r.value).toBe('theme.css');
  });

  test('@style value with path separators is kept verbatim', () => {
    const r = parseDirectiveComment('<!-- @style: ./styles/theme.css -->');
    expect(r.value).toBe('./styles/theme.css');
  });
});
