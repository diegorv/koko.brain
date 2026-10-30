import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { findMatchingRule, resolveDestination } from '#lib/features/auto-move/auto-move.logic.js';
import type { AutoMoveRule } from '#lib/features/auto-move/auto-move.types.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
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

/** A vault read through the QueryJS API, up to its opening parenthesis. */
const QUERYJS_READ_RE = /\b(?:kb|dv)\.(?:pages|pagePaths)\(/g;
/** A string-literal folder source, `'"folder"'`; `'""'` and compound sources read all pages. */
const QUERYJS_LITERAL_FOLDER_RE = /^'"[^"']+"'$/;
/** A template folder source, `` `"${expr}"` `` with an optional literal suffix. */
const QUERYJS_TEMPLATE_FOLDER_RE = /^`"\$\{([^}]+)\}[^"`$]*"`$/;
/** A fallback in the folder expression, which can yield the empty (all pages) source. */
const FALLBACK_RE = /\?\?|\|\|/;
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

/**
 * Index just past the end of the expression that starts at `from`: the first
 * `)`, `]` or `}` that closes an enclosing bracket, or a `;` / `,` at depth 0.
 * With `chain`, a newline at depth 0 also ends it unless the next line starts
 * with `.` (a continued method chain). Quoted text and `//` comments are skipped.
 */
function scanExpression(code: string, from: number, chain: boolean): number {
	let depth = 0;
	for (let i = from; i < code.length; i++) {
		const c = code[i];
		if (c === '/' && code[i + 1] === '/') {
			const end = code.indexOf('\n', i);
			if (end === -1) return code.length;
			i = end - 1;
		} else if (c === "'" || c === '"' || c === '`') {
			const end = code.indexOf(c, i + 1);
			if (end === -1) return code.length;
			i = end;
		} else if (c === '(' || c === '[' || c === '{') depth++;
		else if (c === ')' || c === ']' || c === '}') {
			if (depth === 0) return i;
			depth--;
		} else if (depth === 0 && (c === ';' || c === ',')) return i;
		else if (chain && depth === 0 && c === '\n' && !/^\s*\./.test(code.slice(i + 1))) return i;
	}
	return code.length;
}

/** True when `arg` is a folder source that `parseSource` scopes to a non-empty folder. */
function isFolderSource(arg: string): boolean {
	if (QUERYJS_LITERAL_FOLDER_RE.test(arg)) return true;
	const template = arg.match(QUERYJS_TEMPLATE_FOLDER_RE);
	return template !== null && !FALLBACK_RE.test(template[1]);
}

/**
 * Number of QueryJS vault reads in `code` without a folder source, or a limit
 * or path predicate in their own method chain. A read assigned to a variable
 * and narrowed in a later statement counts as unscoped.
 */
function unscopedQueryjsReads(code: string): number {
	let count = 0;
	for (const m of code.matchAll(QUERYJS_READ_RE)) {
		const argStart = m.index + m[0].length;
		const argEnd = scanExpression(code, argStart, false);
		const chain = code.slice(argEnd + 1, scanExpression(code, argEnd + 1, true));
		const scoped =
			isFolderSource(code.slice(argStart, argEnd).trim()) ||
			PATH_PREDICATE_RE.test(chain) ||
			QUERYJS_LIMIT_RE.test(chain);
		if (!scoped) count++;
	}
	return count;
}

/**
 * True when a filter tree restricts notes by path: a path predicate at the top
 * or in an `and:` branch, or an `or:` whose every branch does. A `not:` only
 * excludes, so it never scopes.
 */
function hasPathFilter(filter: FilterItem | undefined): boolean {
	if (filter === undefined) return false;
	if (typeof filter === 'string') return PATH_PREDICATE_RE.test(filter);
	const or = filter.or ?? [];
	return (filter.and ?? []).some(hasPathFilter) || (or.length > 0 && or.every(hasPathFilter));
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
				if ((block.lang === 'queryjs' || block.lang === 'dataviewjs') && unscopedQueryjsReads(block.body) > 0) {
					out.push({ path, site: `${block.lang} block at line ${block.line}` });
				}
				if (block.lang === 'collection') {
					for (const view of unscopedCollectionViews(block.body)) {
						out.push({ path, site: `collection block at line ${block.line}, view "${view}"` });
					}
				}
			}
		} else if (path.endsWith('.js')) {
			if (unscopedQueryjsReads(text) > 0) out.push({ path, site: 'script' });
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
			md('queryjs', 'const here = kb.current().file.folder;\nkb.pages()\n\t.where(p => p.file.folder.startsWith(here))'),
			md('queryjs', 'kb.list(kb.pages().limit(3).file.link)'),
			md('queryjs', 'kb.paragraph("no vault read")'),
		];
		expect(findOffenders(files)).toEqual([]);
	});

	it('checks each read on its own chain, so a limit on one does not scope another', () => {
		const code = 'const all = kb.pages();\nkb.paragraph(all.file.basename.join(", "));\nkb.list(kb.pages("#x").limit(5).file.link)';
		expect(findOffenders([md('queryjs', code)])).toHaveLength(1);
	});

	it('flags a compound source and a folder expression with an empty fallback', () => {
		const files = [
			md('queryjs', `kb.pages('"x" and #y')`),
			md('queryjs', `kb.pages('""')`),
			md('queryjs', 'kb.pages(`"${kb.current()?.file.folder ?? \'\'}"`)'),
		];
		expect(findOffenders(files)).toHaveLength(3);
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

	it('counts a path predicate under not: or in only some or: branches as unscoped', () => {
		const view = '\nviews:\n  - type: table\n    name: T\n';
		const files = [
			md('collection', 'filters:\n  not:\n    - \'file.folder.contains("/templates")\'' + view),
			md('collection', 'filters:\n  or:\n    - \'file.folder.contains("/x")\'\n    - "status == \'a\'"' + view),
			md('collection', 'filters:\n  or:\n    - \'file.folder.contains("/x")\'\n    - \'file.path.contains("/y/")\'' + view),
		];
		expect(findOffenders(files).map((o) => o.site)).toEqual([
			'collection block at line 1, view "T"',
			'collection block at line 1, view "T"',
		]);
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

describe('auto-move-features rules stay inside the example folder', () => {
	const dir = join(EXAMPLES, 'auto-move-features');
	const rules = (JSON.parse(readFileSync(join(dir, 'auto-move-rules.json'), 'utf-8')) as { rules: AutoMoveRule[] })
		.rules;
	const vault = '/vault';
	const nested = `${vault}/Resources/help/examples/auto-move-features`;
	/** Satisfies every rule's non-path condition, so only the folder scope decides. */
	const catchAll = [
		'---',
		'status: done',
		'type: journal',
		'tags: [project, recipe, bug, daily, old-format]',
		'---',
		'',
		'# Note',
	].join('\n');

	it('every rule, enabled or not, matches a note in its Inbox and moves it inside the folder', () => {
		for (const root of [`${vault}/auto-move-features`, nested]) {
			const record = buildNoteRecord(`${root}/Inbox/note.md`, catchAll);
			const rel = root.slice(vault.length + 1);
			for (const rule of rules) {
				expect(findMatchingRule([{ ...rule, enabled: true }], record), rule.name).not.toBeNull();
				const destination = resolveDestination(rule.destination, record, vault);
				expect(destination.startsWith(`${rel}/`), `${rule.name} -> ${destination}`).toBe(true);
			}
		}
	});

	it('no rule matches the same note outside the example Inbox', () => {
		const outside = [
			`${vault}/note.md`,
			`${vault}/Inbox/note.md`,
			`${vault}/Projects/note.md`,
			`${nested}/note.md`,
			`${nested}/Cooking/note.md`,
			`${nested}/Inbox/Bugs/note.md`,
		];
		for (const path of outside) {
			const record = buildNoteRecord(path, catchAll);
			const enabled = rules.map((rule) => ({ ...rule, enabled: true }));
			expect(findMatchingRule(enabled, record)?.name ?? null, path).toBeNull();
		}
	});

	it('each example note in Inbox matches an enabled rule when the folder is nested', () => {
		const notes = readdirSync(join(dir, 'Inbox')).filter((name) => name.endsWith('.md'));
		expect(notes.length).toBeGreaterThan(0);
		for (const name of notes) {
			const record = buildNoteRecord(`${nested}/Inbox/${name}`, readFileSync(join(dir, 'Inbox', name), 'utf-8'));
			expect(findMatchingRule(rules, record), name).not.toBeNull();
		}
	});
});
