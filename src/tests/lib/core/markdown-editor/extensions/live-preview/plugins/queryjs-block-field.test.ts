// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState, EditorSelection } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

// No mocks for stores or logic files — real implementations per CLAUDE.md.

import { queryjsBlockField, computeQueryjsBlocks } from '$lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field';
import { forceDecorationRebuild } from '$lib/core/markdown-editor/extensions/live-preview/core/effects';
import { QueryjsBlockWidget } from '$lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';

const DOC = 'text\n```queryjs\nkb.view("scripts/demo")\n```';

function createView(doc: string): EditorView {
	const state = EditorState.create({
		doc,
		selection: EditorSelection.cursor(0), // cursor on "text" — outside the block
		extensions: [queryjsBlockField],
	});
	const root = document.body.appendChild(document.createElement('div'));
	return new EditorView({ state, parent: root });
}

/** Returns the QueryjsBlockWidget instances currently held by the plugin. */
function pluginWidgets(view: EditorView): QueryjsBlockWidget[] {
	const plugin = view.plugin(queryjsBlockField);
	if (!plugin) throw new Error('queryjsBlockField plugin not found on the view');
	const widgets: QueryjsBlockWidget[] = [];
	const iter = plugin.decorations.iter();
	while (iter.value) {
		const widget = (iter.value.spec as { widget?: unknown }).widget;
		if (widget instanceof QueryjsBlockWidget) widgets.push(widget);
		iter.next();
	}
	return widgets;
}

/** Reads the private construction snapshot for assertions. */
function snapshotOf(widget: QueryjsBlockWidget): boolean {
	return (widget as unknown as { isIndexReady: boolean }).isIndexReady;
}

describe('queryjsBlockField — update() gating', () => {
	beforeEach(() => {
		collectionStore.reset();
		editorStore.reset();
		document.body.replaceChildren();
	});

	it('decorates a queryjs block when the cursor is outside', () => {
		const view = createView(DOC);
		expect(pluginWidgets(view)).toHaveLength(1);
	});

	it('rebuilds decorations on forceDecorationRebuild after the index becomes ready', () => {
		const view = createView(DOC); // widgets snapshot isIndexReady=false
		expect(snapshotOf(pluginWidgets(view)[0])).toBe(false);

		collectionStore.setPropertyIndex(new Map()); // index becomes ready
		view.dispatch({ effects: forceDecorationRebuild.of(null) });

		// The rebuild creates fresh widgets whose snapshot reflects the flip;
		// eq() then differs from the old widget, so CodeMirror redraws the DOM.
		// This is the recovery path out of "Building index..." (audit HIGH 4).
		expect(snapshotOf(pluginWidgets(view)[0])).toBe(true);
	});

	it('keeps existing decorations on updates with no doc/selection/effect change', () => {
		const view = createView(DOC);
		const before = pluginWidgets(view)[0];

		view.dispatch({}); // empty transaction — nothing relevant changed

		expect(pluginWidgets(view)[0]).toBe(before);
	});

	it('rebuilds on document changes', () => {
		const view = createView('plain text');
		expect(pluginWidgets(view)).toHaveLength(0);

		view.dispatch({
			changes: { from: view.state.doc.length, insert: '\n```queryjs\nkb.view("x")\n```' },
		});

		expect(pluginWidgets(view)).toHaveLength(1);
	});
});

describe('computeQueryjsBlocks', () => {
	it('shows source (no decorations) when the cursor is inside the block', () => {
		const state = EditorState.create({
			doc: DOC,
			selection: EditorSelection.cursor(DOC.indexOf('kb.view')),
		});
		const decos = computeQueryjsBlocks(state);
		let count = 0;
		const iter = decos.iter();
		while (iter.value) { count++; iter.next(); }
		expect(count).toBe(0);
	});
});
