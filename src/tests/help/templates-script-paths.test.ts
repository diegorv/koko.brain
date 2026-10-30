import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { processTemplate } from '#lib/utils/template.js';

/**
 * Guards `help/examples/templates/` against `kb.view()` calls to scripts that
 * do not ship. Each template goes through the same `processTemplate` a new
 * note does, so the paths checked are the ones the created note runs.
 *
 * `kb.view()` resolves from the vault root, and which example folder a user
 * opens as that root is unknown here, so a path counts as present when it
 * names a `.js` file relative to some `help/examples/<folder>/`.
 */

const HELP = join(process.cwd(), 'help');
const EXAMPLES = join(HELP, 'examples');
const TEMPLATES = join(EXAMPLES, 'templates');

/** The string-literal script path of a `kb.view()` / `dv.view()` call. */
const VIEW_RE = /\b(?:kb|dv)\.view\(\s*(["'`])([^"'`]+)\1/g;

/** Lists every file under `dir`, relative to `root`. */
function walk(dir: string, root: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		return entry.isDirectory() ? walk(full, root) : [relative(root, full)];
	});
}

/** Each example folder, a candidate vault root. */
const VAULT_ROOTS = readdirSync(EXAMPLES, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => join(EXAMPLES, entry.name));

/** True when `viewPath` (`.js` optional) resolves to a script from some example vault root. */
function scriptExists(viewPath: string): boolean {
	const withExt = viewPath.endsWith('.js') ? viewPath : `${viewPath}.js`;
	return VAULT_ROOTS.some((root) => existsSync(join(root, withExt)));
}

/** Every `kb.view()` path in a note created from each template. */
function templateViewPaths(): { template: string; path: string }[] {
	return walk(TEMPLATES, TEMPLATES)
		.filter((name) => name.endsWith('.md'))
		.flatMap((name) => {
			const note = processTemplate(readFileSync(join(TEMPLATES, name), 'utf8'), 'Test Note');
			return [...note.matchAll(VIEW_RE)].map((m) => ({ template: name, path: m[2] }));
		});
}

describe('help/examples/templates kb.view() paths', () => {
	it('finds view calls to check', () => {
		expect(templateViewPaths().length).toBeGreaterThan(0);
	});

	it('every view path resolves to a script from an example vault root', () => {
		const missing = templateViewPaths()
			.filter(({ path }) => !scriptExists(path))
			.map(({ template, path }) => `${template}: ${path}`);
		expect(missing).toEqual([]);
	});

	it('flags a path that resolves from no example vault root', () => {
		expect(scriptExists('__system/queryjs/meeting-list')).toBe(true);
		expect(scriptExists('_system/queryjs/meeting-list')).toBe(false);
		expect(scriptExists('meeting-list')).toBe(false);
		expect(scriptExists('queryjs/meeting-list')).toBe(false);
	});
});
