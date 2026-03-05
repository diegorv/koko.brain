import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import {
	mouseSelectingField,
	setMouseSelecting,
} from '$lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting';

function createState(): EditorState {
	return EditorState.create({ doc: 'test', extensions: [mouseSelectingField] });
}

describe('mouseSelectingField', () => {
	it('starts as false', () => {
		const state = createState();
		expect(state.field(mouseSelectingField)).toBe(false);
	});

	it('becomes true after setMouseSelecting(true)', () => {
		const state = createState();
		const tr = state.update({ effects: setMouseSelecting.of(true) });
		expect(tr.state.field(mouseSelectingField)).toBe(true);
	});

	it('becomes false after setMouseSelecting(false)', () => {
		const state = createState();
		const tr1 = state.update({ effects: setMouseSelecting.of(true) });
		const tr2 = tr1.state.update({ effects: setMouseSelecting.of(false) });
		expect(tr2.state.field(mouseSelectingField)).toBe(false);
	});

	it('keeps value when unrelated transaction occurs', () => {
		const state = createState();
		const tr1 = state.update({ effects: setMouseSelecting.of(true) });
		// Dispatch an unrelated transaction (doc change)
		const tr2 = tr1.state.update({ changes: { from: 0, to: 0, insert: 'x' } });
		expect(tr2.state.field(mouseSelectingField)).toBe(true);
	});
});
