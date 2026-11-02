/** A single-range change that turns one doc into another. */
export interface DocChange {
	/** Start of the replaced range in the old doc. */
	from: number;
	/** End of the replaced range in the old doc. */
	to: number;
	/** Text that replaces `from..to`. */
	insert: string;
}

/**
 * The smallest single range that turns `prev` into `next`: everything
 * between their common prefix and common suffix. Dispatching this instead of
 * a whole-doc replace lets CodeMirror map undo events and the selection
 * through the edit, so an undo outside the changed range lands where it was
 * made instead of after the replacement text.
 */
export function docDiff(prev: string, next: string): DocChange {
	const max = Math.min(prev.length, next.length);
	let start = 0;
	while (start < max && prev.charCodeAt(start) === next.charCodeAt(start)) start++;
	let end = 0;
	while (
		end < max - start &&
		prev.charCodeAt(prev.length - 1 - end) === next.charCodeAt(next.length - 1 - end)
	) {
		end++;
	}
	return { from: start, to: prev.length - end, insert: next.slice(start, next.length - end) };
}
