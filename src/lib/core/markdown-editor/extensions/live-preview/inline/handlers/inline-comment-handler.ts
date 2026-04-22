import { Decoration } from '@codemirror/view';

import { findInlineCommentRanges } from '../../parsers/comment';
import { hideClass } from '../cursor-reveal';
import type { InlineLineHandler, InlineDecorationEntry } from '../inline-formatting-plugin';

/**
 * Handles inline `%%comment%%` syntax. The parser is regex-based (no Lezer
 * node) so we register as a line handler. Cursor-reveal: when the cursor is
 * inside the comment it shows dimmed (`cm-lp-inline-comment`); when outside
 * it's hidden (`cm-lp-inline-comment cm-lp-inline-comment-hidden`).
 */
export const inlineCommentHandler: InlineLineHandler = {
	decorate: ({ state, line, isTouched }) => {
		const entries: InlineDecorationEntry[] = [];
		for (const range of findInlineCommentRanges(state, line.from, line.to)) {
			const cls = hideClass('cm-lp-inline-comment', isTouched(range.from, range.to));
			entries.push({
				from: range.from,
				to: range.to,
				deco: Decoration.mark({ class: cls }),
			});
		}
		return entries;
	},
};
