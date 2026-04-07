import { RangeSetBuilder } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { findQueryjsBlock } from '../parsers/queryjs-block';
import { QueryjsBlockWidget } from '../widgets/queryjs-block-widget';
import { hiddenLineDeco } from '../styles';
import { checkUpdateAction } from '../core/check-update-action';
import { shouldShowSource } from '../core/should-show-source';
import { getAllLines } from '../core/get-all-lines';
import { profileStart, profileEnd } from '../core/profiling';

/** Computes queryjs block decorations */
export function computeQueryjsBlocks(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	const builder = new RangeSetBuilder<Decoration>();
	let idx = 0;

	while (idx < lines.length) {
		const result = findQueryjsBlock(lines, idx);
		if (result) {
			const { block, endIdx } = result;

			// When cursor is inside, show raw JS
			if (!shouldShowSource(state, block.openFenceFrom, block.closeFenceTo)) {
				const widget = new QueryjsBlockWidget(block.jsContent);

				// Opening fence line: replace with QueryjsBlockWidget
				builder.add(
					block.openFenceFrom,
					block.openFenceTo,
					Decoration.replace({ widget }),
				);

				// Content lines + closing fence: hide
				for (let i = idx + 1; i <= endIdx; i++) {
					builder.add(lines[i].from, lines[i].from, hiddenLineDeco);
					builder.add(lines[i].from, lines[i].to, Decoration.replace({}));
				}
			}

			idx = endIdx + 1;
		} else {
			idx++;
		}
	}

	return builder.finish();
}

/**
 * ViewPlugin that manages queryjs block decorations independently.
 * Replaces ```queryjs code blocks with QueryjsBlockWidget when cursor is outside.
 * Shows raw JavaScript when cursor is inside the block.
 */
export const queryjsBlockField = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;
		lastCursorLine: number;
		/** Cached doc content hash to skip redundant rebuilds */
		lastDocContent: string = '';
		lastCursorInBlock: boolean = false;
		constructor(view: EditorView) {
			this.decorations = computeQueryjsBlocks(view.state);
			this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
			this.lastDocContent = view.state.doc.toString();
		}
		update(update: ViewUpdate) {
			if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;

			// For forceDecorationRebuild (scroll debounce): skip entirely.
			// Queryjs blocks don't change during scroll — their output is static
			// until the user edits the block content.
			if (!update.docChanged && !update.selectionSet) return;

			if (checkUpdateAction(update, this.lastCursorLine) === 'rebuild') {
				this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;

				// Only recompute if document actually changed (not just cursor move
				// between lines, which can toggle shouldShowSource for the block).
				// For cursor moves, we still need to rebuild to show/hide source.
				const _t = profileStart();
				this.decorations = computeQueryjsBlocks(update.state);
				profileEnd('queryjs-block', _t);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);
