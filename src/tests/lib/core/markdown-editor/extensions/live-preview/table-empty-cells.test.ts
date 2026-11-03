// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import type { EditorView } from '@codemirror/view';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../test-helpers';

beforeAll(() => {
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

afterEach(() => {
	document.body.replaceChildren();
});

/** Mounts the full live preview with the cursor on the `end` line, outside the table. */
function mount(doc: string): EditorView {
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.indexOf('end'),
			extensions: [testMarkdown(), livePreviewExtensions({})],
		}),
	);
}

function tables(view: EditorView): HTMLElement[] {
	return [...view.contentDOM.querySelectorAll<HTMLElement>('.cm-lp-table-wrapper')];
}

function headerTexts(table: HTMLElement): (string | null)[] {
	return [...table.querySelectorAll('thead th')].map((th) => th.textContent);
}

function bodyTexts(table: HTMLElement): (string | null)[][] {
	return [...table.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));
}

describe('table widget: empty cells keep their columns', () => {
	it('+col keeps one table drawn, with three columns in the header and every body row', () => {
		const view = mount(`# T\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nend\n`);
		const add = view.contentDOM.querySelector<HTMLElement>('.cm-lp-table-add-col')!;
		withFullParse(() => add.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 })));
		expect(view.state.doc.toString()).toContain('| a | b |  |');
		const t = tables(view);
		expect(t.length).toBe(1);
		expect(headerTexts(t[0])).toEqual(['a', 'b', '']);
		expect(bodyTexts(t[0])).toEqual([['1', '2', '']]);
	});

	it('renders an empty corner cell and an empty body cell in their columns', () => {
		const view = mount(`# T\n\n|  | Mon | Tue |\n| --- | --- | --- |\n| run | 1 | 2 |\n| a |  | c |\n\nend\n`);
		const t = tables(view)[0];
		expect(headerTexts(t)).toEqual(['', 'Mon', 'Tue']);
		expect(bodyTexts(t)).toEqual([
			['run', '1', '2'],
			['a', '', 'c'],
		]);
	});

	it('a body row with more cells than the delimiter row renders the delimiter count', () => {
		const view = mount(`# T\n\n| a | b |\n| --- | --- |\n| 1 | 2 | 3 |\n\nend\n`);
		const t = tables(view)[0];
		expect(headerTexts(t)).toEqual(['a', 'b']);
		expect(bodyTexts(t)).toEqual([['1', '2']]);
		expect(view.state.doc.toString()).toContain('| 1 | 2 | 3 |');
	});
});
