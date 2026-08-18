import { describe, it, expect } from 'vitest';
import { findAllTables } from '$lib/core/markdown-editor/extensions/live-preview/parsers/table';
import { findMetaBindInputRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
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

describe('meta-bind input + code spans', () => {
	it('`INPUT[inlineSelect(option(1, a)):field]` — meta-bind input detected', () => {
		const text = '`INPUT[inlineSelect(option(1, a)):field]`';

		const inputs = findMetaBindInputRanges(text, 0);
		expect(inputs).toHaveLength(1);
		expect(inputs[0].inputType).toBe('inlineSelect');
		expect(inputs[0].bindTarget).toBe('field');
		expect(inputs[0].options).toEqual([{ value: '1', label: 'a' }]);
	});

	it('`regular code` and `INPUT[inlineSelect(option(1, a)):field]` — only the meta-bind span is found', () => {
		const text = '`regular code` and `INPUT[inlineSelect(option(1, a)):field]`';

		const inputs = findMetaBindInputRanges(text, 0);
		expect(inputs).toHaveLength(1);
		expect(inputs[0].bindTarget).toBe('field');
	});
});

// ============================================================
// Table + more inline types
// ============================================================

describe('table cell with wikilink', () => {
	it('wikilink detected in extracted table cell text', () => {
		const cellText = '[[note]]';
		const wikilinks = findWikilinkRanges(cellText, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

// ============================================================
// Meta-bind input + more inline types
// ============================================================

describe('meta-bind input + bold', () => {
	it('**bold** and `INPUT[inlineSelect(option(1, a)):field]` — meta-bind input survives bold markers', () => {
		const text = '**bold** `INPUT[inlineSelect(option(1, a)):field]`';

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
