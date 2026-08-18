import { describe, it, expect } from 'vitest';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findAllTables } from '$lib/core/markdown-editor/extensions/live-preview/parsers/table';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findMetaBindInputRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Inline formatting inside headings
// ============================================================

describe('heading + wikilink', () => {
	it('## [[note]] — wikilink detected on a heading line', () => {
		const text = '## [[note]]';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('heading + footnote ref', () => {
	it('## Title [^1] — footnote reference detected on a heading line', () => {
		const text = '## Title [^1]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

// ============================================================
// Inline formatting inside blockquotes
// ============================================================

describe('blockquote + markdown link', () => {
	it('> [link](url) — blockquote mark detected on a line with a link', () => {
		const text = '> [link](https://example.com)';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();
		expect(blockquote!.depth).toBe(1);
	});
});

describe('blockquote + wikilink', () => {
	it('> [[note]] — blockquote and wikilink both detected', () => {
		const text = '> [[note]]';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();
		expect(blockquote!.depth).toBe(1);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('blockquote + inline math', () => {
	it('> $E=mc^2$ — blockquote mark detected on a line with inline math', () => {
		const text = '> $E=mc^2$';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();
	});
});

describe('blockquote + bold + link combined', () => {
	it('> **bold** [link](url) — blockquote mark detected on a mixed inline line', () => {
		const text = '> **bold** [link](url)';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();
	});
});

// ============================================================
// Inline formatting inside list items
// ============================================================

describe('list item + wikilink', () => {
	it('- [[note]] — list item and wikilink both detected', () => {
		const text = '- [[note]]';
		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('task list + wikilink', () => {
	it('- [ ] [[todo note]] — wikilink detected on a task line', () => {
		const text = '- [ ] [[todo note]]';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('todo note');
	});
});

// ============================================================
// Table cells with inline content (raw text preservation)
// ============================================================

describe('table cells with inline formatting', () => {
	it('table cell with **bold** — raw markdown preserved in cell', () => {
		const state = createMarkdownState('| **bold** | normal |\n| --- | --- |\n| data | data |');
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].headers).toEqual(['**bold**', 'normal']);
	});

	it('table cell with [link](url) — link syntax preserved in cell', () => {
		const state = createMarkdownState(
			'| Name | Link |\n| --- | --- |\n| item | [click](https://example.com) |',
		);
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].rows[0][1]).toBe('[click](https://example.com)');
	});

	it('table cell with [[wikilink]] — wikilink syntax preserved in cell', () => {
		const state = createMarkdownState(
			'| Name | Ref |\n| --- | --- |\n| item | [[my note]] |',
		);
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].rows[0][1]).toBe('[[my note]]');
	});

	it('table cell with [[wikilink|display]] — pipe inside wikilink preserved in cell', () => {
		const state = createMarkdownState(
			'| Day | Link |\n| --- | --- |\n| Monday | [[_notes/2026/02-Feb/_journal-day-16-02-2026|Mon 16]] |',
		);
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].rows[0][1]).toBe('[[_notes/2026/02-Feb/_journal-day-16-02-2026|Mon 16]]');
	});

	it('table cell with $math$ — math syntax preserved in cell', () => {
		const state = createMarkdownState(
			'| Formula | Result |\n| --- | --- |\n| $x^2$ | 4 |',
		);
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].rows[0][0]).toBe('$x^2$');
	});

	it('table cell with meta-bind INPUT — meta-bind syntax preserved in cell', () => {
		const state = createMarkdownState(
			'| Field | Value |\n| --- | --- |\n| Status | `INPUT[inlineSelect(todo, doing, done):status]` |',
		);
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].rows[0][1]).toBe('`INPUT[inlineSelect(todo, doing, done):status]`');
	});

	it('table cell with [^footnote] — footnote ref preserved in cell', () => {
		const state = createMarkdownState(
			'| Note | Ref |\n| --- | --- |\n| text | see [^1] |',
		);
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].rows[0][1]).toBe('see [^1]');
	});

	it('table with mixed inline content in multiple cells', () => {
		const state = createMarkdownState(
			'| Feature | Example | Status |\n| --- | --- | --- |\n| **Bold** | [link](url) | `INPUT[inlineSelect(ok, fail):status]` |\n| *Italic* | [[wikilink]] | ~~removed~~ |',
		);
		const tables = findAllTables(state);
		expect(tables).toHaveLength(1);
		expect(tables[0].rows).toHaveLength(2);
		expect(tables[0].rows[0][0]).toBe('**Bold**');
		expect(tables[0].rows[0][1]).toBe('[link](url)');
		expect(tables[0].rows[0][2]).toBe('`INPUT[inlineSelect(ok, fail):status]`');
		expect(tables[0].rows[1][0]).toBe('*Italic*');
		expect(tables[0].rows[1][1]).toBe('[[wikilink]]');
		expect(tables[0].rows[1][2]).toBe('~~removed~~');
	});
});

// ============================================================
// Meta-bind INPUT inside table cells (regex parser)
// ============================================================

describe('meta-bind INPUT inside table cell text', () => {
	it('meta-bind regex finds INPUT in table cell raw text', () => {
		const cellText = '`INPUT[inlineSelect(option(todo, To Do), option(done, Done)):status]`';
		const ranges = findMetaBindInputRanges(cellText, 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].bindTarget).toBe('status');
		expect(ranges[0].options).toHaveLength(2);
	});

	it('meta-bind regex finds INPUT with simple options in table cell', () => {
		const cellText = '`INPUT[inlineSelect(todo, doing, done):status]`';
		const ranges = findMetaBindInputRanges(cellText, 0);
		expect(ranges).toHaveLength(1);
		expect(ranges[0].bindTarget).toBe('status');
	});
});

// ============================================================
// Wikilink with display text inside containers
// ============================================================

describe('wikilink with display text inside heading', () => {
	it('## [[note|Display]] — heading with wikilink display text', () => {
		const text = '## [[note|Display]]';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
		expect(wikilinks[0].displayFrom).not.toBeNull();
		expect(wikilinks[0].displayTo).not.toBeNull();
		expect(text.slice(wikilinks[0].displayFrom!, wikilinks[0].displayTo!)).toBe('|Display');
	});
});

describe('wikilink with heading ref inside blockquote', () => {
	it('> [[note#heading]] — blockquote with wikilink heading ref', () => {
		const text = '> [[note#heading]]';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

// ============================================================
// Multiple inline features inside same blockquote line
// ============================================================

describe('blockquote with many inline features', () => {
	it('> **bold** *italic* `code` [link](url) — blockquote mark detected among four inline types', () => {
		const text = '> **bold** *italic* `code` [link](url)';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();
	});
});
