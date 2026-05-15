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
	define: {
		// `src/lib/api.ts` references this build-time flag. Vitest is not
		// a browser harness, so vi.mock('$lib/api') intercepts the wrapper
		// before this flag is read in practice — but defining it prevents
		// a runtime `__PLAYWRIGHT__ is not defined` ReferenceError if any
		// test imports the wrapper without mocking it.
		__PLAYWRIGHT__: false,
	},
	test: {
		include: ['src/tests/**/*.test.ts'],
	},
});
