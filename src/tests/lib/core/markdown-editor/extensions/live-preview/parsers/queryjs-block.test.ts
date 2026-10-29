import { describe, it, expect } from 'vitest';
import { findAllQueryjsBlocks } from '#lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.js';
import { createMarkdownState } from '../../../test-helpers';

/** Parses `lines` joined by newlines and returns the queryjs blocks found. */
function find(lines: string[]) {
	return findAllQueryjsBlocks(createMarkdownState(lines.join('\n')));
}

describe('findAllQueryjsBlocks', () => {
	it('detects a simple queryjs block', () => {
		const blocks = find([
			'```queryjs',
			'kb.list(kb.pages().file.link)',
			'```',
		]);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].jsContent).toBe('kb.list(kb.pages().file.link)');
	});

	it('extracts multiline JS content correctly', () => {
		const blocks = find([
			'```queryjs',
			'const pages = kb.pages("#journal")',
			'const filtered = pages.where(p => p.status === "active")',
			'kb.table(["Name"], filtered.map(p => [p.file.link]))',
			'```',
		]);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].jsContent).toBe(
			'const pages = kb.pages("#journal")\n' +
				'const filtered = pages.where(p => p.status === "active")\n' +
				'kb.table(["Name"], filtered.map(p => [p.file.link]))',
		);
	});

	it('ignores code blocks with other languages', () => {
		expect(find(['```js', 'console.log("hello")', '```'])).toEqual([]);
	});

	it('ignores plain code blocks', () => {
		expect(find(['```', 'some text', '```'])).toEqual([]);
	});

	it('ignores collection blocks', () => {
		expect(find(['```collection', 'views:', '```'])).toEqual([]);
	});

	it('returns nothing if block is not closed', () => {
		expect(find(['```queryjs', 'kb.paragraph("hello")'])).toEqual([]);
	});

	it('handles empty queryjs block', () => {
		const blocks = find(['```queryjs', '```']);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].jsContent).toBe('');
	});

	it('returns correct fence positions', () => {
		const doc = 'Some text\n```queryjs\nkb.paragraph("test")\n```';
		const blocks = findAllQueryjsBlocks(createMarkdownState(doc));
		expect(blocks).toEqual([
			{
				openFenceFrom: doc.indexOf('```queryjs'),
				openFenceTo: doc.indexOf('```queryjs') + '```queryjs'.length,
				closeFenceFrom: doc.lastIndexOf('```'),
				closeFenceTo: doc.length,
				jsContent: 'kb.paragraph("test")',
			},
		]);
	});

	it('handles longer fence markers', () => {
		const blocks = find(['````queryjs', 'kb.paragraph("hello")', '````']);
		expect(blocks.map((b) => b.jsContent)).toEqual(['kb.paragraph("hello")']);
	});

	it('does not close with shorter fence', () => {
		const blocks = find([
			'````queryjs',
			'kb.paragraph("hello")',
			'```',
			'more code',
			'````',
		]);

		expect(blocks.map((b) => b.jsContent)).toEqual(['kb.paragraph("hello")\n```\nmore code']);
	});

	it('ignores a queryjs fence nested in a larger fence', () => {
		const blocks = find(['````md', '```queryjs', 'kb.view("x")', '```', '````']);
		expect(blocks).toEqual([]);
	});

	it('returns every top-level block in document order', () => {
		const blocks = find(['```queryjs', 'a()', '```', 'text', '```queryjs', 'b()', '```']);
		expect(blocks.map((b) => b.jsContent)).toEqual(['a()', 'b()']);
	});
});
