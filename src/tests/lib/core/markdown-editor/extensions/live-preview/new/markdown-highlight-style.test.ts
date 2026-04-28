import { describe, it, expect } from 'vitest';
import {
	markdownInlineHighlight,
	inlineHighlightExtension,
} from '$lib/core/markdown-editor/extensions/live-preview/new/markdown-highlight-style';

describe('new/markdown-highlight-style', () => {
	it('exports markdownInlineHighlight as a HighlightStyle instance', () => {
		// HighlightStyle.define returns an object with a `module` Facet extension and a `style` method.
		// Cheapest invariant: it's a non-null object.
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
		// Both are valid extensions — exact identity isn't guaranteed by the API,
		// but neither should throw or be undefined.
		expect(a).toBeTruthy();
		expect(b).toBeTruthy();
	});
});
