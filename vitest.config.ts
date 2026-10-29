import { defineConfig } from 'vitest/config';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	// No svelte.config.js exists (kit config lives in vite.config.js), so
	// vite-plugin-svelte needs its preprocess passed explicitly here.
	plugins: [svelte({ hot: false, preprocess: vitePreprocess() })],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
		},
		// Resolve `svelte` to its client runtime so component tests can use
		// `mount()`/`flushSync()` — without this the server runtime is picked
		// and mount() throws lifecycle_function_unavailable. Recipe from the
		// official Svelte testing docs.
		conditions: ['browser'],
	},
	test: {
		include: ['src/tests/**/*.test.ts'],
	},
});
