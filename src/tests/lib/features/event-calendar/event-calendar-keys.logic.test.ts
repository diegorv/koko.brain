import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
	CALENDAR_SHORTCUTS,
	isTypingTarget,
	resolveCalendarKey,
	type CalendarKeyAction,
	type CalendarKeyEvent,
	type CalendarKeyState,
} from '$lib/features/event-calendar/event-calendar-keys.logic';

/** A key press with no modifiers unless overridden. */
function key(k: string, mods: Partial<Omit<CalendarKeyEvent, 'key'>> = {}): CalendarKeyEvent {
	return { key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods };
}

/** A view state with nothing open and no focused block unless overridden. */
function state(overrides: Partial<CalendarKeyState> = {}): CalendarKeyState {
	return { typing: false, dialogOpen: false, gestureLive: false, targetInTablist: false, popoverPath: null, focusedEventPath: null, ...overrides };
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
	it('maps nothing while a pointer gesture is live, chords included', () => {
		const live = state({ gestureLive: true, popoverPath: '/v/a.md', focusedEventPath: '/v/a.md' });
		const presses = [
			key('?'), key('t'), key('n'), key('d'), key('w'), key('m'),
			key('ArrowLeft'), key('ArrowRight'), key('Delete'), key('Backspace'), key('Escape'),
			key('z', { metaKey: true }), key('z', { metaKey: true, shiftKey: true }), key('y', { ctrlKey: true }),
		];
		for (const press of presses) expect(resolveCalendarKey(press, live), press.key).toBeNull();
		expect(resolveCalendarKey(key('d'), state({ gestureLive: false }))).toEqual({ kind: 'view', view: 'day' });
	});

	it('maps ? to the shortcuts help, with or without Shift held', () => {
		expect(resolveCalendarKey(key('?'), state())).toEqual({ kind: 'help' });
		expect(resolveCalendarKey(key('?', { shiftKey: true }), state())).toEqual({ kind: 'help' });
		expect(resolveCalendarKey(key('?', { metaKey: true }), state())).toBeNull();
		expect(resolveCalendarKey(key('?'), state({ typing: true }))).toBeNull();
		expect(resolveCalendarKey(key('?'), state({ dialogOpen: true }))).toBeNull();
	});

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

/** Turns a chord as the table writes it ("Cmd+Shift+Z", "Left", "D") into a key press. */
function chordToKey(chord: string): CalendarKeyEvent {
	const parts = chord.split('+');
	const name = parts.pop()!;
	const named: Record<string, string> = { Left: 'ArrowLeft', Right: 'ArrowRight' };
	return key(named[name] ?? (name.length === 1 ? name.toLowerCase() : name), {
		metaKey: parts.includes('Cmd'),
		ctrlKey: parts.includes('Ctrl'),
		shiftKey: parts.includes('Shift'),
	});
}

/** The `## <heading>` section of a help page, up to the next `## ` heading. */
function helpSection(file: string, heading: string): string {
	const text = readFileSync(resolve(process.cwd(), 'help/documentation', file), 'utf8');
	const start = text.indexOf(`\n## ${heading}\n`);
	expect(start, `${file} has no "## ${heading}" section`).toBeGreaterThanOrEqual(0);
	const end = text.indexOf('\n## ', start + 1);
	return text.slice(start, end === -1 ? undefined : end);
}

describe('CALENDAR_SHORTCUTS', () => {
	it('resolves every chord of a row to that row action', () => {
		for (const row of CALENDAR_SHORTCUTS) {
			for (const chord of row.keys) {
				const action = resolveCalendarKey(chordToKey(chord), state({ popoverPath: '/v/a.md' }));
				expect(action?.kind, chord).toBe(row.action);
			}
		}
	});

	it('has a row for every action resolveCalendarKey returns', () => {
		// A new action kind fails `pnpm check` here until it is listed.
		const kinds: Record<CalendarKeyAction['kind'], true> = {
			help: true,
			today: true,
			view: true,
			step: true,
			'new-event': true,
			delete: true,
			'close-popover': true,
			undo: true,
			redo: true,
		};
		expect(new Set(CALENDAR_SHORTCUTS.map((r) => r.action))).toEqual(new Set(Object.keys(kinds)));
	});

	it('gives each action kind one row', () => {
		// The dialog keys its rows by action kind.
		const kinds = CALENDAR_SHORTCUTS.map((r) => r.action);
		expect(new Set(kinds).size).toBe(kinds.length);
	});

	it('lists every press resolveCalendarKey handles in the row of its action', () => {
		// The resolver ignores Shift on bare keys, so Shift only counts with Cmd or Ctrl.
		const normalize = (e: CalendarKeyEvent) =>
			[e.key.toLowerCase(), e.metaKey, e.ctrlKey, e.altKey, e.shiftKey && (e.metaKey || e.ctrlKey)].join('|');
		const printable = Array.from({ length: 0x7e - 0x20 + 1 }, (_, i) => String.fromCharCode(0x20 + i));
		const named = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete', 'Backspace', 'Escape', 'Enter', 'Tab', 'Home', 'End', 'PageUp', 'PageDown'];
		const modifierSets: Partial<Omit<CalendarKeyEvent, 'key'>>[] = [
			{},
			{ shiftKey: true },
			{ metaKey: true },
			{ metaKey: true, shiftKey: true },
			{ ctrlKey: true },
			{ ctrlKey: true, shiftKey: true },
			{ altKey: true },
		];
		let resolved = 0;
		for (const k of [...printable, ...named]) {
			for (const mods of modifierSets) {
				const press = key(k, mods);
				const action = resolveCalendarKey(press, state({ popoverPath: '/v/a.md' }));
				if (!action) continue;
				resolved++;
				const row = CALENDAR_SHORTCUTS.find((r) => r.action === action.kind);
				const chords = (row?.keys ?? []).map((c) => normalize(chordToKey(c)));
				expect(chords, `${JSON.stringify(press)} -> ${action.kind}`).toContain(normalize(press));
			}
		}
		expect(resolved).toBeGreaterThan(0);
	});

	it('gives every row at least one chord and a label', () => {
		for (const row of CALENDAR_SHORTCUTS) {
			expect(row.keys.length, row.action).toBeGreaterThan(0);
			expect(row.label.trim(), row.action).not.toBe('');
		}
	});

	it.each([
		['20-keyboard-shortcuts.md', 'Calendar'],
		['27-calendar.md', 'Calendar Keyboard Shortcuts'],
	])('lists every chord in %s', (file, heading) => {
		const section = helpSection(file, heading);
		for (const chord of CALENDAR_SHORTCUTS.flatMap((r) => r.keys)) {
			expect(section, `${file} is missing \`${chord}\``).toContain(`\`${chord}\``);
		}
	});
});
