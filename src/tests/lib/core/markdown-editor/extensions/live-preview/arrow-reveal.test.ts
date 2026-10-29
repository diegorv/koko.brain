// @vitest-environment jsdom
import { describe, it, expect, afterEach, beforeAll } from 'vitest';
import { EditorSelection, type EditorState } from '@codemirror/state';
import { type DecorationSet, EditorView, type ViewPlugin, type ViewUpdate } from '@codemirror/view';
import { cursorLineDown, cursorLineUp } from '@codemirror/commands';
import { syntaxHighlighting } from '@codemirror/language';

// No mocks for stores or logic files — real implementations per CLAUDE.md.

import { livePreviewExtensions } from '#lib/core/markdown-editor/extensions/live-preview/live-preview.js';
import { makeInlineFormattingPlugin } from '#lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.js';
import { productionHandlers } from '#lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.js';
import { hiddenSyntaxDeco } from '#lib/core/markdown-editor/extensions/live-preview/styles.js';
import { UnorderedListMarkerWidget } from '#lib/core/markdown-editor/extensions/live-preview/widgets.js';
import { markdownLanguage, markdownHighlight } from '#lib/core/markdown-editor/highlight-styles.js';
import { createMarkdownState } from '../../test-helpers';

/**
 * Regression for the reported glitch: arrowing between a bullet line and an
 * H1 line must reveal exactly the line the cursor lands on and hide the one
 * it left, whether or not the move also scrolls the viewport.
 */
const DOC = '- bullet item\n# Heading';
const BULLET = 1;
const HEADING = 2;

/** Which lines show their block syntax (`- ` / `# `) as source in the DOM. */
function revealedLinesInDom(view: EditorView): number[] {
	const out: number[] = [];
	view.contentDOM.querySelectorAll('.cm-line').forEach((el, i) => {
		const text = el.textContent ?? '';
		if (text.startsWith('- ') || text.startsWith('# ')) out.push(i + 1);
	});
	return out;
}

function cursorLine(view: EditorView): number {
	return view.state.doc.lineAt(view.state.selection.main.head).number;
}

describe('arrow keys between a bullet line and an H1 line', () => {
	beforeAll(() => {
		// jsdom has no layout; CodeMirror measures the cursor after every
		// keyboard move, so give Range the geometry an unrendered element reports.
		Range.prototype.getClientRects ??= () => [] as unknown as DOMRectList;
		Range.prototype.getBoundingClientRect ??= () => new DOMRect();
	});

	afterEach(() => {
		document.body.replaceChildren();
	});

	it('reveals exactly the new line on every ArrowDown / ArrowUp (no scroll)', () => {
		const state = createMarkdownState(DOC, {
			cursor: 0,
			extensions: [markdownLanguage(), syntaxHighlighting(markdownHighlight), livePreviewExtensions()],
		});
		const view = new EditorView({ state, parent: document.body.appendChild(document.createElement('div')) });
		expect(revealedLinesInDom(view)).toEqual([BULLET]);

		for (let round = 0; round < 3; round++) {
			cursorLineDown(view);
			expect(cursorLine(view)).toBe(HEADING);
			expect(revealedLinesInDom(view)).toEqual([HEADING]);

			cursorLineUp(view);
			expect(cursorLine(view)).toBe(BULLET);
			expect(revealedLinesInDom(view)).toEqual([BULLET]);
		}
		view.destroy();
	});

	describe('when the move also scrolls the viewport', () => {
		type InlineValue = { decorations: DecorationSet; update(u: ViewUpdate): void };

		/**
		 * jsdom never reports a viewport change (every element measures 0px),
		 * so the arrow move that scrolls is driven through the same
		 * ViewUpdate stand-in `inline-formatting-plugin.test.ts` uses, carrying
		 * the real start and end states. During a real update `view.state` is
		 * already the end state (the plugin builds from it), so the stand-in
		 * view reports `to`.
		 */
		function scrollingMove(view: EditorView, from: EditorState, to: EditorState): ViewUpdate {
			return {
				view: new Proxy(view, {
					get: (target, key) => (key === 'state' ? to : Reflect.get(target, key)),
				}),
				state: to,
				startState: from,
				docChanged: false,
				selectionSet: true,
				viewportChanged: true,
				transactions: [{ reconfigured: false, effects: [] }],
			} as unknown as ViewUpdate;
		}

		/**
		 * Lines whose block syntax the decorations leave as source: a line is
		 * hidden when it carries the shared `hiddenSyntaxDeco` (heading `# `) or
		 * the bullet widget that replaces `- `.
		 */
		function revealedLines(state: EditorState, value: InlineValue): number[] {
			const hidden = new Set<number>();
			const iter = value.decorations.iter();
			while (iter.value) {
				const widget = (iter.value.spec as { widget?: unknown }).widget;
				if (iter.value === hiddenSyntaxDeco || widget instanceof UnorderedListMarkerWidget) {
					hidden.add(state.doc.lineAt(iter.from).number);
				}
				iter.next();
			}
			return [BULLET, HEADING].filter((n) => !hidden.has(n));
		}

		it('reveals exactly the new line on every move', () => {
			const ext = makeInlineFormattingPlugin(productionHandlers());
			const state = createMarkdownState(DOC, { cursor: 0, extensions: [markdownLanguage(), ext] });
			const view = new EditorView({ state, parent: document.body.appendChild(document.createElement('div')) });
			const value = view.plugin(ext as unknown as ViewPlugin<InlineValue>);
			if (!value) throw new Error('inline formatting plugin not found on the view');
			expect(revealedLines(view.state, value)).toEqual([BULLET]);

			let current = view.state;
			for (let round = 0; round < 3; round++) {
				for (const line of [HEADING, BULLET]) {
					const next = current.update({
						selection: EditorSelection.cursor(current.doc.line(line).from),
					}).state;
					value.update(scrollingMove(view, current, next));
					expect(revealedLines(next, value)).toEqual([line]);
					current = next;
				}
			}
			view.destroy();
		});
	});
});
