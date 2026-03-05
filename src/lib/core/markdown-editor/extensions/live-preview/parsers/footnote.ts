import type { EditorState } from '@codemirror/state';

/** Range positions for a `[^label]` footnote reference */
export interface FootnoteRefRange {
	fullFrom: number;
	fullTo: number;
	label: string;
}

/** Range positions for a `[^label]: text` footnote definition */
export interface FootnoteDefRange {
	markerFrom: number;
	markerTo: number;
	label: string;
	contentFrom: number;
	contentTo: number;
}

/** Range positions for a `^[inline text]` inline footnote */
export interface InlineFootnoteRange {
	fullFrom: number;
	fullTo: number;
	openMarkFrom: number;
	openMarkTo: number;
	textFrom: number;
	textTo: number;
	closeMarkFrom: number;
	closeMarkTo: number;
}

/** Matches `[^label]` footnote references (not followed by `:` which would be a definition) */
const FOOTNOTE_REF_RE = /\[\^([^\]\\]*(?:\\.[^\]\\]*)*)\](?!:)/g;

/** Matches `[^label]: text` footnote definitions at the start of a line */
const FOOTNOTE_DEF_RE = /^\[\^([^\]\\]*(?:\\.[^\]\\]*)*)\]:\s*(.*)/;

/** Matches `^[inline text]` inline footnotes */
const INLINE_FOOTNOTE_RE = /\^\[([^\]\\]*(?:\\.[^\]\\]*)*)\]/g;

/**
 * Finds all `[^label]` footnote reference ranges on a single line.
 * Uses regex (Obsidian-specific syntax, no standard Lezer equivalent).
 */
export function findFootnoteRefRanges(state: EditorState, from: number, to: number): FootnoteRefRange[] {
	const text = state.doc.sliceString(from, to);
	const ranges: FootnoteRefRange[] = [];
	FOOTNOTE_REF_RE.lastIndex = 0;

	let match: RegExpExecArray | null;
	while ((match = FOOTNOTE_REF_RE.exec(text)) !== null) {
		// Skip if this is part of a definition line (starts with [^)
		if (match.index === 0 && FOOTNOTE_DEF_RE.test(text)) continue;

		ranges.push({
			fullFrom: from + match.index,
			fullTo: from + match.index + match[0].length,
			label: match[1],
		});
	}

	return ranges;
}

/**
 * Finds a `[^label]: text` footnote definition range, or null if not a definition line.
 * Uses regex (Obsidian-specific syntax, no standard Lezer equivalent).
 */
export function findFootnoteDefRange(state: EditorState, from: number, to: number): FootnoteDefRange | null {
	const text = state.doc.sliceString(from, to);
	const match = text.match(FOOTNOTE_DEF_RE);
	if (!match) return null;

	const label = match[1];
	const markerEnd = `[^${label}]:`.length;

	return {
		markerFrom: from,
		markerTo: from + markerEnd,
		label,
		contentFrom: from + markerEnd + (match[2] ? match[0].length - match[2].length - markerEnd : 0),
		contentTo: from + text.length,
	};
}

/**
 * Finds all `^[inline text]` inline footnote ranges on a single line.
 * Uses regex (Obsidian-specific syntax, no standard Lezer equivalent).
 */
export function findInlineFootnoteRanges(state: EditorState, from: number, to: number): InlineFootnoteRange[] {
	const text = state.doc.sliceString(from, to);
	const ranges: InlineFootnoteRange[] = [];
	INLINE_FOOTNOTE_RE.lastIndex = 0;

	let match: RegExpExecArray | null;
	while ((match = INLINE_FOOTNOTE_RE.exec(text)) !== null) {
		const start = from + match.index;
		const content = match[1];

		ranges.push({
			fullFrom: start,
			fullTo: start + match[0].length,
			openMarkFrom: start,
			openMarkTo: start + 2, // ^[
			textFrom: start + 2,
			textTo: start + 2 + content.length,
			closeMarkFrom: start + 2 + content.length,
			closeMarkTo: start + match[0].length, // ]
		});
	}

	return ranges;
}
