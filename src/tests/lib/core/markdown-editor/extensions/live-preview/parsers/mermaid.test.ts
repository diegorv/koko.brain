import { describe, it, expect } from 'vitest';
import { findAllMermaidBlocks } from '#lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.js';
import { createMarkdownState } from '../../../test-helpers';

/** Parses `doc` and returns the mermaid blocks found. */
function find(doc: string) {
	return findAllMermaidBlocks(createMarkdownState(doc));
}

describe('findAllMermaidBlocks', () => {
	it('detects a basic mermaid block with backticks', () => {
		const blocks = find('```mermaid\ngraph TD\n    A --> B\n```');
		expect(blocks).toHaveLength(1);
		expect(blocks[0].openFenceFrom).toBe(0);
		expect(blocks[0].openFenceTo).toBe(10);
		expect(blocks[0].diagramSource).toBe('graph TD\n    A --> B');
	});

	it('detects mermaid block with tildes', () => {
		const blocks = find('~~~mermaid\ngraph LR\n    A --> B\n~~~');
		expect(blocks.map((b) => b.diagramSource)).toEqual(['graph LR\n    A --> B']);
	});

	it('returns nothing for non-mermaid code blocks', () => {
		expect(find('```javascript\nconst x = 1;\n```')).toEqual([]);
	});

	it('returns nothing for plain text', () => {
		expect(find('regular text')).toEqual([]);
	});

	it('returns nothing when no closing fence', () => {
		expect(find('```mermaid\ngraph TD\n    A --> B')).toEqual([]);
	});

	it('requires matching fence character', () => {
		expect(find('```mermaid\ngraph TD\n~~~')).toEqual([]);
	});

	it('requires closing fence to be at least as long as opening', () => {
		expect(find('````mermaid\ngraph TD\n```')).toEqual([]);
	});

	it('accepts closing fence longer than opening', () => {
		expect(find('```mermaid\ngraph TD\n`````')).toHaveLength(1);
	});

	it('finds a block after other text', () => {
		const blocks = find('some text\n```mermaid\ngraph TD\n```');
		expect(blocks).toHaveLength(1);
		expect(blocks[0].openFenceFrom).toBe(10);
	});

	it('handles empty mermaid block', () => {
		expect(find('```mermaid\n```').map((b) => b.diagramSource)).toEqual(['']);
	});

	it('handles multi-line diagram source', () => {
		const blocks = find('```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi!\n```');
		expect(blocks.map((b) => b.diagramSource)).toEqual([
			'sequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi!',
		]);
	});

	it('handles mermaid with trailing whitespace in opening fence', () => {
		expect(find('```mermaid  \ngraph TD\n```')).toHaveLength(1);
	});

	it('ignores block without mermaid language', () => {
		expect(find('```\ngraph TD\n```')).toEqual([]);
	});

	it('returns correct positions for closing fence', () => {
		const blocks = find('```mermaid\ngraph TD\n```');
		expect(blocks).toHaveLength(1);
		expect(blocks[0].closeFenceFrom).toBe(20);
		expect(blocks[0].closeFenceTo).toBe(23);
	});

	it('ignores a mermaid fence nested in a larger fence', () => {
		expect(find('````md\n```mermaid\ngraph TD\n```\n````')).toEqual([]);
	});
});
