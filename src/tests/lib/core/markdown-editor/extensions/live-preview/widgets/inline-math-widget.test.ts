// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import katex from 'katex';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { syntaxHighlighting } from '@codemirror/language';

// No mocks — exercise the real KaTeX render + DOMPurify sanitize path.

import {
	InlineMathWidget,
	clearInlineMathCache,
} from '$lib/core/markdown-editor/extensions/live-preview/widgets/inline-math-widget';
import { livePreviewExtensions } from '$lib/core/markdown-editor/extensions/live-preview/live-preview';
import { markdownLanguage, markdownHighlight } from '$lib/core/markdown-editor/highlight-styles';

describe('InlineMathWidget', () => {
	beforeEach(() => {
		clearInlineMathCache();
		document.body.replaceChildren();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders the formula as a sanitized KaTeX span', () => {
		const dom = new InlineMathWidget('x^2').toDOM();

		expect(dom.className).toBe('cm-lp-math-inline');
		// KaTeX emits a `.katex` root inside the span.
		expect(dom.querySelector('.katex')).not.toBeNull();
	});

	it('never hands the same DOM node to two widgets with the same formula', () => {
		// Regression: CodeMirror builds new lines detached, so two widgets for a
		// duplicated formula can both call toDOM() while nothing is connected.
		// Sharing the cached node moves it to the last widget and blanks the
		// first occurrence.
		const first = new InlineMathWidget('x^2').toDOM();
		expect(first.isConnected).toBe(false);

		const second = new InlineMathWidget('x^2').toDOM();

		expect(second).not.toBe(first);
		expect(first.querySelector('.katex')).not.toBeNull();
		expect(second.querySelector('.katex')).not.toBeNull();
	});

	it('reuses the cached render — KaTeX runs once per formula', () => {
		const spy = vi.spyOn(katex, 'renderToString');

		new InlineMathWidget('x^2').toDOM();
		const second = new InlineMathWidget('x^2').toDOM();

		expect(spy).toHaveBeenCalledTimes(1);
		expect(second.querySelector('.katex')).not.toBeNull();
	});

	it('caches per formula — different formulas render independently', () => {
		const a = new InlineMathWidget('a^2').toDOM();
		const b = new InlineMathWidget('b^2').toDOM();

		expect(a).not.toBe(b);
		expect(a.textContent).not.toBe(b.textContent);
	});

	it('clearInlineMathCache forces a fresh KaTeX render', () => {
		const spy = vi.spyOn(katex, 'renderToString');

		new InlineMathWidget('x^2').toDOM();
		clearInlineMathCache();
		new InlineMathWidget('x^2').toDOM();

		expect(spy).toHaveBeenCalledTimes(2);
	});

	it('renders an error span when KaTeX throws and does not cache it', () => {
		const spy = vi.spyOn(katex, 'renderToString').mockImplementationOnce(() => {
			throw new Error('boom');
		});

		const failed = new InlineMathWidget('x^2').toDOM();
		expect(failed.className).toBe('cm-lp-math-error');
		expect(failed.textContent).toBe('x^2');

		// The error result must not be cached: the next render runs KaTeX again
		// (the mock only throws once) and succeeds.
		const retried = new InlineMathWidget('x^2').toDOM();
		expect(retried.className).toBe('cm-lp-math-inline');
		expect(spy).toHaveBeenCalledTimes(2);
	});
});

describe('InlineMathWidget — editor integration (duplicate formulas)', () => {
	/** Mounts an EditorView with the production live-preview stack (same harness
	 *  as pipeline-dom.test.ts) so widget DOM is built exactly like in the app. */
	function mountView(doc: string): { view: EditorView; root: HTMLElement } {
		const state = EditorState.create({
			doc,
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
		clearInlineMathCache();
	});

	afterEach(() => {
		view?.destroy();
		view = null;
		document.body.innerHTML = '';
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
});
