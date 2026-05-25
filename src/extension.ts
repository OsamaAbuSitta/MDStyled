import * as vscode from 'vscode';
import * as fs from 'fs';
import { MdStyledPreviewProvider } from './previewProvider';
import { applyTemplate } from './templates';

function isMdStyledFile(filePath: string): boolean {
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

  context.subscriptions.push(
    vscode.commands.registerCommand('mdstyled.applyTemplate', async () => {
      let editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
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
    }),
    vscode.commands.registerCommand(MDSTYLED_PREVIEW_CMD, () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showInformationMessage('Active editor is not a Markdown file.');
        return;
      }
      MdStyledPreviewProvider.createOrShow(context.extensionUri, vscode.ViewColumn.One, editor.document.uri);
    }),
    vscode.commands.registerCommand('mdstyled.openPreviewToSide', () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor || editor.document.languageId !== 'markdown') {
        vscode.window.showInformationMessage('Active editor is not a Markdown file.');
        return;
      }
      MdStyledPreviewProvider.createOrShow(context.extensionUri, vscode.ViewColumn.Beside, editor.document.uri);
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
