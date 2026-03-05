import { describe, it, expect } from 'vitest';
import { findAllFencedCodeBlocks } from '$lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block';
import { createMarkdownState } from '../../../test-helpers';

describe('findAllFencedCodeBlocks', () => {
	it('detects a basic fenced code block with backticks', () => {
		const state = createMarkdownState('```\nconst x = 1;\n```');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].openFenceFrom).toBe(0);
		expect(blocks[0].openFenceTo).toBe(3);
		expect(blocks[0].closeFenceFrom).toBe(17);
		expect(blocks[0].closeFenceTo).toBe(20);
		expect(blocks[0].language).toBe('');
		expect(blocks[0].closed).toBe(true);
	});

	it('detects fenced code block with language', () => {
		const state = createMarkdownState('```typescript\nconst x = 1;\n```');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].language).toBe('typescript');
		expect(blocks[0].closed).toBe(true);
	});

	it('detects fenced code block with tildes', () => {
		const state = createMarkdownState('~~~\ncode\n~~~');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].openFenceFrom).toBe(0);
		expect(blocks[0].closeFenceTo).toBe(12);
		expect(blocks[0].closed).toBe(true);
	});

	// CommonMark spec: "If the end of the containing block is reached and no closing code fence
	// has been found, the code block contains all lines until the end of the document."
	it('unclosed block extends to EOF (CommonMark spec)', () => {
		const state = createMarkdownState('```\ncode\nmore code');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].closed).toBe(false);
	});

	it('returns empty array for non-fence text', () => {
		const state = createMarkdownState('regular text');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(0);
	});

	// CommonMark spec: "The closing code fence must use the same character as the opening fence."
	it('mismatched fence character produces unclosed block (CommonMark spec)', () => {
		const state = createMarkdownState('```\ncode\n~~~');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].closed).toBe(false);
	});

	// CommonMark spec: closing fence must be "at least as many backticks or tildes as the opening"
	it('shorter closing fence produces unclosed block (CommonMark spec)', () => {
		const state = createMarkdownState('````\ncode\n```');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].closed).toBe(false);
	});

	it('accepts closing fence longer than opening', () => {
		const state = createMarkdownState('```\ncode\n`````');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].closed).toBe(true);
	});

	it('handles multi-line content', () => {
		const state = createMarkdownState('```js\nline1\nline2\nline3\n```');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].language).toBe('js');
		expect(blocks[0].closed).toBe(true);
	});

	it('detects code block not at document start', () => {
		const state = createMarkdownState('some text\n```\ncode\n```');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].openFenceFrom).toBe(10);
		expect(blocks[0].closed).toBe(true);
	});

	it('detects multiple code blocks', () => {
		const state = createMarkdownState('```js\ncode1\n```\n\n```py\ncode2\n```');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(2);
		expect(blocks[0].language).toBe('js');
		expect(blocks[1].language).toBe('py');
	});

	it('detects empty code block', () => {
		const state = createMarkdownState('```\n```');
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].closed).toBe(true);
	});

	it('extracts content range correctly', () => {
		const doc = '```\nhello\nworld\n```';
		const state = createMarkdownState(doc);
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		const content = doc.slice(blocks[0].contentFrom, blocks[0].contentTo);
		expect(content).toBe('hello\nworld');
	});
});
