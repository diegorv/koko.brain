// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { Annotation, EditorSelection, EditorState, Transaction, type Extension } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { syntaxHighlighting } from '@codemirror/language';
import {
	cursorCharLeft,
	cursorDocStart,
	deleteCharBackward,
	deleteCharForward,
	deleteGroupBackward,
	deleteLineBoundaryBackward,
	history,
	insertNewlineAndIndent,
	moveLineDown,
	moveLineUp,
	selectAll,
	selectDocStart,
	transposeChars,
	undo,
	undoSelection,
} from '@codemirror/commands';

// No mocks for stores or logic files: the real live-preview extensions and the
// real @codemirror/commands run. `history()` and `allowMultipleSelections` are
// installed because production has both (setup/editor-extensions.ts).

import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { dispatchMetaBindUpdate } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { markdownLanguage, markdownHighlight } from '#lib/core/markdown-editor/highlight-styles.js';
import { createMarkdownState } from '../../../test-helpers';

const FRONTMATTER = '---\nstatus: todo\n---\n';
const DOC = `${FRONTMATTER}First body line.\n\nEnd line.`;
/** Start of the first line after the closing fence. */
const B = FRONTMATTER.length;
const FIRST = 4;
const END = 6;

const views: EditorView[] = [];

afterEach(() => {
	for (const view of views.splice(0)) view.destroy();
	document.body.replaceChildren();
});

interface MountOptions {
	disabled?: Record<string, boolean>;
	/** Extensions registered before the live-preview ones (their transaction filters run after the guard). */
	before?: Extension[];
	/** Extensions registered after the live-preview ones (their transaction filters run before the guard). */
	after?: Extension[];
}

function mount(doc: string, cursorLine: number, options: MountOptions = {}): EditorView {
	const base = createMarkdownState(doc, {
		extensions: [
			options.before ?? [],
			history(),
			EditorState.allowMultipleSelections.of(true),
			markdownLanguage(),
			syntaxHighlighting(markdownHighlight),
			livePreviewExtensions(options.disabled ?? {}),
			options.after ?? [],
		],
	});
	const state = base.update({ selection: EditorSelection.cursor(base.doc.line(cursorLine).from) }).state;
	const view = new EditorView({ state, parent: document.body.appendChild(document.createElement('div')) });
	views.push(view);
	return view;
}

/** Sets the selection with no userEvent, as a programmatic caret placement does. */
function place(view: EditorView, anchor: number, head = anchor): void {
	view.dispatch({ selection: EditorSelection.range(anchor, head) });
}

/** Types `text` over the selection, as a keystroke does. */
function type(view: EditorView, text: string): void {
	view.dispatch({ ...view.state.replaceSelection(text), userEvent: 'input.type' });
}

function doc(view: EditorView): string {
	return view.state.doc.toString();
}

function head(view: EditorView): number {
	return view.state.selection.main.head;
}

function ranges(view: EditorView): [number, number][] {
	return view.state.selection.ranges.map((r) => [r.anchor, r.head]);
}

describe('frontmatterGuard: deletions at the body start', () => {
	it.each([
		['deleteCharBackward', deleteCharBackward],
		['deleteGroupBackward', deleteGroupBackward],
		['deleteLineBoundaryBackward', deleteLineBoundaryBackward],
	])('%s at the body start leaves the doc and keeps the caret there for the next keystroke', (_name, command) => {
		const view = mount(DOC, FIRST);
		command(view);

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[B, B]]);
		type(view, 'x');
		expect(doc(view)).toBe(`${FRONTMATTER}xFirst body line.\n\nEnd line.`);
		expect(ranges(view)).toEqual([[B + 1, B + 1]]);
	});

	it('held Backspace past the start of the first body line stops at the body start', () => {
		const view = mount(`${FRONTMATTER}ab`, FIRST);
		place(view, B + 2);
		for (let i = 0; i < 5; i++) {
			deleteCharBackward(view);
			expect(head(view)).toBeGreaterThanOrEqual(B);
		}

		expect(doc(view)).toBe(FRONTMATTER);
		type(view, 'x');
		expect(doc(view)).toBe(`${FRONTMATTER}x`);
		expect(ranges(view)).toEqual([[B + 1, B + 1]]);
	});

	it('Backspace on a blank first body line still deletes that line', () => {
		const view = mount(`${FRONTMATTER}\nText`, FIRST);
		deleteCharBackward(view);

		expect(doc(view)).toBe(`${FRONTMATTER}Text`);
		expect(ranges(view)).toEqual([[B, B]]);
	});

	it('a deleteLine on the first body line keeps CodeMirror result and puts the caret in the body', () => {
		const view = mount(DOC, FIRST);
		// deleteLine needs layout for its new selection (moveVertically throws in
		// jsdom), so its changes are dispatched with its userEvent: `from > 0`
		// makes it delete the line break before the line.
		view.dispatch({ changes: { from: B - 1, to: B + 16 }, userEvent: 'delete.line' });

		expect(doc(view)).toBe(`${FRONTMATTER}\nEnd line.`);
		expect(head(view)).toBeGreaterThanOrEqual(B);
		expect(view.state.selection.ranges).toHaveLength(1);
	});

	it('a selection that straddles the body start deletes only its body part', () => {
		const view = mount(DOC, END);
		place(view, B - 3, B + 5);
		deleteCharBackward(view);

		expect(doc(view)).toBe(`${FRONTMATTER} body line.\n\nEnd line.`);
		expect(ranges(view)).toEqual([[B, B]]);
	});

	it('Delete at a caret left at 0 does nothing and moves the caret to the body start', () => {
		const view = mount(DOC, END);
		place(view, 0);
		deleteCharForward(view);

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[B, B]]);
	});
});

describe('frontmatterGuard: moves across the body start', () => {
	it.each([
		['at the body start', B],
		['mid first body line', B + 5],
	])('moveLineUp %s leaves the doc and the caret', (_name, pos) => {
		const view = mount(DOC, END);
		place(view, pos);
		moveLineUp(view);

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[pos, pos]]);
	});

	it('moveLineDown on the first body line still moves it (guard)', () => {
		const view = mount(DOC, FIRST);
		moveLineDown(view);

		expect(doc(view)).toBe(`${FRONTMATTER}\nFirst body line.\nEnd line.`);
		expect(ranges(view)).toEqual([[B + 1, B + 1]]);
	});

	it('moveLineUp on the last line still moves it (guard)', () => {
		const view = mount(DOC, END);
		moveLineUp(view);

		expect(doc(view)).toBe(`${FRONTMATTER}First body line.\nEnd line.\n`);
		expect(ranges(view)).toEqual([[B + 17, B + 17]]);
	});

	it('transposeChars at the body start leaves the doc and the caret', () => {
		const view = mount(DOC, FIRST);
		transposeChars(view);

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[B, B]]);
	});

	it('a move.drop that inserts into the frontmatter is dropped whole', () => {
		const view = mount(DOC, FIRST);
		view.dispatch({ changes: [{ from: B + 2, to: B + 4 }, { from: 0, insert: 'rs' }], userEvent: 'move.drop' });

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[B, B]]);
	});
});

describe('frontmatterGuard: selection clamp', () => {
	it('cursorDocStart from mid-body puts the caret at the body start', () => {
		const view = mount(DOC, END);
		cursorDocStart(view);

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[B, B]]);
	});

	it('cursorDocStart then Enter adds a line at the top of the body', () => {
		const view = mount(DOC, END);
		cursorDocStart(view);
		insertNewlineAndIndent(view);

		expect(doc(view)).toBe(`${FRONTMATTER}\nFirst body line.\n\nEnd line.`);
		expect(ranges(view)).toEqual([[B + 1, B + 1]]);
	});

	it('cursorDocStart then Delete deletes the first body character', () => {
		const view = mount(DOC, END);
		cursorDocStart(view);
		deleteCharForward(view);

		expect(doc(view)).toBe(`${FRONTMATTER}irst body line.\n\nEnd line.`);
		expect(ranges(view)).toEqual([[B, B]]);
	});

	it('selectDocStart from mid-body selects up to the body start', () => {
		const view = mount(DOC, FIRST);
		place(view, B + 5);
		selectDocStart(view);

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[B + 5, B]]);
	});

	it('cursorCharLeft at the body start keeps the caret there', () => {
		const view = mount(DOC, FIRST);
		cursorCharLeft(view);

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[B, B]]);
	});

	it('selectAll selects the body only, and Backspace then leaves exactly the frontmatter', () => {
		const view = mount(DOC, END);
		selectAll(view);

		expect(ranges(view)).toEqual([[B, DOC.length]]);
		deleteCharBackward(view);
		expect(doc(view)).toBe(FRONTMATTER);
		expect(ranges(view)).toEqual([[B, B]]);
	});

	it('selectAll on a frontmatter-only note gives one cursor at the body start', () => {
		const view = mount(FRONTMATTER, FIRST);
		expect(() => selectAll(view)).not.toThrow();

		expect(doc(view)).toBe(FRONTMATTER);
		expect(ranges(view)).toEqual([[B, B]]);
	});

	it('select-all-matches with a hidden range and a body main range keeps the body range as main', () => {
		const view = mount(DOC, END);
		const selection = EditorSelection.create([EditorSelection.range(4, 10), EditorSelection.range(B, B + 5)], 1);
		expect(() => view.dispatch({ selection, userEvent: 'select.search.matches' })).not.toThrow();

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[B, B + 5]]);
		expect(view.state.selection.main).toBeDefined();
	});

	it('select-all-matches whose main range is hidden falls back to a body range as main', () => {
		const view = mount(DOC, END);
		const selection = EditorSelection.create(
			[EditorSelection.range(4, 10), EditorSelection.range(B, B + 5), EditorSelection.range(B + 6, B + 10)],
			0,
		);
		expect(() => view.dispatch({ selection, userEvent: 'select.search.matches' })).not.toThrow();

		expect(doc(view)).toBe(DOC);
		expect(view.state.selection.main).toBeDefined();
		expect(ranges(view)).toEqual([
			[B, B + 5],
			[B + 6, B + 10],
		]);
		expect(view.state.selection.ranges.every((r) => r.from >= B)).toBe(true);
	});

	it('an addCursorAbove-shaped select on the first body line leaves the body cursor alone', () => {
		const view = mount(DOC, FIRST);
		// addCursorAbove needs layout (moveVertically), so its transaction is
		// dispatched as it builds it: the new cursor on the line above, added
		// last and made the main range.
		const built = [EditorSelection.cursor(B + 3), EditorSelection.cursor(B - 1)];
		const selection = EditorSelection.create(built, built.length - 1);
		expect(() => view.dispatch({ selection, scrollIntoView: true, userEvent: 'select' })).not.toThrow();

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[B + 3, B + 3]]);
	});

	it('undoSelection into the frontmatter is clamped and keeps its history annotation', () => {
		const view = mount(DOC, END);
		const endLine = view.state.doc.line(END).from;
		view.dispatch({ selection: { anchor: 2 } });
		view.dispatch({ selection: { anchor: B + 5 } });

		expect(() => undoSelection(view)).not.toThrow();
		expect(head(view)).toBeGreaterThanOrEqual(B);
		undoSelection(view);
		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[endLine, endLine]]);
	});
});

describe('frontmatterGuard: exemptions (guards)', () => {
	it('a pointer selection is kept as dispatched', () => {
		const view = mount(DOC, END);
		view.dispatch({ selection: EditorSelection.range(B + 5, 0), userEvent: 'select.pointer' });

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[B + 5, 0]]);
	});

	it('Find Next on a frontmatter match is kept as dispatched', () => {
		const view = mount(DOC, END);
		const from = DOC.indexOf('todo');
		view.dispatch({ selection: EditorSelection.range(from, from + 4), userEvent: 'select.search' });

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[from, from + 4]]);
	});

	it('a selection set without a userEvent is kept', () => {
		const view = mount(DOC, END);
		view.dispatch({ selection: { anchor: 5 } });

		expect(doc(view)).toBe(DOC);
		expect(ranges(view)).toEqual([[5, 5]]);
	});
});

describe('frontmatterGuard: typing is not filtered (guards)', () => {
	it('input.type at the body start and mid-body applies', () => {
		const view = mount(DOC, FIRST);
		type(view, 'x');
		expect(doc(view)).toBe(`${FRONTMATTER}xFirst body line.\n\nEnd line.`);
		place(view, B + 6);
		type(view, 'y');

		expect(doc(view)).toBe(`${FRONTMATTER}xFirsty body line.\n\nEnd line.`);
		expect(ranges(view)).toEqual([[B + 7, B + 7]]);
	});

	it('a dead-key composition at the body start applies and one undo restores the doc', () => {
		const view = mount(DOC, FIRST);
		view.dispatch({
			changes: { from: B, insert: '´' },
			selection: EditorSelection.cursor(B + 1),
			userEvent: 'input.type.compose.start',
		});
		view.dispatch({
			changes: { from: B, to: B + 1, insert: 'é' },
			selection: EditorSelection.cursor(B + 1),
			userEvent: 'input.type.compose',
		});

		expect(doc(view)).toBe(`${FRONTMATTER}éFirst body line.\n\nEnd line.`);
		expect(ranges(view)).toEqual([[B + 1, B + 1]]);
		undo(view);
		expect(doc(view)).toBe(DOC);
	});

	it('replace-all changes matches in the frontmatter and in the body', () => {
		const source = `${FRONTMATTER}A todo here.`;
		const view = mount(source, FIRST);
		const fm = source.indexOf('todo');
		const body = source.lastIndexOf('todo');
		view.dispatch({
			changes: [
				{ from: fm, to: fm + 4, insert: 'done' },
				{ from: body, to: body + 4, insert: 'done' },
			],
			userEvent: 'input.replace.all',
		});

		expect(doc(view)).toBe('---\nstatus: done\n---\nA done here.');
		expect(ranges(view)).toEqual([[B, B]]);
	});
});

describe('frontmatterGuard: pass path returns the same transaction (guard)', () => {
	const custom = Annotation.define<string>();

	it.each([
		['an input.type body insert', { changes: { from: B + 5, insert: 'x' }, userEvent: 'input.type' }],
		['an input.type.compose body insert', { changes: { from: B + 5, insert: 'é' }, userEvent: 'input.type.compose' }],
		['a mid-body delete.backward', { changes: { from: B + 4, to: B + 5 }, userEvent: 'delete.backward' }],
		['a mid-body select', { selection: { anchor: B + 8 }, userEvent: 'select' }],
	])('%s reaches later filters as the same object with its annotations', (_name, spec) => {
		let stashed: Transaction | null = null;
		let probed: Transaction | null = null;
		const stash = EditorState.transactionFilter.of((tr) => {
			stashed = tr;
			return tr;
		});
		const probe = EditorState.transactionFilter.of((tr) => {
			probed = tr;
			return tr;
		});
		const view = mount(DOC, END, { before: [probe], after: [stash] });
		view.dispatch({ ...spec, annotations: custom.of('tag') });

		expect(stashed).not.toBeNull();
		expect(probed).toBe(stashed);
		expect(probed!.annotation(custom)).toBe('tag');
	});
});

describe('frontmatterGuard: programmatic writes (guards)', () => {
	it('a meta-bind write replaces the frontmatter and undo restores it', () => {
		const view = mount(DOC, END);
		expect(dispatchMetaBindUpdate(view, 'status', 'done')).toBe(true);

		expect(doc(view)).toBe('---\nstatus: done\n---\nFirst body line.\n\nEnd line.');
		undo(view);
		expect(doc(view)).toBe(DOC);
	});

	it('a Properties write replaces the frontmatter and keeps the caret on the same body text', () => {
		const view = mount(DOC, END);
		view.dispatch({
			changes: { from: 0, to: B, insert: '---\nstatus: in-progress\n---\n' },
			annotations: Transaction.addToHistory.of(false),
		});

		expect(doc(view)).toBe('---\nstatus: in-progress\n---\nFirst body line.\n\nEnd line.');
		expect(view.state.doc.sliceString(head(view), head(view) + 9)).toBe('End line.');
	});

	it('Enter and typing mid-body work as before', () => {
		const view = mount(DOC, FIRST);
		place(view, B + 5);
		insertNewlineAndIndent(view);
		type(view, 'x');

		// insertNewlineAndIndent drops the space after the caret.
		expect(doc(view)).toBe(`${FRONTMATTER}First\nxbody line.\n\nEnd line.`);
		expect(ranges(view)).toEqual([[B + 7, B + 7]]);
	});
});

describe('frontmatterGuard: kill switch (guard)', () => {
	it('with the frontmatter decorator disabled, Backspace at the body start merges into the fence as today', () => {
		const view = mount(DOC, FIRST, { disabled: { frontmatter: true } });
		deleteCharBackward(view);

		expect(doc(view)).toBe('---\nstatus: todo\n---First body line.\n\nEnd line.');
		expect(ranges(view)).toEqual([[B - 1, B - 1]]);
	});
});
