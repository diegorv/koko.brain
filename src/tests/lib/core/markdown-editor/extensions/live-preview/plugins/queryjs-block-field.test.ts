// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { markdown } from '@codemirror/lang-markdown';
import { LanguageDescription, forceParsing } from '@codemirror/language';

// No mocks for stores or logic files — real implementations per CLAUDE.md.

import { queryjsBlockField, computeQueryjsBlocks } from '#lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.js';
import { forceDecorationRebuild } from '#lib/core/markdown-editor/extensions/live-preview/core/effects.js';
import {
	mouseSelectingField,
	setMouseSelecting,
} from '#lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.js';
import {
	QueryjsBlockWidget,
	queryjsBlockRenderer,
} from '#lib/plugins/queryjs/queryjs-block-widget.js';
import {
	fencedBlockRenderers,
	type FencedBlockRenderer,
} from '#lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.js';
import { collectionStore } from '#lib/features/collection/collection.store.svelte.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import {
	FakeBlockWidget,
	createMarkdownState,
	fakeBlockRenderer,
	mountMarkdownView,
	testMarkdown,
	withFullParse,
} from '../../../test-helpers';

const DOC = 'text\n```queryjs\nkb.view("scripts/demo")\n```';

/**
 * Mounts the field in a real view. The markdown language carries an `md`
 * code language, as the app's does, so a ````md fence parses its content as
 * markdown (a mounted nested tree) like it would in production.
 */
function createView(doc: string, renderers: FencedBlockRenderer[] = [queryjsBlockRenderer]): EditorView {
	const md = LanguageDescription.of({ name: 'Markdown', alias: ['md'], support: markdown() });
	return mountMarkdownView(doc, {
		cursor: 0, // on "text" — outside the block
		extensions: [
			markdown({ codeLanguages: [md] }),
			mouseSelectingField,
			...renderers.map((r) => fencedBlockRenderers.of(r)),
			queryjsBlockField,
		],
	});
}

/** Every widget the plugin currently holds, whatever renderer built it. */
function allWidgets(view: EditorView): unknown[] {
	const plugin = view.plugin(queryjsBlockField);
	if (!plugin) throw new Error('queryjsBlockField plugin not found on the view');
	const widgets: unknown[] = [];
	const iter = plugin.decorations.iter();
	while (iter.value) {
		const widget = (iter.value.spec as { widget?: unknown }).widget;
		if (widget) widgets.push(widget);
		iter.next();
	}
	return widgets;
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

describe('queryjsBlockField — renderer lookup', () => {
	const TWO_BLOCKS = 'text\n```queryjs\na()\n```\nmiddle\n```queryjs\nb()\n```';

	beforeEach(() => {
		document.body.replaceChildren();
	});

	it('produces no decoration when no renderer is registered', () => {
		const view = createView(TWO_BLOCKS, []);
		expect(view.plugin(queryjsBlockField)?.decorations.size).toBe(0);
		expect(view.dom.querySelector('.cm-lp-qjs-block')).toBeNull();
	});

	it('ignores a renderer registered for another language', () => {
		const view = createView(TWO_BLOCKS, [fakeBlockRenderer('collection')]);
		expect(view.plugin(queryjsBlockField)?.decorations.size).toBe(0);
	});

	it('builds one widget per fenced block with the registered renderer', () => {
		const view = createView(TWO_BLOCKS, [fakeBlockRenderer('queryjs')]);
		const widgets = allWidgets(view);
		expect(widgets.every((w) => w instanceof FakeBlockWidget)).toBe(true);
		expect((widgets as FakeBlockWidget[]).map((w) => w.source)).toEqual(['a()', 'b()']);
	});
});

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

	it('rebuilds on the drag release after a forced rebuild was skipped mid-drag', () => {
		const view = createView(DOC); // widgets snapshot isIndexReady=false

		view.dispatch({ effects: setMouseSelecting.of(true) });
		collectionStore.setPropertyIndex(new Map()); // index becomes ready mid-drag
		view.dispatch({ effects: forceDecorationRebuild.of(null) });
		expect(snapshotOf(pluginWidgets(view)[0])).toBe(false); // skipped while dragging

		// The release is effect-only: no doc change, no selection change.
		view.dispatch({ effects: setMouseSelecting.of(false) });

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

		withFullParse(() =>
			view.dispatch({
				changes: { from: view.state.doc.length, insert: '\n```queryjs\nkb.view("x")\n```' },
			}),
		);

		expect(pluginWidgets(view)).toHaveLength(1);
	});

	it('renders a block past the initial parse once the full tree arrives', () => {
		// EditorState.create parses only the first 3000 chars (Work.InitViewport);
		// the block past them is missing from the tree the view mounts on.
		const filler = Array.from({ length: 150 }, (_, i) => `filler paragraph line ${i}`).join('\n\n');
		const doc = `${filler}\n\n\`\`\`queryjs\nlate()\n\`\`\``;
		const state = EditorState.create({
			doc,
			extensions: [
				testMarkdown(),
				mouseSelectingField,
				fencedBlockRenderers.of(fakeBlockRenderer('queryjs')),
				queryjsBlockField,
			],
		});
		const view = new EditorView({ state, parent: document.body.appendChild(document.createElement('div')) });
		expect(allWidgets(view)).toHaveLength(0);

		// Like the parse worker's transaction, this one changes only the tree.
		expect(forceParsing(view, doc.length, 5000)).toBe(true);

		expect((allWidgets(view) as FakeBlockWidget[]).map((w) => w.source)).toEqual(['late()']);
		view.destroy();
	});
});

describe('queryjsBlockField — fenced code awareness', () => {
	beforeEach(() => {
		collectionStore.reset();
		editorStore.reset();
		document.body.replaceChildren();
	});

	it('neither renders nor runs a queryjs fence nested in a ````md fence', () => {
		const view = createView('text\n````md\n```queryjs\nkb.view("scripts/demo")\n```\n````');
		expect(pluginWidgets(view)).toHaveLength(0);
		// The widget's toDOM is what executes the script; no widget DOM means no run.
		expect(view.dom.querySelector('.cm-lp-qjs-block')).toBeNull();
	});

	it('still renders a top-level queryjs fence next to a ````md fence', () => {
		const view = createView('text\n````md\n```queryjs\nnested()\n```\n````\n```queryjs\ntop()\n```');
		expect(pluginWidgets(view).map((w) => w.jsContent)).toEqual(['top()']);
	});
});

describe('computeQueryjsBlocks', () => {
	it('shows source (no decorations) when the cursor is inside the block', () => {
		const extensions = [testMarkdown(), fencedBlockRenderers.of(queryjsBlockRenderer)];
		// Outside the block the same state renders, so the empty set below is the reveal.
		expect(computeQueryjsBlocks(createMarkdownState(DOC, { extensions, cursor: 0 })).size).toBeGreaterThan(0);
		const state = createMarkdownState(DOC, { extensions, cursor: DOC.indexOf('kb.view') });
		const decos = computeQueryjsBlocks(state);
		let count = 0;
		const iter = decos.iter();
		while (iter.value) { count++; iter.next(); }
		expect(count).toBe(0);
	});
});
