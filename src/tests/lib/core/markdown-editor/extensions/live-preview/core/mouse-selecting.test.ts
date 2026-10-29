// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import {
	mouseSelectingField,
	mouseSelectingHandlers,
	setMouseSelecting,
} from '#lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.js';
import { checkUpdateAction } from '#lib/core/markdown-editor/extensions/live-preview/core/check-update-action.js';
import { revealPredicate } from '#lib/core/markdown-editor/extensions/live-preview/core/reveal.js';

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

	describe('native drag of selected text (no mouseup)', () => {
		/** Mounts a two-line editor and records `checkUpdateAction` for every update. */
		function mountWithActions(): { view: EditorView; actions: string[] } {
			const actions: string[] = [];
			const view = new EditorView({
				state: EditorState.create({
					doc: 'first line\nsecond line',
					extensions: [
						mouseSelectingField,
						mouseSelectingHandlers,
						EditorView.updateListener.of((u) => {
							actions.push(checkUpdateAction(u));
						}),
					],
				}),
				parent: document.body.appendChild(document.createElement('div')),
			});
			return { view, actions };
		}

		/** A browser's native text drag: mousedown, dragstart, drop, dragend; never a mouseup. */
		function nativeDrag(view: EditorView): void {
			mouse('mousedown', view.contentDOM);
			// jsdom has no DragEvent; CodeMirror's drag handlers only read dataTransfer when present.
			for (const type of ['dragstart', 'drop', 'dragend']) {
				view.contentDOM.dispatchEvent(new Event(type, { bubbles: true }));
			}
		}

		it('clears the drag flag and runs the release rebuild', () => {
			const { view, actions } = mountWithActions();

			nativeDrag(view);

			expect(view.state.field(mouseSelectingField)).toBe(false);
			// Mid-drag updates (the mousedown and CodeMirror's own) skip; the drag ends in one rebuild.
			expect(actions.filter((a) => a === 'rebuild')).toHaveLength(1);
			expect(actions.at(-1)).toBe('rebuild');
		});

		it('reveals the cursor line on a selection change after the drop', () => {
			const { view, actions } = mountWithActions();
			nativeDrag(view);
			const before = actions.length;

			const secondLine = view.state.doc.line(2);
			view.dispatch({ selection: { anchor: secondLine.from } });

			expect(actions.slice(before)).toEqual(['rebuild']);
			const reveal = revealPredicate(view.state);
			expect(reveal(secondLine.from, secondLine.to)).toBe(true);
			expect(reveal(view.state.doc.line(1).from)).toBe(false);
		});
	});
});
