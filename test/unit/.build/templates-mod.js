"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// test/unit/stubs/vscode.js
var require_vscode = __commonJS({
  "test/unit/stubs/vscode.js"(exports2, module2) {
    "use strict";
    var path2 = require("path");
    var ColorThemeKind2 = { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 };
    var ConfigurationTarget = { Global: 1, Workspace: 2, WorkspaceFolder: 3 };
    var EndOfLine = { LF: 1, CRLF: 2 };
    var window2 = {
      get activeColorTheme() {
        const kind = global.__vscodeThemeKind != null ? global.__vscodeThemeKind : ColorThemeKind2.Light;
        return { kind };
      },
      showSaveDialog: async () => global.__vscodeSaveUri || null,
      showInformationMessage: async () => void 0,
      showQuickPick: async () => void 0,
      showInputBox: async () => void 0
    };
    var workspace2 = {
      getConfiguration(section) {
        return {
          get(key, defaultVal) {
            const cfg = global.__vscodeConfig || {};
            const full = section + "." + key;
            return full in cfg ? cfg[full] : defaultVal;
          },
          update: async () => {
          }
        };
      },
      async openTextDocument() {
        return {
          getText: () => "",
          lineCount: 0,
          uri: { fsPath: "", toString: () => "" },
          eol: EndOfLine.LF,
          lineAt: () => ({ text: "" }),
          validateRange: (r) => r
        };
      },
      applyEdit: async () => true,
      get workspaceFolders() {
        return [];
      }
    };
    var env = { openExternal: async () => {
    } };
    var commands = { executeCommand: async () => {
    } };
    var Uri = {
      file(p) {
        return {
          fsPath: p,
          scheme: "file",
          toString() {
            return "file:///" + p.replace(/\\/g, "/").replace(/^\//, "");
          }
        };
      },
      joinPath(base, ...parts) {
        const basePath = typeof base === "string" ? base : base.fsPath || "";
        return Uri.file(path2.join(basePath, ...parts));
      }
    };
    var Range2 = class {
      constructor(startLine, startChar, endLine, endChar) {
        this.start = { line: startLine, character: startChar };
        this.end = { line: endLine, character: endChar };
      }
    };
    var WorkspaceEdit2 = class {
      constructor() {
        this._ops = [];
      }
      replace(uri, range, text) {
        this._ops.push({ type: "replace", uri, range, text });
      }
    };
    module2.exports = {
      window: window2,
      workspace: workspace2,
      env,
      commands,
      Uri,
      Range: Range2,
      WorkspaceEdit: WorkspaceEdit2,
      ColorThemeKind: ColorThemeKind2,
      ConfigurationTarget,
      EndOfLine
    };
  }
});

// src/templates.ts
var templates_exports = {};
__export(templates_exports, {
  applyTemplate: () => applyTemplate,
  applyTemplateByName: () => applyTemplateByName,
  editableForTheme: () => editableForTheme,
  getTemplates: () => getTemplates
});
module.exports = __toCommonJS(templates_exports);
var vscode = __toESM(require_vscode());
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var templates = [
  {
    name: "editable-light",
    description: "Interactive light theme plus an Edit button for editing the Markdown in the preview",
    hasCSS: true,
    hasJS: true
  },
  {
    name: "editable-dark",
    description: "Interactive dark theme plus an Edit button for editing the Markdown in the preview",
    hasCSS: true,
    hasJS: true
  },
  {
    name: "interactive-light",
    description: "Light theme with interactive tables (sort, filter, search) and TOC sidebar",
    hasCSS: true,
    hasJS: true
  },
  {
    name: "interactive-dark",
    description: "Dark theme with interactive tables (sort, filter, search) and TOC sidebar",
    hasCSS: true,
    hasJS: true
  },
  {
    name: "default-light",
    description: "Light documentation theme with TOC sidebar, copy buttons, and mermaid support",
    hasCSS: true,
    hasJS: true
  },
  {
    name: "default-dark",
    description: "Dark documentation theme with TOC sidebar, copy buttons, and mermaid support",
    hasCSS: true,
    hasJS: true
  }
];
function editableForTheme() {
  const kind = vscode.window.activeColorTheme?.kind;
  const dark = kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast;
  return dark ? "editable-dark" : "editable-light";
}
function getTemplates() {
  return templates;
}
async function copyWithConflictCheck(extensionPath, tmpl, mdDir) {
  const mdstyledDir = path.join(mdDir, ".mdstyled");
  await fs.promises.mkdir(mdstyledDir, { recursive: true });
  const used = [];
  for (const asset of ["css", "js"]) {
    if (!(asset === "css" ? tmpl.hasCSS : tmpl.hasJS)) continue;
    const src = path.join(extensionPath, "templates", tmpl.name, asset === "css" ? "style.css" : "script.js");
    const defaultDest = path.join(mdstyledDir, tmpl.name + "." + (asset === "css" ? "css" : "js"));
    let finalPath = defaultDest;
    if (fs.existsSync(defaultDest)) {
      const action = await vscode.window.showQuickPick(
        [
          { label: "Overwrite", description: "Replace " + tmpl.name + "." + (asset === "css" ? "css" : "js") },
          { label: "New name", description: "Create a new file with a different name and update the reference" },
          { label: "Use existing", description: "Keep existing file and use it as-is" }
        ],
        { placeHolder: tmpl.name + "." + (asset === "css" ? "css" : "js") + " already exists. What to do?" }
      );
      if (!action || action.label === "Use existing") {
        used.push(".mdstyled/" + tmpl.name + "." + (asset === "css" ? "css" : "js"));
        continue;
      }
      if (action.label === "New name") {
        const nameInput = await vscode.window.showInputBox({
          prompt: "Enter a new file name (without extension)",
          value: tmpl.name + "-custom",
          validateInput: (v) => v.trim() ? null : "Name cannot be empty"
        });
        if (!nameInput) {
          used.push(".mdstyled/" + tmpl.name + "." + (asset === "css" ? "css" : "js"));
          continue;
        }
        finalPath = path.join(mdstyledDir, nameInput.trim() + "." + (asset === "css" ? "css" : "js"));
      }
    }
    await fs.promises.copyFile(src, finalPath);
    used.push(".mdstyled/" + path.basename(finalPath));
  }
  return { used };
}
async function applyTemplate(editor, extensionPath) {
  const picks = templates.map((t) => ({
    label: t.name,
    description: t.description
  }));
  const chosen = await vscode.window.showQuickPick(picks, {
    placeHolder: "Select an MdStyled template to apply"
  });
  if (!chosen) return;
  await applyTemplateByName(editor.document.uri, extensionPath, chosen.label);
}
async function applyTemplateByName(uri, extensionPath, name) {
  const tmpl = templates.find((t) => t.name === name);
  if (!tmpl) return false;
  const mdDir = path.dirname(uri.fsPath);
  const { used } = await copyWithConflictCheck(extensionPath, tmpl, mdDir);
  const directives = used.map((f) => {
    const ext = path.extname(f);
    if (ext === ".css") return "<!-- @style: ./" + f + " -->";
    return "<!-- @script: ./" + f + " -->";
  });
  const doc = await vscode.workspace.openTextDocument(uri);
  const text = doc.getText();
  const cleaned = text.replace(/<!--\s*@(style|script):\s*\.\/\.mdstyled\/\S+\s*-->\s*\n?/g, "");
  const frontmatterMatch = cleaned.match(/^---[\s\S]*?---\s*\n?/);
  let insertPos;
  let prefix = "";
  if (frontmatterMatch) {
    insertPos = frontmatterMatch[0].length;
    prefix = "\n";
  } else {
    insertPos = 0;
  }
  const insertText = prefix + directives.join("\n") + "\n\n";
  const edit = new vscode.WorkspaceEdit();
  const head = frontmatterMatch ? cleaned.slice(0, insertPos) : "";
  const fullReplacement = head + insertText + cleaned.slice(insertPos);
  edit.replace(doc.uri, new vscode.Range(0, 0, doc.lineCount, 0), fullReplacement);
  await vscode.workspace.applyEdit(edit);
  await doc.save();
  return true;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyTemplate,
  applyTemplateByName,
  editableForTheme,
  getTemplates
});
