// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { Decoration, type DecorationSet, EditorView, type ViewUpdate } from '@codemirror/view';
import { EditorSelection, EditorState } from '@codemirror/state';

// No mocks for stores or logic files — real implementations per CLAUDE.md.

import {
	blockDecorator,
	type BlockDecoratorSpec,
} from '$lib/core/markdown-editor/extensions/live-preview/core/block-decorator';
import {
	forceDecorationRebuild,
	toggleCalloutFold,
} from '$lib/core/markdown-editor/extensions/live-preview/core/effects';
import {
	mouseSelectingField,
	setMouseSelecting,
} from '$lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting';

const DOC = 'line one\nline two\nline three';

/** Mounts a decorator built from `spec` and returns it plus its scan counter. */
function mount(spec: Omit<BlockDecoratorSpec, 'settingsKey' | 'profileLabel' | 'compute'>) {
	const counter = { scans: 0 };
	const plugin = blockDecorator({
		settingsKey: 'testDecorator',
		profileLabel: 'test-decorator',
		compute: (state): DecorationSet => {
			counter.scans++;
			return Decoration.set([Decoration.mark({ class: 'x' }).range(0, state.doc.line(1).to)]);
		},
		...spec,
	});
	const view = new EditorView({
		state: EditorState.create({
			doc: DOC,
			selection: EditorSelection.cursor(0),
			extensions: [mouseSelectingField, plugin],
		}),
		parent: document.body.appendChild(document.createElement('div')),
	});
	const value = view.plugin(plugin);
	if (!value) throw new Error('block decorator plugin not found on the view');
	return { view, value, counter };
}

/**
 * A viewport-only ViewUpdate. CodeMirror never produces one in jsdom (every
 * element measures 0px, so the viewport always spans the whole document), so
 * the guard is driven with the same minimal stand-in `check-update-action.test`
 * uses. It carries a `rebuildOn` effect to make the assertion discriminating:
 * without the guard the `forced` branch would rebuild.
 */
function viewportOnlyUpdate(view: EditorView): ViewUpdate {
	return {
		view,
		state: view.state,
		startState: view.state,
		docChanged: false,
		selectionSet: false,
		viewportChanged: true,
		transactions: [{ reconfigured: false, effects: [toggleCalloutFold.of(1)] }],
	} as unknown as ViewUpdate;
}

describe('blockDecorator', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it('scans the document once on construction', () => {
		const { counter, value } = mount({});
		expect(counter.scans).toBe(1);
		expect(value.decorations.size).toBe(1);
		expect(value.lastCursorLine).toBe(1);
	});

	// Gate 1 — perf rule 4: viewport-only scroll never rebuilds.
	it('skips viewport-only updates, even when a rebuildOn effect rides along', () => {
		const { view, value, counter } = mount({ rebuildOn: [toggleCalloutFold] });

		value.update?.(viewportOnlyUpdate(view));

		expect(counter.scans).toBe(1);
	});

	// Gate 2 — perf rule 5: checkUpdateAction reads lastCursorLine.
	it('rebuilds when the cursor changes line but not when it moves within one', () => {
		const { view, counter, value } = mount({});

		view.dispatch({ selection: EditorSelection.cursor(4) }); // still line 1
		expect(counter.scans).toBe(1);
		expect(value.lastCursorLine).toBe(1);

		view.dispatch({ selection: EditorSelection.cursor(DOC.indexOf('line two')) }); // line 2
		expect(counter.scans).toBe(2);
		expect(value.lastCursorLine).toBe(2);
	});

	// Gate 3 — rebuildOn: effect-only transactions are 'none' to checkUpdateAction.
	it('rebuilds on a declared rebuildOn effect and ignores it otherwise', () => {
		const withEffect = mount({ rebuildOn: [toggleCalloutFold] });
		const without = mount({});

		withEffect.view.dispatch({ effects: toggleCalloutFold.of(1) });
		without.view.dispatch({ effects: toggleCalloutFold.of(1) });

		expect(withEffect.counter.scans).toBe(2);
		expect(without.counter.scans).toBe(1);
	});

	// Gate 4 — the narrower queryjs gate: doc/selection/forceDecorationRebuild only.
	it('applies a narrower gate before checkUpdateAction', () => {
		const queryjsGate: BlockDecoratorSpec['gate'] = (update) =>
			update.docChanged ||
			update.selectionSet ||
			update.transactions.some((t) => t.effects.some((e) => e.is(forceDecorationRebuild)));
		const gated = mount({ gate: queryjsGate });
		const ungated = mount({});

		// Drag end is a checkUpdateAction 'rebuild' that the narrow gate drops.
		for (const target of [gated.view, ungated.view]) {
			target.dispatch({ effects: setMouseSelecting.of(true) });
			target.dispatch({ effects: setMouseSelecting.of(false) });
		}
		expect(gated.counter.scans).toBe(1);
		expect(ungated.counter.scans).toBe(2);

		// forceDecorationRebuild passes the gate.
		gated.view.dispatch({ effects: forceDecorationRebuild.of(null) });
		expect(gated.counter.scans).toBe(2);
	});
});
