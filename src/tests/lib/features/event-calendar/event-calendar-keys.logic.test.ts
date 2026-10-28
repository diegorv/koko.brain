import { describe, expect, it } from 'vitest';

import {
	isTypingTarget,
	resolveCalendarKey,
	type CalendarKeyEvent,
	type CalendarKeyState,
} from '$lib/features/event-calendar/event-calendar-keys.logic';

/** A key press with no modifiers unless overridden. */
function key(k: string, mods: Partial<Omit<CalendarKeyEvent, 'key'>> = {}): CalendarKeyEvent {
	return { key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods };
}

/** A view state with nothing open and no focused block unless overridden. */
function state(overrides: Partial<CalendarKeyState> = {}): CalendarKeyState {
	return { typing: false, dialogOpen: false, targetInTablist: false, popoverPath: null, focusedEventPath: null, ...overrides };
}

describe('isTypingTarget', () => {
	it('is true for inputs, textareas and selects, in any tag case', () => {
		expect(isTypingTarget({ tagName: 'INPUT' } as unknown as EventTarget)).toBe(true);
		expect(isTypingTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true);
		expect(isTypingTarget({ tagName: 'select' } as unknown as EventTarget)).toBe(true);
	});

	it('is true for a contenteditable element', () => {
		expect(isTypingTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget)).toBe(true);
	});

	it('is false for other elements, null and non-elements', () => {
		expect(isTypingTarget({ tagName: 'DIV', isContentEditable: false } as unknown as EventTarget)).toBe(false);
		expect(isTypingTarget({ tagName: 'BUTTON' } as unknown as EventTarget)).toBe(false);
		expect(isTypingTarget(null)).toBe(false);
		expect(isTypingTarget({} as EventTarget)).toBe(false);
	});
});

describe('resolveCalendarKey', () => {
	it('maps T to today and N to a new event, in either case', () => {
		expect(resolveCalendarKey(key('t'), state())).toEqual({ kind: 'today' });
		expect(resolveCalendarKey(key('T', { shiftKey: true }), state())).toEqual({ kind: 'today' });
		expect(resolveCalendarKey(key('n'), state())).toEqual({ kind: 'new-event' });
	});

	it('maps D, W and M to the views', () => {
		expect(resolveCalendarKey(key('d'), state())).toEqual({ kind: 'view', view: 'day' });
		expect(resolveCalendarKey(key('w'), state())).toEqual({ kind: 'view', view: 'week' });
		expect(resolveCalendarKey(key('M'), state())).toEqual({ kind: 'view', view: 'month' });
	});

	it('steps with ArrowLeft and ArrowRight', () => {
		expect(resolveCalendarKey(key('ArrowLeft'), state())).toEqual({ kind: 'step', dir: -1 });
		expect(resolveCalendarKey(key('ArrowRight'), state())).toEqual({ kind: 'step', dir: 1 });
	});

	it('ignores the arrows inside the tablist', () => {
		expect(resolveCalendarKey(key('ArrowLeft'), state({ targetInTablist: true }))).toBeNull();
		expect(resolveCalendarKey(key('ArrowRight'), state({ targetInTablist: true }))).toBeNull();
		// Letters still work there.
		expect(resolveCalendarKey(key('m'), state({ targetInTablist: true }))).toEqual({ kind: 'view', view: 'month' });
	});

	it('ignores letters and arrows while Meta, Ctrl or Alt is held', () => {
		for (const mod of ['metaKey', 'ctrlKey', 'altKey'] as const) {
			expect(resolveCalendarKey(key('t', { [mod]: true }), state())).toBeNull();
			expect(resolveCalendarKey(key('w', { [mod]: true }), state())).toBeNull();
			expect(resolveCalendarKey(key('n', { [mod]: true }), state())).toBeNull();
			expect(resolveCalendarKey(key('ArrowRight', { [mod]: true }), state())).toBeNull();
		}
	});

	it('deletes the popover event first, else the focused block, else nothing', () => {
		expect(resolveCalendarKey(key('Delete'), state({ popoverPath: '/v/a.md', focusedEventPath: '/v/b.md' }))).toEqual({
			kind: 'delete',
			path: '/v/a.md',
		});
		expect(resolveCalendarKey(key('Backspace'), state({ focusedEventPath: '/v/b.md' }))).toEqual({ kind: 'delete', path: '/v/b.md' });
		expect(resolveCalendarKey(key('Delete'), state())).toBeNull();
	});

	it('closes an open popover on Escape and leaves Escape alone otherwise', () => {
		expect(resolveCalendarKey(key('Escape'), state({ popoverPath: '/v/a.md' }))).toEqual({ kind: 'close-popover' });
		expect(resolveCalendarKey(key('Escape'), state())).toBeNull();
	});

	it('maps Cmd+Z to undo, Shift+Cmd+Z and Ctrl+Y to redo', () => {
		expect(resolveCalendarKey(key('z', { metaKey: true }), state())).toEqual({ kind: 'undo' });
		expect(resolveCalendarKey(key('Z', { metaKey: true, shiftKey: true }), state())).toEqual({ kind: 'redo' });
		expect(resolveCalendarKey(key('y', { ctrlKey: true }), state())).toEqual({ kind: 'redo' });
	});

	it('does not treat other modifier combos as undo or redo', () => {
		expect(resolveCalendarKey(key('z'), state())).toBeNull();
		expect(resolveCalendarKey(key('z', { metaKey: true, altKey: true }), state())).toBeNull();
		expect(resolveCalendarKey(key('z', { ctrlKey: true }), state())).toBeNull();
		expect(resolveCalendarKey(key('y', { metaKey: true }), state())).toBeNull();
		expect(resolveCalendarKey(key('y', { ctrlKey: true, shiftKey: true }), state())).toBeNull();
	});

	it('ignores every key while the user types', () => {
		for (const k of [key('t'), key('m'), key('ArrowLeft'), key('Delete'), key('z', { metaKey: true }), key('y', { ctrlKey: true })]) {
			expect(resolveCalendarKey(k, state({ typing: true, focusedEventPath: '/v/a.md' }))).toBeNull();
		}
	});

	it('ignores every key while the dialog is open', () => {
		for (const k of [key('w'), key('n'), key('ArrowRight'), key('Escape'), key('z', { metaKey: true })]) {
			expect(resolveCalendarKey(k, state({ dialogOpen: true, popoverPath: '/v/a.md' }))).toBeNull();
		}
	});

	it('returns null for keys that are not shortcuts', () => {
		expect(resolveCalendarKey(key('x'), state())).toBeNull();
		expect(resolveCalendarKey(key('Enter'), state({ focusedEventPath: '/v/a.md' }))).toBeNull();
		expect(resolveCalendarKey(key(' '), state())).toBeNull();
		expect(resolveCalendarKey(key('ArrowUp'), state())).toBeNull();
		expect(resolveCalendarKey(key('constructor'), state())).toBeNull();
	});
});
