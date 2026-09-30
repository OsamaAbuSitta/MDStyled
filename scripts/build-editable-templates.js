/**
 * Builds templates/editable-{light,dark} from templates/interactive-{light,dark}
 * plus the shared editor in scripts/editable-template/.
 *
 * The editable templates are generated, not hand-edited: change the interactive
 * template or the editor sources here, then run `npm run build:templates`.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(__dirname, 'editable-template');

const PALETTES = {
  light: {
    SURFACE: '#ffffff', BORDER: '#e3e8ee', SHADOW: '0 6px 20px rgba(28,30,33,0.14)',
    BTN_FG: '#444950', BTN_BG: '#ffffff', BTN_HOVER_BG: '#f1f5fb',
    ACCENT: '#3578e5', ACCENT_HOVER: '#2c66c4', ON_ACCENT: '#ffffff',
    OUTLINE_IDLE: 'rgba(53,120,229,0.28)', EDIT_HOVER_BG: 'rgba(53,120,229,0.06)',
    EDITOR_BG: '#f6f9fe', INPUT_BG: '#ffffff', TEXT: '#1c1e21',
    FOCUS_RING: 'rgba(53,120,229,0.25)', MUTED: '#6b7280', DANGER: '#b91c1c',
    BAR_BG: 'rgba(255,255,255,0.78)', BAR_BORDER: 'rgba(28,30,33,0.10)',
    BAR_SHADOW: '0 1px 2px rgba(28,30,33,0.05)', SEGMENT_BG: 'rgba(28,30,33,0.04)',
    DANGER_SOFT: 'rgba(185,28,28,0.10)',
    TOOLBAR_BG: '#eef3fb', CARD_BG: '#ffffff', CARD_SHADOW: '0 1px 3px rgba(28,30,33,0.08)',
  },
  dark: {
    SURFACE: '#161b22', BORDER: '#30363d', SHADOW: '0 6px 20px rgba(1,4,9,0.7)',
    BTN_FG: '#c9d1d9', BTN_BG: '#21262d', BTN_HOVER_BG: '#30363d',
    ACCENT: '#1f6feb', ACCENT_HOVER: '#388bfd', ON_ACCENT: '#ffffff',
    OUTLINE_IDLE: 'rgba(88,166,255,0.28)', EDIT_HOVER_BG: 'rgba(88,166,255,0.07)',
    EDITOR_BG: '#0d1117', INPUT_BG: '#0d1117', TEXT: '#c9d1d9',
    FOCUS_RING: 'rgba(56,139,253,0.35)', MUTED: '#8b949e', DANGER: '#f85149',
    BAR_BG: 'rgba(22,27,34,0.78)', BAR_BORDER: 'rgba(240,246,252,0.10)',
    BAR_SHADOW: '0 1px 2px rgba(1,4,9,0.4)', SEGMENT_BG: 'rgba(240,246,252,0.05)',
    DANGER_SOFT: 'rgba(248,81,73,0.16)',
    TOOLBAR_BG: '#161b22', CARD_BG: '#161b22', CARD_SHADOW: '0 1px 3px rgba(1,4,9,0.5)',
  },
};

const INIT_MARKER = '  /* ── Init ── */';
const INIT_CALL = '    initTaskProgress();\n';

const editorJs = ['emoji.js', 'serializer.js', 'cards.js', 'tables.js', 'editor.js']
  .map(file => fs.readFileSync(path.join(SRC, file), 'utf8').replace(/\n+$/, ''))
  .join('\n');
const editorCss = fs.readFileSync(path.join(SRC, 'editor.css'), 'utf8');

for (const theme of ['light', 'dark']) {
  const from = path.join(ROOT, 'templates', `interactive-${theme}`);
  const to = path.join(ROOT, 'templates', `editable-${theme}`);
  fs.mkdirSync(to, { recursive: true });

  let css = editorCss;
  for (const [token, value] of Object.entries(PALETTES[theme])) {
    css = css.split(`@@${token}@@`).join(value);
  }
  if (css.includes('@@')) throw new Error(`unsubstituted palette token in ${theme}`);
  fs.writeFileSync(path.join(to, 'style.css'),
    fs.readFileSync(path.join(from, 'style.css'), 'utf8').replace(/\n+$/, '') + '\n' + css);

  let js = fs.readFileSync(path.join(from, 'script.js'), 'utf8');
  if (!js.includes(INIT_MARKER) || !js.includes(INIT_CALL)) {
    throw new Error(`interactive-${theme}/script.js no longer has the expected init section`);
  }
  js = js.replace(INIT_MARKER, `${editorJs}\n\n${INIT_MARKER}`);
  js = js.replace(INIT_CALL, `${INIT_CALL}    initEditing();\n`);
  fs.writeFileSync(path.join(to, 'script.js'), js);

  console.log(`built templates/editable-${theme}`);
}
