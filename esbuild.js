const esbuild = require('esbuild');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/** Markers the .vscode/tasks.json background problem matcher keys off. */
const watchLogger = {
  name: 'watch-logger',
  setup(build) {
    build.onStart(() => console.log('[watch] build started'));
    build.onEnd(result => {
      for (const { text, location } of result.errors) {
        console.error(`[ERROR] ${text}`);
        if (location) console.error(`    ${location.file}:${location.line}:${location.column}`);
      }
      console.log('[watch] build finished');
    });
  },
};

const options = {
  entryPoints: ['./src/extension.ts'],
  bundle: true,
  outfile: './out/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  minify: production,
  sourcemap: !production,
};

async function main() {
  if (!watch) {
    await esbuild.build(options);
    return;
  }
  const ctx = await esbuild.context({ ...options, plugins: [watchLogger] });
  await ctx.watch();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
