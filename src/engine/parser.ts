import { SelectorResult } from './types';

export function isMdStyledComment(tokenContent: string): boolean {
  const trimmed = tokenContent.trim();
  if (!trimmed.startsWith('<!--') || !trimmed.endsWith('-->')) return false;
  const inner = trimmed.slice(4, -3).trim();
  if (!inner) return false;
  return /^[.#@\[]/.test(inner);
}

export function parseSelectorComment(content: string): SelectorResult {
  const inner = content.trim().replace(/^<!--\s*/, '').replace(/\s*-->$/, '').trim();

  const classes = [...inner.matchAll(/\.([a-zA-Z0-9_-]+)/g)].map(m => m[1]);

  const idMatch = inner.match(/#([a-zA-Z0-9_-]+)/);

  const attrs = [...inner.matchAll(/\[([^=\]]+)=([^\]]+)\]/g)].map(m => ({
    key: m[1],
    value: m[2],
  }));

  return {
    id: idMatch ? idMatch[1] : undefined,
    classes,
    attrs,
  };
}

export function parseDirectiveComment(content: string): { type: string; value: string } | null {
  const inner = content.trim().replace(/^<!--\s*/, '').replace(/\s*-->$/, '').trim();
  const match = inner.match(/^@(\w+):\s*(.*)$/);
  if (!match) return null;
  const type = match[1];
  if (!['page', 'section', 'style', 'script'].includes(type)) return null;
  return { type, value: match[2].trim() };
}
