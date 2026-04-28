import { describe, it, expect } from 'vitest';
import {
	newInlineExtensions,
	PRODUCTION_NODE_HANDLERS,
	PRODUCTION_LINE_HANDLERS,
} from '$lib/core/markdown-editor/extensions/live-preview/new/new-inline-extensions';

describe('new-inline-extensions', () => {
	it('PRODUCTION_NODE_HANDLERS contains the registered handlers in retirement order', () => {
		const nodeTypes = PRODUCTION_NODE_HANDLERS.map((h) => h.nodeType);
		// Phase 3 — highlight handler. Phases 4–10 will append more.
		expect(nodeTypes).toEqual(['Highlight']);
	});

	it('PRODUCTION_LINE_HANDLERS starts empty (populated by Phases 6, 7, 9)', () => {
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
