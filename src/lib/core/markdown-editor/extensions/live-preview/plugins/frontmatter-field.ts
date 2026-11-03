import { EditorSelection, RangeSetBuilder, StateField } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, gutterLineClass } from '@codemirror/view';
import { findFrontmatterBlock } from '../parsers/frontmatter';
import { hiddenGutterMarker } from '../styles';
import { hideLines } from '../core/hide-lines';
import { forceDecorationRebuild } from '../core/effects';
import { getAllLines } from '../core/get-all-lines';
import { profileStart, profileEnd } from '../core/profiling';
import { soleBlockWidget } from '../core/block-band-click';

/** Computes frontmatter decorations - hides the entire block (properties managed via right sidebar) */
export function computeFrontmatter(state: EditorState): DecorationSet {
	const lines = getAllLines(state);
	if (lines.length === 0) return Decoration.none;

	const block = findFrontmatterBlock(lines);
	if (!block) return Decoration.none;

	const builder = new RangeSetBuilder<Decoration>();

	// Hide all frontmatter lines (opening fence, content, closing fence)
	hideLines(builder, state.doc, lines[block.openIdx].number, lines[block.closeIdx].number);

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

/**
 * End of the hidden frontmatter (the end of its closing fence line), read
 * from `frontmatterField`; `null` when nothing is hidden (no frontmatter, or
 * the decorator is disabled).
 */
export function frontmatterEnd(state: EditorState): number | null {
	const set = state.field(frontmatterField, false);
	if (!set || set.size === 0) return null;
	let end = 0;
	for (const iter = set.iter(); iter.value; iter.next()) end = Math.max(end, iter.to);
	return end;
}

/** Start of the first line after the hidden frontmatter, or `null` when nothing is hidden or no line follows it. */
function bodyStart(state: EditorState): number | null {
	const end = frontmatterEnd(state);
	return end === null || end >= state.doc.length ? null : end + 1;
}

/** Whether the `.cm-line` drawn at `pos` holds one block widget and nothing else (see `soleBlockWidget`). */
function isBlockWidgetLine(view: EditorView, pos: number): boolean {
	const { node } = view.domAtPos(pos);
	const line = (node instanceof Element ? node : node.parentElement)?.closest('.cm-line');
	return !!line && soleBlockWidget(line) !== null;
}

/**
 * Mouse selection for a press that maps into the hidden frontmatter. The
 * frontmatter lines are `display: none`, so the press can only come from the
 * blank space above the first body line (the top padding of `.cm-content`),
 * which `posAtCoords` maps to position 0. A cursor there sits on a line the
 * user cannot see, and Enter would split the opening fence and break the
 * frontmatter, so the press puts the cursor at the start of the first body
 * line instead; shift and drag heads that fall in the frontmatter are clamped
 * to the same spot. When the first body line is a block widget (a code block,
 * table or math block), a cursor there would reveal its source, so the press
 * keeps the selection as it is, as `blockBandClick` does for a band between
 * two blocks. Any other press gets the next style or the default.
 * Keyboard moves (ArrowUp into the frontmatter) are not changed.
 */
export const frontmatterClick = EditorView.mouseSelectionStyle.of((view, event) => {
	if (event.button !== 0) return null;
	const start = bodyStart(view.state);
	if (start === null || view.posAtCoords({ x: event.clientX, y: event.clientY }, false) >= start) return null;
	let startSel = view.state.selection;
	let anchor: number | null = isBlockWidgetLine(view, start) ? null : start;
	return {
		update(update) {
			if (!update.docChanged) return;
			startSel = startSel.map(update.changes);
			if (anchor !== null) anchor = update.changes.mapPos(anchor);
		},
		get(cur, extend, multiple) {
			if (anchor === null) return startSel;
			const pos = view.posAtCoords({ x: cur.clientX, y: cur.clientY }, false);
			const min = bodyStart(view.state);
			const head = min !== null && pos < min ? min : pos;
			if (extend) return startSel.replaceRange(startSel.main.extend(head));
			const range = EditorSelection.range(anchor, head);
			return multiple ? startSel.addRange(range) : EditorSelection.create([range]);
		},
	};
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
