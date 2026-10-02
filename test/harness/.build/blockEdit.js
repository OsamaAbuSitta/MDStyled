"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/blockEdit.ts
var blockEdit_exports = {};
__export(blockEdit_exports, {
  applyBlockEdit: () => applyBlockEdit,
  applyBlockEditPlan: () => applyBlockEditPlan,
  planBlockEdit: () => planBlockEdit
});
module.exports = __toCommonJS(blockEdit_exports);
var normalize = (s) => s.replace(/\r\n?/g, "\n").replace(/\n+$/, "");
function planBlockEdit(lines, eol, edit) {
  const startLine = Number(edit.startLine);
  const endLine = Number(edit.endLine);
  if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 0 || endLine < startLine) {
    return { ok: false, error: "Invalid edit range." };
  }
  const lineCount = lines.length;
  const start = Math.min(startLine, lineCount);
  const end = Math.min(endLine, lineCount);
  if (typeof edit.original === "string" && normalize(lines.slice(start, end).join("\n")) !== normalize(edit.original)) {
    return { ok: false, error: "The file changed since this block was loaded. Reload the preview and try again." };
  }
  const keepsTrailingEol = end < lineCount;
  const fileEndsWithEol = lineCount > 0 && lines[lineCount - 1].length === 0;
  let body = (typeof edit.text === "string" ? edit.text : "").replace(/\r\n?/g, "\n");
  if (body === "") {
  } else if (keepsTrailingEol) {
    if (!body.endsWith("\n")) body += "\n";
  } else {
    body = body.replace(/\n+$/, "");
    if (fileEndsWithEol) body += "\n";
  }
  return { ok: true, start, end, replacement: body.split("\n").join(eol) };
}
function applyBlockEditPlan(text, plan) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r\n|\n/);
  const offsetOf = (line) => {
    if (line >= lines.length) return text.length;
    let offset = 0;
    for (let i = 0; i < line; i++) offset += lines[i].length + eol.length;
    return offset;
  };
  const from = offsetOf(plan.start);
  const to = plan.end >= lines.length ? text.length : offsetOf(plan.end);
  return text.slice(0, from) + plan.replacement + text.slice(to);
}
function applyBlockEdit(text, edit) {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const plan = planBlockEdit(text.split(/\r\n|\n/), eol, edit);
  if (!plan.ok) return plan;
  return { ok: true, text: applyBlockEditPlan(text, plan) };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  applyBlockEdit,
  applyBlockEditPlan,
  planBlockEdit
});
