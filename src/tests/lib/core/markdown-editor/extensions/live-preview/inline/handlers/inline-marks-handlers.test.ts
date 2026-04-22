import { describe, it, expect, beforeEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';

import {
	buildInlineDecorations,
	registerInlineHandler,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin';
import { inlineMarksHandlers } from '$lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-marks-handlers';
import { createMarkdownState } from '../../../../test-helpers';

function collect(decoSet: DecorationSet) {
	const result: { from: number; to: number; class: string | undefined }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			class: (iter.value.spec as { class?: string }).class,
		});
		iter.next();
	}
	return result;
}

function build(doc: string, cursor?: number) {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	return collect(buildInlineDecorations(state, [{ from: 0, to: state.doc.length }]));
}

describe('inlineMarksHandlers', () => {
	beforeEach(() => {
		_clearInlineHandlers();
		for (const h of inlineMarksHandlers) registerInlineHandler(h);
	});

	describe('EmphasisMark', () => {
		it('emits cm-formatting-inline on each * when cursor is elsewhere', () => {
			const decos = build('text *italic* text\nnext', 20);
			const marks = decos.filter((d) => d.class === 'cm-formatting-inline');
			expect(marks.length).toBe(2);
		});

		it('upgrades to -visible when cursor is inside the parent Emphasis span', () => {
			const decos = build('text *italic* text', 8); // inside the emphasis
			const visible = decos.filter(
				(d) => d.class === 'cm-formatting-inline cm-formatting-inline-visible',
			);
			expect(visible.length).toBe(2);
		});

		it('handles ** (bold) marks — each ** pair is one EmphasisMark', () => {
			const decos = build('**bold** text\nnext', 16);
			// Two EmphasisMark nodes: the opening ** and the closing **
			const marks = decos.filter((d) => d.class === 'cm-formatting-inline');
			expect(marks.length).toBe(2);
			expect(marks[0].to - marks[0].from).toBe(2); // spans both asterisks
		});
	});

	describe('CodeMark', () => {
		it('emits cm-formatting-inline on each ` when cursor is elsewhere', () => {
			const decos = build('hello `code` world\nnext', 20);
			const marks = decos.filter((d) => d.class === 'cm-formatting-inline');
			expect(marks.length).toBe(2);
		});
	});

	describe('StrikethroughMark', () => {
		it('emits cm-formatting-inline on each ~~ when cursor is elsewhere', () => {
			const decos = build('hello ~~gone~~ world\nnext', 22);
			const marks = decos.filter((d) => d.class === 'cm-formatting-inline');
			expect(marks.length).toBe(2);
		});
	});

	describe('HighlightMark', () => {
		it('emits cm-formatting-inline on each == when cursor is elsewhere', () => {
			const decos = build('hello ==big== world\nnext', 22);
			const marks = decos.filter((d) => d.class === 'cm-formatting-inline');
			expect(marks.length).toBe(2);
		});
	});

	describe('Escape', () => {
		it('hides the backslash when cursor is outside the Escape node', () => {
			// Cursor at pos 10 which is outside "\\*" (positions 5-7)
			const decos = build('text \\* more stuff', 10);
			const mark = decos.find((d) => d.class === 'cm-formatting-inline' && d.from === 5);
			expect(mark).toBeDefined();
			expect(mark!.to).toBe(6); // only the backslash
		});

		it('reveals the backslash when cursor is on the escape', () => {
			const decos = build('text \\* more stuff', 6);
			const revealed = decos.find(
				(d) => d.class === 'cm-formatting-inline cm-formatting-inline-visible',
			);
			expect(revealed).toBeDefined();
		});
	});

	describe('block context skip', () => {
		it('does not emit marks inside fenced code blocks', () => {
			expect(build('```\n*not italic* `not code`\n```')).toEqual([]);
		});
	});
});
