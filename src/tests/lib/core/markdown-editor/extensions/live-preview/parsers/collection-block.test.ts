import { describe, it, expect } from 'vitest';
import { findAllCollectionBlocks } from '#lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.js';
import { createMarkdownState } from '../../../test-helpers';

/** Parses `lines` joined by newlines and returns the collection blocks found. */
function find(lines: string[]) {
	return findAllCollectionBlocks(createMarkdownState(lines.join('\n')));
}

describe('findAllCollectionBlocks', () => {
	it('detects a simple collection block', () => {
		const blocks = find([
			'```collection',
			'views:',
			'  - type: table',
			'    name: Test',
			'```',
		]);

		expect(blocks.map((b) => b.yamlContent)).toEqual(['views:\n  - type: table\n    name: Test']);
	});

	it('extracts YAML content correctly', () => {
		const blocks = find([
			'```collection',
			'filters:',
			'  and:',
			'    - "status == \'active\'"',
			'views:',
			'  - type: table',
			'    name: Filtered',
			'```',
		]);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].yamlContent).toBe(
			'filters:\n  and:\n    - "status == \'active\'"\nviews:\n  - type: table\n    name: Filtered',
		);
	});

	it('ignores code blocks with other languages', () => {
		expect(find(['```js', 'console.log("hello")', '```'])).toEqual([]);
	});

	it('ignores yaml code blocks', () => {
		expect(find(['```yaml', 'key: value', '```'])).toEqual([]);
	});

	it('ignores code blocks without language', () => {
		expect(find(['```', 'some text', '```'])).toEqual([]);
	});

	it('returns nothing if block is not closed', () => {
		expect(find(['```collection', 'views:', '  - type: table', '    name: Test'])).toEqual([]);
	});

	it('handles empty collection block', () => {
		expect(find(['```collection', '```']).map((b) => b.yamlContent)).toEqual(['']);
	});

	it('returns correct fence positions', () => {
		const doc = 'Some text\n```collection\nviews:\n```';
		const blocks = findAllCollectionBlocks(createMarkdownState(doc));
		expect(blocks).toEqual([
			{
				openFenceFrom: doc.indexOf('```collection'),
				openFenceTo: doc.indexOf('```collection') + '```collection'.length,
				closeFenceFrom: doc.lastIndexOf('```'),
				closeFenceTo: doc.length,
				yamlContent: 'views:',
			},
		]);
	});

	it('handles longer fence markers', () => {
		expect(find(['````collection', 'views:', '````']).map((b) => b.yamlContent)).toEqual(['views:']);
	});

	it('does not close with shorter fence', () => {
		const blocks = find(['````collection', 'views:', '```', 'more content', '````']);
		expect(blocks.map((b) => b.yamlContent)).toEqual(['views:\n```\nmore content']);
	});

	it('ignores a collection fence nested in a larger fence', () => {
		expect(find(['````md', '```collection', 'views:', '```', '````'])).toEqual([]);
	});
});
