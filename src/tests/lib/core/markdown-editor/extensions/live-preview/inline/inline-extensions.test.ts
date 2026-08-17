import { describe, it, expect } from 'vitest';
import {
	inlineExtensions,
	productionHandlers,
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

	describe('disabledDecorators filtering', () => {
		it('empty/omitted disabledDecorators keeps the full registries', () => {
			const { nodeHandlers, lineHandlers } = productionHandlers();
			expect(nodeHandlers).toEqual([...PRODUCTION_NODE_HANDLERS]);
			expect(lineHandlers).toEqual([...PRODUCTION_LINE_HANDLERS]);
		});

		it('a name set to false behaves as enabled', () => {
			const { nodeHandlers, lineHandlers } = productionHandlers({ heading: false });
			expect(nodeHandlers).toEqual([...PRODUCTION_NODE_HANDLERS]);
			expect(lineHandlers).toEqual([...PRODUCTION_LINE_HANDLERS]);
		});

		it('an unknown name is a no-op', () => {
			const { nodeHandlers, lineHandlers } = productionHandlers({ nonsense: true });
			expect(nodeHandlers).toEqual([...PRODUCTION_NODE_HANDLERS]);
			expect(lineHandlers).toEqual([...PRODUCTION_LINE_HANDLERS]);
		});

		it('disabling heading removes its handlers and leaves the others intact', () => {
			const { nodeHandlers, lineHandlers } = productionHandlers({ heading: true });
			const nodeTypes = nodeHandlers.map((h) => h.nodeType);
			for (const t of [
				'ATXHeading1', 'ATXHeading2', 'ATXHeading3', 'ATXHeading4', 'ATXHeading5', 'ATXHeading6',
				'SetextHeading1', 'SetextHeading2',
			]) {
				expect(nodeTypes).not.toContain(t);
			}
			expect(nodeTypes).toContain('Link');
			expect(nodeTypes).toContain('QuoteMark');
			expect(nodeHandlers).toHaveLength(PRODUCTION_NODE_HANDLERS.length - 8);
			expect(lineHandlers).toEqual([...PRODUCTION_LINE_HANDLERS]);
		});

		it('disabling link removes node + line link handlers, keeps always-on line handlers', () => {
			const { nodeHandlers, lineHandlers } = productionHandlers({ link: true });
			const nodeTypes = nodeHandlers.map((h) => h.nodeType);
			expect(nodeTypes).not.toContain('Link');
			expect(nodeTypes).not.toContain('LinkReference');
			expect(nodeTypes).not.toContain('Autolink');
			const lineNames = lineHandlers.map((h) => h.name);
			expect(lineNames).not.toContain('wikilink');
			expect(lineNames).not.toContain('extended-autolink');
			expect(lineNames).toContain('inline-comment');
			expect(lineNames).toContain('block-reference');
		});

		it('disabling inlineMarks removes formatting-mark + escape handlers', () => {
			const { nodeHandlers } = productionHandlers({ inlineMarks: true });
			const nodeTypes = nodeHandlers.map((h) => h.nodeType);
			for (const t of ['EmphasisMark', 'CodeMark', 'StrikethroughMark', 'HighlightMark', 'Escape']) {
				expect(nodeTypes).not.toContain(t);
			}
			expect(nodeTypes).toContain('Highlight');
		});

		it('disabling blockquote removes only QuoteMark', () => {
			const { nodeHandlers } = productionHandlers({ blockquote: true });
			expect(nodeHandlers.map((h) => h.nodeType)).not.toContain('QuoteMark');
			expect(nodeHandlers).toHaveLength(PRODUCTION_NODE_HANDLERS.length - 1);
		});

		it('disabling simpleWidget removes the widget handlers', () => {
			const { nodeHandlers } = productionHandlers({ simpleWidget: true });
			const nodeTypes = nodeHandlers.map((h) => h.nodeType);
			for (const t of ['TaskMarker', 'HorizontalRule', 'ListMark', 'HardBreak', 'InlineMath']) {
				expect(nodeTypes).not.toContain(t);
			}
		});

		it('disabling markdownStyle removes the Highlight content handler', () => {
			const { nodeHandlers } = productionHandlers({ markdownStyle: true });
			expect(nodeHandlers.map((h) => h.nodeType)).not.toContain('Highlight');
			expect(nodeHandlers.map((h) => h.nodeType)).toContain('HighlightMark');
		});

		it('inlineExtensions({ markdownStyle: true }) drops the HighlightStyle wrapper (1 entry)', () => {
			expect(inlineExtensions({ markdownStyle: true })).toHaveLength(1);
		});

		it('two names disabled at once compose', () => {
			const { nodeHandlers, lineHandlers } = productionHandlers({ heading: true, link: true });
			const nodeTypes = nodeHandlers.map((h) => h.nodeType);
			expect(nodeTypes).not.toContain('ATXHeading1');
			expect(nodeTypes).not.toContain('Link');
			expect(lineHandlers.map((h) => h.name)).not.toContain('wikilink');
			expect(lineHandlers.map((h) => h.name)).toContain('inline-comment');
		});
	});
});
