import { describe, it, expect } from 'vitest';
import { findAllFencedCodeBlocks, findSpecialFenceBlocks } from '#lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.js';
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

	it('extracts content correctly', () => {
		const doc = '```\nhello\nworld\n```';
		const state = createMarkdownState(doc);
		const blocks = findAllFencedCodeBlocks(state);
		expect(blocks).toHaveLength(1);
		expect(blocks[0].content).toBe('hello\nworld');
	});

	it('gives empty content for an empty block', () => {
		expect(findAllFencedCodeBlocks(createMarkdownState('```\n```'))[0].content).toBe('');
	});

	it('gives empty content for a body of one blank line', () => {
		expect(findAllFencedCodeBlocks(createMarkdownState('```\n\n```'))[0].content).toBe('');
	});

	it('keeps trailing blank lines of the content', () => {
		expect(findAllFencedCodeBlocks(createMarkdownState('```\na\n\n```'))[0].content).toBe('a\n');
	});

	it('gives the content of an unclosed block up to its last line', () => {
		expect(findAllFencedCodeBlocks(createMarkdownState('```\ncode\nmore code'))[0].content).toBe('code\nmore code');
	});

	it('gives every content line without the container prefix', () => {
		const contentOf = (doc: string) => findAllFencedCodeBlocks(createMarkdownState(doc)).map((b) => b.content);
		expect(contentOf('> ```js\n> a = 1\n>   b = 2\n> ```')).toEqual(['a = 1\n  b = 2']);
		expect(contentOf('> > ```js\n> > a\n> > b\n> > ```')).toEqual(['a\nb']);
		expect(contentOf('> ```js\n> a\n>\n> b\n> ```')).toEqual(['a\n\nb']);
		expect(contentOf('- x\n\n  ```js\n  a\n\n  b\n  ```')).toEqual(['a\n\nb']);
		expect(contentOf('> - x\n>   ```\n>   a\n>\n>   b\n>   ```')).toEqual(['a\n\nb']);
	});
});

describe('findSpecialFenceBlocks', () => {
	const find = (doc: string, fenceChars = '`') => findSpecialFenceBlocks(createMarkdownState(doc), 'demo', fenceChars);
	const contents = (doc: string) => find(doc).map((b) => b.content);

	it('returns closed blocks whose info string is the language, with the inner lines as content', () => {
		const doc = 'text\n```demo\na\nb\n```\n```js\nc\n```';
		expect(find(doc)).toEqual([
			{
				openFenceFrom: 5,
				openFenceTo: 12,
				closeFenceFrom: 17,
				closeFenceTo: 20,
				content: 'a\nb',
			},
		]);
	});

	it('gives an empty block an empty content', () => {
		expect(contents('```demo\n```')).toEqual(['']);
	});

	it('gives one content line per line between the fences when the body is blank', () => {
		expect(contents('```demo\n\n```')).toEqual(['']);
		expect(contents('```demo\n\n\n```')).toEqual(['\n']);
		expect(contents('> ```demo\n>\n> ```')).toEqual(['']);
		expect(contents('- ```demo\n\n  ```')).toEqual(['']);
	});

	it('keeps blank, indented and whitespace-only lines of a top-level block', () => {
		expect(contents('```demo\n\na\n\n  b\n   \n```')).toEqual(['\na\n\n  b\n   ']);
	});

	it('skips an unclosed block', () => {
		expect(find('```demo\na')).toEqual([]);
	});

	it('skips a matching fence nested in a larger fence', () => {
		expect(find('````md\n```demo\na\n```\n````')).toEqual([]);
	});

	it('skips a language that only starts with the name', () => {
		expect(find('```demo-js\na\n```')).toEqual([]);
		expect(find('```demo extra\na\n```')).toEqual([]);
	});

	it('accepts only the given fence characters', () => {
		expect(find('~~~demo\na\n~~~')).toEqual([]);
		expect(find('~~~demo\na\n~~~', '`~').map((b) => b.content)).toEqual(['a']);
	});

	it('skips an indented opening fence at the top level', () => {
		expect(find('  ```demo\na\n  ```')).toEqual([]);
	});

	it('strips the quote prefix in a blockquote, keeping blank lines and extra indent', () => {
		const doc = '> ```demo\n> a\n>\n>   b\n> ```';
		expect(find(doc)).toEqual([
			{ openFenceFrom: 0, openFenceTo: 9, closeFenceFrom: doc.length - 5, closeFenceTo: doc.length, content: 'a\n\n  b' },
		]);
	});

	it('strips the quote prefix in a callout', () => {
		expect(contents('> [!note] T\n> ```demo\n> label: Go\n> actions:\n>   - type: open\n> ```')).toEqual([
			'label: Go\nactions:\n  - type: open',
		]);
	});

	it('strips every level of a nested quote', () => {
		expect(contents('> > ```demo\n> > a\n> >  b\n> > ```')).toEqual(['a\n b']);
	});

	it('strips the list item indent', () => {
		expect(contents('- item\n\n  ```demo\n  a\n\n    b\n  ```')).toEqual(['a\n\n  b']);
		expect(contents('- ```demo\n  a\n  ```')).toEqual(['a']);
		expect(contents('1. item\n\n   ```demo\n   a\n   ```')).toEqual(['a']);
	});

	it('strips a quote inside a list item', () => {
		expect(contents('- item\n\n  > ```demo\n  > a\n  > ```')).toEqual(['a']);
	});

	it('strips a list item indent inside a quote', () => {
		expect(contents('> - x\n>\n>   ```demo\n>   a\n>   ```')).toEqual(['a']);
	});

	it('skips a fence indented past the content column of its container', () => {
		expect(find('>  ```demo\n>  a\n>   b\n>  ```')).toEqual([]);
		expect(find('> >  ```demo\n> >  a\n> >  ```')).toEqual([]);
		expect(find('- item\n\n   ```demo\n   a\n    b\n   ```')).toEqual([]);
		expect(find('1. item\n\n    ```demo\n    a\n    ```')).toEqual([]);
	});

	it('accepts a fence at the list content column the marker line sets', () => {
		expect(contents('1.  ```demo\n    a\n    ```')).toEqual(['a']);
		expect(contents('-\n  ```demo\n  a\n  ```')).toEqual(['a']);
	});
});
