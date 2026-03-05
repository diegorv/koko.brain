import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
} from '@codemirror/view';
import type { EditorState, Range } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { isInsideBlockContext } from '../core/is-inside-block-context';
import { blockquoteLineDeco } from '../styles';
import { CALLOUT_RE } from '../parsers/blockquote';

/** Maps nesting depth to line decoration. Depths beyond 3 use depth-3 styling. */
const blockquoteDepthDeco: Record<number, Decoration> = {
	1: blockquoteLineDeco,
	2: Decoration.line({ class: 'cm-lp-blockquote-2' }),
	3: Decoration.line({ class: 'cm-lp-blockquote-3' }),
};

/**
 * ViewPlugin that renders blockquotes with depth-aware styling, per-element cursor
 * awareness, and CSS animations for mark visibility.
 *
 * - Applies `Decoration.line({ class: 'cm-lp-blockquote[-N]' })` for depth-aware border styling
 * - Applies `Decoration.mark({ class: 'cm-formatting-block' })` on `>` marks — hidden via
 *   `font-size: 0.01em` when cursor is away, animated to visible when cursor enters the line
 * - Excludes callout lines (`> [!type]`) which are handled by calloutField
 * - Uses `shouldShowSource` per-element: only the blockquote line under the cursor shows marks
 * - Uses `isInsideBlockContext` to skip blockquotes inside code blocks
 * - Uses `view.visibleRanges` for performance (inline plugin, doesn't collapse content)
 */
export const blockquotePlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildBlockquoteDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildBlockquoteDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds blockquote decorations (line styling + mark visibility) for the given ranges */
export function buildBlockquoteDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		// Track which lines we've already decorated to avoid duplicates
		// (multiple QuoteMarks on the same line for nested blockquotes)
		const decoratedLines = new Set<number>();

		syntaxTree(state).iterate({
			from,
			to,
			enter: (node) => {
				if (node.name !== 'QuoteMark') return;

				if (isInsideBlockContext(node)) return;

				const line = state.doc.lineAt(node.from);

				// Skip if already processed this line
				if (decoratedLines.has(line.number)) return;
				decoratedLines.add(line.number);

				// Exclude callout syntax (handled by calloutField)
				const lineText = state.doc.sliceString(line.from, line.to);
				if (CALLOUT_RE.test(lineText)) return;

				// Count QuoteMarks on this line to determine depth
				const quoteMarks: { from: number; to: number }[] = [];
				syntaxTree(state).iterate({
					from: line.from,
					to: line.to,
					enter: (innerNode) => {
						if (innerNode.name === 'QuoteMark') {
							quoteMarks.push({ from: innerNode.from, to: innerNode.to });
						}
					},
				});

				if (quoteMarks.length === 0) return;

				const depth = quoteMarks.length;
				const deco =
					blockquoteDepthDeco[Math.min(depth, 3)] ?? blockquoteLineDeco;

				// Line decoration for blockquote styling (border, padding, background)
				decorations.push(deco.range(line.from, line.from));

				// Mark visibility: hide all QuoteMarks + trailing space with CSS animation
				const lastMark = quoteMarks[quoteMarks.length - 1];
				let markTo = lastMark.to;
				if (markTo < line.to && state.doc.sliceString(markTo, markTo + 1) === ' ') {
					markTo++;
				}

				const isTouched = shouldShowSource(state, line.from, line.to);
				const cls = isTouched
					? 'cm-formatting-block cm-formatting-block-visible'
					: 'cm-formatting-block';
				decorations.push(
					Decoration.mark({ class: cls }).range(line.from, markTo),
				);
			},
		});
	}

	return Decoration.set(decorations, true);
}
