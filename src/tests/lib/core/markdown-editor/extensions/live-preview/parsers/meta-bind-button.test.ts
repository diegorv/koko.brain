import { describe, it, expect } from 'vitest';
import { findAllMetaBindButtonBlocks } from '#lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.js';
import { createMarkdownState } from '../../../test-helpers';

/** Parses `doc` and returns the meta-bind-button blocks found. */
function find(doc: string) {
	return findAllMetaBindButtonBlocks(createMarkdownState(doc));
}

describe('findAllMetaBindButtonBlocks', () => {
	it('detects a meta-bind-button block', () => {
		const blocks = find(
			[
				'```meta-bind-button',
				'label: Click Me',
				'style: primary',
				'action:',
				'  type: open',
				'  link: "https://example.com"',
				'```',
			].join('\n'),
		);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].yamlContent).toContain('label: Click Me');
		expect(blocks[0].yamlContent).toContain('style: primary');
	});

	it('extracts YAML content correctly', () => {
		const blocks = find(
			'```meta-bind-button\nlabel: Test\naction:\n  type: updateMetadata\n  bindTarget: status\n  value: done\n```',
		);
		expect(blocks.map((b) => b.yamlContent)).toEqual([
			'label: Test\naction:\n  type: updateMetadata\n  bindTarget: status\n  value: done',
		]);
	});

	it('returns nothing for other code blocks', () => {
		expect(find('```js\nconsole.log("hello")\n```')).toEqual([]);
		expect(find('```collection\nviews:\n```')).toEqual([]);
	});

	it('returns nothing for code blocks without language', () => {
		expect(find('```\nsome text\n```')).toEqual([]);
	});

	it('returns nothing if block is not closed', () => {
		expect(find('```meta-bind-button\nlabel: Test\naction:\n  type: open')).toEqual([]);
	});

	it('handles empty block', () => {
		expect(find('```meta-bind-button\n```').map((b) => b.yamlContent)).toEqual(['']);
	});

	it('returns correct fence positions', () => {
		const doc = '```meta-bind-button\nlabel: Test\n```';
		const blocks = find(doc);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].openFenceFrom).toBe(0);
		expect(blocks[0].openFenceTo).toBe('```meta-bind-button'.length);
		expect(blocks[0].closeFenceFrom).toBe(doc.lastIndexOf('```'));
		expect(blocks[0].closeFenceTo).toBe(doc.length);
	});

	it('finds a block that starts after other text', () => {
		const doc = 'Some text\n```meta-bind-button\nlabel: Test\n```';
		const blocks = find(doc);
		expect(blocks.map((b) => b.openFenceFrom)).toEqual([doc.indexOf('```')]);
	});

	it('handles fences with 4+ backticks', () => {
		expect(find('````meta-bind-button\nlabel: Test\n````').map((b) => b.yamlContent)).toEqual(['label: Test']);
	});

	it('does not close with shorter fence', () => {
		const doc = '````meta-bind-button\nlabel: Test\n```\nmore content\n````';
		const blocks = find(doc);
		expect(blocks.map((b) => b.yamlContent)).toEqual(['label: Test\n```\nmore content']);
		expect(blocks[0].closeFenceTo).toBe(doc.length);
	});

	it('returns nothing for a meta-bind-button fence nested in a larger fence', () => {
		expect(find('````md\n```meta-bind-button\nlabel: Test\n```\n````')).toEqual([]);
	});
});
