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
import { revealPredicate } from '../core/reveal';
import { isInsideBlockContext } from '../core/is-inside-block-context';
import { expandedVisibleRanges } from '../core/expanded-ranges';
import { frontmatterSlice } from '../core/frontmatter-slice';
import { findMetaBindInputRanges } from '../parsers/meta-bind-input';
import { boundValue, pickWidget } from '../widgets';
import { parseFrontmatterProperties } from '#lib/core/frontmatter/properties.logic.js';
import { profileStart, profileEnd } from '../core/profiling';

/**
 * ViewPlugin that handles meta-bind INPUT field decoration.
 *
 * - Replaces `` `INPUT[inlineSelect(...):bindTarget]` `` with interactive `MetaBindSelectWidget`
 * - Reads current value from frontmatter properties for initial selection
 * - Line-based reveal: shows source when the selection touches the input's line
 * - Block context skip via `isInsideBlockContext`
 * - Uses `expandedVisibleRanges(view)` for performance
 */
export const metaBindInputPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildMetaBindInputDecorations(view.state, expandedVisibleRanges(view));
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				const _t = profileStart('meta-bind-input');
				this.decorations = buildMetaBindInputDecorations(
					update.view.state,
					expandedVisibleRanges(update.view),
				);
				profileEnd('meta-bind-input', _t);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds meta-bind input decorations for the given ranges */
export function buildMetaBindInputDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];
	const isRevealed = revealPredicate(state);
	const fmProperties = parseFrontmatterProperties(frontmatterSlice(state.doc));

	for (const { from, to } of ranges) {
		const startLine = state.doc.lineAt(from).number;
		const endLine = state.doc.lineAt(to).number;

		for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
			const line = state.doc.line(lineNum);

			// Skip lines inside block contexts (fenced code, HTML blocks)
			const nodeAt = syntaxTree(state).resolveInner(line.from);
			if (isInsideBlockContext(nodeAt)) continue;

			for (const range of findMetaBindInputRanges(line.text, line.from)) {
				if (isRevealed(range.from, range.to)) continue;

				const currentValue = boundValue(fmProperties, range.bindTarget);

				const widget = pickWidget(range.inputType, range.options, range.bindTarget, currentValue);
				if (!widget) continue;

				// Only `INPUT[...]`, not its backticks: the inline pipeline hides
				// those with its own replaces. A widget that starts where (or
				// inside where) one of them starts is drawn on a full redraw but
				// not when a write changes it: CodeMirror then redraws only that
				// region, finds the widget open at its start and draws no tile.
				decorations.push(
					Decoration.replace({ widget }).range(range.from + 1, range.to - 1),
				);
			}
		}
	}

	return Decoration.set(decorations, true);
}
