import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { blockquoteHandler } from '#lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.js';
import { listMarkHandler } from '#lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.js';
import { UnorderedListMarkerWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { buildInlineDecorations } from '#lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { createMarkdownState } from '../../../../test-helpers';

interface DecoSpec { from: number; to: number; class: string }

function build(doc: string, cursor?: number): DecoSpec[] {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	const set = buildInlineDecorations(
		state,
		[{ from: 0, to: state.doc.length }],
		{ nodeHandlers: [blockquoteHandler], lineHandlers: [] },
	);
	const result: DecoSpec[] = [];
	const iter = set.iter();
	while (iter.value) {
		// A point decoration spanning text is a `Decoration.replace`: the syntax is
		// removed from the DOM, reported here as the `replace` sentinel class.
		const cls = iter.value.point && iter.from < iter.to ? 'replace' : (iter.value.spec as { class: string }).class;
		result.push({ from: iter.from, to: iter.to, class: cls });
		iter.next();
	}
	return result;
}

describe('blockquoteHandler', () => {
	beforeEach(() => settingsStore.reset());

	describe('depth-1 blockquote', () => {
		it('emits cm-lp-blockquote line + replaces the > mark when cursor is away', () => {
			// Cursor on line 3 (plain), away from blockquote on line 1
			const decos = build('> hello\n\nplain', 9);
			const lineDeco = decos.find((d) => d.class === 'cm-lp-blockquote');
			const markDeco = decos.find((d) => d.class === 'replace');
			expect(lineDeco).toBeDefined();
			expect(markDeco).toBeDefined();
			expect(decos.find((d) => d.class === 'cm-formatting-block')).toBeUndefined();
		});

		it('reveals the > mark with no replace when cursor is on the blockquote line', () => {
			const decos = build('> hello\n\nplain', 3); // cursor inside "hello"
			expect(decos.filter((d) => d.class === 'replace')).toEqual([]);
			const markDeco = decos.find((d) => d.class === 'cm-formatting-block');
			expect(markDeco).toBeDefined();
		});

		it('hidden range covers `> ` (the > plus the trailing space)', () => {
			const decos = build('> hello\n\nplain', 9);
			const markDeco = decos.find((d) => d.class === 'replace');
			expect(markDeco).toBeDefined();
			expect(markDeco!.from).toBe(0);
			expect(markDeco!.to).toBe(2);
		});
	});

	describe('depth-2 and depth-3 blockquotes', () => {
		it('depth 2 → cm-lp-blockquote-2', () => {
			const decos = build('> > nested');
			const lineDeco = decos.find((d) => d.class === 'cm-lp-blockquote-2');
			expect(lineDeco).toBeDefined();
		});

		it('depth 3 → cm-lp-blockquote-3', () => {
			const decos = build('> > > deep');
			const lineDeco = decos.find((d) => d.class === 'cm-lp-blockquote-3');
			expect(lineDeco).toBeDefined();
		});

		it('depth 4+ collapses to cm-lp-blockquote-3', () => {
			const decos = build('> > > > deeper');
			const lineDeco = decos.find((d) => d.class === 'cm-lp-blockquote-3');
			expect(lineDeco).toBeDefined();
		});
	});

	describe('per-line dedup', () => {
		it('processes each blockquote line exactly once even though QuoteMark fires per `>`', () => {
			// `> > nested` has 2 QuoteMark nodes on the same line. The handler must
			// produce exactly 2 decorations (1 line + 1 mark), not 4.
			const decos = build('> > nested');
			const lineDecos = decos.filter((d) => d.class.startsWith('cm-lp-blockquote'));
			const markDecos = decos.filter((d) => d.class === 'replace' || d.class === 'cm-formatting-block');
			expect(lineDecos).toHaveLength(1);
			expect(markDecos).toHaveLength(1);
		});

		it('processes each line of a multi-line blockquote separately', () => {
			const decos = build('> a\n> b\n> c');
			const lineDecos = decos.filter((d) => d.class === 'cm-lp-blockquote');
			expect(lineDecos).toHaveLength(3);
		});
	});

	describe('blockquote inside a list item', () => {
		/** Builds with the list-mark handler too, as production does. */
		function buildWithList(doc: string, cursor: number) {
			const state = createMarkdownState(doc).update({ selection: EditorSelection.single(cursor) }).state;
			const set = buildInlineDecorations(
				state,
				[{ from: 0, to: state.doc.length }],
				{ nodeHandlers: [blockquoteHandler, listMarkHandler], lineHandlers: [] },
			);
			const out: { from: number; to: number; widget: unknown }[] = [];
			const iter = set.iter();
			while (iter.value) {
				out.push({ from: iter.from, to: iter.to, widget: iter.value.spec.widget });
				iter.next();
			}
			return out;
		}

		it('`- > quote` keeps its bullet: the hidden `> ` starts at the QuoteMark, not the line start', () => {
			const doc = '- > quote\n\nplain';
			const decos = buildWithList(doc, doc.length);
			const bullet = decos.find((d) => d.widget instanceof UnorderedListMarkerWidget);
			expect(bullet).toEqual({ from: 0, to: 2, widget: expect.any(UnorderedListMarkerWidget) });
			// The only other range decoration is the hidden `> `, after the bullet
			const otherRanges = decos.filter((d) => d !== bullet && d.to > d.from);
			expect(otherRanges.map(({ from, to }) => ({ from, to }))).toEqual([{ from: 2, to: 4 }]);
		});
	});

	describe('callout exclusion', () => {
		it('does not decorate `> [!note]` callout lines', () => {
			const decos = build('> [!note] callout body');
			expect(decos).toEqual([]);
		});

		it('decorates plain blockquote lines but not the callout sibling', () => {
			const decos = build('> regular\n\n> [!warning] callout');
			const lineDecos = decos.filter((d) => d.class === 'cm-lp-blockquote');
			expect(lineDecos).toHaveLength(1);
			expect(lineDecos[0].from).toBe(0); // line 1 ("> regular")
		});

		it('leaves callout content lines to the callout field (one style, not blockquote + callout)', () => {
			const decos = build('> [!note] Title\n> body\n> more\n\nplain', 30);
			expect(decos).toEqual([]);
		});

		it('leaves a nested `> > [!note]` callout to the callout field', () => {
			const doc = '> quote\n> > [!note] Inner\n> > body\n\nplain';
			const decos = build(doc, doc.length);
			const lineDecos = decos.filter((d) => d.class.startsWith('cm-lp-blockquote'));
			expect(lineDecos.map((d) => d.from)).toEqual([0]); // only "> quote"
		});
	});

	describe('block context skip', () => {
		it('does not decorate a "> looking" line inside a fenced code block', () => {
			const decos = build('```\n> fake\n```');
			expect(decos).toEqual([]);
		});
	});
});
