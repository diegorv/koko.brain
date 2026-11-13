// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { EditorView } from '@codemirror/view';
import {
	buildFootnoteDecorations,
	footnotePlugin,
} from '#lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.js';
import { createMarkdownState, mountMarkdownView, testMarkdown } from '../../lib/core/markdown-editor/test-helpers';

/**
 * LP2: an empty inline footnote `^[]` (what closeBrackets leaves after typing `^[`)
 * makes buildFootnoteDecorations push an empty mark, which CodeMirror rejects with
 * a RangeError. Inside the ViewPlugin that crash deactivates the footnote plugin.
 */
afterEach(() => {
	document.body.innerHTML = '';
});

describe('LP2: empty inline footnote `^[]`', () => {
	it('building decorations with the cursor on another line does not throw', () => {
		const doc = 'see ^[] here\nnext line';
		const state = createMarkdownState(doc, { cursor: doc.length });
		expect(() => buildFootnoteDecorations(state, [{ from: 0, to: doc.length }])).not.toThrow();
	});

	it('moving the cursor off the `^[]` line keeps the footnote plugin alive', () => {
		const doc = 'text with a ref[^1]\nsee ^[] here\nnext line';
		const errors: unknown[] = [];
		const view = mountMarkdownView(doc, {
			cursor: doc.indexOf('^[]') + 2,
			extensions: [
				testMarkdown(),
				footnotePlugin,
				EditorView.exceptionSink.of((e) => errors.push(e)),
			],
		});
		const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
		view.dispatch({ selection: { anchor: doc.length } });
		spy.mockRestore();
		const plugin = view.plugin(footnotePlugin);
		view.destroy();
		expect(plugin, 'plugin is deactivated after the crash').not.toBeNull();
		expect(errors.map(String)).toEqual([]);
	});
});
