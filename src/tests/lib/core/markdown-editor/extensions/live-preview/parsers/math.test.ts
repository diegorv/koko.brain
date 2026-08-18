import { describe, it, expect } from 'vitest';
import { findAllBlockMath } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { createMarkdownState } from '../../../test-helpers';

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
