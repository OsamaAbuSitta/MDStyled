// The "MdStyled Templates" menu actions, run against the built extension with a
// stand-in `vscode` module: the template is written to the file, and the preview
// opens (or refreshes) so the result is actually seen.
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'mdstyled-apply-'));

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
    openTextDocument: async uri => textDocument(uri),
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

const read = p => fs.readFileSync(p, 'utf8');
// Waits for an asynchronous effect of a command (no fixed sleeps).
const until = (fn, message) => expect.poll(fn, { message, timeout: 5000 });

test.describe.configure({ mode: 'serial' });

let originalResolve;
test.beforeAll(() => {
  // always build, so the test runs the current sources
  execFileSync(process.execPath, [path.join(ROOT, 'esbuild.js')], { cwd: ROOT, stdio: 'pipe' });

  originalResolve = Module._resolveFilename;
  Module._resolveFilename = function (request, ...rest) {
    if (request === 'vscode') return 'vscode';
    return originalResolve.call(this, request, ...rest);
  };
  require.cache.vscode = { id: 'vscode', filename: 'vscode', loaded: true, exports: vscode };

  const ext = require(path.join(ROOT, 'out', 'extension.js'));
  ext.activate({ subscriptions: [], extensionPath: ROOT, extensionUri: Uri.file(ROOT) });
});

test.afterAll(() => {
  Module._resolveFilename = originalResolve;
  delete require.cache.vscode;
});

test('a command is registered for each template', () => {
  for (const t of ['editable-light', 'editable-dark', 'interactive-light', 'interactive-dark', 'default-light', 'default-dark']) {
    expect(typeof commands['mdstyled.applyTemplate.' + t]).toBe('function');
  }
});

test.describe('from the Explorer', () => {
  const md = path.join(TMP, 'guide.md');

  test('applying a template to a file that is not open anywhere', async () => {
    fs.writeFileSync(md, '---\ntitle: Guide\n---\n# Guide\n\nHello.\n');
    await commands['mdstyled.applyTemplate.editable-dark'](Uri.file(md));
    await until(() => panels.length, 'the preview opens').toBe(1);

    const text = read(md);
    // the file now points at the template
    expect(text).toContain('<!-- @style: ./.mdstyled/editable-dark.css -->');
    expect(text).toContain('<!-- @script: ./.mdstyled/editable-dark.js -->');
    // frontmatter is kept, with the directives after it
    expect(text.startsWith('---\ntitle: Guide\n---\n')).toBe(true);
    // the template files are copied into .mdstyled/
    expect(fs.existsSync(path.join(TMP, '.mdstyled', 'editable-dark.css'))).toBe(true);
    expect(fs.existsSync(path.join(TMP, '.mdstyled', 'editable-dark.js'))).toBe(true);
    // the preview opens for that file and renders with the template
    expect(panels[0].title).toBe('guide.md - MdStyled Preview');
    await until(() => panels[0].html.includes('initEditing'), 'rendered with the template').toBe(true);
    expect(panels[0].html).toContain('mdstyled-root');
  });

  test('applying again reuses the open preview and re-renders it with the new template', async () => {
    const rendersBefore = panels[0].renders;
    await commands['mdstyled.applyTemplate.interactive-light'](Uri.file(md));
    await until(() => panels[0].renders > rendersBefore, 're-rendered').toBe(true);
    await until(() => !panels[0].html.includes('initEditing'), 'new template only').toBe(true);

    expect(panels).toHaveLength(1);
    expect(panels[0].revealed).toBeGreaterThanOrEqual(1);
    expect(panels[0].html).toContain('mdstyled-root');
    expect(read(md)).toContain('interactive-light.css');
    expect(read(md)).not.toContain('editable-dark.css');
  });

  test('re-applying the same template still refreshes the preview', async () => {
    const rendersSame = panels[0].renders;
    await commands['mdstyled.applyTemplate.interactive-light'](Uri.file(md));
    await until(() => panels[0].renders > rendersSame, 'refreshed').toBe(true);
  });

  test('a multi-selection applies to every Markdown file and leaves other files alone', async () => {
    const a = path.join(TMP, 'a.md'), b = path.join(TMP, 'b.md'), notes = path.join(TMP, 'notes.txt');
    fs.writeFileSync(a, '# A\n'); fs.writeFileSync(b, '# B\n'); fs.writeFileSync(notes, 'x');
    await commands['mdstyled.applyTemplate.default-light'](Uri.file(a), [Uri.file(a), Uri.file(b), Uri.file(notes)]);
    await until(() => panels.some(p => p.title === 'a.md - MdStyled Preview'), 'the clicked file\'s preview is shown').toBe(true);
    await until(() => read(a).includes('default-light.css') && read(b).includes('default-light.css'), 'both applied').toBe(true);
    expect(read(notes)).toBe('x');
  });
});

test.describe('MdStyled Edit', () => {
  const themed = path.join(TMP, 'edit-me', 'notes.md');
  const ORIGINAL = '---\ntitle: Notes\n---\n# Notes\n\nPlain file.\n';
  const LIGHT = '#f6f9fe';   // the editor background in editable-light only
  const panel = () => panels.find(p => p.title === 'notes.md - MdStyled Preview');

  test('is registered', () => {
    expect(typeof commands['mdstyled.edit']).toBe('function');
  });

  test('opens straight into editing with the dark template, leaving the file untouched', async () => {
    fs.mkdirSync(path.dirname(themed));
    fs.writeFileSync(themed, ORIGINAL);
    vscode.window.activeColorTheme = { kind: vscode.ColorThemeKind.Dark };
    await commands['mdstyled.edit'](Uri.file(themed));
    await until(() => !!panel() && panel().html.includes('initEditing'), 'the preview opens with the editable template').toBe(true);

    expect(read(themed)).toBe(ORIGINAL);
    expect(fs.existsSync(path.join(TMP, 'edit-me', '.mdstyled'))).toBe(false);
    expect(panel().html).not.toContain(LIGHT);
    expect(panel().html).toMatch(/var startEditing = true;/);
  });

  test('switching to a light theme re-renders as editable-light without forcing edit mode on', async () => {
    const before = panel().renders;
    vscode.window.activeColorTheme = { kind: vscode.ColorThemeKind.Light };
    themeListeners.forEach(fn => fn(vscode.window.activeColorTheme));
    await until(() => panel().renders > before, 're-rendered').toBe(true);

    expect(panel().html).toContain(LIGHT);
    expect(panel().html).toContain('initEditing');
    expect(panel().html).toMatch(/var startEditing = false;/);
  });

  test('a high-contrast light theme counts as light, and edit mode is asked for again', async () => {
    const before = panel().renders;
    vscode.window.activeColorTheme = { kind: vscode.ColorThemeKind.HighContrastLight };
    await commands['mdstyled.edit'](Uri.file(themed));
    await until(() => panel().renders > before, 're-rendered').toBe(true);

    expect(panel().html).toContain(LIGHT);
    expect(panel().html).toMatch(/var startEditing = true;/);
  });

  test('opening it the normal way shows the file\'s own styling again; the file is still untouched', async () => {
    const before = panel().renders;
    await commands['mdstyled.openWith'](Uri.file(themed));
    await until(() => panel().renders > before, 're-rendered').toBe(true);

    expect(panel().html).not.toContain('initEditing');
    expect(panel().html).toMatch(/var startEditing = false;/);
    expect(read(themed)).toBe(ORIGINAL);
  });
});

test('no errors were reported', () => {
  expect(messages.filter(m => m.startsWith('ERROR'))).toEqual([]);
});
