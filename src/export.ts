import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { renderMdStyled } from './engine';
import { resolveDefaultTemplateAssets } from './defaultTemplate';
import { hasFileLevelStyling } from './engine';

/**
 * VS Code cannot write a PDF on its own, and shipping a headless browser to do it
 * would dwarf the extension. Instead this writes a self-contained print-ready page
 * and hands it to the default browser with the print dialog already open, where
 * "Save as PDF" produces the file.
 */
const PRINT_CSS = `
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

const PRINT_SCRIPT = `
window.addEventListener('load', function () {
  setTimeout(function () { window.print(); }, 400);
});
`;

/** Rewrites relative asset paths to absolute file: URLs so the browser can load them. */
function absolutizeAssets(html: string, markdownDir: string): string {
  return html.replace(/(src|href)=["']([^"']+)["']/gi, (match, attr, value: string) => {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.startsWith('#')) return match;
    const absolute = path.resolve(markdownDir, value);
    if (!fs.existsSync(absolute)) return match;
    return `${attr}="${vscode.Uri.file(absolute).toString()}"`;
  });
}

export type ExportFormat = 'pdf' | 'html';

/** Builds the finished, self-contained page for either format. */
async function buildPage(documentUri: vscode.Uri, extensionPath: string, format: ExportFormat): Promise<string> {
  const markdownPath = documentUri.fsPath;
  const markdownDir = path.dirname(markdownPath);

  const extensions = vscode.workspace.getConfiguration('mdstyled.extensions')
    .get<string[]>('enabled', ['mermaid', 'copy-code', 'highlight']);

  let fallback;
  if (!(await hasFileLevelStyling(markdownPath))) {
    fallback = await resolveDefaultTemplateAssets(extensionPath, { prompt: false });
  }

  // Editing is off in an exported copy, so the source is not embedded in it.
  const rendered = await renderMdStyled(markdownPath, extensions, undefined, fallback, false, false);

  const page = absolutizeAssets(rendered, markdownDir)
    .replace('</head>', `<style>${PRINT_CSS}</style>\n</head>`);

  // Only the PDF route needs the print dialog to open by itself.
  return format === 'pdf'
    ? page.replace('</body>', `<script>${PRINT_SCRIPT}</script>\n</body>`)
    : page;
}

/** Asks where to put the exported file, defaulting beside the Markdown. */
async function askWhereToSave(documentUri: vscode.Uri, format: ExportFormat): Promise<vscode.Uri | undefined> {
  const base = path.basename(documentUri.fsPath, path.extname(documentUri.fsPath));
  const suggested = path.join(path.dirname(documentUri.fsPath), base + '.' + format);

  return vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(suggested),
    saveLabel: 'Export',
    title: format === 'pdf' ? 'Export as PDF' : 'Export as HTML',
    filters: format === 'pdf' ? { PDF: ['pdf'] } : { HTML: ['html', 'htm'] },
  });
}

/**
 * HTML is written straight out. VS Code cannot produce a PDF on its own, and
 * shipping a headless browser to do it would dwarf the extension, so the PDF route
 * writes the print-ready page next to where you chose and opens it in the browser
 * with the print dialog up, where "Save as PDF" finishes the job at that path.
 */
export async function exportDocument(
  documentUri: vscode.Uri,
  extensionPath: string,
  format: ExportFormat
): Promise<void> {
  const target = await askWhereToSave(documentUri, format);
  if (!target) return;

  const page = await buildPage(documentUri, extensionPath, format);

  if (format === 'html') {
    await fs.promises.writeFile(target.fsPath, page, 'utf-8');
    const open = await vscode.window.showInformationMessage(
      `Exported to ${path.basename(target.fsPath)}`, 'Open', 'Show in folder'
    );
    if (open === 'Open') await vscode.env.openExternal(target);
    if (open === 'Show in folder') await vscode.commands.executeCommand('revealFileInOS', target);
    return;
  }

  // Hand the browser a printable copy sitting beside the chosen destination.
  const printable = vscode.Uri.file(
    path.join(path.dirname(target.fsPath), '.' + path.basename(target.fsPath, '.pdf') + '.mdstyled-print.html')
  );
  await fs.promises.writeFile(printable.fsPath, page, 'utf-8');
  await vscode.env.openExternal(printable);

  vscode.window.showInformationMessage(
    `MdStyled opened a print-ready copy in your browser. Choose "Save as PDF" and save it as ${path.basename(target.fsPath)}.`
  );
}

/** Presents the format choice, then exports. */
export async function promptAndExport(documentUri: vscode.Uri, extensionPath: string): Promise<void> {
  const choice = await vscode.window.showQuickPick(
    [
      { label: 'PDF', description: 'Print-ready page, saved as PDF from the browser dialog', format: 'pdf' as const },
      { label: 'HTML', description: 'One self-contained file with the styling baked in', format: 'html' as const },
    ],
    { placeHolder: 'Export this document as' }
  );
  if (!choice) return;

  await exportDocument(documentUri, extensionPath, choice.format);
}
