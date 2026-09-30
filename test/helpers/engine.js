/**
 * The engine bundled for Node, so the tests exercise the same code the extension runs.
 * Built on demand into test/helpers/.engine.build.js (gitignored).
 */
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(__dirname, '.engine.build.js');

execFileSync(
  path.join(ROOT, 'node_modules', '.bin', 'esbuild'),
  [path.join(ROOT, 'src', 'engine', 'index.ts'), '--bundle', '--platform=node', '--format=cjs', '--outfile=' + OUT],
  { stdio: 'pipe' }
);

if (!fs.existsSync(OUT)) throw new Error('failed to build the engine for tests');
module.exports = require(OUT);
