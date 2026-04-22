import { Decoration } from '@codemirror/view';

import { blockquoteLineDeco } from '../../styles';
import { CALLOUT_RE } from '../../parsers/blockquote';
import { revealClass } from '../cursor-reveal';
import type { InlineHandler, InlineDecorationEntry } from '../inline-formatting-plugin';

/** Depth (1/2/3) → Decoration.line. Depths beyond 3 collapse to depth-3 styling. */
const depthDeco: Record<number, Decoration> = {
	1: blockquoteLineDeco,
	2: Decoration.line({ class: 'cm-lp-blockquote-2' }),
	3: Decoration.line({ class: 'cm-lp-blockquote-3' }),
};

/**
 * Matches the parent `Blockquote` node once per block. Walks the block's own
 * Lezer subtree ONCE to collect every `QuoteMark`, groups them by line, then
 * emits `Decoration.line` for depth styling + `Decoration.mark` for
 * cursor-reveal of the `>` marks plus the trailing space. Callout lines
 * (`> [!type]`) are skipped — calloutField owns them.
 */
export const blockquoteHandler: InlineHandler = {
	nodeType: 'Blockquote',
	decorate: ({ state, node, isTouched }) => {
		// One tree walk for the whole block: collect QuoteMark ranges per line.
		// Previous version re-called syntaxTree(state).iterate({ from: line.from,
		// to: line.to }) once per line — O(block × lines) — which this reduces
		// to O(block).
		const marksByLine = new Map<number, { from: number; to: number }[]>();
		const cursor = node.node.cursor();
		// Advance into the subtree; bail when the cursor exits the block.
		if (cursor.next()) {
			do {
				if (cursor.name !== 'QuoteMark') continue;
				const lineNum = state.doc.lineAt(cursor.from).number;
				let bucket = marksByLine.get(lineNum);
				if (!bucket) {
					bucket = [];
					marksByLine.set(lineNum, bucket);
				}
				bucket.push({ from: cursor.from, to: cursor.to });
			} while (cursor.next() && cursor.from < node.to);
		}

		const entries: InlineDecorationEntry[] = [];
		for (const [lineNum, quoteMarks] of marksByLine) {
			const line = state.doc.line(lineNum);
			if (CALLOUT_RE.test(state.doc.sliceString(line.from, line.to))) continue;

			entries.push({
				from: line.from,
				to: line.from,
				deco: depthDeco[Math.min(quoteMarks.length, 3)] ?? blockquoteLineDeco,
			});

			const last = quoteMarks[quoteMarks.length - 1];
			let markTo = last.to;
			if (markTo < line.to && state.doc.sliceString(markTo, markTo + 1) === ' ') markTo++;

			const cls = revealClass('cm-formatting-block', isTouched(line.from, line.to));
			entries.push({
				from: line.from,
				to: markTo,
				deco: Decoration.mark({ class: cls }),
			});
		}

		return entries;
	},
};
