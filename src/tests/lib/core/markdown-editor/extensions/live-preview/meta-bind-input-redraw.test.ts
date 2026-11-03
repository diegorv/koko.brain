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
	return mountBody(frontmatter, `Field: \`${input}\``);
}

function mountBody(frontmatter: string, body: string): EditorView {
	const doc = `---\n${frontmatter}\n---\n# Daily\n\n${body}\n\nend\n`;
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

function selects(view: EditorView): HTMLSelectElement[] {
	return [...view.contentDOM.querySelectorAll<HTMLSelectElement>('select.cm-lp-meta-bind-select')];
}

function pick(view: EditorView, value: string, index = 0) {
	const select = selects(view)[index];
	expect(select, 'a select to pick from').toBeDefined();
	select.value = value;
	withFullParse(() => select.dispatchEvent(new Event('change')));
}

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

describe('a meta-bind select stays drawn after a write in any inline container', () => {
	const CONTAINERS: [string, string][] = [
		['a list item', `- Mood: \`${SELECT}\``],
		['an ordered list item', `1. Mood: \`${SELECT}\``],
		['a task item', `- [ ] Mood: \`${SELECT}\``],
		['a blockquote', `> Mood: \`${SELECT}\``],
		['a heading', `## Mood \`${SELECT}\``],
		['a callout body', `> [!note] Today\n> Mood: \`${SELECT}\``],
		['a callout title', `> [!note] Mood \`${SELECT}\`\n> body`],
		['bold text', `**Mood** \`${SELECT}\``],
		['double-backtick inline code', `Mood: \`\`${SELECT}\`\``],
	];

	for (const [name, body] of CONTAINERS) {
		it(name, () => {
			const view = mountBody('mood: good', body);
			expect(selects(view)).toHaveLength(1);

			pick(view, 'bad');

			expect(view.state.doc.toString()).toContain('mood: bad');
			expect(selects(view), 'the select is drawn after the write').toHaveLength(1);
			expect(selects(view)[0].value).toBe('bad');
			view.destroy();
		});
	}

	it('two selects on one line both stay drawn after one of them writes', () => {
		const other = 'INPUT[inlineSelect(option(low, low), option(high, high)):energy]';
		const view = mountBody('mood: good\nenergy: low', `Mood: \`${SELECT}\` Energy: \`${other}\``);
		expect(selects(view)).toHaveLength(2);

		pick(view, 'bad', 0);

		expect(selects(view)).toHaveLength(2);
		expect(selects(view).map((s) => s.value)).toEqual(['bad', 'low']);
		view.destroy();
	});
});

describe('a pipe-less table whose first header cell is a meta-bind INPUT', () => {
	// The table widget draws the INPUT inside its header cell; the inline
	// meta-bind widget must not add a second select or take the table's place.
	const TABLE = `\`${SELECT}\` | b\n--- | ---\n1 | 2`;

	function tables(view: EditorView) {
		return view.contentDOM.querySelectorAll('.cm-lp-table-wrapper').length;
	}

	it('renders one table and one select', () => {
		const view = mountBody('mood: good', TABLE);
		expect(tables(view)).toBe(1);
		expect(selects(view)).toHaveLength(1);
		view.destroy();
	});

	it('keeps the table drawn after another property changes', () => {
		const view = mountBody('mood: good', TABLE);
		const from = view.state.doc.toString().indexOf('mood: good');
		withFullParse(() => view.dispatch({ changes: { from, to: from + 'mood: good'.length, insert: 'mood: good\ntitle: x' } }));

		expect(tables(view), 'the table is drawn after the edit').toBe(1);
		expect(selects(view)).toHaveLength(1);
		view.destroy();
	});
});

describe('the meta-bind control inside its inline code', () => {
	it('is not wrapped in the inline-code mark and leaves no backtick visible', () => {
		const view = mount('mood: good', SELECT);
		// The control replaces only `INPUT[...]`, the same range as the
		// inline-code highlight mark, so CodeMirror draws it outside that mark
		// (no code background around the select); the inline pipeline hides
		// the backticks.
		expect(selects(view)[0].closest('.cm-lp-code')).toBeNull();
		expect(view.contentDOM.textContent).not.toContain('`');
		view.destroy();
	});
});
