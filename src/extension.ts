import * as vscode from 'vscode';
import * as fs from 'fs';
import { MdStyledPreviewProvider, EDIT_TEMPLATE } from './previewProvider';
import * as path from 'path';
import { applyTemplate, applyTemplateByName, getTemplates } from './templates';
import { promptForDefaultTemplate, resetPromptState, hasDefaultTemplate, NO_TEMPLATE } from './defaultTemplate';
import { promptAndExport } from './export';

function isMdStyledFile(filePath: string): boolean {
  // A global default template makes every Markdown file previewable, whether or not
  // it declares anything itself.
  if (hasDefaultTemplate() && vscode.workspace.getConfiguration('mdstyled').get<string>('defaultTemplate') !== NO_TEMPLATE) {
    return true;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8').slice(0, 2000);
    return /---\s*\n\s*mdstyled\s*:/i.test(content)
      || /<!--\s*@style:\s*\S+\s*-->/.test(content)
      || /<!--\s*@script:\s*\S+\s*-->/.test(content);
  } catch {
    return false;
  }
}

const MDSTYLED_PREVIEW_CMD = 'mdstyled.openPreview';

const MARKDOWN_FILE = /\.(md|markdown)$/i;

/**
 * The file a preview command should act on. Menus in the Explorer and the editor
 * tab pass the resource in; the palette and keybindings pass nothing, so fall back
 * to whatever is open.
 */
function markdownTarget(uri?: vscode.Uri): vscode.Uri | undefined {
  if (uri && MARKDOWN_FILE.test(uri.fsPath)) return uri;

  const editor = vscode.window.activeTextEditor;
  if (editor && editor.document.languageId === 'markdown') return editor.document.uri;

  const active = MdStyledPreviewProvider.getActiveDocumentUri();
  if (active) return active;

  return undefined;
}

export function activate(context: vscode.ExtensionContext) {
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = MDSTYLED_PREVIEW_CMD;
  statusBar.text = '$(preview) MdStyled';
  statusBar.tooltip = 'Open MdStyled Preview';
  context.subscriptions.push(statusBar);

  function updateStatusBar(): void {
    const editor = vscode.window.activeTextEditor;
    const isMdStyled = !!editor && editor.document.languageId === 'markdown' && isMdStyledFile(editor.document.uri.fsPath);
    if (isMdStyled) {
      statusBar.show();
    } else {
      statusBar.hide();
    }
    vscode.commands.executeCommand('setContext', 'mdstyled:isActive', isMdStyled);
  }

  /* Applies a template from the context menu, then shows the result. The Explorer
     passes every selected file as the second argument. */
  async function applyFromMenu(name: string, uri?: vscode.Uri, selected?: vscode.Uri[]): Promise<void> {
    const targets = (selected && selected.length ? selected : [markdownTarget(uri)])
      .filter((t): t is vscode.Uri => !!t && MARKDOWN_FILE.test(t.fsPath));
    if (targets.length === 0) {
      vscode.window.showInformationMessage('Select a Markdown file to apply a template to.');
      return;
    }
    try {
      for (const target of targets) {
        await applyTemplateByName(target, context.extensionPath, name);
        // Re-rendered even when the file text did not change (re-applying the same
        // template), since the template files themselves may have been replaced.
        MdStyledPreviewProvider.refreshDocument(target);
      }
      // Show the result: open (or bring forward) the preview of the file clicked on.
      MdStyledPreviewProvider.createOrShow(context.extensionUri, vscode.ViewColumn.One, targets[0]);
      const what = targets.length === 1 ? path.basename(targets[0].fsPath) : targets.length + ' files';
      vscode.window.showInformationMessage(`MdStyled: applied "${name}" to ${what}.`);
    } catch (err) {
      vscode.window.showErrorMessage('MdStyled could not apply the template: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('mdstyled.applyTemplate', async () => {
      let editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        // Preview panel is focused, so use the file it's showing
        const activePreviewUri = MdStyledPreviewProvider.getActiveDocumentUri();
        if (activePreviewUri) {
          const doc = await vscode.workspace.openTextDocument(activePreviewUri);
          const revealedEditor = await vscode.window.showTextDocument(doc);
          await applyTemplate(revealedEditor, context.extensionPath);
          MdStyledPreviewProvider.refreshDocument(activePreviewUri);
          return;
        }
        editor = vscode.window.visibleTextEditors.find(e => e.document.languageId === 'markdown');
      }
      if (!editor) {
        const previewUri = MdStyledPreviewProvider.getFirstDocumentUri();
        if (previewUri) {
          const doc = await vscode.workspace.openTextDocument(previewUri);
          const revealedEditor = await vscode.window.showTextDocument(doc);
          await applyTemplate(revealedEditor, context.extensionPath);
          return;
        }
        vscode.window.showInformationMessage('No Markdown editor is visible.');
        return;
      }
      await applyTemplate(editor, context.extensionPath);
      MdStyledPreviewProvider.refreshDocument(editor.document.uri);
    }),
    /* One command per template, for the "MdStyled Templates" context submenu, plus
       "MdStyled Edit" below. */
    ...getTemplates().map(tmpl =>
      vscode.commands.registerCommand('mdstyled.applyTemplate.' + tmpl.name,
        (uri?: vscode.Uri, selected?: vscode.Uri[]) => applyFromMenu(tmpl.name, uri, selected))),
    /* MdStyled Edit: straight into editing with the editable template in the theme's
       light or dark. Only the preview changes - nothing is written to the file. */
    vscode.commands.registerCommand('mdstyled.edit', (uri?: vscode.Uri) => {
      const target = markdownTarget(uri);
      if (!target) {
        vscode.window.showInformationMessage('Open a Markdown file to edit it.');
        return;
      }
      MdStyledPreviewProvider.createOrShow(context.extensionUri, vscode.ViewColumn.One, target,
        { template: EDIT_TEMPLATE, startEditing: true });
    }),
    vscode.window.onDidChangeActiveColorTheme(() => MdStyledPreviewProvider.refreshThemed()),
    vscode.commands.registerCommand('mdstyled.export', async (uri?: vscode.Uri) => {
      const target = uri
        || MdStyledPreviewProvider.getActiveDocumentUri()
        || vscode.window.activeTextEditor?.document.uri;

      if (!target || !/\.(md|markdown)$/i.test(target.fsPath)) {
        vscode.window.showInformationMessage('Open a Markdown file to export it.');
        return;
      }
      try {
        await promptAndExport(target, context.extensionPath);
      } catch (err) {
        vscode.window.showErrorMessage('MdStyled export failed: ' + (err instanceof Error ? err.message : String(err)));
      }
    }),
    vscode.commands.registerCommand('mdstyled.setDefaultTemplate', async () => {
      const chosen = await promptForDefaultTemplate();
      if (chosen) {
        vscode.window.showInformationMessage(`MdStyled default template set to "${chosen}".`);
        MdStyledPreviewProvider.refreshAll();
      }
    }),
    vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration('mdstyled.defaultTemplate')) {
        resetPromptState();
        updateStatusBar();
        MdStyledPreviewProvider.refreshAll();
      }
      if (e.affectsConfiguration('mdstyled.editing.enabled')) {
        MdStyledPreviewProvider.refreshAll();
      }
    }),
    vscode.commands.registerCommand(MDSTYLED_PREVIEW_CMD, (uri?: vscode.Uri) => {
      const target = markdownTarget(uri);
      if (!target) {
        vscode.window.showInformationMessage('Open a Markdown file to preview it.');
        return;
      }
      MdStyledPreviewProvider.createOrShow(context.extensionUri, vscode.ViewColumn.One, target);
    }),
    /* Same thing, worded for the file context menus. */
    vscode.commands.registerCommand('mdstyled.openWith', (uri?: vscode.Uri) =>
      vscode.commands.executeCommand(MDSTYLED_PREVIEW_CMD, uri)),
    vscode.commands.registerCommand('mdstyled.openPreviewToSide', (uri?: vscode.Uri) => {
      const target = markdownTarget(uri);
      if (!target) {
        vscode.window.showInformationMessage('Open a Markdown file to preview it.');
        return;
      }
      MdStyledPreviewProvider.createOrShow(context.extensionUri, vscode.ViewColumn.Beside, target);
    }),
    vscode.window.onDidChangeActiveTextEditor(() => updateStatusBar()),
    vscode.workspace.onDidChangeTextDocument(e => {
      if (e.document === vscode.window.activeTextEditor?.document) {
        updateStatusBar();
      }
    })
  );

  updateStatusBar();
}

export function deactivate() { }
