import { HEADING_RE, BLOCK_ID_RE } from '$lib/core/markdown-editor/extensions/wikilink';
import { getNoteName } from '$lib/features/backlinks/backlinks.logic';

/** The kind of markdown element detected on a line */
export type BlockElementType = 'heading' | 'list-item' | 'block';

/** Result of analyzing a line for copy-block-link */
export interface DetectedBlockElement {
	/** What type of element this line represents */
	type: BlockElementType;
	/** For headings: the sanitized heading text (block ID stripped). For others: null */
	headingText: string | null;
	/** Existing block ID if the line already ends with ^some-id, or null */
	existingBlockId: string | null;
}

/** Regex matching an unordered list item: `- `, `* `, `+ ` (with optional leading whitespace) */
const UNORDERED_LIST_RE = /^\s*[-*+]\s/;

/** Regex matching an ordered list item: `1. `, `2. `, etc. (with optional leading whitespace) */
const ORDERED_LIST_RE = /^\s*\d+\.\s/;

/** Characters used for random block ID generation */
const BLOCK_ID_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Length of generated block IDs */
const BLOCK_ID_LENGTH = 6;

/**
 * Detects the type of markdown element on a given line.
 * Priority: heading > list item > block.
 * Also extracts any existing block ID from the line.
 */
export function detectBlockElement(lineText: string): DetectedBlockElement {
	const blockIdMatch = BLOCK_ID_RE.exec(lineText);
	const existingBlockId = blockIdMatch ? blockIdMatch[1] : null;

	const headingMatch = HEADING_RE.exec(lineText);
	if (headingMatch) {
		let headingText = headingMatch[1].trim();
		// Strip block ID from heading text if present (e.g. "Title ^abc" → "Title")
		if (existingBlockId) {
			headingText = headingText.replace(/\s*\^[^\s]+\s*$/, '').trim();
		}
		return { type: 'heading', headingText, existingBlockId };
	}

	if (UNORDERED_LIST_RE.test(lineText) || ORDERED_LIST_RE.test(lineText)) {
		return { type: 'list-item', headingText: null, existingBlockId };
	}

	return { type: 'block', headingText: null, existingBlockId };
}

/**
 * Generates a random 6-character alphanumeric block ID.
 * Uses lowercase letters and digits.
 */
export function generateBlockId(): string {
	return Array.from(
		{ length: BLOCK_ID_LENGTH },
		() => BLOCK_ID_CHARS[Math.floor(Math.random() * BLOCK_ID_CHARS.length)]
	).join('');
}

/**
 * Builds a wikilink string for the given element.
 * Headings produce `[[noteName#headingText]]`, blocks produce `[[noteName#^blockId]]`.
 * When embed is true, the result is prefixed with `!`.
 */
export function buildWikilinkText(
	noteName: string,
	element: DetectedBlockElement,
	blockId: string | null,
	embed: boolean
): string {
	let link: string;

	if (element.type === 'heading' && element.headingText) {
		link = `[[${noteName}#${element.headingText}]]`;
	} else {
		link = `[[${noteName}#^${blockId}]]`;
	}

	return embed ? `!${link}` : link;
}

/**
 * Extracts the note name (without extension) from a file path.
 * Re-exports from backlinks.logic for convenience.
 */
export { getNoteName };
