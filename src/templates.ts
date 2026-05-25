import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface MdStyledTemplate {
  name: string;
  description: string;
  hasCSS: boolean;
  hasJS: boolean;
}

const templates: MdStyledTemplate[] = [
  {
    name: 'default-light',
    description: 'Light documentation theme with TOC sidebar, copy buttons, and mermaid support',
    hasCSS: true,
    hasJS: true,
  },
  {
    name: 'default-dark',
    description: 'Dark documentation theme with TOC sidebar, copy buttons, and mermaid support',
    hasCSS: true,
    hasJS: true,
  },
  {
    name: 'interactive-light',
    description: 'Light theme with interactive tables (sort, filter, search) and TOC sidebar',
    hasCSS: true,
    hasJS: true,
  },
  {
    name: 'interactive-dark',
    description: 'Dark theme with interactive tables (sort, filter, search) and TOC sidebar',
    hasCSS: true,
    hasJS: true,
  },
];

export function getTemplates(): MdStyledTemplate[] {
  return templates;
}

async function copyWithConflictCheck(extensionPath: string, tmpl: MdStyledTemplate, mdDir: string): Promise<{ used: string[] }> {
  const mdstyledDir = path.join(mdDir, '.mdstyled');
  await fs.promises.mkdir(mdstyledDir, { recursive: true });

  const used: string[] = [];

  for (const asset of ['css', 'js'] as const) {
    if (!(asset === 'css' ? tmpl.hasCSS : tmpl.hasJS)) continue;

    const src = path.join(extensionPath, 'templates', tmpl.name, asset === 'css' ? 'style.css' : 'script.js');
    const defaultDest = path.join(mdstyledDir, tmpl.name + '.' + (asset === 'css' ? 'css' : 'js'));

    let finalPath = defaultDest;

    if (fs.existsSync(defaultDest)) {
      const action = await vscode.window.showQuickPick(
        [
          { label: 'Overwrite', description: 'Replace ' + tmpl.name + '.' + (asset === 'css' ? 'css' : 'js') },
          { label: 'New name', description: 'Create a new file with a different name and update the reference' },
          { label: 'Use existing', description: 'Keep existing file and use it as-is' },
        ],
        { placeHolder: tmpl.name + '.' + (asset === 'css' ? 'css' : 'js') + ' already exists. What to do?' }
      );

      if (!action || action.label === 'Use existing') {
                used.push('.mdstyled/' + tmpl.name + '.' + (asset === 'css' ? 'css' : 'js'));
        continue;
      }

      if (action.label === 'New name') {
        const nameInput = await vscode.window.showInputBox({
          prompt: 'Enter a new file name (without extension)',
          value: tmpl.name + '-custom',
          validateInput: (v: string) => v.trim() ? null : 'Name cannot be empty',
        });
        if (!nameInput) {
                  used.push('.mdstyled/' + tmpl.name + '.' + (asset === 'css' ? 'css' : 'js'));
          continue;
        }
        finalPath = path.join(mdstyledDir, nameInput.trim() + '.' + (asset === 'css' ? 'css' : 'js'));
      }
    }

    await fs.promises.copyFile(src, finalPath);
        used.push('.mdstyled/' + path.basename(finalPath));
  }

  return { used };
}

export async function applyTemplate(editor: vscode.TextEditor, extensionPath: string): Promise<void> {
  const picks = templates.map(t => ({
    label: t.name,
    description: t.description,
  }));

  const chosen = await vscode.window.showQuickPick(picks, {
    placeHolder: 'Select an MdStyled template to apply',
  });
  if (!chosen) return;

  const tmpl = templates.find(t => t.name === chosen.label);
  if (!tmpl) return;

  const mdDir = path.dirname(editor.document.uri.fsPath);

  const { used } = await copyWithConflictCheck(extensionPath, tmpl, mdDir);

  const directives = used.map(f => {
    const ext = path.extname(f);
    if (ext === '.css') return '<!-- @style: ./' + f + ' -->';
    return '<!-- @script: ./' + f + ' -->';
  });

  // Remove any existing @style / @script directives that point into .mdstyled/
  const doc = editor.document;
  const text = doc.getText();
  const cleaned = text.replace(/<!--\s*@(style|script):\s*\.\/\.mdstyled\/\S+\s*-->\s*\n?/g, '');

  // Find insert position (after frontmatter if present)
  const frontmatterMatch = cleaned.match(/^---[\s\S]*?---\s*\n?/);
  let insertPos: number;
  let prefix = '';
  if (frontmatterMatch) {
    insertPos = frontmatterMatch[0].length;
    prefix = '\n';
  } else {
    insertPos = 0;
  }

  const insertText = prefix + directives.join('\n') + '\n\n';

  const edit = new vscode.WorkspaceEdit();
  // Full replacement since we already stripped old directives
  const fullReplacement = insertText + cleaned.slice(insertPos);
  edit.replace(doc.uri, new vscode.Range(0, 0, doc.lineCount, 0), fullReplacement);
  await vscode.workspace.applyEdit(edit);
  await doc.save();
}
