/**
 * The generic keyboard model of a roving-tabindex list: which row a key
 * focuses, which row stays current when the list changes, and which row
 * holds the list's one tab stop. Rows are identified by string keys the
 * caller chooses.
 */

/** A keydown on a list, as `resolveRovingFocus` reads it. */
export interface RovingKeyInput {
	/** `KeyboardEvent.key` */
	key: string;
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

/**
 * The index of the row that ArrowUp, ArrowDown, Home or End focuses, or null
 * when the list leaves the key alone: a key on a control inside the row, any
 * modifier held, no rows, or any other key. Arrows clamp at the ends, so the
 * caller still prevents the scroll.
 */
export function resolveRovingFocus(input: RovingKeyInput): number | null {
	const { key, onRow, meta, ctrl, alt, shift, index, count } = input;
	if (!onRow || meta || ctrl || alt || shift || count === 0) return null;
	switch (key) {
		case 'ArrowDown':
			return Math.min(index + 1, count - 1);
		case 'ArrowUp':
			return Math.max(index - 1, 0);
		case 'Home':
			return 0;
		case 'End':
			return count - 1;
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
 * The row that holds the list's tab stop: `current` when it is rendered.
 * When `current` is listed but not rendered (a collapsed group, a row cap),
 * the first rendered row after it in `order`, else the last rendered row.
 * With no current row, or one not in `order`, the first rendered row. Null
 * when nothing is rendered.
 * @param rendered - the rows in the DOM, in display order
 * @param order - every row in display order, hidden ones included
 * @param current - the current row's key
 */
export function tabStopRow(rendered: string[], order: string[], current: string | null): string | null {
	if (rendered.length === 0) return null;
	if (current === null) return rendered[0];
	const shown = new Set(rendered);
	if (shown.has(current)) return current;
	const at = order.indexOf(current);
	if (at < 0) return rendered[0];
	for (let i = at + 1; i < order.length; i++) {
		if (shown.has(order[i])) return order[i];
	}
	return rendered[rendered.length - 1];
}
