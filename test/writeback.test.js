// Replicates MdStyledPreviewProvider.handleMessage against a plain string buffer,
// using VS Code's line/range semantics, to check the write-back arithmetic.
function applySave(fileText, msg) {
  const lines = fileText.split('\n');
  const lineCount = lines.length;
  const offsetOf = (line, ch) => lines.slice(0, line).reduce((n, l) => n + l.length + 1, 0) + ch;

  const startLine = msg.startLine;
  const end = Math.min(msg.endLine, lineCount);
  // validateRange: (end, 0) is clamped to the end of the last line when end === lineCount
  const endPos = end === lineCount ? [lineCount - 1, lines[lineCount - 1].length] : [end, 0];
  const from = offsetOf(startLine, 0);
  const to = offsetOf(endPos[0], endPos[1]);

  const normalize = s => s.replace(/\r\n?/g, '\n').replace(/\n+$/, '');
  const rangeText = fileText.slice(from, to);
  if (typeof msg.original === 'string' && normalize(rangeText) !== normalize(msg.original)) {
    return { error: 'stale' };
  }
  const keepsTrailingEol = end < lineCount;
  const fileEndsWithEol = lineCount > 0 && lines[lineCount - 1].length === 0;
  let body = msg.text.replace(/\r\n?/g, '\n');
  if (body === '') {
    // delete the lines outright
  } else if (keepsTrailingEol) {
    if (!body.endsWith('\n')) body += '\n';
  } else {
    body = body.replace(/\n+$/, '');
    if (fileEndsWithEol) body += '\n';
  }
  return { text: fileText.slice(0, from) + body + fileText.slice(to) };
}

const withEol = '# T\n\npara one\n\n- a\n- b\n\nlast para\n';
const noEol   = '# T\n\npara one\n\nlast para';
let pass = 0, fail = 0;
function check(name, actual, expected) {
  const ok = actual === expected;
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '\n  got:      ' + JSON.stringify(actual) + '\n  expected: ' + JSON.stringify(expected)));
}

check('middle block',
  applySave(withEol, { startLine: 2, endLine: 3, text: 'para EDITED', original: 'para one' }).text,
  '# T\n\npara EDITED\n\n- a\n- b\n\nlast para\n');

check('block grows to several lines',
  applySave(withEol, { startLine: 2, endLine: 3, text: 'one\n\ntwo', original: 'para one' }).text,
  '# T\n\none\n\ntwo\n\n- a\n- b\n\nlast para\n');

check('list block keeps the blank separator',
  applySave(withEol, { startLine: 4, endLine: 6, text: '- a\n- b\n- c', original: '- a\n- b' }).text,
  '# T\n\npara one\n\n- a\n- b\n- c\n\nlast para\n');

check('last block keeps the file trailing newline',
  applySave(withEol, { startLine: 7, endLine: 8, text: 'last EDITED', original: 'last para' }).text,
  '# T\n\npara one\n\n- a\n- b\n\nlast EDITED\n');

check('last block in a file with no trailing newline',
  applySave(noEol, { startLine: 4, endLine: 5, text: 'last EDITED', original: 'last para' }).text,
  '# T\n\npara one\n\nlast EDITED');

check('whole document',
  applySave(withEol, { startLine: 0, endLine: 9, text: '# New\n\nbody\n', original: withEol }).text,
  '# New\n\nbody\n');

check('whole document, no trailing newline in file',
  applySave(noEol, { startLine: 0, endLine: 5, text: '# New\n\nbody', original: noEol }).text,
  '# New\n\nbody');

check('stale edit refused',
  applySave(withEol, { startLine: 2, endLine: 3, text: 'x', original: 'something else' }).error,
  'stale');

check('deleting a block with its blank line',
  applySave(withEol, { startLine: 4, endLine: 7, text: '', original: '- a\n- b\n' }).text,
  '# T\n\npara one\n\nlast para\n');

check('deleting the last block',
  applySave(withEol, { startLine: 7, endLine: 9, text: '', original: 'last para\n' }).text,
  '# T\n\npara one\n\n- a\n- b\n\n');

// --- inserts (zero-length ranges, as the + menu sends them) ---
check('insert after the list block (line = its end)',
  applySave(withEol, { startLine: 6, endLine: 6, text: '\n## New', original: '' }).text,
  '# T\n\npara one\n\n- a\n- b\n\n## New\n\nlast para\n');

check('insert after the first paragraph',
  applySave(withEol, { startLine: 3, endLine: 3, text: '\n## New', original: '' }).text,
  '# T\n\npara one\n\n## New\n\n- a\n- b\n\nlast para\n');

check('insert between adjacent blocks keeps them apart',
  applySave('# T\npara\n', { startLine: 1, endLine: 1, text: '\n## New\n\n', original: '' }).text,
  '# T\n\n## New\n\npara\n');

check('append to a file ending in a newline',
  applySave(withEol, { startLine: 9, endLine: 9, text: '\n## New', original: '' }).text,
  '# T\n\npara one\n\n- a\n- b\n\nlast para\n\n## New\n');

check('append to a file with no trailing newline',
  applySave(noEol, { startLine: 5, endLine: 5, text: '\n\n## New', original: '' }).text,
  '# T\n\npara one\n\nlast para\n\n## New');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
