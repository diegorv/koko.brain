import { describe, it, expect, beforeEach } from 'vitest';
import { Decoration, type DecorationSet, WidgetType } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';

import {
	buildInlineDecorations,
	registerInlineHandler,
	_clearInlineHandlers,
	_inlineHandlersSnapshot,
	replaceWithWidget,
	type InlineHandler,
} from '$lib/core/markdown-editor/extensions/live-preview/new/inline-formatting-plugin';
import { createMarkdownState } from '../../../test-helpers';

/** Collects (from, to, spec) tuples from a DecorationSet for assertions. */
function collectDecos(decoSet: DecorationSet) {
	const result: { from: number; to: number; spec: Record<string, unknown> }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, spec: iter.value.spec as Record<string, unknown> });
		iter.next();
	}
	return result;
}

function buildFull(doc: string, cursor?: number): ReturnType<typeof collectDecos> {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	return collectDecos(buildInlineDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('inlineFormattingPlugin — handler registry', () => {
	beforeEach(() => {
		_clearInlineHandlers();
	});

	describe('registration', () => {
		it('starts empty after clear', () => {
			expect(_inlineHandlersSnapshot()).toHaveLength(0);
		});

		it('stores registered handlers in order', () => {
			const a: InlineHandler = { nodeType: 'EmphasisMark', decorate: () => null };
			const b: InlineHandler = { nodeType: 'CodeMark', decorate: () => null };
			registerInlineHandler(a);
			registerInlineHandler(b);
			expect(_inlineHandlersSnapshot()).toEqual([a, b]);
		});
	});

	describe('dispatch', () => {
		it('returns an empty DecorationSet when no handlers are registered', () => {
			const decos = buildFull('**bold** and *italic*');
			expect(decos).toEqual([]);
		});

		it('invokes a matching handler and emits its decoration', () => {
			registerInlineHandler({
				nodeType: 'EmphasisMark',
				decorate: ({ node }) => ({
					from: node.from,
					to: node.to,
					deco: Decoration.mark({ class: 'test-emph-mark' }),
				}),
			});

			const decos = buildFull('*italic*');
			expect(decos.length).toBeGreaterThan(0);
			for (const d of decos) {
				expect(d.spec.class).toBe('test-emph-mark');
			}
		});

		it('accepts an array return from a handler', () => {
			registerInlineHandler({
				nodeType: 'EmphasisMark',
				decorate: ({ node }) => [
					{ from: node.from, to: node.to, deco: Decoration.mark({ class: 'a' }) },
					{ from: node.from, to: node.to, deco: Decoration.mark({ class: 'b' }) },
				],
			});

			const decos = buildFull('*x*');
			const classes = decos.map((d) => d.spec.class);
			expect(classes.filter((c) => c === 'a')).toHaveLength(2);
			expect(classes.filter((c) => c === 'b')).toHaveLength(2);
		});

		it('ignores handlers that return null / undefined', () => {
			registerInlineHandler({
				nodeType: 'EmphasisMark',
				decorate: () => null,
			});
			registerInlineHandler({
				nodeType: 'CodeMark',
				decorate: () => undefined,
			});

			const decos = buildFull('*x* and `y`');
			expect(decos).toEqual([]);
		});

		it('runs multiple handlers for the same node in registration order', () => {
			const calls: string[] = [];
			registerInlineHandler({
				nodeType: 'EmphasisMark',
				decorate: () => {
					calls.push('first');
					return null;
				},
			});
			registerInlineHandler({
				nodeType: 'EmphasisMark',
				decorate: () => {
					calls.push('second');
					return null;
				},
			});

			buildFull('*x*');
			// EmphasisMark appears twice (opening + closing *), each triggers both handlers
			expect(calls).toEqual(['first', 'second', 'first', 'second']);
		});
	});

	describe('block context skip', () => {
		it('skips nodes inside fenced code blocks', () => {
			registerInlineHandler({
				nodeType: 'EmphasisMark',
				decorate: ({ node }) => ({
					from: node.from,
					to: node.to,
					deco: Decoration.mark({ class: 'touched' }),
				}),
			});

			const decos = buildFull('```\n*not italic*\n```');
			expect(decos).toEqual([]);
		});

		it('still emits for nodes outside block contexts', () => {
			registerInlineHandler({
				nodeType: 'EmphasisMark',
				decorate: ({ node }) => ({
					from: node.from,
					to: node.to,
					deco: Decoration.mark({ class: 'outside' }),
				}),
			});

			const decos = buildFull('*outside*\n```\n*inside*\n```');
			expect(decos.length).toBe(2); // opening + closing mark of "*outside*"
			for (const d of decos) {
				expect(d.spec.class).toBe('outside');
			}
		});
	});

	describe('isTouched helper', () => {
		it('returns true when cursor is inside the queried range', () => {
			const seen: boolean[] = [];
			registerInlineHandler({
				nodeType: 'EmphasisMark',
				decorate: ({ node, isTouched }) => {
					// Query the parent Emphasis span — that's the legacy cursor-reveal contract
					const parent = node.node.parent;
					if (!parent) return null;
					seen.push(isTouched(parent.from, parent.to));
					return null;
				},
			});

			buildFull('*cursor*', 2);
			// Cursor at 2 is inside Emphasis [0, 8], so both mark visits see true.
			for (const t of seen) {
				expect(t).toBe(true);
			}
		});

		it('returns false when cursor is far from the queried range', () => {
			const seen: boolean[] = [];
			registerInlineHandler({
				nodeType: 'EmphasisMark',
				decorate: ({ node, isTouched }) => {
					const parent = node.node.parent;
					if (!parent) return null;
					seen.push(isTouched(parent.from, parent.to));
					return { from: node.from, to: node.to, deco: Decoration.mark({ class: 'x' }) };
				},
			});

			const doc = 'x '.repeat(100) + '*far*';
			buildFull(doc, 0);
			expect(seen.length).toBeGreaterThan(0);
			for (const t of seen) {
				expect(t).toBe(false);
			}
		});

		it('covers the node range when handlers pass node.from/node.to', () => {
			const seen: boolean[] = [];
			registerInlineHandler({
				nodeType: 'EmphasisMark',
				decorate: ({ node, isTouched }) => {
					seen.push(isTouched(node.from, node.to));
					return null;
				},
			});

			// Cursor at 0: overlaps opening mark [0, 1] but not closing mark [7, 8]
			buildFull('*cursor*', 0);
			expect(seen).toEqual([true, false]);
		});
	});
});

describe('replaceWithWidget helper', () => {
	beforeEach(() => {
		_clearInlineHandlers();
	});

	it('produces a replace decoration entry pointing at the widget', () => {
		class NoopWidget extends WidgetType {
			toDOM() {
				// Node may run without a DOM; return a minimal placeholder type-only
				return { nodeType: 1 } as unknown as HTMLElement;
			}
		}

		const widget = new NoopWidget();
		const entry = replaceWithWidget(5, 10, widget);
		expect(entry.from).toBe(5);
		expect(entry.to).toBe(10);
		expect((entry.deco.spec as { widget?: unknown }).widget).toBe(widget);
	});

	it('accepts the block option', () => {
		class NoopWidget extends WidgetType {
			toDOM() {
				return { nodeType: 1 } as unknown as HTMLElement;
			}
		}

		const widget = new NoopWidget();
		const entry = replaceWithWidget(0, 5, widget, { block: true });
		expect((entry.deco.spec as { block?: boolean }).block).toBe(true);
	});
});
