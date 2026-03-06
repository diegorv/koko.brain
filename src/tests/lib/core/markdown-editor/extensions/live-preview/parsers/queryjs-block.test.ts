import { describe, it, expect } from 'vitest';
import { findQueryjsBlock } from '$lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block';

function makeLines(texts: string[]) {
	let pos = 0;
	return texts.map((text, i) => {
		const from = pos;
		const to = pos + text.length;
		pos = to + 1; // +1 for newline
		return { text, from, to, number: i + 1 };
	});
}

describe('findQueryjsBlock', () => {
	it('detects a simple queryjs block', () => {
		const lines = makeLines([
			'```queryjs',
			'kb.list(kb.pages().file.link)',
			'```',
		]);

		const result = findQueryjsBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.endIdx).toBe(2);
		expect(result!.block.jsContent).toBe('kb.list(kb.pages().file.link)');
	});

	it('extracts multiline JS content correctly', () => {
		const lines = makeLines([
			'```queryjs',
			'const pages = kb.pages("#journal")',
			'const filtered = pages.where(p => p.status === "active")',
			'kb.table(["Name"], filtered.map(p => [p.file.link]))',
			'```',
		]);

		const result = findQueryjsBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.jsContent).toContain('const pages');
		expect(result!.block.jsContent).toContain('kb.table');
		expect(result!.endIdx).toBe(4);
	});

	it('ignores code blocks with other languages', () => {
		const lines = makeLines([
			'```js',
			'console.log("hello")',
			'```',
		]);

		expect(findQueryjsBlock(lines, 0)).toBeNull();
	});

	it('ignores plain code blocks', () => {
		const lines = makeLines([
			'```',
			'some text',
			'```',
		]);

		expect(findQueryjsBlock(lines, 0)).toBeNull();
	});

	it('ignores collection blocks', () => {
		const lines = makeLines([
			'```collection',
			'views:',
			'```',
		]);

		expect(findQueryjsBlock(lines, 0)).toBeNull();
	});

	it('returns null if block is not closed', () => {
		const lines = makeLines([
			'```queryjs',
			'kb.paragraph("hello")',
		]);

		expect(findQueryjsBlock(lines, 0)).toBeNull();
	});

	it('handles empty queryjs block', () => {
		const lines = makeLines([
			'```queryjs',
			'```',
		]);

		const result = findQueryjsBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.jsContent).toBe('');
	});

	it('returns correct fence positions', () => {
		const lines = makeLines([
			'```queryjs',
			'kb.paragraph("test")',
			'```',
		]);

		const result = findQueryjsBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.openFenceFrom).toBe(lines[0].from);
		expect(result!.block.openFenceTo).toBe(lines[0].to);
		expect(result!.block.closeFenceFrom).toBe(lines[2].from);
		expect(result!.block.closeFenceTo).toBe(lines[2].to);
	});

	it('does not match when starting at a non-queryjs line', () => {
		const lines = makeLines([
			'Some text',
			'```queryjs',
			'kb.list(kb.pages())',
			'```',
		]);

		expect(findQueryjsBlock(lines, 0)).toBeNull();
		expect(findQueryjsBlock(lines, 1)).not.toBeNull();
	});

	it('handles longer fence markers', () => {
		const lines = makeLines([
			'````queryjs',
			'kb.paragraph("hello")',
			'````',
		]);

		const result = findQueryjsBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.jsContent).toBe('kb.paragraph("hello")');
	});

	it('does not close with shorter fence', () => {
		const lines = makeLines([
			'````queryjs',
			'kb.paragraph("hello")',
			'```',
			'more code',
			'````',
		]);

		const result = findQueryjsBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.endIdx).toBe(4);
		expect(result!.block.jsContent).toContain('```');
	});
});
