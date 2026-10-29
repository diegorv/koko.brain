// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { EditorSelection, type EditorState, type StateEffect } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import {
	buildInlineDecorations,
	makeInlineFormattingPlugin,
	type NodeHandler,
	type LineHandler,
	type InlineFormattingHandlers,
} from '#lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.js';
import { forceDecorationRebuild } from '#lib/core/markdown-editor/extensions/live-preview/core/effects.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { createMarkdownState } from '../../../test-helpers';

const STAR = Decoration.mark({ class: 'test-marker' });

/** Returns a decoration list as plain objects for assertions. */
function collect(set: DecorationSet) {
	const result: { from: number; to: number; class: string }[] = [];
	const iter = set.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
		iter.next();
	}
	return result;
}

function build(doc: string, handlers: InlineFormattingHandlers, cursor?: number) {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	return collect(buildInlineDecorations(state, [{ from: 0, to: state.doc.length }], handlers));
}

describe('buildInlineDecorations', () => {
	beforeEach(() => {
		settingsStore.reset();
	});

	describe('node handler dispatch', () => {
		it('calls a handler when its nodeType matches a Lezer node', () => {
			const calls: string[] = [];
			const handler: NodeHandler = {
				nodeType: 'StrongEmphasis',
				decorate({ node, decorations }) {
					calls.push(`${node.from}-${node.to}`);
					decorations.push(STAR.range(node.from, node.to));
				},
			};
			const decos = build('**bold** plain', { nodeHandlers: [handler], lineHandlers: [] });
			expect(calls).toEqual(['0-8']);
			expect(decos).toEqual([{ from: 0, to: 8, class: 'test-marker' }]);
		});

		it('does not call a handler whose nodeType matches no Lezer node', () => {
			const calls: number[] = [];
			const handler: NodeHandler = {
				nodeType: 'NoSuchNode',
				decorate() { calls.push(1); },
			};
			build('**bold** plain', { nodeHandlers: [handler], lineHandlers: [] });
			expect(calls).toEqual([]);
		});

		it('dispatches multiple handlers for the same nodeType', () => {
			const seen: string[] = [];
			const handlers: NodeHandler[] = [
				{ nodeType: 'StrongEmphasis', decorate: () => { seen.push('a'); } },
				{ nodeType: 'StrongEmphasis', decorate: () => { seen.push('b'); } },
			];
			build('**bold**', { nodeHandlers: handlers, lineHandlers: [] });
			expect(seen).toEqual(['a', 'b']);
		});

		it('skips nodes inside FencedCode (block-context skip)', () => {
			const calls: string[] = [];
			const handler: NodeHandler = {
				nodeType: 'StrongEmphasis',
				decorate: ({ node }) => calls.push(`${node.from}-${node.to}`),
			};
			// `**bold**` outside a fenced block should match; same syntax inside should NOT.
			const doc = '**outside**\n\n```\n**inside**\n```\n';
			build(doc, { nodeHandlers: [handler], lineHandlers: [] });
			// Only the outside match was dispatched
			expect(calls).toEqual(['0-11']);
		});
	});

	describe('node handler dedup', () => {
		it('processes the same node only once when ranges overlap', () => {
			let count = 0;
			const handler: NodeHandler = {
				nodeType: 'StrongEmphasis',
				decorate: () => { count++; },
			};
			const state = createMarkdownState('**bold**');
			// Two overlapping ranges that both cover the StrongEmphasis node
			buildInlineDecorations(
				state,
				[
					{ from: 0, to: 8 },
					{ from: 0, to: 8 },
				],
				{ nodeHandlers: [handler], lineHandlers: [] },
			);
			expect(count).toBe(1);
		});
	});

	describe('isRevealed / shared reveal rule', () => {
		it('handler receives an isRevealed function that is true for the whole cursor line', () => {
			const seen: boolean[] = [];
			const handler: NodeHandler = {
				nodeType: 'StrongEmphasis',
				decorate({ node, isRevealed }) {
					seen.push(isRevealed(node.from, node.to));
				},
			};
			const doc = '**bold** outside\nnext line';
			// Cursor on the next line
			build(doc, { nodeHandlers: [handler], lineHandlers: [] }, doc.length);
			expect(seen).toEqual([false]);

			// Cursor on the same line but outside the bold range
			build(doc, { nodeHandlers: [handler], lineHandlers: [] }, 12);
			expect(seen).toEqual([false, true]);

			// Cursor inside the bold range
			build(doc, { nodeHandlers: [handler], lineHandlers: [] }, 3);
			expect(seen).toEqual([false, true, true]);
		});

		it('line handlers receive the same predicate', () => {
			const seen: [number, boolean][] = [];
			const handler: LineHandler = {
				name: 'reveal',
				decorate: ({ line, isRevealed }) => seen.push([line.number, isRevealed(line.from, line.to)]),
			};
			build('one\ntwo\nthree', { nodeHandlers: [], lineHandlers: [handler] }, 5);
			expect(seen).toEqual([[1, false], [2, true], [3, false]]);
		});

	});

	describe('line handler dispatch', () => {
		it('dispatches a line handler for every line in range', () => {
			const seen: number[] = [];
			const handler: LineHandler = {
				name: 'count',
				decorate: ({ line }) => seen.push(line.number),
			};
			const doc = 'one\ntwo\nthree';
			build(doc, { nodeHandlers: [], lineHandlers: [handler] });
			expect(seen).toEqual([1, 2, 3]);
		});

		it('skips lines whose content is clearly inside a block context (FencedCode body)', () => {
			const seen: number[] = [];
			const handler: LineHandler = {
				name: 'count',
				decorate: ({ line }) => seen.push(line.number),
			};
			// Line 1: before; line 2: opening fence; lines 3-4: code body;
			// line 5: closing fence; line 6: after
			const doc = 'before\n```\nmiddle\nstill\n```\nafter';
			build(doc, { nodeHandlers: [], lineHandlers: [handler] });
			// Line 3 and 4 sit clearly inside the FencedCode body — skip is reliable.
			// Lines 2 and 5 (the fence markers themselves) live at the boundary
			// where Lezer's resolveInner can land on either side; production
			// handlers don't match anything on those lines anyway, so we don't
			// assert about them here.
			expect(seen).not.toContain(3);
			expect(seen).not.toContain(4);
			expect(seen).toContain(1);
			expect(seen).toContain(6);
		});
	});

	describe('line handler dedup', () => {
		it('runs each line handler at most once per line across overlapping ranges', () => {
			let count = 0;
			const handler: LineHandler = {
				name: 'count',
				decorate: () => { count++; },
			};
			const state = createMarkdownState('one\ntwo\nthree');
			buildInlineDecorations(
				state,
				[
					{ from: 0, to: 13 },
					{ from: 0, to: 13 },
				],
				{ nodeHandlers: [], lineHandlers: [handler] },
			);
			// 3 lines × 1 dispatch each — overlapping ranges shouldn't double-count.
			expect(count).toBe(3);
		});
	});

	describe('empty handlers', () => {
		it('returns an empty decoration set when both registries are empty', () => {
			const decos = build('**bold**\n# heading', { nodeHandlers: [], lineHandlers: [] });
			expect(decos).toEqual([]);
		});

		it('skips line walking entirely when only node handlers are registered', () => {
			// Implementation detail: if lineHandlers is empty, the line loop is skipped.
			// This test passes simply by not throwing — the code path is exercised.
			const decos = build('**bold**', {
				nodeHandlers: [{ nodeType: 'StrongEmphasis', decorate: () => {} }],
				lineHandlers: [],
			});
			expect(decos).toEqual([]);
		});
	});
});

describe('makeInlineFormattingPlugin', () => {
	it('returns a non-null Extension when handlers are empty', () => {
		const ext = makeInlineFormattingPlugin({ nodeHandlers: [], lineHandlers: [] });
		expect(ext).toBeTruthy();
	});

	it('returns a non-null Extension when handlers are populated', () => {
		const handler: NodeHandler = { nodeType: 'StrongEmphasis', decorate: () => {} };
		const ext = makeInlineFormattingPlugin({ nodeHandlers: [handler], lineHandlers: [] });
		expect(ext).toBeTruthy();
	});

	describe('update guard', () => {
		const DOC = 'line one\nline two\nline three';

		afterEach(() => {
			document.body.replaceChildren();
		});

		/** Mounts the plugin with a line handler that counts builds (one call on line 1 per build). */
		function mountPlugin() {
			const counter = { builds: 0 };
			const counting: LineHandler = {
				name: 'count',
				decorate({ line }) {
					if (line.number === 1) counter.builds++;
				},
			};
			const ext = makeInlineFormattingPlugin({ nodeHandlers: [], lineHandlers: [counting] });
			const view = new EditorView({
				state: createMarkdownState(DOC, {
					extensions: [markdown(), ext],
					cursor: 0,
				}),
				parent: document.body.appendChild(document.createElement('div')),
			});
			const value = view.plugin(
				ext as unknown as ViewPlugin<{ update(u: ViewUpdate): void }>,
			);
			if (!value) throw new Error('inline formatting plugin not found on the view');
			return { view, value, counter };
		}

		/** Minimal ViewUpdate stand-in: jsdom never reports a viewport change on its own. */
		function viewportUpdate(
			view: EditorView,
			state: EditorState,
			selectionSet: boolean,
			transaction: { reconfigured: boolean; effects: StateEffect<unknown>[] } = {
				reconfigured: false,
				effects: [],
			},
		): ViewUpdate {
			return {
				view,
				state,
				startState: view.state,
				docChanged: false,
				selectionSet,
				viewportChanged: true,
				transactions: [transaction],
			} as unknown as ViewUpdate;
		}

		it('rebuilds when the selection moves to another line in a viewport-changing update', () => {
			const { view, value, counter } = mountPlugin();
			expect(counter.builds).toBe(1);
			const moved = view.state.update({
				selection: EditorSelection.cursor(DOC.indexOf('line two')),
			}).state;

			value.update(viewportUpdate(view, moved, true));

			expect(counter.builds).toBe(2);
		});

		it('rebuilds on a viewport-changing update carrying forceDecorationRebuild', () => {
			const { view, value, counter } = mountPlugin();

			value.update(
				viewportUpdate(view, view.state, false, {
					reconfigured: false,
					effects: [forceDecorationRebuild.of(null)],
				}),
			);

			expect(counter.builds).toBe(2);
		});

		it('rebuilds on a viewport-changing update carrying a reconfigure', () => {
			const { view, value, counter } = mountPlugin();

			value.update(viewportUpdate(view, view.state, false, { reconfigured: true, effects: [] }));

			expect(counter.builds).toBe(2);
		});

		it('does not rebuild on a pure viewport change', () => {
			const { view, value, counter } = mountPlugin();

			value.update(viewportUpdate(view, view.state, false));

			expect(counter.builds).toBe(1);
		});

		it('does not rebuild when a viewport-changing selection move stays on the same line', () => {
			const { view, value, counter } = mountPlugin();
			const moved = view.state.update({ selection: EditorSelection.cursor(4) }).state;

			value.update(viewportUpdate(view, moved, true));

			expect(counter.builds).toBe(1);
		});
	});
});
