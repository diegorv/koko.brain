import { describe, expect, it } from 'vitest';

import {
	extractTsFile,
	firstSentence,
	publicIds,
	resolveBindings,
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
