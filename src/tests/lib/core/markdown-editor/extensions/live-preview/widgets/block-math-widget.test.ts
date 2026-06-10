// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import katex from 'katex';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { syntaxHighlighting, forceParsing } from '@codemirror/language';

// No mocks — exercise the real KaTeX render + DOMPurify sanitize path.

import {
	BlockMathWidget,
	clearMathCache,
} from '$lib/core/markdown-editor/extensions/live-preview/widgets/block-math-widget';
import { livePreviewExtensions } from '$lib/core/markdown-editor/extensions/live-preview/live-preview';
import { markdownLanguage, markdownHighlight } from '$lib/core/markdown-editor/highlight-styles';

describe('BlockMathWidget', () => {
	beforeEach(() => {
		clearMathCache();
		document.body.replaceChildren();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the formula as a sanitized KaTeX display block', () => {
		const dom = new BlockMathWidget('x^2').toDOM();

		expect(dom.className).toBe('cm-lp-math-block');
		// KaTeX emits a `.katex` root inside the container.
		expect(dom.querySelector('.katex')).not.toBeNull();
	});

	it('renders an error container for an empty formula and does not cache it', () => {
		const dom = new BlockMathWidget('   ').toDOM();

		expect(dom.className).toBe('cm-lp-math-error');
		expect(dom.textContent).toBe('Empty math expression');
	});

	it('never hands the same DOM node to two widgets with the same formula', () => {
		// Regression: CodeMirror builds new lines detached, so two widgets for a
		// duplicated formula can both call toDOM() while nothing is connected.
		// Sharing the cached node moves it to the last widget and blanks the
		// first occurrence.
		const first = new BlockMathWidget('x^2').toDOM();
		expect(first.isConnected).toBe(false);

		const second = new BlockMathWidget('x^2').toDOM();

		expect(second).not.toBe(first);
		expect(first.querySelector('.katex')).not.toBeNull();
		expect(second.querySelector('.katex')).not.toBeNull();
	});

	it('reuses the cached render — KaTeX runs once per formula', () => {
		const spy = vi.spyOn(katex, 'renderToString');

		new BlockMathWidget('x^2').toDOM();
		const second = new BlockMathWidget('x^2').toDOM();

		expect(spy).toHaveBeenCalledTimes(1);
		expect(second.querySelector('.katex')).not.toBeNull();
	});

	it('clearMathCache forces a fresh KaTeX render', () => {
		const spy = vi.spyOn(katex, 'renderToString');

		new BlockMathWidget('x^2').toDOM();
		clearMathCache();
		new BlockMathWidget('x^2').toDOM();

		expect(spy).toHaveBeenCalledTimes(2);
	});

	it('renders an error container when KaTeX throws and does not cache it', () => {
		const spy = vi.spyOn(katex, 'renderToString').mockImplementationOnce(() => {
			throw new Error('boom');
		});

		const failed = new BlockMathWidget('x^2').toDOM();
		expect(failed.className).toBe('cm-lp-math-error');
		expect(failed.textContent).toBe('x^2');

		// The error result must not be cached: the next render runs KaTeX again
		// (the mock only throws once) and succeeds.
		const retried = new BlockMathWidget('x^2').toDOM();
		expect(retried.className).toBe('cm-lp-math-block');
		expect(spy).toHaveBeenCalledTimes(2);
	});
});

describe('BlockMathWidget — editor integration (duplicate formulas)', () => {
	/** Mounts an EditorView with the production live-preview stack. The view is
	 *  built into a DETACHED root with the syntax tree force-parsed before the
	 *  root is attached — this mirrors the app's initial mount (EditorView
	 *  assembles its DOM before `parent.appendChild`) and makes the block-math
	 *  decorations deterministic (lezer's eager-parse time budget is flaky in
	 *  jsdom, so without forceParsing the StateField may decorate 0 blocks). */
	function mountView(doc: string): { view: EditorView; root: HTMLElement } {
		const state = EditorState.create({
			doc,
			extensions: [
				markdownLanguage(),
				syntaxHighlighting(markdownHighlight),
				livePreviewExtensions(),
			],
		});
		const root = document.createElement('div');
		const view = new EditorView({ state, parent: root });
		forceParsing(view, state.doc.length, 5000);
		document.body.appendChild(root);
		return { view, root };
	}

	let view: EditorView | null = null;

	beforeEach(() => {
		clearMathCache();
	});

	afterEach(() => {
		view?.destroy();
		view = null;
		document.body.innerHTML = '';
	});

	it('renders both occurrences of an identical block formula at mount', () => {
		// Block math requires the multi-line form: `$$` alone on the open and
		// close lines (the lezer BlockMath parser rejects single-line `$$x$$`).
		const r = mountView('cursor line\n\n$$\nx^2\n$$\n\n$$\nx^2\n$$\n');
		view = r.view;

		const blocks = Array.from(r.root.querySelectorAll('.cm-lp-math-block'));
		expect(blocks.length).toBe(2);
		for (const b of blocks) {
			expect(b.querySelector('.katex')).not.toBeNull();
		}
	});
});
