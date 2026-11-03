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

const FM = '---\nmood: good\n---\n';
const SELECT = '`INPUT[inlineSelect(option(good, good), option(bad, bad)):mood]`';

function mount(doc: string): EditorView {
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.lastIndexOf('end'),
			extensions: [testMarkdown(), livePreviewExtensions({})],
		}),
	);
}
function strayControls(view: EditorView): number {
	return Array.from(view.contentDOM.querySelectorAll('select.cm-lp-meta-bind-select')).filter(
		(el) => !el.closest('.cm-lp-table-wrapper') && !el.closest('.cm-lp-hidden-line'),
	).length;
}

describe('a meta-bind INPUT inside a block widget is drawn once, by the block', () => {
	for (const [name, doc] of [
		['table header cell', `${FM}| ${SELECT} | b |\n| - | - |\n| 1 | 2 |\n\nend\n`],
		['table header cell in a callout', `${FM}> [!note] T\n> | ${SELECT} | b |\n> | - | - |\n> | 1 | 2 |\n\nend\n`],
		['table body cell', `${FM}| a | b |\n| - | - |\n| ${SELECT} | 2 |\n\nend\n`],
	] as const) {
		it(name, () => {
			const view = mount(doc);
			expect(view.contentDOM.querySelector('.cm-lp-table-wrapper'), 'table drawn').not.toBeNull();
			expect(strayControls(view), 'no meta-bind control outside the table').toBe(0);
			const sel = view.contentDOM.querySelector<HTMLSelectElement>('.cm-lp-table-wrapper select.cm-lp-meta-bind-select')!;
			expect(sel, 'table cell select').not.toBeNull();
			sel.value = 'bad';
			withFullParse(() => sel.dispatchEvent(new Event('change')));
			expect(view.state.doc.toString()).toContain('mood: bad');
			expect(view.contentDOM.querySelector('.cm-lp-table-wrapper'), 'table drawn after write').not.toBeNull();
			expect(strayControls(view), 'no meta-bind control outside the table after write').toBe(0);
			view.destroy();
		});
	}
});
