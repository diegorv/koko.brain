import { describe, expect, it } from 'vitest';

import { byLines } from '../../../../scripts/codemap/render.mjs';
import {
	collectStores,
	extractTsFile,
	extractUses,
	firstSentence,
	publicIds,
	resolveBindings,
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
