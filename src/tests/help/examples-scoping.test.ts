import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { parseCollectionYaml } from '#lib/features/collection/yaml-parser.js';
import type { FilterItem } from '#lib/features/collection/collection.types.js';

/**
 * Guards `help/examples/` against queries that read the whole vault.
 *
 * The examples are copied into real vaults, where an unscoped query lists
 * every personal note (or freezes the app). Every query site must carry a
 * folder scope or an explicit limit; `help/examples/SCOPING.md` has the
 * pattern per surface. The checks are text heuristics, not an evaluator.
 */

const EXAMPLES = join(process.cwd(), 'help/examples');

/**
 * Files that still hold an unscoped query, mapped to the
 * `.scratch/help-examples` issue that scopes them. Each folder issue removes
 * its entries; the stale-entry test fails until it does.
 */
const ALLOWLIST: Record<string, string> = {
	'auto-move-features/auto-move-rules.json': '07: review auto-move, canvas, kanban and search-types',
	'collection-features/bug-triage.collection': '04: scope collection-features examples',
	'collection-features/calendar-deadlines.collection': '04: scope collection-features examples',
	'collection-features/calendar-events.collection': '04: scope collection-features examples',
	'collection-features/collection-display-functions.md': '04: scope collection-features examples',
	'collection-features/collection-display-names.md': '04: scope collection-features examples',
	'collection-features/collection-edge-cases.md': '04: scope collection-features examples',
	'collection-features/collection-filtros-avancados.md': '04: scope collection-features examples',
	'collection-features/collection-formulas.md': '04: scope collection-features examples',
	'collection-features/collection-projetos-ativos.md': '04: scope collection-features examples',
	'collection-features/collection-sorting-limit.md': '04: scope collection-features examples',
	'collection-features/collection-todos-os-itens.md': '04: scope collection-features examples',
	'collection-features/linear-calendar-events.collection': '04: scope collection-features examples',
	'collection-features/project-tracker.collection': '04: scope collection-features examples',
	'collection-features/recent-activity.collection': '04: scope collection-features examples',
	'collection-features/sprint-board.collection': '04: scope collection-features examples',
	'collection-features/team-workload.collection': '04: scope collection-features examples',
	'markdown-editor-vault/20-collection.md': '03: scope markdown-editor-vault and live-preview-regressions',
	'markdown-editor-vault/22-queryjs.md': '03: scope markdown-editor-vault and live-preview-regressions',
	'markdown-editor-vault/23-queryjs-real-scripts.md': '03: scope markdown-editor-vault and live-preview-regressions',
	'markdown-editor-vault/24-queryjs-advanced.md': '03: scope markdown-editor-vault and live-preview-regressions',
	'queryjs-features/__system/queryjs/_shared-open-tasks.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/_shared-period-radar.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/_shared-weekly-radar.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/meeting-list.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/note-shortlist.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/project-progress-bars.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/project-status-cards.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/recent-edits-timeline.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/tag-count.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/tag-heatmap.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/vault-overview-cards.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/vault-tag-cloud.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/weekly-meeting-list.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/yearly-exercise-heatmap.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/yearly-exercise-vertical.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/yearly-sleep-heatmap.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/yearly-sleep-vertical.js': '02: scope queryjs-features examples',
	'queryjs-features/__system/queryjs/yearly-wellness-heatmap.js': '02: scope queryjs-features examples',
	'queryjs-features/daily-2026-02-13.md': '02: scope queryjs-features examples',
	'queryjs-features/yearly-2026.md': '02: scope queryjs-features examples',
	'triada/__system/queryjs/_shared-triada.js': '05: scope triada and templates',
	'triada/__system/queryjs/triada-inbox.js': '05: scope triada and templates',
	'type-definitions-features/active-projects.view': '06: scope type-definitions-features views',
	'type-definitions-features/recent-meetings.view': '06: scope type-definitions-features views',
};

/** A file under `help/examples/`, path relative to that folder. */
interface ExampleFile {
	path: string;
	text: string;
}

/** One unscoped query: file plus a short label of the site inside it. */
interface Offender {
	path: string;
	site: string;
}

/** A vault read through the QueryJS API. */
const QUERYJS_READ_RE = /\b(?:kb|dv)\.(?:pages|pagePaths)\(/;
/** `kb.pages('"folder"')` or a template literal folder source. */
const QUERYJS_FOLDER_SOURCE_RE = /\.(?:pages|pagePaths)\(\s*['"`]"/;
/** A predicate on the note's path, in QueryJS or the collection expression language. */
const PATH_PREDICATE_RE =
	/file\.(?:folder|path)\s*(?:\.\s*(?:contains|startsWith|endsWith|includes)\s*\(|===?\s)|file\.inFolder\s*\(/;
const QUERYJS_LIMIT_RE = /\.limit\(/;
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})\s*([\w-]*)/;

/** Lists every file under `dir`, relative to `root`. */
function walk(dir: string, root: string): ExampleFile[] {
	const out: ExampleFile[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...walk(full, root));
		else out.push({ path: relative(root, full), text: readFileSync(full, 'utf8') });
	}
	return out;
}

/** Top-level fenced blocks of a Markdown file; a fence nested in a longer fence is body text. */
function fencedBlocks(text: string): { lang: string; body: string; line: number }[] {
	const blocks: { lang: string; body: string; line: number }[] = [];
	const lines = text.split('\n');
	let open: { marker: string; lang: string; line: number; body: string[] } | null = null;
	lines.forEach((line, i) => {
		if (!open) {
			const m = line.match(FENCE_OPEN_RE);
			if (m) open = { marker: m[1], lang: m[2].toLowerCase(), line: i + 1, body: [] };
			return;
		}
		const close = line.trim();
		if (close.startsWith(open.marker) && /^(`+|~+)$/.test(close) && close[0] === open.marker[0]) {
			blocks.push({ lang: open.lang, body: open.body.join('\n'), line: open.line });
			open = null;
			return;
		}
		open.body.push(line);
	});
	return blocks;
}

/** True when a QueryJS script reads the vault without a folder scope or a limit. */
function isUnscopedQueryjs(code: string): boolean {
	if (!QUERYJS_READ_RE.test(code)) return false;
	return !(
		QUERYJS_FOLDER_SOURCE_RE.test(code) ||
		PATH_PREDICATE_RE.test(code) ||
		QUERYJS_LIMIT_RE.test(code)
	);
}

/** True when a filter tree holds a path predicate anywhere in it. */
function hasPathFilter(filter: FilterItem | undefined): boolean {
	if (filter === undefined) return false;
	if (typeof filter === 'string') return PATH_PREDICATE_RE.test(filter);
	return [...(filter.and ?? []), ...(filter.or ?? []), ...(filter.not ?? [])].some(hasPathFilter);
}

/**
 * Names of the views of a collection definition that list notes without a
 * path filter or a limit. A definition that does not parse renders an error,
 * not notes, so it has none.
 */
function unscopedCollectionViews(yaml: string): string[] {
	const parsed = parseCollectionYaml(yaml);
	if (!parsed.success) return [];
	const { definition } = parsed;
	const globalScoped = hasPathFilter(definition.filters);
	return definition.views
		.filter((v) => !globalScoped && !hasPathFilter(v.filters) && v.limit === undefined)
		.map((v) => v.name);
}

/** Every unscoped query site in the given example files. */
function findOffenders(files: ExampleFile[]): Offender[] {
	const out: Offender[] = [];
	for (const { path, text } of files) {
		if (path.endsWith('.md')) {
			for (const block of fencedBlocks(text)) {
				if ((block.lang === 'queryjs' || block.lang === 'dataviewjs') && isUnscopedQueryjs(block.body)) {
					out.push({ path, site: `${block.lang} block at line ${block.line}` });
				}
				if (block.lang === 'collection') {
					for (const view of unscopedCollectionViews(block.body)) {
						out.push({ path, site: `collection block at line ${block.line}, view "${view}"` });
					}
				}
			}
		} else if (path.endsWith('.js')) {
			if (isUnscopedQueryjs(text)) out.push({ path, site: 'script' });
		} else if (path.endsWith('.collection') || path.endsWith('.view')) {
			for (const view of unscopedCollectionViews(text)) out.push({ path, site: `view "${view}"` });
		} else if (path.endsWith('auto-move-rules.json')) {
			const config = JSON.parse(text) as { rules?: { name: string; expression: string }[] };
			for (const rule of config.rules ?? []) {
				if (!PATH_PREDICATE_RE.test(rule.expression)) out.push({ path, site: `rule "${rule.name}"` });
			}
		}
	}
	return out;
}

describe('findOffenders (classifier)', () => {
	const md = (lang: string, body: string) => ({ path: 'x/note.md', text: '```' + lang + '\n' + body + '\n```\n' });

	it('flags an unscoped kb.pages() block', () => {
		expect(findOffenders([md('queryjs', 'kb.table(["a"], kb.pages().map(p => [p.file.link]))')])).toEqual([
			{ path: 'x/note.md', site: 'queryjs block at line 1' },
		]);
	});

	it('flags a tag-only source and an unscoped .js script', () => {
		const files = [
			md('dataviewjs', "dv.list(dv.pages('#project').file.link)"),
			{ path: 'x/script.js', text: 'const all = kb.pagePaths();' },
		];
		expect(findOffenders(files).map((o) => o.site)).toEqual(['dataviewjs block at line 1', 'script']);
	});

	it('accepts a folder source, a path predicate or a limit', () => {
		const files = [
			md('queryjs', 'kb.pages(`"${kb.current().file.folder}"`)'),
			md('queryjs', `kb.pages('"projects"')`),
			md('queryjs', 'const here = kb.current().file.folder;\nkb.pages().where(p => p.file.folder.startsWith(here))'),
			md('queryjs', 'kb.list(kb.pages().limit(3).file.link)'),
			md('queryjs', 'kb.paragraph("no vault read")'),
		];
		expect(findOffenders(files)).toEqual([]);
	});

	it('ignores a queryjs fence nested inside a longer fence', () => {
		const text = '````markdown\n```queryjs\nkb.pages()\n```\n````\n';
		expect(findOffenders([{ path: 'x/code.md', text }])).toEqual([]);
	});

	it('checks each collection view for a path filter or a limit', () => {
		const yaml = [
			'filters:',
			'  and:',
			'    - "status == \'active\'"',
			'views:',
			'  - type: table',
			'    name: All',
			'  - type: table',
			'    name: Capped',
			'    limit: 5',
			'  - type: table',
			'    name: Here',
			'    filters: \'file.folder.contains("/collection-features")\'',
		].join('\n');
		expect(findOffenders([{ path: 'x/c.collection', text: yaml }])).toEqual([
			{ path: 'x/c.collection', site: 'view "All"' },
		]);
	});

	it('accepts a global path filter and skips a block that does not parse', () => {
		const scoped = 'filters: \'file.folder.endsWith("/x")\'\nviews:\n  - type: table\n    name: T\n';
		expect(findOffenders([md('collection', scoped), md('collection', 'views: nope')])).toEqual([]);
	});

	it('does not count file.folder shown as a column as a scope', () => {
		const yaml = 'views:\n  - type: table\n    name: T\n    order:\n      - file.folder\n';
		expect(findOffenders([md('collection', yaml)])).toHaveLength(1);
	});

	it('flags an auto-move rule without a path predicate', () => {
		const text = JSON.stringify({
			rules: [
				{ name: 'Any', expression: "file.hasTag('recipe')" },
				{ name: 'Here', expression: "file.hasTag('recipe') && file.folder.contains('/auto-move-features')" },
			],
		});
		expect(findOffenders([{ path: 'a/auto-move-rules.json', text }])).toEqual([
			{ path: 'a/auto-move-rules.json', site: 'rule "Any"' },
		]);
	});
});

describe('help/examples query scoping', () => {
	const files = walk(EXAMPLES, EXAMPLES);
	const offenders = findOffenders(files);

	it('finds the example files (scanner sanity)', () => {
		expect(files.length).toBeGreaterThan(100);
	});

	it('every query site outside the allowlist is scoped to its folder or limited', () => {
		const unlisted = offenders.filter((o) => !(o.path in ALLOWLIST)).map((o) => `${o.path}: ${o.site}`);
		expect(unlisted).toEqual([]);
	});

	it('every allowlisted file still has an unscoped query (remove scoped entries)', () => {
		const offending = new Set(offenders.map((o) => o.path));
		expect(Object.keys(ALLOWLIST).filter((path) => !offending.has(path))).toEqual([]);
	});

	it('every allowlist entry names the folder issue (02-07) that removes it', () => {
		const bad = Object.entries(ALLOWLIST).filter(([, issue]) => !/^0[2-7]: \S/.test(issue));
		expect(bad).toEqual([]);
	});
});
