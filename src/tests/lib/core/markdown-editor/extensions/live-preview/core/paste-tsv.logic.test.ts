import { describe, it, expect } from 'vitest';

import {
	looksLikeTsv,
	tsvToMarkdownTable,
	splitTsv,
	renderMarkdownTable,
} from '$lib/core/markdown-editor/extensions/live-preview/core/paste-tsv.logic';

describe('splitTsv', () => {
	it('splits on tabs and newlines', () => {
		expect(splitTsv('a\tb\nc\td')).toEqual([
			['a', 'b'],
			['c', 'd'],
		]);
	});

	it('accepts \\r\\n line endings (Windows / Excel)', () => {
		expect(splitTsv('a\tb\r\nc\td')).toEqual([
			['a', 'b'],
			['c', 'd'],
		]);
	});

	it('trims trailing empty rows from a final newline', () => {
		expect(splitTsv('a\tb\nc\td\n')).toEqual([
			['a', 'b'],
			['c', 'd'],
		]);
	});

	it('preserves empty cells inside a row', () => {
		expect(splitTsv('a\t\tc')).toEqual([['a', '', 'c']]);
	});
});

describe('looksLikeTsv', () => {
	it('rejects plain text with no tabs', () => {
		expect(looksLikeTsv('hello world')).toBe(false);
	});

	it('rejects a single-row paste (could be code with a lone tab)', () => {
		expect(looksLikeTsv('hi\tthere')).toBe(false);
	});

	it('rejects when column counts disagree across rows', () => {
		expect(looksLikeTsv('a\tb\nc\td\te')).toBe(false);
	});

	it('rejects single-column "rows" even with two lines', () => {
		expect(looksLikeTsv('a\nb')).toBe(false);
	});

	it('accepts a classic Excel two-column paste', () => {
		expect(looksLikeTsv('Name\tAge\nAna\t30\nBruno\t28')).toBe(true);
	});

	it('accepts a wider paste', () => {
		expect(looksLikeTsv('a\tb\tc\nd\te\tf\ng\th\ti')).toBe(true);
	});
});

describe('tsvToMarkdownTable', () => {
	it('produces a valid GFM table from a simple paste', () => {
		const md = tsvToMarkdownTable('Name\tAge\nAna\t30\nBruno\t28');
		expect(md).toBe(
			[
				'| Name  | Age |',
				'| ----- | --- |',
				'| Ana   | 30  |',
				'| Bruno | 28  |',
			].join('\n'),
		);
	});

	it('preserves empty cells', () => {
		const md = tsvToMarkdownTable('A\tB\tC\n1\t\t3');
		// Widths min 3 so `---` stays visible even for 1-char cells.
		expect(md).toBe(['| A   | B   | C   |', '| --- | --- | --- |', '| 1   |     | 3   |'].join('\n'));
	});

	it('expands column width to fit the longest cell (header or body)', () => {
		const md = tsvToMarkdownTable('H\tName\nX\tAlexandre');
		// Second column expanded to "Alexandre" width
		expect(md).toContain('Alexandre');
		// Padding preserves equal widths
		const [headerLine] = md.split('\n');
		const cells = headerLine.split('|').slice(1, -1).map((c) => c.trim().length);
		expect(cells[1]).toBeLessThan(headerLine.length);
	});
});

describe('renderMarkdownTable', () => {
	it('emits header, separator, then rows in order', () => {
		const md = renderMarkdownTable({
			headers: ['a', 'b'],
			rows: [
				['1', '2'],
				['3', '4'],
			],
		});
		const lines = md.split('\n');
		expect(lines).toHaveLength(4);
		expect(lines[1]).toMatch(/^\|\s*-+\s*\|\s*-+\s*\|$/);
	});
});
