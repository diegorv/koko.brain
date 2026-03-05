import { describe, it, expect } from 'vitest';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { createMarkdownState } from '../../../test-helpers';

describe('findItalicRanges', () => {
	it('detects *text* italic', () => {
		const state = createMarkdownState('*hello*');
		const ranges = findItalicRanges(state, 0, 7);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openMarkFrom).toBe(0);
		expect(r.openMarkTo).toBe(1);
		expect(r.textFrom).toBe(1);
		expect(r.textTo).toBe(6);
		expect(r.closeMarkFrom).toBe(6);
		expect(r.closeMarkTo).toBe(7);
	});

	it('detects _text_ italic', () => {
		const state = createMarkdownState('_hello_');
		const ranges = findItalicRanges(state, 0, 7);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openMarkFrom).toBe(0);
		expect(r.openMarkTo).toBe(1);
		expect(r.textFrom).toBe(1);
		expect(r.textTo).toBe(6);
		expect(r.closeMarkFrom).toBe(6);
		expect(r.closeMarkTo).toBe(7);
	});

	it('detects multiple italic ranges on one line', () => {
		const state = createMarkdownState('*a* and *b*');
		const ranges = findItalicRanges(state, 0, 11);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].textFrom).toBe(1);
		expect(ranges[0].textTo).toBe(2);
		expect(ranges[1].textFrom).toBe(9);
		expect(ranges[1].textTo).toBe(10);
	});

	it('returns empty array when no italic present', () => {
		const state = createMarkdownState('no italic here');
		expect(findItalicRanges(state, 0, 14)).toHaveLength(0);
	});

	it('does not match double asterisks (bold)', () => {
		const state = createMarkdownState('**bold**');
		expect(findItalicRanges(state, 0, 8)).toHaveLength(0);
	});

	it('applies offset correctly in multi-line doc', () => {
		const doc = 'a'.repeat(49) + '\n*italic*';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findItalicRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].openMarkFrom).toBe(50);
		expect(ranges[0].textFrom).toBe(51);
		expect(ranges[0].textTo).toBe(57);
		expect(ranges[0].closeMarkTo).toBe(58);
	});

	it('handles italic with spaces inside', () => {
		const state = createMarkdownState('*italic text here*');
		const ranges = findItalicRanges(state, 0, 18);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].textFrom).toBe(1);
		expect(ranges[0].textTo).toBe(17);
	});

	it('returns empty for italic inside fenced code block', () => {
		const doc = '```\n*not italic*\n```';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findItalicRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(0);
	});
});
