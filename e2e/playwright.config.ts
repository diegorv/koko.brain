import { defineConfig } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
	testDir: './specs',
	timeout: 30_000,
	expect: { timeout: 5_000 },
	fullyParallel: true,
	retries: process.env.CI ? 2 : 1,
	reporter: process.env.CI
		? [['list'], ['html', { open: 'never' }]]
		: [['list']],
	use: {
		baseURL: 'http://localhost:1421',
		actionTimeout: 10_000,
		trace: 'on-first-retry',
	},
	projects: [{ name: 'chromium', use: { channel: 'chromium' } }],
});
