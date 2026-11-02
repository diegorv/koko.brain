import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
	cyclePath,
	extractImports,
	featurePairs,
	locate,
	resolveSpecifier,
	stronglyConnected,
} from '../../../../scripts/import-graph.mjs';

/** Specifier, kind and line of each import, the shape most assertions compare. */
function brief(file: string, text: string) {
	return extractImports(file, text).map((i: { spec: string | null; kind: string; typeOnly: boolean; line: number }) => [
		i.spec,
		i.kind,
		i.typeOnly,
		i.line,
	]);
}

describe('extractImports', () => {
	it('reads both script blocks of a .svelte file, with lines counted from the file start', () => {
		const svelte = [
			'<script module lang="ts">',
			"\timport { a } from '#lib/core/a.js';",
			'</script>',
			'',
			'<script lang="ts">',
			"\timport B from './B.svelte';",
			"\timport { c } from 'svelte';",
			'</script>',
			'',
			'<div>{a}</div>',
		].join('\n');
		expect(brief('src/lib/core/x/X.svelte', svelte)).toEqual([
			['#lib/core/a.js', 'static', false, 2],
			['./B.svelte', 'static', false, 6],
			['svelte', 'static', false, 7],
		]);
	});

	it('reads a script block whose closing tag has whitespace before `>`', () => {
		const svelte = [
			'<script module lang="ts">',
			"\timport { a } from '#lib/core/a.js';",
			'</script >',
			'',
			'<script lang="ts">',
			"\timport B from './B.svelte';",
			'</script\n>',
			'',
			'<div>{a}</div>',
		].join('\n');
		expect(brief('src/lib/core/x/X.svelte', svelte)).toEqual([
			['#lib/core/a.js', 'static', false, 2],
			['./B.svelte', 'static', false, 6],
		]);
	});

	it('reads a script block whose closing tag carries attributes', () => {
		const svelte = [
			'<script module lang="ts">',
			"\timport { a } from '#lib/core/a.js';",
			'</script foo="bar">',
			'',
			'<script lang="ts">',
			"\timport B from './B.svelte';",
			'</script\t\n bar>',
			'',
			'<div>{a}</div>',
		].join('\n');
		expect(brief('src/lib/core/x/X.svelte', svelte)).toEqual([
			['#lib/core/a.js', 'static', false, 2],
			['./B.svelte', 'static', false, 6],
		]);
	});

	it('reads an uppercase `<SCRIPT>` block', () => {
		const svelte = [
			'<div></div>',
			'<SCRIPT lang="ts">',
			'',
			"\timport { a } from '#lib/core/a.js';",
			'</SCRIPT>',
		].join('\n');
		expect(brief('src/lib/core/x/X.svelte', svelte)).toEqual([['#lib/core/a.js', 'static', false, 4]]);
	});

	it('ignores markup outside the script blocks', () => {
		const svelte = "<p>import { x } from '#lib/core/x.js';</p>\n<script lang=\"ts\">\n\tlet n = 1;\n</script>";
		expect(brief('src/lib/core/X.svelte', svelte)).toEqual([]);
	});

	it('marks `import type {}` and all-inline `type` specifiers type-only, a mixed list not', () => {
		const ts = [
			"import type { A } from '#lib/a.js';",
			"import { type B, type C } from '#lib/b.js';",
			"import { type D, e } from '#lib/d.js';",
		].join('\n');
		expect(brief('src/lib/x.ts', ts)).toEqual([
			['#lib/a.js', 'static', true, 1],
			['#lib/b.js', 'static', true, 2],
			['#lib/d.js', 'static', false, 3],
		]);
	});

	it('reads `export * from` and `export { x } from` as re-exports', () => {
		const ts = "export * from './a.js';\nexport { b } from './b.js';\nexport type { C } from './c.js';";
		expect(brief('src/lib/x.ts', ts)).toEqual([
			['./a.js', 'reexport', false, 1],
			['./b.js', 'reexport', false, 2],
			['./c.js', 'reexport', true, 3],
		]);
	});

	it('reads a literal `await import()` and flags a non-literal one with a null specifier', () => {
		const ts = [
			'async function f(name: string) {',
			"\tconst m = await import('#lib/plugins/p/p.service.js');",
			'\tconst n = await import(name);',
			'\tconst o = await import(`#lib/${name}.js`);',
			'}',
		].join('\n');
		expect(brief('src/lib/x.ts', ts)).toEqual([
			['#lib/plugins/p/p.service.js', 'dynamic', false, 2],
			[null, 'dynamic', false, 3],
			[null, 'dynamic', false, 4],
		]);
	});

	it("reads `typeof import('x')` and `import('x').T` types as type-only", () => {
		const ts = "let a: typeof import('#lib/a.js');\nlet b: import('./b.js').B;";
		expect(brief('src/lib/x.ts', ts)).toEqual([
			['#lib/a.js', 'import-type', true, 1],
			['./b.js', 'import-type', true, 2],
		]);
	});

	it('returns nothing for a file with no imports', () => {
		expect(brief('src/lib/x.ts', '')).toEqual([]);
	});
});

describe('resolveSpecifier', () => {
	const files = new Set([
		'src/lib/core/vault/vault.store.svelte.ts',
		'src/lib/features/tags/tags.logic.ts',
		'src/lib/features/tags/Tags.svelte',
		'src/lib/plugins/kanban/index.ts',
	]);
	const exists = (p: string) => files.has(p);

	it('maps a `#lib/...js` specifier to its .ts source', () => {
		expect(resolveSpecifier('src/lib/core/a.ts', '#lib/features/tags/tags.logic.js', exists)).toBe(
			'src/lib/features/tags/tags.logic.ts',
		);
	});

	it('maps a `.svelte.js` store specifier to its `.svelte.ts` file', () => {
		expect(resolveSpecifier('src/lib/core/a.ts', '#lib/core/vault/vault.store.svelte.js', exists)).toBe(
			'src/lib/core/vault/vault.store.svelte.ts',
		);
	});

	it('resolves a relative path that climbs into another layer', () => {
		expect(resolveSpecifier('src/lib/core/vault/v.ts', '../../features/tags/Tags.svelte', exists)).toBe(
			'src/lib/features/tags/Tags.svelte',
		);
	});

	it('resolves a folder to its index.ts', () => {
		expect(resolveSpecifier('src/lib/core/a.ts', '#lib/plugins/kanban', exists)).toBe('src/lib/plugins/kanban/index.ts');
	});

	it('keeps an unresolved internal path so its layer still classifies', () => {
		expect(resolveSpecifier('src/lib/core/a.ts', '#lib/features/gone/gone.js', exists)).toBe(
			'src/lib/features/gone/gone.js',
		);
	});

	it('returns null for a package specifier', () => {
		expect(resolveSpecifier('src/lib/core/a.ts', 'svelte/store', exists)).toBeNull();
	});
});

describe('locate', () => {
	it('names the layer and unit of a path under src/lib', () => {
		expect(locate('src/lib/features/tags/Tags.svelte')).toEqual({ layer: 'features', unit: 'features/tags' });
		expect(locate('src/lib/utils/path.ts')).toEqual({ layer: 'utils', unit: 'utils' });
		expect(locate('src/lib/components/ui/button/index.ts')).toEqual({ layer: 'components', unit: 'components' });
		expect(locate('src/lib/utils.ts')).toEqual({ layer: 'lib-root', unit: 'utils.ts' });
	});

	it('reports paths outside src/lib as outside', () => {
		expect(locate('src/routes/+page.svelte')).toEqual({ layer: 'outside', unit: 'src/routes/+page.svelte' });
	});
});

describe('featurePairs', () => {
	it('lists each feature -> other feature pair once, type-only and dynamic edges included', () => {
		const edges = [
			{ from: 'src/lib/features/a/A.svelte', to: 'src/lib/features/b/b.ts', typeOnly: true },
			{ from: 'src/lib/features/a/a.ts', to: 'src/lib/features/b/B.svelte', typeOnly: false },
			{ from: 'src/lib/features/b/b.ts', to: 'src/lib/features/c/c.ts', kind: 'dynamic' },
			{ from: 'src/lib/features/a/a.ts', to: 'src/lib/features/a/x.ts' },
			{ from: 'src/lib/features/a/a.ts', to: 'src/lib/core/v/v.ts' },
			{ from: 'src/lib/core/v/v.ts', to: 'src/lib/features/a/a.ts' },
			{ from: 'src/lib/features/a/a.ts', to: null },
		];
		expect(featurePairs(edges)).toEqual(['a -> b', 'b -> c']);
	});
});

describe('stronglyConnected', () => {
	it('finds no component in an acyclic graph', () => {
		expect(stronglyConnected(['a -> b', 'b -> c', 'a -> c'])).toEqual([]);
	});

	it('finds a 2-cycle', () => {
		expect(stronglyConnected(['a -> b', 'b -> a', 'b -> c'])).toEqual([['a', 'b']]);
	});

	it('merges a cycle nested inside a larger one into one component', () => {
		const pairs = ['a -> b', 'b -> a', 'b -> c', 'c -> d', 'd -> b', 'd -> a', 'e -> a'];
		expect(stronglyConnected(pairs)).toEqual([['a', 'b', 'c', 'd']]);
	});

	it('keeps two separate cycles apart', () => {
		expect(stronglyConnected(['a -> b', 'b -> a', 'b -> c', 'c -> d', 'd -> c'])).toEqual([
			['a', 'b'],
			['c', 'd'],
		]);
	});

	it('ignores a self-edge', () => {
		expect(stronglyConnected(['a -> a', 'a -> b'])).toEqual([]);
	});
});

describe('cyclePath', () => {
	it('closes the shortest cycle through the given pair', () => {
		const pairs = ['a -> b', 'b -> c', 'c -> a', 'b -> d', 'd -> e', 'e -> a'];
		expect(cyclePath(pairs, 'a', 'b')).toEqual(['a', 'b', 'c', 'a']);
		expect(cyclePath(pairs, 'd', 'e')).toEqual(['d', 'e', 'a', 'b', 'd']);
	});

	it('returns null when the pair is on no cycle', () => {
		expect(cyclePath(['a -> b', 'b -> c'], 'a', 'b')).toBeNull();
	});
});

describe('import-graph.mjs CLI guard', () => {
	it('imports cleanly when process.argv[1] is not a real file', () => {
		const script = join(process.cwd(), 'scripts/import-graph.mjs');
		const res = spawnSync(
			process.execPath,
			['-e', `import(${JSON.stringify(script)}).then(() => console.log('imported'))`, 'not-a-file'],
			{ cwd: tmpdir(), encoding: 'utf8' },
		);
		expect(res.stderr).toBe('');
		expect(res.stdout.trim()).toBe('imported');
		expect(res.status).toBe(0);
	});
});
