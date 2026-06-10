import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [svelte({ hot: false })],
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
