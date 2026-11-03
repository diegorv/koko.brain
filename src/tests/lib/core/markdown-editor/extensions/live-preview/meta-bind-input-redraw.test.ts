// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest';

vi.mock('svelte-sonner', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

import type { EditorView } from '@codemirror/view';
import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { mountMarkdownView, testMarkdown, withFullParse } from '../../test-helpers';

/**
 * A meta-bind INPUT sits in inline code, whose backticks the inline pipeline
 * hides with their own replace decorations. A write changes the widget's value
 * (its `eq()` turns false), so CodeMirror redraws only that region; the
 * control must still be drawn there, not only on a full redraw (a tab switch
 * or a far scroll).
 */
beforeAll(() => {
	// jsdom has no layout; CodeMirror measures after a doc change.
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

afterEach(() => {
	document.body.replaceChildren();
});

function mount(frontmatter: string, input: string): EditorView {
	const doc = `---\n${frontmatter}\n---\n# Daily\n\nField: \`${input}\`\n\nend\n`;
	return withFullParse(() =>
		mountMarkdownView(doc, {
			cursor: doc.indexOf('end'),
			extensions: [testMarkdown(), livePreviewExtensions({})],
		}),
	);
}

function control<T extends HTMLElement>(view: EditorView, selector: string): T | null {
	return view.contentDOM.querySelector<T>(selector);
}

const SELECT = 'INPUT[inlineSelect(option(good, good), option(bad, bad)):mood]';

describe('a meta-bind control stays drawn after it writes', () => {
	for (const [name, frontmatter] of [
		['an empty field', 'mood:'],
		['a set field', 'mood: good'],
		['a missing field', 'title: x'],
	] as const) {
		it(`inline select on ${name}`, () => {
			const view = mount(frontmatter, SELECT);
			const select = control<HTMLSelectElement>(view, 'select.cm-lp-meta-bind-select')!;
			expect(select).not.toBeNull();

			select.value = 'bad';
			withFullParse(() => select.dispatchEvent(new Event('change')));

			expect(view.state.doc.toString()).toContain('mood: bad');
			const after = control<HTMLSelectElement>(view, 'select.cm-lp-meta-bind-select');
			expect(after, 'the select is drawn after the write').not.toBeNull();
			expect(after!.value).toBe('bad');
			view.destroy();
		});
	}

	it('toggle', () => {
		const view = mount('done: false', 'INPUT[toggle():done]');
		const cb = control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-toggle-input')!;
		expect(cb).not.toBeNull();

		cb.checked = true;
		withFullParse(() => cb.dispatchEvent(new Event('change')));

		expect(view.state.doc.toString()).toContain('done:');
		expect(view.state.doc.toString()).not.toContain('done: false');
		const after = control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-toggle-input');
		expect(after, 'the toggle is drawn after the write').not.toBeNull();
		expect(after!.checked).toBe(true);
		view.destroy();
	});

	it('number input', () => {
		const view = mount('count: 5', 'INPUT[number():count]');
		const input = control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-input')!;
		expect(input).not.toBeNull();

		input.value = '7';
		withFullParse(() => input.dispatchEvent(new Event('blur')));

		expect(view.state.doc.toString()).toMatch(/count: "?7"?/);
		const after = control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-input');
		expect(after, 'the input is drawn after the write').not.toBeNull();
		expect(after!.value).toBe('7');
		view.destroy();
	});
});
