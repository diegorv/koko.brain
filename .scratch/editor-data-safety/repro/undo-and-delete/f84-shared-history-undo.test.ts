/**
 * AUDIT REPRO F84: one MarkdownEditor EditorView (and so one `history()`
 * field) is reused for every markdown tab. The tab switch and the external
 * content sync replace the whole doc with `Transaction.addToHistory.of(false)`
 * (MarkdownEditor.svelte:229-234 and :329-333), which only MAPS the previous
 * note's undo events through the replacement instead of dropping them.
 *
 * These tests assert the CORRECT behavior (undo never writes the previous
 * note's text into the current note) and fail today.
 */
import { describe, it, expect } from 'vitest';
import { EditorSelection, EditorState, Transaction, type TransactionSpec } from '@codemirror/state';
import { history, undo, redo, undoDepth } from '@codemirror/commands';

/** Exact dispatch spec of the tab-switch effect (MarkdownEditor.svelte:229-234). */
function tabSwitch(view: FakeView, content: string) {
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: content },
		selection: EditorSelection.cursor(0),
		annotations: Transaction.addToHistory.of(false),
		effects: [],
	});
}

/** Exact dispatch spec of the external-sync effect (MarkdownEditor.svelte:329-333). */
function externalSync(view: FakeView, content: string) {
	const cursorPos = Math.min(view.state.selection.main.head, content.length);
	view.dispatch({
		changes: { from: 0, to: view.state.doc.length, insert: content },
		selection: EditorSelection.cursor(cursorPos),
		annotations: Transaction.addToHistory.of(false),
	});
}

/** A user deletion, the way CodeMirror's deleteCharBackward / cut annotate it. */
function userDelete(view: FakeView, from: number, to: number) {
	view.dispatch({ changes: { from, to }, userEvent: 'delete' });
}

/**
 * Minimal stand-in for the EditorView: CodeMirror's history commands only need
 * `{ state, dispatch }`. `dispatch` runs the same gate as the update listener in
 * editor-extensions.ts:170 (`docChanged && !isTabSwitching && !isExternalEdit`);
 * both flags are true only for the duration of the two addToHistory(false)
 * dispatches, so a transaction without that annotation passes the gate.
 */
interface FakeView {
	state: EditorState;
	dispatch: (spec: TransactionSpec | Transaction) => void;
}

function makeView(initial: string) {
	const persisted: string[] = [];
	const view: FakeView = {
		state: EditorState.create({ doc: initial, extensions: [history()] }),
		dispatch(spec) {
			const tr = spec instanceof Transaction ? spec : view.state.update(spec);
			view.state = tr.state;
			const suppressed = tr.annotation(Transaction.addToHistory) === false;
			if (tr.docChanged && !suppressed) persisted.push(tr.state.doc.toString());
		},
	};
	return { view, persisted };
}

describe('AUDIT F84: shared CodeMirror history across markdown tab switches', () => {
	it('Cmd+Z in note B must not insert text deleted from note A', () => {
		const { view, persisted } = makeView('Note A has text');
		userDelete(view, 7, 10); // "Note A  text"
		tabSwitch(view, 'Note B body');

		undo(view);

		expect(view.state.doc.toString()).toBe('Note B body');
		// The undo would reach onContentChange -> tabs[activeIndex] (note B) -> autosave.
		expect(persisted).toEqual([]);
	});

	it('after a tab switch, the previous note has no undo depth left', () => {
		const { view } = makeView('Note A has text');
		userDelete(view, 7, 10);
		tabSwitch(view, 'Note B body');
		expect(undoDepth(view.state)).toBe(0);
	});

	it('round trip A -> B -> A, then Cmd+Z, must not append the deleted text at the end of A', () => {
		const { view } = makeView('Note A has text');
		userDelete(view, 7, 10);
		tabSwitch(view, 'Note B body');
		tabSwitch(view, 'Note A  text'); // A's tab content (the edit lives in the store)

		undo(view);

		// Correct outcomes: either A unchanged, or the deletion undone in place.
		expect(['Note A  text', 'Note A has text']).toContain(view.state.doc.toString());
	});

	it('Cmd+Shift+Z in note B must not redo text undone in note A', () => {
		const { view } = makeView('Note A');
		view.dispatch({ changes: { from: 6, insert: ' secret' }, userEvent: 'input.type' });
		undo(view); // back to "Note A", " secret" now on the redo stack
		tabSwitch(view, 'Note B body');

		redo(view);

		expect(view.state.doc.toString()).toBe('Note B body');
	});

	it('external sync in the same note: Cmd+Z must not append the deleted text after the synced doc', () => {
		const { view } = makeView('abc foo def');
		userDelete(view, 4, 8); // "abc def"
		externalSync(view, 'abc def\n- [x] task');

		undo(view);

		expect(view.state.doc.toString()).not.toBe('abc def\n- [x] taskfoo ');
		expect(['abc def\n- [x] task', 'abc foo def\n- [x] task']).toContain(view.state.doc.toString());
	});
});
