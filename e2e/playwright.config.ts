import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './specs',
	timeout: 30_000,
	retries: process.env.CI ? 2 : 0,
	use: {
		baseURL: 'http://localhost:1421',
		trace: 'on-first-retry',
	},
	projects: [
		{ name: 'chromium', use: { channel: 'chromium' } },
	],
});
