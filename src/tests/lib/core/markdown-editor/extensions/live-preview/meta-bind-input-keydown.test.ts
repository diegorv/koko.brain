// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { keymap, type EditorView } from '@codemirror/view';
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands';
import { metaBindInputPlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.js';
import { mountMarkdownView, testMarkdown } from '../../test-helpers';

/**
 * The meta-bind controls stop `mousedown`, so focusing one leaves the editor
 * selection on another line. A key pressed in the control bubbles to
 * `contentDOM`; unless the widget's `ignoreEvent` claims it, CodeMirror runs
 * the keymap (Backspace, Delete, Tab, Enter, Mod-z) against that selection.
 */
const LINE = 'hello world';

function docWith(frontmatter: string, input: string): string {
	return `---\n${frontmatter}\n---\n${LINE}\n\n\`${input}\`\n`;
}

function mount(doc: string, selection: 'cursor' | 'range' = 'cursor') {
	const from = doc.indexOf(LINE);
	const to = from + LINE.length;
	const view = mountMarkdownView(doc, {
		cursor: to,
		extensions: [
			testMarkdown(),
			metaBindInputPlugin,
			history(),
			keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
		],
	});
	if (selection === 'range') view.dispatch({ selection: { anchor: from, head: to } });
	return view;
}

function control<T extends HTMLElement>(view: EditorView, selector: string): T {
	const el = view.contentDOM.querySelector<T>(selector);
	if (!el) throw new Error(`no ${selector} rendered`);
	return el;
}

function press(el: HTMLElement, key: string) {
	const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
	el.dispatchEvent(ev);
	return ev;
}

beforeAll(() => {
	// jsdom has no layout; CodeMirror measures after a focus or a doc change,
	// so give Range the geometry an unrendered element reports.
	Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
	Range.prototype.getBoundingClientRect ??= () => new DOMRect();
});

afterEach(() => {
	document.body.replaceChildren();
});

const TEXT_INPUTS = [
	{ name: 'number input', doc: docWith('count: 5', 'INPUT[number():count]'), type: 'number' },
	{ name: 'date input', doc: docWith('due: 2026-01-05', 'INPUT[date():due]'), type: 'date' },
	{ name: 'type="text" fallback input', doc: docWith('count: 1,000', 'INPUT[number():count]'), type: 'text' },
];

describe.each(TEXT_INPUTS)('keys in a meta-bind $name', ({ doc, type }) => {
	it(`renders an input[type=${type}]`, () => {
		const view = mount(doc);
		expect(control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-input').type).toBe(type);
		view.destroy();
	});

	for (const key of ['Backspace', 'Delete']) {
		it(`${key} with the cursor on another line leaves the note unchanged`, () => {
			const view = mount(doc);
			const input = control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-input');
			input.focus();
			const ev = press(input, key);
			expect(view.state.doc.toString()).toBe(doc);
			expect(ev.defaultPrevented, 'the input keeps its own key').toBe(false);
			view.destroy();
		});

		it(`${key} with a selection on another line leaves the note unchanged`, () => {
			const view = mount(doc, 'range');
			const input = control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-input');
			input.focus();
			const ev = press(input, key);
			expect(view.state.doc.toString()).toBe(doc);
			expect(ev.defaultPrevented, 'the input keeps its own key').toBe(false);
			view.destroy();
		});
	}

	it('Tab leaves the note unchanged', () => {
		const view = mount(doc);
		const input = control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-input');
		input.focus();
		press(input, 'Tab');
		expect(view.state.doc.toString()).toBe(doc);
		view.destroy();
	});
});

describe('Enter on other meta-bind controls', () => {
	it('Enter on a focused toggle leaves the note unchanged', () => {
		const doc = docWith('done: true', 'INPUT[toggle():done]');
		const view = mount(doc);
		const cb = control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-toggle-input');
		cb.focus();
		press(cb, 'Enter');
		expect(view.state.doc.toString()).toBe(doc);
		view.destroy();
	});

	it('Enter on a focused meta-bind select leaves the note unchanged', () => {
		const doc = docWith('status: todo', 'INPUT[inlineSelect(todo, done):status]');
		const view = mount(doc);
		const select = control<HTMLSelectElement>(view, 'select.cm-lp-meta-bind-select');
		select.focus();
		press(select, 'Enter');
		expect(view.state.doc.toString()).toBe(doc);
		view.destroy();
	});
});

describe('meta-bind input still commits and keeps mouse routing', () => {
	it('Enter in the number input commits the typed value to frontmatter', () => {
		const view = mount(docWith('count: 5', 'INPUT[number():count]'));
		const input = control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-input');
		input.focus();
		input.value = '7';
		const ev = press(input, 'Enter');
		expect(ev.defaultPrevented).toBe(true);
		expect(view.state.doc.toString()).toMatch(/^---\ncount: "?7"?\n---\n/);
		expect(view.state.doc.toString()).toContain(LINE);
		view.destroy();
	});

	it.each([
		{ name: 'input', doc: docWith('count: 5', 'INPUT[number():count]'), selector: 'input.cm-lp-meta-bind-input' },
		{ name: 'toggle', doc: docWith('done: true', 'INPUT[toggle():done]'), selector: 'input.cm-lp-meta-bind-toggle-input' },
		{
			name: 'select',
			doc: docWith('status: todo', 'INPUT[inlineSelect(todo, done):status]'),
			selector: 'select.cm-lp-meta-bind-select',
		},
	])('mousedown on the $name does not move the editor cursor', ({ doc, selector }) => {
		const view = mount(doc);
		const head = view.state.selection.main.head;
		const el = control<HTMLElement>(view, selector);
		el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
		expect(view.state.selection.main.head).toBe(head);
		view.destroy();
	});
});
