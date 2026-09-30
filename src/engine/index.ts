import * as fs from 'fs';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import taskLists from 'markdown-it-task-lists';
import sanitizeHtmlLib from 'sanitize-html';
import hljs from 'highlight.js';

import { resolveConfig } from './config';
import { applyMdStyledDirectives } from './transformer';
import { buildPreviewHtml, loadCssFiles, loadJsFiles } from './renderer';
import { getExtensionCss, getExtensionJs } from './extensions';
import { annotateSourceLines, computeLineOffset, splitSourceLines } from './sourceMap';

export { MdStyledConfig, SelectorResult, ParseResult } from './types';
export { resolveConfig } from './config';
export { isMdStyledComment, parseSelectorComment, parseDirectiveComment } from './parser';
export { applyMdStyledDirectives } from './transformer';
export { buildPreviewHtml, loadCssFiles, loadJsFiles } from './renderer';
export { BUILTIN_EXTENSIONS, getExtensionCss, getExtensionJs } from './extensions';
export { SOURCE_LINE_ATTR, annotateSourceLines, computeLineOffset, splitSourceLines } from './sourceMap';
export type { MdStyledExtensionDef, ExtensionJsOptions } from './extensions';

export interface TemplateFallback {
  styles: string[];
  scripts: string[];
}

/** True when the Markdown file itself resolves to any style or script (directive, frontmatter, config, or auto-discovered sibling). */
export async function hasFileLevelStyling(markdownFilePath: string): Promise<boolean> {
  try {
    const markdownRaw = await fs.promises.readFile(markdownFilePath, 'utf-8');
    const config = await resolveConfig(markdownFilePath, markdownRaw);
    return config.styles.length > 0 || config.scripts.length > 0;
  } catch {
    return false;
  }
}

function createMarkdownIt(): MarkdownIt {
  const md = new MarkdownIt({
    html: true,
    highlight: (str, lang) => {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
        } catch (__) {}
      }
      return '';
    }
  });
  md.use(taskLists);
  return md;
}

/**
 * Renders a snippet of Markdown with the same pipeline as the preview.
 * The in-preview editor uses it to show a rich surface for a block it is editing.
 */
export function renderMarkdownFragment(markdown: string): string {
  const md = createMarkdownIt();
  const tokens = md.parse(markdown, {});
  return md.renderer.render(applyMdStyledDirectives(tokens), md.options, {});
}

export function sanitizeHtml(dirty: string): string {
  return sanitizeHtmlLib(dirty, {
    allowedTags: [],
    allowedAttributes: {},
  });
}

export interface RenderOptions {
  /** Used instead of whatever the file declares - a template chosen for this preview only. */
  templateOverride?: TemplateFallback;
  /** Open the page with its in-preview editor already on. */
  startEditing?: boolean;
}

export async function renderMdStyled(markdownFilePath: string, enabledExtensions?: string[], mermaidSrc?: string, fallback?: TemplateFallback, editable = true, canGoBack = false, options: RenderOptions = {}): Promise<string> {
  try {
    const markdownRaw = await fs.promises.readFile(markdownFilePath, 'utf-8');
    const parsed = matter(markdownRaw);
    const config = await resolveConfig(markdownFilePath, markdownRaw);

    const md = createMarkdownIt();
    const tokens = md.parse(parsed.content, {});
    const transformedTokens = applyMdStyledDirectives(tokens);
    // Tag blocks with their source lines so the preview can edit the file in place.
    const sourceLines = splitSourceLines(markdownRaw);
    annotateSourceLines(transformedTokens, computeLineOffset(markdownRaw, parsed.content), sourceLines);
    const html = md.renderer.render(transformedTokens, md.options, {});

    // Nothing declared in the file itself: fall back to the globally configured template.
    const useFallback = !!fallback && config.styles.length === 0 && config.scripts.length === 0;
    const chosen = options.templateOverride || (useFallback ? fallback : undefined);
    const styleFiles = chosen ? chosen.styles : config.styles;
    const scriptFiles = chosen ? chosen.scripts : config.scripts;

    const css = await loadCssFiles(styleFiles);

    let scripts: string[] = [];
    if (scriptFiles.length > 0) {
      const js = await loadJsFiles(scriptFiles);
      if (js.trim().length > 0) scripts.push(js);
    }

    const ext = enabledExtensions ?? ['mermaid', 'copy-code', 'highlight'];
    const extensionsCss = getExtensionCss(ext);
    const extensionsJs = getExtensionJs(ext, { mermaidSrc });

    const showApplyTemplate = styleFiles.length === 0 && scriptFiles.length === 0;
    return buildPreviewHtml({ html, css, scripts, mode: config.mode, extensionsCss, extensionsJs, showApplyTemplate, sourceLines: editable ? sourceLines : null, canGoBack, startEditing: editable && !!options.startEditing });
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
