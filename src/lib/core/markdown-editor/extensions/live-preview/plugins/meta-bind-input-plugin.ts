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
import { findMetaBindInputRanges } from '../parsers/meta-bind-input';
import { MetaBindSelectWidget } from '../widgets';
import { parseFrontmatterProperties } from '$lib/features/properties/properties.logic';

/**
 * ViewPlugin that handles meta-bind INPUT field decoration.
 *
 * - Replaces `` `INPUT[inlineSelect(...):bindTarget]` `` with interactive `MetaBindSelectWidget`
 * - Reads current value from frontmatter properties for initial selection
 * - Per-element cursor: shows source when cursor is on the input field
 * - Block context skip via `isInsideBlockContext`
 * - Uses `view.visibleRanges` for performance
 */
export const metaBindInputPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildMetaBindInputDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildMetaBindInputDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
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
	const docText = state.doc.toString();
	const fmProperties = parseFrontmatterProperties(docText);

	for (const { from, to } of ranges) {
		const startLine = state.doc.lineAt(from).number;
		const endLine = state.doc.lineAt(to).number;

		for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
			const line = state.doc.line(lineNum);

			// Skip lines inside block contexts (fenced code, HTML blocks)
			const nodeAt = syntaxTree(state).resolveInner(line.from);
			if (isInsideBlockContext(nodeAt)) continue;

			for (const range of findMetaBindInputRanges(line.text, line.from)) {
				if (shouldShowSource(state, range.from, range.to)) continue;

				const prop = fmProperties.find((p) => p.key === range.bindTarget);
				const currentValue = prop ? String(prop.value) : null;

				decorations.push(
					Decoration.replace({
						widget: new MetaBindSelectWidget(range.options, range.bindTarget, currentValue),
					}).range(range.from, range.to),
				);
			}
		}
	}

	return Decoration.set(decorations, true);
}
