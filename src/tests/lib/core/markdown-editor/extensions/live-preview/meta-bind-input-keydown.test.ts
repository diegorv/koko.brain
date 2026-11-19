// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { keymap, type EditorView } from '@codemirror/view';
import { defaultKeymap, historyKeymap, history, indentWithTab } from '@codemirror/commands';
import { metaBindInputPlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.js';
import { pasteHtmlLinkHandler } from '#lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.js';
import { pasteTsvHandler } from '#lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.js';
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

/**
 * jsdom has no `DataTransfer`, so the clipboard is a stub that answers
 * `getData` from a type-to-text map.
 */
function clipboardEvent(type: 'paste' | 'cut' | 'copy', data: Record<string, string> = {}) {
	const ev = new Event(type, { bubbles: true, cancelable: true });
	const store = { ...data };
	Object.defineProperty(ev, 'clipboardData', {
		value: {
			getData: (format: string) => store[format] ?? '',
			setData: (format: string, text: string) => {
				store[format] = text;
			},
			clearData: () => {
				for (const k of Object.keys(store)) delete store[k];
			},
			types: Object.keys(store),
		},
	});
	return ev;
}

describe('clipboard events in a meta-bind number input', () => {
	const doc = docWith('n: 1', 'INPUT[number():n]');

	for (const type of ['paste', 'cut', 'copy'] as const) {
		it(`${type} with the cursor on another line leaves the note unchanged`, () => {
			const view = mount(doc);
			const input = control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-input');
			// CodeMirror's cut/copy act only while its recorded DOM selection is
			// inside contentDOM, as it is in the app with the input focused.
			// view.focus() records one there; jsdom's input.focus() would clear
			// it, so the event is dispatched on the unfocused input instead.
			view.focus();
			const ev = clipboardEvent(type, { 'text/plain': '42' });
			input.dispatchEvent(ev);
			expect(view.state.doc.toString()).toBe(doc);
			expect(ev.defaultPrevented, 'the input keeps its own clipboard event').toBe(false);
			view.destroy();
		});
	}

	it('drop with the cursor on another line leaves the note unchanged', () => {
		const view = mount(doc);
		const input = control<HTMLInputElement>(view, 'input.cm-lp-meta-bind-input');
		// jsdom has no layout, so posAtCoords cannot map the drop point; point
		// it at the line the cursor is on, where CodeMirror would insert.
		const dropPos = view.state.selection.main.head;
		view.posAtCoords = (() => dropPos) as typeof view.posAtCoords;
		const ev = new Event('drop', { bubbles: true, cancelable: true });
		Object.defineProperty(ev, 'dataTransfer', {
			value: {
				getData: (format: string) => (format === 'Text' || format === 'text/plain' ? '42' : ''),
				files: [],
				types: ['text/plain'],
			},
		});
		input.dispatchEvent(ev);
		expect(view.state.doc.toString()).toBe(doc);
		expect(ev.defaultPrevented, 'the input keeps its own drop event').toBe(false);
		view.destroy();
	});
});

describe('paste into the editor body', () => {
	const doc = docWith('n: 1', 'INPUT[number():n]');
	const cursor = doc.indexOf(LINE) + LINE.length;

	function pasteIntoBody(data: Record<string, string>) {
		const view = mountMarkdownView(doc, {
			cursor,
			extensions: [testMarkdown(), metaBindInputPlugin, pasteHtmlLinkHandler, pasteTsvHandler],
		});
		const ev = clipboardEvent('paste', data);
		view.contentDOM.dispatchEvent(ev);
		const result = view.state.doc.toString();
		view.destroy();
		return { result, ev };
	}

	it('inserts plain text at the editor cursor', () => {
		const { result, ev } = pasteIntoBody({ 'text/plain': ' 42' });
		expect(result).toBe(doc.slice(0, cursor) + ' 42' + doc.slice(cursor));
		expect(ev.defaultPrevented).toBe(true);
	});

	it('converts TSV text to a markdown table', () => {
		const { result } = pasteIntoBody({ 'text/plain': 'a\tb\n1\t2' });
		expect(result.slice(0, cursor)).toBe(doc.slice(0, cursor));
		expect(result.slice(cursor)).toMatch(/^\| a +\| b +\|\n\| -+ \| -+ \|\n\| 1 +\| 2 +\|/);
	});

	it('converts an HTML link to a markdown link', () => {
		const { result } = pasteIntoBody({
			'text/html': '<a href="https://example.com">Example</a>',
			'text/plain': 'Example',
		});
		expect(result).toBe(doc.slice(0, cursor) + '[Example](https://example.com)' + doc.slice(cursor));
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
