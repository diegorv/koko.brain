import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { computeAudioBlocks } from '$lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin';

function createState(doc: string, cursor?: number): EditorState {
	return EditorState.create({
		doc,
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	});
}

function collectDecos(state: EditorState): { from: number; to: number }[] {
	const val = computeAudioBlocks(state);
	const result: { from: number; to: number }[] = [];
	const iter = val.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return result;
}

describe('audioPlugin', () => {
	it('produces decoration for a single-line audio block', () => {
		// Single-line: 1 replace decoration for the whole line
		const doc = 'text\n<audio src="file.mp3" controls></audio>';
		const state = createState(doc, 0); // cursor on "text"
		const decos = collectDecos(state);
		expect(decos).toHaveLength(1);
	});

	it('produces decorations for a multi-line audio block', () => {
		// Multi-line: 1 replace on opening line + 2 per remaining line (hidden + replace)
		// Opening: <audio controls>
		// Line 2: <source src="file.mp3">  → 2 decos
		// Line 3: </audio>                  → 2 decos
		// Total: 1 + 2 + 2 = 5
		const doc = 'text\n<audio controls>\n  <source src="file.mp3" type="audio/mpeg">\n</audio>';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(5);
	});

	it('does not decorate when cursor is inside the block', () => {
		const doc = '<audio src="file.mp3" controls></audio>';
		const state = createState(doc, 10); // cursor inside the tag
		const decos = collectDecos(state);
		expect(decos).toHaveLength(0);
	});

	it('does not decorate when cursor is inside multi-line block', () => {
		const doc = '<audio controls>\n  <source src="file.mp3">\n</audio>';
		const state = createState(doc, 25); // cursor on source line
		const decos = collectDecos(state);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations for document without audio blocks', () => {
		const state = createState('# Just a heading\nSome text');
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('ignores audio blocks without src', () => {
		const doc = '<audio controls></audio>';
		const state = createState(doc, 0);
		// Parser returns null for no-src, so no decorations
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('handles multiple audio blocks', () => {
		// Each single-line block: 1 decoration
		const doc = 'start\n<audio src="a.mp3" controls></audio>\ntext\n<audio src="b.mp3" controls></audio>';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(2);
	});

	it('updates when document changes', () => {
		const state = createState('plain text');
		expect(collectDecos(state)).toHaveLength(0);

		const tr = state.update({
			changes: { from: 0, to: state.doc.length, insert: 'text\n<audio src="file.mp3" controls></audio>' },
		});
		expect(collectDecos(tr.state).length).toBeGreaterThan(0);
	});
});
