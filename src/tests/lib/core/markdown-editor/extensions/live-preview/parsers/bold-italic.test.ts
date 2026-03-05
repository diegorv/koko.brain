import { describe, it, expect } from 'vitest';
import { findBoldItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold-italic';
import { createMarkdownState } from '../../../test-helpers';

describe('findBoldItalicRanges', () => {
	it('detects ***text*** bold-italic with asterisks', () => {
		const state = createMarkdownState('***hello***');
		const ranges = findBoldItalicRanges(state, 0, 11);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openMarkFrom).toBe(0);
		expect(r.openMarkTo).toBe(3);
		expect(r.textFrom).toBe(3);
		expect(r.textTo).toBe(8);
		expect(r.closeMarkFrom).toBe(8);
		expect(r.closeMarkTo).toBe(11);
	});

	it('detects ___text___ bold-italic with underscores', () => {
		const state = createMarkdownState('___hello___');
		const ranges = findBoldItalicRanges(state, 0, 11);
		expect(ranges).toHaveLength(1);
		const r = ranges[0];
		expect(r.openMarkFrom).toBe(0);
		expect(r.openMarkTo).toBe(3);
		expect(r.textFrom).toBe(3);
		expect(r.textTo).toBe(8);
		expect(r.closeMarkFrom).toBe(8);
		expect(r.closeMarkTo).toBe(11);
	});

	it('detects multiple bold-italic ranges on one line', () => {
		const state = createMarkdownState('***a*** and ***b***');
		const ranges = findBoldItalicRanges(state, 0, 19);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].textFrom).toBe(3);
		expect(ranges[0].textTo).toBe(4);
		expect(ranges[1].textFrom).toBe(15);
		expect(ranges[1].textTo).toBe(16);
	});

	it('returns empty array when no bold-italic present', () => {
		const state = createMarkdownState('no bold italic');
		expect(findBoldItalicRanges(state, 0, 14)).toHaveLength(0);
	});

	it('does not match **bold** (only double asterisks)', () => {
		const state = createMarkdownState('**bold**');
		expect(findBoldItalicRanges(state, 0, 8)).toHaveLength(0);
	});

	it('does not match *italic* (only single asterisks)', () => {
		const state = createMarkdownState('*italic*');
		expect(findBoldItalicRanges(state, 0, 8)).toHaveLength(0);
	});

	it('applies offset correctly in multi-line doc', () => {
		const doc = 'a'.repeat(49) + '\n***text***';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findBoldItalicRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].openMarkFrom).toBe(50);
		expect(ranges[0].textFrom).toBe(53);
		expect(ranges[0].textTo).toBe(57);
		expect(ranges[0].closeMarkTo).toBe(60);
	});

	it('handles bold-italic with spaces inside', () => {
		const state = createMarkdownState('***bold and italic***');
		const ranges = findBoldItalicRanges(state, 0, 21);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].textFrom).toBe(3);
		expect(ranges[0].textTo).toBe(18);
	});

	it('coexists with plain bold on same line', () => {
		const state = createMarkdownState('***bi*** and **bold**');
		const ranges = findBoldItalicRanges(state, 0, 21);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].textFrom).toBe(3);
		expect(ranges[0].textTo).toBe(5);
	});

	it('returns empty for bold-italic inside fenced code block', () => {
		const doc = '```\n***not bi***\n```';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findBoldItalicRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(0);
	});
});
