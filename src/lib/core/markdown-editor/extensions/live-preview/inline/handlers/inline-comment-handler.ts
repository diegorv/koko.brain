import { Decoration } from '@codemirror/view';
import { hiddenSyntaxDeco } from '../../styles';
import { findInlineCommentRanges } from '../../parsers/comment';
import type { LineHandler } from '../inline-formatting-plugin';

/** Dimmed but visible comment, used while the cursor is inside it. */
const revealedCommentDeco = Decoration.mark({ class: 'cm-lp-inline-comment' });

/**
 * Hides inline `%%text%%` comments. No Lezer node for `%%…%%` (Obsidian-specific
 * syntax), so this is a line handler — `findInlineCommentRanges` walks each
 * line for matches.
 *
 * Per-element cursor reveal:
 *   - cursor outside the comment → `hiddenSyntaxDeco` (removed from the DOM)
 *   - cursor inside the comment → `cm-lp-inline-comment` only (dimmed but visible)
 */
export const inlineCommentHandler: LineHandler = {
	name: 'inline-comment',
	decorate({ line, state, isTouched, decorations }) {
		const ranges = findInlineCommentRanges(state, line.from, line.to);
		for (const range of ranges) {
			const deco = isTouched(range.from, range.to) ? revealedCommentDeco : hiddenSyntaxDeco;
			decorations.push(deco.range(range.from, range.to));
		}
	},
};
