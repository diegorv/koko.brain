import { describe, it, expect } from 'vitest';
import { findCollectionBlock } from '$lib/core/markdown-editor/extensions/live-preview/parsers/collection-block';

function makeLines(texts: string[]) {
	let pos = 0;
	return texts.map((text, i) => {
		const from = pos;
		const to = pos + text.length;
		pos = to + 1; // +1 for newline
		return { text, from, to, number: i + 1 };
	});
}

describe('findCollectionBlock', () => {
	it('detects a simple collection block', () => {
		const lines = makeLines([
			'```collection',
			'views:',
			'  - type: table',
			'    name: Test',
			'```',
		]);

		const result = findCollectionBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.endIdx).toBe(4);
		expect(result!.block.yamlContent).toBe('views:\n  - type: table\n    name: Test');
	});

	it('extracts YAML content correctly', () => {
		const lines = makeLines([
			'```collection',
			'filters:',
			'  and:',
			'    - "status == \'active\'"',
			'views:',
			'  - type: table',
			'    name: Filtered',
			'```',
		]);

		const result = findCollectionBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.yamlContent).toContain('filters:');
		expect(result!.block.yamlContent).toContain('views:');
	});

	it('ignores code blocks with other languages', () => {
		const lines = makeLines([
			'```js',
			'console.log("hello")',
			'```',
		]);

		expect(findCollectionBlock(lines, 0)).toBeNull();
	});

	it('ignores plain code blocks', () => {
		const lines = makeLines([
			'```yaml',
			'key: value',
			'```',
		]);

		expect(findCollectionBlock(lines, 0)).toBeNull();
	});

	it('ignores empty code blocks without language', () => {
		const lines = makeLines([
			'```',
			'some text',
			'```',
		]);

		expect(findCollectionBlock(lines, 0)).toBeNull();
	});

	it('returns null if block is not closed', () => {
		const lines = makeLines([
			'```collection',
			'views:',
			'  - type: table',
			'    name: Test',
		]);

		expect(findCollectionBlock(lines, 0)).toBeNull();
	});

	it('handles empty collection block', () => {
		const lines = makeLines([
			'```collection',
			'```',
		]);

		const result = findCollectionBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.yamlContent).toBe('');
	});

	it('returns correct fence positions', () => {
		const lines = makeLines([
			'```collection',
			'views:',
			'```',
		]);

		const result = findCollectionBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.openFenceFrom).toBe(lines[0].from);
		expect(result!.block.openFenceTo).toBe(lines[0].to);
		expect(result!.block.closeFenceFrom).toBe(lines[2].from);
		expect(result!.block.closeFenceTo).toBe(lines[2].to);
	});

	it('does not match when starting at a non-collection line', () => {
		const lines = makeLines([
			'Some text',
			'```collection',
			'views:',
			'```',
		]);

		expect(findCollectionBlock(lines, 0)).toBeNull();
		expect(findCollectionBlock(lines, 1)).not.toBeNull();
	});

	it('handles longer fence markers', () => {
		const lines = makeLines([
			'````collection',
			'views:',
			'````',
		]);

		const result = findCollectionBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.yamlContent).toBe('views:');
	});

	it('does not close with shorter fence', () => {
		const lines = makeLines([
			'````collection',
			'views:',
			'```',
			'more content',
			'````',
		]);

		const result = findCollectionBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.endIdx).toBe(4);
		expect(result!.block.yamlContent).toContain('```');
	});
});
