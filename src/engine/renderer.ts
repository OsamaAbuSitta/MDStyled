import * as fs from 'fs';

const MDSTYLED_RUNTIME = `
window.mdstyled = {
  _readyCallbacks: [],
  onReady: function(cb) { this._readyCallbacks.push(cb); },
  query: function(s) { return document.querySelector(s); },
  queryAll: function(s) { return document.querySelectorAll(s); },
  addClass: function(s, c) { document.querySelectorAll(s).forEach(function(el) { el.classList.add(c); }); },
  removeClass: function(s, c) { document.querySelectorAll(s).forEach(function(el) { el.classList.remove(c); }); },
  toggleClass: function(s, c) { document.querySelectorAll(s).forEach(function(el) { el.classList.toggle(c); }); },
  getMetadata: function() { return {}; }
};
document.addEventListener('DOMContentLoaded', function() {
  window.mdstyled._readyCallbacks.forEach(function(cb) { cb(); });
});
`;

export function buildPreviewHtml(params: { html: string; css: string; scripts: string[]; mode: string; extensionsCss?: string; extensionsJs?: string; mermaidSrc?: string; showApplyTemplate?: boolean }): string {
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
    + `<script>\n${MDSTYLED_RUNTIME}\n</script>\n`
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
