// The "MdStyled Templates" context submenu: every template has a command, every
// command is in the submenu, and the submenu is offered on Markdown files.
const fs = require('fs');
const path = require('path');

const pkg = require('../package.json');
const c = pkg.contributes;
const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'templates.ts'), 'utf8');
const templates = [...src.matchAll(/name: '([a-z-]+)'/g)].map(m => m[1]);
const bundled = fs.readdirSync(path.join(__dirname, '..', 'templates'));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  cond ? pass++ : fail++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
};

check('six templates are listed, editable first', templates.length === 6 && templates[0] === 'editable-light', templates.join());
check('every listed template ships in templates/', templates.every(t => bundled.includes(t)));

const submenu = (c.submenus || []).find(s => s.id === 'mdstyled.templates');
check('the submenu is declared', submenu && submenu.label === 'MdStyled Templates');

const items = c.menus['mdstyled.templates'] || [];
const commands = c.commands.map(x => x.command);
check('the submenu offers every template, in order',
  items.map(i => i.command).join() === templates.map(t => 'mdstyled.applyTemplate.' + t).join(),
  items.map(i => i.command).join());
check('each submenu command is a declared command', items.every(i => commands.includes(i.command)));
check('templates are grouped editable / interactive / default',
  items.map(i => i.group.split('@')[0]).join() ===
  '1_editable,1_editable,2_interactive,2_interactive,3_default,3_default');
check('MdStyled Edit is its own command, not in the submenu',
  (c.commands.find(x => x.command === 'mdstyled.edit') || {}).title === 'MdStyled Edit' &&
  !items.some(i => i.command === 'mdstyled.edit'));

for (const menu of ['explorer/context', 'editor/context', 'editor/title/context']) {
  const entry = (c.menus[menu] || []).find(x => x.submenu === 'mdstyled.templates');
  check(`offered in ${menu}, only on Markdown`, entry && /markdown|\.md/.test(entry.when), entry && entry.when);
}

/* Order inside a menu: group name first, then the number after @. */
const rank = e => { const [g, n] = (e.group || '').split('@'); return [g, Number(n) || 0]; };
const before = (a, b) => { const [ga, na] = rank(a), [gb, nb] = rank(b); return ga < gb || (ga === gb && na < nb); };
for (const menu of ['explorer/context', 'editor/context', 'editor/title/context']) {
  const list = c.menus[menu] || [];
  const tmpl = list.find(x => x.submenu === 'mdstyled.templates');
  const exp = list.find(x => x.command === 'mdstyled.export');
  const edit = list.find(x => x.command === 'mdstyled.edit');
  check(`in ${menu}, MdStyled Edit, then MdStyled Templates, then Export`,
    edit && tmpl && exp && before(edit, tmpl) && before(tmpl, exp) &&
    rank(edit)[0] === rank(tmpl)[0] && /markdown|\.md/.test(edit.when),
    JSON.stringify([edit && edit.group, tmpl && tmpl.group, exp && exp.group]));
}

const ext = fs.readFileSync(path.join(__dirname, '..', 'src', 'extension.ts'), 'utf8');
check('the commands are registered from the template list',
  /getTemplates\(\)\.map\(tmpl =>\s*vscode\.commands\.registerCommand\('mdstyled\.applyTemplate\.' \+ tmpl\.name/.test(ext) &&
  ext.includes("registerCommand('mdstyled.edit'"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
