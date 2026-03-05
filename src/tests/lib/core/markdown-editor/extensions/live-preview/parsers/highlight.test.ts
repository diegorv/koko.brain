import { describe, it, expect } from 'vitest';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { createMarkdownState } from '../../../test-helpers';

describe('findHighlightRanges', () => {
	it('detects ==text== highlight', () => {
		const state = createMarkdownState('==hello==');
		const ranges = findHighlightRanges(state, 0, 9);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openMarkFrom).toBe(0);
		expect(r.openMarkTo).toBe(2);
		expect(r.textFrom).toBe(2);
		expect(r.textTo).toBe(7);
		expect(r.closeMarkFrom).toBe(7);
		expect(r.closeMarkTo).toBe(9);
	});

	it('detects multiple highlights on one line', () => {
		const state = createMarkdownState('==a== and ==b==');
		const ranges = findHighlightRanges(state, 0, 15);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].textFrom).toBe(2);
		expect(ranges[0].textTo).toBe(3);
		expect(ranges[1].textFrom).toBe(12);
		expect(ranges[1].textTo).toBe(13);
	});

	it('returns empty array when no highlight present', () => {
		const state = createMarkdownState('no highlight here');
		expect(findHighlightRanges(state, 0, 17)).toHaveLength(0);
	});

	it('returns empty for single equals', () => {
		const state = createMarkdownState('=not highlight=');
		expect(findHighlightRanges(state, 0, 15)).toHaveLength(0);
	});

	it('applies offset correctly in multi-line doc', () => {
		const doc = 'a'.repeat(49) + '\n==highlight==';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findHighlightRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].openMarkFrom).toBe(50);
		expect(ranges[0].textFrom).toBe(52);
		expect(ranges[0].textTo).toBe(61);
		expect(ranges[0].closeMarkTo).toBe(63);
	});

	it('handles highlight with spaces inside', () => {
		const state = createMarkdownState('==highlighted text==');
		const ranges = findHighlightRanges(state, 0, 20);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].textFrom).toBe(2);
		expect(ranges[0].textTo).toBe(18);
	});

	it('handles highlight surrounded by text', () => {
		const state = createMarkdownState('before ==mark== after');
		const ranges = findHighlightRanges(state, 0, 21);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].openMarkFrom).toBe(7);
		expect(ranges[0].textFrom).toBe(9);
		expect(ranges[0].textTo).toBe(13);
		expect(ranges[0].closeMarkTo).toBe(15);
	});
});
