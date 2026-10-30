// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ViewPlugin, type EditorView } from '@codemirror/view';
import { syntaxTree } from '@codemirror/language';
import { markdown } from '@codemirror/lang-markdown';
import { GFM } from '@lezer/markdown';
import { mountMarkdownView, stepDateNow, withFullParse, createMarkdownState } from './test-helpers';

/** Six blocks: more than one parser advance, so a 25 ms clock step truncates it. */
const BLOCKS = '# One\n\npara\n\n## Two\n\n- item\n\n> quote\n\n```js\ncode\n```\n\n| a | b |\n| - | - |\n| 1 | 2 |';

afterEach(() => {
	vi.restoreAllMocks();
	document.body.replaceChildren();
});

describe('withFullParse', () => {
	it('a doc-change transaction parses the whole new doc under an exhausted budget', () => {
		stepDateNow(25);
		const state = createMarkdownState('plain text');
		const changes = { from: 0, to: state.doc.length, insert: BLOCKS };

		// Precondition: without the helper the same transaction keeps a truncated tree.
		expect(syntaxTree(state.update({ changes }).state).length).toBeLessThan(BLOCKS.length);

		const next = withFullParse(() => state.update({ changes }).state);
		expect(syntaxTree(next).length).toBe(BLOCKS.length);
	});

	it('restores Date.now afterwards, also when the callback throws', () => {
		const now = Date.now;
		expect(withFullParse(() => 42)).toBe(42);
		expect(Date.now).toBe(now);
		expect(() =>
			withFullParse(() => {
				throw new Error('boom');
			}),
		).toThrow('boom');
		expect(Date.now).toBe(now);
	});
});

describe('mountMarkdownView', () => {
	it('ViewPlugins are constructed from the finished tree under an exhausted budget', () => {
		stepDateNow(25);
		let seen = -1;
		const probe = ViewPlugin.define((view: EditorView) => {
			seen = syntaxTree(view.state).length;
			return {};
		});

		const view = mountMarkdownView(BLOCKS, { extensions: [markdown({ extensions: GFM }), probe] });

		expect(seen).toBe(BLOCKS.length);
		expect(view.dom.isConnected).toBe(true);
		view.destroy();
	});

	it('places the cursor where asked', () => {
		const view = mountMarkdownView('one\ntwo', { cursor: 5 });
		expect(view.state.selection.main.head).toBe(5);
		view.destroy();
	});
});
