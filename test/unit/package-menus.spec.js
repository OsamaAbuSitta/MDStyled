// The "MdStyled Templates" context submenu: every template has a command, every
// command is in the submenu, and the submenu is offered on Markdown files.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const pkg = require('../../package.json');
const c = pkg.contributes;
const src = fs.readFileSync(path.join(ROOT, 'src', 'templates.ts'), 'utf8');
const templates = [...src.matchAll(/name: '([a-z-]+)'/g)].map(m => m[1]);
const bundled = fs.readdirSync(path.join(ROOT, 'templates'));
const items = c.menus['mdstyled.templates'] || [];
const commands = c.commands.map(x => x.command);
const MENUS = ['explorer/context', 'editor/context', 'editor/title/context'];

test('six templates are listed, editable first', () => {
  expect(templates).toHaveLength(6);
  expect(templates[0]).toBe('editable-light');
});

test('every listed template ships in templates/', () => {
  for (const t of templates) expect(bundled).toContain(t);
});

test('the submenu is declared', () => {
  const submenu = (c.submenus || []).find(s => s.id === 'mdstyled.templates');
  expect(submenu).toBeTruthy();
  expect(submenu.label).toBe('MdStyled Templates');
});

test('the submenu offers every template, in order', () => {
  expect(items.map(i => i.command)).toEqual(templates.map(t => 'mdstyled.applyTemplate.' + t));
});

test('each submenu command is a declared command', () => {
  for (const i of items) expect(commands).toContain(i.command);
});

test('templates are grouped editable / interactive / default', () => {
  expect(items.map(i => i.group.split('@')[0]).join()).toBe(
    '1_editable,1_editable,2_interactive,2_interactive,3_default,3_default');
});

test('MdStyled Edit is its own command, not in the submenu', () => {
  expect((c.commands.find(x => x.command === 'mdstyled.edit') || {}).title).toBe('MdStyled Edit');
  expect(items.some(i => i.command === 'mdstyled.edit')).toBe(false);
});

for (const menu of MENUS) {
  test(`offered in ${menu}, only on Markdown`, () => {
    const entry = (c.menus[menu] || []).find(x => x.submenu === 'mdstyled.templates');
    expect(entry).toBeTruthy();
    expect(entry.when).toMatch(/markdown|\.md/);
  });
}

/* Order inside a menu: group name first, then the number after @. */
const rank = e => { const [g, n] = (e.group || '').split('@'); return [g, Number(n) || 0]; };
const before = (a, b) => { const [ga, na] = rank(a), [gb, nb] = rank(b); return ga < gb || (ga === gb && na < nb); };
for (const menu of MENUS) {
  test(`in ${menu}, MdStyled Edit, then MdStyled Templates, then Export`, () => {
    const list = c.menus[menu] || [];
    const tmpl = list.find(x => x.submenu === 'mdstyled.templates');
    const exp = list.find(x => x.command === 'mdstyled.export');
    const edit = list.find(x => x.command === 'mdstyled.edit');
    expect(edit && tmpl && exp).toBeTruthy();
    expect(before(edit, tmpl)).toBe(true);
    expect(before(tmpl, exp)).toBe(true);
    expect(rank(edit)[0]).toBe(rank(tmpl)[0]);
    expect(edit.when).toMatch(/markdown|\.md/);
  });
}

test('the commands are registered from the template list', () => {
  const ext = fs.readFileSync(path.join(ROOT, 'src', 'extension.ts'), 'utf8');
  expect(ext).toMatch(/getTemplates\(\)\.map\(tmpl =>\s*vscode\.commands\.registerCommand\('mdstyled\.applyTemplate\.' \+ tmpl\.name/);
  expect(ext).toContain("registerCommand('mdstyled.edit'");
});
