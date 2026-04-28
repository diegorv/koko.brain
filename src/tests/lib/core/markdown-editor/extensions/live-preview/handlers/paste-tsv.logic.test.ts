import { describe, it, expect } from 'vitest';
import {
	looksLikeTSV,
	parseTSVRows,
	tsvRowsToMarkdownTable,
	clipboardToMarkdownTable,
} from '$lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic';

describe('looksLikeTSV', () => {
	it('returns true for tab-separated text with ≥2 columns', () => {
		expect(looksLikeTSV('a\tb\tc')).toBe(true);
		expect(looksLikeTSV('h1\th2\nv1\tv2')).toBe(true);
	});

	it('returns false for plain text without tabs', () => {
		expect(looksLikeTSV('plain text without tabs')).toBe(false);
	});

	it('returns false for empty string / whitespace', () => {
		expect(looksLikeTSV('')).toBe(false);
		expect(looksLikeTSV('   ')).toBe(false);
	});

	it('treats a row with a trailing tab as 2 cells (one empty) — caller decides if that pastes as a 2-col table', () => {
		// `only\t` parses as ['only', ''] (Excel often emits a trailing tab on the last column).
		// `looksLikeTSV` reports tabular; the converter just produces a 2-col table with an empty
		// second cell. Real-world inputs always have ≥2 distinct columns; the edge case is benign.
		expect(looksLikeTSV('only\t')).toBe(true);
	});
});

describe('parseTSVRows', () => {
	it('parses a simple grid', () => {
		expect(parseTSVRows('a\tb\nc\td')).toEqual([
			['a', 'b'],
			['c', 'd'],
		]);
	});

	it('honours `"…"` quoted cells with embedded tabs', () => {
		const input = '"a\tb"\tc';
		expect(parseTSVRows(input)).toEqual([['a\tb', 'c']]);
	});

	it('honours `"…"` quoted cells with embedded newlines', () => {
		const input = '"line1\nline2"\tnext';
		expect(parseTSVRows(input)).toEqual([['line1\nline2', 'next']]);
	});

	it('handles `""` escaped quotes inside a quoted cell', () => {
		const input = '"she said ""hi"""\tend';
		expect(parseTSVRows(input)).toEqual([['she said "hi"', 'end']]);
	});

	it('normalises CRLF line endings', () => {
		expect(parseTSVRows('a\tb\r\nc\td')).toEqual([
			['a', 'b'],
			['c', 'd'],
		]);
	});

	it('drops trailing empty rows', () => {
		expect(parseTSVRows('a\tb\n\n')).toEqual([['a', 'b']]);
	});

	it('preserves empty cells in the middle of a row', () => {
		expect(parseTSVRows('a\t\tc')).toEqual([['a', '', 'c']]);
	});

	it('returns empty array for empty input', () => {
		expect(parseTSVRows('')).toEqual([]);
	});
});

describe('tsvRowsToMarkdownTable', () => {
	it('emits header + separator + body rows', () => {
		const md = tsvRowsToMarkdownTable([
			['name', 'age'],
			['alice', '30'],
			['bob', '25'],
		]);
		expect(md).toBe('| name | age |\n| --- | --- |\n| alice | 30 |\n| bob | 25 |');
	});

	it('escapes `|` characters in cells', () => {
		const md = tsvRowsToMarkdownTable([
			['col-a', 'col-b'],
			['has|pipe', 'plain'],
		]);
		expect(md).toContain('has\\|pipe');
	});

	it('collapses embedded newlines to <br>', () => {
		const md = tsvRowsToMarkdownTable([
			['col'],
			['line1\nline2'],
		]);
		expect(md).toContain('line1<br>line2');
	});

	it('pads short rows to the longest row width', () => {
		const md = tsvRowsToMarkdownTable([
			['a', 'b', 'c'],
			['x'],
		]);
		expect(md).toContain('| x |  |  |');
	});

	it('returns empty string for empty input', () => {
		expect(tsvRowsToMarkdownTable([])).toBe('');
	});
});

describe('clipboardToMarkdownTable', () => {
	it('full pipeline: TSV string → markdown table', () => {
		const md = clipboardToMarkdownTable('name\tage\nalice\t30');
		expect(md).toBe('| name | age |\n| --- | --- |\n| alice | 30 |');
	});

	it('returns null for non-tabular input', () => {
		expect(clipboardToMarkdownTable('plain text')).toBeNull();
	});
});
