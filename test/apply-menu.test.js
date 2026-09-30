// The "MdStyled Templates" menu actions, run against the built extension with a
// stand-in `vscode` module: the template is written to the file, and the preview
// opens (or refreshes) so the result is actually seen.
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

const ROOT = path.join(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mdstyled-apply-'));

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  cond ? pass++ : fail++;
  console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra !== undefined ? '  [' + extra + ']' : ''));
};

// ── a small stand-in for the parts of the VS Code API the extension touches
const commands = {};
const panels = [];
const messages = [];
const docListeners = [];
const themeListeners = [];

class Uri {
  constructor(fsPath) { this.fsPath = fsPath; this.scheme = 'file'; this.path = fsPath; }
  toString() { return 'file://' + this.fsPath; }
  static file(p) { return new Uri(p); }
  static joinPath(base, ...parts) { return new Uri(path.join(base.fsPath, ...parts)); }
}
class Range { constructor(...a) { this.a = a; } }
class WorkspaceEdit {
  constructor() { this.edits = []; }
  replace(uri, range, text) { this.edits.push({ uri, text }); }
}
const disposable = { dispose() {} };
const openDocs = new Map();
function textDocument(uri) {
  return {
    uri, languageId: 'markdown',
    getText: () => fs.readFileSync(uri.fsPath, 'utf8'),
    get lineCount() { return fs.readFileSync(uri.fsPath, 'utf8').split('\n').length; },
    save: async () => true,
  };
}

const vscode = {
  Uri, Range, WorkspaceEdit,
  ViewColumn: { One: 1, Beside: -2 },
  ColorThemeKind: { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 },
  StatusBarAlignment: { Right: 2 },
  commands: {
    registerCommand: (id, fn) => { commands[id] = fn; return disposable; },
    executeCommand: async (id, ...args) => commands[id] ? commands[id](...args) : undefined,
  },
  window: {
    activeColorTheme: { kind: 2 },
    activeTextEditor: undefined,
    visibleTextEditors: [],
    createStatusBarItem: () => ({ show() {}, hide() {}, dispose() {} }),
    onDidChangeActiveTextEditor: () => disposable,
    onDidChangeActiveColorTheme: fn => { themeListeners.push(fn); return disposable; },
    showInformationMessage: async m => { messages.push(m); },
    showErrorMessage: async m => { messages.push('ERROR ' + m); },
    showQuickPick: async () => undefined,
    showInputBox: async () => undefined,
    registerWebviewPanelSerializer: () => disposable,
    createWebviewPanel: (type, title, column) => {
      const panel = {
        type, title, column, html: '', revealed: 0,
        webview: {
          set html(v) { panel.html = v; panel.renders = (panel.renders || 0) + 1; },
          get html() { return panel.html; },
          onDidReceiveMessage: () => disposable,
          postMessage: async () => true,
          asWebviewUri: u => u,
          cspSource: 'vscode-resource:',
        },
        onDidDispose: () => disposable,
        onDidChangeViewState: () => disposable,
        reveal() { panel.revealed++; },
        dispose() {},
      };
      panels.push(panel);
      return panel;
    },
  },
  workspace: {
    workspaceFolders: [],
    getConfiguration: () => ({ get: (k, d) => (k === 'defaultTemplate' ? 'none' : d), update: async () => {} }),
    onDidChangeTextDocument: fn => { docListeners.push(fn); return disposable; },
    onDidChangeConfiguration: () => disposable,
    onDidSaveTextDocument: () => disposable,
    openTextDocument: async uri => { const d = textDocument(uri); openDocs.set(uri.fsPath, d); return d; },
    applyEdit: async edit => {
      for (const e of edit.edits) {
        fs.writeFileSync(e.uri.fsPath, e.text);
        docListeners.forEach(fn => fn({ document: textDocument(e.uri) }));
      }
      return true;
    },
    createFileSystemWatcher: () => ({ onDidChange: () => disposable, onDidCreate: () => disposable, onDidDelete: () => disposable, dispose() {} }),
  },
  ConfigurationTarget: { Global: 1 },
};

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === 'vscode') return 'vscode';
  return resolve.call(this, request, ...rest);
};
require.cache.vscode = { id: 'vscode', filename: 'vscode', loaded: true, exports: vscode };

const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const ext = require(path.join(ROOT, 'out', 'extension.js'));
  const context = { subscriptions: [], extensionPath: ROOT, extensionUri: Uri.file(ROOT) };
  ext.activate(context);

  check('a command is registered for each template',
    ['editable-light', 'editable-dark', 'interactive-light', 'interactive-dark', 'default-light', 'default-dark']
      .every(t => typeof commands['mdstyled.applyTemplate.' + t] === 'function'));

  // ── from the Explorer, on a file that is not open anywhere
  const md = path.join(TMP, 'guide.md');
  fs.writeFileSync(md, '---\ntitle: Guide\n---\n# Guide\n\nHello.\n');
  await commands['mdstyled.applyTemplate.editable-dark'](Uri.file(md));
  await wait(400);

  const text = fs.readFileSync(md, 'utf8');
  check('the file now points at the template',
    text.includes('<!-- @style: ./.mdstyled/editable-dark.css -->') && text.includes('<!-- @script: ./.mdstyled/editable-dark.js -->'),
    JSON.stringify(text));
  check('frontmatter is kept, with the directives after it', text.startsWith('---\ntitle: Guide\n---\n'), JSON.stringify(text.slice(0, 40)));
  check('the template files are copied into .mdstyled/',
    fs.existsSync(path.join(TMP, '.mdstyled', 'editable-dark.css')) && fs.existsSync(path.join(TMP, '.mdstyled', 'editable-dark.js')));

  check('the preview opens for that file', panels.length === 1 && panels[0].title === 'guide.md - MdStyled Preview',
    panels.map(p => p.title).join());
  const html = panels[0] && panels[0].html;
  check('and renders with the template', !!html && html.includes('initEditing') && html.includes('mdstyled-root'),
    html ? html.length + ' chars' : 'no html');

  // ── again, with the preview already open: reuse it and re-render
  const rendersBefore = panels[0].renders;
  await commands['mdstyled.applyTemplate.interactive-light'](Uri.file(md));
  await wait(400);
  check('applying again reuses the open preview', panels.length === 1 && panels[0].revealed >= 1, panels.length);
  check('and re-renders it with the new template',
    panels[0].renders > rendersBefore && !panels[0].html.includes('initEditing') && panels[0].html.includes('mdstyled-root'),
    `${rendersBefore} -> ${panels[0].renders}`);
  check('the file now uses the new template only',
    fs.readFileSync(md, 'utf8').includes('interactive-light.css') && !fs.readFileSync(md, 'utf8').includes('editable-dark.css'));

  // ── re-applying the same template still re-renders (the text does not change)
  const rendersSame = panels[0].renders;
  await commands['mdstyled.applyTemplate.interactive-light'](Uri.file(md));
  await wait(400);
  check('re-applying the same template still refreshes the preview', panels[0].renders > rendersSame,
    `${rendersSame} -> ${panels[0].renders}`);

  // ── several files selected in the Explorer
  const a = path.join(TMP, 'a.md'), b = path.join(TMP, 'b.md'), notes = path.join(TMP, 'notes.txt');
  fs.writeFileSync(a, '# A\n'); fs.writeFileSync(b, '# B\n'); fs.writeFileSync(notes, 'x');
  await commands['mdstyled.applyTemplate.default-light'](Uri.file(a), [Uri.file(a), Uri.file(b), Uri.file(notes)]);
  await wait(400);
  check('a multi-selection applies to every Markdown file',
    fs.readFileSync(a, 'utf8').includes('default-light.css') && fs.readFileSync(b, 'utf8').includes('default-light.css'));
  check('and leaves other files alone', fs.readFileSync(notes, 'utf8') === 'x');
  check('the clicked file\'s preview is shown', panels.some(p => p.title === 'a.md - MdStyled Preview'));

  // ── MdStyled Edit: straight into editing, and the file is left exactly as it was
  check('MdStyled Edit is registered', typeof commands['mdstyled.edit'] === 'function');
  const themed = path.join(TMP, 'edit-me', 'notes.md');
  fs.mkdirSync(path.dirname(themed));
  const ORIGINAL = '---\ntitle: Notes\n---\n# Notes\n\nPlain file.\n';
  fs.writeFileSync(themed, ORIGINAL);
  const panel = () => panels.find(p => p.title === 'notes.md - MdStyled Preview');
  const LIGHT = '#f6f9fe';   // the editor background in editable-light only

  vscode.window.activeColorTheme = { kind: vscode.ColorThemeKind.Dark };
  await commands['mdstyled.edit'](Uri.file(themed));
  await wait(400);
  check('the file is not changed at all', fs.readFileSync(themed, 'utf8') === ORIGINAL);
  check('no .mdstyled/ folder is created', !fs.existsSync(path.join(TMP, 'edit-me', '.mdstyled')));
  check('the preview opens with the editable template', !!panel() && panel().html.includes('initEditing'));
  check('in a dark theme, editable-dark', !!panel() && !panel().html.includes(LIGHT));
  check('and starts in edit mode', !!panel() && /var startEditing = true;/.test(panel().html));

  vscode.window.activeColorTheme = { kind: vscode.ColorThemeKind.Light };
  themeListeners.forEach(fn => fn(vscode.window.activeColorTheme));
  await wait(400);
  check('switching to a light theme re-renders it as editable-light', panel().html.includes(LIGHT) && panel().html.includes('initEditing'));
  check('without forcing edit mode back on - that was a one-off', /var startEditing = false;/.test(panel().html));

  vscode.window.activeColorTheme = { kind: vscode.ColorThemeKind.HighContrastLight };
  await commands['mdstyled.edit'](Uri.file(themed));
  await wait(400);
  check('a high-contrast light theme counts as light, and edit mode is asked for again',
    panel().html.includes(LIGHT) && /var startEditing = true;/.test(panel().html));

  await commands['mdstyled.openWith'](Uri.file(themed));
  await wait(400);
  check('opening it the normal way shows the file\'s own styling again',
    !panel().html.includes('initEditing') && /var startEditing = false;/.test(panel().html));
  check('and the file is still untouched', fs.readFileSync(themed, 'utf8') === ORIGINAL);

  check('no errors were reported', !messages.some(m => m.startsWith('ERROR')), messages.filter(m => m.startsWith('ERROR')).join(' | '));
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})().catch(err => { console.error('FAILED:', err); process.exit(1); });
