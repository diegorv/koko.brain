import { Decoration } from '@codemirror/view';
import type { NodeHandler } from '../inline-formatting-plugin';

const HIDDEN_CLS = 'cm-formatting-inline';
const VISIBLE_CLS = 'cm-formatting-inline cm-formatting-inline-visible';

/**
 * Builds a mark handler for an inline formatting delimiter — `**` (EmphasisMark),
 * `` ` `` (CodeMark), `~~` (StrikethroughMark), `==` (HighlightMark). Each fires
 * twice per element (open + close); the parent range is what cursor-reveal
 * tests against, so the open mark is shown when the cursor sits inside the
 * matching `StrongEmphasis` / `Emphasis` / `InlineCode` / `Strikethrough` /
 * `Highlight` parent.
 */
function makeMarkHandler(nodeType: string): NodeHandler {
	return {
		nodeType,
		decorate({ node, isTouched, decorations }) {
			const parent = node.node.parent;
			if (!parent) return;
			const cls = isTouched(parent.from, parent.to) ? VISIBLE_CLS : HIDDEN_CLS;
			decorations.push(Decoration.mark({ class: cls }).range(node.from, node.to));
		},
	};
}

/**
 * Five mark handlers covering the inline formatting marks the legacy
 * `inlineMarksPlugin` toggled. `HighlightMark` flips from the legacy
 * line-handler approach to a Lezer node match — the custom
 * `HighlightExtension` (`extensions/lezer/highlight-extension.ts`) already
 * defines it as a Lezer node with parent `Highlight`, so the same pattern
 * works as for the GFM marks.
 */
export const markHandlers: readonly NodeHandler[] = [
	makeMarkHandler('EmphasisMark'),
	makeMarkHandler('CodeMark'),
	makeMarkHandler('StrikethroughMark'),
	makeMarkHandler('HighlightMark'),
];

/**
 * Backslash escape sequences (`\*`, `\#`, …) — the `Escape` Lezer node spans
 * `\` plus the escaped character. The `\` is hidden when the cursor is
 * outside the node and shown when inside.
 */
export const escapeHandler: NodeHandler = {
	nodeType: 'Escape',
	decorate({ node, isTouched, decorations }) {
		const cls = isTouched(node.from, node.to) ? VISIBLE_CLS : HIDDEN_CLS;
		// The Escape node covers `\` + the escaped character. Only hide the `\`.
		decorations.push(Decoration.mark({ class: cls }).range(node.from, node.from + 1));
	},
};
