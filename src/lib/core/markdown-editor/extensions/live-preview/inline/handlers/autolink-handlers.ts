import { Decoration } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

import { linkTextDeco } from '../../styles';
import { findExtendedAutolinkRanges } from '../../parsers/link';
import type {
	InlineHandler,
	InlineLineHandler,
	InlineDecorationEntry,
} from '../inline-formatting-plugin';

const FORMATTING_CLS = 'cm-formatting-inline';

/**
 * `<url>` / `<email>` — Lezer Autolink node. Hides the `<` and `>` marks,
 * styles the URL with `cm-lp-link`.
 */
const autolinkHandler: InlineHandler = {
	nodeType: 'Autolink',
	decorate: ({ node, isTouched }) => {
		if (isTouched(node.from, node.to)) return null;
		return [
			{ from: node.from, to: node.from + 1, deco: Decoration.mark({ class: FORMATTING_CLS }) },
			{ from: node.from + 1, to: node.to - 1, deco: linkTextDeco },
			{ from: node.to - 1, to: node.to, deco: Decoration.mark({ class: FORMATTING_CLS }) },
		];
	},
};

/**
 * Bare URLs (`https://example.com`) without surrounding `<>` or `[](...)`.
 * Runs as a line handler because the parser is regex-based, and defensively
 * skips ranges already inside Lezer Link/Autolink/Image nodes so we don't
 * double-decorate URLs that the node-based handlers already cover.
 */
const extendedAutolinkHandler: InlineLineHandler = {
	decorate: ({ state, line, isTouched }) => {
		const entries: InlineDecorationEntry[] = [];

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

		const text = state.doc.sliceString(line.from, line.to);
		for (const range of findExtendedAutolinkRanges(text, line.from)) {
			const covered = handledRanges.some(
				(h) => range.from >= h.from && range.to <= h.to,
			);
			if (covered) continue;
			if (isTouched(range.from, range.to)) continue;
			entries.push({ from: range.from, to: range.to, deco: linkTextDeco });
		}

		return entries;
	},
};

export const autolinkNodeHandlers: readonly InlineHandler[] = [autolinkHandler];
export const autolinkLineHandlers: readonly InlineLineHandler[] = [extendedAutolinkHandler];
