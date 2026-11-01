import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { scanLib } from '../../../../scripts/import-graph.mjs';

/**
 * Guard for ADR-0004: `.logic.ts`, `.types.ts` and `src/lib/utils/*.ts` files
 * are pure. Walks the import graph from each of them and fails when it reaches
 * the framework, Tauri, a component, a store or a service.
 *
 * Type-only imports count like any other, except in a `.types.ts` file:
 * ADR-0004 sets no framework rule for types files, so a types file may
 * `import type` from anywhere and those edges are not followed.
 */

const ROOT = process.cwd();

interface Edge {
	from: string;
	to: string | null;
	spec: string | null;
	kind: string;
	typeOnly: boolean;
	line: number;
}

/** Services that live in `utils/`: not start points, still forbidden targets. */
const UTILS_SERVICES = ['src/lib/utils/debug.ts', 'src/lib/utils/log.service.ts'];

/**
 * Package edges allowed from a pure file, as `from -> package`. The canvas
 * logic converts to and from @xyflow/svelte's node and edge types (ADR-0023).
 */
const ALLOWLIST = [
	'src/lib/features/canvas/canvas-history.logic.ts -> @xyflow/svelte',
	'src/lib/features/canvas/canvas.logic.ts -> @xyflow/svelte',
];

/** Why a package specifier is forbidden, or null. */
function forbiddenPackage(spec: string): string | null {
	if (spec.startsWith('@tauri-apps/')) return 'Tauri API';
	if (spec.startsWith('@sveltejs/') || spec.startsWith('$app/')) return 'SvelteKit';
	if (/(^|[/@-])svelte([/-]|$)/.test(spec)) return 'Svelte package';
	return null;
}

/** Why an internal file is forbidden, or null. */
function forbiddenFile(path: string): string | null {
	if (path.endsWith('.store.svelte.ts')) return 'store';
	if (path.endsWith('.svelte')) return 'component';
	if (path.endsWith('.service.ts')) return 'service';
	if (UTILS_SERVICES.includes(path)) return 'utils service';
	return null;
}

/** Whether a file must stay pure. */
function isPureStart(path: string): boolean {
	if (UTILS_SERVICES.includes(path)) return false;
	if (/^src\/lib\/utils\/[^/]+\.ts$/.test(path)) return true;
	return path.endsWith('.logic.ts') || path.endsWith('.types.ts');
}

/** The edges the walk follows out of a file. */
function outgoing(byFrom: Map<string, Edge[]>, from: string): Edge[] {
	const all = byFrom.get(from) ?? [];
	return from.endsWith('.types.ts') ? all.filter((e) => !e.typeOnly) : all;
}

/**
 * The shortest import chain from `start` to a forbidden target, as
 * `a:line -> b:line -> target (reason)`, or null when `start` is pure.
 */
function firstViolation(byFrom: Map<string, Edge[]>, start: string): string | null {
	const seen = new Set([start]);
	const queue: { file: string; chain: string[] }[] = [{ file: start, chain: [] }];
	while (queue.length > 0) {
		const { file, chain } = queue.shift()!;
		for (const e of outgoing(byFrom, file)) {
			const hop = [...chain, `${file}:${e.line}`];
			if (e.to === null) {
				if (e.spec === null || ALLOWLIST.includes(`${file} -> ${e.spec}`)) continue;
				const why = forbiddenPackage(e.spec);
				if (why) return `${hop.join(' -> ')} -> ${e.spec} (${why})`;
				continue;
			}
			const why = forbiddenFile(e.to);
			if (why) return `${hop.join(' -> ')} -> ${e.to} (${why})`;
			if (seen.has(e.to)) continue;
			seen.add(e.to);
			queue.push({ file: e.to, chain: hop });
		}
	}
	return null;
}

const { files, edges } = scanLib(ROOT) as { files: string[]; edges: Edge[] };
const byFrom = new Map<string, Edge[]>();
for (const e of edges) byFrom.set(e.from, [...(byFrom.get(e.from) ?? []), e]);
const starts = files.filter(isPureStart);

describe('pure logic guard (ADR-0004)', () => {
	it('sees enough pure files that a broken filter cannot pass', () => {
		expect(starts.length).toBeGreaterThan(100);
		expect(starts).toContain('src/lib/utils/path.ts');
		expect(starts).not.toContain('src/lib/utils/debug.ts');
	});

	it('no .logic.ts, .types.ts or utils file reaches the framework, Tauri, a store or a service', () => {
		const violations = starts.map((s) => firstViolation(byFrom, s)).filter((v) => v !== null);
		expect(
			violations,
			'A pure file reaches an impure module. Move the impure call to a .service.ts, or pass it in ' +
				'(a parameter or a module-level sink configured by the app). See ADR-0004.',
		).toEqual([]);
	});

	it('every allowlisted package edge still exists', () => {
		const present = new Set(edges.filter((e) => e.to === null).map((e) => `${e.from} -> ${e.spec}`));
		expect(ALLOWLIST.filter((a) => !present.has(a)), 'Delete the stale allowlist entry').toEqual([]);
	});

	it('flags a type-only import of svelte in a logic file but not in a types file', () => {
		const synthetic = new Map<string, Edge[]>([
			['a.logic.ts', [{ from: 'a.logic.ts', to: null, spec: 'svelte', kind: 'static', typeOnly: true, line: 1 }]],
			['a.types.ts', [{ from: 'a.types.ts', to: null, spec: 'svelte', kind: 'static', typeOnly: true, line: 1 }]],
		]);
		expect(firstViolation(synthetic, 'a.logic.ts')).toBe('a.logic.ts:1 -> svelte (Svelte package)');
		expect(firstViolation(synthetic, 'a.types.ts')).toBeNull();
	});

	it('flags SvelteKit specifiers', () => {
		expect(forbiddenPackage('@sveltejs/kit')).toBe('SvelteKit');
		expect(forbiddenPackage('$app/environment')).toBe('SvelteKit');
	});

	it('the app wires the properties diagnostics sink to appendLog', () => {
		// properties.logic.ts defaults to a no-op sink, so dropping this call loses the logs silently.
		const layout = readFileSync(`${ROOT}/src/routes/(app)/+layout.svelte`, 'utf8');
		expect(layout).toContain('configurePropertiesDiagnostics({ log: appendLog });');
	});

	it('follows a chain through a pure-looking file to a store', () => {
		const synthetic = new Map<string, Edge[]>([
			['a.logic.ts', [{ from: 'a.logic.ts', to: 'b.ts', spec: './b', kind: 'static', typeOnly: false, line: 2 }]],
			['b.ts', [{ from: 'b.ts', to: 'c.store.svelte.ts', spec: './c', kind: 'static', typeOnly: false, line: 5 }]],
		]);
		expect(firstViolation(synthetic, 'a.logic.ts')).toBe('a.logic.ts:2 -> b.ts:5 -> c.store.svelte.ts (store)');
	});
});
