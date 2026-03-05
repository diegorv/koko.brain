import { describe, it, expect } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { buildHeadingDecorations } from '$lib/core/markdown-editor/extensions/live-preview/plugins/heading-plugin';
import { createMarkdownState } from '../../../test-helpers';

/** Collects decoration specs from a DecorationSet for assertions */
function collectDecos(decoSet: ReturnType<typeof buildHeadingDecorations>) {
	const result: { from: number; to: number; class: string }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			class: (iter.value.spec as { class: string }).class,
		});
		iter.next();
	}
	return result;
}

/** Creates state with cursor at given position and returns heading decorations for full doc */
function buildHeadings(doc: string, cursor?: number) {
	const baseState = createMarkdownState(doc);
	const safeCursor =
		cursor !== undefined ? Math.min(cursor, baseState.doc.length) : undefined;
	const state = baseState.update({
		selection: safeCursor !== undefined ? EditorSelection.single(safeCursor) : undefined,
	}).state;
	return collectDecos(buildHeadingDecorations(state, [{ from: 0, to: state.doc.length }]));
}

/** Filters only line decorations (from === to) */
function lineDecos(decos: ReturnType<typeof buildHeadings>) {
	return decos.filter((d) => d.from === d.to);
}

/** Filters only mark decorations (from < to) */
function markDecos(decos: ReturnType<typeof buildHeadings>) {
	return decos.filter((d) => d.from < d.to);
}

describe('headingPlugin — buildHeadingDecorations', () => {
	describe('heading detection and line styling', () => {
		it('applies cm-lp-h1 line deco for # heading', () => {
			const decos = buildHeadings('# Hello\ntext', 10); // cursor on "text"
			const lines = lineDecos(decos);
			expect(lines).toHaveLength(1);
			expect(lines[0].from).toBe(0);
			expect(lines[0].class).toBe('cm-lp-h1');
		});

		it('applies cm-lp-h2 line deco for ## heading', () => {
			const decos = buildHeadings('## Hello\ntext', 11);
			const lines = lineDecos(decos);
			expect(lines).toHaveLength(1);
			expect(lines[0].class).toBe('cm-lp-h2');
		});

		it('applies cm-lp-h3 line deco for ### heading', () => {
			const decos = buildHeadings('### Hello\ntext', 12);
			const lines = lineDecos(decos);
			expect(lines[0].class).toBe('cm-lp-h3');
		});

		it('applies correct line deco for h4 through h6', () => {
			const h4 = buildHeadings('#### H4\ntext', 10);
			expect(lineDecos(h4)[0].class).toBe('cm-lp-h4');

			const h5 = buildHeadings('##### H5\ntext', 11);
			expect(lineDecos(h5)[0].class).toBe('cm-lp-h5');

			const h6 = buildHeadings('###### H6\ntext', 12);
			expect(lineDecos(h6)[0].class).toBe('cm-lp-h6');
		});

		it('produces no decorations for non-heading lines', () => {
			const decos = buildHeadings('plain text', 0);
			expect(decos).toHaveLength(0);
		});

		it('produces no decorations for # without space', () => {
			const decos = buildHeadings('#NoSpace\ntext', 11);
			expect(decos).toHaveLength(0);
		});
	});

	describe('mark visibility with CSS animation', () => {
		it('hides heading mark when cursor is outside', () => {
			const decos = buildHeadings('# Hello\nsome text', 14); // cursor on "some text"
			const marks = markDecos(decos);
			expect(marks).toHaveLength(1);
			expect(marks[0].class).toBe('cm-formatting-block');
		});

		it('shows heading mark when cursor is on the heading line', () => {
			const decos = buildHeadings('# Hello', 4); // cursor inside "Hello"
			const marks = markDecos(decos);
			expect(marks).toHaveLength(1);
			expect(marks[0].class).toBe('cm-formatting-block cm-formatting-block-visible');
		});

		it('shows heading mark when cursor is on the mark itself', () => {
			const decos = buildHeadings('## Hello', 1); // cursor on ##
			const marks = markDecos(decos);
			expect(marks[0].class).toBe('cm-formatting-block cm-formatting-block-visible');
		});

		it('mark range includes space after hashes', () => {
			const decos = buildHeadings('## Hello\ntext', 11); // cursor on "text"
			const marks = markDecos(decos);
			expect(marks).toHaveLength(1);
			expect(marks[0].from).toBe(0);
			expect(marks[0].to).toBe(3); // "## " (including space)
		});

		it('mark range for h3 includes "### "', () => {
			const decos = buildHeadings('### Title\ntext', 12); // cursor on "text"
			const marks = markDecos(decos);
			expect(marks[0].from).toBe(0);
			expect(marks[0].to).toBe(4); // "### "
		});
	});

	describe('per-element cursor sensitivity', () => {
		it('only shows marks for the heading under cursor', () => {
			const doc = '# First\n## Second';
			const decos = buildHeadings(doc, 3); // cursor on "First"
			const marks = markDecos(decos);
			const firstMark = marks.find((d) => d.from === 0);
			expect(firstMark?.class).toBe('cm-formatting-block cm-formatting-block-visible');
			const secondMark = marks.find((d) => d.from === 8);
			expect(secondMark?.class).toBe('cm-formatting-block');
		});

		it('shows marks for second heading when cursor is there', () => {
			const doc = '# First\n## Second';
			const decos = buildHeadings(doc, 12); // cursor on "Second"
			const marks = markDecos(decos);
			const firstMark = marks.find((d) => d.from === 0);
			const secondMark = marks.find((d) => d.from === 8);
			expect(firstMark?.class).toBe('cm-formatting-block');
			expect(secondMark?.class).toBe('cm-formatting-block cm-formatting-block-visible');
		});
	});

	describe('block context skip', () => {
		it('produces no decorations for headings inside fenced code blocks', () => {
			const doc = '```\n# Not a heading\n```';
			const decos = buildHeadings(doc, 0);
			expect(decos).toHaveLength(0);
		});

		it('decorates headings outside code blocks but not inside', () => {
			const doc = '# Real heading\n```\n# Fake heading\n```\ntext';
			const decos = buildHeadings(doc, 40); // cursor on "text"
			const lines = lineDecos(decos);
			expect(lines).toHaveLength(1);
			expect(lines[0].from).toBe(0);
			expect(lines[0].class).toBe('cm-lp-h1');
		});
	});

	describe('setext headings', () => {
		it('applies cm-lp-h1 line deco for setext = heading', () => {
			const decos = buildHeadings('Title\n=====\ntext', 12); // cursor on "text"
			const lines = lineDecos(decos);
			expect(lines.length).toBeGreaterThanOrEqual(1);
			expect(lines[0].from).toBe(0);
			expect(lines[0].class).toBe('cm-lp-h1');
		});

		it('applies cm-lp-h2 line deco for setext - heading', () => {
			const decos = buildHeadings('Subtitle\n--------\ntext', 19); // cursor on "text"
			const lines = lineDecos(decos);
			expect(lines.length).toBeGreaterThanOrEqual(1);
			expect(lines[0].from).toBe(0);
			expect(lines[0].class).toBe('cm-lp-h2');
		});

		it('hides underline when cursor is outside', () => {
			const decos = buildHeadings('Title\n=====\ntext', 12); // cursor on "text"
			const marks = markDecos(decos);
			const underlineMark = marks.find((d) => d.from === 6); // underline starts at "====="
			expect(underlineMark).toBeDefined();
			expect(underlineMark!.class).toBe('cm-formatting-block');
		});

		it('shows underline when cursor is on the heading', () => {
			const decos = buildHeadings('Title\n=====\ntext', 3); // cursor on "Title"
			const marks = markDecos(decos);
			const underlineMark = marks.find((d) => d.from === 6);
			expect(underlineMark).toBeDefined();
			expect(underlineMark!.class).toBe('cm-formatting-block cm-formatting-block-visible');
		});
	});

	describe('multi-line documents', () => {
		it('handles heading on non-first line', () => {
			const doc = 'first line\n## Title\nmore text';
			const state = createMarkdownState(doc);
			const line2 = state.doc.line(2);
			const decos = buildHeadings(doc, 25); // cursor on "more text"
			const lines = lineDecos(decos);
			expect(lines).toHaveLength(1);
			expect(lines[0].from).toBe(line2.from);
			expect(lines[0].class).toBe('cm-lp-h2');
		});

		it('handles multiple headings in a document', () => {
			const doc = '# H1\n## H2\n### H3\ntext';
			const decos = buildHeadings(doc, 20); // cursor on "text"
			const lines = lineDecos(decos);
			expect(lines).toHaveLength(3);
			expect(lines[0].class).toBe('cm-lp-h1');
			expect(lines[1].class).toBe('cm-lp-h2');
			expect(lines[2].class).toBe('cm-lp-h3');
		});

		it('creates both line deco and mark deco per heading', () => {
			const decos = buildHeadings('# Hello\ntext', 10); // cursor on "text"
			expect(lineDecos(decos)).toHaveLength(1);
			expect(markDecos(decos)).toHaveLength(1);
		});
	});
});
