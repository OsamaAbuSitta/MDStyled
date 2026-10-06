/**
 * A stand-in for the VS Code preview panel, close enough that the editor cannot tell
 * the difference: the page is rendered by the real engine with a real template, and
 * the webview messages are answered the way previewProvider answers them -
 *
 *  - saves go through the extension's own planBlockEdit, then the file is written;
 *  - a changed file re-renders the page 300 ms later (the provider's debounce), but
 *    never while an editor is open - it catches up when the editor closes;
 *  - a re-render replaces the whole page, and getState/setState survive it.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { engine, blockEdit, ROOT } = require('./build');

const DEBOUNCE_MS = 300;

/* Installed before any page script: the acquireVsCodeApi a webview would have. */
const WEBVIEW_API = `<script>
(function () {
  var KEY = 'mdstyled-webview-state';
  var api = {
    getState: function () { try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
    setState: function (s) { sessionStorage.setItem(KEY, JSON.stringify(s)); return s; },
    postMessage: function (m) {
      window.__mdstyledPosts = (window.__mdstyledPosts || []).concat([m]);
      fetch('/message', { method: 'POST', body: JSON.stringify(m) })
        .then(function (r) { return r.json(); })
        .then(function (reply) { if (reply) window.postMessage(reply, '*'); });
    }
  };
  window.acquireVsCodeApi = function () { return api; };
  /* The extension replacing webview.html: a full reload. */
  var events = new EventSource('/events');
  events.onmessage = function (e) { if (e.data === 'reload') location.reload(); };
})();
</script>`;

async function startPreview({ file, template = 'editable-light', editing = true } = {}) {
  const E = engine();
  const { planBlockEdit, applyBlockEditPlan } = blockEdit();
  const T = path.join(ROOT, 'templates', template);
  const fallback = { styles: [path.join(T, 'style.css')], scripts: [path.join(T, 'script.js')] };

  const state = { editorOpen: false, refreshPending: false, timer: null, renders: 0, saves: [], clients: new Set() };

  function refresh() {
    clearTimeout(state.timer);
    state.timer = setTimeout(updateWebview, DEBOUNCE_MS);
  }
  function updateWebview() {
    if (state.editorOpen) { state.refreshPending = true; return; }
    state.renders++;
    for (const res of state.clients) res.write('data: reload\n\n');
  }

  async function handleMessage(msg) {
    const reply = (ok, error, extra) => ({ type: 'mdstyled.result', id: msg.id, ok, error, ...extra });

    if (msg.type === 'mdstyled.editorState') {
      state.editorOpen = !!msg.open;
      if (!state.editorOpen && state.refreshPending) { state.refreshPending = false; refresh(); }
      return null;
    }
    if (msg.type === 'mdstyled.render') return reply(true, undefined, { html: E.renderMarkdownFragment(msg.markdown || '') });
    if (msg.type === 'mdstyled.export') return reply(true);
    if (msg.type === 'mdstyled.navigate' || msg.type === 'mdstyled.back') return reply(false, 'Not available in tests.');
    if (msg.type !== 'mdstyled.saveBlock') return msg.id ? reply(true) : null;

    if (!editing) return reply(false, 'Editing from the preview is turned off (mdstyled.editing.enabled).');
    const text = fs.readFileSync(file, 'utf8');
    const eol = text.includes('\r\n') ? '\r\n' : '\n';
    const plan = planBlockEdit(text.split(/\r\n|\n/), eol, msg);
    if (!plan.ok) return reply(false, plan.error);
    fs.writeFileSync(file, applyBlockEditPlan(text, plan));
    state.saves.push(msg);
    refresh();                                   // onDidChangeTextDocument
    return reply(true);
  }

  const server = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', async () => {
      try {
        if (req.url === '/events') {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
          res.write(': connected\n\n');
          state.clients.add(res);
          res.on('close', () => state.clients.delete(res));
          return;
        }
        if (req.url === '/message') {
          const out = await handleMessage(JSON.parse(body));
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(out));
          return;
        }
        if (req.url === '/' || req.url.startsWith('/?')) {
          const hasOwn = await E.hasFileLevelStyling(file);
          const raw = await E.renderMdStyled(file, ['mermaid', 'copy-code', 'highlight'], undefined, hasOwn ? undefined : fallback, editing, false);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(raw.replace('<head>', '<head>' + WEBVIEW_API));
          return;
        }
        res.statusCode = 404;
        res.end();
      } catch (err) {
        res.statusCode = 500;
        res.end(String(err && err.stack || err));
      }
    });
  });

  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${server.address().port}/`;

  return {
    url,
    state,
    read: () => fs.readFileSync(file, 'utf8'),
    close: () => new Promise(r => {
      clearTimeout(state.timer);
      for (const c of state.clients) c.end();
      server.close(() => r());
      server.closeAllConnections();
    }),
  };
}

module.exports = { startPreview, DEBOUNCE_MS };
