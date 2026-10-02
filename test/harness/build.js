/**
 * Bundles the extension's pure modules for Node, so tests run the code the extension
 * runs: the rendering engine, and the rules for writing a block edit to the file.
 * Built once per test run into test/harness/.build/ (gitignored).
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '.build');
const ENTRIES = { engine: 'src/engine/index.ts', blockEdit: 'src/blockEdit.ts' };

function build() {
  fs.mkdirSync(OUT, { recursive: true });
  for (const [name, entry] of Object.entries(ENTRIES)) {
    execFileSync(path.join(ROOT, 'node_modules', '.bin', 'esbuild'), [
      path.join(ROOT, entry), '--bundle', '--platform=node', '--format=cjs',
      '--outfile=' + path.join(OUT, name + '.js'),
    ], { stdio: 'pipe' });
  }
}

let built = false;
function load(name) {
  if (!built && !fs.existsSync(path.join(OUT, name + '.js'))) { build(); built = true; }
  return require(path.join(OUT, name + '.js'));
}

module.exports = { build, engine: () => load('engine'), blockEdit: () => load('blockEdit'), ROOT };
