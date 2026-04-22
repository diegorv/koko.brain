import { Decoration } from '@codemirror/view';

import { linkTextDeco } from '../../styles';
import type { InlineHandler, InlineDecorationEntry } from '../inline-formatting-plugin';

const FORMATTING_CLS = 'cm-formatting-inline';

/**
 * Markdown links `[text](url)` and reference links `[text][ref]`. When the
 * cursor is away, the `[`, `]`, and `(url)` chunks are hidden via
 * `cm-formatting-inline` while the link text gets `cm-lp-link`. When the
 * cursor is inside the span, the handler returns null so the raw syntax
 * stays visible for editing.
 */
const linkHandler: InlineHandler = {
	nodeType: 'Link',
	decorate: ({ state, node, isTouched }) => {
		if (isTouched(node.from, node.to)) return null;

		const marks: { from: number; to: number }[] = [];
		let linkLabel: { from: number; to: number } | null = null;
		let child = node.node.firstChild;
		while (child) {
			if (child.name === 'LinkMark') marks.push({ from: child.from, to: child.to });
			else if (child.name === 'LinkLabel') linkLabel = { from: child.from, to: child.to };
			child = child.nextSibling;
		}

		const entries: InlineDecorationEntry[] = [];

		if (marks.length >= 4) {
			// Inline link [text](url): hide [ and ](url), style text
			entries.push(
				{ from: marks[0].from, to: marks[0].to, deco: Decoration.mark({ class: FORMATTING_CLS }) },
				{ from: marks[0].to, to: marks[1].from, deco: linkTextDeco },
				{
					from: marks[1].from,
					to: marks[marks.length - 1].to,
					deco: Decoration.mark({ class: FORMATTING_CLS }),
				},
			);
		} else if (marks.length >= 2 && linkLabel) {
			// Reference link [text][ref]: hide [ and ][ref], style text
			entries.push(
				{ from: marks[0].from, to: marks[0].to, deco: Decoration.mark({ class: FORMATTING_CLS }) },
				{ from: marks[0].to, to: marks[1].from, deco: linkTextDeco },
				{ from: marks[1].from, to: linkLabel.to, deco: Decoration.mark({ class: FORMATTING_CLS }) },
			);
		}

		return entries;
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
