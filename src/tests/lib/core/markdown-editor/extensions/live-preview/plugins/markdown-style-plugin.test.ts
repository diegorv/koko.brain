import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildContentStylesForRanges } from '$lib/core/markdown-editor/extensions/live-preview/plugins/markdown-style-plugin';
import { createMarkdownState } from '../../../test-helpers';

/** Collects decoration specs from a DecorationSet for assertions */
function collectDecos(decoSet: ReturnType<typeof buildContentStylesForRanges>) {
	const result: { from: number; to: number; class: string }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to, class: (iter.value.spec as { class: string }).class });
		iter.next();
	}
	return result;
}

/** Creates state and returns content style decorations for full doc */
function buildStyles(doc: string, cursor?: number) {
	const state = createMarkdownState(doc).update({
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	}).state;
	return collectDecos(buildContentStylesForRanges(state, [{ from: 0, to: state.doc.length }]));
}

describe('markdownStylePlugin — buildContentStylesForRanges', () => {
	describe('bold styling', () => {
		it('applies cm-lp-bold to StrongEmphasis range', () => {
			const decos = buildStyles('**bold**');
			const bold = decos.find((d) => d.class === 'cm-lp-bold');
			expect(bold).toBeDefined();
			expect(bold!.from).toBe(0);
			expect(bold!.to).toBe(8);
		});
	});

	describe('italic styling', () => {
		it('applies cm-lp-italic to Emphasis range', () => {
			const decos = buildStyles('*italic*');
			const italic = decos.find((d) => d.class === 'cm-lp-italic');
			expect(italic).toBeDefined();
			expect(italic!.from).toBe(0);
			expect(italic!.to).toBe(8);
		});
	});

	describe('bold-italic styling', () => {
		it('applies both bold and italic classes for ***text***', () => {
			const decos = buildStyles('***bold italic***');
			const bold = decos.find((d) => d.class === 'cm-lp-bold');
			const italic = decos.find((d) => d.class === 'cm-lp-italic');
			expect(bold).toBeDefined();
			expect(italic).toBeDefined();
		});
	});

	describe('strikethrough styling', () => {
		it('applies cm-lp-strikethrough to Strikethrough range', () => {
			const decos = buildStyles('~~strike~~');
			const strike = decos.find((d) => d.class === 'cm-lp-strikethrough');
			expect(strike).toBeDefined();
			expect(strike!.from).toBe(0);
			expect(strike!.to).toBe(10);
		});
	});

	describe('inline code styling', () => {
		it('applies cm-lp-code to InlineCode range', () => {
			const decos = buildStyles('`code`');
			const code = decos.find((d) => d.class === 'cm-lp-code');
			expect(code).toBeDefined();
			expect(code!.from).toBe(0);
			expect(code!.to).toBe(6);
		});
	});

	describe('highlight styling', () => {
		it('applies cm-lp-highlight to ==text== range', () => {
			const decos = buildStyles('==highlight==');
			const highlight = decos.find((d) => d.class === 'cm-lp-highlight');
			expect(highlight).toBeDefined();
			expect(highlight!.from).toBe(0);
			expect(highlight!.to).toBe(13);
		});
	});

	describe('cursor independence', () => {
		it('produces the same decorations regardless of cursor position', () => {
			const doc = '**bold** and *italic*';
			const decosAtStart = buildStyles(doc, 0);
			const decosInBold = buildStyles(doc, 4);
			const decosInItalic = buildStyles(doc, 15);

			// Same number of decorations regardless of cursor
			expect(decosAtStart).toHaveLength(decosInBold.length);
			expect(decosAtStart).toHaveLength(decosInItalic.length);

			// Same classes
			for (let i = 0; i < decosAtStart.length; i++) {
				expect(decosAtStart[i].class).toBe(decosInBold[i].class);
				expect(decosAtStart[i].from).toBe(decosInBold[i].from);
				expect(decosAtStart[i].to).toBe(decosInBold[i].to);
			}
		});
	});

	describe('block context skip', () => {
		it('produces no styling inside fenced code blocks', () => {
			const doc = '```\n**not bold**\n```';
			const decos = buildStyles(doc);
			const bold = decos.find((d) => d.class === 'cm-lp-bold');
			expect(bold).toBeUndefined();
		});

		it('styles outside code blocks but not inside', () => {
			const doc = '**bold**\n```\n**not bold**\n```';
			const decos = buildStyles(doc);
			const boldDecos = decos.filter((d) => d.class === 'cm-lp-bold');
			expect(boldDecos).toHaveLength(1);
			expect(boldDecos[0].from).toBe(0);
			expect(boldDecos[0].to).toBe(8);
		});
	});

	describe('multiple styles on same line', () => {
		it('applies different styles to different elements', () => {
			const decos = buildStyles('**bold** and *italic* and `code`');
			const classes = decos.map((d) => d.class);
			expect(classes).toContain('cm-lp-bold');
			expect(classes).toContain('cm-lp-italic');
			expect(classes).toContain('cm-lp-code');
		});
	});
});
