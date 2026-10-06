// Table designer data layer: parse and serialize a GFM table.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'editable-template', 'tables.js'), 'utf8');
const lib = new Function(src + '; return { parseMarkdownTable, serializeMarkdownTable };')();

const parsed = lib.parseMarkdownTable('| Name | Note |\n|:--|:-:|\n| a \\| b | `x` |\n| short |');

test('parses header, alignment and rows', () => {
  expect(parsed).toBeTruthy();
  expect(parsed.header.join()).toBe('Name,Note');
  expect(parsed.align.join()).toBe('left,center');
});
test('an escaped pipe is part of the cell', () => {
  expect(parsed.rows[0][0]).toBe('a | b');
});
test('a short row is padded out', () => {
  expect(parsed.rows[1]).toHaveLength(2);
  expect(parsed.rows[1][1]).toBe('');
});
test('pipes are escaped again on the way out', () => {
  expect(lib.serializeMarkdownTable(parsed).split('\n')[2].startsWith('| a \\| b |')).toBe(true);
});
test('alignment is written back', () => {
  expect(lib.serializeMarkdownTable(parsed).split('\n')[1]).toBe('| :----- | :--: |');
});
test('a row wider than the header is not the designer\'s to touch', () => {
  expect(lib.parseMarkdownTable('| A |\n| --- |\n| 1 | 2 |')).toBeNull();
});
test('no delimiter row, no table', () => {
  expect(lib.parseMarkdownTable('| A |\n| B |')).toBeNull();
});
