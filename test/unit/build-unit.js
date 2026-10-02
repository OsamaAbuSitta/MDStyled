'use strict';
/**
 * Bundles a TypeScript source file from src/ into test/unit/.build/ using esbuild,
 * aliasing the `vscode` package to a test stub.
 *
 * External modules (those marked with `externals`) are left as runtime
 * require() calls.  Before loading a bundle that uses externals, this helper
 * copies the matching stubs from test/unit/stubs/ into .build/ so Node finds
 * them as relative requires (e.g. require('./engine') → .build/engine.js).
 *
 * Do NOT modify test/harness/build.js — this is a separate, independent helper.
 */
const path    = require('path');
const fs      = require('fs');
const { execFileSync } = require('child_process');

const ROOT      = path.join(__dirname, '..', '..');
const OUT       = path.join(__dirname, '.build');
const STUBS_DIR = path.join(__dirname, 'stubs');

// Stubs that may be needed as runtime externals.
// Key = the external name passed to --external, value = file in STUBS_DIR.
const STUB_MAP = {
  './engine':          'engine.js',
  './defaultTemplate': 'defaultTemplate.js',
  './blockEdit':       'blockEdit.js',
};

function ensureRuntimeStubs() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [, stubFile] of Object.entries(STUB_MAP)) {
    const src  = path.join(STUBS_DIR, stubFile);
    const dest = path.join(OUT, stubFile);
    if (fs.existsSync(src) && !fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
    }
  }
}

/**
 * Build `srcRelative` (path relative to repo root) into `.build/<name>.js`.
 *
 * @param {string}   name        Output basename (no .js).
 * @param {string}   srcRelative e.g. 'src/templates.ts'
 * @param {object}   [opts]
 * @param {string[]} [opts.externals]  Import paths to leave as require() calls.
 */
function buildUnit(name, srcRelative, { externals = [] } = {}) {
  ensureRuntimeStubs();
  const outfile = path.join(OUT, name + '.js');
  if (!fs.existsSync(outfile)) {
    execFileSync(
      path.join(ROOT, 'node_modules', '.bin', 'esbuild'),
      [
        path.join(ROOT, srcRelative),
        '--bundle',
        '--platform=node',
        '--format=cjs',
        `--alias:vscode=${path.join(STUBS_DIR, 'vscode.js')}`,
        ...externals.map(e => `--external:${e}`),
        '--outfile=' + outfile,
      ],
      { cwd: ROOT, stdio: 'pipe' }
    );
  }
  // Always delete cached copy so re-requires within one test run get the same instance.
  delete require.cache[require.resolve(outfile)];
  return require(outfile);
}

module.exports = { buildUnit, ROOT, OUT, STUBS_DIR };
