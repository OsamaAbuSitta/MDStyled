import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { renderMdStyled, renderMarkdownFragment, hasFileLevelStyling, TemplateFallback } from './engine';
import { resolveDefaultTemplateAssets, getTemplateAssets } from './defaultTemplate';
import { editableForTheme } from './templates';
import sanitizeHtml from 'sanitize-html';

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat([
    'html', 'head', 'body', 'meta', 'style', 'script', 'section',
    'figure', 'figcaption', 'video', 'audio', 'source', 'iframe', 'input',
    'path', 'svg', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
    'rect', 'text', 'textPath', 'tspan', 'g', 'defs', 'linearGradient',
    'radialGradient', 'stop', 'clipPath', 'mask', 'use'
  ]),
  allowedAttributes: {
    '*': ['id', 'class', 'style', 'data-mdstyled-line', 'data-mdstyled-uri'],
    'a': ['href', 'target', 'rel', 'title'],
    'img': ['src', 'alt', 'width', 'height', 'title'],
    'meta': ['charset', 'name', 'content', 'http-equiv'],
    'script': ['src', 'type'],
    'link': ['href', 'rel', 'type'],
    'td': ['colspan', 'rowspan'],
    'th': ['colspan', 'rowspan'],
    'video': ['src', 'controls', 'width', 'height', 'autoplay', 'loop'],
    'audio': ['src', 'controls', 'autoplay', 'loop'],
    'source': ['src', 'type'],
    'iframe': ['src', 'width', 'height', 'allowfullscreen', 'frameborder'],
    'svg': ['xmlns', 'viewBox', 'width', 'height', 'fill', 'stroke', 'stroke-width'],
    'path': ['d', 'fill', 'stroke', 'stroke-width'],
    'circle': ['cx', 'cy', 'r', 'fill', 'stroke'],
    'ellipse': ['cx', 'cy', 'rx', 'ry', 'fill', 'stroke'],
    'line': ['x1', 'y1', 'x2', 'y2', 'stroke', 'stroke-width'],
    'rect': ['x', 'y', 'width', 'height', 'fill', 'stroke', 'rx', 'ry'],
    'polygon': ['points', 'fill', 'stroke'],
    'polyline': ['points', 'fill', 'stroke'],
    'text': ['x', 'y', 'fill', 'font-size', 'text-anchor', 'font-family'],
    'stop': ['offset', 'stop-color'],
    'linearGradient': ['id', 'x1', 'y1', 'x2', 'y2'],
    'radialGradient': ['id', 'cx', 'cy', 'r'],
    'clipPath': ['id'],
    'mask': ['id'],
    'use': ['href', 'x', 'y'],
    'input': ['type', 'checked', 'disabled', 'class']
  },
  allowedSchemes: ['http', 'https', 'data', 'vscode-webview-resource'],
  allowVulnerableTags: true
};

/** Stands for "the editable template in the current theme's light or dark". */
export const EDIT_TEMPLATE = 'editable-auto';

export interface PreviewOptions {
  /** Show the file with this template instead of its own, without touching the file. */
  template?: string;
  /** Open with the in-preview editor already on. */
  startEditing?: boolean;
}

export class MdStyledPreviewProvider {
  private static panels = new Map<string, MdStyledPreviewProvider>();
  private static _activePanel: MdStyledPreviewProvider | undefined;
  public readonly panel: vscode.WebviewPanel;
  public documentUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private extensionUri: vscode.Uri;
  /** An editor is open inside the preview - re-rendering now would discard it. */
  private editorOpen = false;
  private refreshPending = false;
  /** Markdown files followed from links in the preview, most recent last. */
  private history: vscode.Uri[] = [];
  /** A template for this preview only, never written to the file. EDIT_TEMPLATE follows the theme. */
  private templateOverride: string | undefined;
  /** Turn the in-preview editor on with the next render, once. */
  private startEditing = false;

  /** Opens or brings forward the preview of a file. Without a template in `options`
      the file is shown with its own styling again. */
  public static createOrShow(extensionUri: vscode.Uri, column: vscode.ViewColumn, documentUri: vscode.Uri, options: PreviewOptions = {}): void {
    const key = documentUri.toString();
    const title = path.basename(documentUri.fsPath) + ' - MdStyled Preview';
    const existing = MdStyledPreviewProvider.panels.get(key);
    if (existing) {
      existing.panel.title = title;
      existing.panel.reveal(column);
      existing.documentUri = documentUri;
      existing.templateOverride = options.template;
      existing.startEditing = !!options.startEditing;
      existing.refresh();
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'mdstyled.preview',
      title,
      column,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'node_modules'),
          vscode.Uri.file(path.dirname(documentUri.fsPath)),
          // Following a link to another Markdown file must not break its images.
          ...(vscode.workspace.workspaceFolders || []).map(f => f.uri),
        ]
      }
    );

    const provider = new MdStyledPreviewProvider(panel, extensionUri, documentUri, options);
    MdStyledPreviewProvider.panels.set(key, provider);
  }

  public static refreshAll(): void {
    for (const provider of MdStyledPreviewProvider.panels.values()) {
      provider.refresh();
    }
  }

  /** Re-renders the preview of one file, if it has one open. */
  public static refreshDocument(documentUri: vscode.Uri): void {
    MdStyledPreviewProvider.panels.get(documentUri.toString())?.refresh();
  }

  /** The theme changed: previews showing the theme-matched editable template follow it. */
  public static refreshThemed(): void {
    for (const provider of MdStyledPreviewProvider.panels.values()) {
      if (provider.templateOverride === EDIT_TEMPLATE) provider.refresh();
    }
  }

  public static getActiveDocumentUri(): vscode.Uri | undefined {
    return MdStyledPreviewProvider._activePanel?.documentUri;
  }

  public static getFirstDocumentUri(): vscode.Uri | undefined {
    const first = MdStyledPreviewProvider.panels.values().next().value;
    return first?.documentUri;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, documentUri: vscode.Uri, options: PreviewOptions = {}) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.documentUri = documentUri;
    this.templateOverride = options.template;
    this.startEditing = !!options.startEditing;

    this.disposables.push(
      panel.onDidDispose(() => this.dispose()),
      panel.onDidChangeViewState(e => {
        if (e.webviewPanel.active) {
          MdStyledPreviewProvider._activePanel = this;
        } else if (MdStyledPreviewProvider._activePanel === this) {
          MdStyledPreviewProvider._activePanel = undefined;
        }
      })
    );
    MdStyledPreviewProvider._activePanel = this;

    this.disposables.push(
      panel.webview.onDidReceiveMessage(msg => this.handleMessage(msg))
    );

    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument(e => {
        if (this.isRelatedDocument(e.document.uri)) {
          this.refresh();
        }
      })
    );

    this.updateWebview();
  }

  public refresh(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.updateWebview();
    }, 300);
  }

  public dispose(): void {
    MdStyledPreviewProvider.panels.delete(this.documentUri.toString());
    if (MdStyledPreviewProvider._activePanel === this) {
      MdStyledPreviewProvider._activePanel = undefined;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    while (this.disposables.length) {
      const d = this.disposables.pop();
      if (d) {
        d.dispose();
      }
    }

    this.panel.dispose();
  }

  private isRelatedDocument(uri: vscode.Uri): boolean {
    if (uri.toString() === this.documentUri.toString()) {
      return true;
    }

    // Styles and scripts next to the file, or in the `.mdstyled/` folder templates are copied to.
    const ext = path.extname(uri.fsPath).toLowerCase();
    if (['.css', '.js', '.mdstyled', '.mdjs'].includes(ext)) {
      const dir = path.dirname(uri.fsPath);
      const docDir = path.dirname(this.documentUri.fsPath);
      return dir === docDir || dir === path.join(docDir, '.mdstyled');
    }

    return false;
  }

  /** A relative link to a Markdown file that actually exists, or undefined. */
  private resolveMarkdownLink(href: string): vscode.Uri | undefined {
    if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href)) return undefined;

    const withoutFragment = href.split('#')[0].split('?')[0];
    if (!/\.(md|markdown)$/i.test(withoutFragment)) return undefined;

    const target = path.resolve(path.dirname(this.documentUri.fsPath), decodeURIComponent(withoutFragment));
    return fs.existsSync(target) ? vscode.Uri.file(target) : undefined;
  }

  /** Points this panel at another Markdown file, keeping the panel registry in step. */
  private goTo(uri: vscode.Uri): void {
    MdStyledPreviewProvider.panels.delete(this.documentUri.toString());
    this.documentUri = uri;
    MdStyledPreviewProvider.panels.set(uri.toString(), this);
    this.panel.title = path.basename(uri.fsPath) + ' - MdStyled Preview';
    this.editorOpen = false;
    this.updateWebview();
  }

  /** Serves the requests the in-preview editor makes: rendering Markdown, and writing it back. */
  private async handleMessage(msg: any): Promise<void> {
    if (!msg || typeof msg.type !== 'string') return;

    const reply = (ok: boolean, error?: string, extra?: Record<string, unknown>) =>
      this.panel.webview.postMessage({ type: 'mdstyled.result', id: msg.id, ok, error, ...extra });

    if (msg.type === 'mdstyled.editorState') {
      this.editorOpen = !!msg.open;
      if (!this.editorOpen && this.refreshPending) {
        this.refreshPending = false;
        this.refresh();
      }
      return;
    }

    if (msg.type === 'mdstyled.navigate') {
      const href = typeof msg.href === 'string' ? msg.href : '';
      const target = this.resolveMarkdownLink(href);
      if (!target) {
        await reply(false, `No Markdown file at ${href}`);
        return;
      }
      this.history.push(this.documentUri);
      this.goTo(target);
      await reply(true);
      return;
    }

    if (msg.type === 'mdstyled.back') {
      const previous = this.history.pop();
      if (!previous) {
        await reply(false, 'Nothing to go back to.');
        return;
      }
      this.goTo(previous);
      await reply(true);
      return;
    }

    if (msg.type === 'mdstyled.export') {
      try {
        await vscode.commands.executeCommand('mdstyled.export', this.documentUri);
        await reply(true);
      } catch (err) {
        await reply(false, err instanceof Error ? err.message : String(err));
      }
      return;
    }

    if (msg.type === 'mdstyled.render') {
      try {
        const markdown = typeof msg.markdown === 'string' ? msg.markdown : '';
        // Converted so relative images render, but each keeps its authored path.
        const html = this.convertUrisInMarkup(sanitizeHtml(renderMarkdownFragment(markdown), SANITIZE_OPTIONS));
        await reply(true, undefined, { html });
      } catch (err) {
        await reply(false, err instanceof Error ? err.message : String(err));
      }
      return;
    }

    if (msg.type !== 'mdstyled.saveBlock') return;

    if (!vscode.workspace.getConfiguration('mdstyled').get<boolean>('editing.enabled', true)) {
      await reply(false, 'Editing from the preview is turned off (mdstyled.editing.enabled).');
      return;
    }

    try {
      const startLine = Number(msg.startLine);
      const endLine = Number(msg.endLine);
      const text = typeof msg.text === 'string' ? msg.text : '';

      if (!Number.isInteger(startLine) || !Number.isInteger(endLine) || startLine < 0 || endLine < startLine) {
        await reply(false, 'Invalid edit range.');
        return;
      }

      const doc = await vscode.workspace.openTextDocument(this.documentUri);
      const end = Math.min(endLine, doc.lineCount);
      const range = doc.validateRange(new vscode.Range(startLine, 0, end, 0));
      const eol = doc.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
      const normalize = (s: string) => s.replace(/\r\n?/g, '\n').replace(/\n+$/, '');

      // The preview was rendered from an older version of the file - don't clobber it.
      if (typeof msg.original === 'string' && normalize(doc.getText(range)) !== normalize(msg.original)) {
        await reply(false, 'The file changed since this block was loaded. Reload the preview and try again.');
        return;
      }

      // The range stops at the start of the next line, or at the end of the file.
      const keepsTrailingEol = end < doc.lineCount;
      const fileEndsWithEol = doc.lineCount > 0 && doc.lineAt(doc.lineCount - 1).text.length === 0;

      let body = text.replace(/\r\n?/g, '\n');
      if (body === '') {
        // An empty replacement means "remove these lines", not "leave a blank one".
      } else if (keepsTrailingEol) {
        // Blank lines the caller asked for are kept - that is how a block is separated
        // from the one after it when inserting.
        if (!body.endsWith('\n')) body += '\n';
      } else {
        body = body.replace(/\n+$/, '');
        if (fileEndsWithEol) body += '\n';
      }

      const edit = new vscode.WorkspaceEdit();
      edit.replace(doc.uri, range, body.split('\n').join(eol));

      if (!(await vscode.workspace.applyEdit(edit))) {
        await reply(false, 'VS Code rejected the edit.');
        return;
      }
      await doc.save();
      await reply(true);
    } catch (err) {
      await reply(false, err instanceof Error ? err.message : String(err));
    }
  }

  /**
   * Rewrites relative asset paths to webview URIs - markup only. Script bodies hold the
   * template code and the verbatim Markdown source the in-preview editor writes back,
   * and rewriting a `src=` inside those would put a webview URI into the user's file.
   */
  private convertWebviewUris(html: string): string {
    return html
      .split(/(<script[\s\S]*?<\/script>)/gi)
      .map((part, i) => (i % 2 === 1 ? part : this.convertUrisInMarkup(part)))
      .join('');
  }

  private convertUrisInMarkup(html: string): string {
    const webview = this.panel.webview;
    return html.replace(
      /(src|href)=["']([^"']+)["']/gi,
      (match, attr, value) => {
        if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('data:')) {
          return match;
        }
        try {
          const absolutePath = path.resolve(path.dirname(this.documentUri.fsPath), value);
          const fileUri = vscode.Uri.file(absolutePath);
          const webviewUri = webview.asWebviewUri(fileUri);
          // Keep the authored path: the in-preview editor serializes links and images
          // back to Markdown and must never write a webview URI into the file.
          return `${attr}="${webviewUri.toString()}" data-mdstyled-uri="${value.replace(/"/g, '&quot;')}"`;
        } catch {
          return match;
        }
      }
    );
  }

  private async updateWebview(): Promise<void> {
    // Never replace the page under someone who is mid-edit; catch up when they finish.
    if (this.editorOpen) {
      this.refreshPending = true;
      return;
    }

    try {
      const extConfig = vscode.workspace.getConfiguration('mdstyled.extensions');
      const enabledExtensions = extConfig.get<string[]>('enabled', ['mermaid', 'copy-code', 'highlight']);
      const mermaidUri = this.panel.webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js')
      );
      // The file declares no styles or scripts of its own -> use the global default template.
      const editingEnabled = vscode.workspace.getConfiguration('mdstyled').get<boolean>('editing.enabled', true);

      // A template picked for this preview (MdStyled Edit) wins over the file's own.
      const overrideName = this.templateOverride === EDIT_TEMPLATE ? editableForTheme() : this.templateOverride;
      const templateOverride = overrideName ? getTemplateAssets(this.extensionUri.fsPath, overrideName) : undefined;

      let fallback: TemplateFallback | undefined;
      if (!templateOverride && !(await hasFileLevelStyling(this.documentUri.fsPath))) {
        fallback = await resolveDefaultTemplateAssets(this.extensionUri.fsPath, { prompt: true });
      }
      const startEditing = this.startEditing;
      this.startEditing = false;
      const rawHtml = await renderMdStyled(this.documentUri.fsPath, enabledExtensions, mermaidUri.toString(), fallback, editingEnabled, this.history.length > 0,
        { templateOverride, startEditing });
      const sanitized = sanitizeHtml(rawHtml, SANITIZE_OPTIONS);
      const styleMatch = sanitized.match(/<style>([\s\S]*?)<\/style>/i);
      const cssLen = styleMatch ? styleMatch[1].trim().length : 0;
      const debugInfo = `<script>console.log('[MdStyled] Preview loaded, CSS length: ${cssLen} bytes');</script>`;
      const finalHtml = sanitized.replace('</body>', debugInfo + '\n</body>');
      const htmlWithWebviewUris = this.convertWebviewUris(finalHtml);
      this.panel.webview.html = htmlWithWebviewUris;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.panel.webview.html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; }
    h2 { color: #e06c75; }
    pre {
      background: #1e1e1e;
      color: #e06c75;
      padding: 16px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <h2>MdStyled Preview Error</h2>
  <pre>${this.escapeHtml(errorMessage)}</pre>
  <p>Check the Developer Tools console (Help → Toggle Developer Tools) for errors.</p>
</body>
</html>`;
    }
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
