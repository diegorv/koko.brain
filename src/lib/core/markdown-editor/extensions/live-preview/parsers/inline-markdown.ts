/** Types of inline markdown segments */
export type InlineSegmentType = 'text' | 'bold' | 'italic' | 'strikethrough' | 'code';

/** A segment of parsed inline markdown */
export interface InlineSegment {
	type: InlineSegmentType;
	content: string;
}

/**
 * Matches inline markdown patterns in priority order:
 * - `code` (backticks — highest priority, contents not parsed further)
 * - **bold** (double asterisks)
 * - *italic* (single asterisks)
 * - ~~strikethrough~~ (double tildes)
 */
const INLINE_RE = /`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*|~~(.+?)~~/g;

/**
 * Parses inline markdown text into a list of typed segments.
 * Supports bold, italic, strikethrough, and inline code.
 * Returns an empty array for empty input.
 */
export function renderInlineMarkdown(text: string): InlineSegment[] {
	if (!text) return [];

	const segments: InlineSegment[] = [];
	let lastIndex = 0;

	INLINE_RE.lastIndex = 0;
	let match: RegExpExecArray | null;

	while ((match = INLINE_RE.exec(text)) !== null) {
		// Add plain text before this match
		if (match.index > lastIndex) {
			segments.push({ type: 'text', content: text.slice(lastIndex, match.index) });
		}

		if (match[1] !== undefined) {
			segments.push({ type: 'code', content: match[1] });
		} else if (match[2] !== undefined) {
			segments.push({ type: 'bold', content: match[2] });
		} else if (match[3] !== undefined) {
			segments.push({ type: 'italic', content: match[3] });
		} else if (match[4] !== undefined) {
			segments.push({ type: 'strikethrough', content: match[4] });
		}

		lastIndex = match.index + match[0].length;
	}

	// Add remaining plain text
	if (lastIndex < text.length) {
		segments.push({ type: 'text', content: text.slice(lastIndex) });
	}

	return segments;
}
