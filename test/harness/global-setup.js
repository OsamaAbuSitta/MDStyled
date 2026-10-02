/* Build once before any test: the engine and block-edit bundles, and the editable
   templates from their sources, so every run tests the current code. */
const { execFileSync } = require('child_process');
const path = require('path');
const { build, ROOT } = require('./build');

module.exports = async () => {
  build();
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-editable-templates.js')], { stdio: 'pipe' });
};
