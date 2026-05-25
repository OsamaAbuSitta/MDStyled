import * as vscode from 'vscode';
import * as path from 'path';
import { renderMdStyled } from './engine';
import sanitizeHtml from 'sanitize-html';

export class MdStyledPreviewProvider {
  private static panels = new Map<string, MdStyledPreviewProvider>();
  private static _activePanel: MdStyledPreviewProvider | undefined;
  public readonly panel: vscode.WebviewPanel;
  public documentUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private extensionUri: vscode.Uri;

  public static createOrShow(extensionUri: vscode.Uri, column: vscode.ViewColumn, documentUri: vscode.Uri): void {
    const key = documentUri.toString();
    const title = path.basename(documentUri.fsPath) + ' - MdStyled Preview';
    const existing = MdStyledPreviewProvider.panels.get(key);
    if (existing) {
      existing.panel.title = title;
      existing.panel.reveal(column);
      existing.documentUri = documentUri;
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
        ]
      }
    );

    const provider = new MdStyledPreviewProvider(panel, extensionUri, documentUri);
    MdStyledPreviewProvider.panels.set(key, provider);
  }

  public static getActiveDocumentUri(): vscode.Uri | undefined {
    return MdStyledPreviewProvider._activePanel?.documentUri;
  }

  public static getFirstDocumentUri(): vscode.Uri | undefined {
    const first = MdStyledPreviewProvider.panels.values().next().value;
    return first?.documentUri;
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, documentUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.documentUri = documentUri;

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

    const ext = path.extname(uri.fsPath).toLowerCase();
    if (['.css', '.js', '.mdstyled', '.mdjs'].includes(ext)) {
      return path.dirname(uri.fsPath) === path.dirname(this.documentUri.fsPath);
    }

    return false;
  }

  private convertWebviewUris(html: string): string {
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
          return `${attr}="${webviewUri.toString()}"`;
        } catch {
          return match;
        }
      }
    );
  }

  private async updateWebview(): Promise<void> {
    try {
      const extConfig = vscode.workspace.getConfiguration('mdstyled.extensions');
      const enabledExtensions = extConfig.get<string[]>('enabled', ['mermaid', 'copy-code', 'highlight']);
      const mermaidUri = this.panel.webview.asWebviewUri(
        vscode.Uri.joinPath(this.extensionUri, 'node_modules', 'mermaid', 'dist', 'mermaid.min.js')
      );
      const rawHtml = await renderMdStyled(this.documentUri.fsPath, enabledExtensions, mermaidUri.toString());
      const sanitized = sanitizeHtml(rawHtml, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([
          'html', 'head', 'body', 'meta', 'style', 'script', 'section',
          'figure', 'figcaption', 'video', 'audio', 'source', 'iframe', 'input',
          'path', 'svg', 'circle', 'ellipse', 'line', 'polyline', 'polygon',
          'rect', 'text', 'textPath', 'tspan', 'g', 'defs', 'linearGradient',
          'radialGradient', 'stop', 'clipPath', 'mask', 'use'
        ]),
        allowedAttributes: {
          '*': ['id', 'class', 'style'],
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
      });
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
