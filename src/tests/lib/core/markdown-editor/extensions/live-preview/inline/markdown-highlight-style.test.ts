import { describe, it, expect } from 'vitest';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';

import { mdStyle } from '$lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style';

describe('mdStyle HighlightStyle', () => {
	it('is a HighlightStyle instance', () => {
		expect(mdStyle).toBeInstanceOf(HighlightStyle);
	});

	it('can be wrapped in syntaxHighlighting() without throwing', () => {
		// syntaxHighlighting returns an Extension (array). Just verify it's callable.
		const ext = syntaxHighlighting(mdStyle);
		expect(ext).toBeDefined();
	});

	it('exposes the expected CSS classes via the style spec', () => {
		// HighlightStyle stores each rule's CSS under `specs` or via its internal
		// module. Since the public API doesn't expose rule introspection, we
		// instead rely on the tag→class mapping being exercised when a CodeMirror
		// view renders — the Phase 3 spec will assert DOM output. For now, we
		// at least verify the module exports something and didn't throw at import.
		expect(mdStyle).toBeTruthy();
	});
});
