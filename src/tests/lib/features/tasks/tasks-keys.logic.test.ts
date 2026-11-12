import { describe, it, expect } from 'vitest';
import {
	nextCurrentRow,
	resolveTaskKey,
	tabStopRow,
	taskRowKey,
	type TaskKeyInput,
} from '#lib/features/tasks/tasks-keys.logic.js';

/** A plain key on a row in the middle of a five-row list. */
function input(overrides: Partial<TaskKeyInput> = {}): TaskKeyInput {
	return {
		key: 'ArrowDown',
		repeat: false,
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

const ALL_KEYS = ['ArrowDown', 'ArrowUp', 'Home', 'End', ' ', 'Enter'];

describe('resolveTaskKey', () => {
	it('moves one row with ArrowDown and ArrowUp in the middle', () => {
		expect(resolveTaskKey(input({ key: 'ArrowDown' }))).toEqual({ kind: 'focus', index: 3 });
		expect(resolveTaskKey(input({ key: 'ArrowUp' }))).toEqual({ kind: 'focus', index: 1 });
	});

	it('clamps at the ends instead of returning null', () => {
		expect(resolveTaskKey(input({ key: 'ArrowDown', index: 4 }))).toEqual({ kind: 'focus', index: 4 });
		expect(resolveTaskKey(input({ key: 'ArrowUp', index: 0 }))).toEqual({ kind: 'focus', index: 0 });
	});

	it('goes to the first row with Home and the last with End', () => {
		expect(resolveTaskKey(input({ key: 'Home' }))).toEqual({ kind: 'focus', index: 0 });
		expect(resolveTaskKey(input({ key: 'End' }))).toEqual({ kind: 'focus', index: 4 });
	});

	it('toggles with Space and opens with Enter', () => {
		expect(resolveTaskKey(input({ key: ' ' }))).toEqual({ kind: 'toggle' });
		expect(resolveTaskKey(input({ key: 'Enter' }))).toEqual({ kind: 'open' });
	});

	it('ignores a repeated Space or Enter but still moves on a repeated arrow', () => {
		expect(resolveTaskKey(input({ key: ' ', repeat: true }))).toBeNull();
		expect(resolveTaskKey(input({ key: 'Enter', repeat: true }))).toBeNull();
		expect(resolveTaskKey(input({ key: 'ArrowDown', repeat: true }))).toEqual({ kind: 'focus', index: 3 });
	});

	it.each(ALL_KEYS)('returns null for %j when the key landed on a control inside the row', (key) => {
		expect(resolveTaskKey(input({ key, onRow: false }))).toBeNull();
	});

	it.each(['meta', 'ctrl', 'alt', 'shift'] as const)('returns null for every key with %s held', (modifier) => {
		for (const key of ALL_KEYS) {
			expect(resolveTaskKey(input({ key, [modifier]: true }))).toBeNull();
		}
	});

	it.each(ALL_KEYS)('returns null for %j with no rows', (key) => {
		expect(resolveTaskKey(input({ key, index: 0, count: 0 }))).toBeNull();
	});

	it.each(['a', 'Tab', 'Escape'])('returns null for %j', (key) => {
		expect(resolveTaskKey(input({ key }))).toBeNull();
	});

	it('opens the row menu with Shift+F10 and with the ContextMenu key', () => {
		expect(resolveTaskKey(input({ key: 'F10', shift: true }))).toEqual({ kind: 'menu' });
		expect(resolveTaskKey(input({ key: 'ContextMenu' }))).toEqual({ kind: 'menu' });
	});

	it('returns null for F10 without Shift, and for either menu key with Meta, Ctrl or Alt', () => {
		expect(resolveTaskKey(input({ key: 'F10' }))).toBeNull();
		for (const modifier of ['meta', 'ctrl', 'alt'] as const) {
			expect(resolveTaskKey(input({ key: 'F10', shift: true, [modifier]: true }))).toBeNull();
			expect(resolveTaskKey(input({ key: 'ContextMenu', [modifier]: true }))).toBeNull();
		}
		expect(resolveTaskKey(input({ key: 'ContextMenu', shift: true }))).toBeNull();
	});

	it('returns null for a menu key off a row or with no rows', () => {
		for (const keys of [{ key: 'F10', shift: true }, { key: 'ContextMenu' }]) {
			expect(resolveTaskKey(input({ ...keys, onRow: false }))).toBeNull();
			expect(resolveTaskKey(input({ ...keys, index: 0, count: 0 }))).toBeNull();
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

	it('is the first rendered row when the current row is in no group', () => {
		expect(tabStopRow(['a', 'b'], ['a', 'b'], 'c')).toBe('a');
	});

	it('is null with nothing rendered', () => {
		expect(tabStopRow([], order, 'a')).toBeNull();
		expect(tabStopRow([], order, null)).toBeNull();
		expect(tabStopRow([], [], 'z')).toBeNull();
	});
});

describe('taskRowKey', () => {
	it('joins the path and the line number', () => {
		expect(taskRowKey('/vault/a:b.md', 12)).toBe('/vault/a:b.md:12');
	});
});
