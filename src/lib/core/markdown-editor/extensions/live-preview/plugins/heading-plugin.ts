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
import { headingLineDeco } from '../styles';

/**
 * ViewPlugin that renders ATX and setext headings with per-element cursor awareness
 * and CSS animations for mark visibility.
 *
 * - Applies `Decoration.line({ class: 'cm-lp-hN' })` for heading styling (font size, color)
 * - ATX headings: hides `#` marks via `cm-formatting-block` CSS animation
 * - Setext headings: hides underline row (`===`/`---`) via `cm-formatting-block` CSS animation
 * - Uses `shouldShowSource` per-element: only the heading under the cursor shows its marks
 * - Uses `isInsideBlockContext` to skip headings inside code blocks
 * - Uses `view.visibleRanges` for performance (inline plugin, doesn't collapse content)
 */
export const headingPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildHeadingDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildHeadingDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds heading decorations (line styling + mark visibility) for the given ranges */
export function buildHeadingDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		syntaxTree(state).iterate({
			from,
			to,
			enter: (node) => {
				// ATX headings: # Heading
				const atxMatch = node.name.match(/^ATXHeading(\d)$/);
				if (atxMatch) {
					if (isInsideBlockContext(node)) return false;

					const level = parseInt(atxMatch[1]);
					const line = state.doc.lineAt(node.from);

					// Line decoration for heading styling (font size, weight, color)
					decorations.push(headingLineDeco[level].range(line.from, line.from));

					// HeaderMark visibility with CSS animation
					const headerMark = node.node.getChild('HeaderMark');
					if (headerMark) {
						const markTo = Math.min(headerMark.to + 1, line.to); // include space after #
						const isTouched = shouldShowSource(state, line.from, line.to);
						const cls = isTouched
							? 'cm-formatting-block cm-formatting-block-visible'
							: 'cm-formatting-block';
						decorations.push(
							Decoration.mark({ class: cls }).range(headerMark.from, markTo),
						);
					}

					return false;
				}

				// Setext headings: Heading\n=====
				const setextMatch = node.name.match(/^SetextHeading(\d)$/);
				if (setextMatch) {
					if (isInsideBlockContext(node)) return false;

					const level = parseInt(setextMatch[1]);
					const textLine = state.doc.lineAt(node.from);
					const underlineLine = state.doc.lineAt(node.to);

					// Line decoration for heading text line
					decorations.push(headingLineDeco[level].range(textLine.from, textLine.from));

					// Hide the underline row (===, ---) when not touched
					const isTouched = shouldShowSource(state, node.from, node.to);
					const cls = isTouched
						? 'cm-formatting-block cm-formatting-block-visible'
						: 'cm-formatting-block';
					decorations.push(
						Decoration.mark({ class: cls }).range(underlineLine.from, underlineLine.to),
					);

					return false;
				}
			},
		});
	}

	return Decoration.set(decorations, true);
}
