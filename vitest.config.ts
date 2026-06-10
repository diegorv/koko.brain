import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

export default defineConfig({
	plugins: [svelte({ hot: false })],
	resolve: {
		alias: {
			$lib: path.resolve('./src/lib'),
		},
	},
	// TEMPORARY (negative-patterns-remediation branch): vite 8 + rolldown 1.0.1
	// crash during dependency optimization with "Could not resolve 'node:module'
	// in rolldown/runtime.js", which prevents vitest from starting at all in this
	// environment. Disabling dep optimization for the test run sidesteps the
	// rolldown pre-bundle path. Revert once the toolchain bug is fixed upstream.
	optimizeDeps: {
		noDiscovery: true,
		include: [],
	},
	test: {
		include: ['src/tests/**/*.test.ts'],
		deps: {
			optimizer: {
				web: { enabled: false },
				ssr: { enabled: false },
			},
		},
	},
});
