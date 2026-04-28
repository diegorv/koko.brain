import { Decoration } from '@codemirror/view';
import { linkTextDeco } from '../../styles';
import type { NodeHandler } from '../inline-formatting-plugin';

const FORMATTING_CLS = 'cm-formatting-inline';

/**
 * Markdown link `[text](url)` and reference link `[text][ref]`. Hides the
 * brackets and target portion via `cm-formatting-inline`, styles the visible
 * text via `cm-lp-link`. Cursor inside the link → fall through and render
 * raw markdown.
 *
 * Lezer's `Link` node contains:
 *   - 4+ LinkMark children for inline link `[text](url)`: positions of `[`,
 *     `]`, `(`, `)` (plus extras for nested marks)
 *   - 2 LinkMark + 1 LinkLabel child for reference link `[text][ref]`:
 *     positions of `[`, `]` plus the label
 */
export const linkHandler: NodeHandler = {
	nodeType: 'Link',
	decorate({ node, state, isTouched, decorations }) {
		if (isTouched(node.from, node.to)) return;

		const marks: { from: number; to: number }[] = [];
		let linkLabel: { from: number; to: number } | null = null;
		let child = node.node.firstChild;
		while (child) {
			if (child.name === 'LinkMark') {
				marks.push({ from: child.from, to: child.to });
			} else if (child.name === 'LinkLabel') {
				linkLabel = { from: child.from, to: child.to };
			}
			child = child.nextSibling;
		}

		if (marks.length >= 4) {
			// Inline link [text](url) — hide `[` and `](url)`
			decorations.push(Decoration.mark({ class: FORMATTING_CLS }).range(marks[0].from, marks[0].to));
			decorations.push(linkTextDeco.range(marks[0].to, marks[1].from));
			decorations.push(
				Decoration.mark({ class: FORMATTING_CLS }).range(marks[1].from, marks[marks.length - 1].to),
			);
		} else if (marks.length >= 2 && linkLabel) {
			// Reference link [text][ref] — hide `[` and `][ref]`
			decorations.push(Decoration.mark({ class: FORMATTING_CLS }).range(marks[0].from, marks[0].to));
			decorations.push(linkTextDeco.range(marks[0].to, marks[1].from));
			decorations.push(
				Decoration.mark({ class: FORMATTING_CLS }).range(marks[1].from, linkLabel.to),
			);
		}
		// Lezer's `state.doc` is captured implicitly via `node.from/to` — `state`
		// only needed if we need to read the source text (we don't here).
		void state;
	},
};

/**
 * Reference link **definition** `[ref]: url`. Dim the entire line (faded
 * appearance) when the cursor is away; show source when inside.
 */
export const linkReferenceHandler: NodeHandler = {
	nodeType: 'LinkReference',
	decorate({ node, isTouched, decorations }) {
		if (isTouched(node.from, node.to)) return;
		decorations.push(Decoration.mark({ class: 'cm-lp-link-ref-def' }).range(node.from, node.to));
	},
};
