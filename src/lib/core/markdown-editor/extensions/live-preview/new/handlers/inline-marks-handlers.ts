import { Decoration } from '@codemirror/view';

import type { InlineHandler, InlineDecorationEntry } from '../inline-formatting-plugin';

const FORMATTING_CLS = 'cm-formatting-inline';

function markClass(touched: boolean): string {
	return touched ? `${FORMATTING_CLS} cm-formatting-inline-visible` : FORMATTING_CLS;
}

/**
 * Factory for the four marks whose visibility reveals when the cursor enters
 * the PARENT span: EmphasisMark (`*` / `**`), CodeMark (`` ` ``),
 * StrikethroughMark (`~~`), and HighlightMark (`==`). HighlightMark gets a
 * Lezer node from the custom HighlightExtension (Phase 3), so it dispatches
 * here uniformly instead of via a regex line handler.
 */
function makeMarkHandler(nodeType: string): InlineHandler {
	return {
		nodeType,
		decorate: ({ node, isTouched }): InlineDecorationEntry | null => {
			const parent = node.node.parent;
			if (!parent) return null;
			return {
				from: node.from,
				to: node.to,
				deco: Decoration.mark({ class: markClass(isTouched(parent.from, parent.to)) }),
			};
		},
	};
}

/**
 * `\*`, `\#`, etc. The Escape node covers backslash + the escaped character;
 * only the backslash is hidden. Reveal tracks the Escape node's own range.
 */
const escapeHandler: InlineHandler = {
	nodeType: 'Escape',
	decorate: ({ node, isTouched }) => ({
		from: node.from,
		to: node.from + 1,
		deco: Decoration.mark({ class: markClass(isTouched(node.from, node.to)) }),
	}),
};

export const inlineMarksHandlers: readonly InlineHandler[] = [
	makeMarkHandler('EmphasisMark'),
	makeMarkHandler('CodeMark'),
	makeMarkHandler('StrikethroughMark'),
	makeMarkHandler('HighlightMark'),
	escapeHandler,
];
