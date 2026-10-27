import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import type { ComponentProps } from 'svelte';

import CollectionView from '#lib/features/collection/CollectionView.svelte';

/**
 * Guards the `#lib` specifier convention (plan-2026-10-27.md, `#lib` section).
 *
 * tsconfig `paths` maps `#lib/*` so svelte-check types `#lib/...svelte`
 * components, but that mapping also makes TS accept extensionless `#lib/x`,
 * which Node/Vite subpath imports cannot resolve. This test is the gate.
 */

const SRC = join(process.cwd(), 'src');
const SKIP_DIRS = new Set(['node_modules', '.svelte-kit']);
const FILE_RE = /\.(ts|js|svelte)$/;
/** Quoted `#lib/...` specifier inside import/export/import()/vi.* string args (incl. `vi.importActual<T>(...)`). */
const SPECIFIER_RE = /(?:from\s+|import\s*\(\s*|import\s+|vi\.\w+(?:<[^>]*>)?\(\s*)(['"`])(#lib\/[^'"`]*)\1/g;
const EXTENSION_RE = /\.(js|svelte|json|css)$/;

/** Lists every source file under `dir`, skipping generated/vendor trees. */
function walk(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (SKIP_DIRS.has(entry.name)) continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(full));
		else if (FILE_RE.test(entry.name)) out.push(full);
	}
	return out;
}

/** Returns `file: specifier` for every `#lib` specifier lacking an extension. */
function findExtensionlessSpecifiers(files: string[]): string[] {
	const bad: string[] = [];
	for (const file of files) {
		const text = readFileSync(file, 'utf8');
		for (const m of text.matchAll(SPECIFIER_RE)) {
			if (!EXTENSION_RE.test(m[2])) bad.push(`${relative(SRC, file)}: ${m[2]}`);
		}
	}
	return bad;
}

describe('#lib specifier convention', () => {
	it('finds #lib specifiers at all (scanner sanity)', () => {
		const files = walk(SRC);
		const count = files.reduce(
			(n, f) => n + [...readFileSync(f, 'utf8').matchAll(SPECIFIER_RE)].length,
			0,
		);
		expect(count).toBeGreaterThan(100);
	});

	it('scanner matches generic vi calls', () => {
		// Built by concatenation so the repo-wide scan below does not flag this line.
		const sample = "await vi.importActual<typeof Mod>(" + "'#lib/utils/fuzzy-match');";
		expect([...sample.matchAll(SPECIFIER_RE)].map((m) => m[2])).toEqual(['#lib/utils/fuzzy-match']);
	});

	it('every #lib specifier in src carries an extension', () => {
		expect(findExtensionlessSpecifiers(walk(SRC))).toEqual([]);
	});

	it('#lib component imports are typed (enforced by pnpm check)', () => {
		const ok: ComponentProps<typeof CollectionView> = { yamlContent: '' };
		// @ts-expect-error required prop `yamlContent` missing; unused if #lib .svelte resolves to the untyped ambient module
		const missing: ComponentProps<typeof CollectionView> = {};
		expect(ok.yamlContent).toBe('');
		expect(missing).toEqual({});
	});
});
