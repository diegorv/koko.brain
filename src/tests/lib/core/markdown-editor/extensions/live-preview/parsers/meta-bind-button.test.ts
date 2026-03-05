import { describe, it, expect } from 'vitest';
import { findMetaBindButtonBlock } from '$lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button';

function makeLines(texts: string[]) {
	let pos = 0;
	return texts.map((text, i) => {
		const from = pos;
		const to = pos + text.length;
		pos = to + 1; // +1 for newline
		return { text, from, to, number: i + 1 };
	});
}

describe('findMetaBindButtonBlock', () => {
	it('detects a meta-bind-button block', () => {
		const lines = makeLines([
			'```meta-bind-button',
			'label: Click Me',
			'style: primary',
			'action:',
			'  type: open',
			'  link: "https://example.com"',
			'```',
		]);

		const result = findMetaBindButtonBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.endIdx).toBe(6);
		expect(result!.block.yamlContent).toContain('label: Click Me');
		expect(result!.block.yamlContent).toContain('style: primary');
	});

	it('extracts YAML content correctly', () => {
		const lines = makeLines([
			'```meta-bind-button',
			'label: Test',
			'action:',
			'  type: updateMetadata',
			'  bindTarget: status',
			'  value: done',
			'```',
		]);

		const result = findMetaBindButtonBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.yamlContent).toBe(
			'label: Test\naction:\n  type: updateMetadata\n  bindTarget: status\n  value: done',
		);
	});

	it('returns null for other code blocks', () => {
		const linesJs = makeLines(['```js', 'console.log("hello")', '```']);
		expect(findMetaBindButtonBlock(linesJs, 0)).toBeNull();

		const linesCollection = makeLines(['```collection', 'views:', '```']);
		expect(findMetaBindButtonBlock(linesCollection, 0)).toBeNull();
	});

	it('returns null for code blocks without language', () => {
		const lines = makeLines(['```', 'some text', '```']);
		expect(findMetaBindButtonBlock(lines, 0)).toBeNull();
	});

	it('returns null if block is not closed', () => {
		const lines = makeLines([
			'```meta-bind-button',
			'label: Test',
			'action:',
			'  type: open',
		]);
		expect(findMetaBindButtonBlock(lines, 0)).toBeNull();
	});

	it('handles empty block', () => {
		const lines = makeLines(['```meta-bind-button', '```']);

		const result = findMetaBindButtonBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.yamlContent).toBe('');
	});

	it('returns correct fence positions', () => {
		const lines = makeLines([
			'```meta-bind-button',
			'label: Test',
			'```',
		]);

		const result = findMetaBindButtonBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.openFenceFrom).toBe(lines[0].from);
		expect(result!.block.openFenceTo).toBe(lines[0].to);
		expect(result!.block.closeFenceFrom).toBe(lines[2].from);
		expect(result!.block.closeFenceTo).toBe(lines[2].to);
	});

	it('does not match when startIdx points to another line', () => {
		const lines = makeLines([
			'Some text',
			'```meta-bind-button',
			'label: Test',
			'action:',
			'  type: open',
			'  link: "https://x.com"',
			'```',
		]);

		expect(findMetaBindButtonBlock(lines, 0)).toBeNull();
		expect(findMetaBindButtonBlock(lines, 1)).not.toBeNull();
	});

	it('handles fences with 4+ backticks', () => {
		const lines = makeLines([
			'````meta-bind-button',
			'label: Test',
			'````',
		]);

		const result = findMetaBindButtonBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.block.yamlContent).toBe('label: Test');
	});

	it('does not close with shorter fence', () => {
		const lines = makeLines([
			'````meta-bind-button',
			'label: Test',
			'```',
			'more content',
			'````',
		]);

		const result = findMetaBindButtonBlock(lines, 0);
		expect(result).not.toBeNull();
		expect(result!.endIdx).toBe(4);
		expect(result!.block.yamlContent).toContain('```');
	});
});
