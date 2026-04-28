import { Decoration } from '@codemirror/view';
import { findInlineCommentRanges } from '../../parsers/comment';
import type { LineHandler } from '../inline-formatting-plugin';

/**
 * Hides inline `%%text%%` comments. No Lezer node for `%%…%%` (Obsidian-specific
 * syntax), so this is a line handler — `findInlineCommentRanges` walks each
 * line for matches.
 *
 * Per-element cursor reveal:
 *   - cursor outside the comment → `cm-lp-inline-comment cm-lp-inline-comment-hidden`
 *     (display: none — collapsed entirely)
 *   - cursor inside the comment → `cm-lp-inline-comment` only (dimmed but visible)
 */
export const inlineCommentHandler: LineHandler = {
	name: 'inline-comment',
	decorate({ line, state, isTouched, decorations }) {
		const ranges = findInlineCommentRanges(state, line.from, line.to);
		for (const range of ranges) {
			const cls = isTouched(range.from, range.to)
				? 'cm-lp-inline-comment'
				: 'cm-lp-inline-comment cm-lp-inline-comment-hidden';
			decorations.push(Decoration.mark({ class: cls }).range(range.from, range.to));
		}
	},
};
