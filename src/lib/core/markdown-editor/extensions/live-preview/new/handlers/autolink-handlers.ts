import { Decoration } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { linkTextDeco } from '../../styles';
import { findExtendedAutolinkRanges } from '../../parsers/link';
import type { NodeHandler, LineHandler } from '../inline-formatting-plugin';

const FORMATTING_CLS = 'cm-formatting-inline';

/**
 * Autolink `<url>` / `<email>` — Lezer node `Autolink`. Hides the angle
 * brackets and styles the inner URL/email with `cm-lp-link`.
 */
export const autolinkHandler: NodeHandler = {
	nodeType: 'Autolink',
	decorate({ node, isTouched, decorations }) {
		if (isTouched(node.from, node.to)) return;
		decorations.push(Decoration.mark({ class: FORMATTING_CLS }).range(node.from, node.from + 1));
		decorations.push(linkTextDeco.range(node.from + 1, node.to - 1));
		decorations.push(Decoration.mark({ class: FORMATTING_CLS }).range(node.to - 1, node.to));
	},
};

/**
 * Extended autolinks — bare `https://example.com` URLs that don't sit inside
 * `[text](url)`, `<url>`, or `![image](src)`. Line handler reusing
 * `findExtendedAutolinkRanges` from `parsers/link.ts`. Per-line dedup against
 * Link/Autolink/Image ranges via a small syntax-tree walk scoped to the line.
 */
export const extendedAutolinkHandler: LineHandler = {
	name: 'extended-autolink',
	decorate({ line, state, isTouched, decorations }) {
		// Collect Link/Autolink/Image ranges that already cover URLs on this line
		const handledRanges: { from: number; to: number }[] = [];
		syntaxTree(state).iterate({
			from: line.from,
			to: line.to,
			enter: (node) => {
				if (node.name === 'Link' || node.name === 'Autolink' || node.name === 'Image') {
					handledRanges.push({ from: node.from, to: node.to });
				}
			},
		});

		const ranges = findExtendedAutolinkRanges(line.text, line.from);
		for (const range of ranges) {
			const isHandled = handledRanges.some((h) => range.from >= h.from && range.to <= h.to);
			if (isHandled) continue;
			if (isTouched(range.from, range.to)) continue;
			decorations.push(linkTextDeco.range(range.from, range.to));
		}
	},
};
