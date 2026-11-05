// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import dayjs from 'dayjs';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { KBAPI, runQueryjsBlock } from '#lib/plugins/queryjs/kb-api.js';
import { DataArray } from '#lib/plugins/queryjs/data-array.js';
import { buildOneOnOneVariables } from '#lib/plugins/one-on-one/one-on-one.logic.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import type { PropertyIndexRecord } from '#lib/features/collection/collection.types.js';
import type { NoteEntryV2, TaskV2 } from '#lib/types/vault-v2.types.js';
import { extractAllTags } from '#lib/utils/tag-extraction.js';
import { processTemplate } from '#lib/utils/template.js';
import { entryV2, outgoingLinksFromContent } from '../fixtures/vault-entries.fixture';

/**
 * Runs every QueryJS block and `__system/queryjs` script under `help/examples/`
 * through the widget's own runner, over a fixture vault built from the
 * example folder's notes, and pins each run's text to a golden snapshot.
 *
 * A user who copies an example folder into a vault gets exactly this output
 * (modulo dates), so a change to the KBAPI that alters what an example
 * renders shows up here as a snapshot diff.
 */

// The whole file runs under one zone and one clock, set before the fixture
// vaults are built at collection time: the scripts format dates
// asynchronously, which `withTimeZone` cannot cover. "Now" is the last day of
// the queryjs-features example week. Only `Date` is faked, so awaited timers
// in the scripts still fire.
const ZONE = vi.hoisted(() => {
	const previous = process.env.TZ;
	process.env.TZ = 'UTC';
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date('2026-02-15T12:00:00Z'));
	return { previous };
});

vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

// Chart.js needs a real canvas. The stand-in writes the chart's data into the
// canvas text so chart output reaches the snapshot.
vi.mock('chart.js/auto', () => ({
	Chart: class {
		constructor(
			canvas: HTMLElement,
			config: { type: string; data: { labels?: unknown[]; datasets: { label?: string; data: unknown[] }[] } },
		) {
			const datasets = config.data.datasets.map((ds) => ({ label: ds.label, data: ds.data }));
			canvas.textContent = `[chart ${config.type} ${JSON.stringify({ labels: config.data.labels, datasets })}]`;
		}
	},
}));

const EXAMPLES = join(process.cwd(), 'help/examples');
const VAULT = '/vault';

/** Languages the widget runs (`dataviewjs` is the Obsidian alias the examples may use). */
const RUN_LANGS = new Set(['queryjs', 'dataviewjs']);
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})\s*([\w-]*)/;
const TASK_RE = /^(\s*)[-*+] \[(.)\] (.*)$/;
const DATE_RE = /\b(\d{4}-\d{2}-\d{2})\b/;

/**
 * Runs expected to fail, each with the reason. A listed run must still fail,
 * so a fixed example forces its entry out.
 */
const ERROR_ALLOWLIST: Record<string, string> = {
	'markdown-editor-vault/22-queryjs.md #18': 'demonstrates the inline error for an undefined name',
	'markdown-editor-vault/22-queryjs.md #19': 'demonstrates the inline error for a syntax error',
	'markdown-editor-vault/24-queryjs-advanced.md #17': 'demonstrates the partial render before a runtime error',
};

/**
 * Runs whose text does not depend on the vault, so it matches the run over
 * the current note alone. A listed run must still match it.
 */
const VAULT_INDEPENDENT: Record<string, string> = {
	'markdown-editor-vault/22-queryjs.md #5': "reads only the current note's own file fields",
	'markdown-editor-vault/22-queryjs.md #9': 'formats kb.date() values only',
	'markdown-editor-vault/22-queryjs.md #10': 'renders a kb.el() literal',
	'markdown-editor-vault/22-queryjs.md #11': 'renders a literal kb.taskList()',
	'markdown-editor-vault/22-queryjs.md #16': 'renders literal headers and paragraphs',
	'markdown-editor-vault/22-queryjs.md #17': 'compares literal links and values',
	'markdown-editor-vault/22-queryjs.md #21': 'the empty block, which renders nothing',
	'markdown-editor-vault/22-queryjs.md #22': 'renders a literal after a delay',
	'markdown-editor-vault/22-queryjs.md #23': 'draws on a canvas from literal data',
	'markdown-editor-vault/23-queryjs-real-scripts.md #3':
		'runs weekly-wellness-chart in a note with no created date, which renders the fallback line',
	'markdown-editor-vault/23-queryjs-real-scripts.md #6': 'formats kb.date() values only',
	'markdown-editor-vault/23-queryjs-real-scripts.md #5':
		'runs weekly-wellness-chart in a note with no created date, which renders the fallback line',
	'markdown-editor-vault/24-queryjs-advanced.md #6': 'formats kb.date() values only',
	'markdown-editor-vault/24-queryjs-advanced.md #15': 'chains kb.array() over literal arrays',
	'queryjs-features/yearly-2026.md #4':
		'the heatmap text is its grid labels; the data only colours the cells, which textContent leaves out',
	'queryjs-features/yearly-2026.md #7':
		'the yearly calendar text is its labels; the data only colours the cells, which textContent leaves out',
	'triada/__system/queryjs/_shared-triada': 'defines helpers on window.__triada and renders nothing',
};

/**
 * Runs that render their empty state because the example data never reaches
 * the query, so they match the run over the current note alone. A listed run
 * must still match it; adding the missing example data forces its entry out.
 */
const NO_EXAMPLE_DATA: Record<string, string> = {
	'triada/__system/queryjs/triada-inbox':
		"triada ships only templates; the one #inbox task is the Weekly template's own",
	'triada/__system/queryjs/triada-moved':
		'triada ships only templates, so the week has no daily note with a `moved` value',
	'triada/templates/TRIADA Weekly.md #3':
		'triada ships only templates, so the week has no daily note with a `moved` value',
	'triada/templates/TRIADA Weekly.md #4':
		"triada ships only templates; the one #inbox task is the Weekly template's own",
};

/** Lists every file under `dir`, path relative to `root`. */
function walk(dir: string, root: string): string[] {
	return readdirSync(dir, { withFileTypes: true })
		.flatMap((entry) => {
			const full = join(dir, entry.name);
			return entry.isDirectory() ? walk(full, root) : [relative(root, full)];
		})
		.sort();
}

/** Top-level fenced blocks of a Markdown file; a fence nested in a longer fence is body text. */
function fencedBlocks(text: string): { lang: string; body: string; line: number }[] {
	const blocks: { lang: string; body: string; line: number }[] = [];
	let open: { marker: string; lang: string; line: number; body: string[] } | null = null;
	text.split('\n').forEach((line, i) => {
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

/** One note of a fixture vault, path absolute under {@link VAULT}. */
interface FixtureNote {
	path: string;
	content: string;
	/** False for a note borrowed from another example root. */
	own: boolean;
}

/** An example root as a vault: its notes and where its scripts load from. */
interface ExampleVault {
	root: string;
	notes: FixtureNote[];
	scriptRoot: string;
}

/** True for a note that is a Templater template, created through `processTemplate`. */
function isTemplate(root: string, rel: string): boolean {
	return root === 'templates' || (root === 'triada' && rel.startsWith('templates/'));
}

/**
 * Custom variables a plugin passes when it creates a note from a template,
 * keyed `<root>/<rel>`; other templates get none. The 1:1 note is created on
 * the fixture day by `buildOneOnOneVariables`, with a daily format that names
 * the note made from the Daily template, so that note's meeting list has a row.
 */
const TEMPLATE_VARIABLES: Record<string, Record<string, string>> = {
	'templates/One on One.md': buildOneOnOneVariables(dayjs('2026-02-15T10:00:00'), 'Ana', {
		folder: '',
		daily: { format: '[Daily Note]', template: '' },
		weekly: { format: '' },
		monthly: { format: '' },
		quarterly: { format: '' },
		yearly: { format: '' },
	}),
};

/** The notes of `root`, templates expanded the way a new note from them is. */
function rootNotes(root: string): FixtureNote[] {
	return walk(join(EXAMPLES, root), join(EXAMPLES, root))
		.filter((rel) => rel.endsWith('.md'))
		.map((rel) => {
			const raw = readFileSync(join(EXAMPLES, root, rel), 'utf8');
			const title = rel.slice(rel.lastIndexOf('/') + 1, -'.md'.length);
			return {
				path: `${VAULT}/${rel}`,
				content: isTemplate(root, rel) ? processTemplate(raw, title, TEMPLATE_VARIABLES[`${root}/${rel}`]) : raw,
				own: true,
			};
		});
}

/**
 * The vault an example root runs in. The templates query notes they do not
 * contain, so they run beside the queryjs-features notes and scripts, the
 * folder their `kb.view()` paths point at. markdown-editor-vault ships no
 * scripts and tells the reader to copy the queryjs-features `__system/` to
 * the vault root.
 */
function exampleVault(root: string): ExampleVault {
	if (root === 'markdown-editor-vault') {
		return { root, notes: rootNotes(root), scriptRoot: 'queryjs-features' };
	}
	if (root === 'templates') {
		return {
			root,
			notes: [...rootNotes('queryjs-features').map((n) => ({ ...n, own: false })), ...rootNotes('templates')],
			scriptRoot: 'queryjs-features',
		};
	}
	return { root, notes: rootNotes(root), scriptRoot: root };
}

/** The note's own date: frontmatter `created` / `date`, else a date in its name. */
function noteDate(note: FixtureNote): number {
	const fm = note.content.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
	const field = fm.match(/^(?:created|date):\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1];
	const named = note.path.match(DATE_RE)?.[1];
	const day = field ?? named ?? '2026-02-10';
	return Date.parse(`${day}T09:00:00Z`);
}

/**
 * Task list items outside code fences, in the `TaskV2` shape Rust emits.
 * Only `text`, `checked` and `lineNumber` are faithful: `buildKBPage` reads no
 * other field. Unlike Rust `parse_task_line`, every non-space mark is `done`,
 * `indent` is a raw character count, and ordered `1. [ ]` items and inline
 * metadata are not parsed.
 */
function parseTasks(content: string): TaskV2[] {
	const tasks: TaskV2[] = [];
	let fence: string | null = null;
	content.split('\n').forEach((line, i) => {
		const open = line.match(FENCE_OPEN_RE);
		if (open && (fence === null || line.trim().startsWith(fence))) {
			fence = fence === null ? open[1] : null;
			return;
		}
		if (fence !== null) return;
		const m = line.match(TASK_RE);
		if (!m) return;
		tasks.push({
			text: m[3],
			checked: m[2] !== ' ',
			indent: m[1].length,
			lineNumber: i + 1,
			status: m[2] === ' ' ? 'todo' : 'done',
			metadata: { description: m[3], tags: [] },
		});
	});
	return tasks;
}

/** Records and Rust-shaped entries for a vault's notes. */
function buildIndex(notes: FixtureNote[]): { propertyIndex: Map<string, PropertyIndexRecord>; entries: NoteEntryV2[] } {
	const propertyIndex = new Map<string, PropertyIndexRecord>();
	const entries: NoteEntryV2[] = [];
	for (const note of notes) {
		const ctime = noteDate(note);
		const mtime = ctime + 8 * 3600_000;
		propertyIndex.set(note.path, buildNoteRecord(note.path, note.content, mtime, ctime, note.content.length));
		entries.push(
			entryV2(note.path, {
				tags: extractAllTags(note.content),
				tasks: parseTasks(note.content),
				outgoingLinks: outgoingLinksFromContent(note.content),
				modifiedAt: Math.floor(mtime / 1000),
				createdAt: Math.floor(ctime / 1000),
				size: note.content.length,
			}),
		);
	}
	return { propertyIndex, entries };
}

/** A recorded `kb.view()` call: the vault and note it ran in, and its `input`. */
interface ViewCall {
	vault: ExampleVault;
	currentFilePath: string;
	input: unknown;
}

/**
 * A KBAPI over `vault` (or, when `empty`, over the current note alone),
 * running as `currentFilePath`. With `calls`, every `kb.view()` the run makes
 * is recorded; `view` is the unrecorded original, for the run's own entry call.
 */
function createAPI(vault: ExampleVault, currentFilePath: string, empty: boolean, calls?: Map<string, ViewCall>) {
	const notes = empty ? vault.notes.filter((n) => n.path === currentFilePath) : vault.notes;
	const { propertyIndex, entries } = buildIndex(notes);
	const container = document.createElement('div');
	const kb = new KBAPI({
		container,
		propertyIndex,
		entries,
		propertyIndexVersion: 0,
		currentFilePath,
		vaultPath: VAULT,
		systemFolder: '_system',
		loadScript: async (path) => readFileSync(join(EXAMPLES, vault.scriptRoot, path.slice(`${VAULT}/`.length)), 'utf8'),
	});
	const view = kb.view.bind(kb);
	if (calls) {
		kb.view = (scriptPath: string, input?: unknown) => {
			const name = scriptPath.replace(/\.js$/, '').replace(/^\//, '');
			if (!calls.has(name)) calls.set(name, { vault, currentFilePath, input });
			return view(scriptPath, input);
		};
	}
	return { kb, container, view };
}

/** The outcome of one run: its text, the error it threw, and the failures it rendered. */
interface RunResult {
	text: string;
	thrown: string | null;
	rendered: string[];
}

/** Awaits `run`, then collects what it rendered into `container`. */
async function collect(container: HTMLElement, run: () => Promise<void>): Promise<RunResult> {
	let thrown: string | null = null;
	try {
		await run();
	} catch (err) {
		thrown = err instanceof Error ? err.message : String(err);
	}
	const text = container.textContent ?? '';
	const rendered = [
		...[...container.querySelectorAll('.cm-lp-qjs-error')].map((el) => el.textContent ?? ''),
		...(text.match(/Chart error:[^\n]*/g) ?? []),
	];
	return { text, thrown, rendered };
}

/** One runnable unit: a block in a note, or a script. */
interface Run {
	label: string;
	root: string;
	/** The root its `kb.view()` scripts load from. */
	scriptRoot: string;
	execute: (empty: boolean, calls?: Map<string, ViewCall>) => Promise<RunResult>;
}

const ROOTS = readdirSync(EXAMPLES, { withFileTypes: true })
	.filter((entry) => entry.isDirectory())
	.map((entry) => entry.name)
	.sort();
const VAULTS = new Map(ROOTS.map((root) => [root, exampleVault(root)]));

/** Every runnable block, labelled `<root>/<note> #<n>`. */
const BLOCKS: Run[] = ROOTS.flatMap((root) => {
	const vault = VAULTS.get(root)!;
	return vault.notes.filter((n) => n.own).flatMap((note) =>
		fencedBlocks(note.content)
			.filter((b) => RUN_LANGS.has(b.lang))
			.map((block, i): Run => ({
				label: `${root}/${note.path.slice(`${VAULT}/`.length)} #${i + 1}`,
				root,
				scriptRoot: vault.scriptRoot,
				execute: (empty, calls) => {
					const { kb, container } = createAPI(vault, note.path, empty, calls);
					return collect(container, () => runQueryjsBlock(kb, block.body));
				},
			})),
	);
});

/** Script name to the first call a block or script made to it, per script root. */
const CALLS = new Map<string, Map<string, ViewCall>>();

/** Every `__system/queryjs/*.js` script, labelled `<root>/__system/queryjs/<name>`. */
const SCRIPTS: Run[] = ROOTS.flatMap((root) => {
	const vault = VAULTS.get(root)!;
	return walk(join(EXAMPLES, root), join(EXAMPLES, root))
		.filter((rel) => /^__system\/queryjs\/[^/]+\.js$/.test(rel))
		.map((rel): Run => {
			const name = rel.slice(0, -'.js'.length);
			return {
				label: `${root}/${name}`,
				root,
				scriptRoot: root,
				execute: (empty, calls) => {
					// A called script runs where its caller ran: that vault, note and input.
					const call = CALLS.get(root)?.get(name) ?? { vault, currentFilePath: vault.notes[0].path, input: undefined };
					const { container, view } = createAPI(call.vault, call.currentFilePath, empty, calls);
					return collect(container, () => view(name, call.input));
				},
			};
		});
});

/**
 * The setup runs every block and script once, in sequence: about 2.4 s alone,
 * and its time grows with CPU contention, so a full suite beside parallel
 * worktrees pushes it past vitest's 10 s hook default. Under that real load
 * the hook ran past 10 s and the file took up to about 14.6 s; beside 20 busy
 * loops on a 10-core machine it took about 9.5 s. 30 s leaves about 2x over
 * the real-load bound, while a setup more than about 12x slower alone still
 * fails here.
 */
const SETUP_TIMEOUT = 30_000;

beforeAll(async () => {
	// Record the input each script gets from its real caller: blocks first, and
	// among them the blocks of the script's own root before borrowing roots.
	const own = (run: Run) => (run.root === run.scriptRoot ? 0 : 1);
	for (const run of [...[...BLOCKS].sort((a, b) => own(a) - own(b)), ...SCRIPTS]) {
		const calls = CALLS.get(run.scriptRoot) ?? new Map<string, ViewCall>();
		CALLS.set(run.scriptRoot, calls);
		await run.execute(false, calls);
	}
	document.body.replaceChildren();
}, SETUP_TIMEOUT);

afterAll(() => {
	vi.useRealTimers();
	if (ZONE.previous === undefined) delete process.env.TZ;
	else process.env.TZ = ZONE.previous;
});

describe('help/examples QueryJS discovery', () => {
	it('finds every block and script', () => {
		expect(BLOCKS.length).toBeGreaterThanOrEqual(93);
		expect(SCRIPTS.length).toBeGreaterThanOrEqual(35);
	});

	it('skips a queryjs fence nested inside a longer fence', () => {
		const file = 'live-preview-regressions/06-fenced-code.md';
		expect(readFileSync(join(EXAMPLES, file), 'utf8')).toContain('THIS MUST NOT RUN');
		expect(BLOCKS.filter((b) => b.label.startsWith(file))).toEqual([]);
	});

	it('has no stale allowlist entries', () => {
		const labels = new Set([...BLOCKS, ...SCRIPTS].map((r) => r.label));
		const listed = { ...ERROR_ALLOWLIST, ...VAULT_INDEPENDENT, ...NO_EXAMPLE_DATA };
		expect(Object.keys(listed).filter((l) => !labels.has(l))).toEqual([]);
	});

	it('finds no queryjs block outside an example root folder', () => {
		// Discovery walks only the folders of help/examples, the vaults a block
		// can run in; a block anywhere else in help/ would go untested.
		const HELP = join(process.cwd(), 'help');
		const outside = walk(HELP, HELP)
			.filter((rel) => rel.endsWith('.md') && !ROOTS.some((root) => rel.startsWith(`examples/${root}/`)))
			.filter((rel) => fencedBlocks(readFileSync(join(HELP, rel), 'utf8')).some((b) => RUN_LANGS.has(b.lang)));
		expect(outside).toEqual([]);
	});
});

/**
 * The per-example cases run each example twice and the sort case runs every block
 * twice: up to about 1 s alone, past vitest's 5 s default under a full suite on a
 * loaded machine.
 */
const LOADED_RUN_TIMEOUT = 30_000;

describe.each([
	['block', BLOCKS],
	['script', SCRIPTS],
] as const)('help/examples QueryJS %s', (_kind, runs) => {
	it.each(runs.map((r) => [r.label, r] as const))('%s', { timeout: LOADED_RUN_TIMEOUT }, async (label, run) => {
		const result = await run.execute(false);
		const failures = [...(result.thrown ? [`threw: ${result.thrown}`] : []), ...result.rendered];
		if (label in ERROR_ALLOWLIST) {
			expect(failures, ERROR_ALLOWLIST[label]).not.toEqual([]);
			expect({ failures, text: result.text }).toMatchSnapshot();
			return;
		}
		expect(failures).toEqual([]);
		expect(result.text).toMatchSnapshot();

		const empty = await run.execute(true);
		expect(empty.thrown).toBeNull();
		const sameAsEmpty = VAULT_INDEPENDENT[label] ?? NO_EXAMPLE_DATA[label];
		if (sameAsEmpty) expect(result.text, sameAsEmpty).toBe(empty.text);
		else expect(result.text).not.toBe(empty.text);
	});
});

describe('help/examples QueryJS snapshot sensitivity', () => {
	it('a changed DataArray.sort changes some block output', { timeout: LOADED_RUN_TIMEOUT }, async () => {
		const sorting = BLOCKS.filter((b) => !(b.label in ERROR_ALLOWLIST));
		const before = await Promise.all(sorting.map((b) => b.execute(false)));
		const sort = DataArray.prototype.sort;
		const spy = vi.spyOn(DataArray.prototype, 'sort').mockImplementation(function (this: DataArray<unknown>, ...args) {
			return new DataArray([...sort.apply(this, args)].reverse());
		});
		try {
			const after = await Promise.all(sorting.map((b) => b.execute(false)));
			expect(after.filter((r, i) => r.text !== before[i].text).length).toBeGreaterThan(0);
		} finally {
			spy.mockRestore();
		}
	});
});
