// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { Decoration, EditorView, WidgetType } from '@codemirror/view';
import { syntaxHighlighting } from '@codemirror/language';

// No mocks for stores or logic files: the real live-preview extensions run.
// Only the widget's box is stubbed, because jsdom has no layout.

import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import {
	bandClickTarget,
	bandDragHead,
	blockBandClick,
} from '#lib/core/markdown-editor/extensions/live-preview/core/block-band-click.js';
import { markdownLanguage, markdownHighlight } from '#lib/core/markdown-editor/highlight-styles.js';
import { createMarkdownState } from '../../../test-helpers';

const CODE = '.cm-lp-codeblock';
/** Stubbed widget box: 100px to 150px from the viewport top. */
const BOX_TOP = 100;
const BOX_BOTTOM = 150;

const views: EditorView[] = [];

afterEach(() => {
	for (const view of views.splice(0)) view.destroy();
	document.body.replaceChildren();
});

function mount(doc: string, cursorLine: number, extensions: Extension[] = []): EditorView {
	const base = createMarkdownState(doc, {
		extensions: [markdownLanguage(), syntaxHighlighting(markdownHighlight), livePreviewExtensions({}), ...extensions],
	});
	const state = base.update({ selection: EditorSelection.cursor(base.doc.line(cursorLine).from) }).state;
	const view = new EditorView({ state, parent: document.body.appendChild(document.createElement('div')) });
	views.push(view);
	return view;
}

/** Gives every element matching `selector` the stubbed box. */
function stubBoxes(view: EditorView, selector: string): void {
	view.contentDOM.querySelectorAll(selector).forEach((el) => {
		el.getBoundingClientRect = () => new DOMRect(0, BOX_TOP, 500, BOX_BOTTOM - BOX_TOP);
	});
}

/** The `.cm-line` holding the `index`-th element matching `selector`. */
function lineOf(view: EditorView, selector: string, index = 0): HTMLElement {
	const el = view.contentDOM.querySelectorAll(selector)[index];
	const line = el?.closest('.cm-line');
	if (!line) throw new Error(`no .cm-line holds ${selector}[${index}]`);
	return line as HTMLElement;
}

function mouseEvent(type: string, clientY: number, init: MouseEventInit = {}): MouseEvent {
	return new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, clientX: 10, clientY, detail: 1, ...init });
}

/** A full primary click at `clientY` on `target`, released on the document as a real one is. */
function click(target: Element, clientY: number, init: MouseEventInit = {}): void {
	target.dispatchEvent(mouseEvent('mousedown', clientY, init));
	target.ownerDocument.dispatchEvent(mouseEvent('mouseup', clientY, init));
}

function cursorLine(view: EditorView): number {
	return view.state.doc.lineAt(view.state.selection.main.head).number;
}

/**
 * Stubs the document position CodeMirror reads for a pointer at `clientY`:
 * jsdom has no layout, so the real lookup cannot place a press.
 */
function stubPointer(view: EditorView, posAt: (clientY: number) => number): void {
	view.posAndSideAtCoords = (({ y }: { y: number }) => ({ pos: posAt(y), assoc: -1 })) as typeof view.posAndSideAtCoords;
	view.posAtCoords = (({ y }: { y: number }) => posAt(y)) as typeof view.posAtCoords;
}

/** The `.cm-line` whose text is exactly `text`. */
function textLine(view: EditorView, text: string): HTMLElement {
	const line = Array.from(view.contentDOM.querySelectorAll('.cm-line')).find((el) => el.textContent === text);
	if (!line) throw new Error(`no .cm-line holds "${text}"`);
	return line as HTMLElement;
}

const DOC = 'Above line.\n\n```js\na\n```\n\nAfter line.\n\nEnd line.';
const END = 9;
/** A note whose last line is a code block. */
const END_BLOCK_DOC = 'End line.\n\nBefore line.\n\n```js\na\n```';
const TABLE_DOC = 'Above.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\nBelow.\n\nEnd line.';
const TABLE_WRAPPER = '.cm-lp-table-wrapper';

describe('blockBandClick', () => {
	it('a click in the band above the block puts the cursor on the line above and keeps the block rendered', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		click(lineOf(view, CODE), BOX_TOP - 10);

		expect(view.state.selection.main.head).toBe(view.state.doc.line(2).to);
		expect(view.contentDOM.querySelectorAll(CODE)).toHaveLength(1);
	});

	it('a click in the band below the block puts the cursor at the start of the line below', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		click(lineOf(view, CODE), BOX_BOTTOM + 10);

		expect(view.state.selection.main.head).toBe(view.state.doc.line(6).from);
		expect(view.contentDOM.querySelectorAll(CODE)).toHaveLength(1);
	});

	it('a press on a widget buffer image in the band counts as the band', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		const buffer = lineOf(view, CODE).querySelector('img.cm-widgetBuffer');
		if (!buffer) throw new Error('CodeMirror drew no widget buffer next to the block');
		click(buffer, BOX_BOTTOM + 10);

		expect(cursorLine(view)).toBe(6);
		expect(view.contentDOM.querySelectorAll(CODE)).toHaveLength(1);
	});

	it('skips the lines the block hides when it looks for the line below', () => {
		// The table replaces its header line and hides the other two.
		const view = mount('Above.\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\nBelow.\n\nEnd line.', 9);
		stubBoxes(view, '.cm-lp-table-wrapper');
		click(lineOf(view, '.cm-lp-table-wrapper'), BOX_BOTTOM + 10);

		expect(cursorLine(view)).toBe(6);
		expect(view.contentDOM.querySelectorAll('table.cm-lp-table')).toHaveLength(1);
	});

	it('a click in the gap between two adjacent blocks keeps the cursor and reveals neither', () => {
		const view = mount('```js\na\n```\n```py\nb\n```\n\nEnd line.', 8);
		stubBoxes(view, CODE);
		click(lineOf(view, CODE, 0), BOX_BOTTOM + 10);
		click(lineOf(view, CODE, 1), BOX_TOP - 10);

		expect(cursorLine(view)).toBe(8);
		expect(view.contentDOM.querySelectorAll(CODE)).toHaveLength(2);
	});

	it('shift-click in the band extends the selection to the line next to the block', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		click(lineOf(view, CODE), BOX_TOP - 10, { shiftKey: true });

		expect(view.state.selection.main.anchor).toBe(view.state.doc.line(END).from);
		expect(view.state.selection.main.head).toBe(view.state.doc.line(2).to);
	});

	it('a click in the band above a block on line 1 keeps the selection and the block rendered', () => {
		const view = mount('```js\na\n```\n\nEnd line.', 5);
		stubBoxes(view, CODE);
		const before = view.state.selection.main.head;
		click(lineOf(view, CODE), BOX_TOP - 10);

		expect(view.state.selection.main.head).toBe(before);
		expect(view.contentDOM.querySelectorAll(CODE)).toHaveLength(1);
	});

	it('a drag from the band above into the band below selects from the line above to the line below', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		const line = lineOf(view, CODE);
		line.dispatchEvent(mouseEvent('mousedown', BOX_TOP - 10));
		line.dispatchEvent(mouseEvent('mousemove', BOX_BOTTOM + 10, { buttons: 1 }));
		document.dispatchEvent(mouseEvent('mouseup', BOX_BOTTOM + 10));

		expect(view.state.selection.main.anchor).toBe(view.state.doc.line(2).to);
		expect(view.state.selection.main.head).toBe(view.state.doc.line(6).from);
	});

	it('a drag from the band into a text line runs the selection from the band target to the pointer', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		// jsdom has no layout, so the pointer's document position is stubbed.
		const textPos = view.state.doc.line(7).from + 3;
		view.posAtCoords = (() => textPos) as typeof view.posAtCoords;
		const text = Array.from(view.contentDOM.querySelectorAll('.cm-line')).find((el) => el.textContent === 'After line.');
		if (!text) throw new Error('no .cm-line holds "After line."');
		lineOf(view, CODE).dispatchEvent(mouseEvent('mousedown', BOX_BOTTOM + 10));
		text.dispatchEvent(mouseEvent('mousemove', BOX_BOTTOM + 40, { buttons: 1 }));
		document.dispatchEvent(mouseEvent('mouseup', BOX_BOTTOM + 40));

		expect(view.state.selection.main.anchor).toBe(view.state.doc.line(6).from);
		expect(view.state.selection.main.head).toBe(textPos);
	});

	it('a drag from the band over the content padding level with the block keeps the head on the band target', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		const line = lineOf(view, CODE);
		line.getBoundingClientRect = () => new DOMRect(0, BOX_TOP - 20, 500, BOX_BOTTOM - BOX_TOP + 40);
		line.dispatchEvent(mouseEvent('mousedown', BOX_TOP - 10));
		view.contentDOM.dispatchEvent(mouseEvent('mousemove', BOX_TOP + 10, { buttons: 1 }));
		document.dispatchEvent(mouseEvent('mouseup', BOX_TOP + 10));

		expect(view.state.selection.main.anchor).toBe(view.state.doc.line(2).to);
		expect(view.state.selection.main.head).toBe(view.state.doc.line(2).to);
	});

	it('maps the drag anchor through a document change made mid-drag', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		lineOf(view, CODE).dispatchEvent(mouseEvent('mousedown', BOX_TOP - 10));
		view.dispatch({ changes: { from: 0, insert: 'XYZ ' } });
		stubBoxes(view, CODE);
		lineOf(view, CODE).dispatchEvent(mouseEvent('mousemove', BOX_BOTTOM + 10, { buttons: 1 }));
		document.dispatchEvent(mouseEvent('mouseup', BOX_BOTTOM + 10));

		expect(view.state.selection.main.anchor).toBe(view.state.doc.line(2).to);
		expect(view.state.selection.main.head).toBe(view.state.doc.line(6).from);
	});

	it('a click in the content padding level with a block keeps the cursor and the block rendered', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		lineOf(view, CODE).getBoundingClientRect = () => new DOMRect(0, BOX_TOP, 500, BOX_BOTTOM - BOX_TOP);
		const before = view.state.selection.main.head;
		click(view.contentDOM, BOX_TOP + 10);

		expect(view.state.selection.main.head).toBe(before);
		expect(view.contentDOM.querySelectorAll(CODE)).toHaveLength(1);
	});

	it('a click on the line padding left of a table keeps the cursor and the table rendered', () => {
		const view = mount(TABLE_DOC, 9);
		stubBoxes(view, TABLE_WRAPPER);
		// jsdom has no layout: CodeMirror's default would map the press into the table's line.
		const tableLine = view.state.doc.line(3).from;
		view.posAndSideAtCoords = (() => ({ pos: tableLine, assoc: 1 })) as typeof view.posAndSideAtCoords;
		const before = view.state.selection.main.head;
		click(lineOf(view, TABLE_WRAPPER), BOX_TOP + 25);

		expect(view.state.selection.main.head).toBe(before);
		expect(view.contentDOM.querySelectorAll('table.cm-lp-table')).toHaveLength(1);
	});

	it('a click on the table wrapper padding keeps the cursor and the table rendered', () => {
		const view = mount(TABLE_DOC, 9);
		stubBoxes(view, TABLE_WRAPPER);
		const before = view.state.selection.main.head;
		click(view.contentDOM.querySelector(TABLE_WRAPPER)!, BOX_BOTTOM - 10);

		expect(view.state.selection.main.head).toBe(before);
		expect(view.contentDOM.querySelectorAll('table.cm-lp-table')).toHaveLength(1);
	});

	it('a press in the empty space under a document that ends with a block keeps the cursor and the block rendered', () => {
		const view = mount(END_BLOCK_DOC, 1);
		// jsdom has no layout: CodeMirror's default maps a press under every line to the doc end, inside the block.
		stubPointer(view, () => view.state.doc.length);
		const before = view.state.selection.main.head;
		click(view.contentDOM, 5000);

		expect(view.state.selection.main.head).toBe(before);
		expect(view.contentDOM.querySelectorAll(CODE)).toHaveLength(1);
	});

	it('a press in the empty space under a document that ends with text puts the cursor at the document end', () => {
		const view = mount(DOC, 1);
		stubPointer(view, () => view.state.doc.length);
		click(view.contentDOM, 5000);

		expect(view.state.selection.main.head).toBe(view.state.doc.length);
	});

	it('a drag from the end of a text line up into the band below a block stops at the start of the line after the block', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		const afterEnd = view.state.doc.line(7).to;
		// CodeMirror's default maps the band below the block to the block's end, inside its replaced range.
		const blockEnd = view.state.doc.line(5).to;
		stubPointer(view, (y) => (y > BOX_BOTTOM && y < BOX_BOTTOM + 30 ? blockEnd : afterEnd));
		textLine(view, 'After line.').dispatchEvent(mouseEvent('mousedown', BOX_BOTTOM + 40));
		lineOf(view, CODE).dispatchEvent(mouseEvent('mousemove', BOX_BOTTOM + 10, { buttons: 1 }));
		document.dispatchEvent(mouseEvent('mouseup', BOX_BOTTOM + 10));

		expect(view.state.selection.main.anchor).toBe(afterEnd);
		expect(view.state.selection.main.head).toBe(view.state.doc.line(6).from);
		expect(view.contentDOM.querySelectorAll(CODE)).toHaveLength(1);
	});

	it('a drag from a text line down into the band above a block stops at the start of the block line', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		const aboveStart = view.state.doc.line(1).from;
		const blockStart = view.state.doc.line(3).from;
		stubPointer(view, (y) => (y < 50 ? aboveStart : blockStart));
		textLine(view, 'Above line.').dispatchEvent(mouseEvent('mousedown', 10));
		lineOf(view, CODE).dispatchEvent(mouseEvent('mousemove', BOX_TOP - 10, { buttons: 1 }));
		document.dispatchEvent(mouseEvent('mouseup', BOX_TOP - 10));

		expect(view.state.selection.main.anchor).toBe(aboveStart);
		expect(view.state.selection.main.head).toBe(blockStart);
		expect(view.contentDOM.querySelectorAll(CODE)).toHaveLength(1);
	});

	it('a drag from a text line into the padding level with a block keeps the head where the drag last put it', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		const afterEnd = view.state.doc.line(7).to;
		const blockEnd = view.state.doc.line(5).to;
		stubPointer(view, (y) => (y < BOX_BOTTOM ? blockEnd : afterEnd - 3));
		const text = textLine(view, 'After line.');
		text.dispatchEvent(mouseEvent('mousedown', BOX_BOTTOM + 60));
		text.dispatchEvent(mouseEvent('mousemove', BOX_BOTTOM + 40, { buttons: 1 }));
		lineOf(view, CODE).dispatchEvent(mouseEvent('mousemove', BOX_TOP + 10, { buttons: 1 }));
		document.dispatchEvent(mouseEvent('mouseup', BOX_TOP + 10));

		expect(view.state.selection.main.anchor).toBe(afterEnd - 3);
		expect(view.state.selection.main.head).toBe(afterEnd - 3);
		expect(view.contentDOM.querySelectorAll(CODE)).toHaveLength(1);
	});

	it('a drag between two text lines selects from the press to the pointer', () => {
		const view = mount(DOC, END);
		const aboveStart = view.state.doc.line(1).from + 2;
		const afterPos = view.state.doc.line(7).from + 4;
		stubPointer(view, (y) => (y < 50 ? aboveStart : afterPos));
		textLine(view, 'Above line.').dispatchEvent(mouseEvent('mousedown', 10));
		textLine(view, 'After line.').dispatchEvent(mouseEvent('mousemove', 300, { buttons: 1 }));
		document.dispatchEvent(mouseEvent('mouseup', 300));

		expect(view.state.selection.main.anchor).toBe(aboveStart);
		expect(view.state.selection.main.head).toBe(afterPos);
	});

	it('a plain click on a text line puts the cursor there, and shift-click extends to it', () => {
		const view = mount(DOC, END);
		const pos = view.state.doc.line(7).from + 4;
		stubPointer(view, () => pos);
		click(textLine(view, 'After line.'), 300);
		expect(view.state.selection.main.empty).toBe(true);
		expect(view.state.selection.main.head).toBe(pos);

		const end = view.state.doc.line(END).to;
		stubPointer(view, () => end);
		click(textLine(view, 'End line.'), 400, { shiftKey: true });
		expect(view.state.selection.main.anchor).toBe(pos);
		expect(view.state.selection.main.head).toBe(end);
	});

	it('a mod-click adds a cursor, and a mod-click on an existing cursor removes it', () => {
		const view = mount(DOC, END, [EditorState.allowMultipleSelections.of(true)]);
		const pos = view.state.doc.line(7).from + 4;
		stubPointer(view, () => pos);
		const mod = { metaKey: true, ctrlKey: true };
		click(textLine(view, 'After line.'), 300, mod);
		expect(view.state.selection.ranges.map((r) => r.head)).toEqual([pos, view.state.doc.line(END).from]);

		click(textLine(view, 'After line.'), 300, mod);
		expect(view.state.selection.ranges.map((r) => r.head)).toEqual([view.state.doc.line(END).from]);
	});

	it('is installed by livePreviewExtensions', () => {
		const exts = livePreviewExtensions({});
		expect(exts).toContain(blockBandClick);
		expect(exts).toContain(bandDragHead);
	});
});

describe('bandClickTarget', () => {
	it('returns null for a press on the widget itself', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		const widget = view.contentDOM.querySelector(CODE)!;
		expect(bandClickTarget(view, { target: widget, button: 0, clientY: BOX_TOP - 10 })).toBeNull();
	});

	it('keeps the selection for a press on the line level with the widget box (its padding beside the widget)', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		expect(bandClickTarget(view, { target: lineOf(view, CODE), button: 0, clientY: BOX_TOP + 10 })).toEqual({
			pos: null,
		});
	});

	it('returns null for a button other than the primary one', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		expect(bandClickTarget(view, { target: lineOf(view, CODE), button: 2, clientY: BOX_TOP - 10 })).toBeNull();
	});

	it('returns null for a plain text line', () => {
		const view = mount(DOC, END);
		const line = view.contentDOM.querySelector('.cm-line')!;
		expect(bandClickTarget(view, { target: line, button: 0, clientY: 0 })).toBeNull();
	});

	it('returns null for a line that holds text next to the block widget', () => {
		class BlockDiv extends WidgetType {
			toDOM() {
				const div = document.createElement('div');
				div.className = 'test-block';
				return div;
			}
		}
		const doc = 'text BLOCK more';
		const deco = EditorView.decorations.of(
			Decoration.set([Decoration.replace({ widget: new BlockDiv() }).range(5, 10)]),
		);
		const view = new EditorView({
			doc,
			extensions: [deco, blockBandClick],
			parent: document.body.appendChild(document.createElement('div')),
		});
		views.push(view);
		stubBoxes(view, '.test-block');
		expect(bandClickTarget(view, { target: lineOf(view, '.test-block'), button: 0, clientY: BOX_TOP - 10 })).toBeNull();
	});

	it('returns null for a press in the content padding level with a text line', () => {
		const view = mount(DOC, END);
		const text = Array.from(view.contentDOM.querySelectorAll('.cm-line')).find((el) => el.textContent === 'After line.');
		if (!text) throw new Error('no .cm-line holds "After line."');
		text.getBoundingClientRect = () => new DOMRect(0, BOX_TOP, 500, BOX_BOTTOM - BOX_TOP);
		expect(bandClickTarget(view, { target: view.contentDOM, button: 0, clientY: BOX_TOP + 10 })).toBeNull();
	});

	it('returns null for a press in the content padding level with no line', () => {
		const view = mount(DOC, END);
		expect(bandClickTarget(view, { target: view.contentDOM, button: 0, clientY: 5000 })).toBeNull();
	});

	it('keeps the selection for a press under every line when the last line is a block', () => {
		const view = mount(END_BLOCK_DOC, 1);
		expect(bandClickTarget(view, { target: view.contentDOM, button: 0, clientY: 5000 })).toEqual({ pos: null });
	});

	it('returns null for a press under every line above the last one', () => {
		const view = mount(END_BLOCK_DOC, 1);
		const last = lineOf(view, CODE);
		last.getBoundingClientRect = () => new DOMRect(0, 4000, 500, 2000);
		expect(bandClickTarget(view, { target: view.contentDOM, button: 0, clientY: 3000 })).toBeNull();
	});

	it('returns null for a press on a table cell', () => {
		const view = mount(TABLE_DOC, 9);
		stubBoxes(view, TABLE_WRAPPER);
		const cell = view.contentDOM.querySelector('table.cm-lp-table td')!;
		expect(bandClickTarget(view, { target: cell, button: 0, clientY: BOX_TOP + 10 })).toBeNull();
	});

	it('names the neighbouring position for a band press', () => {
		const view = mount(DOC, END);
		stubBoxes(view, CODE);
		expect(bandClickTarget(view, { target: lineOf(view, CODE), button: 0, clientY: BOX_BOTTOM + 10 })).toEqual({
			pos: view.state.doc.line(6).from,
		});
	});
});
