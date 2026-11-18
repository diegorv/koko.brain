import { describe, it, expect } from 'vitest';
import { nextCurrentRow, resolveRovingFocus, tabStopRow, type RovingKeyInput } from '#lib/utils/roving-list.js';

/** A plain key on a row in the middle of a five-row list. */
function input(overrides: Partial<RovingKeyInput> = {}): RovingKeyInput {
	return {
		key: 'ArrowDown',
		onRow: true,
		meta: false,
		ctrl: false,
		alt: false,
		shift: false,
		index: 2,
		count: 5,
		...overrides,
	};
}

const FOCUS_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End'];

describe('resolveRovingFocus', () => {
	it('moves one row with ArrowDown and ArrowUp in the middle', () => {
		expect(resolveRovingFocus(input({ key: 'ArrowDown' }))).toBe(3);
		expect(resolveRovingFocus(input({ key: 'ArrowUp' }))).toBe(1);
	});

	it('clamps ArrowDown on the last row and ArrowUp on the first', () => {
		expect(resolveRovingFocus(input({ key: 'ArrowDown', index: 4 }))).toBe(4);
		expect(resolveRovingFocus(input({ key: 'ArrowUp', index: 0 }))).toBe(0);
	});

	it('goes to the first row with Home and the last with End', () => {
		expect(resolveRovingFocus(input({ key: 'Home' }))).toBe(0);
		expect(resolveRovingFocus(input({ key: 'End' }))).toBe(4);
	});

	it('works on a one-row list', () => {
		for (const key of FOCUS_KEYS) {
			expect(resolveRovingFocus(input({ key, index: 0, count: 1 }))).toBe(0);
		}
	});

	it.each(['meta', 'ctrl', 'alt', 'shift'] as const)('returns null with %s held', (modifier) => {
		for (const key of FOCUS_KEYS) {
			expect(resolveRovingFocus(input({ key, [modifier]: true }))).toBeNull();
		}
	});

	it('returns null with no rows', () => {
		for (const key of FOCUS_KEYS) {
			expect(resolveRovingFocus(input({ key, index: 0, count: 0 }))).toBeNull();
		}
	});

	it('returns null for a key that is not on a row', () => {
		for (const key of FOCUS_KEYS) {
			expect(resolveRovingFocus(input({ key, onRow: false }))).toBeNull();
		}
	});

	it('returns null for any other key', () => {
		for (const key of ['Enter', ' ', 'Tab', 'ArrowLeft', 'ArrowRight', 'PageDown', 'a', 'Escape']) {
			expect(resolveRovingFocus(input({ key }))).toBeNull();
		}
	});
});

describe('nextCurrentRow', () => {
	const prev = ['a', 'b', 'c'];

	it('keeps a row that is still listed', () => {
		expect(nextCurrentRow(['a', 'b', 'c'], prev, 'b')).toBe('b');
	});

	it('moves to the next row when a middle row is removed', () => {
		expect(nextCurrentRow(['a', 'c'], prev, 'b')).toBe('c');
	});

	it('moves to the row before when the last row is removed', () => {
		expect(nextCurrentRow(['a', 'b'], prev, 'c')).toBe('b');
	});

	it('skips removed neighbours to the nearest listed row before', () => {
		expect(nextCurrentRow(['a'], prev, 'c')).toBe('a');
	});

	it('returns null when every row is removed', () => {
		expect(nextCurrentRow([], prev, 'b')).toBeNull();
	});

	it('returns null when current is null or was not in the previous order', () => {
		expect(nextCurrentRow(['a', 'b'], prev, null)).toBeNull();
		expect(nextCurrentRow(['a', 'b'], prev, 'z')).toBeNull();
	});
});

describe('tabStopRow', () => {
	const order = ['a', 'b', 'c'];

	it('is the current row when it is rendered', () => {
		expect(tabStopRow(order, order, 'b')).toBe('b');
	});

	it('is the first rendered row after a hidden current row, in order', () => {
		expect(tabStopRow(['b', 'c'], order, 'a')).toBe('b');
		expect(tabStopRow(['a', 'c'], order, 'b')).toBe('c');
	});

	it('is the last rendered row when no rendered row follows the hidden current row', () => {
		expect(tabStopRow(['a', 'b'], order, 'c')).toBe('b');
		expect(tabStopRow(['a'], order, 'b')).toBe('a');
	});

	it('is the first rendered row when there is no current row', () => {
		expect(tabStopRow(order, order, null)).toBe('a');
		expect(tabStopRow(['b', 'c'], order, null)).toBe('b');
	});

	it('is the first rendered row when the current row is not in the order', () => {
		expect(tabStopRow(['a', 'b'], ['a', 'b'], 'c')).toBe('a');
	});

	it('is null with nothing rendered', () => {
		expect(tabStopRow([], order, 'a')).toBeNull();
		expect(tabStopRow([], order, null)).toBeNull();
		expect(tabStopRow([], [], 'z')).toBeNull();
	});
});
