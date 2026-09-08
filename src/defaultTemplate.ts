import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getTemplates } from './templates';

const SETTING_SECTION = 'mdstyled';
const SETTING_KEY = 'defaultTemplate';

/** Stored in the global default template setting when the user opts out of styling. */
export const NO_TEMPLATE = 'none';

export interface TemplateAssets {
  styles: string[];
  scripts: string[];
}

let pendingPrompt: Promise<string | undefined> | undefined;
let declinedThisSession = false;
const warnedUnknown = new Set<string>();

function readSetting(): string {
  return (vscode.workspace.getConfiguration(SETTING_SECTION).get<string>(SETTING_KEY) || '').trim();
}

async function writeSetting(value: string): Promise<void> {
  await vscode.workspace.getConfiguration(SETTING_SECTION).update(SETTING_KEY, value, vscode.ConfigurationTarget.Global);
}

/** True once a global default template has been chosen, whatever it is. */
export function hasDefaultTemplate(): boolean {
  return readSetting() !== '';
}

/** Called when the setting changes so a cancelled prompt can be offered again. */
export function resetPromptState(): void {
  declinedThisSession = false;
}

/** Absolute paths to the CSS/JS shipped with a template, without copying anything into the workspace. */
export function getTemplateAssets(extensionPath: string, name: string): TemplateAssets | undefined {
  const tmpl = getTemplates().find(t => t.name === name);
  if (!tmpl) return undefined;

  const dir = path.join(extensionPath, 'templates', tmpl.name);
  const styles = tmpl.hasCSS ? [path.join(dir, 'style.css')] : [];
  const scripts = tmpl.hasJS ? [path.join(dir, 'script.js')] : [];

  return {
    styles: styles.filter(p => fs.existsSync(p)),
    scripts: scripts.filter(p => fs.existsSync(p)),
  };
}

/** Ask which template should become the global default and persist the answer. */
export async function promptForDefaultTemplate(): Promise<string | undefined> {
  const current = readSetting();

  const picks: vscode.QuickPickItem[] = getTemplates().map(t => ({
    label: t.name,
    description: t.description,
    detail: t.name === current ? 'Current default' : undefined,
  }));
  picks.push({
    label: NO_TEMPLATE,
    description: 'No default template — preview unstyled Markdown',
    detail: current === NO_TEMPLATE ? 'Current default' : undefined,
  });

  const chosen = await vscode.window.showQuickPick(picks, {
    placeHolder: 'Choose the default MdStyled template for Markdown files without @style / @script',
    ignoreFocusOut: true,
  });
  if (!chosen) return undefined;

  await writeSetting(chosen.label);
  declinedThisSession = false;
  return chosen.label;
}

/**
 * Template assets to fall back to when a Markdown file declares no styles or scripts of its own.
 * On first use, and only when `prompt` is set, the user is asked to pick a global default.
 * Returns undefined when no fallback should be applied.
 */
export async function resolveDefaultTemplateAssets(
  extensionPath: string,
  options: { prompt: boolean } = { prompt: false }
): Promise<TemplateAssets | undefined> {
  let name = readSetting();

  if (!name) {
    if (!options.prompt || declinedThisSession) return undefined;

    if (!pendingPrompt) {
      pendingPrompt = promptForDefaultTemplate().finally(() => { pendingPrompt = undefined; });
    }
    const picked = await pendingPrompt;
    if (!picked) {
      declinedThisSession = true;
      return undefined;
    }
    name = picked;
  }

  if (name === NO_TEMPLATE) return undefined;

  const assets = getTemplateAssets(extensionPath, name);
  if (!assets) {
    if (!warnedUnknown.has(name)) {
      warnedUnknown.add(name);
      vscode.window.showWarningMessage(`MdStyled: unknown default template "${name}". Run "MdStyled: Set Default Template" to pick another.`);
    }
    return undefined;
  }

  if (assets.styles.length === 0 && assets.scripts.length === 0) return undefined;
  return assets;
}
