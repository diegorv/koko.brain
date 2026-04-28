import { Decoration } from '@codemirror/view';
import { blockquoteLineDeco } from '../../styles';
import { findBlockquoteMarkRange } from '../../parsers/blockquote';
import type { NodeHandler } from '../inline-formatting-plugin';

/** Maps nesting depth to the line decoration. Depths beyond 3 use depth-3 styling. */
const blockquoteDepthDeco: Record<number, Decoration> = {
	1: blockquoteLineDeco,
	2: Decoration.line({ class: 'cm-lp-blockquote-2' }),
	3: Decoration.line({ class: 'cm-lp-blockquote-3' }),
};

const SCRATCH_KEY = 'blockquote-handler:lines';

/**
 * Decorates blockquotes with depth-aware line styling and cursor-aware mark
 * visibility. Matches `QuoteMark` (which fires once per `>` on each line —
 * including each `>` of a `> > nested` line) and dedupes per-line via the
 * shared scratch Map so each line is processed exactly once per build.
 *
 * Reuses `findBlockquoteMarkRange` from `parsers/blockquote.ts` for the
 * QuoteMark counting and callout-line exclusion (`> [!note]` is handled by
 * `calloutField`, not as a plain blockquote).
 */
export const blockquoteHandler: NodeHandler = {
	nodeType: 'QuoteMark',
	decorate({ node, state, isTouched, decorations, scratch }) {
		let seen = scratch.get(SCRATCH_KEY) as Set<number> | undefined;
		if (!seen) {
			seen = new Set();
			scratch.set(SCRATCH_KEY, seen);
		}
		const line = state.doc.lineAt(node.from);
		if (seen.has(line.number)) return;
		seen.add(line.number);

		const range = findBlockquoteMarkRange(state, line.from, line.to);
		if (!range) return; // either no QuoteMark on this line (shouldn't happen) or callout

		// Line decoration — depth-aware (1, 2, 3+; 4+ collapses to depth 3)
		const lineDeco = blockquoteDepthDeco[Math.min(range.depth, 3)] ?? blockquoteLineDeco;
		decorations.push(lineDeco.range(line.from, line.from));

		// Mark visibility — hide the `> ` prefix when cursor is away from the line
		const cls = isTouched(line.from, line.to)
			? 'cm-formatting-block cm-formatting-block-visible'
			: 'cm-formatting-block';
		decorations.push(Decoration.mark({ class: cls }).range(line.from, range.markTo));
	},
};
