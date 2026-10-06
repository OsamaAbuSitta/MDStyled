'use strict';
/**
 * Minimal vscode stub for unit tests.
 *
 * State that tests need to vary (e.g. active theme kind, dialog return values)
 * is read from `global` so it remains accessible even when esbuild inlines this
 * file into a bundle.  Tests set:
 *
 *   global.__vscodeThemeKind = ColorThemeKind.Dark   // for editableForTheme()
 *   global.__vscodeSaveUri   = { fsPath: '/tmp/x' }  // for showSaveDialog()
 *   global.__vscodeConfig    = { 'section.key': val } // for getConfiguration()
 */
const path = require('path');

const ColorThemeKind    = { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 };
const ConfigurationTarget = { Global: 1, Workspace: 2, WorkspaceFolder: 3 };
const EndOfLine         = { LF: 1, CRLF: 2 };

const window = {
  get activeColorTheme() {
    const kind = global.__vscodeThemeKind != null
      ? global.__vscodeThemeKind
      : ColorThemeKind.Light;
    return { kind };
  },
  showSaveDialog:        async () => global.__vscodeSaveUri || null,
  showInformationMessage: async () => undefined,
  showQuickPick:         async () => undefined,
  showInputBox:          async () => undefined,
};

const workspace = {
  getConfiguration(section) {
    return {
      get(key, defaultVal) {
        const cfg = global.__vscodeConfig || {};
        const full = section + '.' + key;
        return full in cfg ? cfg[full] : defaultVal;
      },
      update: async () => {},
    };
  },
  async openTextDocument() {
    return {
      getText: () => '',
      lineCount: 0,
      uri: { fsPath: '', toString: () => '' },
      eol: EndOfLine.LF,
      lineAt: () => ({ text: '' }),
      validateRange: r => r,
    };
  },
  applyEdit: async () => true,
  get workspaceFolders() { return []; },
};

const env      = { openExternal: async () => {} };
const commands = { executeCommand: async () => {} };

const Uri = {
  file(p) {
    return {
      fsPath: p,
      scheme: 'file',
      toString() { return 'file:///' + p.replace(/\\/g, '/').replace(/^\//, ''); },
    };
  },
  joinPath(base, ...parts) {
    const basePath = typeof base === 'string' ? base : (base.fsPath || '');
    return Uri.file(path.join(basePath, ...parts));
  },
};

class Range {
  constructor(startLine, startChar, endLine, endChar) {
    this.start = { line: startLine, character: startChar };
    this.end   = { line: endLine,   character: endChar   };
  }
}

class WorkspaceEdit {
  constructor() { this._ops = []; }
  replace(uri, range, text) { this._ops.push({ type: 'replace', uri, range, text }); }
}

module.exports = {
  window, workspace, env, commands, Uri, Range, WorkspaceEdit,
  ColorThemeKind, ConfigurationTarget, EndOfLine,
};
