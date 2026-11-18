/**
 * The Tasks view's keyboard model: which action a key on a row maps to,
 * which row stays current when the list changes, and which row holds the
 * tab stop. Rows are identified by `taskRowKey`. The arrow, Home and End
 * keys, `nextCurrentRow` and `tabStopRow` are the shared roving-list model
 * in `utils/roving-list.ts`; the Space, Enter and menu keys are Tasks-only.
 */

import { resolveRovingFocus } from '#lib/utils/roving-list.js';

export { nextCurrentRow, tabStopRow } from '#lib/utils/roving-list.js';

/** A keydown on the task list, as `resolveTaskKey` reads it. */
export interface TaskKeyInput {
	/** `KeyboardEvent.key`; Space is `' '` */
	key: string;
	/** `KeyboardEvent.repeat`: the key is held down */
	repeat: boolean;
	/** True when the event target is the row itself, not a control inside it */
	onRow: boolean;
	/** Meta held */
	meta: boolean;
	/** Ctrl held */
	ctrl: boolean;
	/** Alt held */
	alt: boolean;
	/** Shift held */
	shift: boolean;
	/** Index of the focused row among the rendered rows */
	index: number;
	/** Number of rendered rows */
	count: number;
}

/** What the list does for a key: focus a row by index, toggle the row, open its note at the task's line, or open the row's menu. */
export type TaskKeyAction = { kind: 'focus'; index: number } | { kind: 'toggle' } | { kind: 'open' } | { kind: 'menu' };

/** The `<filePath>:<lineNumber>` key that identifies a task row. */
export function taskRowKey(filePath: string, lineNumber: number): string {
	return `${filePath}:${lineNumber}`;
}

/**
 * Maps a keydown on the task list to an action, or null when the list leaves
 * the key alone: a key on a control inside the row (it keeps its native
 * click), any modifier held, no rows, a repeated Space or Enter (holding
 * Space would toggle each row that slides under focus), or any other key.
 * Arrows clamp at the ends, so the caller still prevents the scroll.
 * Shift+F10 and the bare ContextMenu key open the row's menu: Shift+F10 is
 * the one key Shift does not cancel.
 */
export function resolveTaskKey(input: TaskKeyInput): TaskKeyAction | null {
	const { key, repeat, onRow, meta, ctrl, alt, shift, index, count } = input;
	if (!onRow || meta || ctrl || alt || count === 0) return null;
	if (shift) return key === 'F10' ? { kind: 'menu' } : null;
	if (key === 'ContextMenu') return { kind: 'menu' };
	const focus = resolveRovingFocus({ key, onRow, meta, ctrl, alt, shift, index, count });
	if (focus !== null) return { kind: 'focus', index: focus };
	switch (key) {
		case ' ':
			return repeat ? null : { kind: 'toggle' };
		case 'Enter':
			return repeat ? null : { kind: 'open' };
		default:
			return null;
	}
}
