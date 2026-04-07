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
import { expandedVisibleRanges } from '../core/expanded-ranges';
import { findInlineCommentRanges } from '../parsers/comment';

/**
 * ViewPlugin that hides inline `%%text%%` comments in live preview.
 *
 * - When cursor is outside: completely hidden via `display: none`
 * - When cursor is inside: shown as dimmed text with `%%` marks visible
 * - Uses regex-based parser (`findInlineCommentRanges`) since Lezer has no node for this
 * - Per-element cursor: each comment checked individually via `shouldShowSource`
 * - Block context skip via `isInsideBlockContext`
 * - Uses `expandedVisibleRanges(view)` for performance
 */
export const inlineCommentPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		lastCursorLine: number;

		constructor(view: EditorView) {
			this.decorations = buildInlineCommentDecorations(view.state, expandedVisibleRanges(view));
			this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update, this.lastCursorLine);
			if (action === 'rebuild') {
				this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
				this.decorations = buildInlineCommentDecorations(
					update.view.state,
					expandedVisibleRanges(update.view),
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds inline comment decorations for the given ranges */
export function buildInlineCommentDecorations(
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

			const commentRanges = findInlineCommentRanges(state, line.from, line.to);

			for (const range of commentRanges) {
				const isTouched = shouldShowSource(state, range.from, range.to);

				if (isTouched) {
					// Show dimmed when cursor is inside
					decorations.push(
						Decoration.mark({ class: 'cm-lp-inline-comment' }).range(range.from, range.to),
					);
				} else {
					// Hide completely when cursor is outside
					decorations.push(
						Decoration.mark({ class: 'cm-lp-inline-comment cm-lp-inline-comment-hidden' }).range(
							range.from,
							range.to,
						),
					);
				}
			}
		}
	}

	return Decoration.set(decorations, true);
}
