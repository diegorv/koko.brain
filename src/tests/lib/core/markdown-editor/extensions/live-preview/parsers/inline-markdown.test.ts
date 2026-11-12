import { describe, it, expect } from 'vitest';
import { renderInlineMarkdown } from '#lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.js';

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

describe('renderInlineMarkdown — links, line breaks and escapes', () => {
	it('parses [text](url) into a link segment', () => {
		expect(renderInlineMarkdown('see [Docs](https://x.dev) now')).toEqual([
			{ type: 'text', content: 'see ' },
			{ type: 'link', content: 'Docs', href: 'https://x.dev' },
			{ type: 'text', content: ' now' },
		]);
	});

	it('keeps one level of parentheses in the url', () => {
		expect(renderInlineMarkdown('[x](javascript:alert(1))')).toEqual([
			{ type: 'link', content: 'x', href: 'javascript:alert(1)' },
		]);
	});

	it('resolves backslash escapes in the url', () => {
		expect(renderInlineMarkdown('[a](http://x/a\\|b)')).toEqual([
			{ type: 'link', content: 'a', href: 'http://x/a|b' },
		]);
		expect(renderInlineMarkdown('[a](b\\)c)')).toEqual([{ type: 'link', content: 'a', href: 'b)c' }]);
	});

	it('strips the angle brackets around a url', () => {
		expect(renderInlineMarkdown('[x](<javascript:alert(1)>)')).toEqual([
			{ type: 'link', content: 'x', href: 'javascript:alert(1)' },
		]);
		expect(renderInlineMarkdown('[x](<https://x.dev>)')).toEqual([
			{ type: 'link', content: 'x', href: 'https://x.dev' },
		]);
	});

	it('a url with whitespace is not a link', () => {
		expect(renderInlineMarkdown('[a](b c)')).toEqual([{ type: 'text', content: '[a](b c)' }]);
	});

	it('a failed link with many escape pairs in the url returns without backtracking blowup', () => {
		// Overlapping url alternatives make a failed match exponential in the number of pairs.
		const text = `[a](${'\\\\'.repeat(20)} x`;
		const start = performance.now();
		const segments = renderInlineMarkdown(text);
		const elapsed = performance.now() - start;
		expect(segments).toEqual([{ type: 'text', content: `[a](${'\\'.repeat(20)} x` }]);
		expect(elapsed).toBeLessThan(200);
	});

	it('bare URLs and <url> autolinks stay text', () => {
		expect(renderInlineMarkdown('https://x.dev <https://y.dev>')).toEqual([
			{ type: 'text', content: 'https://x.dev <https://y.dev>' },
		]);
	});

	it.each(['<br>', '<br/>', '<br />', '<BR>', '<Br />'])('%s becomes a break segment', (br) => {
		expect(renderInlineMarkdown(`a${br}b`)).toEqual([
			{ type: 'text', content: 'a' },
			{ type: 'break', content: '' },
			{ type: 'text', content: 'b' },
		]);
	});

	it('unescapes ASCII punctuation and merges the result into one text segment', () => {
		expect(renderInlineMarkdown('a \\| b \\\\ c')).toEqual([{ type: 'text', content: 'a | b \\ c' }]);
	});

	it('an escaped asterisk takes away emphasis', () => {
		expect(renderInlineMarkdown('\\*a\\*')).toEqual([{ type: 'text', content: '*a*' }]);
	});

	it('an escaped asterisk inside emphasis does not close it', () => {
		expect(renderInlineMarkdown('*a\\*b*')).toEqual([{ type: 'italic', content: 'a*b' }]);
	});

	it('a backslash before a non-punctuation character stays literal', () => {
		expect(renderInlineMarkdown('C:\\Users')).toEqual([{ type: 'text', content: 'C:\\Users' }]);
	});

	it('an escaped bracket is not a link', () => {
		expect(renderInlineMarkdown('\\[a](b)')).toEqual([{ type: 'text', content: '[a](b)' }]);
	});

	it('inside a code span only \\| is unescaped, and links and breaks stay literal', () => {
		expect(renderInlineMarkdown('`a \\| b \\\\ [x](y) <br>`')).toEqual([
			{ type: 'code', content: 'a | b \\\\ [x](y) <br>' },
		]);
	});

	it('<b> and other HTML stay text', () => {
		expect(renderInlineMarkdown('<b>x</b>')).toEqual([{ type: 'text', content: '<b>x</b>' }]);
	});
});
