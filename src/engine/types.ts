export interface MdStyledConfig {
  styles: string[];
  scripts: string[];
  mode: 'safe' | 'trusted';
  autoDiscover: boolean;
}

export interface SelectorResult {
  id?: string;
  classes: string[];
  attrs: { key: string; value: string }[];
}

export interface ParseResult {
  directives: { type: string; value: string }[];
  selectors: SelectorResult[];
}
