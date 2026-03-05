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
import { findBlockReference } from '../parsers/block-reference';

/**
 * ViewPlugin that hides block references (`^block-id`) at the end of lines.
 *
 * - When cursor is outside: hidden via `display: none`
 * - When cursor is on the line: shown as dimmed text
 * - Per-line cursor check via `shouldShowSource`
 * - Block context skip via `isInsideBlockContext`
 */
export const blockReferencePlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildBlockReferenceDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildBlockReferenceDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds block reference decorations for the given ranges */
export function buildBlockReferenceDecorations(
	state: EditorState,
	ranges: readonly { from: number; to: number }[],
): DecorationSet {
	const decorations: Range<Decoration>[] = [];

	for (const { from, to } of ranges) {
		const startLine = state.doc.lineAt(from).number;
		const endLine = state.doc.lineAt(to).number;

		for (let lineNum = startLine; lineNum <= endLine; lineNum++) {
			const line = state.doc.line(lineNum);

			const nodeAt = syntaxTree(state).resolveInner(line.from);
			if (isInsideBlockContext(nodeAt)) continue;

			const ref = findBlockReference(line.text, line.from);
			if (!ref) continue;

			const isTouched = shouldShowSource(state, line.from, line.to);

			if (isTouched) {
				decorations.push(
					Decoration.mark({ class: 'cm-lp-block-ref' }).range(ref.from, ref.to),
				);
			} else {
				decorations.push(
					Decoration.mark({ class: 'cm-lp-block-ref cm-lp-block-ref-hidden' }).range(
						ref.from,
						ref.to,
					),
				);
			}
		}
	}

	return Decoration.set(decorations, true);
}
