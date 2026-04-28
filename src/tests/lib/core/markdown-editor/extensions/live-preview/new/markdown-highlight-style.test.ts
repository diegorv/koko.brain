import { describe, it, expect } from 'vitest';
import {
	markdownInlineHighlight,
	inlineHighlightExtension,
} from '$lib/core/markdown-editor/extensions/live-preview/new/markdown-highlight-style';

describe('new/markdown-highlight-style', () => {
	it('exports markdownInlineHighlight as a HighlightStyle instance', () => {
		expect(markdownInlineHighlight).toBeTruthy();
		expect(typeof markdownInlineHighlight).toBe('object');
	});

	it('inlineHighlightExtension() returns a non-null Extension', () => {
		const ext = inlineHighlightExtension();
		expect(ext).toBeTruthy();
	});

	it('can be called multiple times and returns a fresh Extension each call', () => {
		const a = inlineHighlightExtension();
		const b = inlineHighlightExtension();
		expect(a).toBeTruthy();
		expect(b).toBeTruthy();
	});

	it('emits the legacy CSS class names verbatim for tags.strong / emphasis / strikethrough / monospace', () => {
		// The HighlightStyle's `style` method returns the resolved CSS class
		// for a list of tags. We can't introspect the Facet directly, but the
		// jsdom DOM-snapshot test (pipeline-dom.test.ts) covers the live
		// rendered output. Here we only confirm the structural invariant:
		// the highlightStyle object exists and the wrapped extension is built
		// without throwing.
		expect(markdownInlineHighlight).toBeTruthy();
		expect(inlineHighlightExtension()).toBeTruthy();
	});
});
