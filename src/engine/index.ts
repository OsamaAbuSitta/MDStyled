import * as fs from 'fs';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import sanitizeHtmlLib from 'sanitize-html';

import { resolveConfig } from './config';
import { applyMdStyledDirectives } from './transformer';
import { buildPreviewHtml, loadCssFiles, loadJsFiles } from './renderer';
import { getExtensionCss, getExtensionJs } from './extensions';

export { MdStyledConfig, SelectorResult, ParseResult } from './types';
export { resolveConfig } from './config';
export { isMdStyledComment, parseSelectorComment, parseDirectiveComment } from './parser';
export { applyMdStyledDirectives } from './transformer';
export { buildPreviewHtml, loadCssFiles, loadJsFiles } from './renderer';
export { BUILTIN_EXTENSIONS, getExtensionCss, getExtensionJs } from './extensions';
export type { MdStyledExtensionDef, ExtensionJsOptions } from './extensions';

export function sanitizeHtml(dirty: string): string {
  return sanitizeHtmlLib(dirty, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

export async function renderMdStyled(markdownFilePath: string, enabledExtensions?: string[], mermaidSrc?: string): Promise<string> {
  try {
    const markdownRaw = await fs.promises.readFile(markdownFilePath, 'utf-8');
    const parsed = matter(markdownRaw);
    const config = await resolveConfig(markdownFilePath, markdownRaw);

    const md = new MarkdownIt({ html: true });
    md.use(taskLists);
    const tokens = md.parse(parsed.content, {});
    const transformedTokens = applyMdStyledDirectives(tokens);
    const html = md.renderer.render(transformedTokens, md.options, {});

    const css = await loadCssFiles(config.styles);

    let scripts: string[] = [];
    if (config.scripts.length > 0) {
      const js = await loadJsFiles(config.scripts);
      if (js.trim().length > 0) scripts.push(js);
    }

    const ext = enabledExtensions ?? ['mermaid', 'copy-code', 'highlight'];
    const extensionsCss = getExtensionCss(ext);
    const extensionsJs = getExtensionJs(ext, { mermaidSrc });

    const showApplyTemplate = config.styles.length === 0 && config.scripts.length === 0;
    return buildPreviewHtml({ html, css, scripts, mode: config.mode, extensionsCss, extensionsJs, showApplyTemplate });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return buildPreviewHtml({
      html: `<pre style="color:red;padding:20px">MdStyled Error: ${sanitizeHtml(message)}</pre>`,
      css: '',
      scripts: [],
      mode: 'safe',
    });
  }
}
