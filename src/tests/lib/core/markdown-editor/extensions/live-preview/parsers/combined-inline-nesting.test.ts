import { describe, it, expect } from 'vitest';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findBoldItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold-italic';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findFootnoteRefRanges, findInlineFootnoteRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findInlineMathRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { findMarkdownLinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Bold + Italic interactions
// ============================================================

describe('bold + italic — side by side', () => {
	it('*italic* **bold** — each parser finds only its own', () => {
		const text = '*italic* **bold**';
		const state = createMarkdownState(text);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 1,
			textFrom: 1,
			textTo: 7,
			closeMarkFrom: 7,
			closeMarkTo: 8,
		});

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 9,
			openMarkTo: 11,
			textFrom: 11,
			textTo: 15,
			closeMarkFrom: 15,
			closeMarkTo: 17,
		});
	});

	it('*A* **B** — adjacent italic and bold', () => {
		const text = '*A* **B**';
		const state = createMarkdownState(text);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 1,
			textFrom: 1,
			textTo: 2,
			closeMarkFrom: 2,
			closeMarkTo: 3,
		});

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 4,
			openMarkTo: 6,
			textFrom: 6,
			textTo: 7,
			closeMarkFrom: 7,
			closeMarkTo: 9,
		});
	});
});

describe('bold + italic — nesting', () => {
	it('***bold and italic*** — Lezer: bold is inner StrongEmphasis, italic is outer Emphasis', () => {
		const text = '***bold and italic***';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(3);
		expect(bolds[0].textTo).toBe(18);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0].textFrom).toBe(1);
		expect(italics[0].textTo).toBe(20);
	});

	it('*italic **bold inside** more* — italic wraps bold', () => {
		const text = '*italic **bold inside** more*';
		const state = createMarkdownState(text);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 1,
			textFrom: 1,
			textTo: 28,
			closeMarkFrom: 28,
			closeMarkTo: 29,
		});

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 8,
			openMarkTo: 10,
			textFrom: 10,
			textTo: 21,
			closeMarkFrom: 21,
			closeMarkTo: 23,
		});
	});
});

// ============================================================
// Multiple inline styles on same line
// ============================================================

describe('multiple inline styles on same line', () => {
	it('*a* **b** ~~c~~ `d` — all four inline parsers detect their match', () => {
		const text = '*a* **b** ~~c~~ `d`';
		const state = createMarkdownState(text);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 1,
			textFrom: 1,
			textTo: 2,
			closeMarkFrom: 2,
			closeMarkTo: 3,
		});

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 4,
			openMarkTo: 6,
			textFrom: 6,
			textTo: 7,
			closeMarkFrom: 7,
			closeMarkTo: 9,
		});

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0]).toEqual({
			openMarkFrom: 10,
			openMarkTo: 12,
			textFrom: 12,
			textTo: 13,
			closeMarkFrom: 13,
			closeMarkTo: 15,
		});

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
		expect(codes[0]).toEqual({
			openMarkFrom: 16,
			openMarkTo: 17,
			textFrom: 17,
			textTo: 18,
			closeMarkFrom: 18,
			closeMarkTo: 19,
		});
	});

	it('**bold** and `code` and *italic* — three inline styles', () => {
		const text = '**bold** and `code` and *italic*';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(2);
		expect(bolds[0].textTo).toBe(6);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
		expect(codes[0].textFrom).toBe(14);
		expect(codes[0].textTo).toBe(18);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0].textFrom).toBe(25);
		expect(italics[0].textTo).toBe(31);
	});

	it('~~strike~~ **bold** *italic* — three inline styles', () => {
		const text = '~~strike~~ **bold** *italic*';
		const state = createMarkdownState(text);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0].textFrom).toBe(2);
		expect(strikes[0].textTo).toBe(8);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(13);
		expect(bolds[0].textTo).toBe(17);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0].textFrom).toBe(21);
		expect(italics[0].textTo).toBe(27);
	});
});

// ============================================================
// Nested/overlapping formatting
// ============================================================

describe('nested formatting — strikethrough + bold', () => {
	it('~~**bold strike**~~ — strikethrough wraps bold, both detected', () => {
		const text = '~~**bold strike**~~';
		const state = createMarkdownState(text);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 2,
			textFrom: 2,
			textTo: 17,
			closeMarkFrom: 17,
			closeMarkTo: 19,
		});

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 2,
			openMarkTo: 4,
			textFrom: 4,
			textTo: 15,
			closeMarkFrom: 15,
			closeMarkTo: 17,
		});
	});

	it('**~~strike bold~~** — bold wraps strikethrough, both detected', () => {
		const text = '**~~strike bold~~**';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 2,
			textFrom: 2,
			textTo: 17,
			closeMarkFrom: 17,
			closeMarkTo: 19,
		});

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0]).toEqual({
			openMarkFrom: 2,
			openMarkTo: 4,
			textFrom: 4,
			textTo: 15,
			closeMarkFrom: 15,
			closeMarkTo: 17,
		});
	});
});

describe('nested formatting — italic + strikethrough', () => {
	it('*~~italic strike~~* — italic wraps strikethrough, both detected', () => {
		const text = '*~~italic strike~~*';
		const state = createMarkdownState(text);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 1,
			textFrom: 1,
			textTo: 18,
			closeMarkFrom: 18,
			closeMarkTo: 19,
		});

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0]).toEqual({
			openMarkFrom: 1,
			openMarkTo: 3,
			textFrom: 3,
			textTo: 16,
			closeMarkFrom: 16,
			closeMarkTo: 18,
		});
	});

	it('~~*italic strike*~~ — strikethrough wraps italic, both detected', () => {
		const text = '~~*italic strike*~~';
		const state = createMarkdownState(text);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 2,
			textFrom: 2,
			textTo: 17,
			closeMarkFrom: 17,
			closeMarkTo: 19,
		});

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 2,
			openMarkTo: 3,
			textFrom: 3,
			textTo: 16,
			closeMarkFrom: 16,
			closeMarkTo: 17,
		});
	});
});

// ============================================================
// Inline code overlapping other syntax
// ============================================================

describe('inline code suppresses bold', () => {
	it('`**not bold**` — inline code suppresses bold inside', () => {
		const text = '`**not bold**`';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
		expect(codes[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 1,
			textFrom: 1,
			textTo: 13,
			closeMarkFrom: 13,
			closeMarkTo: 14,
		});

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(0);
	});
});

describe('inline code suppresses italic', () => {
	it('`*not italic*` — inline code suppresses italic inside', () => {
		const text = '`*not italic*`';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
		expect(codes[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 1,
			textFrom: 1,
			textTo: 13,
			closeMarkFrom: 13,
			closeMarkTo: 14,
		});

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(0);
	});
});

describe('inline code suppresses strikethrough', () => {
	it('`~~not strike~~` — inline code suppresses strikethrough inside', () => {
		const text = '`~~not strike~~`';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
		expect(codes[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 1,
			textFrom: 1,
			textTo: 15,
			closeMarkFrom: 15,
			closeMarkTo: 16,
		});

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(0);
	});
});

// ============================================================
// Bold-italic + other
// ============================================================

describe('bold-italic + strikethrough', () => {
	it('***bi*** and ~~strike~~ — both detected independently', () => {
		const text = '***bi*** and ~~strike~~';
		const state = createMarkdownState(text);

		const boldItalics = findBoldItalicRanges(state, 0, text.length);
		expect(boldItalics).toHaveLength(1);
		expect(boldItalics[0].textFrom).toBe(3);
		expect(boldItalics[0].textTo).toBe(5);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0].textFrom).toBe(15);
		expect(strikes[0].textTo).toBe(21);
	});
});

describe('bold-italic + bold', () => {
	it('***bi*** does not break plain **bold** detection', () => {
		const text = '***bi*** and **bold**';
		const state = createMarkdownState(text);

		const boldItalics = findBoldItalicRanges(state, 0, text.length);
		expect(boldItalics).toHaveLength(1);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(2);
		expect(bolds[1].textFrom).toBe(15);
		expect(bolds[1].textTo).toBe(19);
	});
});

describe('bold-italic + inline code (suppression)', () => {
	it('`***not bold-italic***` — inline code suppresses bold-italic inside', () => {
		const text = '`***not bold-italic***`';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);

		const boldItalics = findBoldItalicRanges(state, 0, text.length);
		expect(boldItalics).toHaveLength(0);
	});
});

// ============================================================
// Adjacent markers without space
// ============================================================

describe('adjacent markers without space', () => {
	it('**bold***italic* — both detected (no lookbehind limitation)', () => {
		const text = '**bold***italic*';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(2);
		expect(bolds[0].textTo).toBe(6);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0].textFrom).toBe(9);
		expect(italics[0].textTo).toBe(15);
	});

	it('*italic***bold** — both detected (no lookbehind limitation)', () => {
		const text = '*italic***bold**';
		const state = createMarkdownState(text);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0].textFrom).toBe(1);
		expect(italics[0].textTo).toBe(7);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(10);
		expect(bolds[0].textTo).toBe(14);
	});

	it('==highlight====more== — two adjacent highlights', () => {
		const text = '==highlight====more==';
		const state = createMarkdownState(text);
		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(2);
		expect(highlights[0].textFrom).toBe(2);
		expect(highlights[0].textTo).toBe(11);
		expect(highlights[1].textFrom).toBe(15);
		expect(highlights[1].textTo).toBe(19);
	});
});

// ============================================================
// Triple nesting
// ============================================================

describe('triple nesting', () => {
	it('==**~~triple nesting~~**== — highlight wraps bold wraps strikethrough', () => {
		const text = '==**~~triple nesting~~**==';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
	});
});

// ============================================================
// Italic + highlight nesting
// ============================================================

describe('italic wraps highlight', () => {
	it('*==highlighted italic==* — italic wraps highlight', () => {
		const text = '*==highlighted italic==*';
		const state = createMarkdownState(text);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0].textFrom).toBe(1);
		expect(italics[0].textTo).toBe(23);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(3);
		expect(highlights[0].textTo).toBe(21);
	});
});

describe('highlight wraps italic', () => {
	it('==*italic highlight*== — highlight wraps italic', () => {
		const text = '==*italic highlight*==';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
	});
});

// ============================================================
// Strikethrough + inline comment
// ============================================================

describe('strikethrough + inline comment', () => {
	it('~~strike~~ %%hidden%% — strikethrough and inline comment coexist', () => {
		const text = '~~strike~~ %%hidden%%';
		const state = createMarkdownState(text);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

// ============================================================
// Strikethrough + footnote ref
// ============================================================

describe('strikethrough + footnote ref', () => {
	it('~~strike~~ [^1] — strikethrough and footnote ref coexist', () => {
		const text = '~~strike~~ [^1]';
		const state = createMarkdownState(text);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

// ============================================================
// Inline code + inline comment
// ============================================================

describe('inline code + inline comment', () => {
	it('`code` %%hidden%% — inline code and inline comment coexist', () => {
		const text = '`code` %%hidden%%';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

// ============================================================
// Inline code + footnote ref
// ============================================================

describe('inline code + footnote ref', () => {
	it('`code` [^1] — inline code and footnote ref coexist', () => {
		const text = '`code` [^1]';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

// ============================================================
// Bold-italic + italic
// ============================================================

describe('bold-italic + standalone italic', () => {
	it('***bi*** *italic* — bold-italic and standalone italic coexist', () => {
		const text = '***bi*** *italic*';
		const state = createMarkdownState(text);

		const boldItalics = findBoldItalicRanges(state, 0, text.length);
		expect(boldItalics).toHaveLength(1);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics.length).toBeGreaterThanOrEqual(1);
	});
});

// ============================================================
// Inline footnote + various inline types
// ============================================================

describe('inline footnote + strikethrough', () => {
	it('^[note] ~~strike~~ — inline footnote and strikethrough coexist', () => {
		const text = '^[note] ~~strike~~';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
		expect(inlineFn[0].textFrom).toBe(2);
		expect(inlineFn[0].textTo).toBe(6);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
	});
});

describe('inline footnote + inline code', () => {
	it('^[note] `code` — inline footnote and inline code coexist', () => {
		const text = '^[note] `code`';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
	});
});

describe('inline footnote + highlight', () => {
	it('^[note] ==highlight== — inline footnote and highlight coexist', () => {
		const text = '^[note] ==highlight==';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
	});
});

describe('inline footnote + inline math', () => {
	it('^[note] $x^2$ — inline footnote and inline math coexist', () => {
		const text = '^[note] $x^2$';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

describe('inline footnote + link', () => {
	it('^[note] [link](url) — inline footnote and link coexist', () => {
		const text = '^[note] [link](url)';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('inline footnote + wikilink', () => {
	it('^[note] [[wikilink]] — inline footnote and wikilink coexist', () => {
		const text = '^[note] [[wikilink]]';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('wikilink');
	});
});
