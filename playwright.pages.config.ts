import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir: 'tests/pages', outputDir: 'test-results-pages', workers: 1, timeout: 30000,
 use: { baseURL: 'http://127.0.0.1:3012/hr-change-game/', headless: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] } },
 webServer: { command: 'npm run build:pages && node scripts/preview-pages.mjs', url: 'http://127.0.0.1:3012/hr-change-game/', reuseExistingServer: false, timeout: 60000 },
});
