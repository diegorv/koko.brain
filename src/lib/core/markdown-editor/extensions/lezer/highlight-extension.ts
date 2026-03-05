import type { MarkdownConfig, InlineParser, InlineContext, DelimiterType } from '@lezer/markdown';
import { tags as t } from '@lezer/highlight';

/** Delimiter type for highlight — uses the delimiter-matching approach (like Strikethrough)
 * so that inline formatting (bold, italic, etc.) is still parsed inside highlights. */
const HighlightDelim: DelimiterType = { resolve: 'Highlight', mark: 'HighlightMark' };

/**
 * Inline highlight parser for `==text==` syntax.
 * Uses delimiter-based matching (like GFM Strikethrough) so that inline
 * formatting inside highlights is still parsed correctly.
 *
 * Triggered on `=` (char code 61), requires two consecutive `=`.
 */
const inlineHighlightParser: InlineParser = {
	name: 'Highlight',
	parse(cx: InlineContext, next: number, pos: number): number {
		// Must be = (char code 61) followed by another =
		if (next !== 61 || cx.char(pos + 1) !== 61) return -1;

		// Determine open/close based on surrounding content (like Strikethrough)
		const before = cx.slice(pos - 1, pos);
		const after = cx.slice(pos + 2, pos + 3);
		const sBefore = /\s|^$/.test(before);
		const sAfter = /\s|^$/.test(after);

		return cx.addDelimiter(HighlightDelim, pos, pos + 2, !sAfter, !sBefore);
	},
	after: 'Emphasis',
};

/**
 * Lezer MarkdownConfig extension for highlight syntax (`==text==`).
 * Adds `Highlight` and `HighlightMark` nodes to the syntax tree.
 * Uses delimiter-based parsing so content inside `==...==` can contain
 * other inline formatting (bold, italic, code, etc.).
 */
export const HighlightExtension: MarkdownConfig = {
	defineNodes: [
		{ name: 'Highlight', style: t.special(t.content) },
		{ name: 'HighlightMark', style: t.processingInstruction },
	],
	parseInline: [inlineHighlightParser],
};
