// Loads the template's serializer helpers (htmlToMarkdown etc.) out of the built
// editable template script, plus the JSDOM window they run against.
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

const script = fs.readFileSync(path.join(__dirname, '..', '..', 'templates', 'editable-light', 'script.js'), 'utf8');
// pull the helpers out of the template IIFE for direct testing
const body = script.replace(/^\(function \(\) \{\n  'use strict';/, '').replace(/\}\)\(\);\s*$/, '');
const dom = new JSDOM('<!doctype html><body></body>');
const S = new Function('window', 'document', body + '\n; return { htmlToMarkdown, retypeMarkdown, detectBlockType, plainLines };')(dom.window, dom.window.document);

module.exports = { S, dom, script };
