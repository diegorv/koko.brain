// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { EditorSelection, EditorState, type Extension } from '@codemirror/state';
import { EditorView, type ViewPlugin, type DecorationSet } from '@codemirror/view';
import { cursorCharLeft, cursorCharRight } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { ensureSyntaxTree } from '@codemirror/language';
import { GFM } from '@lezer/markdown';

// No mocks for stores or logic files — real implementations per CLAUDE.md.

import {
	mouseSelectingField,
	setMouseSelecting,
} from '#lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.js';
import {
	calloutFoldState,
	forceDecorationRebuild,
} from '#lib/core/markdown-editor/extensions/live-preview/core/effects.js';
import { tableField } from '#lib/core/markdown-editor/extensions/live-preview/plugins/table-field.js';
import { codeBlockField } from '#lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.js';
import { calloutField } from '#lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.js';
import { wikilinkEmbedPlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.js';
import { imagePlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.js';
import { footnotePlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.js';
import { metaBindInputPlugin } from '#lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.js';

type DecoratorPlugin = ViewPlugin<{ decorations: DecorationSet }>;

/**
 * Mounts `plugin` in a real EditorView with the cursor at the start of the
 * document, so movement goes through CodeMirror's own keyboard commands.
 * The tests walk with ArrowRight/ArrowLeft: ArrowUp/ArrowDown measure line
 * geometry, which jsdom does not provide (`Range.getClientRects` is missing).
 */
function mount(doc: string, plugin: DecoratorPlugin, extra: Extension[] = []): EditorView {
	const state = EditorState.create({
		doc,
		selection: EditorSelection.cursor(0),
		extensions: [markdown({ extensions: GFM }), mouseSelectingField, ...extra, plugin],
	});
	ensureSyntaxTree(state, state.doc.length, 5000);
	const view = new EditorView({
		state,
		parent: document.body.appendChild(document.createElement('div')),
	});
	// Re-snapshot the finished parse so the first rebuild sees the whole tree.
	view.dispatch({});
	return view;
}

/**
 * Number of widget decorations (rendered previews) the plugin holds, or of
 * any decoration when `anyDecoration` is set (a plugin that styles with marks
 * and hides syntax with a widgetless replace, like footnotes).
 */
function widgetCount(view: EditorView, plugin: DecoratorPlugin, anyDecoration = false): number {
	const value = view.plugin(plugin);
	if (!value) throw new Error('plugin not found on the view');
	let count = 0;
	const iter = value.decorations.iter();
	while (iter.value) {
		if (anyDecoration || (iter.value.spec as { widget?: unknown }).widget) count++;
		iter.next();
	}
	return count;
}

/** Line number of the main cursor. */
function cursorLine(view: EditorView): number {
	return view.state.doc.lineAt(view.state.selection.main.head).number;
}

/**
 * Runs the arrow-key `command` until the cursor reaches `line`, recording after each
 * press whether the plugin rendered its preview.
 */
function walk(
	view: EditorView,
	plugin: DecoratorPlugin,
	command: typeof cursorCharRight,
	line: number,
	anyDecoration = false,
): { line: number; rendered: boolean }[] {
	const steps: { line: number; rendered: boolean }[] = [];
	for (let i = 0; i < 200 && cursorLine(view) !== line; i++) {
		command(view);
		steps.push({ line: cursorLine(view), rendered: widgetCount(view, plugin, anyDecoration) > 0 });
	}
	expect(cursorLine(view)).toBe(line);
	return steps;
}

describe('keyboard reveal: entering and leaving a block with the arrow keys', () => {
	beforeAll(() => {
		// jsdom has no layout. CodeMirror measures the cursor after every
		// keyboard move (scrollIntoView), so give Range the empty geometry an
		// unrendered element would report.
		Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
		Range.prototype.getBoundingClientRect ??= () => new DOMRect();
	});

	afterEach(() => {
		document.body.replaceChildren();
	});

	const cases: {
		name: string;
		doc: string;
		plugin: DecoratorPlugin;
		extra?: Extension[];
		block: [number, number];
		anyDecoration?: boolean;
	}[] = [
		{
			name: 'table',
			doc: 'before\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\nafter',
			plugin: tableField,
			block: [2, 4],
		},
		{
			name: 'fenced code block',
			doc: 'before\n```js\nconst x = 1;\n```\nafter',
			plugin: codeBlockField,
			block: [2, 4],
		},
		{
			name: 'callout',
			doc: 'before\n> [!note] Title\n> body\n\nafter',
			plugin: calloutField,
			extra: [calloutFoldState],
			block: [2, 3],
		},
		{
			// Entering at column 0 must reveal an embed later on the line.
			name: 'note embed in the middle of a line',
			doc: 'before\nsee ![[some-note]] here\nafter',
			plugin: wikilinkEmbedPlugin,
			block: [2, 2],
		},
		{
			name: 'image',
			doc: 'before\nsee ![alt](image.png) here\nafter',
			plugin: imagePlugin,
			block: [2, 2],
		},
		{
			name: 'meta-bind input',
			doc: 'before\nrate `INPUT[inlineSelect(option(1, one), option(2, two)):rating]` here\nafter',
			plugin: metaBindInputPlugin,
			block: [2, 2],
		},
		{
			name: 'footnote reference',
			doc: 'before\ntext[^1] more\nafter',
			plugin: footnotePlugin,
			block: [2, 2],
			anyDecoration: true,
		},
	];

	for (const { name, doc, plugin, extra, block, anyDecoration } of cases) {
		it(`${name}: ArrowRight reveals it on entry and renders it again on exit`, () => {
			const view = mount(doc, plugin, extra);
			const last = view.state.doc.lines;
			expect(widgetCount(view, plugin, anyDecoration)).toBeGreaterThan(0);

			const steps = walk(view, plugin, cursorCharRight, last, anyDecoration);

			for (const step of steps) {
				const inside = step.line >= block[0] && step.line <= block[1];
				expect({ line: step.line, rendered: step.rendered }).toEqual({
					line: step.line,
					rendered: !inside,
				});
			}
			expect(steps.some((s) => s.line >= block[0] && s.line <= block[1])).toBe(true);
		});

		it(`${name}: ArrowLeft reveals it on entry and renders it again on exit`, () => {
			const view = mount(doc, plugin, extra);
			view.dispatch({ selection: EditorSelection.cursor(view.state.doc.length) });
			expect(widgetCount(view, plugin, anyDecoration)).toBeGreaterThan(0);

			const steps = walk(view, plugin, cursorCharLeft, 1, anyDecoration);

			for (const step of steps) {
				const inside = step.line >= block[0] && step.line <= block[1];
				expect({ line: step.line, rendered: step.rendered }).toEqual({
					line: step.line,
					rendered: !inside,
				});
			}
			expect(steps.some((s) => s.line >= block[0] && s.line <= block[1])).toBe(true);
		});
	}
});

describe('mouse drag: a revealed block stays revealed', () => {
	afterEach(() => {
		document.body.replaceChildren();
	});

	it('a forced rebuild during a drag keeps the block revealed until release', () => {
		const view = mount('before\n```js\nconst x = 1;\n```\nafter', codeBlockField);
		const inside = view.state.doc.line(3).from;
		view.dispatch({ selection: EditorSelection.cursor(inside) });
		expect(widgetCount(view, codeBlockField)).toBe(0);

		view.dispatch({ effects: setMouseSelecting.of(true) });
		view.dispatch({ selection: EditorSelection.range(inside, inside + 5) });
		// scrollDebouncePlugin dispatches this after drag-autoscroll stops.
		view.dispatch({ effects: forceDecorationRebuild.of(null) });
		expect(widgetCount(view, codeBlockField)).toBe(0);

		view.dispatch({ effects: setMouseSelecting.of(false) });
		expect(widgetCount(view, codeBlockField)).toBe(0);
	});
});
