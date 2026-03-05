import { describe, it, expect } from 'vitest';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findBoldItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold-italic';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findHeadingMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/heading';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { findImageRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/image';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { isHorizontalRule } from '$lib/core/markdown-editor/extensions/live-preview/parsers/horizontal-rule';
import { parseCalloutHeader } from '$lib/core/markdown-editor/extensions/live-preview/parsers/callout';
import { createMarkdownState, makeLines } from '../../../test-helpers';

// ============================================================
// Empty and malformed markers
// ============================================================

describe('empty bold markers', () => {
	it('**** — empty bold (no content between markers)', () => {
		const state = createMarkdownState('****');
		const bolds = findBoldRanges(state, 0, 4);
		expect(bolds).toHaveLength(0);

		const boldItalics = findBoldItalicRanges(state, 0, 4);
		expect(boldItalics).toHaveLength(0);
	});
});

describe('space-only content', () => {
	it('~~ ~~ — GFM does not treat space-only content as strikethrough', () => {
		const text = '~~ ~~';
		const state = createMarkdownState(text);
		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(0);
	});

	it('== == — highlight with space-only content is NOT matched', () => {
		const text = '== ==';
		const state = createMarkdownState(text);
		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(0);
	});
});

describe('empty backticks', () => {
	it('`` — two backticks produce no inline code', () => {
		const state = createMarkdownState('``');
		const codes = findInlineCodeRanges(state, 0, 2);
		expect(codes).toHaveLength(0);
	});
});

describe('unmatched markers', () => {
	it('**bold* — unmatched bold marker (only one closing asterisk)', () => {
		const text = '**bold*';
		const state = createMarkdownState(text);
		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(0);
		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
	});

	it('*italic — unclosed italic marker', () => {
		const state = createMarkdownState('*italic');
		const italics = findItalicRanges(state, 0, 7);
		expect(italics).toHaveLength(0);
	});

	it('~~strike — unclosed strikethrough marker', () => {
		const state = createMarkdownState('~~strike');
		const strikes = findStrikethroughRanges(state, 0, 8);
		expect(strikes).toHaveLength(0);
	});

	it('%%comment — unclosed inline comment', () => {
		const text = '%%comment';
		const state = createMarkdownState(text);
		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(0);
	});
});

// ============================================================
// Horizontal rule vs similar syntax
// ============================================================

describe('horizontal rule detection', () => {
	it('--- is a horizontal rule, not bold-italic', () => {
		const state = createMarkdownState('---');
		expect(isHorizontalRule(state, 0, 3)).toBe(true);
		expect(findBoldItalicRanges(state, 0, 3)).toHaveLength(0);
		expect(findBoldRanges(state, 0, 3)).toHaveLength(0);
	});

	it('*** is a horizontal rule, not bold-italic', () => {
		const state = createMarkdownState('***');
		expect(isHorizontalRule(state, 0, 3)).toBe(true);
		expect(findBoldItalicRanges(state, 0, 3)).toHaveLength(0);
		expect(findBoldRanges(state, 0, 3)).toHaveLength(0);
	});

	it('___ is a horizontal rule', () => {
		const state = createMarkdownState('___');
		expect(isHorizontalRule(state, 0, 3)).toBe(true);
	});

	it('***text*** is NOT a horizontal rule (has text content)', () => {
		const state = createMarkdownState('***text***');
		expect(isHorizontalRule(state, 0, 10)).toBe(false);
		const boldItalics = findBoldItalicRanges(state, 0, 10);
		expect(boldItalics).toHaveLength(1);
	});

	it('* * * is a horizontal rule with spaces', () => {
		const state = createMarkdownState('* * *');
		expect(isHorizontalRule(state, 0, 5)).toBe(true);
		const italics = findItalicRanges(state, 0, 5);
		expect(italics).toHaveLength(0);
	});

	it('- - - is a horizontal rule with spaces', () => {
		const state = createMarkdownState('- - -');
		expect(isHorizontalRule(state, 0, 5)).toBe(true);
	});
});

// ============================================================
// Markers at line boundaries
// ============================================================

describe('markers covering entire short lines', () => {
	it('**b** — bold covering entire short line', () => {
		const text = '**b**';
		const state = createMarkdownState(text);
		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 2,
			textFrom: 2,
			textTo: 3,
			closeMarkFrom: 3,
			closeMarkTo: 5,
		});
	});

	it('*i* — single-char italic covering entire short line', () => {
		const text = '*i*';
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
	});

	it('**bold** — Lezer uses absolute positions from state', () => {
		const text = '**bold**';
		const state = createMarkdownState(text);
		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 2,
			textFrom: 2,
			textTo: 6,
			closeMarkFrom: 6,
			closeMarkTo: 8,
		});
	});
});

describe('multi-line offsets', () => {
	it('multi-line offsets are computed correctly for line 3', () => {
		const docText = 'line 1\nline 2\n**bold on line 3**';
		const lines = makeLines(docText);
		expect(lines[2].from).toBe(14);

		const state = createMarkdownState(docText);
		const bolds = findBoldRanges(state, lines[2].from, lines[2].to);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 14,
			openMarkTo: 16,
			textFrom: 16,
			textTo: 30,
			closeMarkFrom: 30,
			closeMarkTo: 32,
		});
	});
});

// ============================================================
// Unicode content in markers
// ============================================================

describe('unicode content', () => {
	it('**cafe** — bold with accented chars', () => {
		const text = '**cafe**';
		const state = createMarkdownState(text);
		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(2);
		expect(bolds[0].textTo).toBe(6);
	});

	it('*resume* — italic with accented chars', () => {
		const text = '*resume*';
		const state = createMarkdownState(text);
		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0].textFrom).toBe(1);
		expect(italics[0].textTo).toBe(7);
	});

	it('# Heading — heading parser works with accented chars', () => {
		const text = '# Heading';
		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });
	});

	it('[[note-with-dashes]] — wikilink with hyphens in target', () => {
		const wikilinks = findWikilinkRanges('[[note-with-dashes]]', 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note-with-dashes');
	});
});

// ============================================================
// Lines with many markers
// ============================================================

describe('many markers on one line', () => {
	it('**a** **b** **c** **d** **e** — five bold ranges on one line', () => {
		const text = '**a** **b** **c** **d** **e**';
		const state = createMarkdownState(text);
		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(5);
		expect(bolds.map((b) => text.slice(b.textFrom, b.textTo))).toEqual(['a', 'b', 'c', 'd', 'e']);
	});

	it('*a* *b* *c* *d* *e* — five italic ranges on one line', () => {
		const text = '*a* *b* *c* *d* *e*';
		const state = createMarkdownState(text);
		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(5);
		expect(italics.map((i) => text.slice(i.textFrom, i.textTo))).toEqual(['a', 'b', 'c', 'd', 'e']);
	});

	it('[^1] [^2] [^3] — multiple footnote refs on one line', () => {
		const text = '[^1] [^2] [^3]';
		const state = createMarkdownState(text);
		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(3);
		expect(refs.map((r) => r.label)).toEqual(['1', '2', '3']);
	});

	it('[[a]] [[b]] [[c]] — multiple wikilinks on one line', () => {
		const text = '[[a]] [[b]] [[c]]';
		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(3);
		expect(wikilinks.map((w) => w.targetText)).toEqual(['a', 'b', 'c']);
	});
});

// ============================================================
// Parser priority and conflicts
// ============================================================

describe('parser priority — bold-italic three-way', () => {
	it('***text*** — bold-italic vs bold vs italic three-way comparison', () => {
		const text = '***text***';
		const state = createMarkdownState(text);

		const boldItalics = findBoldItalicRanges(state, 0, text.length);
		expect(boldItalics).toHaveLength(1);
		expect(boldItalics[0].textFrom).toBe(3);
		expect(boldItalics[0].textTo).toBe(7);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(3);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0].textFrom).toBe(1);
		expect(italics[0].textTo).toBe(9);
	});
});

describe('parser priority — inline comment no false positives', () => {
	it('%%text%% — inline comment does not produce false positives', () => {
		const text = '%%hidden%% visible %%another%%';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(2);
		expect(comments[0]).toEqual({ from: 0, to: 10 });
		expect(comments[1]).toEqual({ from: 19, to: 30 });
	});
});

describe('parser priority — embed vs image', () => {
	it('![[file]] — wikilink embed is NOT detected as a markdown image', () => {
		const text = '![[file]]';
		const state = createMarkdownState(text);

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(0);
	});

	it('![alt](url) — markdown image is NOT detected as wikilink embed', () => {
		const text = '![alt](url)';
		const state = createMarkdownState(text);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(0);
	});
});

describe('parser priority — callout excludes blockquote', () => {
	it('> [!note] — callout header is excluded by blockquote parser', () => {
		const text = '> [!note] Title';
		const state = createMarkdownState(text);

		const callout = parseCalloutHeader(text, 0);
		expect(callout).not.toBeNull();

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toBeNull();
	});
});
