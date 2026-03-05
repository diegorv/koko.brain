import { describe, it, expect } from 'vitest';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findMarkdownLinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { findInlineMathRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { findHeadingMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/heading';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { findImageRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/image';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findTaskMarkerRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/task-list';
import { findAllTables } from '$lib/core/markdown-editor/extensions/live-preview/parsers/table';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findMetaBindInputRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input';
import { createMarkdownState, makeLines } from '../../../test-helpers';

// ============================================================
// Inline formatting inside headings
// ============================================================

describe('heading + markdown link', () => {
	it('## [link](url) — heading and link both detected', () => {
		const text = '## [link](https://example.com)';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(2);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
		expect(state.doc.sliceString(links[0].textFrom, links[0].textTo)).toBe('link');
	});
});

describe('heading + wikilink', () => {
	it('## [[note]] — heading and wikilink both detected', () => {
		const text = '## [[note]]';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(2);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('heading + inline math', () => {
	it('## $x^2$ formula — heading and math both detected', () => {
		const text = '## $x^2$ formula';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(2);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

describe('heading + inline code', () => {
	it('## `code` heading — heading and inline code both detected', () => {
		const text = '## `code` heading';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(2);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
		expect(codes[0].textFrom).toBe(4);
		expect(codes[0].textTo).toBe(8);
	});
});

describe('heading + bold + italic combined', () => {
	it('## **bold** and *italic* — heading with multiple inline formats', () => {
		const text = '## **bold** and *italic*';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(2);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
	});
});

describe('heading + strikethrough', () => {
	it('### ~~removed~~ heading — heading and strikethrough', () => {
		const text = '### ~~removed~~ heading';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(3);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
	});
});

describe('heading + footnote ref', () => {
	it('## Title [^1] — heading with footnote reference', () => {
		const text = '## Title [^1]';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(2);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('heading + image', () => {
	it('## ![icon](icon.png) Title — heading with image', () => {
		const text = '## ![icon](icon.png) Title';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(2);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
		expect(images[0].altText).toBe('icon');
	});
});

// ============================================================
// Inline formatting inside blockquotes
// ============================================================

describe('blockquote + markdown link', () => {
	it('> [link](url) — blockquote and link both detected', () => {
		const text = '> [link](https://example.com)';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();
		expect(blockquote!.depth).toBe(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
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
	it('> $E=mc^2$ — blockquote and inline math both detected', () => {
		const text = '> $E=mc^2$';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('E=mc^2');
	});
});

describe('blockquote + bold + link combined', () => {
	it('> **bold** [link](url) — blockquote with bold and link', () => {
		const text = '> **bold** [link](url)';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('nested blockquote + inline formatting', () => {
	it('>> **bold** — nested blockquote preserves inline formatting', () => {
		const text = '>> **bold**';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
	});
});

// ============================================================
// Inline formatting inside list items
// ============================================================

describe('list item + markdown link', () => {
	it('- [link](url) — list item and link both detected', () => {
		const text = '- [link](https://example.com)';
		const state = createMarkdownState(text);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('list item + wikilink', () => {
	it('- [[note]] — list item and wikilink both detected', () => {
		const text = '- [[note]]';
		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('list item + inline math', () => {
	it('- $x^2$ — list item with inline math', () => {
		const text = '- $x^2$';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

describe('task list + bold + link', () => {
	it('- [x] **done** [link](url) — task with bold and link', () => {
		const text = '- [x] **done** [link](url)';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();
		expect(task!.checked).toBe(true);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('task list + wikilink', () => {
	it('- [ ] [[todo note]] — unchecked task with wikilink', () => {
		const text = '- [ ] [[todo note]]';
		const state = createMarkdownState(text);

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();
		expect(task!.checked).toBe(false);

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
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(2);

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
// Multiple inline features inside same heading
// ============================================================

describe('heading with many inline features', () => {
	it('## **bold** `code` [link](url) — heading with three inline types', () => {
		const text = '## **bold** `code` [link](url)';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).not.toBeNull();
		expect(heading!.level).toBe(2);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

// ============================================================
// Multiple inline features inside same blockquote line
// ============================================================

describe('blockquote with many inline features', () => {
	it('> **bold** *italic* `code` [link](url) — blockquote with four inline types', () => {
		const text = '> **bold** *italic* `code` [link](url)';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

// ============================================================
// Multiple inline features inside same list item
// ============================================================

describe('list item with many inline features', () => {
	it('- **bold** [link](url) $x^2$ — list item with three inline types', () => {
		const text = '- **bold** [link](url) $x^2$';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

// ============================================================
// Nested list with inline formatting at different levels
// ============================================================

describe('nested list with inline formatting', () => {
	it('nested lists preserve inline formatting at each level', () => {
		const docText = '- **bold item**\n  - *italic sub-item*\n    - `code sub-sub-item`';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const bolds = findBoldRanges(state, lines[0].from, lines[0].to);
		expect(bolds).toHaveLength(1);

		const italics = findItalicRanges(state, lines[1].from, lines[1].to);
		expect(italics).toHaveLength(1);

		const codes = findInlineCodeRanges(state, lines[2].from, lines[2].to);
		expect(codes).toHaveLength(1);
	});
});

// ============================================================
// Multi-line blockquote with inline formatting on each line
// ============================================================

describe('multi-line blockquote with varied inline', () => {
	it('blockquote lines each have different inline formatting', () => {
		const docText = '> **bold line**\n> *italic line*\n> [link](url)';
		const lines = makeLines(docText);
		const state = createMarkdownState(docText);

		const bolds = findBoldRanges(state, lines[0].from, lines[0].to);
		expect(bolds).toHaveLength(1);

		const italics = findItalicRanges(state, lines[1].from, lines[1].to);
		expect(italics).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, lines[2].from, lines[2].to);
		expect(links).toHaveLength(1);
	});
});
