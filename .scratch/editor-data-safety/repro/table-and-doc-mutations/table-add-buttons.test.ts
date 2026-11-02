// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import type { EditorView } from '@codemirror/view';
import { computeTables } from '#lib/core/markdown-editor/extensions/live-preview/plugins/table-field.js';
import { TableWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { mountMarkdownView } from '../../lib/core/markdown-editor/test-helpers';

/**
 * Mounts the real markdown + GFM language on `doc` with the cursor on the last
 * line (outside the table), lets the real table decorator build the TableWidget
 * exactly as live preview does, and clicks one of its `+` buttons.
 */
function clickAdd(doc: string, which: 'row' | 'col'): string {
	const view: EditorView = mountMarkdownView(doc, { cursor: doc.length });
	const decos = computeTables(view.state);
	let widget: TableWidget | null = null;
	const iter = decos.iter();
	while (iter.value) {
		const w = (iter.value.spec as { widget?: unknown }).widget;
		if (w instanceof TableWidget) {
			widget = w;
			break;
		}
		iter.next();
	}
	expect(widget, 'the table decorator must build a TableWidget').not.toBeNull();
	const dom = widget!.toDOM(view);
	view.dom.appendChild(dom);
	dom.querySelector<HTMLButtonElement>(`.cm-lp-table-add-${which}`)!.click();
	const out = view.state.doc.toString();
	view.destroy();
	return out;
}

afterEach(() => {
	document.body.innerHTML = '';
});

describe('F98: +row / +col keep cells beyond the header count', () => {
	const doc = '| Item | Qty |\n| --- | --- |\n| apple | 3 | bought at Lidl |\n\ntext';

	it('+row does not delete the extra cell text', () => {
		expect(clickAdd(doc, 'row')).toContain('bought at Lidl');
	});

	it('+col does not delete the extra cell text', () => {
		expect(clickAdd(doc, 'col')).toContain('bought at Lidl');
	});

	it('F111 variant: an unclosed `[[` in the header merges header cells and +row drops body text', () => {
		const d = '| Note | [[Link | Status |\n| --- | --- | --- |\n| a | b | done |\n\ntext';
		expect(clickAdd(d, 'row')).toContain('done');
	});
});

describe('F99: +row / +col must not re-escape raw cell source', () => {
	it('a backslash in a cell is not doubled', () => {
		const doc = '| path |\n| --- |\n| C:\\temp |\n\ntext';
		const out = clickAdd(doc, 'row');
		expect(out).toContain('| C:\\temp |');
		expect(out).not.toContain('C:\\\\temp');
	});

	it('a wikilink alias in a cell keeps its bare pipe target', () => {
		const doc = '| link |\n| --- |\n| [[Note|alias]] |\n\ntext';
		const out = clickAdd(doc, 'row');
		expect(out).toContain('[[Note|alias]]');
	});

	it('an already-escaped pipe stays a single escaped pipe', () => {
		const doc = '| a |\n| --- |\n| x\\|y |\n\ntext';
		const out = clickAdd(doc, 'col');
		expect(out).toContain('x\\|y');
		expect(out).not.toContain('x\\\\\\|y');
	});
});

describe('F100: a table inside a blockquote keeps its `> ` prefixes after +row', () => {
	it('every table line stays quoted', () => {
		const doc = '> [!note]\n> | a | b |\n> | --- | --- |\n> | 1 | 2 |\n\ntext';
		const out = clickAdd(doc, 'row');
		const tableLines = out.split('\n').slice(1, 5);
		expect(tableLines).toHaveLength(4);
		expect(tableLines.every((l) => l.startsWith('> ')), out).toBe(true);
	});

	it('a table in a list item keeps its indentation after +row', () => {
		const doc = '- item\n\n  | a | b |\n  | --- | --- |\n  | 1 | 2 |\n\ntext';
		const out = clickAdd(doc, 'row');
		const tableLines = out.split('\n').slice(2, 6);
		expect(tableLines.every((l) => l.startsWith('  |')), out).toBe(true);
	});
});
