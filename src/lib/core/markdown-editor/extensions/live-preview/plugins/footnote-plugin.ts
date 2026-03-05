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
import { footnoteRefDeco, footnoteDefMarkerDeco } from '../styles';
import {
	findFootnoteRefRanges,
	findFootnoteDefRange,
	findInlineFootnoteRanges,
} from '../parsers/footnote';

/**
 * ViewPlugin that handles all footnote decoration:
 *
 * - **Footnote refs** `[^label]`: Styled with superscript via `cm-lp-footnote-ref`.
 * - **Footnote defs** `[^label]: text`: Marker styled via `cm-lp-footnote-def-marker`.
 * - **Inline footnotes** `^[text]`: Hides `^[` and `]`, styles text as superscript.
 * - Per-element cursor: each footnote checked individually via `shouldShowSource`
 * - Block context skip via `isInsideBlockContext`
 * - Uses `view.visibleRanges` for performance
 */
export const footnotePlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildFootnoteDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildFootnoteDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds footnote decorations (refs, defs, inline) for the given ranges */
export function buildFootnoteDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		const startLine = state.doc.lineAt(from).number;
		const endLine = state.doc.lineAt(to).number;

		for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
			const line = state.doc.line(lineNum);

			// Skip lines inside block contexts (fenced code, HTML blocks)
			const nodeAt = syntaxTree(state).resolveInner(line.from);
			if (isInsideBlockContext(nodeAt)) continue;

			// Footnote references: [^label]
			for (const range of findFootnoteRefRanges(state, line.from, line.to)) {
				if (shouldShowSource(state, range.fullFrom, range.fullTo)) continue;
				decorations.push(footnoteRefDeco.range(range.fullFrom, range.fullTo));
			}

			// Footnote definitions: [^label]: text
			const def = findFootnoteDefRange(state, line.from, line.to);
			if (def && !shouldShowSource(state, def.markerFrom, def.markerTo)) {
				decorations.push(footnoteDefMarkerDeco.range(def.markerFrom, def.markerTo));
			}

			// Inline footnotes: ^[text]
			for (const range of findInlineFootnoteRanges(state, line.from, line.to)) {
				if (shouldShowSource(state, range.fullFrom, range.fullTo)) continue;
				decorations.push(
					Decoration.mark({ class: 'cm-formatting-inline' }).range(range.openMarkFrom, range.openMarkTo),
				);
				decorations.push(footnoteRefDeco.range(range.textFrom, range.textTo));
				decorations.push(
					Decoration.mark({ class: 'cm-formatting-inline' }).range(range.closeMarkFrom, range.closeMarkTo),
				);
			}
		}
	}

	return Decoration.set(decorations, true);
}
