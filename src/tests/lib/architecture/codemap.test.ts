import { describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
	buildModel,
	discoverModules,
	fileRole,
	isInput,
	moduleOf,
	readInputs,
} from '../../../../scripts/codemap/model.mjs';
import {
	byLines,
	crossLanguageLines,
	dtoLine,
	eventLine,
	ipcLine,
} from '../../../../scripts/codemap/render.mjs';
import {
	analyzeRust,
	eventConsts,
	extractRustFile,
	handlerEntries,
	joinCommands,
	joinDtos,
	joinEvents,
	lexRust,
	parseUseTree,
	rustEffects,
	rustEmits,
} from '../../../../scripts/codemap/rust.mjs';
import {
	collectRegistries,
	collectStores,
	componentMounts,
	extractContracts,
	extractIpcSites,
	extractTsFile,
	extractUses,
	firstSentence,
	keySites,
	publicIds,
	resolveBindings,
	resolveReexports,
	testRelations,
	tsEffects,
	usersBySymbol,
} from '../../../../scripts/codemap/ts.mjs';

/** The code map generator (`scripts/codemap.mjs` and `scripts/codemap/`). */

/** Name, kind, line, span, signature and doc of one symbol. */
type SymRow = [name: string, kind: string, line: number, span: number, sig: string, doc: string];

/** Name, kind, line, span, signature and doc of each symbol, the shape most assertions compare. */
function syms(file: string, text: string): SymRow[] {
	return extractTsFile(file, text).symbols.map(
		(s: { name: string; kind: string; line: number; span: number; sig: string; doc: string }) => [
			s.name,
			s.kind,
			s.line,
			s.span,
			s.sig,
			s.doc,
		],
	);
}

/** Resolves every binding of an in-memory tree; returns `<from>:<local> -> <id>` lines. */
function resolveTree(tree: Record<string, string>) {
	const files = new Map(Object.keys(tree).map((path) => [path, extractTsFile(path, tree[path])]));
	return resolveBindings(files).map(
		(b: { from: string; local: string; id: string | null }) => `${b.from}:${b.local} -> ${b.id}`,
	);
}

describe('firstSentence', () => {
	it('stops at a period followed by a space and an uppercase letter', () => {
		expect(firstSentence('Builds the tree. Bar follows.')).toBe('Builds the tree.');
	});

	it('stops at `?` or `!` followed by the end or a backtick, `(` or `[`', () => {
		expect(firstSentence('Is it open? `x` is set.')).toBe('Is it open?');
		expect(firstSentence('Done! (later)')).toBe('Done!');
		expect(firstSentence('Done. [x]')).toBe('Done.');
		expect(firstSentence('Only one sentence.')).toBe('Only one sentence.');
	});

	it('does not stop after e.g, i.e, etc, vs, cf, inside backticks, or before a lowercase word', () => {
		expect(firstSentence('Takes a key, e.g. Bar, and more. Next.')).toBe('Takes a key, e.g. Bar, and more.');
		expect(firstSentence('One thing, i.e. X is set. Next.')).toBe('One thing, i.e. X is set.');
		expect(firstSentence('A, B, etc. Y wins. Next.')).toBe('A, B, etc. Y wins.');
		expect(firstSentence('Calls `a. B` then `a.B`. Next.')).toBe('Calls `a. B` then `a.B`.');
		expect(firstSentence('Ends at v1. then more. Next.')).toBe('Ends at v1. then more.');
		expect(firstSentence('Old VS. New compare. Next.')).toBe('Old VS. New compare.');
		expect(firstSentence('See cf. Foo for more. Next.')).toBe('See cf. Foo for more.');
	});

	it('cuts at the first blank line and collapses whitespace', () => {
		expect(firstSentence('First line\n  continues here\n\nSecond paragraph.')).toBe('First line continues here');
	});

	it('cuts at a blank line with CRLF line ends', () => {
		expect(firstSentence('A one\r\n\r\nB two.')).toBe('A one');
		expect(firstSentence('A one\r\n  \r\nB two.')).toBe('A one');
	});

	it('replaces `{@link X}` with X and `{@link X | label}` with the label', () => {
		expect(firstSentence('Uses {@link Foo} and {@linkcode Bar}.')).toBe('Uses Foo and Bar.');
		expect(firstSentence('Calls {@link Foo | the foo}.')).toBe('Calls the foo.');
		expect(firstSentence('Uses {@linkplain Baz} and {@linkplain Qux label}.')).toBe('Uses Baz and label.');
	});

	it('caps the result at 160 chars with an ellipsis', () => {
		const long = 'a'.repeat(200);
		const out = firstSentence(long);
		expect(out).toHaveLength(160);
		expect(out.endsWith('…')).toBe(true);
		expect(firstSentence('b'.repeat(160))).toBe('b'.repeat(160));
	});

	it('does not split a surrogate pair at the cap', () => {
		expect(firstSentence('\u{1F600}'.repeat(100))).toBe(`${'\u{1F600}'.repeat(79)}…`);
	});

	it('returns an empty string for empty or blank input', () => {
		expect(firstSentence('')).toBe('');
		expect(firstSentence('  \n ')).toBe('');
	});
});

describe('exports', () => {
	it('reads export forms with their lines and spans in a .ts file', () => {
		const ts = [
			'export function f(a: string): void {', // 1
			'\treturn;',
			'}',
			'export async function g() {}', // 4
			'export const a = 1, b = () => {', // 5
			'\treturn 2;',
			'};',
			'export class C extends Base {}', // 8
			'export interface I {', // 9
			'\tx: number;',
			'}',
			'export type T = string;', // 12
			'export let n = 0;', // 13
			'function local() {}',
			'export const s = {', // 15
			'\tget x() {',
			'\t\treturn 1;',
			'\t},',
			'};',
		].join('\n');
		expect(syms('src/lib/x.ts', ts)).toEqual([
			['f', 'fn', 1, 3, '(a: string): void', ''],
			['g', 'fn', 4, 1, '()', ''],
			['a', 'const', 5, 1, '', ''],
			['b', 'fn', 5, 3, '()', ''],
			['C', 'class', 8, 1, ' extends Base', ''],
			['I', 'interface', 9, 3, '', ''],
			['T', 'type', 12, 1, '', ''],
			['n', 'const', 13, 1, '', ''],
			['s', 'store', 15, 5, '', ''],
		]);
	});

	it('reads a .svelte file: component at line 1, `<script module>` exports, instance `export function` as method', () => {
		const svelte = [
			'<script module lang="ts">', // 1
			'\texport function helper(x: number): number {', // 2
			'\t\treturn x;',
			'\t}',
			'</script>',
			'',
			'<script lang="ts">', // 7
			'\tlet { a }: Props = $props();',
			'\texport function handleKeydown(e: KeyboardEvent): boolean {', // 9
			'\t\treturn true;',
			'\t}',
			'</script>',
			'',
			'<div>{a}</div>', // 14
		].join('\n');
		expect(syms('src/lib/features/x/Widget.svelte', svelte)).toEqual([
			['Widget', 'component', 1, 14, ' props:a', ''],
			['helper', 'fn', 2, 3, '(x: number): number', ''],
			['handleKeydown', 'method', 9, 3, '(e: KeyboardEvent): boolean', ''],
		]);
	});

	it('counts the component span without the final newline', () => {
		expect(syms('src/lib/A.svelte', '<div></div>\n')).toEqual([['A', 'component', 1, 1, '', '']]);
	});

	it('puts a declaration under a multi-line JSDoc block at its `export` line', () => {
		const ts = ['/**', ' * Doc of f.', ' * More text.', ' */', 'export function f() {}', '/** Doc of c. */', 'export const c = 1;'].join('\n');
		expect(syms('src/lib/x.ts', ts)).toEqual([
			['f', 'fn', 5, 1, '()', 'Doc of f.'],
			['c', 'const', 7, 1, '', 'Doc of c.'],
		]);
	});

	it('keeps one symbol for an overloaded function, at its implementation', () => {
		const ts = ['export function f(a: string): void;', 'export function f(a: number): void;', 'export function f(a: unknown) {}', 'function g(): void;', 'function g() {}'].join('\n');
		const out = extractTsFile('src/lib/x.ts', ts);
		expect(out.symbols.map((s: { name: string; line: number }) => [s.name, s.line])).toEqual([['f', 3]]);
		expect(out.locals.map((l: { name: string; line: number }) => [l.name, l.line])).toEqual([['g', 5]]);
	});

	it('reads `<script context="module">` as the module script', () => {
		const svelte = '<script context="module" lang="ts">\n\texport function helper() {}\n</script>\n<p></p>';
		expect(syms('src/lib/A.svelte', svelte).map(([name, kind]) => [name, kind])).toEqual([
			['A', 'component'],
			['helper', 'fn'],
		]);
	});

	it('reads an instance-script `export const` arrow as a method', () => {
		const svelte = '<script lang="ts">\n\texport const focus = () => {};\n\texport const size = 3;\n</script>';
		expect(syms('src/lib/A.svelte', svelte).map(([name, kind, line]) => [name, kind, line])).toEqual([
			['A', 'component', 1],
			['focus', 'method', 2],
		]);
	});
});

describe('JSDoc placement', () => {
	it('prefers the declarator doc, falls back to the statement doc, and takes the last of two blocks', () => {
		const ts = [
			'/** Statement doc. */',
			'export const /** Declarator doc. */ a = 1, b = 2;',
			'/** First block. */',
			'/** Second block. More text. */',
			'export function f() {}',
			'export function none() {}',
			'/**',
			' * Tagged one.',
			' * @param x the input',
			' */',
			'export function tagged(x: number) {}',
		].join('\n');
		expect(syms('src/lib/x.ts', ts).map(([name, , , , , doc]) => [name, doc])).toEqual([
			['a', 'Declarator doc.'],
			['b', 'Statement doc.'],
			['f', 'Second block.'],
			['none', ''],
			['tagged', 'Tagged one.'],
		]);
	});
});

describe('file header', () => {
	it('takes a block before an import', () => {
		const ts = "/**\n * Tag index service. Builds things.\n */\nimport { a } from './a';\nexport const x = a;";
		expect(extractTsFile('src/lib/x.ts', ts).header).toBe('Tag index service.');
	});

	it('takes the first of two leading blocks, leaving the second to the declaration', () => {
		const ts = '/** File header. */\n\n/** Doc of f. */\nexport function f() {}';
		const out = extractTsFile('src/lib/x.ts', ts);
		expect(out.header).toBe('File header.');
		expect(out.symbols[0].doc).toBe('Doc of f.');
	});

	it('is empty for a single block on the first declaration, or a file without a block', () => {
		expect(extractTsFile('src/lib/x.ts', '/** Doc of f. */\nexport function f() {}').header).toBe('');
		expect(extractTsFile('src/lib/x.ts', "// plain\nimport { a } from './a';").header).toBe('');
		expect(extractTsFile('src/lib/x.ts', '').header).toBe('');
	});
});

describe('signatures', () => {
	it('collapses whitespace and keeps the parameters as written, with no inferred return type', () => {
		const ts = [
			'export function f<T>(',
			'\ta: string,',
			'\tb: Map<string,   T>,',
			'): Promise<T> {',
			'\treturn x;',
			'}',
			'export const g = (x: number) => x * 2;',
		].join('\n');
		expect(syms('src/lib/x.ts', ts).map(([name, , , , sig]) => [name, sig])).toEqual([
			['f', '<T>(a: string, b: Map<string, T>): Promise<T>'],
			['g', '(x: number)'],
		]);
	});

	it('shows `= <callee>(…)` for a const set by a call, `: <type>` for an annotated const', () => {
		const ts = [
			'export const load = dedupeInflight(async () => {',
			'\treturn 1;',
			'});',
			'export const limit: number = 3;',
			`export const long = ${'a'.repeat(50)}.b(1);`,
		].join('\n');
		expect(syms('src/lib/x.ts', ts).map(([name, , , , sig]) => [name, sig])).toEqual([
			['load', ' = dedupeInflight(…)'],
			['limit', ': number'],
			['long', ` = ${'a'.repeat(39)}…(…)`],
		]);
	});

	it('caps a signature at 120 chars with an ellipsis', () => {
		const params = Array.from({ length: 20 }, (_, i) => `p${i}: string`).join(', ');
		const [[, , , , sig]] = syms('src/lib/x.ts', `export function f(${params}) {}`);
		expect(sig).toHaveLength(120);
		expect(sig.endsWith('…')).toBe(true);
		expect(sig.startsWith('(p0: string, p1: string')).toBe(true);
	});
});

describe('component props', () => {
	it('lists the `$props()` destructuring', () => {
		const svelte = [
			'<script lang="ts">',
			'\tlet { a, b = 1, c = $bindable(), ...rest }: Props = $props();',
			'</script>',
		].join('\n');
		expect(syms('src/lib/A.svelte', svelte)[0][4]).toBe(' props:a,b=,c=$bindable,...rest');
	});

	it('uses the prop name of a renamed binding', () => {
		const svelte = '<script lang="ts">\n\tlet { class: klass = \'\' } = $props();\n</script>';
		expect(syms('src/lib/A.svelte', svelte)[0][4]).toBe(' props:class=');
	});

	it('has no props field when the component reads none', () => {
		const svelte = '<script lang="ts">\n\tlet n = $state(0);\n</script>\n<p>{n}</p>';
		expect(syms('src/lib/A.svelte', svelte)[0][4]).toBe('');
	});
});

describe('locals', () => {
	it('lists non-exported top-level functions and const arrows, not exported ones or nested ones', () => {
		const ts = [
			'function helper(a: number): number {', // 1
			'\tfunction inner() {}',
			'\treturn a;',
			'}',
			'const run = async () => {', // 5
			'\tawait helper(1);',
			'};',
			'let fx = function () {};', // 8
			'const value = 3;',
			'export function pub() {}',
			'export const pubArrow = () => {};',
		].join('\n');
		expect(
			extractTsFile('src/lib/x.ts', ts).locals.map((l: { name: string; line: number; span: number; sig: string }) => [
				l.name,
				l.line,
				l.span,
				l.sig,
			]),
		).toEqual([
			['helper', 1, 4, '(a: number): number'],
			['run', 5, 3, '()'],
			['fx', 8, 1, '()'],
		]);
	});

	it('reads instance-script locals of a .svelte file with the script offset', () => {
		const svelte = '<div></div>\n<script lang="ts">\n\tfunction toggle() {}\n</script>';
		expect(extractTsFile('src/lib/A.svelte', svelte).locals.map((l: { name: string; line: number }) => [l.name, l.line])).toEqual([
			['toggle', 3],
		]);
	});
});

describe('binding resolution', () => {
	it('follows a two-hop aliased `export { a as b } from` chain', () => {
		expect(
			resolveTree({
				'src/lib/core/a.ts': 'export function a() {}',
				'src/lib/core/b.ts': "export { a as b } from './a.js';",
				'src/lib/core/c.ts': "export { b as c } from './b.js';",
				'src/lib/features/u.ts': "import { c as mine } from '#lib/core/c.js';",
			}),
		).toEqual(['src/lib/features/u.ts:mine -> src/lib/core/a.ts:a']);
	});

	it('searches `export *` sources in order and takes the first that has the name', () => {
		expect(
			resolveTree({
				'src/lib/core/one.ts': 'export const other = 1;',
				'src/lib/core/two.ts': 'export const x = 1;',
				'src/lib/core/three.ts': 'export const x = 2;',
				'src/lib/core/index.ts': "export * from './one.js';\nexport * from './two.js';\nexport * from './three.js';",
				'src/lib/u.ts': "import { x } from '#lib/core/index.js';",
			}),
		).toEqual(['src/lib/u.ts:x -> src/lib/core/two.ts:x']);
	});

	it('terminates on a re-export cycle with an unresolved binding', () => {
		expect(
			resolveTree({
				'src/lib/core/a.ts': "export { x } from './b.js';",
				'src/lib/core/b.ts': "export { x } from './a.js';",
				'src/lib/u.ts': "import { x } from '#lib/core/a.js';",
			}),
		).toEqual(['src/lib/u.ts:x -> null']);
	});

	it('maps a chain ending in `contracts/generated/<T>.ts` to `dto:T`', () => {
		expect(
			resolveTree({
				'src/lib/contracts/generated/TagAggregate.ts': 'export type TagAggregate = { name: string };',
				'src/lib/types/t.types.ts':
					"import type { TagAggregate } from '#lib/contracts/generated/TagAggregate.js';\nexport type { TagAggregate as Agg };",
				'src/lib/u.ts': "import type { Agg } from '#lib/types/t.types.js';",
			}),
		).toEqual([
			'src/lib/types/t.types.ts:TagAggregate -> dto:TagAggregate',
			'src/lib/u.ts:Agg -> dto:TagAggregate',
		]);
	});

	it('reads `const { x } = await import(...)` as a binding', () => {
		expect(
			resolveTree({
				'src/lib/core/m.ts': 'export function x() {}',
				'src/lib/u.ts': "async function f() {\n\tconst { x, x: y } = await import('./core/m.js');\n}",
			}),
		).toEqual(['src/lib/u.ts:x -> src/lib/core/m.ts:x', 'src/lib/u.ts:y -> src/lib/core/m.ts:x']);
	});

	it('resolves `import Root from "./b.svelte"; export { Root as Button }` to the component', () => {
		expect(
			resolveTree({
				'src/lib/components/ui/button/button.svelte':
					'<script module lang="ts">\n\texport const variants = {};\n</script>\n<button></button>',
				'src/lib/components/ui/button/index.ts':
					"import Root, { variants } from './button.svelte';\nexport { Root as Button, variants };",
				'src/lib/features/u.svelte':
					"<script lang=\"ts\">\n\timport { Button, variants } from '#lib/components/ui/button/index.js';\n</script>",
			}),
		).toEqual([
			'src/lib/components/ui/button/index.ts:Root -> src/lib/components/ui/button/button.svelte:default',
			'src/lib/components/ui/button/index.ts:variants -> src/lib/components/ui/button/button.svelte:variants',
			'src/lib/features/u.svelte:Button -> src/lib/components/ui/button/button.svelte:default',
			'src/lib/features/u.svelte:variants -> src/lib/components/ui/button/button.svelte:variants',
		]);
	});

	it('maps a package re-export and a direct package import to `external:<pkg>`', () => {
		expect(
			resolveTree({
				'src/lib/plugins/mods/contract/api.ts': "export type * from '@kokobrain/mod-core/contract';\nexport { tick } from 'svelte';",
				'src/lib/u.ts':
					"import type { ModApi } from '#lib/plugins/mods/contract/api.js';\nimport { tick } from '#lib/plugins/mods/contract/api.js';\nimport { writable } from 'svelte/store';",
			}),
		).toEqual([
			'src/lib/u.ts:ModApi -> external:@kokobrain/mod-core',
			'src/lib/u.ts:tick -> external:svelte',
			'src/lib/u.ts:writable -> external:svelte',
		]);
	});

	it('resolves a file next to a same-named folder to the file, and a folder to its index', () => {
		expect(
			resolveTree({
				'src/lib/core/widgets.ts': 'export const w = 1;',
				'src/lib/core/widgets/inner.ts': 'export const i = 1;',
				'src/lib/core/setup/index.ts': 'export function s() {}',
				'src/lib/core/u.ts': "import { w } from './widgets';\nimport { s } from './setup';",
			}),
		).toEqual(['src/lib/core/u.ts:w -> src/lib/core/widgets.ts:w', 'src/lib/core/u.ts:s -> src/lib/core/setup/index.ts:s']);
	});

	it('follows at most 8 re-export hops', () => {
		const chain = (hops: number) => {
			const tree: Record<string, string> = { 'src/lib/core/a0.ts': 'export const x = 1;' };
			for (let i = 1; i <= hops; i++) tree[`src/lib/core/a${i}.ts`] = `export { x } from './a${i - 1}.js';`;
			tree['src/lib/u.ts'] = `import { x } from '#lib/core/a${hops}.js';`;
			return resolveTree(tree);
		};
		expect(chain(8)).toEqual(['src/lib/u.ts:x -> src/lib/core/a0.ts:x']);
		expect(chain(9)).toEqual(['src/lib/u.ts:x -> null']);
	});

	it('maps a local const read off a package import to `external:<pkg>`', () => {
		expect(
			resolveTree({
				'src/lib/components/ui/popover/index.ts':
					"import { Popover as PopoverPrimitive } from 'bits-ui';\nconst Root = PopoverPrimitive.Root;\nexport { Root, Root as Popover };",
				'src/lib/u.ts': "import { Root, Popover } from '#lib/components/ui/popover/index.js';",
			}),
		).toEqual([
			'src/lib/components/ui/popover/index.ts:PopoverPrimitive -> external:bits-ui',
			'src/lib/u.ts:Root -> external:bits-ui',
			'src/lib/u.ts:Popover -> external:bits-ui',
		]);
	});

	it('maps `export default function g` to the export name `default`', () => {
		expect(
			resolveTree({
				'src/lib/core/g.ts': 'export default function g() {}',
				'src/lib/u.ts': "import g from '#lib/core/g.js';\nimport { g as named } from '#lib/core/g.js';",
			}),
		).toEqual(['src/lib/u.ts:g -> src/lib/core/g.ts:g', 'src/lib/u.ts:named -> null']);
	});

	it('keeps a name from `export * as ns` file-level, ahead of a later `export *`', () => {
		expect(
			resolveTree({
				'src/lib/core/y.ts': 'export const a = 1;',
				'src/lib/core/z.ts': 'export const ns = 2;',
				'src/lib/core/index.ts': "export * as ns from './y.js';\nexport * from './z.js';",
				'src/lib/u.ts': "import { ns } from '#lib/core/index.js';",
			}),
		).toEqual(['src/lib/u.ts:ns -> null']);
	});

	it('does not take a function-scoped `await import` destructure for a top-level export', () => {
		expect(
			resolveTree({
				'src/lib/core/m.ts': 'export function x() {}',
				'src/lib/core/a.ts': "export function x() {}\nasync function f() {\n\tconst { x } = await import('./m.js');\n}",
				'src/lib/u.ts': "import { x } from '#lib/core/a.js';",
			}),
		).toEqual(['src/lib/core/a.ts:x -> src/lib/core/m.ts:x', 'src/lib/u.ts:x -> src/lib/core/a.ts:x']);
	});

	it('keeps an instance-script `export function` out of the export table', () => {
		expect(
			resolveTree({
				'src/lib/core/W.svelte': '<script lang="ts">\n\texport function handleKeydown() {}\n</script>',
				'src/lib/u.ts': "import { handleKeydown } from './core/W.svelte';",
			}),
		).toEqual(['src/lib/u.ts:handleKeydown -> null']);
	});

	it('keeps an unknown name or a missing file unresolved and skips namespace imports', () => {
		expect(
			resolveTree({
				'src/lib/core/a.ts': 'export const a = 1;',
				'src/lib/u.ts':
					"import { nope } from '#lib/core/a.js';\nimport { gone } from '#lib/core/gone.js';\nimport * as ns from '#lib/core/a.js';",
			}),
		).toEqual(['src/lib/u.ts:nope -> null', 'src/lib/u.ts:gone -> null']);
	});

	it('records the binding lines: statement line and specifier element line, type-only flags', () => {
		const ts = ["import {", '\tbuildTagIndex,', '\ttype Tag,', "} from './tags.js';", "import type { X } from './x.js';"].join(
			'\n',
		);
		expect(
			extractTsFile('src/lib/u.ts', ts).bindings.map(
				(b: { local: string; imported: string; line: number; specLine: number; typeOnly: boolean; dynamic: boolean }) => [
					b.local,
					b.imported,
					b.line,
					b.specLine,
					b.typeOnly,
					b.dynamic,
				],
			),
		).toEqual([
			['buildTagIndex', 'buildTagIndex', 1, 2, false, false],
			['Tag', 'Tag', 1, 3, true, false],
			['X', 'X', 5, 5, true, false],
		]);
	});

	it('counts binding lines of a .svelte file from the file start', () => {
		const svelte = [
			'<div></div>', // 1
			'',
			'<script lang="ts">', // 3
			'\timport {', // 4
			'\t\ta,',
			'\t\ttype B,', // 6
			"\t} from './a.js';",
			'\tasync function f() {',
			"\t\tconst { x } = await import('./m.js');", // 9
			'\t}',
			'</script>',
		].join('\n');
		expect(
			extractTsFile('src/lib/A.svelte', svelte).bindings.map((b: { local: string; line: number; specLine: number }) => [
				b.local,
				b.line,
				b.specLine,
			]),
		).toEqual([
			['a', 4, 5],
			['B', 4, 6],
			['x', 9, 9],
		]);
	});
});

describe('public and internal symbols', () => {
	const tree: Record<string, string> = {
		'src/lib/features/tags/tags.service.ts': 'export function used() {}\nexport function testOnly() {}\nexport function sameModule() {}',
		'src/lib/features/tags/Tags.svelte': "<script lang=\"ts\">\n\timport { sameModule } from './tags.service.js';\n</script>",
		'src/lib/app/shell.ts': "import { used } from '#lib/features/tags/tags.service.js';",
		'src/tests/lib/features/tags/tags.service.test.ts': "import { testOnly } from '#lib/features/tags/tags.service.js';",
		'src/lib/contracts/generated/T.ts': 'export type T = { a: string };',
		'src/lib/app/types.ts': "import type { T } from '#lib/contracts/generated/T.js';\nimport { tick } from 'svelte';",
	};
	const moduleOf = (f: string) => f.split('/').slice(0, f.startsWith('src/lib/features/') ? 4 : 3).join('/');
	const isTest = (f: string) => f.startsWith('src/tests/') || f.startsWith('e2e/');

	it('marks a symbol imported from another module public, test-only, same-module, DTO and package ones not', () => {
		const files = new Map(Object.keys(tree).map((path) => [path, extractTsFile(path, tree[path])]));
		const resolved = resolveBindings(files);
		expect([...publicIds(resolved, moduleOf, isTest)]).toEqual(['src/lib/features/tags/tags.service.ts:used']);
	});
});

/** Parses an in-memory tree and returns its F3 resolution and F4 use rows. */
function analyze(tree: Record<string, string>) {
	const files = new Map(Object.keys(tree).map((path) => [path, extractTsFile(path, tree[path])]));
	const resolved = resolveBindings(files);
	return { files, resolved, uses: extractUses(files, resolved) };
}

/** F4 rows of a tree as `<file>:<line> in <enclosing> -> <target> <kind>[ markup]` lines. */
function useLines(tree: Record<string, string>) {
	return analyze(tree).uses.map(
		(u: { file: string; line: number; enclosing: string; target: string; kind: string; markup: boolean }) =>
			`${u.file}:${u.line} in ${u.enclosing} -> ${u.target} ${u.kind}${u.markup ? ' markup' : ''}`,
	);
}

/** Whether a fixture path is a test or e2e file. */
const isTest = (f: string) => f.startsWith('src/tests/') || f.startsWith('e2e/');

describe('by lines', () => {
	const moduleOf = (f: string) => f.split('/').slice(0, 4).join('/');

	it('leaves out test and e2e users', () => {
		const { resolved, uses } = analyze({
			'src/lib/utils/d.ts': 'export function d() {}\nexport function onlyTested() {}',
			'src/lib/core/a.ts': "import { d } from '#lib/utils/d.js';\nd();",
			'e2e/a.spec.ts': "import { d, onlyTested } from '#lib/utils/d.js';\nd();\nonlyTested();",
			'src/tests/lib/utils/d.test.ts': "import { d } from '#lib/utils/d.js';\nd();",
		});
		const users = usersBySymbol(resolved, uses, isTest);
		expect(byLines('src/lib/utils/d.ts:d', users.get('src/lib/utils/d.ts:d'), moduleOf)).toEqual([
			'by src/lib/utils/d.ts:d <- src/lib/core/a.ts:2 in (module) call',
		]);
		expect(users.get('src/lib/utils/d.ts:onlyTested')).toBeUndefined();
	});

	it('gives an unused dynamic-import binding the enclosing of its declaration', () => {
		const { resolved, uses } = analyze({
			'src/lib/utils/g.ts': 'export function s() {}',
			'src/lib/core/b.ts': "export async function lazy() {\n\tconst { s } = await import('#lib/utils/g.js');\n}",
		});
		expect(byLines('src/lib/utils/g.ts:s', usersBySymbol(resolved, uses, isTest).get('src/lib/utils/g.ts:s'), moduleOf)).toEqual([
			'by src/lib/utils/g.ts:s <- src/lib/core/b.ts:2 in lazy import',
		]);
	});

	it('counts `+<n>` in sites, so a destructure of two members is one site', () => {
		const { resolved, uses } = analyze({
			'src/lib/core/s.ts': 'export const s = { get a() { return 1; }, get b() { return 2; } };',
			'src/lib/features/x/u.ts': "import { s } from '#lib/core/s.js';\nexport function f() {\n\tconst { a, b } = s;\n\ts.a;\n}",
		});
		expect(byLines('src/lib/core/s.ts:s', usersBySymbol(resolved, uses, isTest).get('src/lib/core/s.ts:s'), moduleOf)).toEqual([
			'by src/lib/core/s.ts:s <- src/lib/features/x/u.ts:3 in f member +1',
		]);
	});

	it('point at the first use site with its enclosing and kind, or at the specifier element of a type-only import', () => {
		const { resolved, uses } = analyze({
			'src/lib/core/tags/tags.service.ts': 'export function buildTagIndex() {}\nexport type Tag = { a: string };\nbuildTagIndex();',
			'src/lib/app/life/life.ts': [
				"import { buildTagIndex } from '#lib/core/tags/tags.service.js';", // 1
				'',
				'export async function initializeVault() {', // 3
				'\tawait buildTagIndex();', // 4
				'\tbuildTagIndex();',
				'}',
				'buildTagIndex();', // 7
			].join('\n'),
			'src/lib/features/t/u.ts': [
				'import {', // 1
				'\tbuildTagIndex,', // 2
				'\ttype Tag,', // 3
				"} from '#lib/core/tags/tags.service.js';",
				'let t: Tag;',
			].join('\n'),
		});
		const users = usersBySymbol(resolved, uses, isTest);
		expect(byLines('src/lib/core/tags/tags.service.ts:buildTagIndex', users.get('src/lib/core/tags/tags.service.ts:buildTagIndex'), moduleOf)).toEqual([
			'by src/lib/core/tags/tags.service.ts:buildTagIndex <- src/lib/app/life/life.ts:4 in initializeVault call +1',
			'by src/lib/core/tags/tags.service.ts:buildTagIndex <- src/lib/features/t/u.ts:2 in (module) import',
		]);
		expect(byLines('src/lib/core/tags/tags.service.ts:Tag', users.get('src/lib/core/tags/tags.service.ts:Tag'), moduleOf)).toEqual([
			'by src/lib/core/tags/tags.service.ts:Tag <- src/lib/features/t/u.ts:3 in (module) import',
		]);
	});

	it('prints `markup` for a markup use and `(script)` for an unused binding of a component script', () => {
		const { resolved, uses } = analyze({
			'src/lib/utils/fmt.ts': 'export function fmt() {}\nexport const unused = 1;',
			'src/lib/features/x/A.svelte': "<script lang=\"ts\">\n\timport { fmt, unused } from '#lib/utils/fmt.js';\n</script>\n<p>{fmt()}</p>",
		});
		const users = usersBySymbol(resolved, uses, isTest);
		expect(byLines('src/lib/utils/fmt.ts:fmt', users.get('src/lib/utils/fmt.ts:fmt'), moduleOf)).toEqual([
			'by src/lib/utils/fmt.ts:fmt <- src/lib/features/x/A.svelte:4 in (markup) markup',
		]);
		expect(byLines('src/lib/utils/fmt.ts:unused', users.get('src/lib/utils/fmt.ts:unused'), moduleOf)).toEqual([
			'by src/lib/utils/fmt.ts:unused <- src/lib/features/x/A.svelte:2 in (script) import',
		]);
	});

	it('caps at 8 lines and ends with a `more` line grouped by module and a `q importers` hint', () => {
		const tree: Record<string, string> = { 'src/lib/utils/d.ts': 'export function d() {}' };
		for (let i = 0; i < 20; i++) {
			const mod = i < 12 ? 'a' : i < 17 ? 'b' : 'c';
			tree[`src/lib/features/${mod}/u${String(i).padStart(2, '0')}.ts`] = "import { d } from '#lib/utils/d.js';\nd();";
		}
		const { resolved, uses } = analyze(tree);
		const lines = byLines('src/lib/utils/d.ts:d', usersBySymbol(resolved, uses, isTest).get('src/lib/utils/d.ts:d'), moduleOf);
		expect(lines).toHaveLength(9);
		expect(lines[0]).toBe('by src/lib/utils/d.ts:d <- src/lib/features/a/u00.ts:2 in (module) call');
		expect(lines[7]).toBe('by src/lib/utils/d.ts:d <- src/lib/features/a/u07.ts:2 in (module) call');
		expect(lines[8]).toBe(
			'more by 12 not shown: src/lib/features/b(5) src/lib/features/a(4) src/lib/features/c(3): q importers src/lib/utils/d.ts:d',
		);
	});

	it('names the extra modules past 8 groups in the `more` line', () => {
		const tree: Record<string, string> = { 'src/lib/utils/d.ts': 'export function d() {}' };
		for (let i = 0; i < 18; i++) tree[`src/lib/features/m${String(i).padStart(2, '0')}/u.ts`] = "import { d } from '#lib/utils/d.js';\nd();";
		const { resolved, uses } = analyze(tree);
		const lines = byLines('src/lib/utils/d.ts:d', usersBySymbol(resolved, uses, isTest).get('src/lib/utils/d.ts:d'), moduleOf);
		expect(lines.at(-1)).toBe(
			'more by 10 not shown: src/lib/features/m08(1) src/lib/features/m09(1) src/lib/features/m10(1) src/lib/features/m11(1) src/lib/features/m12(1) src/lib/features/m13(1) src/lib/features/m14(1) src/lib/features/m15(1) +2 modules: q importers src/lib/utils/d.ts:d',
		);
	});

	it('leaves out the defining file and files with no binding to the symbol', () => {
		const { resolved, uses } = analyze({
			'src/lib/utils/d.ts': 'export function d() {}\nd();',
			'src/lib/utils/e.ts': 'export function d() {}\nd();',
		});
		expect(usersBySymbol(resolved, uses, isTest).get('src/lib/utils/d.ts:d')).toBeUndefined();
	});
});

describe('uses', () => {
	it('records calls, same-file calls, refs, same-file object method calls and dynamic-import bindings', () => {
		expect(
			useLines({
				'src/lib/utils/debounce.ts': 'export function debounce(f: () => void, ms: number) {}\nexport function foo() {}',
				'src/lib/core/m.ts': 'export function x() {}',
				'src/lib/core/u.ts': [
					"import { debounce, foo } from '#lib/utils/debounce.js';", // 1
					'function helper() {}', // 2
					'const Obj = { m() {}, n: () => 1, get g() { return 1; } };', // 3
					'export function run() {', // 4
					'\tfoo();', // 5
					'\thelper();', // 6
					'\tdebounce(helper, 300);', // 7
					'\tObj.m();', // 8
					'\tObj.n();', // 9
					'\tObj.g;', // 10
					'}',
					'export async function lazy() {', // 12
					"\tconst { x } = await import('./m.js');", // 13
					'\tx();', // 14
					'}',
				].join('\n'),
			}),
		).toEqual([
			'src/lib/core/u.ts:5 in run -> src/lib/utils/debounce.ts:foo call',
			'src/lib/core/u.ts:6 in run -> src/lib/core/u.ts:helper call',
			'src/lib/core/u.ts:7 in run -> src/lib/core/u.ts:helper ref',
			'src/lib/core/u.ts:7 in run -> src/lib/utils/debounce.ts:debounce call',
			'src/lib/core/u.ts:8 in run -> src/lib/core/u.ts:Obj.m call',
			'src/lib/core/u.ts:9 in run -> src/lib/core/u.ts:Obj.n call',
			'src/lib/core/u.ts:14 in lazy -> src/lib/core/m.ts:x call',
		]);
	});

	it('reads member, mcall, assign, destructuring and optional-chaining forms of an imported object', () => {
		expect(
			useLines({
				'src/lib/core/s.ts': 'export const s = { get a() { return 1; }, set() {} };',
				'src/lib/core/u.ts': [
					"import { s } from './s.js';", // 1
					'export function f(v: number) {', // 2
					'\ts.a;', // 3
					'\ts.set();', // 4
					'\ts?.a;', // 5
					'\ts.a = v;', // 6
					'\ts.a += 1;', // 7
					'\ts.a++;', // 8
					'\tconst { a, b: c } = s;', // 9
					'\tuse(s);', // 10
					'\ts.set?.();', // 11
					'}',
				].join('\n'),
			}),
		).toEqual([
			'src/lib/core/u.ts:3 in f -> src/lib/core/s.ts:s.a member',
			'src/lib/core/u.ts:4 in f -> src/lib/core/s.ts:s.set mcall',
			'src/lib/core/u.ts:5 in f -> src/lib/core/s.ts:s.a member',
			'src/lib/core/u.ts:6 in f -> src/lib/core/s.ts:s.a assign',
			'src/lib/core/u.ts:7 in f -> src/lib/core/s.ts:s.a assign',
			'src/lib/core/u.ts:8 in f -> src/lib/core/s.ts:s.a assign',
			'src/lib/core/u.ts:9 in f -> src/lib/core/s.ts:s.a member',
			'src/lib/core/u.ts:9 in f -> src/lib/core/s.ts:s.b member',
			'src/lib/core/u.ts:10 in f -> src/lib/core/s.ts:s ref',
			'src/lib/core/u.ts:11 in f -> src/lib/core/s.ts:s.set mcall',
		]);
	});

	it('does not count a parameter, a block declaration, a type position, a property name or an import specifier', () => {
		expect(
			useLines({
				'src/lib/contracts/ipc.ts': 'export function call() {}\nexport type T = string;',
				'src/lib/core/u.ts': [
					"import { call, type T } from '#lib/contracts/ipc.js';", // 1
					'export const cb = (name: string, call: () => unknown) => call();', // 2
					'export function g() {', // 3
					'\tconst call = 1;', // 4
					'\treturn call;',
					'}',
					'export function h() {', // 7
					'\tif (true) {',
					'\t\tfunction call() {}',
					'\t\tcall();',
					'\t}',
					'\tfor (const call of []) call;',
					'\ttry {} catch (call) { call; }',
					'\tconst o = { call: 1 };',
					'\to.call;',
					'\tlet t: T;',
					'\tlet u: typeof call;',
					'\tcall();', // 18
					'}',
					'export { call };',
				].join('\n'),
			}),
		).toEqual(['src/lib/core/u.ts:18 in h -> src/lib/contracts/ipc.ts:call call']);
	});

	it('does not count a name declared in a `switch` case or a `for…in` head', () => {
		expect(
			useLines({
				'src/lib/contracts/ipc.ts': 'export function call() {}',
				'src/lib/core/u.ts': [
					"import { call } from '#lib/contracts/ipc.js';", // 1
					'export function h(k: number) {', // 2
					'\tswitch (k) {',
					'\t\tcase 1:',
					'\t\t\tconst call = 2;',
					'\t\t\treturn call;',
					'\t}',
					'\tfor (const call in {}) call;',
					'\tcall();', // 9
					'}',
				].join('\n'),
			}),
		).toEqual(['src/lib/core/u.ts:9 in h -> src/lib/contracts/ipc.ts:call call']);
	});

	it('keeps a dynamic-import destructure as the binding inside its block and a static import outside it', () => {
		expect(
			useLines({
				'src/lib/core/a.ts': 'export const vaultStore = { get path() { return 1; } };',
				'src/lib/core/b.ts': 'export const vaultStore = { get path() { return 2; } };',
				'src/lib/core/u.ts': [
					"import { vaultStore } from './a.js';", // 1
					'export async function f() {', // 2
					"\tconst { vaultStore } = await import('./b.js');", // 3
					'\tvaultStore.path;', // 4
					'}',
					'export function g() {', // 6
					'\tvaultStore.path;', // 7
					'}',
				].join('\n'),
			}),
		).toEqual([
			'src/lib/core/u.ts:4 in f -> src/lib/core/b.ts:vaultStore.path member',
			'src/lib/core/u.ts:7 in g -> src/lib/core/a.ts:vaultStore.path member',
		]);
	});

	it('records uses of a component script with file lines, and ignores DTO, package and unresolved bindings', () => {
		expect(
			useLines({
				'src/lib/contracts/generated/Tag.ts': 'export type Tag = { a: string };',
				'src/lib/utils/fmt.ts': 'export function fmt() {}',
				'src/lib/features/x/A.svelte': [
					'<script lang="ts">', // 1
					"\timport { fmt } from '#lib/utils/fmt.js';",
					"\timport { tick } from 'svelte';",
					"\timport { Tag, gone } from '#lib/contracts/generated/Tag.js';",
					'\tfmt();', // 5
					'\ttick();',
					'\tgone();',
					'</script>',
				].join('\n'),
			}),
		).toEqual(['src/lib/features/x/A.svelte:5 in (script) -> src/lib/utils/fmt.ts:fmt call']);
	});
});

describe('markup uses', () => {
	it('finds calls and refs inside `{…}` only, outside comments, style, strings and prose', () => {
		expect(
			useLines({
				'src/lib/utils/fmt.ts': 'export function fmt() {}\nexport function toggle() {}',
				'src/lib/features/x/A.svelte': [
					'<script lang="ts">', // 1
					"\timport { fmt, toggle } from '#lib/utils/fmt.js';",
					'\tfunction local() {}',
					'</script>',
					'', // 5
					'<!-- fmt() {fmt()} -->', // 6
					'<p>fmt is a word {fmt(a)}</p>', // 7
					'<button onclick={toggle}>toggle</button>', // 8
					"<span title=\"x {local()} y\">{'fmt'} {\"toggle\"}</span>", // 9
					'<i>{`${fmt(b)} fmt`}</i>', // 10
					'<b>{x.fmt} {$fmt} {fmt_2}</b>', // 11
					'{#if fmt(c)}{/if}', // 12
					'<style>',
					'\t.fmt { color: red; } :global(toggle) {}',
					'</style>',
				].join('\n'),
			}),
		).toEqual([
			'src/lib/features/x/A.svelte:7 in (markup) -> src/lib/utils/fmt.ts:fmt call markup',
			'src/lib/features/x/A.svelte:8 in (markup) -> src/lib/utils/fmt.ts:toggle ref markup',
			'src/lib/features/x/A.svelte:9 in (markup) -> src/lib/features/x/A.svelte:local call markup',
			'src/lib/features/x/A.svelte:10 in (markup) -> src/lib/utils/fmt.ts:fmt call markup',
			'src/lib/features/x/A.svelte:12 in (markup) -> src/lib/utils/fmt.ts:fmt call markup',
		]);
	});

	it('skips `//` and `/* */` comments inside an expression, a quote in them included, and backslash escapes in strings', () => {
		expect(
			useLines({
				'src/lib/utils/fmt.ts': 'export function fmt() {}\nexport function g() {}',
				'src/lib/features/x/A.svelte': [
					'<script lang="ts">', // 1
					"\timport { fmt, g } from '#lib/utils/fmt.js';",
					'</script>',
					'<p onclick={() => {', // 4
					"\t// the menu's handler fmt()",
					'\tg();', // 6
					"\t/* it's fmt() */ g();", // 7
					'}}>a</p>',
					'<p>{fmt()}</p>', // 9
					'<p>{"a\\"fmt()"}</p>', // 10
					"<p>{'http://x'} {fmt()}</p>", // 11
				].join('\n'),
			}),
		).toEqual([
			'src/lib/features/x/A.svelte:6 in (markup) -> src/lib/utils/fmt.ts:g call markup',
			'src/lib/features/x/A.svelte:7 in (markup) -> src/lib/utils/fmt.ts:g call markup',
			'src/lib/features/x/A.svelte:9 in (markup) -> src/lib/utils/fmt.ts:fmt call markup',
			'src/lib/features/x/A.svelte:11 in (markup) -> src/lib/utils/fmt.ts:fmt call markup',
		]);
	});

	it('counts a spread `...B` as a use', () => {
		expect(
			useLines({
				'src/lib/utils/fmt.ts': 'export const LENS = { a: 1 };',
				'src/lib/features/x/A.svelte': [
					'<script lang="ts">', // 1
					"\timport { LENS } from '#lib/utils/fmt.js';",
					'</script>',
					'<C v={{ ...LENS }} />', // 4
				].join('\n'),
			}),
		).toEqual(['src/lib/features/x/A.svelte:4 in (markup) -> src/lib/utils/fmt.ts:LENS ref markup']);
	});

	it('reads store members in markup: get member, do call, do ref', () => {
		expect(
			useLines({
				'src/lib/core/s.svelte.ts': 'export const s = { get x() { return 1; }, setX() {}, close() {} };',
				'src/lib/features/x/A.svelte': [
					'<script lang="ts">', // 1
					"\timport { s } from '#lib/core/s.svelte.js';",
					'</script>',
					'<p>{s.x} {s?.x}</p>', // 4
					'<button onclick={() => s.setX(1)}>a</button>', // 5
					'<button onclick={s.close}>b</button>', // 6
					'<Child store={s} />', // 7
					'<C v={{ ...s.x }} />', // 8
				].join('\n'),
			}),
		).toEqual([
			'src/lib/features/x/A.svelte:4 in (markup) -> src/lib/core/s.svelte.ts:s.x member markup',
			'src/lib/features/x/A.svelte:4 in (markup) -> src/lib/core/s.svelte.ts:s.x member markup',
			'src/lib/features/x/A.svelte:5 in (markup) -> src/lib/core/s.svelte.ts:s.setX mcall markup',
			'src/lib/features/x/A.svelte:6 in (markup) -> src/lib/core/s.svelte.ts:s.close ref markup',
			'src/lib/features/x/A.svelte:7 in (markup) -> src/lib/core/s.svelte.ts:s ref markup',
			'src/lib/features/x/A.svelte:8 in (markup) -> src/lib/core/s.svelte.ts:s.x member markup',
		]);
	});
});

describe('stores', () => {
	const storeFile = [
		'let tabs = $state([]);', // 1
		'let activeIndex = $state(-1);', // 2
		'const count = $derived(tabs.length);', // 3
		'export const s = {', // 4
		'\tget tabs() { return tabs; },', // 5
		'\t/** Index of the focused tab. */',
		'\tget activeIndex() { return activeIndex; },', // 7
		'\tget count() { return count; },', // 8
		'\taddTab(t) { tabs.push(t); },', // 9
		'\tremoveTab(i) { tabs.splice(i, 1); },', // 10
		'\tsetActiveIndex(i) { activeIndex = i; },', // 11
		'\treset: () => { clearAll(); },', // 12
		'\trename(tabs) { tabs.push(1); },', // 13
		'\tclose() {},', // 14
		'};',
		'function clearAll() { tabs[0].content = ""; }',
	].join('\n');

	it('lists members in source order with kind, line, doc and `w-via`', () => {
		const [store] = extractTsFile('src/lib/core/s.svelte.ts', storeFile).stores;
		expect(store.name).toBe('s');
		expect(store.line).toBe(4);
		expect(
			store.members.map((m: { name: string; kind: string; line: number; doc: string; wVia: string[] }) => [
				m.name,
				m.kind,
				m.line,
				m.doc,
				m.wVia,
			]),
		).toEqual([
			['tabs', 'get', 5, '', ['addTab', 'removeTab', 'reset']],
			['activeIndex', 'get', 7, 'Index of the focused tab.', ['setActiveIndex']],
			['count', 'get', 8, '', ['addTab', 'removeTab', 'reset']],
			['addTab', 'do', 9, '', []],
			['removeTab', 'do', 10, '', []],
			['setActiveIndex', 'do', 11, '', []],
			['reset', 'do', 12, '', []],
			['rename', 'do', 13, '', []],
			['close', 'do', 14, '', []],
		]);
	});

	it('detects only exported const object literals with a getter', () => {
		const ts = 'const hidden = { get a() { return 1; } };\nexport const plain = { a: 1 };\nexport let later = { get b() { return 1; } };';
		const out = extractTsFile('src/lib/core/x.ts', ts);
		expect(out.stores).toEqual([]);
		expect(out.symbols.map((x: { name: string; kind: string }) => [x.name, x.kind])).toEqual([
			['plain', 'const'],
			['later', 'const'],
		]);
	});

	it('reads readers, writers and `esc` from script and markup uses', () => {
		const { files, uses } = analyze({
			'src/lib/core/s.svelte.ts': storeFile,
			'src/lib/core/u.ts': [
				"import { s } from './s.svelte.js';", // 1
				'export function f(v: number) {', // 2
				'\ts.tabs;', // 3
				'\ts.addTab(1);', // 4
				'\ts?.activeIndex;', // 5
				'\tconst { tabs, count } = s;', // 6
				'\ts.close = v;', // 7
				'\tuse(s);', // 8
				'}',
			].join('\n'),
			'src/lib/features/x/B.svelte': [
				'<script lang="ts">', // 1
				"\timport { s } from '#lib/core/s.svelte.js';",
				'\t$effect(() => { s.count; });', // 3
				'</script>',
				'<p>{s.tabs.length}</p>', // 5
				'<button onclick={() => s.removeTab(0)}>x</button>', // 6
				'<button onclick={s.close}>y</button>', // 7
			].join('\n'),
		});
		const [store] = collectStores(files, uses, isTest);
		expect(store.id).toBe('src/lib/core/s.svelte.ts:s');
		expect(store.esc).toBe(1);
		const sites = (list: { file: string; line: number; enclosing: string }[]) =>
			list.map((x) => `${x.file}:${x.line} in ${x.enclosing}`);
		const byName = new Map(
			store.members.map((m) => [m.name, { r: sites(m.readers), w: sites(m.writers) }]),
		);
		expect(byName.get('tabs')).toEqual({
			r: ['src/lib/core/u.ts:3 in f', 'src/lib/core/u.ts:6 in f', 'src/lib/features/x/B.svelte:5 in (markup)'],
			w: [],
		});
		expect(byName.get('activeIndex')).toEqual({ r: ['src/lib/core/u.ts:5 in f'], w: [] });
		expect(byName.get('count')).toEqual({
			r: ['src/lib/core/u.ts:6 in f', 'src/lib/features/x/B.svelte:3 in $effect@3'],
			w: [],
		});
		expect(byName.get('addTab')).toEqual({ r: [], w: ['src/lib/core/u.ts:4 in f'] });
		expect(byName.get('removeTab')).toEqual({ r: [], w: ['src/lib/features/x/B.svelte:6 in (markup)'] });
		expect(byName.get('close')).toEqual({
			r: [],
			w: ['src/lib/core/u.ts:7 in f', 'src/lib/features/x/B.svelte:7 in (markup)'],
		});
		expect(byName.get('setActiveIndex')).toEqual({ r: [], w: [] });
	});

	it('counts each file passing the store as a value once in `esc`', () => {
		const { files, uses } = analyze({
			'src/lib/core/s.svelte.ts': 'export const s = { get x() { return 1; } };',
			'src/lib/core/a.ts': "import { s } from './s.svelte.js';\nuse(s);\nother(s);",
			'src/lib/core/b.ts': "import { s } from './s.svelte.js';\ns.x;",
		});
		expect(collectStores(files, uses, isTest)[0].esc).toBe(1);
	});

	it('leaves test and e2e sites out of readers, writers and `esc`', () => {
		const { files, uses } = analyze({
			'src/lib/core/s.svelte.ts': 'export const s = { get x() { return 1; }, setX() {} };',
			'src/tests/lib/core/s.test.ts': "import { s } from '#lib/core/s.svelte.js';\ns.x;\ns.setX();\nuse(s);",
			'e2e/s.spec.ts': "import { s } from '#lib/core/s.svelte.js';\ns.x;\ns.setX();\nuse(s);",
		});
		const [store] = collectStores(files, uses, isTest);
		expect(store.esc).toBe(0);
		expect(store.members.map((m) => [m.name, m.readers.length, m.writers.length])).toEqual([
			['x', 0, 0],
			['setX', 0, 0],
		]);
	});

	it('counts a same-file call of a `do` member as a writer', () => {
		const { files, uses } = analyze({
			'src/lib/core/s.svelte.ts': 'export const s = { get x() { return 1; }, setX() {} };\nexport function f() { s.setX(); }',
		});
		const [store] = collectStores(files, uses, isTest);
		expect(store.members[1].writers).toEqual([
			{ file: 'src/lib/core/s.svelte.ts', line: 2, enclosing: 'f', kind: 'call', markup: false },
		]);
	});

	it('links `w-via` through a local function chain, a local alias of state and a `this` getter', () => {
		const [store] = extractTsFile(
			'src/lib/core/s.svelte.ts',
			[
				'let tabs = $state([]);',
				'let other = $state(0);',
				'export const s = {',
				'\tget tabs() { return tabs; },',
				'\tget first() { return this.tabs[0]; },',
				'\tget other() { return other; },',
				'\tmarkSaved(p) { const tab = tabs.find((t) => t.p === p); if (tab) tab.saved = true; },',
				"\tbyIndex(i) { const t = tabs[i]; t.content = ''; },",
				'\trebind() { let t = tabs.at(0); t = null; },',
				'\tcopy() { const open = tabs.filter(Boolean); open.push(1); },',
				'\tdeep() { a(); },',
				'\tsetOther(v) { other = v; },',
				'};',
				'function a() { b(); }',
				'function b() { tabs.length = 0; }',
			].join('\n'),
		).stores;
		expect(
			store.members.filter((m: { kind: string }) => m.kind === 'get').map((m: { name: string; wVia: string[] }) => [m.name, m.wVia]),
		).toEqual([
			['tabs', ['markSaved', 'byIndex', 'deep']],
			['first', ['markSaved', 'byIndex', 'deep']],
			['other', ['setOther']],
		]);
	});
});

describe('enclosing', () => {
	it('names the nearest declaration, object member, class method, reactive scope or top-level const', () => {
		expect(
			useLines({
				'src/lib/utils/g.ts': 'export function g() {}\nexport function debounce(f: () => void, ms: number) {}',
				'src/lib/core/s.svelte.ts': 'export const s = { get x() { return 1; } };',
				'src/lib/core/u.svelte.ts': [
					"import { g, debounce } from '#lib/utils/g.js';", // 1
					"import { s } from './s.svelte.js';", // 2
					'export function decl() { g(); }', // 3
					'const arrow = () => g();', // 4
					'export const obj = { method() { g(); }, prop: () => g(), get x() { return g(); } };', // 5
					'class K { m() { g(); } }', // 6
					'export function outer() { [1].forEach(() => g()); }', // 7
					'$effect(() => { s.x; });', // 8
					'$effect.pre(() => g());', // 9
					'const y = $derived(s.x);', // 10
					'const t = debounce(() => g(), 300);', // 11
					'g();', // 12
					'const z = $derived.by(() => g());', // 13
					'export const { w } = { w: g() };', // 14
					'function inner() { const nested = () => g(); }', // 15
					'$effect.root(() => g());', // 16
					'const q = [1].map(() => $derived(s.x));', // 17
					'const sat = { a() { g(); } } satisfies object;', // 18
					'function later() { const t2 = debounce(() => g(), 300); }', // 19
				].join('\n'),
			}).filter((l) => l.startsWith('src/lib/core/u.svelte.ts')),
		).toEqual([
			'src/lib/core/u.svelte.ts:3 in decl -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:4 in arrow -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:5 in obj.method -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:5 in obj.prop -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:5 in obj.x -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:6 in K.m -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:7 in outer -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:8 in $effect@8 -> src/lib/core/s.svelte.ts:s.x member',
			'src/lib/core/u.svelte.ts:9 in $effect.pre@9 -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:10 in y=$derived -> src/lib/core/s.svelte.ts:s.x member',
			'src/lib/core/u.svelte.ts:11 in t -> src/lib/utils/g.ts:debounce call',
			'src/lib/core/u.svelte.ts:11 in t -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:12 in (module) -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:13 in z=$derived -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:14 in (module) -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:15 in nested -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:16 in $effect@16 -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:17 in $derived@17 -> src/lib/core/s.svelte.ts:s.x member',
			'src/lib/core/u.svelte.ts:18 in sat.a -> src/lib/utils/g.ts:g call',
			'src/lib/core/u.svelte.ts:19 in later -> src/lib/utils/g.ts:debounce call',
			'src/lib/core/u.svelte.ts:19 in later -> src/lib/utils/g.ts:g call',
		]);
	});

	it('uses `(script)` for a component instance script, `(module)` for its module script and `(markup)` for markup', () => {
		expect(
			useLines({
				'src/lib/utils/g.ts': 'export function g() {}',
				'src/lib/features/x/A.svelte': [
					'<script module lang="ts">', // 1
					"\timport { g } from '#lib/utils/g.js';",
					'\tg();', // 3
					'</script>',
					'<script lang="ts">', // 5
					'\tg();', // 6
					'</script>',
					'<p>{g()}</p>', // 8
				].join('\n'),
			}),
		).toEqual([
			'src/lib/features/x/A.svelte:3 in (module) -> src/lib/utils/g.ts:g call',
			'src/lib/features/x/A.svelte:6 in (script) -> src/lib/utils/g.ts:g call',
			'src/lib/features/x/A.svelte:8 in (markup) -> src/lib/utils/g.ts:g call markup',
		]);
	});
});

/** Parses an in-memory Rust tree into per-file facts. */
function rustTree(tree: Record<string, string>) {
	return new Map(Object.keys(tree).map((path) => [path, extractRustFile(path, tree[path])]));
}

/** Items of one Rust file as `<line> <kind>[ dto] <name><sig> L<span>[ | doc]` lines. */
function rustItems(file: string, text: string) {
	return extractRustFile(file, text).items.map(
		(s: { line: number; kind: string; dto: boolean; name: string; sig: string; span: number; doc: string }) =>
			`${s.line} ${s.kind}${s.dto ? ' dto' : ''} ${s.name}${s.sig} L${s.span}${s.doc ? ` | ${s.doc}` : ''}`,
	);
}

/** Locals of one Rust file as `<line> <name><sig> L<span>` lines. */
function rustLocals(file: string, text: string) {
	return extractRustFile(file, text).locals.map(
		(s: { line: number; name: string; sig: string; span: number }) => `${s.line} ${s.name}${s.sig} L${s.span}`,
	);
}

/** F16 file edges of a Rust tree as `<from>:<line> -> <target> <names>` lines. */
function rustEdgeLines(tree: Record<string, string>) {
	return analyzeRust(rustTree(tree)).edges.map(
		(e: { from: string; line: number; target: string; names: string[] }) =>
			`${e.from}:${e.line} -> ${e.target} ${e.names.join(',')}`,
	);
}

/** F16 and F20 call rows of a Rust tree as `<file>:<line> in <enclosing> -> <target> <kind>` lines. */
function rustCallLines(tree: Record<string, string>) {
	return analyzeRust(rustTree(tree)).calls.map(
		(c: { file: string; line: number; enclosing: string; target: string; kind: string }) =>
			`${c.file}:${c.line} in ${c.enclosing} -> ${c.target} ${c.kind}`,
	);
}

/** Parses an in-memory TS tree and returns its facts, F3 resolution and contracts. */
function tsTree(tree: Record<string, string>) {
	const files = new Map(Object.keys(tree).map((path) => [path, extractTsFile(path, tree[path])]));
	const resolved = resolveBindings(files);
	return { files, resolved, contract: extractContracts(files), sites: extractIpcSites(files, resolved) };
}

/** Module of a fixture path: the feature folder under `src/lib/features`, else the first three segments. */
const fixtureModule = (f: string) => f.split('/').slice(0, f.startsWith('src/lib/features/') ? 4 : 3).join('/');

describe('Rust lexer and items', () => {
	const text = [
		'const S: &str = r#"a { b " }"#;', // 1
		'const M: &str = "multi', // 2
		' { line \\" }";', // 3
		"fn lt<'a>(x: &'a str) -> char { '{' }", // 4
		'/* outer /* inner { */ still } */', // 5
		'/// Doc of Foo.', // 6
		'#[derive(', // 7
		'\tDebug,', // 8
		')]', // 9
		'pub struct Foo {}', // 10
		"pub fn after(b: u8) -> u8 { let c = b'}'; let e = '\\''; b }", // 11
	].join('\n');

	it('blanks comments and string contents, keeps lines, and tells char literals from lifetimes', () => {
		const { code } = lexRust(text);
		expect(code.length).toBe(text.length);
		expect(code.split('\n').length).toBe(text.split('\n').length);
		expect(code.split('\n')[0]).not.toMatch(/[{}]/);
		expect(code.split('\n')[2]).not.toMatch(/[{}]/);
		expect(code.split('\n')[3]).toBe("fn lt<'a>(x: &'a str) -> char { ' ' }");
		expect(code.split('\n')[4].trim()).toBe('');
	});

	it('keeps the brace depth across raw, multi-line and byte strings, chars and nested comments, and the doc across a multi-line attribute', () => {
		expect(rustItems('src-tauri/src/a.rs', text)).toEqual(['10 struct Foo L1 | Doc of Foo.', '11 fn after(b: u8) -> u8 L1']);
		expect(rustLocals('src-tauri/src/a.rs', text)).toEqual(["4 lt(x: &'a str) -> char L1"]);
	});

	it('reads impl methods, restricted visibility, commands, DTOs and locals; trait impl fns only as locals', () => {
		const k = [
			"pub struct Foo<'a> { x: &'a str }", // 1
			"impl Foo<'_> {", // 2
			'\tpub fn baz(&self) -> bool { true }', // 3
			'}',
			"impl Foo<'static> {", // 5
			'\tpub async fn bar() {}', // 6
			'\tfn hidden(&self) {}', // 7
			'}',
			"impl Clone for Foo<'_> {", // 9
			'\tpub fn nope() {}', // 10
			'}',
			'pub(crate) fn inner() {}', // 12
			'fn private_one() {}', // 13
			'#[tauri::command]', // 14
			'pub async fn do_it(path: String) -> Result<(), String> {', // 15
			'\tOk(())',
			'}',
			'#[derive(ts_rs::TS)]', // 18
			'#[ts(export)]',
			'pub struct Dto {}', // 20
		].join('\n');
		expect(rustItems('src-tauri/src/k.rs', k)).toEqual([
			'1 struct Foo L1',
			'3 method Foo::baz(&self) -> bool L1',
			'6 method Foo::bar() L1',
			'12 fn(crate) inner() L1',
			'15 cmd do_it(path: String) -> Result<(), String> L3',
			'20 struct dto Dto L1',
		]);
		expect(rustLocals('src-tauri/src/k.rs', k)).toEqual(['7 Foo::hidden(&self) L1', '10 Foo::nope() L1', '13 private_one() L1']);
	});

	it('keeps one item or local for cfg-gated twins, the first, and drops a local twin of an item', () => {
		const t = [
			'#[cfg(target_os = "macos")]', // 1
			'pub fn f() {}', // 2
			'#[cfg(not(target_os = "macos"))]', // 3
			'pub fn f() {}', // 4
			'#[cfg(unix)]', // 5
			'fn g() {}', // 6
			'#[cfg(not(unix))]', // 7
			'fn g() {}', // 8
			'#[cfg(unix)]', // 9
			'pub fn h() {}', // 10
			'#[cfg(not(unix))]', // 11
			'fn h() {}', // 12
		].join('\n');
		expect(rustItems('src-tauri/src/t.rs', t)).toEqual(['2 fn f() L1', '10 fn h() L1']);
		expect(rustLocals('src-tauri/src/t.rs', t)).toEqual(['6 g() L1']);
	});

	it('keeps a `///` doc across a plain `//` comment before the attributes', () => {
		const t = [
			'/// Writes the text.', // 1
			'// The camelCase args are the IPC contract.', // 2
			'#[allow(non_snake_case)]', // 3
			'#[tauri::command]', // 4
			'pub fn write_task_text() {}', // 5
		].join('\n');
		expect(rustItems('src-tauri/src/t.rs', t)).toEqual(['5 cmd write_task_text() L1 | Writes the text.']);
	});

	it('reads `r#` names, `pub(self)` as a local and `pub(in path)` as `(crate)`', () => {
		const t = ['pub fn r#type() {}', 'pub(self) fn hidden_self() {}', 'pub(in crate::a) fn scoped() {}'].join('\n');
		expect(rustItems('src-tauri/src/t.rs', t)).toEqual(['1 fn r#type() L1', '3 fn(crate) scoped() L1']);
		expect(rustLocals('src-tauri/src/t.rs', t)).toEqual(['2 hidden_self() L1']);
	});

	it('drops `#[cfg(test)]` items: no item, no edge, and marks the file `t:inline`', () => {
		const tree = {
			'src-tauri/src/lib.rs': 'pub mod a;\npub mod x;',
			'src-tauri/src/x.rs': 'pub struct Y;',
			'src-tauri/src/a/mod.rs': 'pub mod b;\npub fn up() {}',
			'src-tauri/src/a/b.rs': [
				'pub fn real() {}', // 1
				'#[cfg(test)]',
				'mod tests {',
				'\tpub fn t() {}',
				'\tuse crate::x::Y;',
				'\tuse super::*;',
				'}',
				'#[cfg(test)]',
				'pub fn helper_for_tests() {}',
			].join('\n'),
		};
		expect(rustItems('src-tauri/src/a/b.rs', tree['src-tauri/src/a/b.rs'])).toEqual(['1 fn real() L1']);
		expect(rustEdgeLines(tree)).toEqual([]);
		expect(extractRustFile('src-tauri/src/a/b.rs', tree['src-tauri/src/a/b.rs']).inlineTests).toBe(true);
		expect(extractRustFile('src-tauri/src/x.rs', tree['src-tauri/src/x.rs']).inlineTests).toBe(false);
	});

	it('resolves `super::` inside an inline `mod m {` against the parent of `m`', () => {
		expect(
			rustEdgeLines({
				'src-tauri/src/lib.rs': 'pub mod a;\npub mod c;',
				'src-tauri/src/c.rs': 'pub struct X;',
				'src-tauri/src/a/c.rs': 'pub struct X;',
				'src-tauri/src/a/mod.rs': 'pub mod c;\nmod m {\n\tuse super::c::X;\n}',
			}),
		).toEqual(['src-tauri/src/a/mod.rs:3 -> src-tauri/src/a/c.rs X']);
	});

	it('reads the file doc from the first `//!` run', () => {
		expect(extractRustFile('src-tauri/src/e.rs', '//! Event names. More.\n//! Second line.\n\npub fn f() {}').fileDoc).toBe(
			'Event names.',
		);
	});
});

describe('Rust uses', () => {
	it('expands nested use trees with aliases and globs', () => {
		expect(parseUseTree('crate::a::{b::{C, D as E}, f::*}')).toEqual(['crate::a::b::C', 'crate::a::b::D as E', 'crate::a::f::*']);
		expect(parseUseTree('crate::a::{self, g}')).toEqual(['crate::a', 'crate::a::g']);
	});

	const tree = {
		'src-tauri/src/lib.rs': 'pub mod a;\npub mod c;',
		'src-tauri/src/a/mod.rs': 'pub mod b;\npub mod x;',
		'src-tauri/src/a/b.rs': ['use super::x::Y;', 'pub fn f() {}', 'pub fn g() { let _ = Y; }'].join('\n'),
		'src-tauri/src/a/x.rs': 'pub struct Y;',
		'src-tauri/src/c.rs': [
			'mod inner;', // 1
			'pub fn run() {', // 2
			'\tcrate::a::b::f();', // 3
			'}',
			'use crate::a::{b::{f as eff, g}, x::*};', // 5
			'pub fn two() { eff(); }', // 6
		].join('\n'),
	};

	it('gives one edge per statement or inline-path line and target; `super::` from `a/b.rs` goes under `a/`; `mod x;` is none', () => {
		expect(rustEdgeLines(tree)).toEqual([
			'src-tauri/src/a/b.rs:1 -> src-tauri/src/a/x.rs Y',
			'src-tauri/src/c.rs:3 -> src-tauri/src/a/b.rs f',
			'src-tauri/src/c.rs:5 -> src-tauri/src/a/b.rs f,g',
			'src-tauri/src/c.rs:5 -> src-tauri/src/a/x.rs *',
		]);
	});

	it('lists item importers for the defining card: first call site, or the use line', () => {
		const { users } = analyzeRust(rustTree(tree));
		const by = (id: string) => byLines(id, users.get(id), fixtureModule);
		expect(by('src-tauri/src/a/b.rs:f')).toEqual([
			'by src-tauri/src/a/b.rs:f <- src-tauri/src/c.rs:3 in run lexical',
		]);
		expect(by('src-tauri/src/a/b.rs:g')).toEqual(['by src-tauri/src/a/b.rs:g <- src-tauri/src/c.rs:5 in (module) import']);
		expect(by('src-tauri/src/a/x.rs:Y')).toEqual(['by src-tauri/src/a/x.rs:Y <- src-tauri/src/a/b.rs:1 in (module) import']);
	});
});

describe('Rust calls', () => {
	it('finds module-alias, type-method, unique-method and same-file calls, not common method names', () => {
		expect(
			rustCallLines({
				'src-tauri/src/lib.rs': 'pub mod commands;\npub mod utils;\npub mod vault;',
				'src-tauri/src/utils/fs.rs': 'pub fn write_atomic() {}',
				'src-tauri/src/vault/entry.rs': [
					'pub struct NoteEntry {}',
					'impl NoteEntry {',
					'\tpub fn from_content_full() -> Self {',
					'\t\tNoteEntry {}',
					'\t}',
					'}',
				].join('\n'),
				'src-tauri/src/vault/index.rs': [
					'pub struct VaultIndex {}', // 1
					'fn top_helper() {}', // 2
					'impl VaultIndex {', // 3
					'\tpub fn update_entry(&mut self) {}', // 4
					'\tpub fn store(&self) {}', // 5
					'\tpub fn is_empty(&self) -> bool { true }', // 6
					'\tfn helper(&self) {}', // 7
					'\tfn other() {}', // 8
					'\tpub fn run(&self) {', // 9
					'\t\tself.helper();', // 10
					'\t\tSelf::other();', // 11
					'\t\ttop_helper();', // 12
					'\t\tself.update_entry();', // 13
					'\t}',
					'\tpub fn dup_name(&self) {}', // 15
					'}',
				].join('\n'),
				'src-tauri/src/utils/other.rs': 'pub fn dup_name() {}',
				'src-tauri/src/commands/vault.rs': [
					'use crate::utils::fs as vault_fs;', // 1
					'use crate::vault::entry::NoteEntry;', // 2
					'pub fn cmd(idx: &mut X) {', // 3
					'\tvault_fs::write_atomic();', // 4
					'\tNoteEntry::from_content_full();', // 5
					'\tidx.update_entry();', // 6
					'\tidx.store();', // 7
					'\tidx.is_empty();', // 8
					'\tidx.dup_name();', // 9
					'}',
				].join('\n'),
			}),
		).toEqual([
			'src-tauri/src/commands/vault.rs:4 in cmd -> src-tauri/src/utils/fs.rs:write_atomic lexical',
			'src-tauri/src/commands/vault.rs:5 in cmd -> src-tauri/src/vault/entry.rs:NoteEntry lexical',
			'src-tauri/src/commands/vault.rs:5 in cmd -> src-tauri/src/vault/entry.rs:NoteEntry::from_content_full lexical',
			'src-tauri/src/commands/vault.rs:6 in cmd -> src-tauri/src/vault/index.rs:VaultIndex::update_entry lexical-method',
			'src-tauri/src/vault/index.rs:10 in VaultIndex::run -> src-tauri/src/vault/index.rs:VaultIndex::helper call',
			'src-tauri/src/vault/index.rs:11 in VaultIndex::run -> src-tauri/src/vault/index.rs:VaultIndex::other call',
			'src-tauri/src/vault/index.rs:12 in VaultIndex::run -> src-tauri/src/vault/index.rs:top_helper call',
			'src-tauri/src/vault/index.rs:13 in VaultIndex::run -> src-tauri/src/vault/index.rs:VaultIndex::update_entry call',
		]);
	});

	it('takes only pub items through a glob, yields to own items, and never counts a `fn name(` definition', () => {
		expect(
			rustCallLines({
				'src-tauri/src/lib.rs': 'pub mod a;\npub mod b;',
				'src-tauri/src/a.rs': 'fn helper() {}\npub fn shared() {}\npub fn other() {}',
				'src-tauri/src/b.rs': [
					'use crate::a::*;', // 1
					'fn helper() {}', // 2
					'fn other() {}', // 3
					'pub fn go() { helper(); shared(); other(); }', // 4
				].join('\n'),
			}),
		).toEqual([
			'src-tauri/src/b.rs:4 in go -> src-tauri/src/a.rs:shared lexical',
			'src-tauri/src/b.rs:4 in go -> src-tauri/src/b.rs:helper call',
			'src-tauri/src/b.rs:4 in go -> src-tauri/src/b.rs:other call',
		]);
	});

	it('names a trait impl fn as the enclosing `Type::name` local', () => {
		const tree = {
			'src-tauri/src/lib.rs': 'pub mod a;\npub mod b;',
			'src-tauri/src/a.rs': 'pub fn bump() {}',
			'src-tauri/src/b.rs': ['use crate::a::bump;', 'pub struct Guard;', 'impl Drop for Guard {', '\tfn drop(&mut self) { bump(); }', '}'].join('\n'),
		};
		expect(rustCallLines(tree)).toEqual(['src-tauri/src/b.rs:4 in Guard::drop -> src-tauri/src/a.rs:bump lexical']);
		expect(rustLocals('src-tauri/src/b.rs', tree['src-tauri/src/b.rs'])).toEqual(['4 Guard::drop(&mut self) L1']);
	});

	it('records a `generate_handler!` entry as an edge, not as a call or a `by` user', () => {
		const { edges, calls, users } = analyzeRust(rustTree(IPC_RUST));
		expect(edges.map((e: { from: string; line: number; target: string; names: string[] }) => `${e.from}:${e.line} -> ${e.target} ${e.names.join(',')}`)).toContain(
			'src-tauri/src/lib.rs:4 -> src-tauri/src/commands/vault.rs get_all_tags_v2',
		);
		expect(calls).toEqual([]);
		expect(users.get('src-tauri/src/commands/vault.rs:get_all_tags_v2')).toBeUndefined();
	});
});

describe('Rust integration tests', () => {
	it('maps a `kokobrain_lib::` use to the source file and keeps test users off `by` lines', () => {
		const tree = {
			'src-tauri/src/lib.rs': 'pub mod vault;',
			'src-tauri/src/vault/index.rs': 'pub struct VaultIndex {}',
			'src-tauri/tests/vault_index_test.rs': [
				'use kokobrain_lib::vault::index::{VaultIndex};',
				'#[test]',
				'fn works() { let _ = VaultIndex::default(); }',
			].join('\n'),
		};
		expect(rustEdgeLines(tree)).toEqual(['src-tauri/tests/vault_index_test.rs:1 -> src-tauri/src/vault/index.rs VaultIndex']);
		expect(analyzeRust(rustTree(tree)).users.get('src-tauri/src/vault/index.rs:VaultIndex')).toBeUndefined();
	});
});

describe('Rust side effects', () => {
	it('finds std and tokio fs writes, db writes, spawns and timers in production text only', () => {
		const files = rustTree({
			'src-tauri/src/x.rs': [
				'use std::fs;', // 1
				'pub fn a(p: &str, conn: &C) {', // 2
				'\tstd::fs::write(p, "x");', // 3
				'\tfs::write(p, "x");', // 4
				'\ttokio::fs::rename(p, p);', // 5
				'\tconn.execute("x", []);', // 6
				'\ttauri::async_runtime::spawn(async {});', // 7
				'\tstd::thread::sleep(d);', // 8
				'\tconn.execute_batch("y");', // 9
				'\tlet f = fs::File::create(p);', // 10
				'}',
				'#[cfg(test)]',
				'mod tests {',
				'\tfn t() { std::fs::write(p, b); }',
				'}',
			].join('\n'),
			'src-tauri/src/y.rs': 'use crate::utils::fs;\npub fn b() { fs::write(p); fs::File::create(p); }',
			'src-tauri/src/z.rs': 'use std::thread::{self, JoinHandle};\npub fn c() { thread::spawn(|| {}); }',
			'src-tauri/src/w.rs': 'use crate::thread;\npub fn d() { thread::spawn(|| {}); }',
		});
		const fx = (f: string) =>
			rustEffects(files.get(f)!).map(
				(s: { file: string; line: number; sink: string; class: string; enclosing: string }) =>
					`${s.file}:${s.line} ${s.sink} ${s.class} in ${s.enclosing}`,
			);
		expect(fx('src-tauri/src/x.rs')).toEqual([
			'src-tauri/src/x.rs:3 rust-fs.write disk-write in a',
			'src-tauri/src/x.rs:4 rust-fs.write disk-write in a',
			'src-tauri/src/x.rs:5 rust-tokio-fs.rename disk-write in a',
			'src-tauri/src/x.rs:6 rust-db.execute db in a',
			'src-tauri/src/x.rs:7 rust-spawn.spawn spawn in a',
			'src-tauri/src/x.rs:8 rust-timer.sleep timer in a',
			'src-tauri/src/x.rs:9 rust-db.execute db in a',
			'src-tauri/src/x.rs:10 rust-fs.File::create disk-write in a',
		]);
		expect(fx('src-tauri/src/y.rs')).toEqual([]);
		expect(fx('src-tauri/src/z.rs')).toEqual(['src-tauri/src/z.rs:2 rust-spawn.spawn spawn in c']);
		expect(fx('src-tauri/src/w.rs')).toEqual([]);
	});
});

/** TS `contracts/ipc.ts` with the `call` and `on` wrappers. */
const IPC_TS = 'export function call(cmd: string, args?: unknown) {}\nexport function on(name: string, h: unknown) {}';

/** Rust side of the IPC fixtures. */
const IPC_RUST = {
	'src-tauri/src/lib.rs': [
		'pub fn run() {', // 1
		'\ttauri::Builder::default()', // 2
		'\t\t.invoke_handler(tauri::generate_handler![', // 3
		'\t\t\tcommands::vault::get_all_tags_v2,', // 4
		'\t\t\tquick_capture::commands::capture_now,', // 5
		'\t\t\ta::b::deep_cmd,', // 6
		'\t\t\tcommands::vault::missing_fn,', // 7
		'\t\t\tx::y::twin_cmd,', // 8
		'\t\t]);',
		'}',
	].join('\n'),
	'src-tauri/src/commands/vault.rs': '#[tauri::command]\npub fn get_all_tags_v2() {}\npub fn missing_fn() {}',
	'src-tauri/src/quick_capture/commands.rs': '#[tauri::command]\npub fn capture_now() {}',
	'src-tauri/src/a/b/mod.rs': '/// Deep.\n#[tauri::command]\npub fn deep_cmd() {}',
	'src-tauri/src/x/y.rs': 'pub fn other() {}',
	'src-tauri/src/x/y/mod.rs': '#[tauri::command]\npub fn twin_cmd() {}',
};

/** TS side of the IPC fixtures. */
const IPC_TS_TREE = {
	'src/lib/contracts/ipc.ts': IPC_TS,
	'src/lib/contracts/commands.ts': [
		'export type NoArgs = Record<never, never>;', // 1
		'export interface CommandMap {', // 2
		'\t/** Tag aggregates, sorted by name. */', // 3
		'\tget_all_tags_v2: { args: NoArgs; result: TagAggregate[] };', // 4
		'\tcapture_now: { args: { path: string; content: string }; result: null };', // 5
		'\tmissing_fn: { args: NoArgs; result: null };', // 6
		'\tonly_ts: { args: NoArgs; result: UpdateResult | null };', // 7
		'\ttwin_cmd: { args: NoArgs; result: null };', // 8
		'}',
		'export const ARG_KEYS = {', // 10
		'\tget_all_tags_v2: [],', // 11
		'};',
	].join('\n'),
	'src/lib/features/x/x.service.ts': [
		"import { call as ipc } from '#lib/contracts/ipc.js';", // 1
		'export async function load(name: string) {', // 2
		"\tawait ipc('get_all_tags_v2');", // 3
		'\tipc();', // 4
		'\tipc(name);', // 5
		'}',
	].join('\n'),
	'src/lib/features/x/y.service.ts': [
		"import { call } from '#lib/contracts/ipc.js';", // 1
		"// call('in_comment');", // 2
		'export function shadow(call: (s: string) => void) {', // 3
		"\tcall('shadowed');", // 4
		'}',
		"export const later = () => call('missing_fn');", // 6
	].join('\n'),
	'e2e/mocks/tauri-core.ts': "const handlers = {\n\tget_all_tags_v2: () => [],\n\t'capture_now': () => null,\n};",
	'src/tests/lib/x.test.ts': "import { call } from '#lib/contracts/ipc.js';\nconst t = { get_all_tags_v2: 1 };\ncall('only_ts');",
	'src/routes/+page.ts': 'export const load = () => ({\n\tcapture_now: true,\n});',
};

/** Joins the IPC fixtures into command records. */
function ipcFixture() {
	const rust = rustTree(IPC_RUST);
	const { files, contract, sites } = tsTree(IPC_TS_TREE);
	const names = new Set<string>([
		...handlerEntries(rust.get('src-tauri/src/lib.rs')).map((h: { command: string }) => h.command),
		...contract.commands.map((c: { name: string }) => c.name),
	]);
	const calls = sites.calls.filter((c: { file: string }) => !isTest(c.file));
	return joinCommands(handlerEntries(rust.get('src-tauri/src/lib.rs')), rust, contract, calls, keySites(files, names));
}

describe('IPC callers', () => {
	it('finds aliased `call` sites with a literal first argument, not comments, no-argument, non-literal or shadowed ones', () => {
		const { sites } = tsTree(IPC_TS_TREE);
		expect(
			sites.calls.map(
				(c: { file: string; line: number; enclosing: string; command: string }) =>
					`${c.file}:${c.line} in ${c.enclosing} -> ${c.command}`,
			),
		).toEqual([
			'src/lib/features/x/x.service.ts:3 in load -> get_all_tags_v2',
			'src/lib/features/x/y.service.ts:6 in later -> missing_fn',
			'src/tests/lib/x.test.ts:3 in (module) -> only_ts',
		]);
	});

	it('writes the same `ipc-call` text on the TS card and on the Rust card', () => {
		const lines = crossLanguageLines(ipcFixture(), []);
		const text = 'ipc-call src/lib/features/x/x.service.ts:3 in load -> ipc:get_all_tags_v2 -> src-tauri/src/commands/vault.rs:2';
		expect(lines.get('src/lib/features/x/x.service.ts')).toEqual([{ line: 3, text }]);
		expect(lines.get('src-tauri/src/commands/vault.rs')).toEqual([{ line: 2, text }]);
		expect(lines.get('src/lib/features/x/y.service.ts')).toEqual([
			{ line: 6, text: 'ipc-call src/lib/features/x/y.service.ts:6 in later -> ipc:missing_fn -> !no-rust-fn' },
		]);
	});
});

describe('IPC join', () => {
	it('maps handler paths to files, flags missing Rust fns and contracts, and lists key sites in src/lib and e2e', () => {
		expect(ipcFixture().map((c) => ipcLine(c, fixtureModule))).toEqual([
			'ipc ipc:capture_now | args path,content -> null | rust src-tauri/src/quick_capture/commands.rs:2 | reg src-tauri/src/lib.rs:5 | keys e2e/mocks/tauri-core.ts:3 src/lib/contracts/commands.ts:5 src/routes/+page.ts:2 | callers -',
			'ipc ipc:deep_cmd | args !no-contract | rust src-tauri/src/a/b/mod.rs:3 | reg src-tauri/src/lib.rs:6 | keys - | callers -',
			'ipc ipc:get_all_tags_v2 | args - -> TagAggregate[] | rust src-tauri/src/commands/vault.rs:2 | reg src-tauri/src/lib.rs:4 | keys e2e/mocks/tauri-core.ts:2 src/lib/contracts/commands.ts:4 src/lib/contracts/commands.ts:11 | callers src/lib/features/x/x.service.ts:3 in load | doc Tag aggregates, sorted by name.',
			'ipc ipc:missing_fn | args - -> null | rust !no-rust-fn | reg src-tauri/src/lib.rs:7 | keys src/lib/contracts/commands.ts:6 | callers src/lib/features/x/y.service.ts:6 in later',
			'ipc ipc:only_ts | args - -> UpdateResult / null | rust !no-rust-fn | reg - | keys src/lib/contracts/commands.ts:7 | callers -',
			'ipc ipc:twin_cmd | args - -> null | rust !no-rust-fn | reg src-tauri/src/lib.rs:8 | keys src/lib/contracts/commands.ts:8 | callers -',
		]);
	});

	it('caps the callers list at 8 with a `more` hint', () => {
		const callers = Array.from({ length: 9 }, (_, i) => ({ file: `src/lib/features/f${i < 8 ? 'a' : 'b'}/s.ts`, line: i + 1, enclosing: 'go' }));
		const line = ipcLine({ name: 'c', rust: null, reg: null, contract: null, keys: [], callers }, fixtureModule);
		expect(line).toContain('callers src/lib/features/fa/s.ts:1 in go, ');
		expect(line).toContain('src/lib/features/fa/s.ts:8 in go, more callers 1 not shown: src/lib/features/fb(1): q callers ipc:c');
		expect(line).not.toContain('s.ts:9');
	});
});

describe('events', () => {
	const rust = rustTree({
		'src-tauri/src/events.rs': [
			'//! Event names.', // 1
			'',
			'/// Emitted after a change. More text.', // 3
			'pub const X_EVENT: &str = "x-happened";', // 4
			'pub const Y_EVENT: &str = "y-happened";', // 5
		].join('\n'),
		'src-tauri/src/lib.rs': [
			'mod events;', // 1
			'use events::{', // 2
			'\tX_EVENT,', // 3
			'\tY_EVENT,', // 4
			'};',
			'pub fn run(app: App) {', // 6
			'\tlet _ = app.emit_to(LABEL,', // 7
			'\t\tX_EVENT, ());', // 8
			'\t// app.emit(X_EVENT, ());', // 9
			'\tlet s = "app.emit(X_EVENT)";', // 10
			'\tfoo(X_EVENT);', // 11
			'\tapp.emit(Y_EVENT, 1);', // 12
			'}',
		].join('\n'),
		'src-tauri/src/other.rs': [
			'use crate::events::X_EVENT;', // 1
			'pub fn go(app: App) {', // 2
			'\tapp.emit(crate::events::Y_EVENT, 2);', // 3
			'\tapp.emit(X_EVENT, 3);', // 4
			'}',
		].join('\n'),
	});
	const ts = tsTree({
		'src/lib/contracts/ipc.ts': IPC_TS,
		'src/lib/contracts/events.ts': [
			'export const EVENT_NAMES = {', // 1
			"\tX: 'x-happened',", // 2
			"\tY: 'y-happened',", // 3
			'} as const;',
			'export interface EventMap {', // 5
			"\t'x-happened': UpdateResult;",
			"\t'y-happened': number | null;",
			'}',
		].join('\n'),
		'src/lib/app/listeners.ts': [
			"import { on } from '#lib/contracts/ipc.js';", // 1
			"import { EVENT_NAMES } from '#lib/contracts/events.js';", // 2
			'export function listenX() {', // 3
			'\tvoid on(EVENT_NAMES.X, () => {});', // 4
			'}',
		].join('\n'),
	});
	const consts = eventConsts(rust.get('src-tauri/src/events.rs'));
	const events = joinEvents(consts, ts.contract, rustEmits(rust, consts), ts.sites.listens);

	it('counts a multi-line `emit_to` and a qualified const with their enclosing fn, not a `use`, a comment, a string or a non-emit call', () => {
		expect(
			rustEmits(rust, consts).map(
				(e: { file: string; line: number; enclosing: string; constName: string }) => `${e.file}:${e.line} in ${e.enclosing} ${e.constName}`,
			),
		).toEqual([
			'src-tauri/src/lib.rs:8 in run X_EVENT',
			'src-tauri/src/lib.rs:12 in run Y_EVENT',
			'src-tauri/src/other.rs:3 in go Y_EVENT',
			'src-tauri/src/other.rs:4 in go X_EVENT',
		]);
	});

	it('maps `on(EVENT_NAMES.K, …)` through the key value and renders the event lines', () => {
		expect(events.map((e) => eventLine(e, fixtureModule))).toEqual([
			'event event:x-happened | const X_EVENT src-tauri/src/events.rs:4 | ts EVENT_NAMES.X src/lib/contracts/events.ts:2 | payload UpdateResult | emits src-tauri/src/lib.rs:8 in run, src-tauri/src/other.rs:4 in go | listens src/lib/app/listeners.ts:4 in listenX | doc Emitted after a change.',
			'event event:y-happened | const Y_EVENT src-tauri/src/events.rs:5 | ts EVENT_NAMES.Y src/lib/contracts/events.ts:3 | payload number / null | emits src-tauri/src/lib.rs:12 in run, src-tauri/src/other.rs:3 in go | listens -',
		]);
	});

	it('writes the same `ev` text on the Rust card and on the TS card', () => {
		const lines = crossLanguageLines([], events);
		const text = 'ev src-tauri/src/lib.rs:8 in run -> event:x-happened -> src/lib/app/listeners.ts:4 in listenX';
		expect(lines.get('src-tauri/src/lib.rs')).toEqual([{ line: 8, text }]);
		expect(lines.get('src/lib/app/listeners.ts')).toEqual([
			{ line: 4, text },
			{ line: 4, text: 'ev src-tauri/src/other.rs:4 in go -> event:x-happened -> src/lib/app/listeners.ts:4 in listenX' },
		]);
	});
});

describe('DTOs', () => {
	it('lists returned-by, arg-of, contains, in, used-by modules with re-exports and aliases, and e2e import locations', () => {
		const rust = rustTree({
			'src-tauri/src/vault/task.rs': [
				'/// Tag rows. Second.', // 1
				'#[derive(ts_rs::TS)]',
				'#[ts(export)]',
				'pub struct TagAggregate {}', // 4
				'#[derive(ts_rs::TS)]',
				'#[ts(export)]',
				'pub struct Task {}', // 7
				'#[ts(export)]',
				'pub enum Orphan { A }', // 9
			].join('\n'),
		});
		const tree = {
			'src/lib/contracts/generated/TagAggregate.ts': 'import type { Task } from "./Task";\nexport type TagAggregate = { t: Task };',
			'src/lib/contracts/generated/Task.ts': 'export type Task = {};',
			'src/lib/contracts/index.ts': "export type { TagAggregate } from './generated/TagAggregate.js';\nexport * from './generated/Task.js';",
			'src/lib/types/v2.types.ts': "export type { TagAggregate as TagAggregateV2, Task } from '#lib/contracts/index.js';",
			'src/lib/contracts/commands.ts': [
				"import type { TagAggregate } from './index.js';",
				'export type NoArgs = Record<never, never>;',
				'export interface CommandMap {',
				'\tget_all_tags_v2: { args: NoArgs; result: TagAggregate[] };',
				'\tset_tags: { args: { tags: TagAggregate[] }; result: null };',
				'\tset_x: { args: { x: TagAggregateX }; result: null };',
				'}',
			].join('\n'),
			'src/lib/features/tags/t.ts': "import type { TagAggregate as TA } from '#lib/contracts/index.js';",
			'e2e/mocks/vault-index.ts': "import type {\n\tTagAggregate,\n} from '../../src/lib/contracts/index';",
			'src/tests/lib/x.test.ts': "import type { TagAggregate } from '#lib/contracts/index.js';",
		};
		const { files, resolved, contract } = tsTree(tree);
		const dtos = joinDtos(rust, Object.keys(tree), contract, resolved, resolveReexports(files), isTest, fixtureModule);
		expect(dtos.map((d) => dtoLine(d))).toEqual([
			'dto dto:Orphan | rust src-tauri/src/vault/task.rs:9 | ts !no-ts | returned-by - | arg-of - | contains - | in - | used-by - | e2e -',
			'dto dto:TagAggregate | rust src-tauri/src/vault/task.rs:4 | ts src/lib/contracts/generated/TagAggregate.ts | returned-by ipc:get_all_tags_v2 | arg-of ipc:set_tags | contains dto:Task | in - | used-by src/lib/contracts(2) src/lib/features/tags(1) src/lib/types(1) | e2e e2e/mocks/vault-index.ts:2 | doc Tag rows.',
			'dto dto:Task | rust src-tauri/src/vault/task.rs:7 | ts src/lib/contracts/generated/Task.ts | returned-by - | arg-of - | contains - | in dto:TagAggregate | used-by src/lib/contracts(1) src/lib/types(1) | e2e -',
		]);
	});
});

/** Parses an in-memory TS tree into per-file facts. */
function tsFacts(tree: Record<string, string>) {
	return new Map(Object.keys(tree).map((path) => [path, extractTsFile(path, tree[path])]));
}

describe('test mapping', () => {
	it('maps imports, mocks, e2e and mirror rows; mocks wins, type imports and package mocks give none', () => {
		const files = tsFacts({
			'src/lib/core/x/x.service.ts': 'export function a() {}',
			'src/lib/core/x/x.logic.ts': 'export function b() {}',
			'src/lib/core/x/x.types.ts': 'export type T = 1;',
			'src/lib/core/x/x.store.svelte.ts': 'export const s = { get v() { return 1; } };',
			'src/lib/core/y.ts': 'export const y = 1;',
			'src/tests/lib/core/x/x.service.test.ts': [
				"import { vi } from 'vitest';",
				"import { a } from '#lib/core/x/x.service.js';",
				"import { b } from '#lib/core/x/x.logic.js';",
				"import type { T } from '#lib/core/x/x.types.js';",
				'vi.mock(',
				"\t'#lib/core/x/x.logic.js',",
				'\t() => ({}),',
				');',
				"vi.mock('@tauri-apps/plugin-fs');",
				"vi.doMock('../../../../lib/core/y.js');",
			].join('\n'),
			'src/tests/lib/core/x/other.test.ts': "import { a } from '#lib/core/x/x.service.js';",
			'src/tests/lib/core/x/x.service-parity.test.ts': "import { a } from '#lib/core/x/x.service.js';",
			'src/tests/lib/core/x/x.servicex.test.ts': "import { a } from '#lib/core/x/x.service.js';",
			'src/tests/lib/core/x.service.test.ts': "import { a } from '#lib/core/x/x.service.js';",
			'src/tests/lib/core/x/x.store.test.ts': "const { s } = await import('#lib/core/x/x.store.svelte.js');",
			'e2e/mocks/m.ts': "import { a } from '../../src/lib/core/x/x.service';\nimport type { T } from '../../src/lib/core/x/x.types';",
		});
		expect(
			testRelations(files).map(
				(r: { test: string; relation: string; target: string; mirror: boolean }) =>
					`test ${r.test} ${r.relation} ${r.target}${r.mirror ? ' mirror' : ''}`,
			),
		).toEqual([
			'test src/tests/lib/core/x/x.service.test.ts mocks src/lib/core/x/x.logic.ts',
			'test src/tests/lib/core/x/x.service-parity.test.ts imports src/lib/core/x/x.service.ts mirror',
			'test src/tests/lib/core/x/x.service.test.ts imports src/lib/core/x/x.service.ts mirror',
			'test e2e/mocks/m.ts e2e src/lib/core/x/x.service.ts',
			'test src/tests/lib/core/x.service.test.ts imports src/lib/core/x/x.service.ts',
			'test src/tests/lib/core/x/other.test.ts imports src/lib/core/x/x.service.ts',
			'test src/tests/lib/core/x/x.servicex.test.ts imports src/lib/core/x/x.service.ts',
			'test src/tests/lib/core/x/x.store.test.ts imports src/lib/core/x/x.store.svelte.ts mirror',
			'test src/tests/lib/core/x/x.service.test.ts mocks src/lib/core/y.ts',
		]);
	});
});

/** A registry as wiring-like lines, for compact assertions. */
function registryLines(r: {
	id: string;
	kind: string;
	file: string;
	line: number;
	stores: { binding: string; mutation: string }[];
	readBy: { id: string; file: string; line: number }[];
	firedBy: { via: string; chain: { file: string; line: number; enclosing: string }[] }[];
	registeredAt: { file: string; line: number; enclosing: string; args: string; callbacks: string[] }[];
	invokedAt: { file: string; line: number; enclosing: string; via: string }[];
}) {
	const hop = (h: { file: string; line: number; enclosing: string }) => `${h.file}:${h.line} in ${h.enclosing}`;
	return [
		`${r.kind} ${r.id} ${r.file}:${r.line}${r.stores.map((s) => ` ${s.binding} ${s.mutation}`).join('')}`,
		...r.readBy.map((x) => `read-by ${x.file}:${x.line} ${x.id}`),
		...r.firedBy.map((f) => `fired-by ${f.chain.map(hop).join(' <- ')} via ${f.via}`),
		...r.registeredAt.map((x) => `registered-at ${hop(x)} args=${x.args} -> ${x.callbacks.join(',')}`),
		...r.invokedAt.map((x) => `invoked-at ${hop(x)} via ${x.via}`),
	];
}

/** Registries of an in-memory tree as `registryLines`. */
function registriesOf(tree: Record<string, string>) {
	const { files, uses } = analyze(tree);
	return collectRegistries(files, uses, isTest).map(registryLines);
}

describe('registries', () => {
	const tree: Record<string, string> = {
		'src/lib/core/h/hooks.ts': [
			'const observers: Array<() => void> = [];', // 1
			'let list: Array<() => void> = [];', // 2
			'const cache = new Map();', // 3
			'export function addObserver(o: () => void) {', // 4
			'\tobservers.push(o);',
			'\treturn () => {',
			'\t\tobservers.splice(observers.indexOf(o), 1);',
			'\t};',
			'}',
			'export function addToList(x: () => void) {', // 10
			'\tlist = [...list, x];',
			'\treturn () => {',
			'\t\tlist = list.filter((y) => y !== x);',
			'\t};',
			'}',
			'export function cacheSet(k: string, v: number) { cache.set(k, v); }', // 16
			'export function viaCall(o: () => void) { observers.push(o); return make(); }', // 17
			'export function nested(o: () => void) { observers.push(o); function inner() { return () => {}; } return inner; }', // 18
			'export function notify() { for (const o of observers) o(); }', // 19
			'export function reset() { observers.length = 0; }', // 20
			'function notifyList() { for (const x of list) x(); }', // 21
			'async function handle() {', // 22
			'\tnotifyList();', // 23
			'}',
			'export function start() {', // 25
			'\t[1].forEach(() => void handle());', // 26
			'}',
			'export function shadowed(observers: unknown[]) { observers.push(1); return () => {}; }', // 28
			'function make() { return () => {}; }', // 29
		].join('\n'),
		'src/lib/core/editor/save.ts': [
			"import { notify } from '#lib/core/h/hooks.js';", // 1
			'function writeTab() {', // 2
			'\tnotify();', // 3
			'\tnotify();', // 4
			'}',
			'export function saveFileByPath() {', // 6
			'\twriteTab();', // 7
			'}',
		].join('\n'),
		'src/lib/features/rail/rail.store.svelte.ts': [
			'let navs = $state<string[]>([]);', // 1
			'export const railStore = {', // 2
			'\tget navigators() { return navs; },', // 3
			'\tregisterNavigator(n: string) {', // 4
			'\t\tnavs = [...navs, n];',
			'\t\treturn () => { navs = navs.filter((x) => x !== n); };',
			'\t},',
			'};',
		].join('\n'),
		'src/lib/app/Shell.svelte': [
			'<script lang="ts">', // 1
			"\timport { railStore } from '#lib/features/rail/rail.store.svelte.js';",
			'</script>',
			'{#each railStore.navigators as n}{n}{/each}', // 4
		].join('\n'),
		'src/lib/features/search/search.service.ts': [
			"import { addObserver, addToList } from '#lib/core/h/hooks.js';", // 1
			"import { railStore } from '#lib/features/rail/rail.store.svelte.js';", // 2
			'function onSaved(p: string) {}', // 3
			'function other() {}', // 4
			"const nav = 'n';", // 5
			'export function registerSearchHook() {', // 6
			'\treturn addObserver(onSaved);', // 7
			'}',
			'export function registerObj() {', // 9
			"\taddToList({ name: 'x', pathChanged: onSaved, other });", // 10
			'}',
			'export function registerInline() {', // 12
			'\taddObserver((p) => {', // 13
			'\t\tonSaved(p);',
			'\t});',
			'}',
			'railStore.registerNavigator(nav);', // 17
			'export function registerCommented() {', // 18
			'\taddToList({', // 19
			'\t\t// The handler.',
			'\t\tpathChanged: /* on save */ onSaved,',
			'\t});',
			'}',
		].join('\n'),
		'src/lib/app/lifecycle.ts': [
			"import { registerSearchHook } from '#lib/features/search/search.service.js';", // 1
			'export function initializeVault() {', // 2
			'\tregisterSearchHook();', // 3
			'}',
		].join('\n'),
		'src/tests/lib/core/h/hooks.test.ts': "import { addObserver, notify } from '#lib/core/h/hooks.js';\naddObserver(() => {});\nnotify();",
	};

	it('finds sinks by a returned function plus a module-level registration, with read-by, fired-by, registered-at and invoked-at', () => {
		expect(registriesOf(tree)).toEqual([
			[
				'sink src/lib/core/h/hooks.ts:addObserver src/lib/core/h/hooks.ts:4 observers push',
				'read-by src/lib/core/h/hooks.ts:19 src/lib/core/h/hooks.ts:notify',
				'fired-by src/lib/core/editor/save.ts:3 in writeTab <- src/lib/core/editor/save.ts:7 in saveFileByPath via src/lib/core/h/hooks.ts:notify',
				'registered-at src/lib/features/search/search.service.ts:7 in registerSearchHook args=onSaved -> src/lib/features/search/search.service.ts:onSaved',
				'registered-at src/lib/features/search/search.service.ts:13 in registerInline args=(p) => { onSaved(p); } -> src/lib/features/search/search.service.ts:registerInline',
				'invoked-at src/lib/app/lifecycle.ts:3 in initializeVault via src/lib/features/search/search.service.ts:registerSearchHook',
			],
			[
				'sink src/lib/core/h/hooks.ts:addToList src/lib/core/h/hooks.ts:10 list assign',
				'read-by src/lib/core/h/hooks.ts:21 src/lib/core/h/hooks.ts:notifyList',
				'fired-by src/lib/core/h/hooks.ts:23 in handle <- src/lib/core/h/hooks.ts:26 in start via src/lib/core/h/hooks.ts:notifyList',
				"registered-at src/lib/features/search/search.service.ts:10 in registerObj args={ name: 'x', pathChanged: onSaved, other } -> src/lib/features/search/search.service.ts:onSaved,src/lib/features/search/search.service.ts:other",
				'registered-at src/lib/features/search/search.service.ts:19 in registerCommented args={ pathChanged: onSaved, } -> src/lib/features/search/search.service.ts:onSaved',
			],
			[
				'sink src/lib/features/rail/rail.store.svelte.ts:railStore.registerNavigator src/lib/features/rail/rail.store.svelte.ts:4 navs assign',
				'read-by src/lib/features/rail/rail.store.svelte.ts:3 src/lib/features/rail/rail.store.svelte.ts:railStore.navigators',
				'fired-by src/lib/app/Shell.svelte:4 in (markup) via src/lib/features/rail/rail.store.svelte.ts:railStore.navigators',
				'registered-at src/lib/features/search/search.service.ts:17 in (module) args=nav -> src/lib/features/search/search.service.ts:(module)',
			],
		]);
	});

	it('finds a facet by `Facet.define` and its `.of(…)` registrations', () => {
		expect(
			registriesOf({
				'src/lib/core/md/editor-host.ts': "import { Facet } from '@codemirror/state';\nexport const editorHost = Facet.define<H, H>({ combine: (v) => v[0] });",
				'src/lib/app/editor.ts': [
					"import { editorHost } from '#lib/core/md/editor-host.js';", // 1
					'function makeHost() { return {}; }', // 2
					'export function extensions() {', // 3
					'\treturn [editorHost.of(makeHost())];', // 4
					'}',
				].join('\n'),
			}),
		).toEqual([
			[
				'facet src/lib/core/md/editor-host.ts:editorHost src/lib/core/md/editor-host.ts:2',
				'registered-at src/lib/app/editor.ts:4 in extensions args=makeHost() -> src/lib/app/editor.ts:extensions',
			],
		]);
	});
});

/** F15 TS sites of an in-memory tree as `<loc> <sink> <class>[ <arg>] in <enclosing>` lines. */
function effectLines(tree: Record<string, string>) {
	const { files, uses } = analyze(tree);
	return tsEffects(files, uses, isTest).map(
		(s: { file: string; line: number; sink: string; class: string; arg: string; enclosing: string }) =>
			`${s.file}:${s.line} ${s.sink} ${s.class}${s.arg ? ` ${s.arg}` : ''} in ${s.enclosing}`,
	);
}

describe('F15 Tauri sites', () => {
	it('classes named, aliased, namespace and dynamic calls; shadowed and same-named local functions are no sinks', () => {
		expect(
			effectLines({
				'src/lib/core/f/f.service.ts': [
					"import { writeTextFile, exists as fileExists } from '@tauri-apps/plugin-fs';", // 1
					"import * as fs from '@tauri-apps/plugin-fs';", // 2
					"import { ask } from '@tauri-apps/plugin-dialog';", // 3
					"import { invoke } from '@tauri-apps/api/core';", // 4
					'export async function save(p: string) {', // 5
					"\tawait writeTextFile(p, 'x');", // 6
					"\tawait fs.writeTextFile(p, 'y');", // 7
					'\tawait fileExists(p);', // 8
					"\tawait ask('sure?');", // 9
					"\tawait invoke('x');", // 10
					'}',
					'export function shadow(writeTextFile: (p: string) => void) { writeTextFile("z"); }', // 12
					'export async function lazy() {', // 13
					"\tconst { open } = await import('@tauri-apps/plugin-dialog');", // 14
					'\tawait open();', // 15
					'}',
					"export const both = (f: boolean) => (f ? invoke('a') : invoke('b'));", // 17
				].join('\n'),
				'src/lib/core/f/g.ts': 'function writeTextFile(p: string) {}\nexport function g() { writeTextFile("a"); }',
				'src/tests/lib/core/f/f.test.ts': "import { writeTextFile } from '@tauri-apps/plugin-fs';\nwriteTextFile('t', 'u');",
			}),
		).toEqual([
			'src/lib/core/f/f.service.ts:6 tauri-fs.writeTextFile disk-write in save',
			'src/lib/core/f/f.service.ts:7 tauri-fs.writeTextFile disk-write in save',
			'src/lib/core/f/f.service.ts:8 tauri-fs.exists disk-read in save',
			'src/lib/core/f/f.service.ts:9 tauri-dialog.ask host in save',
			'src/lib/core/f/f.service.ts:10 tauri-api-core.invoke host in save',
			'src/lib/core/f/f.service.ts:15 tauri-dialog.open host in lazy',
			'src/lib/core/f/f.service.ts:17 tauri-api-core.invoke host in both',
		]);
	});

	it('finds Tauri calls and global timers inside markup expressions', () => {
		expect(
			effectLines({
				'src/lib/core/f/U.svelte': [
					'<script lang="ts">', // 1
					"\timport { openUrl } from '@tauri-apps/plugin-opener';",
					"\timport * as fs from '@tauri-apps/plugin-fs';",
					'\tfunction requestIdleCallback() {}',
					'</script>', // 5
					"<button onclick={() => openUrl('x')}>a</button>", // 6
					"<button onclick={() => fs.exists('y')}>b</button>", // 7
					"<p>openUrl('z') queueMicrotask(h)</p>", // 8
					'{queueMicrotask(() => {})}', // 9
					'<i onclick={() => setTimeout(h, /* soon */ 5)}></i>', // 10
					'<i onclick={() => window.setInterval(h, 9)}></i>', // 11
					'<i onclick={() => requestIdleCallback()}></i>', // 12
					'<i onclick={() => x.openUrl()}></i>', // 13
					"<!-- {openUrl('c')} -->", // 14
				].join('\n'),
			}),
		).toEqual([
			'src/lib/core/f/U.svelte:6 tauri-opener.openUrl host in (markup)',
			'src/lib/core/f/U.svelte:7 tauri-fs.exists disk-read in (markup)',
			'src/lib/core/f/U.svelte:9 timer.queueMicrotask timer in (markup)',
			'src/lib/core/f/U.svelte:10 timer.setTimeout timer delay=5 in (markup)',
			'src/lib/core/f/U.svelte:11 timer.setInterval timer delay=9 in (markup)',
		]);
	});
});

describe('F15 timers, reactive effects and DOM listeners', () => {
	it('finds global timers with their delay, $effect sites and literal DOM listeners, in script and markup', () => {
		expect(
			effectLines({
				'src/lib/utils/timers.ts': 'export function setTimeout(f: () => void) {}',
				'src/lib/core/t/t.svelte.ts': [
					'export function a(f: () => void, el: HTMLElement, name: string) {', // 1
					'\tsetTimeout(f, 300 * /* ms */ 1);', // 2
					'\twindow.setTimeout(f, 1_000);', // 3
					'\tglobalThis.setInterval(f,\n\t\tDELAY * 2);', // 4
					'\trequestAnimationFrame(f);', // 6
					'\tqueueMicrotask(f);', // 7
					"\tel.addEventListener('keydown', f);", // 8
					'\tdocument.body.addEventListener(name, f);', // 9
					'\tclearTimeout(0);', // 10
					'}',
					'$effect(() => {});', // 12
					'$effect.pre(() => {});', // 13
					'$effect.root(() => {});', // 14
				].join('\n'),
				'src/lib/core/t/u.ts': "import { setTimeout } from '#lib/utils/timers.js';\nexport function b(f: () => void) { setTimeout(f); }",
				'src/lib/core/t/W.svelte': [
					'<script lang="ts">', // 1
					'\tfunction h() {}',
					'\t$effect(() => { h(); });', // 3
					'</script>',
					'<svelte:window onkeydown={h} on:resize={() => (1 > 0 ? h() : h())} />', // 5
					'<svelte:document', // 6
					'\tonvisibilitychange={h}', // 7
					'/>',
					'<!-- <svelte:body onclick={h} /> -->', // 9
					'<div onclick={h}></div>', // 10
				].join('\n'),
			}),
		).toEqual([
			'src/lib/core/t/W.svelte:3 svelte.$effect reactive in (script)',
			'src/lib/core/t/W.svelte:5 dom.keydown dom svelte:window in (markup)',
			'src/lib/core/t/W.svelte:5 dom.resize dom svelte:window in (markup)',
			'src/lib/core/t/W.svelte:7 dom.visibilitychange dom svelte:document in (markup)',
			'src/lib/core/t/t.svelte.ts:2 timer.setTimeout timer delay=300 * 1 in a',
			'src/lib/core/t/t.svelte.ts:3 timer.setTimeout timer delay=1_000 in a',
			'src/lib/core/t/t.svelte.ts:4 timer.setInterval timer delay=DELAY * 2 in a',
			'src/lib/core/t/t.svelte.ts:6 timer.requestAnimationFrame timer in a',
			'src/lib/core/t/t.svelte.ts:7 timer.queueMicrotask timer in a',
			'src/lib/core/t/t.svelte.ts:8 dom.keydown dom el in a',
			'src/lib/core/t/t.svelte.ts:12 svelte.$effect reactive in (module)',
			'src/lib/core/t/t.svelte.ts:13 svelte.$effect reactive in (module)',
			'src/lib/core/t/t.svelte.ts:14 svelte.$effect reactive in (module)',
		]);
	});
});

describe('F15 timer wrappers', () => {
	it('treats an exported function whose timer delay comes from its own parameter as a wrapper and lists its calls', () => {
		expect(
			effectLines({
				'src/lib/utils/debounce.ts': [
					'export function debounce<T>(fn: () => T, delay: number) {', // 1
					'\tlet t: ReturnType<typeof setTimeout>;',
					'\tconst fire = () => fn();',
					'\treturn () => {',
					'\t\tclearTimeout(t);',
					'\t\tt = setTimeout(fire, delay);', // 6
					'\t};',
					'}',
					'const DELAY = 50;',
					'export function fixed(fn: () => void) {', // 10
					'\tsetTimeout(fn, DELAY);', // 11
					'}',
					'export function inner(fn: () => void, ms: number) { return () => { const ms = 1; setTimeout(fn, ms); }; }', // 13
				].join('\n'),
				'src/lib/features/tags/tags.service.ts': [
					"import { debounce, fixed, inner } from '#lib/utils/debounce.js';", // 1
					'function g() {}',
					'const t = debounce(() => g(), 300);', // 3
					'export function later() {', // 4
					'\tconst u = debounce(', // 5
					'\t\tg, // the callback',
					'\t\t500,',
					'\t);',
					'\tfixed(g);', // 9
					'\tinner(g, 2);', // 10
					'}',
					'let v = debounce(g, 1);', // 12
				].join('\n'),
			}),
		).toEqual([
			'src/lib/features/tags/tags.service.ts:3 timer-wrap.debounce timer args=() => g(), 300 as t in t',
			'src/lib/features/tags/tags.service.ts:5 timer-wrap.debounce timer args=g, 500 as u in later',
			'src/lib/features/tags/tags.service.ts:12 timer-wrap.debounce timer args=g, 1 in v',
			'src/lib/utils/debounce.ts:6 timer.setTimeout timer delay=delay in debounce',
			'src/lib/utils/debounce.ts:11 timer.setTimeout timer delay=DELAY in fixed',
			'src/lib/utils/debounce.ts:13 timer.setTimeout timer delay=ms in inner',
		]);
	});
});

describe('F17 component mounts', () => {
	it('finds `<B` tags of imported components followed by whitespace, `/` or `>`, outside comments', () => {
		const { files, resolved } = analyze({
			'src/lib/features/tags/TagItem.svelte': '<p>x</p>',
			'src/lib/features/tags/TagItemList.svelte': '<p>y</p>',
			'src/lib/components/ui/button/button.svelte': '<button></button>',
			'src/lib/components/ui/button/index.ts': "import Root from './button.svelte';\nexport { Root as Button };",
			'src/lib/features/tags/TagsView.svelte': [
				'<script lang="ts">', // 1
				"\timport TagItem from './TagItem.svelte';",
				"\timport TagItemList from './TagItemList.svelte';",
				"\timport { Button } from '#lib/components/ui/button/index.js';",
				'</script>', // 5
				'<TagItem foo={1} />', // 6
				'<TagItem/>', // 7
				'<TagItemList>', // 8
				'</TagItemList>',
				'<!-- <TagItem /> -->', // 10
				'<Button', // 11
				'\tonclick={() => {}}>Go</Button>',
				'<TagItem>', // 13
				'{#if x}<TagItem\n/>{/if}', // 14
			].join('\n'),
		});
		expect(
			componentMounts(files, resolved).map(
				(m: { file: string; line: number; name: string; target: string }) => `mount ${m.file}:${m.line} ${m.name} -> ${m.target}`,
			),
		).toEqual([
			'mount src/lib/features/tags/TagsView.svelte:6 TagItem -> src/lib/features/tags/TagItem.svelte',
			'mount src/lib/features/tags/TagsView.svelte:7 TagItem -> src/lib/features/tags/TagItem.svelte',
			'mount src/lib/features/tags/TagsView.svelte:8 TagItemList -> src/lib/features/tags/TagItemList.svelte',
			'mount src/lib/features/tags/TagsView.svelte:11 Button -> src/lib/components/ui/button/button.svelte',
			'mount src/lib/features/tags/TagsView.svelte:13 TagItem -> src/lib/features/tags/TagItem.svelte',
			'mount src/lib/features/tags/TagsView.svelte:14 TagItem -> src/lib/features/tags/TagItem.svelte',
		]);
	});
});

/** Builds the model of an in-memory tree. */
function modelOf(tree: Record<string, string>) {
	return buildModel(new Map(Object.entries(tree)));
}

describe('F14 graphs and ranking', () => {
	const tree: Record<string, string> = {
		'src/lib/core/a/a.ts': 'export const a = 1;',
		'src/lib/core/b/b.ts': "import { b3 } from './b3.js';\nexport const b = b3;",
		'src/lib/core/b/b2.ts': 'export const b2 = 1;',
		'src/lib/core/b/b3.ts': 'export const b3 = 1;',
		'src/lib/core/c/c.ts': 'export const c = 1;',
		'src/lib/features/f/f1.ts': "import { a } from '#lib/core/a/a.js';\nimport type { b } from '#lib/core/b/b.js';",
		'src/lib/features/f/f2.ts': "import { a } from '#lib/core/a/a.js';\nimport { c } from '#lib/core/c/c.js';\nimport type { a as A } from '#lib/core/a/a.js';",
		'src/lib/app/app.ts': [
			"import { a } from '#lib/core/a/a.js';",
			"import { b } from '#lib/core/b/b.js';",
			"import { c } from '#lib/core/c/c.js';",
			"import { b2 } from '#lib/core/b/b2.js';",
		].join('\n'),
		'src/tests/lib/core/b/b.test.ts': "import { b } from '#lib/core/b/b.js';\nimport type { b as B } from '#lib/core/b/b.js';",
		'src-tauri/src/lib.rs': 'pub fn run() { x::go(); }',
		'src-tauri/src/x.rs': 'pub fn go() {}',
		'src-tauri/tests/t.rs': 'use kokobrain_lib::x::go;\n#[test]\nfn t() { go(); }',
	};

	it('ranks production files by production importers, then test importers, then path; type-only importers count', () => {
		const m = modelOf(tree);
		expect(m.hubs.map((h: { file: string; prod: number; test: number }) => `${h.file} ${h.prod} ${h.test}`)).toEqual([
			'src/lib/core/a/a.ts 3 0',
			'src/lib/core/b/b.ts 2 1',
			'src/lib/core/c/c.ts 2 0',
			'src-tauri/src/x.rs 1 1',
			'src/lib/core/b/b2.ts 1 0',
			'src/lib/core/b/b3.ts 1 0',
			'src-tauri/src/lib.rs 0 0',
			'src/lib/app/app.ts 0 0',
			'src/lib/features/f/f1.ts 0 0',
			'src/lib/features/f/f2.ts 0 0',
		]);
		expect(m.hubsByLayer.get('core').map((h: { file: string }) => h.file)).toEqual([
			'src/lib/core/a/a.ts',
			'src/lib/core/b/b.ts',
			'src/lib/core/c/c.ts',
			'src/lib/core/b/b2.ts',
			'src/lib/core/b/b3.ts',
		]);
		expect([...m.hubsByLayer.keys()]).toEqual(['app', 'core', 'features', 'rust']);
	});

	it('keeps a file directly in src/lib in its own `lib-root` hub layer', () => {
		const m = modelOf({
			'src/lib/utils.ts': 'export const cn = 1;',
			'src/lib/utils/debug.ts': "import { cn } from '#lib/utils.js';",
		});
		expect(m.hubsByLayer.get('lib-root').map((h: { file: string; prod: number }) => `${h.file} ${h.prod}`)).toEqual(['src/lib/utils.ts 1']);
		expect([...m.hubsByLayer.keys()]).toEqual(['lib-root', 'utils']);
	});

	it('weighs module edges by distinct production file pairs; test imports make none', () => {
		const m = modelOf(tree);
		expect(m.moduleEdges.map((e: { from: string; to: string; pairs: number }) => `dep ${e.from} -> ${e.to} ${e.pairs}`)).toEqual([
			'dep src/lib/app -> src/lib/core/a 1',
			'dep src/lib/app -> src/lib/core/b 2',
			'dep src/lib/app -> src/lib/core/c 1',
			'dep src/lib/features/f -> src/lib/core/a 2',
			'dep src/lib/features/f -> src/lib/core/b 1',
			'dep src/lib/features/f -> src/lib/core/c 1',
		]);
	});

	it('orders entry files by external importer files, then path', () => {
		const m = modelOf(tree);
		expect(
			m.entryFiles.get('src/lib/core/b')!.map((e: { file: string; importers: string[] }) => `${e.file} ${e.importers.join(',')}`),
		).toEqual(['src/lib/core/b/b.ts src/lib/app/app.ts,src/lib/features/f/f1.ts', 'src/lib/core/b/b2.ts src/lib/app/app.ts']);
		expect(m.entryFiles.get('src/lib/features/f')).toEqual([]);
	});

	it('maps Rust integration tests and keeps their imports off module edges', () => {
		const m = modelOf(tree);
		expect(
			m.tests.map((r: { test: string; relation: string; target: string; mirror: boolean }) => `${r.test} ${r.relation} ${r.target}${r.mirror ? ' mirror' : ''}`),
		).toEqual(['src-tauri/tests/t.rs imports src-tauri/src/x.rs', 'src/tests/lib/core/b/b.test.ts imports src/lib/core/b/b.ts mirror']);
	});

	it('gives two-hop reach without direct neighbors and self', () => {
		const m = modelOf({
			'src/lib/core/m/p.ts': "import { q } from './q.js';\nexport const p = q;",
			'src/lib/core/m/q.ts': "import { p } from './p.js';\nexport const q = 1;",
			'src/lib/core/m/r.ts': "import { p } from './p.js';\nimport { q } from './q.js';\nexport const r = 1;",
			'src/lib/core/m/s.ts': "import { r } from './r.js';",
			'src/tests/lib/core/m/s.test.ts': "import { s } from '#lib/core/m/s.js';",
		});
		expect(m.in2('src/lib/core/m/q.ts')).toEqual(['src/lib/core/m/s.ts']);
		expect(m.out2('src/lib/core/m/s.ts')).toEqual(['src/lib/core/m/p.ts', 'src/lib/core/m/q.ts']);
		expect(m.out2('src/lib/core/m/r.ts')).toEqual([]);
		expect(m.in2('src/lib/core/m/r.ts')).toEqual([]);
	});

	it('records import edges with their names in source order', () => {
		const m = modelOf({
			'src/lib/core/m/p.ts': 'export const p = 1;\nexport type P = 1;\nexport default 1;',
			'src/lib/core/m/q.ts': 'export const qq = 1;\nexport const qr = 1;',
			'src/lib/core/m/u.ts': [
				"import def, { p, type P } from './p.js';", // 1
				"import * as ns from './p.js';", // 2
				"export { p as q } from './p.js';", // 3
				"const { p: x } = await import('./p.js');", // 4
				"import '@tauri-apps/api/core';", // 5
				'const {', // 6
				'\tdefault: d2,',
				"} = await import('./p.js');", // 8
				"export type { P } from './p.js';", // 9
				"export * from './q.js';", // 10
				"export { qq, type qr } from './q.js';", // 11
				"import './q.js';", // 12
				"export * as all from './q.js';", // 13
			].join('\n'),
		});
		expect(
			m.edges.map((e: { from: string; line: number; target: string; names: string[] }) => `imp ${e.from}:${e.line} -> ${e.target} ${e.names.join(',')}`),
		).toEqual([
			'imp src/lib/core/m/u.ts:1 -> src/lib/core/m/p.ts default,p,type:P',
			'imp src/lib/core/m/u.ts:2 -> src/lib/core/m/p.ts *',
			'imp src/lib/core/m/u.ts:3 -> src/lib/core/m/p.ts p',
			'imp src/lib/core/m/u.ts:4 -> src/lib/core/m/p.ts dyn:p',
			'imp src/lib/core/m/u.ts:8 -> src/lib/core/m/p.ts dyn:default',
			'imp src/lib/core/m/u.ts:9 -> src/lib/core/m/p.ts type:P',
			'imp src/lib/core/m/u.ts:10 -> src/lib/core/m/q.ts *',
			'imp src/lib/core/m/u.ts:11 -> src/lib/core/m/q.ts qq,type:qr',
			'imp src/lib/core/m/u.ts:12 -> src/lib/core/m/q.ts side-effect',
			'imp src/lib/core/m/u.ts:13 -> src/lib/core/m/q.ts *',
		]);
		expect(
			m.packageImports.map((e: { from: string; line: number; target: string; names: string[] }) => `${e.from}:${e.line} -> ${e.target} ${e.names.join(',')}`),
		).toEqual(['src/lib/core/m/u.ts:5 -> pkg:@tauri-apps/api/core side-effect']);
	});

	it('links the symbol graph through calls, refs, registry fires, IPC, events, store state and mounts', () => {
		const m = modelOf({
			'src/lib/contracts/ipc.ts': IPC_TS,
			'src/lib/contracts/commands.ts': 'export type NoArgs = Record<never, never>;\nexport interface CommandMap {\n\tdo_it: { args: NoArgs; result: null };\n}',
			'src/lib/contracts/events.ts': "export const EVENT_NAMES = {\n\tDONE: 'done',\n} as const;\nexport interface EventMap {\n\tdone: null;\n}",
			'src/lib/core/s/s.store.svelte.ts': 'let v = $state(0);\nexport const s = { get v() { return v; }, setV(x: number) { v = x; } };',
			'src/lib/core/h/hooks.ts': 'const obs: Array<() => void> = [];\nexport function addObs(o: () => void) { obs.push(o); return () => {}; }\nexport function notify() { for (const o of obs) o(); }',
			'src/lib/features/x/x.service.ts': [
				"import { call, on } from '#lib/contracts/ipc.js';",
				"import { EVENT_NAMES } from '#lib/contracts/events.js';",
				"import { addObs, notify } from '#lib/core/h/hooks.js';",
				"import { s } from '#lib/core/s/s.store.svelte.js';",
				"function onSaved() { void call('do_it'); }",
				'export function register() { addObs(onSaved); }',
				'export function save() { notify(); s.setV(1); }',
				'export function listen() { void on(EVENT_NAMES.DONE, () => { s.v; }); }',
			].join('\n'),
			'src/lib/features/x/Child.svelte': '<p>c</p>',
			'src/lib/features/x/View.svelte': [
				'<script lang="ts">',
				"\timport Child from './Child.svelte';",
				"\timport { s } from '#lib/core/s/s.store.svelte.js';",
				'\t$effect(() => { s.v; });', // 4
				'</script>',
				'<Child />',
			].join('\n'),
			'src-tauri/src/lib.rs': 'mod commands;\npub fn run() {\n\ttauri::generate_handler![commands::do_it];\n}',
			'src-tauri/src/events.rs': 'pub const DONE_EVENT: &str = "done";',
			'src-tauri/src/commands.rs': 'use crate::events::DONE_EVENT;\n#[tauri::command]\npub fn do_it(app: App) { app.emit(DONE_EVENT, ()); }',
			'src-tauri/tests/t.rs': 'use kokobrain_lib::commands::do_it;\n#[test]\nfn t() { do_it(app); }',
			'src/tests/lib/features/x/x.test.ts': [
				"import { save, register } from '#lib/features/x/x.service.js';",
				"import { s } from '#lib/core/s/s.store.svelte.js';",
				"import { call } from '#lib/contracts/ipc.js';",
				'save();',
				'register();',
				's.setV(2);',
				"void call('do_it');",
			].join('\n'),
			'src/tests/lib/features/x/Fake.svelte': '<script lang="ts">\n\timport Child from \'#lib/features/x/Child.svelte\';\n</script>\n<Child />',
		});
		const edges = m.symbolEdges.map((e: { kind: string; from: string; to: string }) => `${e.kind} ${e.from} -> ${e.to}`);
		expect(edges.filter((e: string) => / (?:src\/tests|src-tauri\/tests)\//.test(e))).toEqual([]);
		const x = 'src/lib/features/x/x.service.ts';
		const view = 'src/lib/features/x/View.svelte';
		expect(edges).toEqual(
			expect.arrayContaining([
				`call ${x}:save -> src/lib/core/h/hooks.ts:notify`,
				`call ${x}:register -> src/lib/core/h/hooks.ts:addObs`,
				`ref ${x}:register -> ${x}:onSaved`,
				`fires src/lib/core/h/hooks.ts:notify -> ${x}:onSaved`,
				`ipc ${x}:onSaved -> ipc:do_it`,
				'ipc ipc:do_it -> src-tauri/src/commands.rs:do_it',
				'event src-tauri/src/commands.rs:do_it -> event:done',
				`event event:done -> ${x}:listen`,
				`state ${x}:save -> ${x}:listen`,
				`state ${x}:save -> ${view}:$effect@4`,
				`mount ${view}:(markup) -> src/lib/features/x/Child.svelte:default`,
				`mount ${view}:default -> ${view}:(script)`,
				`mount ${view}:default -> ${view}:(markup)`,
				`mount ${view}:default -> ${view}:$effect@4`,
			]),
		);
		expect(new Set(edges).size).toBe(edges.length);
	});

	it('orders symbol edges by from, then kind order, then to', () => {
		const m = modelOf({
			'src/lib/core/o/o.ts': ['function b() {}', 'function a() {}', 'export function z() { b(); return a; }', 'export function y() { a(); }'].join('\n'),
		});
		const o = 'src/lib/core/o/o.ts';
		expect(m.symbolEdges.map((e: { kind: string; from: string; to: string }) => `${e.kind} ${e.from} -> ${e.to}`)).toEqual([
			`call ${o}:y -> ${o}:a`,
			`call ${o}:z -> ${o}:b`,
			`ref ${o}:z -> ${o}:a`,
		]);
	});
});

describe('F1 inventory and modules', () => {
	it('names one module per core/features/plugins folder, per other src/lib layer, the routes, and each Rust folder', () => {
		expect(
			discoverModules({
				libFiles: [
					'src/lib/core/editor/editor.service.ts',
					'src/lib/core/editor/sub/deep.ts',
					'src/lib/features/tags/Tags.svelte',
					'src/lib/plugins/kanban/kanban.logic.ts',
					'src/lib/app/boot.ts',
					'src/lib/utils/path.ts',
					'src/lib/utils.ts',
				],
				routeFiles: ['src/routes/+layout.svelte'],
				rustFiles: ['src-tauri/src/lib.rs', 'src-tauri/src/vault/index.rs', 'src-tauri/src/db/mod.rs'],
			}),
		).toEqual([
			'src-tauri/src',
			'src-tauri/src/db',
			'src-tauri/src/vault',
			'src/lib/app',
			'src/lib/core/editor',
			'src/lib/features/tags',
			'src/lib/plugins/kanban',
			'src/lib/utils',
			'src/lib/utils.ts',
			'src/routes',
		]);
		expect(discoverModules({ libFiles: [], routeFiles: [], rustFiles: [] })).toEqual([]);
	});

	it('picks the longest module path holding a file, a file module only by exact match, else null', () => {
		const modules = ['src-tauri/src', 'src-tauri/src/vault', 'src/lib/utils', 'src/lib/utils.ts'];
		expect(moduleOf('src-tauri/src/vault/index.rs', modules)).toBe('src-tauri/src/vault');
		expect(moduleOf('src-tauri/src/lib.rs', modules)).toBe('src-tauri/src');
		expect(moduleOf('src/lib/utils.ts', modules)).toBe('src/lib/utils.ts');
		expect(moduleOf('src/lib/utils/path.ts', modules)).toBe('src/lib/utils');
		expect(moduleOf('scripts/x.mjs', modules)).toBeNull();
	});

	it('names the role of each file type of the architecture guidelines', () => {
		expect(
			['a/x.logic.ts', 'a/x.store.svelte.ts', 'a/x.service.ts', 'a/X.svelte', 'a/x.types.ts', 'a/x.rs', 'a/x.ts', 'a/x.js'].map(fileRole),
		).toEqual(['logic', 'store', 'service', 'component', 'types', 'rust', 'other', 'other']);
	});

	it('reads the F1 inputs of a repo folder in code-unit order; `.js` in src/lib gets no symbols', () => {
		const root = mkdtempSync(join(tmpdir(), 'codemap-inputs-'));
		try {
			const tree: Record<string, string> = {
				'src/lib/a.ts': 'export const a = 1;',
				'src/lib/a.d.ts': 'export declare const a: number;',
				'src/lib/b.js': 'export const b = 1;',
				'src/lib/C.svelte': '<p>c</p>',
				'src/lib/x.css': '',
				'src/lib/node_modules/n.ts': '',
				'src/routes/+page.js': '',
				'src/routes/+page.svelte': '',
				'src/tests/t.test.ts': '',
				'src/tests/t.js': '',
				'src/tests/T.svelte': '',
				'e2e/e.ts': '',
				'e2e/e.js': '',
				'src-tauri/src/lib.rs': '',
				'src-tauri/src/x.txt': '',
				'src-tauri/tests/t.rs': '',
				'src/tests/lib/architecture/layer-baseline.json': '[]',
				'scripts/s.mjs': '',
			};
			for (const [path, text] of Object.entries(tree)) {
				mkdirSync(join(root, dirname(path)), { recursive: true });
				writeFileSync(join(root, path), text);
			}
			const inputs = readInputs(root);
			expect([...inputs.keys()]).toEqual([
				'e2e/e.ts',
				'src-tauri/src/lib.rs',
				'src-tauri/tests/t.rs',
				'src/lib/C.svelte',
				'src/lib/a.ts',
				'src/lib/b.js',
				'src/routes/+page.js',
				'src/routes/+page.svelte',
				'src/tests/lib/architecture/layer-baseline.json',
				'src/tests/t.test.ts',
			]);
			expect(isInput('src/lib/a.d.ts')).toBe(false);
			const m = buildModel(inputs);
			expect(m.files).toContain('src/lib/b.js');
			expect(m.files).not.toContain('src/tests/lib/architecture/layer-baseline.json');
			expect(m.ts.has('src/lib/b.js')).toBe(false);
			expect(m.baseline).toEqual([]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});
