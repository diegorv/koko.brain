import { configDefaults, defineConfig } from 'vitest/config';
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
	// No svelte.config.js exists (kit config lives in vite.config.js), so
	// vite-plugin-svelte needs its preprocess passed explicitly here.
	plugins: [svelte({ hot: false, preprocess: vitePreprocess() })],
	resolve: {
		// Resolve `svelte` to its client runtime so component tests can use
		// `mount()`/`flushSync()` — without this the server runtime is picked
		// and mount() throws lifecycle_function_unavailable. Recipe from the
		// official Svelte testing docs.
		conditions: ['browser'],
	},
	test: {
		include: ['src/tests/**/*.test.ts'],
		// The code map is generated and checked by CI only (codemap/INDEX.md is
		// written by CI on main). Its tests are slow and time out under local
		// load, so local runs skip them; GitHub Actions sets CI=true.
		exclude: [...configDefaults.exclude, ...(process.env.CI ? [] : ['src/tests/lib/architecture/codemap.test.ts'])],
	},
});
