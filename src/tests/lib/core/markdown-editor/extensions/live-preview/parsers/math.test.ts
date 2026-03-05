import { describe, it, expect } from 'vitest';
import { findInlineMathRanges, findAllBlockMath } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { createMarkdownState } from '../../../test-helpers';

describe('findInlineMathRanges', () => {
	it('detects a simple inline math expression', () => {
		const text = 'The formula $e^{2i\\pi}=1$ is famous.';
		const state = createMarkdownState(text);
		const ranges = findInlineMathRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].formula).toBe('e^{2i\\pi}=1');
		expect(ranges[0].from).toBe(12);
		expect(ranges[0].to).toBe(25);
	});

	it('detects multiple inline math on the same line', () => {
		const state = createMarkdownState('$a+b$ and $c+d$');
		const ranges = findInlineMathRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].formula).toBe('a+b');
		expect(ranges[1].formula).toBe('c+d');
	});

	it('does not match $$ as inline math', () => {
		const state = createMarkdownState('$$not inline$$');
		const ranges = findInlineMathRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(0);
	});

	it('does not match when content starts with a space', () => {
		const state = createMarkdownState('$ not math$');
		const ranges = findInlineMathRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(0);
	});

	it('does not match when content ends with a space', () => {
		const state = createMarkdownState('$not math $');
		const ranges = findInlineMathRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(0);
	});

	it('does not match empty $$ (no content)', () => {
		const state = createMarkdownState('text $$ more text');
		const ranges = findInlineMathRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(0);
	});

	it('matches math with special characters', () => {
		const state = createMarkdownState('$\\frac{a}{b}$');
		const ranges = findInlineMathRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].formula).toBe('\\frac{a}{b}');
	});

	it('does not match across lines', () => {
		const state = createMarkdownState('$start\nend$');
		const line1 = state.doc.line(1);
		const ranges = findInlineMathRanges(state, line1.from, line1.to);
		expect(ranges).toHaveLength(0);
	});

	it('handles subscript and superscript', () => {
		const state = createMarkdownState('$x_1^2$');
		const ranges = findInlineMathRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].formula).toBe('x_1^2');
	});

	it('returns empty array for text without math', () => {
		const state = createMarkdownState('just regular text');
		const ranges = findInlineMathRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(0);
	});

	it('handles math at the start of a line', () => {
		const state = createMarkdownState('$x=1$ is simple');
		const ranges = findInlineMathRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].from).toBe(0);
	});

	it('handles math at the end of a line', () => {
		const state = createMarkdownState('result is $42$');
		const ranges = findInlineMathRanges(state, 0, state.doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].to).toBe(14);
	});
});

describe('findAllBlockMath', () => {
	it('detects a basic block math expression', () => {
		const state = createMarkdownState('$$\nx^2 + y^2 = z^2\n$$');
		const blocks = findAllBlockMath(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].openFrom).toBe(0);
		expect(blocks[0].openTo).toBe(2);
		expect(blocks[0].formula).toBe('x^2 + y^2 = z^2');
	});

	it('detects multi-line block math', () => {
		const state = createMarkdownState('$$\n\\begin{vmatrix}\na & b\\\\\nc & d\n\\end{vmatrix}\n$$');
		const blocks = findAllBlockMath(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].formula).toBe('\\begin{vmatrix}\na & b\\\\\nc & d\n\\end{vmatrix}');
	});

	it('returns empty for non-math lines', () => {
		const state = createMarkdownState('regular text');
		const blocks = findAllBlockMath(state);
		expect(blocks).toHaveLength(0);
	});

	it('returns empty when no closing $$', () => {
		const state = createMarkdownState('$$\nx^2\nmore math');
		const blocks = findAllBlockMath(state);
		expect(blocks).toHaveLength(0);
	});

	it('handles empty block math', () => {
		const state = createMarkdownState('$$\n$$');
		const blocks = findAllBlockMath(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].formula).toBe('');
	});

	it('detects block math after other content', () => {
		const doc = 'text\n\n$$\nx^2\n$$';
		const state = createMarkdownState(doc);
		const blocks = findAllBlockMath(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].openFrom).toBe(doc.indexOf('$$'));
	});

	it('does not match $$ with content on the same line', () => {
		const state = createMarkdownState('$$ x^2 $$');
		const blocks = findAllBlockMath(state);
		expect(blocks).toHaveLength(0);
	});

	it('returns correct close positions', () => {
		const state = createMarkdownState('$$\nx^2\n$$');
		const blocks = findAllBlockMath(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].closeFrom).toBe(7);
		expect(blocks[0].closeTo).toBe(9);
	});

	it('detects multiple block math expressions', () => {
		const state = createMarkdownState('$$\na\n$$\n\n$$\nb\n$$');
		const blocks = findAllBlockMath(state);
		expect(blocks).toHaveLength(2);
		expect(blocks[0].formula).toBe('a');
		expect(blocks[1].formula).toBe('b');
	});
});
