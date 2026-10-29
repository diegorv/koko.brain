// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
	mouseSelectingField,
	mouseSelectingHandlers,
	setMouseSelecting,
} from '#lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.js';

function createState(): EditorState {
	return EditorState.create({ doc: 'test', extensions: [mouseSelectingField] });
}

describe('mouseSelectingField', () => {
	it('starts as false', () => {
		const state = createState();
		expect(state.field(mouseSelectingField)).toBe(false);
	});

	it('becomes true after setMouseSelecting(true)', () => {
		const state = createState();
		const tr = state.update({ effects: setMouseSelecting.of(true) });
		expect(tr.state.field(mouseSelectingField)).toBe(true);
	});

	it('becomes false after setMouseSelecting(false)', () => {
		const state = createState();
		const tr1 = state.update({ effects: setMouseSelecting.of(true) });
		const tr2 = tr1.state.update({ effects: setMouseSelecting.of(false) });
		expect(tr2.state.field(mouseSelectingField)).toBe(false);
	});

	it('keeps value when unrelated transaction occurs', () => {
		const state = createState();
		const tr1 = state.update({ effects: setMouseSelecting.of(true) });
		// Dispatch an unrelated transaction (doc change)
		const tr2 = tr1.state.update({ changes: { from: 0, to: 0, insert: 'x' } });
		expect(tr2.state.field(mouseSelectingField)).toBe(true);
	});
});

describe('mouseSelectingHandlers', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	function mount(): { view: EditorView; outside: HTMLElement; transactions: () => number } {
		let count = 0;
		const view = new EditorView({
			state: EditorState.create({
				doc: 'test',
				extensions: [
					mouseSelectingField,
					mouseSelectingHandlers,
					EditorView.updateListener.of((u) => {
						count += u.transactions.length;
					}),
				],
			}),
			parent: document.body.appendChild(document.createElement('div')),
		});
		const outside = document.body.appendChild(document.createElement('div'));
		return { view, outside, transactions: () => count };
	}

	function mouse(type: string, target: Element): void {
		target.dispatchEvent(new MouseEvent(type, { bubbles: true, button: 0 }));
	}

	it('sets the drag flag on mousedown and clears it on mouseup in the content', () => {
		const { view } = mount();

		mouse('mousedown', view.contentDOM);
		expect(view.state.field(mouseSelectingField)).toBe(true);

		mouse('mouseup', view.contentDOM);
		expect(view.state.field(mouseSelectingField)).toBe(false);
	});

	it('clears the drag flag when the mouse is released outside the editor', () => {
		const { view, outside } = mount();

		mouse('mousedown', view.contentDOM);
		mouse('mouseup', outside);

		expect(view.state.field(mouseSelectingField)).toBe(false);
	});

	it('dispatches one release per drag, and none for a mouseup without a drag', () => {
		const { view, outside, transactions } = mount();

		mouse('mousedown', view.contentDOM);
		const afterDown = transactions();
		mouse('mouseup', view.contentDOM);
		expect(transactions()).toBe(afterDown + 1);

		// The one-shot document listener is gone; a later stray mouseup is a no-op.
		mouse('mouseup', outside);
		expect(transactions()).toBe(afterDown + 1);
	});
});
