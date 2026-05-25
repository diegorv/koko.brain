import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { computeFrontmatter } from '$lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field';

function createState(doc: string, cursor?: number): EditorState {
	return EditorState.create({
		doc,
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	});
}

/** Collects decoration ranges from a DecorationSet */
function collectDecos(state: EditorState): { from: number; to: number }[] {
	const decoSet = computeFrontmatter(state);
	const result: { from: number; to: number }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return result;
}

describe('frontmatterField', () => {
	it('produces decorations for a document with frontmatter', () => {
		const doc = '---\ntitle: Hello\n---\n# Content';
		const state = createState(doc);
		const decos = collectDecos(state);
		// 3 lines x 2 decos each (hiddenLineDeco + replace) = 6
		expect(decos).toHaveLength(6);
	});

	it('produces no decorations for a document without frontmatter', () => {
		const state = createState('# Just a heading\nSome text');
		const decos = collectDecos(state);
		expect(decos).toHaveLength(0);
	});

	it('hides all frontmatter lines including opening fence', () => {
		const doc = '---\ntitle: Hello\n---';
		const state = createState(doc);
		const decos = collectDecos(state);
		// 3 lines x 2 = 6
		expect(decos).toHaveLength(6);
		// Line 1 ("---"): hiddenLineDeco at from=0, replace at [0, 3]
		expect(decos[0]).toEqual({ from: 0, to: 0 });
		expect(decos[1]).toEqual({ from: 0, to: 3 });
		// Line 2 ("title: Hello"): hiddenLineDeco at from=4, replace at [4, 16]
		expect(decos[2]).toEqual({ from: 4, to: 4 });
		expect(decos[3]).toEqual({ from: 4, to: 16 });
		// Line 3 ("---"): hiddenLineDeco at from=17, replace at [17, 20]
		expect(decos[4]).toEqual({ from: 17, to: 17 });
		expect(decos[5]).toEqual({ from: 17, to: 20 });
	});

	it('always decorates regardless of cursor position', () => {
		const doc = '---\ntitle: Hello\n---\n# Content';
		// Cursor on frontmatter line 2 (inside the block)
		const state = createState(doc, 5);
		const decos = collectDecos(state);
		expect(decos).toHaveLength(6);
	});

	it('handles empty frontmatter block', () => {
		const doc = '---\n---\n# Content';
		const state = createState(doc);
		const decos = collectDecos(state);
		// 2 lines x 2 = 4
		expect(decos).toHaveLength(4);
	});

	it('handles frontmatter with many properties', () => {
		const doc = '---\na: 1\nb: 2\nc: 3\nd: 4\n---\ncontent';
		const state = createState(doc);
		const decos = collectDecos(state);
		// 6 lines x 2 = 12
		expect(decos).toHaveLength(12);
	});

	it('updates when document changes', () => {
		const doc = '# No frontmatter';
		const state = createState(doc);
		expect(collectDecos(state)).toHaveLength(0);

		// Add frontmatter via transaction
		const tr = state.update({
			changes: { from: 0, to: 0, insert: '---\ntitle: Test\n---\n' },
		});
		const decos = collectDecos(tr.state);
		expect(decos.length).toBeGreaterThan(0);
	});

	it('produces no decorations for empty document', () => {
		const state = createState('');
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('produces no decorations when frontmatter not on first line', () => {
		const state = createState('some text\n---\ntitle: Hello\n---');
		expect(collectDecos(state)).toHaveLength(0);
	});
});
