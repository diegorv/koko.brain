import { describe, it, expect } from 'vitest';
import { markdownToPlainText } from '#lib/utils/markdown-plain-text.js';

describe('markdownToPlainText', () => {
	it('returns an empty string for empty input', () => {
		expect(markdownToPlainText('')).toBe('');
		expect(markdownToPlainText('   \n  ')).toBe('');
	});

	it('leaves plain text unchanged', () => {
		expect(markdownToPlainText('just some words')).toBe('just some words');
	});

	it('strips ATX heading markers', () => {
		expect(markdownToPlainText('# Title')).toBe('Title');
		expect(markdownToPlainText('### Deep heading\nbody')).toBe('Deep heading body');
	});

	it('strips bold, italic and strikethrough marks', () => {
		expect(markdownToPlainText('a **bold** and *italic* and __under__ and _em_ and ~~gone~~')).toBe(
			'a bold and italic and under and em and gone',
		);
	});

	it('keeps underscores inside words', () => {
		expect(markdownToPlainText('call my_var_name now')).toBe('call my_var_name now');
	});

	it('strips ==highlight== marks', () => {
		expect(markdownToPlainText('this is ==important== text')).toBe('this is important text');
	});

	it('reduces links to their text and images to their alt text', () => {
		expect(markdownToPlainText('see [the docs](https://example.com/a_b) here')).toBe('see the docs here');
		expect(markdownToPlainText('![a diagram](img/x.png) caption')).toBe('a diagram caption');
	});

	it('removes a link URL that contains one level of parentheses', () => {
		expect(markdownToPlainText('[x](https://en.wikipedia.org/wiki/A_(b)) end')).toBe('x end');
	});

	it('still removes a link whose URL has unbalanced parentheses or is cut by the snippet window', () => {
		expect(markdownToPlainText('[x](a(b) end')).toBe('x end');
		expect(markdownToPlainText('[x](https://en.wikipedia.org/wiki/A_(b)')).toBe('x');
	});

	it('reduces wikilinks to the alias, else the last path segment', () => {
		expect(markdownToPlainText('[[Projects/Website Redesign]]')).toBe('Website Redesign');
		expect(markdownToPlainText('[[Projects/Website Redesign|the site]]')).toBe('the site');
		expect(markdownToPlainText('[[Plain]] and ![[Folder/Embed]]')).toBe('Plain and Embed');
	});

	it('strips checkboxes and list markers', () => {
		expect(markdownToPlainText('- [ ] open task\n- [x] done task')).toBe('open task done task');
		expect(markdownToPlainText('* star item\n+ plus item\n1. first\n2) second')).toBe(
			'star item plus item first second',
		);
	});

	it('strips quote markers', () => {
		expect(markdownToPlainText('> quoted line\n>> nested')).toBe('quoted line nested');
	});

	it('strips callout markers', () => {
		expect(markdownToPlainText('> [!note] Heads up\n> body text')).toBe('Heads up body text');
		expect(markdownToPlainText('> [!warning]- Folded')).toBe('Folded');
	});

	it('strips inline code and fences', () => {
		expect(markdownToPlainText('run `pnpm check` first')).toBe('run pnpm check first');
		expect(markdownToPlainText('```ts\nconst a = 1;\n```')).toBe('const a = 1;');
		expect(markdownToPlainText('~~~\nraw\n~~~')).toBe('raw');
	});

	it('keeps <mark> tags', () => {
		expect(markdownToPlainText('the **<mark>design</mark>** review')).toBe('the <mark>design</mark> review');
		expect(markdownToPlainText('# <mark>Design</mark> sync')).toBe('<mark>Design</mark> sync');
		expect(markdownToPlainText('Works on [[Projects/<mark>Website</mark> Redesign]]')).toBe(
			'Works on <mark>Website</mark> Redesign',
		);
		expect(markdownToPlainText('- [ ] The <mark>Design</mark> of Everyday Things')).toBe(
			'The <mark>Design</mark> of Everyday Things',
		);
	});

	it('tolerates a ... cut through the syntax', () => {
		expect(markdownToPlainText('...old** text and [[Note]] ...')).toBe('...old text and Note ...');
		expect(markdownToPlainText('...ed Note]] and more')).toBe('...ed Note and more');
	});

	it('tolerates syntax cut by the length limit', () => {
		expect(markdownToPlainText('start **bold that never clo')).toBe('start bold that never clo');
		expect(markdownToPlainText('read [the guide](https://exa')).toBe('read the guide');
		expect(markdownToPlainText('see [[Projects/Unfin')).toBe('see Projects/Unfin');
		expect(markdownToPlainText('code `never closed')).toBe('code never closed');
	});
});
