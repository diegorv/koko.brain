import { describe, it, expect } from 'vitest';
import {
	newInlineExtensions,
	PRODUCTION_NODE_HANDLERS,
	PRODUCTION_LINE_HANDLERS,
} from '$lib/core/markdown-editor/extensions/live-preview/new/new-inline-extensions';

describe('new-inline-extensions', () => {
	it('PRODUCTION_NODE_HANDLERS contains the registered handlers in retirement order', () => {
		const nodeTypes = PRODUCTION_NODE_HANDLERS.map((h) => h.nodeType);
		// Phase 3: Highlight. Phase 4: ATXHeading1-6 + SetextHeading1-2.
		// Future phases append more — assert the prefix is stable.
		expect(nodeTypes[0]).toBe('Highlight');
		for (const expected of ['ATXHeading1', 'ATXHeading2', 'ATXHeading3', 'ATXHeading4', 'ATXHeading5', 'ATXHeading6', 'SetextHeading1', 'SetextHeading2']) {
			expect(nodeTypes).toContain(expected);
		}
	});

	it('PRODUCTION_LINE_HANDLERS contains the inline-comment handler (Phase 6)', () => {
		const names = PRODUCTION_LINE_HANDLERS.map((h) => h.name);
		expect(names).toContain('inline-comment');
	});

	it('newInlineExtensions() returns the HighlightStyle wrapper + the inline plugin (2 entries)', () => {
		const exts = newInlineExtensions();
		expect(exts).toHaveLength(2);
		for (const ext of exts) {
			expect(ext).toBeTruthy();
		}
	});
});
