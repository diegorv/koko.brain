import { describe, it, expect } from 'vitest';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { createMarkdownState } from '../../../test-helpers';

describe('findInlineCodeRanges', () => {
	it('detects `code` with single backticks', () => {
		const state = createMarkdownState('`hello`');
		const ranges = findInlineCodeRanges(state, 0, 7);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openMarkFrom).toBe(0);
		expect(r.openMarkTo).toBe(1);
		expect(r.textFrom).toBe(1);
		expect(r.textTo).toBe(6);
		expect(r.closeMarkFrom).toBe(6);
		expect(r.closeMarkTo).toBe(7);
	});

	it('detects ``code`` with double backticks', () => {
		const state = createMarkdownState('``code here``');
		const ranges = findInlineCodeRanges(state, 0, 13);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openMarkFrom).toBe(0);
		expect(r.openMarkTo).toBe(2);
		expect(r.textFrom).toBe(2);
		expect(r.textTo).toBe(11);
		expect(r.closeMarkFrom).toBe(11);
		expect(r.closeMarkTo).toBe(13);
	});

	it('detects multiple inline code ranges on one line', () => {
		const state = createMarkdownState('`a` and `b`');
		const ranges = findInlineCodeRanges(state, 0, 11);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].textFrom).toBe(1);
		expect(ranges[0].textTo).toBe(2);
		expect(ranges[1].textFrom).toBe(9);
		expect(ranges[1].textTo).toBe(10);
	});

	it('returns empty array when no inline code present', () => {
		const state = createMarkdownState('no code here');
		expect(findInlineCodeRanges(state, 0, 12)).toHaveLength(0);
	});

	it('applies offset correctly in multi-line doc', () => {
		const doc = 'a'.repeat(49) + '\n`code`';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findInlineCodeRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].openMarkFrom).toBe(50);
		expect(ranges[0].textFrom).toBe(51);
		expect(ranges[0].textTo).toBe(55);
		expect(ranges[0].closeMarkTo).toBe(56);
	});

	it('handles inline code with spaces inside', () => {
		const state = createMarkdownState('`some code here`');
		const ranges = findInlineCodeRanges(state, 0, 16);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].textFrom).toBe(1);
		expect(ranges[0].textTo).toBe(15);
	});

	it('handles backtick inside double backtick code', () => {
		const state = createMarkdownState('``code ` here``');
		const ranges = findInlineCodeRanges(state, 0, 15);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].textFrom).toBe(2);
		expect(ranges[0].textTo).toBe(13);
	});
});
