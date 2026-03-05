import { describe, it, expect } from 'vitest';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { createMarkdownState } from '../../../test-helpers';

describe('findBoldRanges', () => {
	it('detects **text** bold', () => {
		const state = createMarkdownState('**hello**');
		const ranges = findBoldRanges(state, 0, 9);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openMarkFrom).toBe(0);
		expect(r.openMarkTo).toBe(2);
		expect(r.textFrom).toBe(2);
		expect(r.textTo).toBe(7);
		expect(r.closeMarkFrom).toBe(7);
		expect(r.closeMarkTo).toBe(9);
	});

	it('detects __text__ bold', () => {
		const state = createMarkdownState('__hello__');
		const ranges = findBoldRanges(state, 0, 9);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openMarkFrom).toBe(0);
		expect(r.openMarkTo).toBe(2);
		expect(r.textFrom).toBe(2);
		expect(r.textTo).toBe(7);
		expect(r.closeMarkFrom).toBe(7);
		expect(r.closeMarkTo).toBe(9);
	});

	it('detects multiple bold ranges on one line', () => {
		const state = createMarkdownState('**a** and **b**');
		const ranges = findBoldRanges(state, 0, 15);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].textFrom).toBe(2);
		expect(ranges[0].textTo).toBe(3);
		expect(ranges[1].textFrom).toBe(12);
		expect(ranges[1].textTo).toBe(13);
	});

	it('returns empty array when no bold present', () => {
		const state = createMarkdownState('no bold here');
		expect(findBoldRanges(state, 0, 12)).toHaveLength(0);
	});

	it('returns empty for single asterisks (italic)', () => {
		const state = createMarkdownState('*italic*');
		expect(findBoldRanges(state, 0, 8)).toHaveLength(0);
	});

	it('applies offset correctly in multi-line doc', () => {
		const doc = 'a'.repeat(49) + '\n**bold**';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findBoldRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].openMarkFrom).toBe(50);
		expect(ranges[0].textFrom).toBe(52);
		expect(ranges[0].textTo).toBe(56);
		expect(ranges[0].closeMarkTo).toBe(58);
	});

	it('handles bold with spaces inside', () => {
		const state = createMarkdownState('**bold text here**');
		const ranges = findBoldRanges(state, 0, 18);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].textFrom).toBe(2);
		expect(ranges[0].textTo).toBe(16);
	});

	it('handles mixed ** and __ on same line', () => {
		const state = createMarkdownState('**stars** and __unders__');
		const ranges = findBoldRanges(state, 0, 24);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].textTo).toBe(7);
		expect(ranges[1].textFrom).toBe(16);
		expect(ranges[1].textTo).toBe(22);
	});

	it('returns empty for bold inside fenced code block', () => {
		const doc = '```\n**not bold**\n```';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findBoldRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(0);
	});
});
