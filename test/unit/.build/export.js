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
    var ColorThemeKind = { Light: 1, Dark: 2, HighContrast: 3, HighContrastLight: 4 };
    var ConfigurationTarget = { Global: 1, Workspace: 2, WorkspaceFolder: 3 };
    var EndOfLine = { LF: 1, CRLF: 2 };
    var window2 = {
      get activeColorTheme() {
        const kind = global.__vscodeThemeKind != null ? global.__vscodeThemeKind : ColorThemeKind.Light;
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
    var env2 = { openExternal: async () => {
    } };
    var commands2 = { executeCommand: async () => {
    } };
    var Uri2 = {
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
        return Uri2.file(path2.join(basePath, ...parts));
      }
    };
    var Range = class {
      constructor(startLine, startChar, endLine, endChar) {
        this.start = { line: startLine, character: startChar };
        this.end = { line: endLine, character: endChar };
      }
    };
    var WorkspaceEdit = class {
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
      env: env2,
      commands: commands2,
      Uri: Uri2,
      Range,
      WorkspaceEdit,
      ColorThemeKind,
      ConfigurationTarget,
      EndOfLine
    };
  }
});

// src/export.ts
var export_exports = {};
__export(export_exports, {
  exportDocument: () => exportDocument,
  promptAndExport: () => promptAndExport
});
module.exports = __toCommonJS(export_exports);
var vscode = __toESM(require_vscode());
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_engine = require("./engine");
var import_defaultTemplate = require("./defaultTemplate");
var import_engine2 = require("./engine");
var PRINT_CSS = `
@media print {
  .mdstyled-toc,
  .mdstyled-edit-bar,
  .mdstyled-insert-line,
  .mdstyled-block-editor,
  .mdstyled-source-editor,
  .accordion-toggle,
  .copy-code-button,
  .table-interactive-controls,
  .table-pagination { display: none !important; }

  /* Nothing may stay collapsed or clipped in the printed copy. */
  .accordion-content { display: block !important; }
  .table-wrapper { overflow: visible !important; }
  tr { page-break-inside: avoid; }
  h1, h2, h3, h4 { page-break-after: avoid; }
  pre, blockquote, table, figure { page-break-inside: avoid; }

  body { display: block !important; max-width: none !important; padding: 0 !important; background: #fff !important; }
  .mdstyled-root { max-width: none !important; }
  a { text-decoration: underline; }
  a[href^="http"]::after { content: " (" attr(href) ")"; font-size: 0.75em; color: #666; }
}

@page { margin: 18mm 14mm; }
`;
var PRINT_SCRIPT = `
window.addEventListener('load', function () {
  setTimeout(function () { window.print(); }, 400);
});
`;
function absolutizeAssets(html, markdownDir) {
  return html.replace(/(src|href)=["']([^"']+)["']/gi, (match, attr, value) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith("#")) return match;
    const absolute = path.resolve(markdownDir, value);
    if (!fs.existsSync(absolute)) return match;
    return `${attr}="${vscode.Uri.file(absolute).toString()}"`;
  });
}
async function buildPage(documentUri, extensionPath, format) {
  const markdownPath = documentUri.fsPath;
  const markdownDir = path.dirname(markdownPath);
  const extensions = vscode.workspace.getConfiguration("mdstyled.extensions").get("enabled", ["mermaid", "copy-code", "highlight"]);
  let fallback;
  if (!await (0, import_engine2.hasFileLevelStyling)(markdownPath)) {
    fallback = await (0, import_defaultTemplate.resolveDefaultTemplateAssets)(extensionPath, { prompt: false });
  }
  const rendered = await (0, import_engine.renderMdStyled)(markdownPath, extensions, void 0, fallback, false, false);
  const page = absolutizeAssets(rendered, markdownDir).replace("</head>", `<style>${PRINT_CSS}</style>
</head>`);
  return format === "pdf" ? page.replace("</body>", `<script>${PRINT_SCRIPT}</script>
</body>`) : page;
}
async function askWhereToSave(documentUri, format) {
  const base = path.basename(documentUri.fsPath, path.extname(documentUri.fsPath));
  const suggested = path.join(path.dirname(documentUri.fsPath), base + "." + format);
  return vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(suggested),
    saveLabel: "Export",
    title: format === "pdf" ? "Export as PDF" : "Export as HTML",
    filters: format === "pdf" ? { PDF: ["pdf"] } : { HTML: ["html", "htm"] }
  });
}
async function exportDocument(documentUri, extensionPath, format) {
  const target = await askWhereToSave(documentUri, format);
  if (!target) return;
  const page = await buildPage(documentUri, extensionPath, format);
  if (format === "html") {
    await fs.promises.writeFile(target.fsPath, page, "utf-8");
    const open = await vscode.window.showInformationMessage(
      `Exported to ${path.basename(target.fsPath)}`,
      "Open",
      "Show in folder"
    );
    if (open === "Open") await vscode.env.openExternal(target);
    if (open === "Show in folder") await vscode.commands.executeCommand("revealFileInOS", target);
    return;
  }
  const printable = vscode.Uri.file(
    path.join(path.dirname(target.fsPath), "." + path.basename(target.fsPath, ".pdf") + ".mdstyled-print.html")
  );
  await fs.promises.writeFile(printable.fsPath, page, "utf-8");
  await vscode.env.openExternal(printable);
  vscode.window.showInformationMessage(
    `MdStyled opened a print-ready copy in your browser. Choose "Save as PDF" and save it as ${path.basename(target.fsPath)}.`
  );
}
async function promptAndExport(documentUri, extensionPath) {
  const choice = await vscode.window.showQuickPick(
    [
      { label: "PDF", description: "Print-ready page, saved as PDF from the browser dialog", format: "pdf" },
      { label: "HTML", description: "One self-contained file with the styling baked in", format: "html" }
    ],
    { placeHolder: "Export this document as" }
  );
  if (!choice) return;
  await exportDocument(documentUri, extensionPath, choice.format);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  exportDocument,
  promptAndExport
});
