/**
 * The Tasks view's keyboard model: which action a key on a row maps to,
 * which row stays current when the list changes, and which row holds the
 * tab stop. Rows are identified by `taskRowKey`.
 */

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

/** What the list does for a key: focus a row by index, toggle the row, or open its note at the task's line. */
export type TaskKeyAction = { kind: 'focus'; index: number } | { kind: 'toggle' } | { kind: 'open' };

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
 */
export function resolveTaskKey(input: TaskKeyInput): TaskKeyAction | null {
	const { key, repeat, onRow, meta, ctrl, alt, shift, index, count } = input;
	if (!onRow || meta || ctrl || alt || shift || count === 0) return null;
	switch (key) {
		case 'ArrowDown':
			return { kind: 'focus', index: Math.min(index + 1, count - 1) };
		case 'ArrowUp':
			return { kind: 'focus', index: Math.max(index - 1, 0) };
		case 'Home':
			return { kind: 'focus', index: 0 };
		case 'End':
			return { kind: 'focus', index: count - 1 };
		case ' ':
			return repeat ? null : { kind: 'toggle' };
		case 'Enter':
			return repeat ? null : { kind: 'open' };
		default:
			return null;
	}
}

/**
 * The current row after the list changed from `prevOrder` to `order`:
 * `current` when it is still listed, else the first row after it in
 * `prevOrder` that is still listed, else the nearest one before it, else
 * null. Null when `current` is null or was not in `prevOrder`.
 */
export function nextCurrentRow(order: string[], prevOrder: string[], current: string | null): string | null {
	if (current === null) return null;
	const listed = new Set(order);
	if (listed.has(current)) return current;
	const at = prevOrder.indexOf(current);
	if (at < 0) return null;
	for (let i = at + 1; i < prevOrder.length; i++) {
		if (listed.has(prevOrder[i])) return prevOrder[i];
	}
	for (let i = at - 1; i >= 0; i--) {
		if (listed.has(prevOrder[i])) return prevOrder[i];
	}
	return null;
}

/**
 * The row that holds the list's tab stop: `current` when it is rendered,
 * else the first rendered row, else null. The roving `tabindex`, focus on
 * open and the focus that follows a removed row all read this function.
 * @param rendered - the rows in the DOM, in display order
 * @param order - every row in display order (unused while `rendered` equals it)
 * @param current - the current row's key
 */
export function tabStopRow(rendered: string[], order: string[], current: string | null): string | null {
	void order;
	if (current !== null && rendered.includes(current)) return current;
	return rendered[0] ?? null;
}
