import { describe, it, expect } from 'vitest';
import { findAllTables } from '$lib/core/markdown-editor/extensions/live-preview/parsers/table';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findMetaBindInputRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findMarkdownLinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Table + inline formatting
// ============================================================

describe('table with formatted cells', () => {
	it('table with formatted cells is found by findAllTables', () => {
		const state = createMarkdownState('| **Bold** | *Italic* |\n| --- | --- |\n| ~~strike~~ | `code` |');
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].headers).toEqual(['**Bold**', '*Italic*']);
		expect(tables[0].rows[0]).toEqual(['~~strike~~', '`code`']);
	});
});

describe('inline parsers in table cell context', () => {
	it('inline parsers detect bold inside extracted table cell', () => {
		const cellText = '**bold**';
		const state = createMarkdownState(cellText);
		const bolds = findBoldRanges(state, 0, cellText.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(2);
		expect(bolds[0].textTo).toBe(6);
	});

	it('inline parsers detect italic inside extracted table cell', () => {
		const cellText = '*italic*';
		const state = createMarkdownState(cellText);
		const italics = findItalicRanges(state, 0, cellText.length);
		expect(italics).toHaveLength(1);
		expect(italics[0].textFrom).toBe(1);
		expect(italics[0].textTo).toBe(7);
	});

	it('inline parsers detect strikethrough inside extracted table cell', () => {
		const cellText = '~~strike~~';
		const state = createMarkdownState(cellText);
		const strikes = findStrikethroughRanges(state, 0, cellText.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0].textFrom).toBe(2);
		expect(strikes[0].textTo).toBe(8);
	});

	it('inline parsers detect inline code inside extracted table cell', () => {
		const cellText = '`code`';
		const state = createMarkdownState(cellText);
		const codes = findInlineCodeRanges(state, 0, cellText.length);
		expect(codes).toHaveLength(1);
		expect(codes[0].textFrom).toBe(1);
		expect(codes[0].textTo).toBe(5);
	});
});

// ============================================================
// Meta-bind input + inline code
// ============================================================

describe('meta-bind input + inline code', () => {
	it('`INPUT[inlineSelect(option(1, a)):field]` — meta-bind input detected', () => {
		const text = '`INPUT[inlineSelect(option(1, a)):field]`';
		const state = createMarkdownState(text);

		const inputs = findMetaBindInputRanges(text, 0);
		expect(inputs).toHaveLength(1);
		expect(inputs[0].inputType).toBe('inlineSelect');
		expect(inputs[0].bindTarget).toBe('field');
		expect(inputs[0].options).toEqual([{ value: '1', label: 'a' }]);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
	});

	it('`regular code` and `INPUT[inlineSelect(option(1, a)):field]` — code and meta-bind both found', () => {
		const text = '`regular code` and `INPUT[inlineSelect(option(1, a)):field]`';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(2);

		const inputs = findMetaBindInputRanges(text, 0);
		expect(inputs).toHaveLength(1);
		expect(inputs[0].bindTarget).toBe('field');
	});
});

// ============================================================
// Table + more inline types
// ============================================================

describe('table cell with highlight', () => {
	it('inline parsers detect highlight inside extracted table cell', () => {
		const cellText = '==highlight==';
		const state = createMarkdownState(cellText);
		const highlights = findHighlightRanges(state, 0, cellText.length);
		expect(highlights).toHaveLength(1);
	});
});

describe('table cell with wikilink', () => {
	it('wikilink detected in extracted table cell text', () => {
		const cellText = '[[note]]';
		const wikilinks = findWikilinkRanges(cellText, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('table cell with link', () => {
	it('markdown link detected in extracted table cell', () => {
		const cellText = '[link](url)';
		const state = createMarkdownState(cellText);
		const links = findMarkdownLinkRanges(state, 0, cellText.length);
		expect(links).toHaveLength(1);
	});
});

// ============================================================
// Meta-bind input + more inline types
// ============================================================

describe('meta-bind input + bold', () => {
	it('**bold** and `INPUT[inlineSelect(option(1, a)):field]` — bold and meta-bind input coexist', () => {
		const text = '**bold** `INPUT[inlineSelect(option(1, a)):field]`';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);

		const inputs = findMetaBindInputRanges(text, 0);
		expect(inputs).toHaveLength(1);
		expect(inputs[0].bindTarget).toBe('field');
	});
});

describe('meta-bind input + wikilink', () => {
	it('[[note]] `INPUT[inlineSelect(option(1, a)):field]` — wikilink and meta-bind input coexist', () => {
		const text = '[[note]] `INPUT[inlineSelect(option(1, a)):field]`';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');

		const inputs = findMetaBindInputRanges(text, 0);
		expect(inputs).toHaveLength(1);
	});
});
