import { SelectorResult } from './types';
import { isMdStyledComment, parseSelectorComment, parseDirectiveComment } from './parser';

const RENDERABLE_TYPES = new Set([
  'heading_open',
  'paragraph_open',
  'blockquote_open',
  'bullet_list_open',
  'ordered_list_open',
  'table_open',
  'fence',
  'code_block',
  'image',
  'hr',
]);

function isRenderableOpenToken(token: any): boolean {
  return RENDERABLE_TYPES.has(token.type);
}

function applySelectorToToken(token: any, selector: SelectorResult): void {
  if (!token.attrs) token.attrs = [];
  if (selector.id) {
    const existing = token.attrs.find((a: [string, string]) => a[0] === 'id');
    if (existing) existing[1] = selector.id;
    else token.attrs.push(['id', selector.id]);
  }
  for (const cls of selector.classes) {
    const existing = token.attrs.find((a: [string, string]) => a[0] === 'class');
    if (existing) existing[1] += ' ' + cls;
    else token.attrs.push(['class', cls]);
  }
  for (const attr of selector.attrs) {
    const existing = token.attrs.find((a: [string, string]) => a[0] === attr.key);
    if (existing) existing[1] = attr.value;
    else token.attrs.push([attr.key, attr.value]);
  }
}

function htmlBlock(content: string): any {
  return {
    type: 'html_block',
    tag: '',
    attrs: null,
    map: null,
    nesting: 0,
    level: 0,
    children: null,
    content,
    markup: '',
    info: '',
    meta: null,
    block: true,
    hidden: false,
  };
}

export function applyMdStyledDirectives(tokens: any[]): any[] {
  let pageClass: string | null = null;
  const result: any[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (token.type === 'html_block' && isMdStyledComment(token.content)) {
      const directive = parseDirectiveComment(token.content);

      if (directive && directive.type === 'page') {
        pageClass = directive.value;
        i++;
        continue;
      }

      if (directive && directive.type === 'section') {
        const sectionName = directive.value;
        i++;

        let headingIdx = -1;
        for (let j = i; j < tokens.length; j++) {
          if (tokens[j].type === 'heading_open') {
            headingIdx = j;
            break;
          }
        }

        if (headingIdx !== -1) {
          const headingLevel = parseInt(tokens[headingIdx].tag.slice(1), 10);

          while (i < headingIdx) {
            result.push(tokens[i]);
            i++;
          }

          result.push(htmlBlock(`<section class="${sectionName}">`));

          let sectionEnd = headingIdx + 1;
          while (sectionEnd < tokens.length) {
            if (tokens[sectionEnd].type === 'heading_open') {
              const level = parseInt(tokens[sectionEnd].tag.slice(1), 10);
              if (level <= headingLevel) break;
            }
            if (tokens[sectionEnd].type === 'html_block' && isMdStyledComment(tokens[sectionEnd].content)) {
              const innerDir = parseDirectiveComment(tokens[sectionEnd].content);
              if (innerDir && (innerDir.type === 'section' || innerDir.type === 'page')) break;
            }
            sectionEnd++;
          }

          while (i < sectionEnd) {
            const t = tokens[i];
            if (t.type === 'html_block' && isMdStyledComment(t.content)) {
              const innerDir = parseDirectiveComment(t.content);
              if (innerDir && (innerDir.type === 'style' || innerDir.type === 'script')) {
                i++;
                continue;
              }
              const selector = parseSelectorComment(t.content);
              if (selector.id || selector.classes.length > 0 || selector.attrs.length > 0) {
                for (let j = i + 1; j < tokens.length; j++) {
                  if (isRenderableOpenToken(tokens[j])) {
                    applySelectorToToken(tokens[j], selector);
                    break;
                  }
                }
              }
              i++;
              continue;
            }
            result.push(tokens[i]);
            i++;
          }

          result.push(htmlBlock('</section>'));
          continue;
        }

        continue;
      }

      if (directive && (directive.type === 'style' || directive.type === 'script')) {
        i++;
        continue;
      }

      const selector = parseSelectorComment(token.content);
      if (selector.id || selector.classes.length > 0 || selector.attrs.length > 0) {
        for (let j = i + 1; j < tokens.length; j++) {
          if (isRenderableOpenToken(tokens[j])) {
            applySelectorToToken(tokens[j], selector);
            break;
          }
        }
      }

      i++;
      continue;
    }

    result.push(tokens[i]);
    i++;
  }

  if (pageClass) {
    result.unshift(htmlBlock(`<div class="mdstyled-root ${pageClass}">`));
    result.push(htmlBlock('</div>'));
  }

  return result;
}
