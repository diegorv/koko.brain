import { EditorSelection, EditorState, RangeSetBuilder, StateField, Transaction } from '@codemirror/state';
import type { SelectionRange } from '@codemirror/state';
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
 * Keyboard selections and edits next to the frontmatter are handled by
 * `frontmatterGuard`, which leaves pointer selections to this style.
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

/** Whether `tr` is a keyboard deletion or move, the only user edits that can cross the body start. */
function isDeleteOrMove(tr: Transaction): boolean {
	return tr.isUserEvent('delete') || tr.isUserEvent('move');
}

/**
 * Keeps `delete*` and `move*` user edits off the hidden frontmatter. A move
 * that touches it is dropped whole (applying half of `moveLine` would write a
 * second `---` under the first body line). A deletion of only the line break
 * after the closing fence, up to another line break, passes: the fence stays
 * `---` plus a line break (Backspace on a blank first body line, `deleteLine`
 * on the first body line). A deletion that inserts there is dropped; any
 * other is narrowed to its body part. `input.*` is not filtered: once the
 * selection clamp keeps the caret at or after the body start, typing edits
 * only the caret's line, and lang-markdown's Enter at the body start sees a
 * bare `---` above and falls through to `insertNewlineAndIndent`.
 */
const frontmatterChangeGuard = EditorState.changeFilter.of((tr) => {
	if (!tr.docChanged || !isDeleteOrMove(tr)) return true;
	const start = bodyStart(tr.startState);
	if (start === null) return true;
	const hidden: { fromA: number; toA: number; inserts: boolean }[] = [];
	tr.changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => {
		if (fromA < start) hidden.push({ fromA, toA, inserts: inserted.length > 0 });
	});
	if (hidden.length === 0) return true;
	if (tr.isUserEvent('move')) return false;
	const doc = tr.startState.doc;
	if (hidden.length === 1) {
		const { fromA, toA, inserts } = hidden[0];
		if (!inserts && fromA === start - 1 && toA < doc.length && doc.sliceString(toA, toA + 1) === '\n') return true;
	}
	if (hidden.some((c) => c.inserts)) return false;
	return [0, start];
});

/**
 * Keeps keyboard selections at or after the body start. It runs for `select*`
 * user events except `select.pointer` (owned by `frontmatterClick`) and Find
 * Next / Previous (exactly `select.search`, so a frontmatter match can still
 * be stepped past), and after every `delete*` and `move*`. When the change
 * guard blocked a deletion or move, the selection CodeMirror mapped back
 * through the blocked change would sit on the hidden closing fence, so the
 * start selection is kept instead. The `[tr, { selection, sequential: true }]`
 * form keeps every annotation (userEvent, `fromHistory`) and effect of `tr`.
 */
const frontmatterSelectionGuard = EditorState.transactionFilter.of((tr) => {
	const edit = isDeleteOrMove(tr);
	if (
		!edit &&
		(!tr.isUserEvent('select') ||
			tr.isUserEvent('select.pointer') ||
			tr.annotation(Transaction.userEvent) === 'select.search')
	) {
		return tr;
	}
	const start = bodyStart(tr.startState);
	if (start === null) return tr;
	const blocked = edit && !tr.docChanged;
	const base = blocked ? tr.startState.selection : tr.newSelection;
	if (!blocked && base.ranges.every((r) => r.from >= start)) return tr;

	const ranges: SelectionRange[] = [];
	let main = 0;
	base.ranges.forEach((r, i) => {
		if (r.to < start) return;
		if (i === base.mainIndex) main = ranges.length;
		ranges.push(r.from >= start ? r : EditorSelection.range(Math.max(r.anchor, start), Math.max(r.head, start)));
	});
	const selection = ranges.length > 0 ? EditorSelection.create(ranges, main) : EditorSelection.single(start);
	return [tr, { selection, sequential: true }];
});

/**
 * Keyboard guard for the hidden frontmatter: a change filter on `delete*` and
 * `move*` user edits plus a selection clamp, so keyboard commands cannot edit
 * or land on the fences the user cannot see. Pure filters with no view
 * access; installed with the `frontmatter` kill switch. Undo and redo dispatch
 * with `filter: false`, and programmatic writes carry no userEvent, so neither
 * reaches it. Do not use `atomicRanges` (`deleteBy` would then delete the
 * whole frontmatter on Backspace at the body start) or `Prec` (it would run
 * this filter after `indentOnInput` instead of before).
 */
export const frontmatterGuard = [frontmatterChangeGuard, frontmatterSelectionGuard];

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
