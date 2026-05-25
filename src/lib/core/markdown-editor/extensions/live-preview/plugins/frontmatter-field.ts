import { RangeSetBuilder, StateField } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, gutterLineClass } from '@codemirror/view';
import { findFrontmatterBlock } from '../parsers/frontmatter';
import { hiddenLineDeco, hiddenGutterMarker } from '../styles';
import { forceDecorationRebuild } from '../core/effects';
import { getAllLines } from '../core/get-all-lines';
import { profileStart, profileEnd } from '../core/profiling';

/** Computes frontmatter decorations - hides the entire block (properties managed via right sidebar) */
export function computeFrontmatter(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	if (lines.length === 0) return Decoration.none;

	const block = findFrontmatterBlock(lines);
	if (!block) return Decoration.none;

	const builder = new RangeSetBuilder<Decoration>();

	// Hide all frontmatter lines (opening fence, content, closing fence)
	for (let i = block.openIdx; i <= block.closeIdx; i++) {
		builder.add(lines[i].from, lines[i].from, hiddenLineDeco);
		builder.add(lines[i].from, lines[i].to, Decoration.replace({}));
	}

	return builder.finish();
}

/**
 * StateField that manages frontmatter decorations independently.
 * Hides the entire frontmatter block - properties are managed via the right sidebar.
 */
export const frontmatterField = StateField.define<DecorationSet>({
	create(state) {
		return computeFrontmatter(state);
	},
	update(value, tr) {
		if (tr.docChanged || tr.effects.some((e) => e.is(forceDecorationRebuild))) {
			const _t = profileStart('frontmatter');
			const _r = computeFrontmatter(tr.state);
			profileEnd('frontmatter', _t);
			return _r;
		}
		return value;
	},
	provide: (f) => EditorView.decorations.from(f),
});

/** Hides gutter cells for all frontmatter lines */
export const frontmatterGutter = gutterLineClass.compute(['doc'], (state) => {
	const builder = new RangeSetBuilder<typeof hiddenGutterMarker>();

	const lines = getAllLines(state);
	if (lines.length === 0) return builder.finish();

	const block = findFrontmatterBlock(lines);
	if (!block) return builder.finish();

	for (let i = block.openIdx; i <= block.closeIdx; i++) {
		builder.add(lines[i].from, lines[i].from, hiddenGutterMarker);
	}

	return builder.finish();
});
