// Emoji search model (the pure part of the picker / `:shortcode` autocomplete).
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', '..', 'scripts', 'editable-template', 'emoji.js'), 'utf8');
const data = new Function(src + '; return { EMOJI_ALL, EMOJI_GROUPS, searchEmoji };')();

test('the set covers the common ground', () => {
  expect(data.EMOJI_ALL.length).toBeGreaterThan(150);
});
test('grouped for browsing', () => {
  expect(data.EMOJI_GROUPS).toHaveLength(6);
});
test('search prefers a prefix match', () => {
  expect(data.searchEmoji('check', 1)[0].char).toBe('✅');
});
test('search finds by an alternate word', () => {
  expect(data.searchEmoji('done', 1)[0].char).toBe('✅');
});
test('search matches partway through a word', () => {
  expect(data.searchEmoji('rock', 1)[0].char).toBe('🚀');
});
test('an empty search still returns something', () => {
  expect(data.searchEmoji('', 5)).toHaveLength(5);
});
test('a nonsense search returns nothing', () => {
  expect(data.searchEmoji('zzzzz', 5)).toHaveLength(0);
});
