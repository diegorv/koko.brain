import { describe, it, expect } from 'vitest';
import { renderInlineMarkdown } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown';

describe('renderInlineMarkdown — basic', () => {
	it('renders plain text as-is', () => {
		const result = renderInlineMarkdown('hello world');
		expect(result).toEqual([{ type: 'text', content: 'hello world' }]);
	});

	it('renders **bold** text', () => {
		const result = renderInlineMarkdown('**bold**');
		expect(result).toEqual([{ type: 'bold', content: 'bold' }]);
	});

	it('renders *italic* text', () => {
		const result = renderInlineMarkdown('*italic*');
		expect(result).toEqual([{ type: 'italic', content: 'italic' }]);
	});

	it('renders ~~strikethrough~~ text', () => {
		const result = renderInlineMarkdown('~~strike~~');
		expect(result).toEqual([{ type: 'strikethrough', content: 'strike' }]);
	});

	it('renders `code` text', () => {
		const result = renderInlineMarkdown('`code`');
		expect(result).toEqual([{ type: 'code', content: 'code' }]);
	});

	it('renders mixed text with bold', () => {
		const result = renderInlineMarkdown('hello **bold** world');
		expect(result).toEqual([
			{ type: 'text', content: 'hello ' },
			{ type: 'bold', content: 'bold' },
			{ type: 'text', content: ' world' },
		]);
	});

	it('renders multiple inline styles', () => {
		const result = renderInlineMarkdown('**bold** and *italic*');
		expect(result).toEqual([
			{ type: 'bold', content: 'bold' },
			{ type: 'text', content: ' and ' },
			{ type: 'italic', content: 'italic' },
		]);
	});

	it('renders empty string', () => {
		const result = renderInlineMarkdown('');
		expect(result).toEqual([]);
	});

	it('renders text with no formatting markers', () => {
		const result = renderInlineMarkdown('just plain text');
		expect(result).toEqual([{ type: 'text', content: 'just plain text' }]);
	});
});

describe('renderInlineMarkdown — extended', () => {
	it('renders ==highlight== as plain text (not supported)', () => {
		const result = renderInlineMarkdown('==highlight==');
		expect(result).toEqual([{ type: 'text', content: '==highlight==' }]);
	});

	it('renders [[wikilink]] as plain text (not supported)', () => {
		const result = renderInlineMarkdown('[[note]]');
		expect(result).toEqual([{ type: 'text', content: '[[note]]' }]);
	});

	it('renders %%comment%% as plain text (not supported)', () => {
		const result = renderInlineMarkdown('%%comment%%');
		expect(result).toEqual([{ type: 'text', content: '%%comment%%' }]);
	});

	it('renders all four supported types in sequence', () => {
		const result = renderInlineMarkdown('`code` **bold** *italic* ~~strike~~');
		expect(result).toEqual([
			{ type: 'code', content: 'code' },
			{ type: 'text', content: ' ' },
			{ type: 'bold', content: 'bold' },
			{ type: 'text', content: ' ' },
			{ type: 'italic', content: 'italic' },
			{ type: 'text', content: ' ' },
			{ type: 'strikethrough', content: 'strike' },
		]);
	});

	it('renders **bold** immediately followed by *italic* — regex handles adjacency', () => {
		const text = '**bold***italic*';
		const result = renderInlineMarkdown(text);
		expect(result).toEqual([
			{ type: 'bold', content: 'bold' },
			{ type: 'italic', content: 'italic' },
		]);
	});

	it('renders ***text*** — bold takes priority, remaining * is trailing text', () => {
		const result = renderInlineMarkdown('***text***');
		expect(result).toEqual([
			{ type: 'bold', content: '*text' },
			{ type: 'text', content: '*' },
		]);
	});
});
