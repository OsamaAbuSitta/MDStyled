import * as fs from 'fs';

const SOURCE_PLACEHOLDER = '__MDSTYLED_SOURCE__';

const MDSTYLED_RUNTIME = `
(function () {
  var vscodeApi;
  try {
    vscodeApi = (typeof acquireVsCodeApi === 'function') ? acquireVsCodeApi() : undefined;
  } catch (e) {
    vscodeApi = undefined;
  }

  var source = ${SOURCE_PLACEHOLDER};
  var pending = {};
  var seq = 0;

  function request(payload) {
    if (!vscodeApi) return Promise.reject(new Error('Editing is not available in this preview.'));
    var id = 'req-' + (++seq);
    payload.id = id;
    return new Promise(function (resolve, reject) {
      pending[id] = { resolve: resolve, reject: reject };
      vscodeApi.postMessage(payload);
      setTimeout(function () {
        if (!pending[id]) return;
        var p = pending[id];
        delete pending[id];
        p.reject(new Error('Timed out waiting for the editor.'));
      }, 10000);
    });
  }

  window.mdstyled = {
    _readyCallbacks: [],
    onReady: function(cb) { this._readyCallbacks.push(cb); },
    query: function(s) { return document.querySelector(s); },
    queryAll: function(s) { return document.querySelectorAll(s); },
    addClass: function(s, c) { document.querySelectorAll(s).forEach(function(el) { el.classList.add(c); }); },
    removeClass: function(s, c) { document.querySelectorAll(s).forEach(function(el) { el.classList.remove(c); }); },
    toggleClass: function(s, c) { document.querySelectorAll(s).forEach(function(el) { el.classList.toggle(c); }); },
    getMetadata: function() { return {}; },

    /* Survives a preview re-render, so a template can keep scroll position or UI state. */
    getState: function() {
      try { return (vscodeApi && vscodeApi.getState()) || {}; } catch (e) { return {}; }
    },
    setState: function(state) {
      try { if (vscodeApi) vscodeApi.setState(state); } catch (e) {}
    },

    /* Write access to the Markdown file behind the preview. */
    editor: {
      available: !!vscodeApi && !!source,
      get lineCount() { return source ? source.length : 0; },
      getSource: function(startLine, endLine) {
        if (!source) return '';
        return source.slice(startLine, endLine).join('\\n');
      },
      getDocument: function() { return source ? source.join('\\n') : ''; },
      saveBlock: function(startLine, endLine, text, original) {
        return request({
          type: 'mdstyled.saveBlock',
          startLine: startLine,
          endLine: endLine,
          text: text,
          original: (typeof original === 'string') ? original : undefined
        });
      },
      /* Lets the extension know not to re-render over an editor that is open. */
      setEditorOpen: function(isOpen) {
        try { if (vscodeApi) vscodeApi.postMessage({ type: 'mdstyled.editorState', open: !!isOpen }); } catch (e) {}
      },
      /* Renders a Markdown snippet with the preview's own pipeline. */
      render: function(markdown) {
        return request({ type: 'mdstyled.render', markdown: markdown }).then(function (res) {
          return res.html || '';
        });
      }
    }
  };

  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (!msg || msg.type !== 'mdstyled.result') return;
    var p = pending[msg.id];
    if (!p) return;
    delete pending[msg.id];
    if (msg.ok) p.resolve(msg);
    else p.reject(new Error(msg.error || 'Save failed.'));
  });

  document.addEventListener('DOMContentLoaded', function() {
    window.mdstyled._readyCallbacks.forEach(function(cb) { cb(); });
  });
})();
`;

/** Embedded as JS, so nothing may survive that could close the script tag or break the literal. */
function encodeSource(lines?: string[] | null): string {
  if (!lines) return 'null';
  return JSON.stringify(lines)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

export function buildPreviewHtml(params: { html: string; css: string; scripts: string[]; mode: string; extensionsCss?: string; extensionsJs?: string; mermaidSrc?: string; showApplyTemplate?: boolean; sourceLines?: string[] | null }): string {
  const allCss = [params.css, params.extensionsCss].filter(Boolean).join('\n\n');
  const allScripts = [
    ...(params.extensionsJs ? [params.extensionsJs] : []),
    ...params.scripts.filter(s => s.trim().length > 0),
  ];

  const scriptTags = allScripts
    .map(s => `<script>\n${s}\n</script>`)
    .join('\n');

  const applyTemplateBanner = params.showApplyTemplate
    ? `<div style="padding:12px 16px;margin-bottom:16px;border-radius:6px;background:var(--vscode-editor-inactiveSelectionBackground,#f0f0f0);border:1px solid var(--vscode-panel-border,#e0e0e0);">
  <p style="margin:0 0 6px;font-size:13px;color:var(--vscode-foreground,#333);"><strong>No MdStyled template applied.</strong></p>
  <p style="margin:0;font-size:12px;color:var(--vscode-descriptionForeground,#666);">Press <kbd style="background:var(--vscode-textCodeBlock-background,#eee);padding:1px 4px;border-radius:3px;font-size:11px;">Ctrl+P</kbd> (or <kbd style="background:var(--vscode-textCodeBlock-background,#eee);padding:1px 4px;border-radius:3px;font-size:11px;">Cmd+P</kbd> on macOS) and type <code style="background:var(--vscode-textCodeBlock-background,#eee);padding:1px 4px;border-radius:3px;font-size:11px;">MdStyled: Apply Template</code>.</p>
</div>`
    : '';

  return '<!DOCTYPE html>\n<html lang="en">\n<head>\n'
    + '<meta charset="UTF-8" />\n'
    + '<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n'
    + '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\' https://cdn.jsdelivr.net; script-src \'unsafe-inline\' \'unsafe-eval\' https://cdn.jsdelivr.net https://*.vscode-cdn.net vscode-webview-resource:; img-src \'self\' data: https://cdn.jsdelivr.net; connect-src \'self\' https://cdn.jsdelivr.net;" />\n'
    + `<style>\n${allCss}\n</style>\n`
    + '</head>\n<body>\n'
    + applyTemplateBanner
    + `<div class="mdstyled-root">\n${params.html}\n</div>\n`
    + `<script>\n${MDSTYLED_RUNTIME.replace(SOURCE_PLACEHOLDER, () => encodeSource(params.sourceLines))}\n</script>\n`
    + (scriptTags ? scriptTags + '\n' : '')
    + '</body>\n</html>';
}

export async function loadCssFiles(paths: string[]): Promise<string> {
  const parts = await Promise.all(paths.map(async (p) => {
    try {
      return await fs.promises.readFile(p, 'utf-8');
    } catch {
      return `/* Failed to load: ${p} */`;
    }
  }));
  return parts.join('\n\n');
}

export async function loadJsFiles(paths: string[]): Promise<string> {
  const parts = await Promise.all(paths.map(async (p) => {
    try {
      return await fs.promises.readFile(p, 'utf-8');
    } catch {
      return `// Failed to load: ${p}`;
    }
  }));
  return parts.join('\n\n');
}
