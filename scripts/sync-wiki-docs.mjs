#!/usr/bin/env node
// @ts-nocheck - build-time CLI script, not part of the app's type-checked
// surface. The unit test imports it, which would otherwise pull it into the
// svelte-check program with no @types for its node usage.
/**
 * sync-wiki-docs.mjs
 *
 * Copies help/documentation into a checkout of the GitHub wiki, run by
 * .github/workflows/sync-wiki.yml.
 *
 *   node scripts/sync-wiki-docs.mjs <docs-dir> <wiki-dir> <docs-url>
 *
 * A GitHub wiki is flat and its URLs have no `.md`, so every file becomes one
 * page at the wiki root: `01-getting-started.md` -> `Getting Started.md`,
 * `mods/14-cookbook.md` -> `Mods Cookbook.md`. The number prefixes repeat across
 * folders, so a relative link is resolved against the folder of the file that
 * holds it before it is rewritten to the page name, keeping any `#anchor`.
 * A link that leaves the docs folder points at `<docs-url>`, the docs folder on
 * GitHub, since the wiki has no copy of that file. Other links stay as they are.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const titleCase = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/** Wiki page name for a docs file, given by its path relative to the docs dir. */
export function pageName(relPath) {
	const parts = relPath.split('/');
	const file = parts.pop();
	const prefix = parts.map(titleCase).join(' ');
	if (file === 'README.md') return prefix ? `${prefix} Reference` : 'Home';
	const name = titleCase(file.replace(/^\d+-/, '').replace(/\.md$/, ''));
	return prefix ? `${prefix} ${name}` : name;
}

export function buildPageMap(relPaths) {
	return new Map(relPaths.map((p) => [p, pageName(p)]));
}

/**
 * Rewrites relative markdown links in `text`, which lives at `fromPath`: a link to a docs file becomes a wiki
 * page link, a link that leaves the docs folder becomes a URL under `docsUrl` (the docs folder in the repo).
 */
export function rewriteLinks(text, fromPath, pageMap, docsUrl) {
	return text.replace(/\]\(([^()\s#:<]+)(#[^()\s]*)?\)/g, (match, target, anchor = '') => {
		const resolved = posix.normalize(posix.join(posix.dirname(fromPath), target));
		const page = pageMap.get(resolved);
		if (page) return `](${page.replace(/ /g, '-')}${anchor})`;
		if (resolved.startsWith('../')) return `](${new URL(target, docsUrl + fromPath).href}${anchor})`;
		return match;
	});
}

function listDocs(dir, rel = '') {
	return readdirSync(resolve(dir, rel), { withFileTypes: true }).flatMap((entry) => {
		const path = rel ? `${rel}/${entry.name}` : entry.name;
		if (entry.isDirectory()) return listDocs(dir, path);
		return entry.name.endsWith('.md') ? [path] : [];
	});
}

function main() {
	const [docsDir, wikiDir, docsUrl] = process.argv.slice(2);
	if (!docsUrl) throw new Error('usage: sync-wiki-docs.mjs <docs-dir> <wiki-dir> <docs-url>');
	const pageMap = buildPageMap(listDocs(docsDir));
	mkdirSync(wikiDir, { recursive: true });
	for (const [relPath, page] of pageMap) {
		const text = readFileSync(resolve(docsDir, relPath), 'utf8');
		writeFileSync(resolve(wikiDir, `${page}.md`), rewriteLinks(text, relPath, pageMap, docsUrl.replace(/\/?$/, '/')));
	}
}

const runAsCli = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runAsCli) {
	try {
		main();
	} catch (err) {
		console.error('sync-wiki-docs failed:', err.message);
		process.exit(2);
	}
}
