import { describe, it, expect } from 'vitest';
import {
	findFootnoteRefRanges,
	findFootnoteDefRange,
	findInlineFootnoteRanges,
} from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { createMarkdownState } from '../../../test-helpers';

describe('findFootnoteRefRanges', () => {
	it('detects [^1] footnote reference', () => {
		const doc = 'text [^1] more';
		const state = createMarkdownState(doc);
		const ranges = findFootnoteRefRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toEqual({ fullFrom: 5, fullTo: 9, label: '1' });
	});

	it('detects [^label] with text label', () => {
		const doc = 'see [^note]';
		const state = createMarkdownState(doc);
		const ranges = findFootnoteRefRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toEqual({ fullFrom: 4, fullTo: 11, label: 'note' });
	});

	it('detects multiple refs on one line', () => {
		const doc = '[^1] and [^2]';
		const state = createMarkdownState(doc);
		const ranges = findFootnoteRefRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].label).toBe('1');
		expect(ranges[1].label).toBe('2');
	});

	it('returns empty array for no refs', () => {
		const state = createMarkdownState('plain text');
		expect(findFootnoteRefRanges(state, 0, 10)).toHaveLength(0);
	});

	it('does not match definition line as a ref', () => {
		const doc = '[^1]: definition text';
		const state = createMarkdownState(doc);
		const ranges = findFootnoteRefRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(0);
	});

	it('applies offset correctly', () => {
		const doc = 'a'.repeat(100) + '\ntext [^1]';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findFootnoteRefRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(1);
		expect(ranges[0]).toEqual({ fullFrom: 106, fullTo: 110, label: '1' });
	});

	it('detects ref with hyphenated label', () => {
		const doc = '[^my-note]';
		const state = createMarkdownState(doc);
		const ranges = findFootnoteRefRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].label).toBe('my-note');
	});

	it('handles escaped bracket in label', () => {
		const doc = '[^label\\]extra]';
		const state = createMarkdownState(doc);
		const ranges = findFootnoteRefRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].label).toBe('label\\]extra');
	});
});

describe('findFootnoteDefRange', () => {
	it('detects [^1]: text definition', () => {
		const doc = '[^1]: definition text';
		const state = createMarkdownState(doc);
		const def = findFootnoteDefRange(state, 0, doc.length);
		expect(def).not.toBeNull();
		expect(def!.label).toBe('1');
		expect(def!.markerFrom).toBe(0);
		expect(def!.markerTo).toBe(5);
		expect(def!.contentTo).toBe(21);
	});

	it('detects [^label]: text definition', () => {
		const doc = '[^note]: some explanation';
		const state = createMarkdownState(doc);
		const def = findFootnoteDefRange(state, 0, doc.length);
		expect(def).not.toBeNull();
		expect(def!.label).toBe('note');
		expect(def!.markerFrom).toBe(0);
		expect(def!.markerTo).toBe(8);
	});

	it('returns null for non-definition lines', () => {
		const state1 = createMarkdownState('regular text');
		expect(findFootnoteDefRange(state1, 0, 12)).toBeNull();
		const state2 = createMarkdownState('[^1] reference');
		expect(findFootnoteDefRange(state2, 0, 14)).toBeNull();
	});

	it('applies offset correctly', () => {
		const doc = 'a'.repeat(50) + '\n[^1]: text';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const def = findFootnoteDefRange(state, line.from, line.to);
		expect(def).not.toBeNull();
		expect(def!.markerFrom).toBe(51);
		expect(def!.markerTo).toBe(56);
	});

	it('handles definition with empty content', () => {
		const doc = '[^1]: ';
		const state = createMarkdownState(doc);
		const def = findFootnoteDefRange(state, 0, doc.length);
		expect(def).not.toBeNull();
		expect(def!.label).toBe('1');
	});
});

describe('findInlineFootnoteRanges', () => {
	it('detects ^[inline text] footnote', () => {
		const doc = 'text ^[inline note] more';
		const state = createMarkdownState(doc);
		const ranges = findInlineFootnoteRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].fullFrom).toBe(5);
		expect(ranges[0].fullTo).toBe(19);
		expect(ranges[0].openMarkFrom).toBe(5);
		expect(ranges[0].openMarkTo).toBe(7);
		expect(ranges[0].textFrom).toBe(7);
		expect(ranges[0].textTo).toBe(18);
		expect(ranges[0].closeMarkFrom).toBe(18);
		expect(ranges[0].closeMarkTo).toBe(19);
	});

	it('detects multiple inline footnotes on one line', () => {
		const doc = '^[a] and ^[b]';
		const state = createMarkdownState(doc);
		const ranges = findInlineFootnoteRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(2);
		expect(ranges[0].textFrom).toBe(2);
		expect(ranges[0].textTo).toBe(3);
		expect(ranges[1].textFrom).toBe(11);
		expect(ranges[1].textTo).toBe(12);
	});

	it('returns empty array for no inline footnotes', () => {
		const state = createMarkdownState('plain text');
		expect(findInlineFootnoteRanges(state, 0, 10)).toHaveLength(0);
	});

	it('does not match [^ref] as inline footnote', () => {
		const state = createMarkdownState('[^ref]');
		expect(findInlineFootnoteRanges(state, 0, 6)).toHaveLength(0);
	});

	it('applies offset correctly', () => {
		const doc = 'a'.repeat(100) + '\n^[note]';
		const state = createMarkdownState(doc);
		const line = state.doc.line(2);
		const ranges = findInlineFootnoteRanges(state, line.from, line.to);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].fullFrom).toBe(101);
		expect(ranges[0].openMarkTo).toBe(103);
		expect(ranges[0].textFrom).toBe(103);
		expect(ranges[0].textTo).toBe(107);
		expect(ranges[0].closeMarkTo).toBe(108);
	});

	it('handles inline footnote with spaces', () => {
		const doc = '^[a long note]';
		const state = createMarkdownState(doc);
		const ranges = findInlineFootnoteRanges(state, 0, doc.length);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].textFrom).toBe(2);
		expect(ranges[0].textTo).toBe(13);
	});
});
