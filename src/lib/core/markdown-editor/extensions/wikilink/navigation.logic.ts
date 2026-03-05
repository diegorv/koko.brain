/** Regex matching any ATX heading: `# Title`, `## Title`, etc. */
export const HEADING_RE = /^#{1,6}\s+(.+)$/;

/** Regex matching a block-id marker at the end of a line: `text ^block-id` */
export const BLOCK_ID_RE = /\^([^\s]+)\s*$/;

/**
 * Finds the document position of a heading by name.
 * Searches for an ATX heading (`# Name`) matching the given name (case-insensitive).
 * Returns the position of the start of the heading line, or null if not found.
 */
export function findHeadingPosition(content: string, headingName: string): number | null {
	const lines = content.split('\n');
	let pos = 0;

	for (const line of lines) {
		const match = HEADING_RE.exec(line);
		if (match && match[1].trim().toLowerCase() === headingName.toLowerCase()) {
			return pos;
		}
		pos += line.length + 1;
	}

	return null;
}

/**
 * Finds the document position of a block identified by `^block-id`.
 * Searches for a line ending with `^block-id` and returns its start position,
 * or null if not found.
 */
export function findBlockIdPosition(content: string, blockId: string): number | null {
	const lines = content.split('\n');
	let pos = 0;

	for (const line of lines) {
		const match = BLOCK_ID_RE.exec(line);
		if (match && match[1] === blockId) {
			return pos;
		}
		pos += line.length + 1;
	}

	return null;
}
