import { describe, it, expect } from 'vitest';
import { findMermaidBlock } from '$lib/core/markdown-editor/extensions/live-preview/parsers/mermaid';

function makeLines(text: string) {
	const result: { text: string; from: number; to: number }[] = [];
	let pos = 0;
	for (const lineText of text.split('\n')) {
		result.push({ text: lineText, from: pos, to: pos + lineText.length });
		pos += lineText.length + 1;
	}
	return result;
}

describe('findMermaidBlock', () => {
	it('detects a basic mermaid block with backticks', () => {
		const lines = makeLines('```mermaid\ngraph TD\n    A --> B\n```');
		const result = findMermaidBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.openFenceFrom).toBe(0);
		expect(result!.block.openFenceTo).toBe(10);
		expect(result!.block.diagramSource).toBe('graph TD\n    A --> B');
		expect(result!.endIdx).toBe(3);
	});

	it('detects mermaid block with tildes', () => {
		const lines = makeLines('~~~mermaid\ngraph LR\n    A --> B\n~~~');
		const result = findMermaidBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.diagramSource).toBe('graph LR\n    A --> B');
	});

	it('returns null for non-mermaid code blocks', () => {
		const lines = makeLines('```javascript\nconst x = 1;\n```');
		const result = findMermaidBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('returns null for plain text', () => {
		const lines = makeLines('regular text');
		const result = findMermaidBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('returns null when no closing fence', () => {
		const lines = makeLines('```mermaid\ngraph TD\n    A --> B');
		const result = findMermaidBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('requires matching fence character', () => {
		const lines = makeLines('```mermaid\ngraph TD\n~~~');
		const result = findMermaidBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('requires closing fence to be at least as long as opening', () => {
		const lines = makeLines('````mermaid\ngraph TD\n```');
		const result = findMermaidBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('accepts closing fence longer than opening', () => {
		const lines = makeLines('```mermaid\ngraph TD\n`````');
		const result = findMermaidBlock(lines, 0);
		expect(result).not.toBeNull();
	});

	it('starts detection from specified index', () => {
		const lines = makeLines('some text\n```mermaid\ngraph TD\n```');
		const result = findMermaidBlock(lines, 1);
		expect(result).not.toBeNull();
		expect(result!.block.openFenceFrom).toBe(10);
		expect(result!.endIdx).toBe(3);
	});

	it('handles empty mermaid block', () => {
		const lines = makeLines('```mermaid\n```');
		const result = findMermaidBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.diagramSource).toBe('');
	});

	it('handles multi-line diagram source', () => {
		const source = '```mermaid\nsequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi!\n```';
		const lines = makeLines(source);
		const result = findMermaidBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.diagramSource).toBe(
			'sequenceDiagram\n    Alice->>Bob: Hello\n    Bob-->>Alice: Hi!',
		);
		expect(result!.endIdx).toBe(4);
	});

	it('handles mermaid with trailing whitespace in opening fence', () => {
		const lines = makeLines('```mermaid  \ngraph TD\n```');
		const result = findMermaidBlock(lines, 0);
		expect(result).not.toBeNull();
	});

	it('ignores block without mermaid language', () => {
		const lines = makeLines('```\ngraph TD\n```');
		const result = findMermaidBlock(lines, 0);
		expect(result).toBeNull();
	});

	it('returns correct positions for closing fence', () => {
		const lines = makeLines('```mermaid\ngraph TD\n```');
		const result = findMermaidBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.closeFenceFrom).toBe(20);
		expect(result!.block.closeFenceTo).toBe(23);
	});
});
