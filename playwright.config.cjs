const path = require('path');
const { defineConfig } = require('@playwright/test');
const { isolatedMongoUri } = require('./e2e/test-env.cjs');

const root = path.resolve(__dirname, '..');
const mongoUri = isolatedMongoUri();

module.exports = defineConfig({
  testDir: './e2e',
  globalSetup: require.resolve('./e2e/global-setup.cjs'),
  globalTeardown: require.resolve('./e2e/global-teardown.cjs'),
  fullyParallel: false,
  workers: 1,
  timeout: 120000,
  expect: { timeout: 15000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'line',
  use: {
    actionTimeout: 15000,
    baseURL: 'http://127.0.0.1:4011',
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command:
        'node -r ./backend/node_modules/ts-node/register/transpile-only ./backend/src/app.ts',
      cwd: root,
      url: 'http://127.0.0.1:5012/api/health',
      timeout: 120000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        MONGO_URI: mongoUri,
        PORT: '5012',
        JWT_SECRET: 'phase1-e2e-secret',
        JWT_EXPIRES_IN: '1h',
        CORS_ORIGIN: 'http://127.0.0.1:4011',
        CLIENT_PORTAL_ENABLED: 'true',
        CLIENT_WORKFLOW_ENABLED: 'true',
        TS_NODE_PROJECT: path.join(root, 'backend/tsconfig.json'),
        NODE_ENV: 'test',
        UPLOAD_DIR: path.join(root, '.data/e2e-package-media'),
      },
    },
    {
      command: 'node ../node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4011 --strictPort',
      cwd: __dirname,
      url: 'http://127.0.0.1:4011/portfolio',
      timeout: 120000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        VITE_API_URL: 'http://127.0.0.1:5012/api',
        VITE_CLIENT_PORTAL_ENABLED: 'true',
      },
    },
  ],
});
