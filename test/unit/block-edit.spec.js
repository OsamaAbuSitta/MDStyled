// How a block edit from the preview is written back to the Markdown file. Runs the
// real src/blockEdit.ts (bundled), with VS Code's line/range semantics.
const { test, expect } = require('@playwright/test');
const { blockEdit } = require('../harness/build');

const { planBlockEdit, applyBlockEditPlan, applyBlockEdit } = blockEdit();

const apply = (text, edit) => applyBlockEdit(text, edit);
const textOf = (text, edit) => {
  const r = apply(text, edit);
  if (!r.ok) throw new Error('edit refused: ' + r.error);
  return r.text;
};

const withEol = '# T\n\npara one\n\n- a\n- b\n\nlast para\n';
const noEol = '# T\n\npara one\n\nlast para';

test.describe('replacing blocks', () => {
  test('middle block', () => {
    expect(textOf(withEol, { startLine: 2, endLine: 3, text: 'para EDITED', original: 'para one' }))
      .toBe('# T\n\npara EDITED\n\n- a\n- b\n\nlast para\n');
  });

  test('block grows to several lines', () => {
    expect(textOf(withEol, { startLine: 2, endLine: 3, text: 'one\n\ntwo', original: 'para one' }))
      .toBe('# T\n\none\n\ntwo\n\n- a\n- b\n\nlast para\n');
  });

  test('list block keeps the blank separator', () => {
    expect(textOf(withEol, { startLine: 4, endLine: 6, text: '- a\n- b\n- c', original: '- a\n- b' }))
      .toBe('# T\n\npara one\n\n- a\n- b\n- c\n\nlast para\n');
  });

  test('last block keeps the file trailing newline', () => {
    expect(textOf(withEol, { startLine: 7, endLine: 8, text: 'last EDITED', original: 'last para' }))
      .toBe('# T\n\npara one\n\n- a\n- b\n\nlast EDITED\n');
  });

  test('last block in a file with no trailing newline', () => {
    expect(textOf(noEol, { startLine: 4, endLine: 5, text: 'last EDITED', original: 'last para' }))
      .toBe('# T\n\npara one\n\nlast EDITED');
  });

  test('last line, file with trailing newline: extra trailing newlines in the text are collapsed', () => {
    expect(textOf(withEol, { startLine: 7, endLine: 9, text: 'last EDITED\n\n\n', original: 'last para' }))
      .toBe('# T\n\npara one\n\n- a\n- b\n\nlast EDITED\n');
  });

  test('last line, file without trailing newline: a trailing newline in the text is not added', () => {
    expect(textOf(noEol, { startLine: 4, endLine: 5, text: 'last EDITED\n', original: 'last para' }))
      .toBe('# T\n\npara one\n\nlast EDITED');
  });

  test('whole document', () => {
    expect(textOf(withEol, { startLine: 0, endLine: 9, text: '# New\n\nbody\n', original: withEol }))
      .toBe('# New\n\nbody\n');
  });

  test('whole document, no trailing newline in file', () => {
    expect(textOf(noEol, { startLine: 0, endLine: 5, text: '# New\n\nbody', original: noEol }))
      .toBe('# New\n\nbody');
  });

  test('an edit without an original is applied without the staleness check', () => {
    expect(textOf(withEol, { startLine: 2, endLine: 3, text: 'para EDITED' }))
      .toBe('# T\n\npara EDITED\n\n- a\n- b\n\nlast para\n');
  });
});

test.describe('stale edits', () => {
  test('stale edit refused', () => {
    const r = apply(withEol, { startLine: 2, endLine: 3, text: 'x', original: 'something else' });
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/changed/);
  });

  test('a stale original never modifies anything (plan is refused)', () => {
    const plan = planBlockEdit(withEol.split('\n'), '\n', { startLine: 4, endLine: 6, text: 'x', original: '- a' });
    expect(plan.ok).toBe(false);
  });

  test('line-ending and trailing-newline differences in original are tolerated', () => {
    const r = apply(withEol, { startLine: 2, endLine: 3, text: 'y', original: 'para one\r\n\r\n' });
    expect(r.ok).toBe(true);
  });
});

test.describe('deleting', () => {
  test('deleting a block with its blank line', () => {
    expect(textOf(withEol, { startLine: 4, endLine: 7, text: '', original: '- a\n- b\n' }))
      .toBe('# T\n\npara one\n\nlast para\n');
  });

  test('deleting the last block', () => {
    expect(textOf(withEol, { startLine: 7, endLine: 9, text: '', original: 'last para\n' }))
      .toBe('# T\n\npara one\n\n- a\n- b\n\n');
  });

  test('empty text deletes the lines rather than leaving a blank one', () => {
    expect(textOf(withEol, { startLine: 2, endLine: 3, text: '', original: 'para one' }))
      .toBe('# T\n\n\n- a\n- b\n\nlast para\n');
  });

  test('empty text with a missing text field also deletes', () => {
    expect(textOf(withEol, { startLine: 2, endLine: 3, original: 'para one' }))
      .toBe('# T\n\n\n- a\n- b\n\nlast para\n');
  });
});

test.describe('inserting (zero-length ranges, as the + menu sends them)', () => {
  test('insert after the list block (line = its end)', () => {
    expect(textOf(withEol, { startLine: 6, endLine: 6, text: '\n## New', original: '' }))
      .toBe('# T\n\npara one\n\n- a\n- b\n\n## New\n\nlast para\n');
  });

  test('insert after the first paragraph', () => {
    expect(textOf(withEol, { startLine: 3, endLine: 3, text: '\n## New', original: '' }))
      .toBe('# T\n\npara one\n\n## New\n\n- a\n- b\n\nlast para\n');
  });

  test('insert between adjacent blocks keeps them apart', () => {
    expect(textOf('# T\npara\n', { startLine: 1, endLine: 1, text: '\n## New\n\n', original: '' }))
      .toBe('# T\n\n## New\n\npara\n');
  });

  test('append to a file ending in a newline', () => {
    expect(textOf(withEol, { startLine: 9, endLine: 9, text: '\n## New', original: '' }))
      .toBe('# T\n\npara one\n\n- a\n- b\n\nlast para\n\n## New\n');
  });

  test('append to a file with no trailing newline', () => {
    expect(textOf(noEol, { startLine: 5, endLine: 5, text: '\n\n## New', original: '' }))
      .toBe('# T\n\npara one\n\nlast para\n\n## New');
  });

  test('a zero-length range inserts without removing anything', () => {
    const plan = planBlockEdit(['a', 'b', ''], '\n', { startLine: 1, endLine: 1, text: 'X', original: '' });
    expect(plan).toEqual({ ok: true, start: 1, end: 1, replacement: 'X\n' });
  });
});

test.describe('CRLF files', () => {
  const crlf = s => s.replace(/\n/g, '\r\n');

  test('editing keeps CRLF, including for multi-line text', () => {
    const out = textOf(crlf(withEol), { startLine: 2, endLine: 3, text: 'one\n\ntwo', original: 'para one' });
    expect(out).toBe(crlf('# T\n\none\n\ntwo\n\n- a\n- b\n\nlast para\n'));
    expect(out.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });

  test('text that arrives with CRLF or bare CR is normalised to the file ending', () => {
    const out = textOf(crlf(withEol), { startLine: 2, endLine: 3, text: 'a\r\nb\rc', original: 'para one' });
    expect(out).toBe(crlf('# T\n\na\nb\nc\n\n- a\n- b\n\nlast para\n'));
  });

  test('the last line of a CRLF file keeps its trailing CRLF', () => {
    expect(textOf(crlf(withEol), { startLine: 7, endLine: 8, text: 'last EDITED', original: 'last para' }))
      .toBe(crlf('# T\n\npara one\n\n- a\n- b\n\nlast EDITED\n'));
  });

  test('the last line of a CRLF file without a trailing newline stays without one', () => {
    expect(textOf(crlf(noEol), { startLine: 4, endLine: 5, text: 'last EDITED', original: 'last para' }))
      .toBe(crlf('# T\n\npara one\n\nlast EDITED'));
  });

  test('inserting into a CRLF file uses CRLF', () => {
    expect(textOf(crlf(withEol), { startLine: 3, endLine: 3, text: '\n## New', original: '' }))
      .toBe(crlf('# T\n\npara one\n\n## New\n\n- a\n- b\n\nlast para\n'));
  });

  test('deleting from a CRLF file leaves only CRLF endings', () => {
    const out = textOf(crlf(withEol), { startLine: 4, endLine: 7, text: '', original: '- a\n- b\n' });
    expect(out).toBe(crlf('# T\n\npara one\n\nlast para\n'));
  });

  test('a CRLF file matches an original that uses LF', () => {
    expect(apply(crlf(withEol), { startLine: 4, endLine: 6, text: '- a', original: '- a\n- b' }).ok).toBe(true);
  });

  test('planBlockEdit joins the replacement with the eol it is given', () => {
    const plan = planBlockEdit(['a', 'b', ''], '\r\n', { startLine: 0, endLine: 1, text: 'x\ny', original: 'a' });
    expect(plan).toEqual({ ok: true, start: 0, end: 1, replacement: 'x\r\ny\r\n' });
  });

  test('applyBlockEditPlan applies a plan at line offsets counting CRLF', () => {
    expect(applyBlockEditPlan('a\r\nb\r\nc', { start: 1, end: 2, replacement: 'X\r\n' })).toBe('a\r\nX\r\nc');
  });
});

test.describe('ranges', () => {
  test('out-of-range endLine clamps to the end of the file', () => {
    expect(textOf(withEol, { startLine: 7, endLine: 100, text: 'last EDITED', original: 'last para' }))
      .toBe('# T\n\npara one\n\n- a\n- b\n\nlast EDITED\n');
  });

  test('out-of-range endLine is clamped in the plan', () => {
    const plan = planBlockEdit(withEol.split('\n'), '\n', { startLine: 7, endLine: 100, text: 'x', original: 'last para' });
    expect(plan).toEqual({ ok: true, start: 7, end: 9, replacement: 'x\n' });
  });

  test('out-of-range endLine clamps in a file without a trailing newline', () => {
    expect(textOf(noEol, { startLine: 4, endLine: 99, text: 'last EDITED', original: 'last para' }))
      .toBe('# T\n\npara one\n\nlast EDITED');
  });

  test('a start line past the end appends', () => {
    expect(textOf(withEol, { startLine: 50, endLine: 60, text: 'tail', original: '' }))
      .toBe(withEol + 'tail\n');
  });

  const invalid = [
    ['negative startLine', { startLine: -1, endLine: 2 }],
    ['endLine before startLine', { startLine: 3, endLine: 2 }],
    ['NaN startLine', { startLine: NaN, endLine: 2 }],
    ['non-numeric startLine', { startLine: 'abc', endLine: 2 }],
    ['fractional startLine', { startLine: 1.5, endLine: 2 }],
    ['fractional endLine', { startLine: 1, endLine: 2.5 }],
    ['undefined endLine', { startLine: 1 }],
    ['Infinity endLine', { startLine: 1, endLine: Infinity }],
  ];
  for (const [name, range] of invalid) {
    test('invalid range refused: ' + name, () => {
      const r = apply(withEol, Object.assign({ text: 'x', original: '' }, range));
      expect(r.ok).toBe(false);
      expect(r.error).toBe('Invalid edit range.');
    });
  }
});
