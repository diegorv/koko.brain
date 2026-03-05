import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildFootnoteDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin';
import { createMarkdownState } from '../../../test-helpers';

function collectDecos(decoSet: ReturnType<typeof buildFootnoteDecorations>) {
	const result: { from: number; to: number; class?: string; hasWidget: boolean }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			class: (iter.value.spec as { class?: string }).class,
			hasWidget: !!(iter.value.spec as { widget?: unknown }).widget,
		});
		iter.next();
	}
	return result;
}

function buildFootnotes(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildFootnoteDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('footnotePlugin — buildFootnoteDecorations', () => {
	describe('footnote references [^label]', () => {
		it('applies footnote-ref styling when cursor is outside', () => {
			const doc = 'text[^1] more';
			const decos = buildFootnotes(doc, 0);
			const refDecos = decos.filter((d) => d.class === 'cm-lp-footnote-ref');
			expect(refDecos).toHaveLength(1);
			expect(refDecos[0].from).toBe(4); // [^1]
			expect(refDecos[0].to).toBe(8);
		});

		it('shows source when cursor is on the reference', () => {
			const doc = 'text[^1] more';
			const decos = buildFootnotes(doc, 6); // cursor inside [^1]
			const refDecos = decos.filter((d) => d.class === 'cm-lp-footnote-ref');
			expect(refDecos).toHaveLength(0);
		});

		it('handles multiple refs on one line', () => {
			const doc = 'a[^1] b[^2] c';
			const decos = buildFootnotes(doc, doc.length);
			const refDecos = decos.filter((d) => d.class === 'cm-lp-footnote-ref');
			expect(refDecos).toHaveLength(2);
		});
	});

	describe('footnote definitions [^label]:', () => {
		it('applies footnote-def-marker styling when cursor is outside', () => {
			const doc = '[^1]: Definition text\nother line';
			const decos = buildFootnotes(doc, doc.length);
			const defDecos = decos.filter((d) => d.class === 'cm-lp-footnote-def-marker');
			expect(defDecos).toHaveLength(1);
			expect(defDecos[0].from).toBe(0);
			expect(defDecos[0].to).toBe(5); // [^1]:
		});

		it('shows source when cursor is on the definition marker', () => {
			const doc = '[^1]: Definition text\nother line';
			const decos = buildFootnotes(doc, 3); // cursor inside [^1]:
			const defDecos = decos.filter((d) => d.class === 'cm-lp-footnote-def-marker');
			expect(defDecos).toHaveLength(0);
		});
	});

	describe('inline footnotes ^[text]', () => {
		it('hides markers and styles text when cursor is outside', () => {
			const doc = 'hello ^[inline note] world';
			const decos = buildFootnotes(doc, 0);
			// Should have: cm-formatting-inline on ^[ and ], footnote-ref on text
			const marks = decos.filter((d) => d.class === 'cm-formatting-inline');
			const refs = decos.filter((d) => d.class === 'cm-lp-footnote-ref');
			expect(marks).toHaveLength(2); // ^[ and ]
			expect(refs).toHaveLength(1); // inline text
			expect(refs[0].from).toBe(8); // start of "inline note"
			expect(refs[0].to).toBe(19); // end of "inline note"
		});

		it('shows source when cursor is on the inline footnote', () => {
			const doc = 'hello ^[inline note] world';
			const decos = buildFootnotes(doc, 10); // cursor inside text
			// No decorations for this footnote since cursor is on it
			const inlineDecos = decos.filter(
				(d) => d.from >= 6 && d.to <= 20,
			);
			expect(inlineDecos).toHaveLength(0);
		});
	});

	describe('block context skip', () => {
		it('produces no decorations inside fenced code blocks', () => {
			const doc = '```\n[^1] and ^[note]\n```';
			const decos = buildFootnotes(doc, 0);
			expect(decos).toHaveLength(0);
		});
	});

	describe('non-footnote lines', () => {
		it('produces no decorations for plain text', () => {
			const doc = 'just plain text';
			const decos = buildFootnotes(doc, 0);
			expect(decos).toHaveLength(0);
		});
	});
});
