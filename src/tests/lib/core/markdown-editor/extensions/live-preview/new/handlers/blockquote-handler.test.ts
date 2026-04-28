import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { blockquoteHandler } from '$lib/core/markdown-editor/extensions/live-preview/new/handlers/blockquote-handler';
import { buildInlineDecorations } from '$lib/core/markdown-editor/extensions/live-preview/new/inline-formatting-plugin';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
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
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
		iter.next();
	}
	return result;
}

describe('blockquoteHandler', () => {
	beforeEach(() => settingsStore.reset());

	describe('depth-1 blockquote', () => {
		it('emits cm-lp-blockquote line + hidden mark when cursor is away', () => {
			// Cursor on line 3 (plain), away from blockquote on line 1
			const decos = build('> hello\n\nplain', 9);
			const lineDeco = decos.find((d) => d.class === 'cm-lp-blockquote');
			const markDeco = decos.find((d) => d.class === 'cm-formatting-block');
			expect(lineDeco).toBeDefined();
			expect(markDeco).toBeDefined();
		});

		it('reveals the > mark when cursor is on the blockquote line', () => {
			const decos = build('> hello\n\nplain', 3); // cursor inside "hello"
			const markDeco = decos.find((d) => d.class === 'cm-formatting-block cm-formatting-block-visible');
			expect(markDeco).toBeDefined();
		});

		it('mark range covers `> ` (the > plus the trailing space)', () => {
			const decos = build('> hello');
			const markDeco = decos.find((d) => d.class.startsWith('cm-formatting-block'));
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
			const markDecos = decos.filter((d) => d.class.startsWith('cm-formatting-block'));
			expect(lineDecos).toHaveLength(1);
			expect(markDecos).toHaveLength(1);
		});

		it('processes each line of a multi-line blockquote separately', () => {
			const decos = build('> a\n> b\n> c');
			const lineDecos = decos.filter((d) => d.class === 'cm-lp-blockquote');
			expect(lineDecos).toHaveLength(3);
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
	});

	describe('block context skip', () => {
		it('does not decorate a "> looking" line inside a fenced code block', () => {
			const decos = build('```\n> fake\n```');
			expect(decos).toEqual([]);
		});
	});
});
