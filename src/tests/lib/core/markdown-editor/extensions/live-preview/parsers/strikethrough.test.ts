import { describe, it, expect } from 'vitest';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { createMarkdownState } from '../../../test-helpers';

describe('findStrikethroughRanges', () => {
	it('detects ~~text~~ strikethrough', () => {
		const state = createMarkdownState('~~hello~~');
		const ranges = findStrikethroughRanges(state, 0, 9);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openMarkFrom).toBe(0);
		expect(r.openMarkTo).toBe(2);
		expect(r.textFrom).toBe(2);
		expect(r.textTo).toBe(7);
		expect(r.closeMarkFrom).toBe(7);
		expect(r.closeMarkTo).toBe(9);
	});

	it('detects multiple strikethrough ranges on one line', () => {
		const state = createMarkdownState('~~a~~ and ~~b~~');
		const ranges = findStrikethroughRanges(state, 0, 15);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].textFrom).toBe(2);
		expect(ranges[0].textTo).toBe(3);
		expect(ranges[1].textFrom).toBe(12);
		expect(ranges[1].textTo).toBe(13);
	});

	it('returns empty array when no strikethrough present', () => {
		const state = createMarkdownState('no strikethrough here');
		expect(findStrikethroughRanges(state, 0, 21)).toHaveLength(0);
	});

	it('returns empty for single tildes', () => {
		const state = createMarkdownState('~not strikethrough~');
		expect(findStrikethroughRanges(state, 0, 19)).toHaveLength(0);
	});

	it('applies offset correctly in multi-line doc', () => {
		const doc = 'a'.repeat(49) + '\n~~strike~~';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findStrikethroughRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].openMarkFrom).toBe(50);
		expect(ranges[0].textFrom).toBe(52);
		expect(ranges[0].textTo).toBe(58);
		expect(ranges[0].closeMarkTo).toBe(60);
	});

	it('handles strikethrough with spaces inside', () => {
		const state = createMarkdownState('~~struck out text~~');
		const ranges = findStrikethroughRanges(state, 0, 19);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].textFrom).toBe(2);
		expect(ranges[0].textTo).toBe(17);
	});
});
