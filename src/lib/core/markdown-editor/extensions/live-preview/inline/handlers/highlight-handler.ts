import { highlightTextDeco } from '../../styles';
import type { NodeHandler } from '../inline-formatting-plugin';

/**
 * Decorates `==text==` highlight ranges. The `Highlight` Lezer node comes from
 * Kokobrain's custom `HighlightExtension` (see `extensions/lezer/highlight-extension.ts`)
 * and spans the whole `==text==` (both delimiters + content), so a single
 * `Decoration.mark` per node covers the visible range.
 *
 * No cursor-reveal logic — highlight content is always shown. The `==`
 * delimiters themselves are handled by `mark-handlers.ts → HighlightMark`
 * which toggles visibility based on cursor position.
 */
export const highlightHandler: NodeHandler = {
	nodeType: 'Highlight',
	decorate({ node, decorations }) {
		decorations.push(highlightTextDeco.range(node.from, node.to));
	},
};
