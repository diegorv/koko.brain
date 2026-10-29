import { Decoration } from '@codemirror/view';
import { hiddenSyntaxDeco, linkTextDeco } from '../../styles';
import type { NodeHandler } from '../inline-formatting-plugin';

/**
 * Markdown link `[text](url)` and reference link `[text][ref]`. Hides the
 * brackets and target portion via `hiddenSyntaxDeco`, styles the visible
 * text via `cm-lp-link`. Link line touched by the selection → render
 * raw markdown. A link whose hidden syntax would cross a line break (newline
 * before the destination, inside the title or inside the reference label) also
 * renders raw markdown: a replace across a line break is illegal from a
 * ViewPlugin and makes CodeMirror throw. The styled text is a mark, which may
 * cross lines, so a label that wraps (`[a\nb](/url)`) is still styled.
 *
 * Lezer's `Link` node contains:
 *   - 4+ LinkMark children for inline link `[text](url)`: positions of `[`,
 *     `]`, `(`, `)` (plus extras for nested marks)
 *   - 2 LinkMark + 1 LinkLabel child for reference link `[text][ref]`:
 *     positions of `[`, `]` plus the label
 */
export const linkHandler: NodeHandler = {
	nodeType: 'Link',
	decorate({ node, state, isRevealed, decorations }) {
		if (isRevealed(node.from, node.to)) return;

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

		let hidden: { from: number; to: number }[];
		if (marks.length >= 4) {
			// Inline link [text](url) — hide `[` and `](url)`
			hidden = [marks[0], { from: marks[1].from, to: marks[marks.length - 1].to }];
		} else if (marks.length >= 2 && linkLabel) {
			// Reference link [text][ref] — hide `[` and `][ref]`
			hidden = [marks[0], { from: marks[1].from, to: linkLabel.to }];
		} else {
			return;
		}
		if (hidden.some((r) => state.doc.sliceString(r.from, r.to).includes('\n'))) return;

		decorations.push(hiddenSyntaxDeco.range(hidden[0].from, hidden[0].to));
		decorations.push(linkTextDeco.range(marks[0].to, marks[1].from));
		decorations.push(hiddenSyntaxDeco.range(hidden[1].from, hidden[1].to));
	},
};

/**
 * Reference link **definition** `[ref]: url`. Dim the entire line (faded
 * appearance) unless its line is touched by the selection.
 */
export const linkReferenceHandler: NodeHandler = {
	nodeType: 'LinkReference',
	decorate({ node, isRevealed, decorations }) {
		if (isRevealed(node.from, node.to)) return;
		decorations.push(Decoration.mark({ class: 'cm-lp-link-ref-def' }).range(node.from, node.to));
	},
};
