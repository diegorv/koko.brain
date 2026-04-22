import { Decoration } from '@codemirror/view';

import { linkTextDeco } from '../../styles';
import type { InlineHandler } from '../inline-formatting-plugin';

const FORMATTING_CLS = 'cm-formatting-inline';

/**
 * Markdown links `[text](url)` and reference links `[text][ref]`. When the
 * cursor is away, the `[`, `]`, and `(url)` / `][ref]` tail are hidden via
 * `cm-formatting-inline` while the link text gets `cm-lp-link`. When the
 * cursor is inside the span, the handler returns null so the raw syntax
 * stays visible for editing.
 *
 * Both variants produce identical decoration shape (open mark + link text +
 * trailing mark); only the trailing range differs:
 *   - Inline `[text](url)`  → trailing ends at the last LinkMark.
 *   - Reference `[text][r]` → trailing ends at the end of the LinkLabel.
 */
const linkHandler: InlineHandler = {
	nodeType: 'Link',
	decorate: ({ node, isTouched }) => {
		if (isTouched(node.from, node.to)) return null;

		const marks: { from: number; to: number }[] = [];
		let linkLabel: { from: number; to: number } | null = null;
		let child = node.node.firstChild;
		while (child) {
			if (child.name === 'LinkMark') marks.push({ from: child.from, to: child.to });
			else if (child.name === 'LinkLabel') linkLabel = { from: child.from, to: child.to };
			child = child.nextSibling;
		}

		if (marks.length < 2) return [];
		const closeTo = marks.length >= 4 ? marks[marks.length - 1].to : linkLabel?.to;
		if (closeTo == null) return [];

		const formatting = Decoration.mark({ class: FORMATTING_CLS });
		return [
			{ from: marks[0].from, to: marks[0].to, deco: formatting },
			{ from: marks[0].to, to: marks[1].from, deco: linkTextDeco },
			{ from: marks[1].from, to: closeTo, deco: formatting },
		];
	},
};

/**
 * Link reference definitions `[ref]: url "title"`. Dims the whole definition
 * line with `cm-lp-link-ref-def` when the cursor is elsewhere.
 */
const linkReferenceHandler: InlineHandler = {
	nodeType: 'LinkReference',
	decorate: ({ node, isTouched }) => {
		if (isTouched(node.from, node.to)) return null;
		return {
			from: node.from,
			to: node.to,
			deco: Decoration.mark({ class: 'cm-lp-link-ref-def' }),
		};
	},
};

export const markdownLinkHandlers: readonly InlineHandler[] = [linkHandler, linkReferenceHandler];
