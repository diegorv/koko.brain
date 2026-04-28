import { highlightTextDeco } from '../../styles';
import type { NodeHandler } from '../inline-formatting-plugin';

/**
 * Decorates `==text==` highlight ranges. The `Highlight` Lezer node comes from
 * Kokobrain's custom `HighlightExtension` (see `extensions/lezer/highlight-extension.ts`)
 * and spans the whole `==text==` (both delimiters + content), so a single
 * `Decoration.mark` per node reproduces the legacy plugin's range exactly.
 *
 * No cursor-reveal logic — the legacy `markdown-style-plugin` didn't toggle
 * visibility for highlight content either. The opening/closing `==` marks
 * themselves are handled by `inline-marks-plugin` (Phase 10) for cursor reveal.
 */
export const highlightHandler: NodeHandler = {
	nodeType: 'Highlight',
	decorate({ node, decorations }) {
		decorations.push(highlightTextDeco.range(node.from, node.to));
	},
};
