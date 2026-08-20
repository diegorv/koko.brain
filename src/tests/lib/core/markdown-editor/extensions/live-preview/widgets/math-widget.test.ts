// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import katex from 'katex';
import { EditorView } from '@codemirror/view';
import { syntaxHighlighting } from '@codemirror/language';

// No mocks — exercise the real KaTeX render + DOMPurify sanitize path.

import {
	MathWidget,
	clearMathCache,
} from '$lib/core/markdown-editor/extensions/live-preview/widgets/math-widget';
import { livePreviewExtensions } from '$lib/core/markdown-editor/extensions/live-preview/live-preview';
import { markdownLanguage, markdownHighlight } from '$lib/core/markdown-editor/highlight-styles';
import { createMarkdownState, stepDateNow } from '../../../test-helpers';

describe('MathWidget', () => {
	beforeEach(() => {
		clearMathCache();
		document.body.replaceChildren();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders a block formula as a sanitized KaTeX display div', () => {
		const dom = new MathWidget('x^2', true).toDOM();

		expect(dom.tagName).toBe('DIV');
		expect(dom.className).toBe('cm-lp-math-block');
		// KaTeX emits a `.katex` root inside the container.
		expect(dom.querySelector('.katex')).not.toBeNull();
	});

	it('renders an inline formula as a sanitized KaTeX span', () => {
		const dom = new MathWidget('x^2', false).toDOM();

		expect(dom.tagName).toBe('SPAN');
		expect(dom.className).toBe('cm-lp-math-inline');
		expect(dom.querySelector('.katex')).not.toBeNull();
	});

	it('keys the cache by displayMode — the same formula renders block and inline markup', () => {
		// Regression: a formula-only cache key would serve the block render
		// (wrapped in `.katex-display`) to the inline site and vice versa.
		const spy = vi.spyOn(katex, 'renderToString');

		const block = new MathWidget('x^2', true).toDOM();
		const inline = new MathWidget('x^2', false).toDOM();

		expect(spy).toHaveBeenCalledTimes(2);
		expect(block.querySelector('.katex-display')).not.toBeNull();
		expect(inline.querySelector('.katex-display')).toBeNull();
		expect(inline.querySelector('.katex')).not.toBeNull();
		expect(block.innerHTML).not.toBe(inline.innerHTML);
	});

	it('keeps both cache entries alive — neither mode evicts the other', () => {
		new MathWidget('x^2', true).toDOM();
		new MathWidget('x^2', false).toDOM();

		const spy = vi.spyOn(katex, 'renderToString');
		const block = new MathWidget('x^2', true).toDOM();
		const inline = new MathWidget('x^2', false).toDOM();

		expect(spy).not.toHaveBeenCalled();
		expect(block.querySelector('.katex-display')).not.toBeNull();
		expect(inline.querySelector('.katex-display')).toBeNull();
	});

	it('renders an error container for an empty block formula and does not cache it', () => {
		const dom = new MathWidget('   ', true).toDOM();

		expect(dom.tagName).toBe('DIV');
		expect(dom.className).toBe('cm-lp-math-error');
		expect(dom.textContent).toBe('Empty math expression');
	});

	it('leaves an empty inline formula on the KaTeX path — the guard stays block-only', () => {
		const dom = new MathWidget('   ', false).toDOM();

		expect(dom.tagName).toBe('SPAN');
		expect(dom.className).toBe('cm-lp-math-inline');
		expect(dom.textContent).not.toBe('Empty math expression');
	});

	it('never hands the same DOM node to two widgets with the same formula', () => {
		// Regression: CodeMirror builds new lines detached, so two widgets for a
		// duplicated formula can both call toDOM() while nothing is connected.
		// Sharing the cached node moves it to the last widget and blanks the
		// first occurrence.
		const first = new MathWidget('x^2', true).toDOM();
		expect(first.isConnected).toBe(false);

		const second = new MathWidget('x^2', true).toDOM();

		expect(second).not.toBe(first);
		expect(first.querySelector('.katex')).not.toBeNull();
		expect(second.querySelector('.katex')).not.toBeNull();
	});

	it('reuses the cached render — KaTeX runs once per formula', () => {
		const spy = vi.spyOn(katex, 'renderToString');

		new MathWidget('x^2', false).toDOM();
		const second = new MathWidget('x^2', false).toDOM();

		expect(spy).toHaveBeenCalledTimes(1);
		expect(second.querySelector('.katex')).not.toBeNull();
	});

	it('caches per formula — different formulas render independently', () => {
		const a = new MathWidget('a^2', false).toDOM();
		const b = new MathWidget('b^2', false).toDOM();

		expect(a).not.toBe(b);
		expect(a.textContent).not.toBe(b.textContent);
	});

	it('clearMathCache forces a fresh KaTeX render in both modes', () => {
		new MathWidget('x^2', true).toDOM();
		new MathWidget('x^2', false).toDOM();

		const spy = vi.spyOn(katex, 'renderToString');
		clearMathCache();
		new MathWidget('x^2', true).toDOM();
		new MathWidget('x^2', false).toDOM();

		expect(spy).toHaveBeenCalledTimes(2);
	});

	it('renders an error container when KaTeX throws and does not cache it', () => {
		const spy = vi.spyOn(katex, 'renderToString').mockImplementationOnce(() => {
			throw new Error('boom');
		});

		const failed = new MathWidget('x^2', true).toDOM();
		expect(failed.className).toBe('cm-lp-math-error');
		expect(failed.textContent).toBe('x^2');

		// The error result must not be cached: the next render runs KaTeX again
		// (the mock only throws once) and succeeds.
		const retried = new MathWidget('x^2', true).toDOM();
		expect(retried.className).toBe('cm-lp-math-block');
		expect(spy).toHaveBeenCalledTimes(2);
	});

	it('renders an error span when an inline KaTeX render throws', () => {
		vi.spyOn(katex, 'renderToString').mockImplementationOnce(() => {
			throw new Error('boom');
		});

		const failed = new MathWidget('x^2', false).toDOM();
		expect(failed.tagName).toBe('SPAN');
		expect(failed.className).toBe('cm-lp-math-error');
		expect(failed.textContent).toBe('x^2');
	});

	it('eq() separates the two display modes', () => {
		expect(new MathWidget('x^2', true).eq(new MathWidget('x^2', true))).toBe(true);
		expect(new MathWidget('x^2', true).eq(new MathWidget('x^2', false))).toBe(false);
		expect(new MathWidget('x^2', false).eq(new MathWidget('y^2', false))).toBe(false);
	});
});

describe('MathWidget — editor integration (duplicate formulas)', () => {
	/**
	 * Mounts an EditorView with the production live-preview stack on a state whose
	 * syntax tree is already complete (`createMarkdownState`). That ordering is
	 * load-bearing: every live-preview decorator that reads the syntax tree builds
	 * its decorations in its ViewPlugin constructor, so a tree still truncated by
	 * the 20 ms initial-parse budget at that moment decorates 0 math blocks.
	 *
	 * Repairing the tree afterwards with `forceParsing(view, ...)` does NOT work,
	 * which is what this helper used to do: it re-snapshots the tree, but its empty
	 * transaction carries no doc change, no selection change and no effect, so
	 * `checkUpdateAction` returns `'none'` and the plugins keep the decorations they
	 * built from the truncated tree. Measured under a 25 ms-stepping `Date.now`,
	 * that shape found 0 of the 2 expected elements in every test below while the
	 * tree itself read as fully repaired.
	 */
	function mountView(doc: string): { view: EditorView; root: HTMLElement } {
		const state = createMarkdownState(doc, {
			extensions: [
				markdownLanguage(),
				syntaxHighlighting(markdownHighlight),
				livePreviewExtensions(),
			],
		});
		const root = document.body.appendChild(document.createElement('div'));
		const view = new EditorView({ state, parent: root });
		return { view, root };
	}

	let view: EditorView | null = null;

	beforeEach(() => {
		clearMathCache();
		// Every mount below runs under an exhausted initial-parse budget, the state a
		// loaded machine reaches by stalling >= 21 ms at one block boundary. It is
		// strictly harder than a normal clock and it is the condition the old
		// `forceParsing` mount failed under.
		stepDateNow(25);
	});

	afterEach(() => {
		view?.destroy();
		view = null;
		document.body.innerHTML = '';
		vi.restoreAllMocks();
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

	it('renders both occurrences of an identical formula on one line at mount', () => {
		const r = mountView('cursor line\n\nfoo $x^2$ bar $x^2$ baz\n');
		view = r.view;

		const spans = Array.from(r.root.querySelectorAll('.cm-lp-math-inline'));
		expect(spans.length).toBe(2);
		for (const s of spans) {
			expect(s.querySelector('.katex')).not.toBeNull();
		}
	});

	it('renders both occurrences of an identical formula on different lines at mount', () => {
		const r = mountView('cursor line\n\nfirst $a+b$ here\n\nsecond $a+b$ there\n');
		view = r.view;

		expect(r.root.querySelectorAll('.cm-lp-math-inline').length).toBe(2);
	});

	it('renders the same formula as a block and inline in one document', () => {
		// The shared cache must not leak the block markup into the inline site.
		const r = mountView('cursor line\n\n$$\nx^2\n$$\n\ntext $x^2$ tail\n');
		view = r.view;

		const block = r.root.querySelector('.cm-lp-math-block');
		const inline = r.root.querySelector('.cm-lp-math-inline');
		expect(block).not.toBeNull();
		expect(inline).not.toBeNull();
		expect(block?.querySelector('.katex-display')).not.toBeNull();
		expect(inline?.querySelector('.katex-display')).toBeNull();
	});
});
