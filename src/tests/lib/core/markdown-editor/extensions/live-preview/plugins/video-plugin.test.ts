import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { computeVideoBlocks } from '$lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin';

function createState(doc: string, cursor?: number): EditorState {
	return EditorState.create({
		doc,
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	});
}

function collectDecos(state: EditorState): { from: number; to: number }[] {
	const val = computeVideoBlocks(state);
	const result: { from: number; to: number }[] = [];
	const iter = val.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return result;
}

describe('videoPlugin', () => {
	it('produces decoration for a single-line video block', () => {
		const doc = 'text\n<video src="file.mp4" controls></video>';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(1);
	});

	it('produces decorations for a multi-line video block', () => {
		// 1 replace on opening + 2 per remaining line (hidden + replace)
		// Total: 1 + 2 + 2 = 5
		const doc = 'text\n<video controls>\n  <source src="file.mp4" type="video/mp4">\n</video>';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(5);
	});

	it('does not decorate when cursor is inside the block', () => {
		const doc = '<video src="file.mp4" controls></video>';
		const state = createState(doc, 10);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(0);
	});

	it('produces no decorations for document without video blocks', () => {
		const state = createState('# Just a heading\nSome text');
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('ignores video blocks without src', () => {
		const doc = '<video controls></video>';
		const state = createState(doc, 0);
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('handles multiple video blocks', () => {
		const doc = 'start\n<video src="a.mp4" controls></video>\ntext\n<video src="b.mp4" controls></video>';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(2);
	});

	it('updates when document changes', () => {
		const state = createState('plain text');
		expect(collectDecos(state)).toHaveLength(0);

		const tr = state.update({
			changes: { from: 0, to: state.doc.length, insert: 'text\n<video src="file.mp4" controls></video>' },
		});
		expect(collectDecos(tr.state).length).toBeGreaterThan(0);
	});
});
