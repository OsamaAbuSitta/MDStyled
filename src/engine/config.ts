import * as fs from 'fs';
import * as path from 'path';
import matter from 'gray-matter';
import { MdStyledConfig } from './types';

export async function resolveConfig(markdownFilePath: string, markdownRaw: string): Promise<MdStyledConfig> {
  const mdDir = path.dirname(markdownFilePath);
  const stem = path.basename(markdownFilePath, '.md');

  const defaults: MdStyledConfig = { styles: [], scripts: [], mode: 'safe', autoDiscover: true };

  let workspaceConfig: Partial<MdStyledConfig> = {};
  const configPath = path.join(mdDir, 'mdstyled.config.json');
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      workspaceConfig = JSON.parse(raw);
    } catch {
      // invalid JSON, skip
    }
  }

  const autoDiscover = workspaceConfig.autoDiscover !== undefined ? workspaceConfig.autoDiscover : defaults.autoDiscover;

  const autoStyles: string[] = [];
  const autoScripts: string[] = [];
  if (autoDiscover) {
    for (const ext of ['.css', '.mdstyled']) {
      const p = path.join(mdDir, stem + ext);
      if (fs.existsSync(p)) autoStyles.push(stem + ext);
    }
    for (const ext of ['.js', '.mdjs']) {
      const p = path.join(mdDir, stem + ext);
      if (fs.existsSync(p)) autoScripts.push(stem + ext);
    }
  }

  const styleRefs = [...markdownRaw.matchAll(/<!--\s*@style:\s*(\S+)\s*-->/g)].map(m => m[1]);
  const scriptRefs = [...markdownRaw.matchAll(/<!--\s*@script:\s*(\S+)\s*-->/g)].map(m => m[1]);

  const fmData = matter(markdownRaw).data;
  const fmStyles: string[] = (fmData?.mdstyled?.styles || []) as string[];
  const fmScripts: string[] = (fmData?.mdstyled?.scripts || []) as string[];
  const fmMode = fmData?.mdstyled?.mode as string | undefined;

  const styles = [
    ...(defaults.styles || []),
    ...(workspaceConfig.styles || []),
    ...autoStyles,
    ...styleRefs,
    ...fmStyles,
  ];

  const scripts = [
    ...(defaults.scripts || []),
    ...(workspaceConfig.scripts || []),
    ...autoScripts,
    ...scriptRefs,
    ...fmScripts,
  ];

  const resolvedStyles = [...new Set(styles.map(s => path.resolve(mdDir, s)))];
  const resolvedScripts = [...new Set(scripts.map(s => path.resolve(mdDir, s)))];

  const mode = (fmMode === 'safe' || fmMode === 'trusted')
    ? fmMode
    : (workspaceConfig.mode || defaults.mode);

  return { styles: resolvedStyles, scripts: resolvedScripts, mode, autoDiscover };
}
