import { describe, it, expect } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { computeTables } from '$lib/core/markdown-editor/extensions/live-preview/plugins/table-field';

function createState(doc: string, cursor?: number): EditorState {
	const state = EditorState.create({
		doc,
		extensions: [markdown({ extensions: GFM })],
		selection: cursor !== undefined ? EditorSelection.single(cursor) : undefined,
	});
	ensureSyntaxTree(state, state.doc.length, 5000);
	return state;
}

function collectDecos(state: EditorState): { from: number; to: number }[] {
	const val = computeTables(state);
	const result: { from: number; to: number }[] = [];
	const iter = val.iter();
	while (iter.value) {
		result.push({ from: iter.from, to: iter.to });
		iter.next();
	}
	return result;
}

const SIMPLE_TABLE = 'text\n| A | B |\n| --- | --- |\n| 1 | 2 |';

describe('tableField', () => {
	it('decorates a table when cursor is outside', () => {
		const state = createState(SIMPLE_TABLE, 0); // cursor on "text"
		const decos = collectDecos(state);
		// First line: replace with widget, lines 2-3: hiddenLineDeco + replace each
		// Line 1 (header): 1 replace widget
		// Line 2 (separator): 1 hiddenLineDeco + 1 replace = 2
		// Line 3 (data row): 1 hiddenLineDeco + 1 replace = 2
		// Total: 5
		expect(decos).toHaveLength(5);
	});

	it('does not decorate when cursor is inside the table', () => {
		const doc = '| A | B |\n| --- | --- |\n| 1 | 2 |';
		const state = createState(doc, 3); // cursor on header line
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('produces no decorations without tables', () => {
		const state = createState('plain text\nno tables', 0);
		expect(collectDecos(state)).toHaveLength(0);
	});

	it('handles multiple tables', () => {
		const doc = 'text\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n| C |\n| --- |\n| 3 |';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// Table 1: 1 widget + 2*(hiddenLine + replace) = 5
		// Table 2: 1 widget + 2*(hiddenLine + replace) = 5
		expect(decos).toHaveLength(10);
	});

	it('handles table with only header and separator (no data rows)', () => {
		const doc = 'text\n| A | B |\n| --- | --- |';
		const state = createState(doc, 0);
		const decos = collectDecos(state);
		// 1 widget + 1*(hiddenLine + replace) = 3
		expect(decos).toHaveLength(3);
	});

	it('updates when document changes', () => {
		const state = createState('plain text', 0);
		expect(collectDecos(state)).toHaveLength(0);

		const tr = state.update({
			changes: {
				from: 0,
				to: state.doc.length,
				insert: 'text\n| A | B |\n| --- | --- |\n| 1 | 2 |',
			},
		});
		expect(collectDecos(tr.state).length).toBeGreaterThan(0);
	});

	it('does not match non-table pipe lines', () => {
		const doc = 'text\n| not a table\nmore text';
		const state = createState(doc, 0);
		expect(collectDecos(state)).toHaveLength(0);
	});
});
