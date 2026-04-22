import { describe, it, expect, beforeEach } from 'vitest';

import {
	newInlineExtensions,
	PRODUCTION_INLINE_HANDLERS,
} from '$lib/core/markdown-editor/extensions/live-preview/new/new-inline-extensions';
import {
	_inlineHandlersSnapshot,
	_clearInlineHandlers,
} from '$lib/core/markdown-editor/extensions/live-preview/new/inline-formatting-plugin';
import { highlightHandler } from '$lib/core/markdown-editor/extensions/live-preview/new/handlers/highlight-handler';

describe('newInlineExtensions', () => {
	beforeEach(() => {
		_clearInlineHandlers();
	});

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

	it('registers every PRODUCTION_INLINE_HANDLERS entry on call', () => {
		newInlineExtensions();
		expect(_inlineHandlersSnapshot()).toEqual(PRODUCTION_INLINE_HANDLERS);
	});

	it('is idempotent — repeat calls never double-register', () => {
		newInlineExtensions();
		newInlineExtensions();
		newInlineExtensions();
		expect(_inlineHandlersSnapshot()).toEqual(PRODUCTION_INLINE_HANDLERS);
	});

	it('Phase 3 registers the highlight handler', () => {
		newInlineExtensions();
		expect(_inlineHandlersSnapshot()).toContain(highlightHandler);
	});
});
