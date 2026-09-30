/** Runs every *.test.js in this directory and fails if any of them do. */
const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
let failed = 0;

for (const file of files) {
  process.stdout.write(`\n── ${file} ${'─'.repeat(Math.max(0, 50 - file.length))}\n`);
  const result = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  if (result.status !== 0) failed++;
}

console.log(failed ? `\n${failed} of ${files.length} suites failed` : `\nall ${files.length} suites passed`);
process.exit(failed ? 1 : 0);
