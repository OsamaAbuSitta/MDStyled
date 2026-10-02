// Unit tests for src/engine/config.ts
// Function: resolveConfig – reads mdstyled.config.json, @style/@script comments, front matter, auto-discover
const { test, expect } = require('@playwright/test');
const { engine } = require('../harness/build');
const fs = require('fs');
const path = require('path');
const os = require('os');
const E = engine();
const { resolveConfig } = E;

// Helper: create a temp dir with a markdown file and optional siblings
function makeTmpDir(stem = 'test') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mdstyled-cfg-'));
  return { dir, mdPath: path.join(dir, stem + '.md') };
}

function cleanup(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
}

test.describe('resolveConfig defaults', () => {
  test('plain markdown with no extras gives empty styles and scripts', async () => {
    const { dir, mdPath } = makeTmpDir();
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      const cfg = await resolveConfig(mdPath, '# Hello\n');
      expect(cfg.styles).toEqual([]);
      expect(cfg.scripts).toEqual([]);
    } finally { cleanup(dir); }
  });

  test('default mode is "safe"', async () => {
    const { dir, mdPath } = makeTmpDir();
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      const cfg = await resolveConfig(mdPath, '# Hello\n');
      expect(cfg.mode).toBe('safe');
    } finally { cleanup(dir); }
  });

  test('autoDiscover is true by default', async () => {
    const { dir, mdPath } = makeTmpDir();
    try {
      fs.writeFileSync(mdPath, '# Hello\n');
      const cfg = await resolveConfig(mdPath, '# Hello\n');
      expect(cfg.autoDiscover).toBe(true);
    } finally { cleanup(dir); }
  });
});

test.describe('@style and @script comment directives', () => {
  test('@style comment adds the resolved path to styles', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const md = '<!-- @style: theme.css -->\n\n# Hello';
    try {
      fs.writeFileSync(mdPath, md);
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.styles).toHaveLength(1);
      expect(cfg.styles[0]).toBe(path.resolve(dir, 'theme.css'));
    } finally { cleanup(dir); }
  });

  test('@script comment adds the resolved path to scripts', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const md = '<!-- @script: app.js -->\n\n# Hello';
    try {
      fs.writeFileSync(mdPath, md);
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.scripts).toHaveLength(1);
      expect(cfg.scripts[0]).toBe(path.resolve(dir, 'app.js'));
    } finally { cleanup(dir); }
  });

  test('multiple @style comments result in multiple style entries', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const md = '<!-- @style: a.css -->\n<!-- @style: b.css -->\n\n# Hello';
    try {
      fs.writeFileSync(mdPath, md);
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.styles).toHaveLength(2);
    } finally { cleanup(dir); }
  });
});

test.describe('front matter mdstyled block', () => {
  test('styles listed in front matter are resolved', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const md = '---\nmdstyled:\n  styles:\n    - custom.css\n---\n\n# Hello';
    try {
      fs.writeFileSync(mdPath, md);
      const cfg = await resolveConfig(mdPath, md);
      const names = cfg.styles.map(s => path.basename(s));
      expect(names).toContain('custom.css');
    } finally { cleanup(dir); }
  });

  test('mode "trusted" in front matter is respected', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const md = '---\nmdstyled:\n  mode: trusted\n---\n\n# Hello';
    try {
      fs.writeFileSync(mdPath, md);
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.mode).toBe('trusted');
    } finally { cleanup(dir); }
  });

  test('mode "safe" in front matter is respected', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const md = '---\nmdstyled:\n  mode: safe\n---\n\n# Hello';
    try {
      fs.writeFileSync(mdPath, md);
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.mode).toBe('safe');
    } finally { cleanup(dir); }
  });
});

test.describe('auto-discover sibling files', () => {
  test('sibling .css file with same stem is auto-discovered', async () => {
    const { dir, mdPath } = makeTmpDir('slides');
    const cssPath = path.join(dir, 'slides.css');
    const md = '# Hello\n';
    try {
      fs.writeFileSync(mdPath, md);
      fs.writeFileSync(cssPath, '/* auto */');
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.styles.map(s => path.basename(s))).toContain('slides.css');
    } finally { cleanup(dir); }
  });

  test('sibling .mdstyled file with same stem is auto-discovered', async () => {
    const { dir, mdPath } = makeTmpDir('slides');
    const styledPath = path.join(dir, 'slides.mdstyled');
    const md = '# Hello\n';
    try {
      fs.writeFileSync(mdPath, md);
      fs.writeFileSync(styledPath, '/* mdstyled */');
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.styles.map(s => path.basename(s))).toContain('slides.mdstyled');
    } finally { cleanup(dir); }
  });

  test('sibling .js file with same stem is auto-discovered', async () => {
    const { dir, mdPath } = makeTmpDir('slides');
    const jsPath = path.join(dir, 'slides.js');
    const md = '# Hello\n';
    try {
      fs.writeFileSync(mdPath, md);
      fs.writeFileSync(jsPath, 'console.log("hi");');
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.scripts.map(s => path.basename(s))).toContain('slides.js');
    } finally { cleanup(dir); }
  });

  test('unrelated sibling file is not picked up', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const unrelated = path.join(dir, 'other.css');
    const md = '# Hello\n';
    try {
      fs.writeFileSync(mdPath, md);
      fs.writeFileSync(unrelated, '/* other */');
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.styles.map(s => path.basename(s))).not.toContain('other.css');
    } finally { cleanup(dir); }
  });
});

test.describe('mdstyled.config.json workspace config', () => {
  test('styles from mdstyled.config.json are included', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const configPath = path.join(dir, 'mdstyled.config.json');
    const md = '# Hello\n';
    try {
      fs.writeFileSync(mdPath, md);
      fs.writeFileSync(configPath, JSON.stringify({ styles: ['workspace.css'] }));
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.styles.map(s => path.basename(s))).toContain('workspace.css');
    } finally { cleanup(dir); }
  });

  test('invalid JSON in mdstyled.config.json is silently ignored', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const configPath = path.join(dir, 'mdstyled.config.json');
    const md = '# Hello\n';
    try {
      fs.writeFileSync(mdPath, md);
      fs.writeFileSync(configPath, '{ invalid json ');
      // Should not throw
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.styles).toEqual([]);
    } finally { cleanup(dir); }
  });

  test('autoDiscover: false in config skips sibling discovery', async () => {
    const { dir, mdPath } = makeTmpDir('slides');
    const configPath = path.join(dir, 'mdstyled.config.json');
    const cssPath = path.join(dir, 'slides.css');
    const md = '# Hello\n';
    try {
      fs.writeFileSync(mdPath, md);
      fs.writeFileSync(cssPath, '/* auto */');
      fs.writeFileSync(configPath, JSON.stringify({ autoDiscover: false }));
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.styles.map(s => path.basename(s))).not.toContain('slides.css');
    } finally { cleanup(dir); }
  });

  test('mode from mdstyled.config.json is used when not overridden by front matter', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const configPath = path.join(dir, 'mdstyled.config.json');
    const md = '# Hello\n';
    try {
      fs.writeFileSync(mdPath, md);
      fs.writeFileSync(configPath, JSON.stringify({ mode: 'trusted' }));
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.mode).toBe('trusted');
    } finally { cleanup(dir); }
  });

  test('front matter mode overrides mdstyled.config.json mode', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const configPath = path.join(dir, 'mdstyled.config.json');
    const md = '---\nmdstyled:\n  mode: safe\n---\n\n# Hello';
    try {
      fs.writeFileSync(mdPath, md);
      fs.writeFileSync(configPath, JSON.stringify({ mode: 'trusted' }));
      const cfg = await resolveConfig(mdPath, md);
      expect(cfg.mode).toBe('safe');
    } finally { cleanup(dir); }
  });
});

test.describe('deduplication', () => {
  test('duplicate style paths are deduplicated', async () => {
    const { dir, mdPath } = makeTmpDir('doc');
    const md = '<!-- @style: theme.css -->\n<!-- @style: theme.css -->\n\n# Hello';
    try {
      fs.writeFileSync(mdPath, md);
      const cfg = await resolveConfig(mdPath, md);
      const basenames = cfg.styles.map(s => path.basename(s));
      const uniq = [...new Set(basenames)];
      expect(basenames).toEqual(uniq);
    } finally { cleanup(dir); }
  });
});
