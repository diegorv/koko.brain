import { describe, it, expect } from 'vitest';
import { extractTocHeadings } from '$lib/plugins/table-of-contents/toc.logic';

describe('extractTocHeadings', () => {
	it('returns [] for empty string', () => {
		expect(extractTocHeadings('')).toEqual([]);
	});

	it('returns [] when no headings are present', () => {
		const content = 'plain paragraph\nanother line\n- bullet';
		expect(extractTocHeadings(content)).toEqual([]);
	});

	it('extracts a single H1', () => {
		expect(extractTocHeadings('# Title')).toEqual([
			{ level: 1, text: 'Title', line: 0, pos: 0 },
		]);
	});

	it('extracts mixed levels in document order', () => {
		const content = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
		const result = extractTocHeadings(content);
		expect(result.map((h) => ({ level: h.level, text: h.text }))).toEqual([
			{ level: 1, text: 'H1' },
			{ level: 2, text: 'H2' },
			{ level: 3, text: 'H3' },
			{ level: 4, text: 'H4' },
			{ level: 5, text: 'H5' },
			{ level: 6, text: 'H6' },
		]);
	});

	it('reports correct line indices and character positions', () => {
		const content = '# A\nbody line\n## B';
		expect(extractTocHeadings(content)).toEqual([
			{ level: 1, text: 'A', line: 0, pos: 0 },
			{ level: 2, text: 'B', line: 2, pos: 'A'.length + '# '.length + 1 + 'body line'.length + 1 },
		]);
	});

	it('preserves heading order with gaps between levels', () => {
		const content = '# A\n### C';
		const result = extractTocHeadings(content);
		expect(result.map((h) => h.level)).toEqual([1, 3]);
	});

	it('trims trailing whitespace from heading text', () => {
		const content = '# Heading with trailing space   ';
		const result = extractTocHeadings(content);
		expect(result[0].text).toBe('Heading with trailing space');
	});

	it('ignores #NotAHeading (no space after hashes)', () => {
		expect(extractTocHeadings('#nope\n##also-no')).toEqual([]);
	});

	it('skips headings inside a fenced code block (```)', () => {
		const content = '# real one\n```\n# fake heading\n## also fake\n```\n## real two';
		const result = extractTocHeadings(content);
		expect(result.map((h) => h.text)).toEqual(['real one', 'real two']);
	});

	it('skips headings inside a fenced code block (~~~)', () => {
		const content = '# real\n~~~\n# fake\n~~~\n## real two';
		const result = extractTocHeadings(content);
		expect(result.map((h) => h.text)).toEqual(['real', 'real two']);
	});

	it('treats a fenced block with language tag as a fence', () => {
		const content = '# top\n```ts\n# in code\n```\n# bottom';
		const result = extractTocHeadings(content);
		expect(result.map((h) => h.text)).toEqual(['top', 'bottom']);
	});

	it('keeps inline markdown formatting verbatim in heading text', () => {
		const content = '## **bold** and `code`';
		expect(extractTocHeadings(content)).toEqual([
			{ level: 2, text: '**bold** and `code`', line: 0, pos: 0 },
		]);
	});

	it('only accepts up to 6 hashes', () => {
		const content = '####### Seven hashes';
		expect(extractTocHeadings(content)).toEqual([]);
	});
});
