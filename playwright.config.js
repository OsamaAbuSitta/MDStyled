// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Two projects: `unit` runs the pure modules (serializer, block edits, table and
 * card models, emoji search, menus) in Node; `e2e` drives the real editor in a real
 * browser against a preview that behaves like the VS Code panel (test/harness).
 */
module.exports = defineConfig({
  testDir: 'test',
  globalSetup: require.resolve('./test/harness/global-setup.js'),
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : [['list'], ['html', { open: 'never' }]],
  timeout: 30000,
  expect: { timeout: 5000 },
  projects: [
    { name: 'unit', testMatch: /unit\/.*\.spec\.js$/ },
    {
      name: 'e2e',
      testMatch: /e2e\/.*\.spec\.js$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1100, height: 900 }, trace: 'retain-on-failure' },
    },
  ],
});
