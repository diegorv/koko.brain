import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { processTemplate } from '#lib/utils/template.js';

/**
 * Guards `help/examples/templates/` against `kb.view()` calls to scripts that
 * do not ship. Each template goes through the same `processTemplate` a new
 * note does, so the paths checked are the ones the created note runs.
 *
 * `kb.view()` resolves from the vault root, and which example folder a user
 * copies to that root is unknown here, so a path counts as present when some
 * `.js` file under `help/` ends with it.
 */

const HELP = join(process.cwd(), 'help');
const TEMPLATES = join(HELP, 'examples/templates');

/** The string-literal script path of a `kb.view()` / `dv.view()` call. */
const VIEW_RE = /\b(?:kb|dv)\.view\(\s*(["'`])([^"'`]+)\1/g;

/** Lists every file under `dir`, relative to `root`. */
function walk(dir: string, root: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		return entry.isDirectory() ? walk(full, root) : [relative(root, full)];
	});
}

/** Script paths under `help/`, each with a leading slash for suffix matching. */
const SCRIPTS = walk(HELP, HELP)
	.filter((path) => path.endsWith('.js'))
	.map((path) => `/${path}`);

/** True when some script under `help/` ends with `viewPath` (`.js` optional). */
function scriptExists(viewPath: string): boolean {
	const withExt = viewPath.endsWith('.js') ? viewPath : `${viewPath}.js`;
	const suffix = `/${withExt.replace(/^\/+/, '')}`;
	return SCRIPTS.some((script) => script.endsWith(suffix));
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

	it('every view path names a script that exists under help/', () => {
		const missing = templateViewPaths()
			.filter(({ path }) => !scriptExists(path))
			.map(({ template, path }) => `${template}: ${path}`);
		expect(missing).toEqual([]);
	});

	it('flags a path with no script under help/', () => {
		expect(scriptExists('__system/queryjs/meeting-list')).toBe(true);
		expect(scriptExists('_system/queryjs/meeting-list')).toBe(false);
	});
});
