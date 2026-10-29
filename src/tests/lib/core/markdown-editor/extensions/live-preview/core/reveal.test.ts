import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection, type SelectionRange } from '@codemirror/state';
import { revealPredicate } from '#lib/core/markdown-editor/extensions/live-preview/core/reveal.js';
import {
	mouseSelectingField,
	setMouseSelecting,
} from '#lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.js';

const DOC = 'line one\nline two\nline three\nline four';

/** Start offset of 1-based line `n` in DOC. */
function lineStart(n: number): number {
	return EditorState.create({ doc: DOC }).doc.line(n).from;
}

function stateWith(ranges: SelectionRange[]): EditorState {
	return EditorState.create({
		doc: DOC,
		selection: EditorSelection.create(ranges, 0),
		extensions: [EditorState.allowMultipleSelections.of(true), mouseSelectingField],
	});
}

/** Which 1-based lines of DOC the predicate reveals, line by line. */
function revealedLineNumbers(state: EditorState): number[] {
	const isRevealed = revealPredicate(state);
	const out: number[] = [];
	for (let n = 1; n <= state.doc.lines; n++) {
		const line = state.doc.line(n);
		if (isRevealed(line.from, line.to)) out.push(n);
	}
	return out;
}

describe('revealPredicate', () => {
	it('single cursor reveals exactly its line', () => {
		const state = stateWith([EditorSelection.cursor(lineStart(2) + 3)]);
		expect(revealedLineNumbers(state)).toEqual([2]);
	});

	it('reveals any position on the cursor line, not only the cursor position', () => {
		const state = stateWith([EditorSelection.cursor(lineStart(2))]);
		const isRevealed = revealPredicate(state);
		const line = state.doc.line(2);
		expect(isRevealed(line.to)).toBe(true);
		expect(isRevealed(line.to - 3, line.to - 1)).toBe(true);
	});

	it('cursor at the end of a line does not reveal the next line', () => {
		const state = stateWith([EditorSelection.cursor(lineStart(2) - 1)]);
		expect(revealedLineNumbers(state)).toEqual([1]);
	});

	it('multi-cursor reveals every cursor line', () => {
		const state = stateWith([
			EditorSelection.cursor(lineStart(1) + 1),
			EditorSelection.cursor(lineStart(3) + 2),
		]);
		expect(revealedLineNumbers(state)).toEqual([1, 3]);
	});

	it('multi-line selection reveals every line it touches, both directions', () => {
		const forward = stateWith([EditorSelection.range(lineStart(2) + 2, lineStart(4) + 1)]);
		expect(revealedLineNumbers(forward)).toEqual([2, 3, 4]);
		const backward = stateWith([EditorSelection.range(lineStart(3) + 1, lineStart(1) + 4)]);
		expect(revealedLineNumbers(backward)).toEqual([1, 2, 3]);
	});

	it('a range spanning several lines is revealed when any of its lines is touched', () => {
		const state = stateWith([EditorSelection.cursor(lineStart(3) + 1)]);
		const isRevealed = revealPredicate(state);
		expect(isRevealed(lineStart(2), lineStart(3) + 2)).toBe(true);
		expect(isRevealed(lineStart(1), lineStart(2) + 2)).toBe(false);
	});

	it('a range ending exactly at a line start ends on the previous line', () => {
		const state = stateWith([EditorSelection.cursor(lineStart(2) + 3)]);
		const isRevealed = revealPredicate(state);
		expect(isRevealed(lineStart(1), lineStart(2))).toBe(false);
		expect(isRevealed(lineStart(2), lineStart(3))).toBe(true);
	});

	it('a selection ending at the next line start (triple-click) does not reveal that line', () => {
		const state = stateWith([EditorSelection.range(lineStart(2), lineStart(3))]);
		expect(revealedLineNumbers(state)).toEqual([2]);
	});

	it('an empty cursor at a line start still reveals that line', () => {
		const state = stateWith([EditorSelection.cursor(lineStart(3))]);
		expect(revealedLineNumbers(state)).toEqual([3]);
	});

	it('reveals nothing while a mouse drag is in progress', () => {
		const dragging = stateWith([EditorSelection.range(lineStart(1), lineStart(3) + 1)]).update({
			effects: setMouseSelecting.of(true),
		}).state;
		expect(revealedLineNumbers(dragging)).toEqual([]);

		const released = dragging.update({ effects: setMouseSelecting.of(false) }).state;
		expect(revealedLineNumbers(released)).toEqual([1, 2, 3]);
	});

	it('works on a state without the mouse-selecting field', () => {
		const state = EditorState.create({ doc: DOC, selection: { anchor: lineStart(4) } });
		expect(revealedLineNumbers(state)).toEqual([4]);
	});
});
