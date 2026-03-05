import { RangeSetBuilder, StateField } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, gutterLineClass } from '@codemirror/view';
import { findFrontmatterBlock } from '../parsers/frontmatter';
import { FrontmatterWidget } from '../widgets';
import { hiddenLineDeco, hiddenGutterMarker } from '../styles';
import { forceDecorationRebuild } from '../core/effects';
import { getAllLines } from '../core/get-all-lines';
import { parseFrontmatterProperties } from '$lib/features/properties/properties.logic';

/** Computes frontmatter decorations (block widget on first line, hidden lines for the rest) */
export function computeFrontmatter(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	if (lines.length === 0) return Decoration.none;

	const block = findFrontmatterBlock(lines);
	if (!block) return Decoration.none;

	// Parse typed properties via the YAML library for proper type detection
	const properties = parseFrontmatterProperties(state.doc.toString());

	const builder = new RangeSetBuilder<Decoration>();

	// First line: replace with a block-level widget
	builder.add(
		lines[block.openIdx].from,
		lines[block.openIdx].to,
		Decoration.replace({ widget: new FrontmatterWidget(properties), block: true }),
	);

	// Inner lines + closing fence: hide text and collapse line element
	for (let i = block.openIdx + 1; i <= block.closeIdx; i++) {
		builder.add(lines[i].from, lines[i].from, hiddenLineDeco);
		builder.add(lines[i].from, lines[i].to, Decoration.replace({}));
	}

	return builder.finish();
}

/**
 * StateField that manages frontmatter decorations independently.
 * Uses StateField (not ViewPlugin) to support block-level decorations.
 * Always replaces the frontmatter block with a FrontmatterWidget — raw YAML
 * is only visible in source mode (when live preview is disabled).
 */
export const frontmatterField = StateField.define<DecorationSet>({
	create(state) {
		return computeFrontmatter(state);
	},
	update(value, tr) {
		if (tr.docChanged || tr.effects.some((e) => e.is(forceDecorationRebuild))) {
			return computeFrontmatter(tr.state);
		}
		return value;
	},
	provide: (f) => EditorView.decorations.from(f),
});

/** Hides gutter cells for inner frontmatter lines when cursor is outside the block */
export const frontmatterGutter = gutterLineClass.compute(['doc', 'selection'], (state) => {
	const builder = new RangeSetBuilder<typeof hiddenGutterMarker>();

	const lines = getAllLines(state);
	if (lines.length === 0) return builder.finish();

	const block = findFrontmatterBlock(lines);
	if (!block) return builder.finish();

	const cursorLine = state.doc.lineAt(state.selection.main.head).number;

	let cursorInBlock = false;
	for (let i = block.openIdx; i <= block.closeIdx; i++) {
		if (lines[i].number === cursorLine) {
			cursorInBlock = true;
			break;
		}
	}

	if (!cursorInBlock) {
		for (let i = block.openIdx + 1; i <= block.closeIdx; i++) {
			builder.add(lines[i].from, lines[i].from, hiddenGutterMarker);
		}
	}

	return builder.finish();
});
