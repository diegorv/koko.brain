// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';

// No mocks — exercise the real KaTeX render + DOMPurify sanitize path.

import {
	InlineMathWidget,
	clearInlineMathCache,
} from '$lib/core/markdown-editor/extensions/live-preview/widgets/inline-math-widget';

describe('InlineMathWidget', () => {
	beforeEach(() => {
		clearInlineMathCache();
		document.body.replaceChildren();
	});

	it('renders the formula as a sanitized KaTeX span', () => {
		const dom = new InlineMathWidget('x^2').toDOM();

		expect(dom.className).toBe('cm-lp-math-inline');
		// KaTeX emits a `.katex` root inside the span.
		expect(dom.querySelector('.katex')).not.toBeNull();
	});

	it('returns the same cached element on re-render when it is detached', () => {
		const first = new InlineMathWidget('x^2').toDOM();
		expect(first.isConnected).toBe(false);

		const second = new InlineMathWidget('x^2').toDOM();

		// Cache hit: identical formula re-attaches the same node (no re-render).
		expect(second).toBe(first);
	});

	it('renders a fresh element when the cached one is still connected', () => {
		const first = new InlineMathWidget('x^2').toDOM();
		document.body.appendChild(first); // now connected
		expect(first.isConnected).toBe(true);

		const second = new InlineMathWidget('x^2').toDOM();

		// Must not hand out the live node owned by another visible widget.
		expect(second).not.toBe(first);
		expect(second.isConnected).toBe(false);
	});

	it('caches per formula — different formulas get different elements', () => {
		const a = new InlineMathWidget('a^2').toDOM();
		const b = new InlineMathWidget('b^2').toDOM();

		expect(a).not.toBe(b);
		// Re-rendering each detached formula returns its own cached node.
		expect(new InlineMathWidget('a^2').toDOM()).toBe(a);
		expect(new InlineMathWidget('b^2').toDOM()).toBe(b);
	});

	it('clearInlineMathCache forces a fresh render', () => {
		const first = new InlineMathWidget('x^2').toDOM();

		clearInlineMathCache();
		const second = new InlineMathWidget('x^2').toDOM();

		expect(second).not.toBe(first);
	});
});
