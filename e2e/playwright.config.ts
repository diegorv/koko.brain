import { defineConfig } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

export default defineConfig({
	testDir: './specs',
	timeout: 30_000,
	expect: { timeout: 5_000 },
	fullyParallel: true,
	// Local runs cap the browsers so one E2E run leaves cores free (Playwright's
	// default is half the CPUs and it reads no env var for this). CI keeps that
	// default: undefined falls through to it.
	workers: process.env.CI ? undefined : 4,
	retries: process.env.CI ? 2 : 1,
	reporter: process.env.CI
		? [['list'], ['html', { open: 'never' }]]
		: [['list']],
	use: {
		baseURL: `http://localhost:${process.env.E2E_PORT ?? '1421'}`,
		actionTimeout: 10_000,
		trace: 'on-first-retry',
	},
	projects: [{ name: 'chromium', use: { channel: 'chromium' } }],
});
