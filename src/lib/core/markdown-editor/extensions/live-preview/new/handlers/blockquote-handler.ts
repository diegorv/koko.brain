import { Decoration } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';

import { blockquoteLineDeco } from '../../styles';
import { CALLOUT_RE } from '../../parsers/blockquote';
import type { InlineHandler, InlineDecorationEntry } from '../inline-formatting-plugin';

/** Depth (1/2/3) → Decoration.line. Depths beyond 3 collapse to depth-3 styling. */
const depthDeco: Record<number, Decoration> = {
	1: blockquoteLineDeco,
	2: Decoration.line({ class: 'cm-lp-blockquote-2' }),
	3: Decoration.line({ class: 'cm-lp-blockquote-3' }),
};

/**
 * Matches the parent `Blockquote` node once per block (not once per `>` mark),
 * walks each line of the block to count nested `>` to determine depth, and
 * emits `Decoration.line` for styling + `Decoration.mark` for cursor-reveal of
 * every `>` on the line + the trailing space. Callout lines (`> [!type]`) are
 * skipped — calloutField owns them.
 */
export const blockquoteHandler: InlineHandler = {
	nodeType: 'Blockquote',
	decorate: ({ state, node, isTouched }) => {
		const entries: InlineDecorationEntry[] = [];
		const firstLine = state.doc.lineAt(node.from).number;
		const lastLine = state.doc.lineAt(node.to).number;

		for (let ln = firstLine; ln <= lastLine; ln++) {
			const line = state.doc.line(ln);
			if (CALLOUT_RE.test(state.doc.sliceString(line.from, line.to))) continue;

			const quoteMarks: { from: number; to: number }[] = [];
			syntaxTree(state).iterate({
				from: line.from,
				to: line.to,
				enter: (n) => {
					if (n.name === 'QuoteMark') quoteMarks.push({ from: n.from, to: n.to });
				},
			});
			if (quoteMarks.length === 0) continue;

			entries.push({
				from: line.from,
				to: line.from,
				deco: depthDeco[Math.min(quoteMarks.length, 3)] ?? blockquoteLineDeco,
			});

			const last = quoteMarks[quoteMarks.length - 1];
			let markTo = last.to;
			if (markTo < line.to && state.doc.sliceString(markTo, markTo + 1) === ' ') markTo++;

			const cls = isTouched(line.from, line.to)
				? 'cm-formatting-block cm-formatting-block-visible'
				: 'cm-formatting-block';
			entries.push({
				from: line.from,
				to: markTo,
				deco: Decoration.mark({ class: cls }),
			});
		}

		return entries;
	},
};
