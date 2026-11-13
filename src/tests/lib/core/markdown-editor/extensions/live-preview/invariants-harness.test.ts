// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import { Compartment, EditorSelection, type EditorState } from '@codemirror/state';
import { EditorView, type Decoration, type DecorationSet } from '@codemirror/view';
import { syntaxHighlighting, syntaxTree } from '@codemirror/language';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve([])),
}));

vi.mock('mermaid', () => ({
	default: {
		initialize: vi.fn(),
		parse: vi.fn(async () => true),
		render: vi.fn(async () => ({ svg: '<svg></svg>' })),
	},
}));

vi.mock('#lib/utils/log.service.js', () => ({ appendLog: vi.fn() }));

/**
 * No construct in the corpus makes a production inline handler throw any more,
 * so the highlight handler throws on one sentinel: the invariant that a handler
 * failure never disables the inline pipeline needs a failure to observe.
 */
const { HANDLER_FAULT } = vi.hoisted(() => ({ HANDLER_FAULT: '==handler-fault==' }));
vi.mock(
	'#lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.js',
	async (importOriginal) => {
		const real = await importOriginal<
			typeof import('#lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.js')
		>();
		return {
			highlightHandler: {
				...real.highlightHandler,
				decorate(args: Parameters<typeof real.highlightHandler.decorate>[0]) {
					if (args.state.sliceDoc(args.node.from, args.node.to) === HANDLER_FAULT) {
						throw new RangeError('injected handler fault');
					}
					real.highlightHandler.decorate(args);
				},
			},
		};
	},
);

import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { forceDecorationRebuild } from '#lib/core/markdown-editor/extensions/live-preview/core/effects.js';
import { mouseSelectingField } from '#lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.js';
import {
	frontmatterEnd,
	frontmatterField,
} from '#lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.js';
import { touchedLines } from '#lib/core/markdown-editor/extensions/live-preview/core/reveal.js';
import { markdownLanguage, markdownHighlight } from '#lib/core/markdown-editor/highlight-styles.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { createMarkdownState, withFullParse } from '../../test-helpers';

/**
 * Invariants checked over the whole live-preview extension stack, on a fixed
 * corpus: one help file per block kind plus edge documents taken from past
 * fixes (`fixtures/edge-corpus.md`). Running all help files does not fit the
 * runtime budget, so the corpus is a fixed list.
 */

const HELP_DIR = 'help/examples/markdown-editor-vault';
const HELP_FILES = [
	'02-headings.md',
	'03-lists.md',
	'04-blockquotes.md',
	'05-callouts.md',
	'06-links.md',
	'08-images.md',
	'09-code-blocks.md',
	'10-tables.md',
	'12-footnotes.md',
	'13-comments.md',
	'15-hard-breaks.md',
	'16-math.md',
	'17-mermaid.md',
	'19-meta-bind.md',
	'20-collection.md',
	'22-queryjs.md',
];

/** Boundary lines visited per document; bounds the runtime on long help files. */
const MAX_BOUNDARIES = 10;

/** Edge documents, one per `@@@ <name>` header line. */
function edgeCorpus(): [string, string][] {
	const raw = readFileSync(
		'src/tests/lib/core/markdown-editor/extensions/live-preview/fixtures/edge-corpus.md',
		'utf8',
	);
	const parts = raw.split(/^@@@ (.+)\n/m).slice(1);
	const docs: [string, string][] = [];
	for (let i = 0; i < parts.length; i += 2) docs.push([`edge: ${parts[i]}`, parts[i + 1]]);
	return docs;
}

/**
 * A line long enough for CodeMirror to draw it with a line gap, which splits
 * the visible ranges in two. Expanded by 2000 chars they overlap, the case
 * the per-source duplicate check exists for; jsdom otherwise reports one range.
 */
const SPLIT_VIEWPORT_DOC = `plain\n\n${'**bold** and ==mark== '.repeat(200)}\n\nafter **bold**\n`;

const CORPUS: [string, string][] = [
	...HELP_FILES.map((f): [string, string] => [f, readFileSync(`${HELP_DIR}/${f}`, 'utf8')]),
	...edgeCorpus(),
	['generated: a line gap splits the viewport', SPLIT_VIEWPORT_DOC],
];

/** Reconfigured by the scroll step, so that transaction carries `reconfigured`. */
const probe = new Compartment();

function extensions() {
	return [
		markdownLanguage(),
		syntaxHighlighting(markdownHighlight),
		livePreviewExtensions({}),
		probe.of([]),
	];
}

function mount(state: EditorState): EditorView {
	return new EditorView({ state, parent: document.body.appendChild(document.createElement('div')) });
}

/** One decoration flattened to what the invariants compare. */
interface Deco {
	from: number;
	to: number;
	kind: 'mark' | 'line' | 'replace' | 'widget';
	cls: string;
	widget: string;
}

/**
 * Every decoration source of the view, in facet order. A ViewPlugin provides
 * its set as a function of the view, a StateField as the set itself.
 */
function decorationSources(view: EditorView): Deco[][] {
	return view.state
		.facet(EditorView.decorations)
		.map((d) => flatten(typeof d === 'function' ? d(view) : d));
}

function flatten(set: DecorationSet): Deco[] {
	const out: Deco[] = [];
	for (const it = set.iter(); it.value; it.next()) {
		const value: Decoration = it.value;
		// `isReplace` is set on CodeMirror's PointDecoration (replace vs widget); it is not
		// part of the public type.
		const isReplace = (value as unknown as { isReplace?: boolean }).isReplace === true;
		const kind = value.point ? (isReplace ? 'replace' : 'widget') : it.from === it.to ? 'line' : 'mark';
		out.push({
			from: it.from,
			to: it.to,
			kind,
			cls: (value.spec.class as string | undefined) ?? '',
			widget: value.spec.widget?.constructor.name ?? '',
		});
	}
	return out;
}

function keyOf(d: Deco): string {
	return `${d.kind}:${d.from}-${d.to}:${d.cls}:${d.widget}`;
}

/**
 * Keys of every decoration (tagged by source index) clipped to `ranges`. Clipping
 * keeps a mark that one view cuts at its viewport edge comparable with the
 * same mark the other view extends past it.
 */
function keysWithin(view: EditorView, ranges: readonly { from: number; to: number }[]): string[] {
	const keys = new Set<string>();
	decorationSources(view).forEach((source, i) => {
		for (const d of source) {
			for (const r of ranges) {
				const from = Math.max(d.from, r.from);
				const to = Math.min(d.to, r.to);
				if (from < to || (from === to && d.from === d.to)) keys.add(`${i}|${keyOf({ ...d, from, to })}`);
			}
		}
	});
	return [...keys].sort();
}

function intersect(
	a: readonly { from: number; to: number }[],
	b: readonly { from: number; to: number }[],
): { from: number; to: number }[] {
	const out: { from: number; to: number }[] = [];
	for (const x of a) {
		for (const y of b) {
			const from = Math.max(x.from, y.from);
			const to = Math.min(x.to, y.to);
			if (from <= to) out.push({ from, to });
		}
	}
	return out;
}

/**
 * Decorations of `view` equal those of a view freshly mounted on `state`,
 * compared inside the visible ranges both views share (jsdom viewports vary).
 */
function diffAgainstFresh(view: EditorView, state: EditorState, within?: { from: number; to: number }): string[] {
	const fresh = mount(state);
	try {
		const shared = intersect(view.visibleRanges, fresh.visibleRanges);
		const ranges = within ? intersect(shared, [within]) : shared;
		const live = keysWithin(view, ranges);
		const expected = keysWithin(fresh, ranges);
		const missing = expected.filter((k) => !live.includes(k));
		const extra = live.filter((k) => !expected.includes(k));
		return [...missing.map((k) => `missing ${k}`), ...extra.map((k) => `extra ${k}`)];
	} finally {
		fresh.destroy();
	}
}

/** Line numbers `[first, last]` a decoration covers (a range ending at a line start stops before it). */
function linesOf(state: EditorState, d: Deco): [number, number] {
	const first = state.doc.lineAt(d.from).number;
	const end = state.doc.lineAt(d.to);
	return [first, d.to > d.from && end.from === d.to ? end.number - 1 : end.number];
}

/** True when `pos` sits strictly inside a `FencedCode` node (past its first character). */
function insideFencedCode(state: EditorState, pos: number): boolean {
	for (let node: ReturnType<typeof syntaxTree>['topNode'] | null = syntaxTree(state).resolveInner(pos, 1); node; node = node.parent) {
		if (node.name === 'FencedCode' && node.from < pos) return true;
	}
	return false;
}

/** Invariants that hold after every step. Returns one message per violation. */
function checkInvariants(view: EditorView): string[] {
	const state = view.state;
	const problems: string[] = [];
	const dragging = state.field(mouseSelectingField, false);
	const touched = touchedLines(state);
	const sources = decorationSources(view);
	// Frontmatter is hidden whatever the selection (properties live in the sidebar).
	const frontmatter = state.facet(EditorView.decorations).indexOf(state.field(frontmatterField, false)!);

	sources.forEach((source, i) => {
		const seen = new Set<string>();
		for (const d of source) {
			// One source never emits the same mark twice (overlapping expanded ranges).
			if (d.kind === 'mark') {
				const key = keyOf(d);
				if (seen.has(key)) problems.push(`source ${i} duplicates ${key}`);
				seen.add(key);
			}
			// Lines the selection touches show their syntax.
			if (!dragging && i !== frontmatter && d.kind === 'replace' && !d.widget) {
				const [first, last] = linesOf(state, d);
				if (touched.some((t) => t.first <= last && t.last >= first)) {
					problems.push(`source ${i} hides syntax on a touched line: ${keyOf(d)}`);
				}
			}
			// Inside a fence only the code-block widget decorates.
			if (d.widget && d.widget !== 'CodeBlockWidget' && insideFencedCode(state, d.from)) {
				problems.push(`source ${i} puts ${d.widget} inside a FencedCode at ${d.from}`);
			}
		}
	});
	return problems;
}

/**
 * First and last line of every top-level block, spread evenly down to
 * `MAX_BOUNDARIES` lines.
 */
function boundaryLines(state: EditorState): number[] {
	const lines = new Set<number>();
	for (let node = syntaxTree(state).topNode.firstChild; node; node = node.nextSibling) {
		lines.add(state.doc.lineAt(node.from).number);
		lines.add(state.doc.lineAt(node.to).number);
	}
	const all = [...lines].sort((a, b) => a - b);
	if (all.length <= MAX_BOUNDARIES) return all;
	const step = all.length / MAX_BOUNDARIES;
	return Array.from({ length: MAX_BOUNDARIES }, (_, i) => all[Math.floor(i * step)]);
}

function mouse(type: string, target: EventTarget): void {
	target.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0 }));
}

/**
 * Every console.error call, as its first argument. CodeMirror reports a crashed
 * ViewPlugin and an exception thrown inside a DOM event handler (or a dispatch
 * from one) through `console.error`, so any call is a problem.
 */
function consoleErrors(spy: { mock: { calls: unknown[][] } }): string[] {
	return spy.mock.calls.map((args) => `console.error: ${String(args[0])}`);
}

/** Mousedown on the content, which must arm the drag flag `afterRelease` checks. */
function pressMouse(view: EditorView): string[] {
	mouse('mousedown', view.contentDOM);
	return view.state.field(mouseSelectingField, false) ? [] : ['drag flag not set by mousedown'];
}

/** A step of the scripted sequence: acts on the view, returns extra violations. */
type Step = (view: EditorView, lineNo: number) => string[] | void;

/** The selection `[line before lineNo start, lineNo start)`: must not reveal line `lineNo`. */
function endsAtLineStart(view: EditorView, lineNo: number): string[] | void {
	if (lineNo < 2) return;
	// A `select` range that starts in the hidden frontmatter is clamped to the
	// body start by `frontmatterGuard`, while `earlier` below is built with an
	// unfiltered `state.update`, so the two selections differ and the check
	// would compare unlike states.
	const hiddenEnd = frontmatterEnd(view.state);
	if (hiddenEnd !== null && view.state.doc.line(lineNo - 1).from <= hiddenEnd) return;
	const target = view.state.doc.line(lineNo);
	const from = view.state.doc.line(lineNo - 1).from;
	view.dispatch({ selection: EditorSelection.single(from, target.from), userEvent: 'select' });
	// The same selection ending one character earlier touches the same lines.
	const earlier = view.state.update({ selection: EditorSelection.single(from, target.from - 1) }).state;
	return diffAgainstFresh(view, earlier, { from: target.from, to: target.to }).map(
		(p) => `line ${lineNo} revealed by a range ending at its start: ${p}`,
	);
}

/** Releases after a drag must leave the view as a fresh mount would. */
function afterRelease(view: EditorView): string[] {
	if (view.state.field(mouseSelectingField, false)) return ['drag flag still set after release'];
	return diffAgainstFresh(view, view.state).map((p) => `after release vs fresh view: ${p}`);
}

const STEPS: [string, Step][] = [
	[
		'type a character',
		(view, lineNo) => {
			const pos = view.state.doc.line(lineNo).from;
			withFullParse(() => view.dispatch({ changes: { from: pos, insert: 'x' }, userEvent: 'input.type' }));
			const typed = checkInvariants(view).map((p) => `(typed) ${p}`);
			withFullParse(() => view.dispatch({ changes: { from: pos, to: pos + 1 }, userEvent: 'delete' }));
			return typed;
		},
	],
	['select a range ending at a line start', endsAtLineStart],
	[
		'triple-click range',
		(view, lineNo) => {
			const doc = view.state.doc;
			const line = doc.line(lineNo);
			view.dispatch({
				selection: EditorSelection.single(line.from, Math.min(line.to + 1, doc.length)),
				userEvent: 'select.pointer',
			});
		},
	],
	[
		'mousedown, then mouseup outside the editor',
		(view, lineNo) => {
			const pressed = pressMouse(view);
			const line = view.state.doc.line(lineNo);
			view.dispatch({ selection: EditorSelection.single(line.from, line.to), userEvent: 'select.pointer' });
			mouse('mouseup', document.body.appendChild(document.createElement('div')));
			return [...pressed, ...afterRelease(view)];
		},
	],
	[
		'native drag (mousedown, dragstart, drop, dragend)',
		(view) => {
			const pressed = pressMouse(view);
			// jsdom has no DragEvent; CodeMirror's drag handlers only read dataTransfer when present.
			for (const type of ['dragstart', 'drop', 'dragend']) {
				view.contentDOM.dispatchEvent(new Event(type, { bubbles: true }));
			}
			return [...pressed, ...afterRelease(view)];
		},
	],
	['forceDecorationRebuild', (view) => view.dispatch({ effects: forceDecorationRebuild.of(null) })],
	[
		'scroll with a reconfigure',
		(view, lineNo) => {
			view.dispatch({
				effects: [EditorView.scrollIntoView(view.state.doc.line(lineNo).from, { y: 'start' }), probe.reconfigure([])],
			});
		},
	],
];

describe('live-preview invariants over the markdown corpus (jsdom)', () => {
	let errors: ReturnType<typeof vi.spyOn>;
	let previousPolicy: typeof settingsStore.queryjs.autoRunQueries;

	beforeAll(() => {
		// No user script may run in jsdom.
		previousPolicy = settingsStore.queryjs.autoRunQueries;
		settingsStore.updateQueryjs({ autoRunQueries: 'manual' });
		// jsdom has no layout; CodeMirror's mousedown handler measures the selection,
		// so give Range the geometry an unrendered element reports.
		Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
		Range.prototype.getBoundingClientRect ??= () => new DOMRect();
	});

	afterAll(() => {
		settingsStore.updateQueryjs({ autoRunQueries: previousPolicy });
	});

	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = '';
	});

	// A corpus file walks every boundary line through every step: under 1 s alone,
	// 6 s seen under a full suite on a loaded machine, past vitest's 5 s default.
	it.each(CORPUS)('%s', { timeout: 30_000 }, (_name, doc) => {
		errors = vi.spyOn(console, 'error').mockImplementation(() => {});
		const problems: string[] = [];
		let view: EditorView;
		try {
			view = mount(createMarkdownState(doc, { cursor: 0, extensions: extensions() }));
		} catch (error) {
			expect.fail(`mount threw: ${String(error)}`);
		}
		const record = (where: string, found: string[]) => {
			for (const p of found) problems.push(`${where}: ${p}`);
			for (const p of consoleErrors(errors)) problems.push(`${where}: ${p}`);
			errors.mockClear();
		};
		try {
			record('mount', checkInvariants(view));
			for (const lineNo of boundaryLines(view.state)) {
				view.dispatch({ selection: { anchor: view.state.doc.line(lineNo).from } });
				record(`L${lineNo} cursor`, checkInvariants(view));
				for (const [label, step] of STEPS) {
					const where = `L${lineNo} ${label}`;
					try {
						const extra = step(view, lineNo) ?? [];
						record(where, [...extra, ...checkInvariants(view)]);
					} catch (error) {
						record(where, [`threw ${String(error)}`]);
					}
				}
			}
		} finally {
			view.destroy();
		}
		expect(problems).toEqual([]);
	});

	it('mounting and destroying callout, table and meta-bind widgets leaves no document listener', () => {
		const doc = [
			'---',
			'done: false',
			'status: todo',
			'---',
			'plain',
			'',
			'> [!note] Title',
			'> body',
			'',
			'| a | b |',
			'| - | - |',
			'| 1 | 2 |',
			'',
			'Toggle: `INPUT[toggle():done]`',
			'',
			'Status: `INPUT[inlineSelect(todo, done):status]`',
			'',
		].join('\n');
		const state = createMarkdownState(doc, { cursor: doc.indexOf('plain'), extensions: extensions() });
		const add = vi.spyOn(document, 'addEventListener');
		const remove = vi.spyOn(document, 'removeEventListener');

		const view = mount(state);
		const widgets = new Set(decorationSources(view).flat().map((d) => d.widget));
		view.destroy();

		for (const name of ['CalloutTypeSwitcherWidget', 'TableWidget', 'MetaBindToggleWidget', 'MetaBindSelectWidget']) {
			expect(widgets.has(name), `${name} in ${[...widgets].join(',')}`).toBe(true);
		}
		// Every (type, listener, capture) added during the mount is removed by the destroy:
		// the browser removes a listener only when the capture flag matches.
		const live = new Map<unknown, Map<string, number>>();
		const bump = (type: string, listener: unknown, options: unknown, by: number) => {
			const capture = typeof options === 'boolean' ? options : !!(options as EventListenerOptions | undefined)?.capture;
			const key = capture ? `${type} (capture)` : type;
			const byType = live.get(listener) ?? new Map<string, number>();
			byType.set(key, (byType.get(key) ?? 0) + by);
			live.set(listener, byType);
		};
		for (const [type, listener, options] of add.mock.calls) bump(type, listener, options, 1);
		for (const [type, listener, options] of remove.mock.calls) bump(type, listener, options, -1);
		const leaked = [...live.values()].flatMap((byType) =>
			[...byType].filter(([, n]) => n > 0).map(([type]) => type),
		);
		expect(leaked).toEqual([]);
	});
});
