import { describe, it, expect } from 'vitest';

import { newInlineExtensions } from '$lib/core/markdown-editor/extensions/live-preview/new/new-inline-extensions';

describe('newInlineExtensions', () => {
	it('returns a non-empty extension array', () => {
		const exts = newInlineExtensions();
		expect(Array.isArray(exts)).toBe(true);
		expect(exts.length).toBeGreaterThan(0);
	});

	it('returns a new array on each call (no shared reference)', () => {
		const a = newInlineExtensions();
		const b = newInlineExtensions();
		expect(a).not.toBe(b);
	});
});
