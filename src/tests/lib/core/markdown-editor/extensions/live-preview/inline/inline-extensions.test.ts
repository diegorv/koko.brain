import { describe, it, expect } from 'vitest';
import {
	inlineExtensions,
	PRODUCTION_NODE_HANDLERS,
	PRODUCTION_LINE_HANDLERS,
} from '$lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions';

describe('inline-extensions', () => {
	it('PRODUCTION_NODE_HANDLERS covers every Lezer-node-based decoration', () => {
		const nodeTypes = PRODUCTION_NODE_HANDLERS.map((h) => h.nodeType);
		// All node types the inline pipeline dispatches on. Order isn't
		// asserted — registry uses an O(1) name → handler map.
		const expected = [
			'Highlight',
			'ATXHeading1', 'ATXHeading2', 'ATXHeading3', 'ATXHeading4', 'ATXHeading5', 'ATXHeading6',
			'SetextHeading1', 'SetextHeading2',
			'QuoteMark',
			'TaskMarker', 'HorizontalRule', 'ListMark', 'HardBreak', 'InlineMath',
			'Link', 'LinkReference', 'Autolink',
			'EmphasisMark', 'CodeMark', 'StrikethroughMark', 'HighlightMark', 'Escape',
		];
		for (const type of expected) {
			expect(nodeTypes).toContain(type);
		}
	});

	it('PRODUCTION_LINE_HANDLERS covers every regex-based parser', () => {
		const names = PRODUCTION_LINE_HANDLERS.map((h) => h.name);
		expect(names).toContain('inline-comment');
		expect(names).toContain('block-reference');
		expect(names).toContain('extended-autolink');
		expect(names).toContain('wikilink');
	});

	it('inlineExtensions() returns the HighlightStyle wrapper + the inline plugin (2 entries)', () => {
		const exts = inlineExtensions();
		expect(exts).toHaveLength(2);
		for (const ext of exts) {
			expect(ext).toBeTruthy();
		}
	});
});
