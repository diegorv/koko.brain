import { readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';

/**
 * File discovery for the Settings source scans: the panel, the `*Section.svelte`
 * files `SettingsPanel.svelte` imports, and every component reachable from them
 * through local PascalCase `.svelte` imports, followed recursively (so
 * `ThemeColorRow.svelte`, imported by `ThemeEditor.svelte`, is included).
 */

const ROOT = process.cwd();
const PANEL = 'src/lib/app/SettingsPanel.svelte';

/** Reads a repo-relative file. */
export const readSource = (path: string) => readFileSync(join(ROOT, path), 'utf8');

function resolveImport(from: string, spec: string): string {
	if (spec.startsWith('#lib/')) return `src/lib/${spec.slice('#lib/'.length)}`;
	return normalize(join(dirname(from), spec));
}

/** Repo-relative paths of the Settings panel and its pages, sorted. */
export function settingsFiles(): string[] {
	const sections = [...readSource(PANEL).matchAll(/from '([^']+Section\.svelte)'/g)].map((m) => resolveImport(PANEL, m[1]));
	const files = new Set([PANEL, ...sections]);
	const queue = [...sections];
	while (queue.length > 0) {
		const file = queue.shift()!;
		// PascalCase only: `../settings.store.svelte` is a store module, not a component.
		for (const m of readSource(file).matchAll(/from '(\.{1,2}\/(?:[^']*\/)?[A-Z][^'/]*\.svelte)'/g)) {
			const path = resolveImport(file, m[1]);
			if (files.has(path)) continue;
			files.add(path);
			queue.push(path);
		}
	}
	return [...files].sort();
}
