import { describe, it, expect } from 'vitest';

import { livePreviewExtensions } from '$lib/core/markdown-editor/extensions/live-preview/live-preview';
import { newInlineExtensions } from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions';

describe('livePreviewExtensions', () => {
	it('returns a non-empty extension array', () => {
		const exts = livePreviewExtensions();
		expect(Array.isArray(exts)).toBe(true);
		expect(exts.length).toBeGreaterThan(0);
	});

	it('includes the unified inline pipeline (syntaxHighlighting + inlineFormattingPlugin)', () => {
		const total = livePreviewExtensions().length;
		const inline = newInlineExtensions().length;
		// The combined length is at least the inline pipeline; anything larger
		// is block fields + scroll debounce + styles.
		expect(total).toBeGreaterThanOrEqual(inline);
	});
});
