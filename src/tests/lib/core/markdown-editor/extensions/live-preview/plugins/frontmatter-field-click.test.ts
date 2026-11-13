// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { syntaxHighlighting } from '@codemirror/language';
import { insertNewlineAndIndent } from '@codemirror/commands';

// No mocks for stores or logic files: the real live-preview extensions run.
// Only the view's coordinate lookups are stubbed, because jsdom has no layout:
// in Chromium a press in the top padding of `.cm-content` maps to position 0.

import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { frontmatterEnd } from '#lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.js';
import { markdownLanguage, markdownHighlight } from '#lib/core/markdown-editor/highlight-styles.js';
import { createMarkdownState } from '../../../test-helpers';

const FRONTMATTER = '---\nstatus: todo\n---\n';
const DOC = `${FRONTMATTER}First body line.\n\nEnd line.`;
const BODY_START = FRONTMATTER.length;
const END = 6;

const views: EditorView[] = [];

afterEach(() => {
	for (const view of views.splice(0)) view.destroy();
	document.body.replaceChildren();
});

function mount(doc: string, cursorLine: number, disabled: Record<string, boolean> = {}): EditorView {
	const base = createMarkdownState(doc, {
		extensions: [markdownLanguage(), syntaxHighlighting(markdownHighlight), livePreviewExtensions(disabled)],
	});
	const state = base.update({ selection: EditorSelection.cursor(base.doc.line(cursorLine).from) }).state;
	const view = new EditorView({ state, parent: document.body.appendChild(document.createElement('div')) });
	views.push(view);
	return view;
}

/** Makes every coordinate lookup on `view` answer `pos`. */
function stubCoords(view: EditorView, pos: number): void {
	view.posAtCoords = () => pos;
	view.posAndSideAtCoords = () => ({ pos, assoc: 1 });
}

function mouseEvent(type: string, init: MouseEventInit = {}): MouseEvent {
	return new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 10, clientY: 5, detail: 1, ...init });
}

/** A full primary click on the content element, released on the document as a real one is. */
function clickContent(view: EditorView, init: MouseEventInit = {}): void {
	view.contentDOM.dispatchEvent(mouseEvent('mousedown', init));
	view.contentDOM.ownerDocument.dispatchEvent(mouseEvent('mouseup', init));
}

describe('frontmatterEnd', () => {
	it('is the end of the closing fence line', () => {
		const view = mount(DOC, END);
		expect(frontmatterEnd(view.state)).toBe(BODY_START - 1);
	});

	it('is null without frontmatter', () => {
		const view = mount('First line.\n\nEnd line.', 3);
		expect(frontmatterEnd(view.state)).toBeNull();
	});

	it('is null when the frontmatter decorator is disabled', () => {
		const view = mount(DOC, END, { frontmatter: true });
		expect(frontmatterEnd(view.state)).toBeNull();
	});
});

describe('frontmatter press remap', () => {
	it('a press that maps into the hidden frontmatter puts the cursor at the start of the first body line', () => {
		const view = mount(DOC, END);
		stubCoords(view, 0);
		clickContent(view);

		expect(view.state.selection.main.empty).toBe(true);
		expect(view.state.selection.main.head).toBe(BODY_START);
	});

	it('a padding click followed by Enter leaves the frontmatter bytes unchanged', () => {
		const view = mount(DOC, END);
		stubCoords(view, 0);
		clickContent(view);
		insertNewlineAndIndent(view);

		expect(view.state.doc.toString().startsWith(FRONTMATTER)).toBe(true);
		expect(view.state.doc.toString()).toBe(`${FRONTMATTER}\nFirst body line.\n\nEnd line.`);
	});

	it('a press inside the closing fence line is remapped too', () => {
		const view = mount(DOC, END);
		stubCoords(view, BODY_START - 1);
		clickContent(view);

		expect(view.state.selection.main.head).toBe(BODY_START);
	});

	it('shift-click into the frontmatter extends the selection to the first body line only', () => {
		const view = mount(DOC, END);
		const endFrom = view.state.doc.line(END).from;
		stubCoords(view, 0);
		clickContent(view, { shiftKey: true });

		expect(view.state.selection.main.anchor).toBe(endFrom);
		expect(view.state.selection.main.head).toBe(BODY_START);
	});

	it('a drag from the padding that moves back into the frontmatter clamps the head to the first body line', () => {
		const view = mount(DOC, END);
		const doc = view.contentDOM.ownerDocument;
		stubCoords(view, 0);
		view.contentDOM.dispatchEvent(mouseEvent('mousedown'));
		stubCoords(view, BODY_START + 5);
		doc.dispatchEvent(mouseEvent('mousemove', { buttons: 1, clientX: 60, clientY: 40 }));
		expect(view.state.selection.main.anchor).toBe(BODY_START);
		expect(view.state.selection.main.head).toBe(BODY_START + 5);

		stubCoords(view, 0);
		doc.dispatchEvent(mouseEvent('mousemove', { buttons: 1, clientX: 60, clientY: 2 }));
		doc.dispatchEvent(mouseEvent('mouseup', { clientX: 60, clientY: 2 }));

		expect(view.state.selection.main.anchor).toBe(BODY_START);
		expect(view.state.selection.main.head).toBe(BODY_START);
	});

	it.each([
		['code block', '```js\nconst a = 1;\n```', '```js'],
		['table', '| a | b |\n| --- | --- |\n| 1 | 2 |', '| a | b |'],
		['math block', '$$\nx^2\n$$', '$$'],
	])('a padding click keeps the selection when a %s comes right after the frontmatter', (_name, block, source) => {
		const view = mount(`${FRONTMATTER}${block}\n\nEnd line.`, 3 + block.split('\n').length + 2);
		const before = view.state.selection.main.head;
		stubCoords(view, 0);
		clickContent(view);

		expect(view.state.selection.main.head).toBe(before);
		expect(view.contentDOM.textContent).not.toContain(source);
	});

	it('a press in the body keeps the default behavior', () => {
		const view = mount(DOC, END);
		stubCoords(view, BODY_START + 3);
		clickContent(view);

		expect(view.state.selection.main.head).toBe(BODY_START + 3);
	});

	it('a frontmatter with no body line after it keeps the default behavior', () => {
		const view = mount('---\nstatus: todo\n---', 1);
		stubCoords(view, 0);
		clickContent(view);

		expect(view.state.selection.main.head).toBe(0);
	});
});
