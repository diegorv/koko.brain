import { describe, it, expect } from 'vitest';
import type { EditorState } from '@codemirror/state';
import type { DecorationSet } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { computeTables } from '$lib/core/markdown-editor/extensions/live-preview/plugins/table-field';
import type { Property } from '$lib/features/properties/properties.types';
import { createMarkdownState } from '../../../test-helpers';

function createState(doc: string, cursor?: number): EditorState {
	return createMarkdownState(doc, { extensions: [markdown({ extensions: GFM })], cursor });
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

/** Iterates a decoration set into plain ranges plus the widget attached to each (if any). */
function iterDecos(decoSet: DecorationSet) {
	const result: { from: number; to: number; widget?: { properties?: Property[] } }[] = [];
	const iter = decoSet.iter();
	while (iter.value) {
		result.push({
			from: iter.from,
			to: iter.to,
			widget: (iter.value.spec as { widget?: { properties?: Property[] } }).widget,
		});
		iter.next();
	}
	return result;
}

describe('tableField - frontmatter parse does not materialize the full document', () => {
	const FM = '---\nrating: 2\n---';
	const TABLE = '| A | B |\n| --- | --- |\n| 1 | 2 |';

	it('never copies the whole document during a rebuild, and still feeds the widget frontmatter properties', () => {
		// The blank line after the table is mandatory: without it GFM swallows the
		// lorem lines into the Table node, the cursor lands inside the table and
		// computeTables emits zero decorations - which would make the parity half
		// of this test pass vacuously.
		const doc = `${FM}\n${TABLE}\n\n${'lorem ipsum dolor sit amet\n'.repeat(500)}`;
		// createState runs ensureSyntaxTree, so the Lezer parse's own reads happen
		// before the spy is installed and cannot pollute the recorded spans.
		const state = createState(doc, 0); // cursor in the frontmatter, outside the table

		// sliceString is the single materialization primitive - Text.toString()
		// delegates to sliceString(0) - so recording every call bounds every
		// string allocation taken from the document.
		const spans: { from: number; to: number }[] = [];
		const origSlice = state.doc.sliceString.bind(state.doc);
		state.doc.sliceString = (from: number, to?: number, lineSep?: string) => {
			spans.push({ from, to: to ?? state.doc.length });
			return origSlice(from, to, lineSep);
		};

		const decos = iterDecos(computeTables(state));

		// (a) No allocation starting at the document head may run past the closing
		// fence. Spans further in are legitimate: findAllTables slices each
		// TableCell / TableDelimiter range to read the table.
		for (const span of spans) {
			if (span.from === 0) expect(span.to).toBeLessThanOrEqual(FM.length);
		}

		// (b) The parse must still happen - deleting it would make (a) pass.
		expect(decos).toHaveLength(5);
		const properties = decos.find((d) => d.widget)?.widget?.properties;
		expect(properties).toBeDefined();
		expect(properties?.some((p) => p.key === 'rating' && String(p.value) === '2')).toBe(true);
	});
});
