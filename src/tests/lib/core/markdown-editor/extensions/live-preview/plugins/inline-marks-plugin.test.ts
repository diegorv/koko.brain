import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildMarkVisibilityForRanges } from '$lib/core/markdown-editor/extensions/live-preview/plugins/inline-marks-plugin';
import { createMarkdownState } from '../../../test-helpers';

/** Collects decoration specs from a DecorationSet for assertions */
function collectDecos(decoSet: ReturnType<typeof buildMarkVisibilityForRanges>) {
	const result: { from: number; to: number; class: string }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
		iter.next();
	}
	return result;
}

/** Creates state with cursor at given position and returns mark decorations for full doc */
function buildMarks(doc: string, cursor?: number) {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	return collectDecos(buildMarkVisibilityForRanges(state, [{ from: 0, to: state.doc.length }]));
}

describe('inlineMarksPlugin — buildMarkVisibilityForRanges', () => {
	describe('bold marks (**)', () => {
		it('hides marks when cursor is outside', () => {
			const decos = buildMarks('hello **bold** world', 0);
			// 2 marks: ** at 6-8 and ** at 12-14
			expect(decos).toHaveLength(2);
			expect(decos[0]).toEqual({ from: 6, to: 8, class: 'cm-formatting-inline' });
			expect(decos[1]).toEqual({ from: 12, to: 14, class: 'cm-formatting-inline' });
		});

		it('shows marks when cursor is inside bold text', () => {
			const decos = buildMarks('**bold**', 4); // cursor inside "bold"
			expect(decos).toHaveLength(2);
			expect(decos[0].class).toBe('cm-formatting-inline cm-formatting-inline-visible');
			expect(decos[1].class).toBe('cm-formatting-inline cm-formatting-inline-visible');
		});

		it('shows marks when cursor is on the mark itself', () => {
			const decos = buildMarks('**bold**', 1); // cursor on opening **
			expect(decos[0].class).toBe('cm-formatting-inline cm-formatting-inline-visible');
		});
	});

	describe('italic marks (*)', () => {
		it('hides marks when cursor is outside', () => {
			const decos = buildMarks('hello *italic* world', 0);
			expect(decos).toHaveLength(2);
			expect(decos[0]).toEqual({ from: 6, to: 7, class: 'cm-formatting-inline' });
			expect(decos[1]).toEqual({ from: 13, to: 14, class: 'cm-formatting-inline' });
		});

		it('shows marks when cursor is inside', () => {
			const decos = buildMarks('*italic*', 4);
			expect(decos[0].class).toBe('cm-formatting-inline cm-formatting-inline-visible');
		});
	});

	describe('strikethrough marks (~~)', () => {
		it('hides marks when cursor is outside', () => {
			const decos = buildMarks('hello ~~strike~~ world', 0);
			expect(decos).toHaveLength(2);
			expect(decos[0]).toEqual({ from: 6, to: 8, class: 'cm-formatting-inline' });
			expect(decos[1]).toEqual({ from: 14, to: 16, class: 'cm-formatting-inline' });
		});

		it('shows marks when cursor is inside', () => {
			const decos = buildMarks('~~strike~~', 5);
			expect(decos[0].class).toBe('cm-formatting-inline cm-formatting-inline-visible');
		});
	});

	describe('inline code marks (`)', () => {
		it('hides marks when cursor is outside', () => {
			const decos = buildMarks('hello `code` world', 0);
			expect(decos).toHaveLength(2);
			expect(decos[0]).toEqual({ from: 6, to: 7, class: 'cm-formatting-inline' });
			expect(decos[1]).toEqual({ from: 11, to: 12, class: 'cm-formatting-inline' });
		});

		it('shows marks when cursor is inside', () => {
			const decos = buildMarks('`code`', 3);
			expect(decos[0].class).toBe('cm-formatting-inline cm-formatting-inline-visible');
		});
	});

	describe('highlight marks (==)', () => {
		it('hides marks when cursor is outside', () => {
			const decos = buildMarks('hello ==highlight== world', 0);
			expect(decos).toHaveLength(2);
			expect(decos[0]).toEqual({ from: 6, to: 8, class: 'cm-formatting-inline' });
			expect(decos[1]).toEqual({ from: 17, to: 19, class: 'cm-formatting-inline' });
		});

		it('shows marks when cursor is inside', () => {
			const decos = buildMarks('==highlight==', 5);
			expect(decos[0].class).toBe('cm-formatting-inline cm-formatting-inline-visible');
		});
	});

	describe('bold-italic marks (***)', () => {
		it('creates marks for nested emphasis when cursor is outside', () => {
			const decos = buildMarks('text ***bold italic***', 2); // cursor on "text", outside formatting
			// Lezer creates nested Emphasis/StrongEmphasis, each with EmphasisMark children
			expect(decos.length).toBeGreaterThanOrEqual(2);
			for (const d of decos) {
				expect(d.class).toBe('cm-formatting-inline');
			}
		});

		it('shows marks when cursor is inside', () => {
			const decos = buildMarks('***bold italic***', 5);
			for (const d of decos) {
				expect(d.class).toBe('cm-formatting-inline cm-formatting-inline-visible');
			}
		});
	});

	describe('multiple marks on same line', () => {
		it('handles bold and italic on the same line', () => {
			const decos = buildMarks('**bold** and *italic*', 10); // cursor on "and", outside both
			// 2 bold marks + 2 italic marks = 4
			expect(decos).toHaveLength(4);
			for (const d of decos) {
				expect(d.class).toBe('cm-formatting-inline');
			}
		});
	});

	describe('block context skip', () => {
		it('produces no marks inside fenced code blocks', () => {
			const doc = '```\n**not bold**\n```';
			const decos = buildMarks(doc, 0);
			expect(decos).toHaveLength(0);
		});

		it('produces marks outside code blocks but not inside', () => {
			const doc = '**bold**\n```\n**not bold**\n```';
			const decos = buildMarks(doc, 0);
			// Only the first **bold** should have marks
			expect(decos).toHaveLength(2);
			expect(decos[0].from).toBe(0);
			expect(decos[0].to).toBe(2);
		});
	});

	describe('per-element cursor sensitivity', () => {
		it('only shows marks for the element under cursor, not the whole line', () => {
			const decos = buildMarks('**bold** and *italic*', 3); // cursor inside "bold"
			// Bold marks should be visible, italic marks should be hidden
			const boldOpen = decos.find((d) => d.from === 0);
			const italicOpen = decos.find((d) => d.from === 13);
			expect(boldOpen?.class).toBe('cm-formatting-inline cm-formatting-inline-visible');
			expect(italicOpen?.class).toBe('cm-formatting-inline');
		});
	});

	describe('backslash escape marks (\\)', () => {
		it('hides backslash when cursor is outside', () => {
			const decos = buildMarks('hello \\* world', 0);
			// Should have 1 decoration for the `\` character (position 6-7)
			const escapeDeco = decos.find((d) => d.from === 6 && d.to === 7);
			expect(escapeDeco).toBeDefined();
			expect(escapeDeco?.class).toBe('cm-formatting-inline');
		});

		it('shows backslash when cursor is inside escape', () => {
			const decos = buildMarks('\\*', 0); // cursor on the backslash itself
			const escapeDeco = decos.find((d) => d.from === 0 && d.to === 1);
			expect(escapeDeco).toBeDefined();
			expect(escapeDeco?.class).toBe('cm-formatting-inline cm-formatting-inline-visible');
		});

		it('shows backslash when cursor is on escaped character', () => {
			const decos = buildMarks('\\*', 1); // cursor on the * after backslash
			const escapeDeco = decos.find((d) => d.from === 0 && d.to === 1);
			expect(escapeDeco).toBeDefined();
			expect(escapeDeco?.class).toBe('cm-formatting-inline cm-formatting-inline-visible');
		});

		it('handles multiple escapes on the same line', () => {
			// Use \~ which doesn't conflict with markdown syntax
			const decos = buildMarks('\\~ and \\~', 0);
			const escapeDecos = decos.filter(
				(d) => d.to - d.from === 1,
			);
			// Should find backslash decos at position 0 and 7
			expect(escapeDecos.length).toBeGreaterThanOrEqual(2);
		});

		it('handles escaped backslash (\\\\)', () => {
			const decos = buildMarks('\\\\', 0); // cursor at start
			// Escape node covers positions 0-2, backslash deco at 0-1
			const escapeDeco = decos.find((d) => d.from === 0 && d.to === 1);
			expect(escapeDeco).toBeDefined();
			expect(escapeDeco?.class).toBe('cm-formatting-inline cm-formatting-inline-visible');
		});

		it('does not produce escape marks inside fenced code blocks', () => {
			const doc = '```\n\\*not escaped\\*\n```';
			const decos = buildMarks(doc, 0);
			// No escape decorations should be produced inside code blocks
			const escapeDecos = decos.filter((d) => d.to - d.from === 1);
			expect(escapeDecos).toHaveLength(0);
		});
	});
});
