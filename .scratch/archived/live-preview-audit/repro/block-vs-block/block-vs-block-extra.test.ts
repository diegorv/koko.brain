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

function mount(doc: string, cursorAt = 'end'): EditorView {
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.lastIndexOf(cursorAt),
			extensions: [testMarkdown(), livePreviewExtensions({})],
		}),
	);
}
const q = <T extends HTMLElement>(v: EditorView, s: string) => v.contentDOM.querySelector<T>(s);

describe('block math', () => {
	it('top level renders (control)', () => {
		const view = mount('# H\n\n$$\na+b\n$$\n\nend\n');
		const el = q(view, '.cm-lp-math-block');
		expect(el, 'math drawn').not.toBeNull();
		view.destroy();
	});
	for (const [name, doc] of [
		['callout', '> [!note] T\n> $$\n> a+b\n> $$\n\nend\n'],
		['blockquote', '> $$\n> a+b\n> $$\n\nend\n'],
	] as const) {
		it(`in a ${name} renders the formula without the quote prefix`, () => {
			const view = mount(doc);
			const err = q(view, '.cm-lp-math-error');
			const ok = q(view, '.cm-lp-math-block');
			expect(err?.textContent ?? null, 'no math error').toBeNull();
			expect(ok, 'math drawn').not.toBeNull();
			view.destroy();
		});
	}
});

describe('raw code block shows its own text, not other block widgets', () => {
	it('callout header inside a revealed fenced code block is not decorated', () => {
		const doc = '```md\n> [!note] T\n> body\nend\n```\n';
		const view = mount(doc);
		expect(q(view, '.cm-lp-callout-fold, .cm-lp-callout-type-label, .cm-lp-callout-type'), 'no callout widgets in raw code').toBeNull();
		view.destroy();
	});
	it('audio tag inside a revealed fenced code block is not a player', () => {
		const doc = '```html\n<audio src="a.mp3"></audio>\nend\n```\n';
		const view = mount(doc);
		expect(q(view, 'audio'), 'no audio player in raw code').toBeNull();
		view.destroy();
	});
	it('video inside a revealed %% comment is not a player', () => {
		const doc = '%%\n<video src="a.mp4"></video>\nend\n%%\n';
		const view = mount(doc);
		expect(q(view, 'video'), 'no video in raw comment').toBeNull();
		view.destroy();
	});
	it('video inside a hidden %% comment is hidden (line class)', () => {
		const doc = '%%\n<video src="a.mp4"></video>\n%%\n\nend\n';
		const view = mount(doc);
		const v = q(view, 'video');
		if (v) expect(v.closest('.cm-lp-hidden-line'), 'video line hidden').not.toBeNull();
		view.destroy();
	});
});

describe('block math directly after a paragraph line', () => {
	for (const [name, doc] of [
		['callout with a blank quote line', '> [!note] T\n>\n> $$\n> a+b\n> $$\n\nend\n'],
		['top-level paragraph, no blank line', 'Total:\n$$\na+b\n$$\n\nend\n'],
	] as const) {
		it(name, () => {
			const view = mount(doc);
			expect(q(view, '.cm-lp-math-block'), 'math drawn').not.toBeNull();
			view.destroy();
		});
	}
});

describe('adjacent block widgets sharing a boundary', () => {
	it('code block language change keeps an adjacent block math widget', () => {
		const doc = '```js\nx\n```\n$$\na\n$$\n\nend\n';
		const view = mount(doc);
		expect(q(view, '.cm-lp-math-block')).not.toBeNull();
		const sel = q<HTMLSelectElement>(view, 'select.cm-lp-codeblock-lang-select')!;
		sel.value = 'python';
		withFullParse(() => sel.dispatchEvent(new Event('change')));
		expect(q(view, '.cm-lp-math-block'), 'math drawn').not.toBeNull();
		expect(q(view, 'select.cm-lp-codeblock-lang-select'), 'select drawn').not.toBeNull();
		view.destroy();
	});
	it('table +row directly above a code block keeps both', () => {
		const doc = '| a |\n| - |\n| 1 |\n```js\nx\n```\n\nend\n';
		const view = mount(doc);
		expect(q(view, '.cm-lp-table-wrapper')).not.toBeNull();
		expect(q(view, '.cm-lp-codeblock')).not.toBeNull();
		withFullParse(() => q<HTMLButtonElement>(view, '.cm-lp-table-add-row')!.click());
		expect(q(view, '.cm-lp-table-wrapper'), 'table drawn').not.toBeNull();
		expect(q(view, '.cm-lp-codeblock'), 'code drawn').not.toBeNull();
		view.destroy();
	});
});
