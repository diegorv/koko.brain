import { describe, it, expect } from 'vitest';

import {
	livePreviewExtensions,
	sharedInlineExtensions,
} from '$lib/core/markdown-editor/extensions/live-preview/live-preview';
import { newInlineExtensions } from '$lib/core/markdown-editor/extensions/live-preview/new/new-inline-extensions';

describe('livePreviewExtensions', () => {
	it('returns a non-empty extension array', () => {
		const exts = livePreviewExtensions();
		expect(Array.isArray(exts)).toBe(true);
		expect(exts.length).toBeGreaterThan(0);
	});

	it('includes the unified inline pipeline (syntaxHighlighting + inlineFormattingPlugin)', () => {
		const total = livePreviewExtensions().length;
		const inline = newInlineExtensions().length;
		const shared = sharedInlineExtensions().length;
		// The combined length is at least the inline pipeline + shared plugins.
		// Anything larger is block fields + scroll debounce + styles (not
		// counted exactly here because those are orthogonal to this contract).
		expect(total).toBeGreaterThanOrEqual(inline + shared);
	});
});

describe('sharedInlineExtensions', () => {
	it('returns the non-migrated inline plugins (image, footnote, wikilinkEmbed, metaBindInput)', () => {
		const shared = sharedInlineExtensions();
		// The four plugins are self-contained ViewPlugins; exact count is 4
		// when metaBindInput isn't disabled via disabledDecorators.
		expect(shared.length).toBeGreaterThanOrEqual(3);
	});
});
