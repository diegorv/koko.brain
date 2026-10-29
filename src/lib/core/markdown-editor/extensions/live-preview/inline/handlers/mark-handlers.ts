import { hiddenSyntaxDeco } from '../../styles';
import type { NodeHandler } from '../inline-formatting-plugin';

/**
 * Builds a mark handler for an inline formatting delimiter — `**` (EmphasisMark),
 * `` ` `` (CodeMark), `~~` (StrikethroughMark), `==` (HighlightMark). Each fires
 * twice per element (open + close); the parent range is what the reveal rule
 * tests against, so both marks are replaced (hidden) unless a line of the
 * matching `StrongEmphasis` / `Emphasis` / `InlineCode` / `Strikethrough` /
 * `Highlight` parent is touched by the selection.
 */
function makeMarkHandler(nodeType: string): NodeHandler {
	return {
		nodeType,
		decorate({ node, isRevealed, decorations }) {
			const parent = node.node.parent;
			if (!parent) return;
			if (isRevealed(parent.from, parent.to)) return;
			decorations.push(hiddenSyntaxDeco.range(node.from, node.to));
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
 * `\` plus the escaped character. The `\` is hidden unless its line is
 * touched by the selection.
 */
export const escapeHandler: NodeHandler = {
	nodeType: 'Escape',
	decorate({ node, isRevealed, decorations }) {
		if (isRevealed(node.from, node.to)) return;
		// The Escape node covers `\` + the escaped character. Only hide the `\`.
		decorations.push(hiddenSyntaxDeco.range(node.from, node.from + 1));
	},
};
