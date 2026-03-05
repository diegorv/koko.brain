/** Regex matching a block reference at the end of a line: ` ^block-id` */
const BLOCK_REF_RE = / \^([\w-]+)$/;

/** Result of finding a block reference in a line */
export interface BlockRefRange {
	/** Start of the block reference (includes leading space) */
	from: number;
	/** End of the block reference */
	to: number;
	/** The block ID (without `^`) */
	id: string;
}

/**
 * Finds a block reference (`^block-id`) at the end of a line.
 * Returns null if no block reference is found.
 */
export function findBlockReference(text: string, lineFrom: number): BlockRefRange | null {
	const match = text.match(BLOCK_REF_RE);
	if (!match) return null;
	return {
		from: lineFrom + match.index!,
		to: lineFrom + match.index! + match[0].length,
		id: match[1],
	};
}
