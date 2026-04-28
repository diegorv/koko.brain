import { describe, it, expect } from 'vitest';
import {
	newInlineExtensions,
	PRODUCTION_NODE_HANDLERS,
	PRODUCTION_LINE_HANDLERS,
} from '$lib/core/markdown-editor/extensions/live-preview/new/new-inline-extensions';

describe('new-inline-extensions', () => {
	it('PRODUCTION_NODE_HANDLERS starts empty (Phase 3 ships the first entry)', () => {
		expect(PRODUCTION_NODE_HANDLERS).toEqual([]);
	});

	it('PRODUCTION_LINE_HANDLERS starts empty (Phase 3 ships the first entry)', () => {
		expect(PRODUCTION_LINE_HANDLERS).toEqual([]);
	});

	it('newInlineExtensions() returns the HighlightStyle wrapper + the inline plugin (2 entries)', () => {
		const exts = newInlineExtensions();
		expect(exts).toHaveLength(2);
		for (const ext of exts) {
			expect(ext).toBeTruthy();
		}
	});
});
