import { describe, it, expect } from 'vitest';
import { EditorState } from '@codemirror/state';
import type { ViewUpdate } from '@codemirror/view';
import {
	checkUpdateAction,
	isPureScroll,
} from '#lib/core/markdown-editor/extensions/live-preview/core/check-update-action.js';
import {
	mouseSelectingField,
	setMouseSelecting,
} from '#lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.js';
import { forceDecorationRebuild } from '#lib/core/markdown-editor/extensions/live-preview/core/effects.js';

function createState(doc = 'hello world'): EditorState {
	return EditorState.create({ doc, extensions: [mouseSelectingField] });
}

/** Creates a minimal ViewUpdate-like object for testing without DOM */
function mockUpdate(
	startState: EditorState,
	overrides: {
		docChanged?: boolean;
		viewportChanged?: boolean;
		selectionSet?: boolean;
		transactions?: { reconfigured: boolean; effects: { is: (type: unknown) => boolean }[] }[];
		state?: EditorState;
	},
): ViewUpdate {
	const state = overrides.state ?? startState;
	return {
		state,
		startState,
		docChanged: overrides.docChanged ?? false,
		viewportChanged: overrides.viewportChanged ?? false,
		selectionSet: overrides.selectionSet ?? false,
		transactions: overrides.transactions ?? [],
	} as unknown as ViewUpdate;
}

describe('checkUpdateAction', () => {
	it('returns "rebuild" when document changes', () => {
		const state = createState();
		const update = mockUpdate(state, { docChanged: true });
		expect(checkUpdateAction(update)).toBe('rebuild');
	});

	it('returns "none" when only viewport changes (deferred to scroll debounce)', () => {
		const state = createState();
		const update = mockUpdate(state, { viewportChanged: true });
		expect(checkUpdateAction(update)).toBe('none');
	});

	it('returns "rebuild" when viewport changes WITH doc change', () => {
		const state = createState();
		const update = mockUpdate(state, { viewportChanged: true, docChanged: true });
		expect(checkUpdateAction(update)).toBe('rebuild');
	});

	it('returns "rebuild" when the selection changes in the same update as the viewport', () => {
		// ArrowUp/Down at the viewport edge scrolls and moves the cursor at once.
		const state = createState('line one\nline two');
		const moved = state.update({ selection: { anchor: 9 } }).state;
		const update = mockUpdate(state, { state: moved, viewportChanged: true, selectionSet: true });
		expect(checkUpdateAction(update, 1)).toBe('rebuild');
	});

	it('returns "rebuild" when reconfigured in the same update as a viewport change', () => {
		const state = createState();
		const update = mockUpdate(state, {
			viewportChanged: true,
			transactions: [{ reconfigured: true, effects: [] }],
		});
		expect(checkUpdateAction(update)).toBe('rebuild');
	});

	it('returns "rebuild" for forceDecorationRebuild in the same update as a viewport change', () => {
		const state = createState();
		const update = mockUpdate(state, {
			viewportChanged: true,
			transactions: [
				{
					reconfigured: false,
					effects: [{ is: (type: unknown) => type === forceDecorationRebuild }],
				},
			],
		});
		expect(checkUpdateAction(update)).toBe('rebuild');
	});

	it('returns "none" for a viewport change whose selection stays on the same line', () => {
		const state = createState();
		const update = mockUpdate(state, { viewportChanged: true, selectionSet: true });
		expect(checkUpdateAction(update, 1)).toBe('none');
	});

	it('returns "rebuild" when selection changes', () => {
		const state = createState();
		const update = mockUpdate(state, { selectionSet: true });
		expect(checkUpdateAction(update)).toBe('rebuild');
	});

	it('returns "rebuild" when reconfigured', () => {
		const state = createState();
		const update = mockUpdate(state, {
			transactions: [{ reconfigured: true, effects: [] }],
		});
		expect(checkUpdateAction(update)).toBe('rebuild');
	});

	it('returns "rebuild" when forceDecorationRebuild effect is dispatched', () => {
		const state = createState();
		const update = mockUpdate(state, {
			transactions: [
				{
					reconfigured: false,
					effects: [{ is: (type: unknown) => type === forceDecorationRebuild }],
				},
			],
		});
		expect(checkUpdateAction(update)).toBe('rebuild');
	});

	it('returns "none" when nothing relevant changes', () => {
		const state = createState();
		const update = mockUpdate(state, {});
		expect(checkUpdateAction(update)).toBe('none');
	});

	it('returns "skip" during mouse-drag selection', () => {
		const state = createState();
		// Start dragging
		const draggingState = state.update({ effects: setMouseSelecting.of(true) }).state;
		const update = mockUpdate(draggingState, {
			state: draggingState,
			selectionSet: true,
		});
		expect(checkUpdateAction(update)).toBe('skip');
	});

	it('returns "rebuild" when mouse-drag ends', () => {
		const state = createState();
		// Start dragging
		const draggingState = state.update({ effects: setMouseSelecting.of(true) }).state;
		// End dragging
		const endedState = draggingState.update({ effects: setMouseSelecting.of(false) }).state;
		const update = mockUpdate(draggingState, {
			state: endedState,
		});
		expect(checkUpdateAction(update)).toBe('rebuild');
	});

	it('returns "skip" for forceDecorationRebuild during mouse-drag', () => {
		const state = createState();
		const draggingState = state.update({ effects: setMouseSelecting.of(true) }).state;
		const update = mockUpdate(draggingState, {
			state: draggingState,
			transactions: [
				{
					reconfigured: false,
					effects: [{ is: (type: unknown) => type === forceDecorationRebuild }],
				},
			],
		});
		// The release rebuilds; a forced rebuild mid-drag would collapse a
		// revealed block under the pointer.
		expect(checkUpdateAction(update)).toBe('skip');
	});

	it('returns "rebuild" for doc change during mouse-drag (doc changes always rebuild)', () => {
		const state = createState();
		const draggingState = state.update({ effects: setMouseSelecting.of(true) }).state;
		const update = mockUpdate(draggingState, {
			state: draggingState,
			docChanged: true,
		});
		// docChanged takes priority over drag suppression
		expect(checkUpdateAction(update)).toBe('rebuild');
	});
});

describe('isPureScroll', () => {
	const forceEffect = { is: (type: unknown) => type === forceDecorationRebuild };
	const otherEffect = { is: () => false };

	it('is true for a viewport change with nothing else', () => {
		const state = createState();
		expect(isPureScroll(mockUpdate(state, { viewportChanged: true }))).toBe(true);
	});

	it('is true for a viewport change carrying an unrelated effect', () => {
		const state = createState();
		const update = mockUpdate(state, {
			viewportChanged: true,
			transactions: [{ reconfigured: false, effects: [otherEffect] }],
		});
		expect(isPureScroll(update)).toBe(true);
	});

	it('is false without a viewport change', () => {
		const state = createState();
		expect(isPureScroll(mockUpdate(state, {}))).toBe(false);
	});

	it('is false when the viewport change comes with a doc change or a selection move', () => {
		const state = createState();
		expect(isPureScroll(mockUpdate(state, { viewportChanged: true, docChanged: true }))).toBe(false);
		expect(isPureScroll(mockUpdate(state, { viewportChanged: true, selectionSet: true }))).toBe(false);
	});

	it('is false when the viewport change carries forceDecorationRebuild', () => {
		const state = createState();
		const update = mockUpdate(state, {
			viewportChanged: true,
			transactions: [{ reconfigured: false, effects: [forceEffect] }],
		});
		expect(isPureScroll(update)).toBe(false);
	});

	it('is false when the viewport change carries a reconfigure', () => {
		const state = createState();
		const update = mockUpdate(state, {
			viewportChanged: true,
			transactions: [{ reconfigured: true, effects: [] }],
		});
		expect(isPureScroll(update)).toBe(false);
	});
});
