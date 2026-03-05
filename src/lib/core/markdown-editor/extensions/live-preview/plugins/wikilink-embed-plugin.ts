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
import { findWikilinkEmbedRanges } from '../parsers/wikilink-embed';
import { WikilinkImageEmbedWidget, WikilinkNoteEmbedWidget } from '../widgets';

/** Parses the display/pipe value as an optional pixel width (e.g. `"300"` → `300`) */
function parseWidth(display: string | null): number | null {
	if (display === null) return null;
	const n = Number(display);
	return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * ViewPlugin that handles wikilink embed decoration (`![[...]]`).
 *
 * - **Image embeds** `![[image.png]]`: Replaced with `WikilinkImageEmbedWidget`
 * - **Note embeds** `![[note]]`, `![[note#heading]]`, `![[note#^block]]`: Replaced with `WikilinkNoteEmbedWidget`
 * - Per-element cursor: shows source when cursor is on the embed
 * - Block context skip via `isInsideBlockContext`
 * - Uses `view.visibleRanges` for performance
 */
export const wikilinkEmbedPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = buildWikilinkEmbedDecorations(view.state, view.visibleRanges);
		}

		update(update: ViewUpdate) {
			const action = checkUpdateAction(update);
			if (action === 'rebuild') {
				this.decorations = buildWikilinkEmbedDecorations(
					update.view.state,
					update.view.visibleRanges,
				);
			}
		}
	},
	{ decorations: (v) => v.decorations },
);

/** Builds wikilink embed decorations for the given ranges */
export function buildWikilinkEmbedDecorations(
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

			for (const range of findWikilinkEmbedRanges(line.text, line.from)) {
				if (shouldShowSource(state, range.fullFrom, range.fullTo)) continue;

				if (range.type === 'image') {
					const width = parseWidth(range.display);
					decorations.push(
						Decoration.replace({
							widget: new WikilinkImageEmbedWidget(range.target, width),
						}).range(range.fullFrom, range.fullTo),
					);
				} else {
					decorations.push(
						Decoration.replace({
							widget: new WikilinkNoteEmbedWidget(range.target, range.heading, range.blockId),
						}).range(range.fullFrom, range.fullTo),
					);
				}
			}
		}
	}

	return Decoration.set(decorations, true);
}
