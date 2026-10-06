// The inline marker toggles: `*` and `**` share a character, so a marker only counts
// when the run of that character stops exactly where the marker does.
const { test, expect } = require('@playwright/test');
const { JSDOM } = require('jsdom');
const { script } = require('./serializer-loader');

const source = script.slice(script.indexOf('function markerInside'), script.indexOf('function toggleMarkers'));
const dom = new JSDOM('');
global.document = dom.window.document;
const { markerInside, markerOutside } = new Function(source + '; return { markerInside, markerOutside };')();

/** What toggleMarkers would do: 'unwrap' strips the markers, 'wrap' adds them. */
function effect(value, from, to, marker) {
  if (markerInside(value, from, to, marker)) return 'unwrap';
  if (markerOutside(value, from, to, marker)) return 'unwrap';
  return 'wrap';
}

const check = (name, value, from, to, marker, expected) =>
  test(name, () => { expect(effect(value, from, to, marker)).toBe(expected); });

const bold = 'A **bold** x';   // "bold" = [4,8),  "**bold**" = [2,10)
const italic = 'A *soft* x';   // "soft" = [3,7)
const both = 'A ***x*** y';    // "x" = [5,6)
const strike = 'A ~~gone~~ x'; // "gone" = [4,8)
const code = 'A `snip` x';     // "snip" = [3,7)

check('bold text + Bold unwraps', bold, 4, 8, '**', 'unwrap');
check('bold text + Italic wraps, never splits the pair', bold, 4, 8, '*', 'wrap');
check('selection including ** + Bold unwraps', bold, 2, 10, '**', 'unwrap');
check('selection including ** + Italic wraps', bold, 2, 10, '*', 'wrap');
check('italic text + Italic unwraps', italic, 3, 7, '*', 'unwrap');
check('italic text + Bold wraps', italic, 3, 7, '**', 'wrap');
check('bold+italic + Italic wraps rather than corrupting', both, 5, 6, '*', 'wrap');
check('bold+italic + Bold wraps rather than corrupting', both, 5, 6, '**', 'wrap');
check('struck text + Strikethrough unwraps', strike, 4, 8, '~~', 'unwrap');
check('struck text + Italic wraps', strike, 4, 8, '*', 'wrap');
check('code span + Inline code unwraps', code, 3, 7, '`', 'unwrap');
check('plain text + Bold wraps', 'A plain x', 2, 7, '**', 'wrap');
check('plain text + Italic wraps', 'A plain x', 2, 7, '*', 'wrap');
