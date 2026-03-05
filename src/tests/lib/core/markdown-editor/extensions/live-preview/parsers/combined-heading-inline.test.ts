import { describe, it, expect } from 'vitest';
import { findHeadingMarkRange, findSetextHeadingRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/heading';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findBoldItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold-italic';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findMarkdownLinkRanges, findAutolinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { findImageRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/image';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findInlineMathRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';
import { findFootnoteRefRanges, findInlineFootnoteRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { createMarkdownState } from '../../../test-helpers';

describe('heading + italic', () => {
	it('# *italic heading* — heading and italic both detected', () => {
		const text = '# *italic heading*';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 2,
			openMarkTo: 3,
			textFrom: 3,
			textTo: 17,
			closeMarkFrom: 17,
			closeMarkTo: 18,
		});
	});

	it('# *1* — heading with italic number', () => {
		const text = '# *1*';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 2,
			openMarkTo: 3,
			textFrom: 3,
			textTo: 4,
			closeMarkFrom: 4,
			closeMarkTo: 5,
		});
	});
});

describe('heading + bold', () => {
	it('# **bold heading** — heading and bold both detected', () => {
		const text = '# **bold heading**';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 2,
			openMarkTo: 4,
			textFrom: 4,
			textTo: 16,
			closeMarkFrom: 16,
			closeMarkTo: 18,
		});
	});
});

describe('heading + strikethrough', () => {
	it('## ~~strikethrough~~ — heading and strikethrough both detected', () => {
		const text = '## ~~strikethrough~~';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 2, markFrom: 0, markTo: 3 });

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0]).toEqual({
			openMarkFrom: 3,
			openMarkTo: 5,
			textFrom: 5,
			textTo: 18,
			closeMarkFrom: 18,
			closeMarkTo: 20,
		});
	});
});

describe('heading + inline code', () => {
	it('### `code heading` — heading and inline code both detected', () => {
		const text = '### `code heading`';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 3, markFrom: 0, markTo: 4 });

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
		expect(codes[0]).toEqual({
			openMarkFrom: 4,
			openMarkTo: 5,
			textFrom: 5,
			textTo: 17,
			closeMarkFrom: 17,
			closeMarkTo: 18,
		});
	});
});

describe('heading + multiple inline styles', () => {
	it('## *italic* and **bold** — heading with multiple inline styles', () => {
		const text = '## *italic* and **bold**';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 2, markFrom: 0, markTo: 3 });

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 3,
			openMarkTo: 4,
			textFrom: 4,
			textTo: 10,
			closeMarkFrom: 10,
			closeMarkTo: 11,
		});

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 16,
			openMarkTo: 18,
			textFrom: 18,
			textTo: 22,
			closeMarkFrom: 22,
			closeMarkTo: 24,
		});
	});
});

describe('heading + wikilink', () => {
	it('# [[wikilink]] — heading and wikilink', () => {
		const text = '# [[wikilink]]';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('wikilink');
	});
});

describe('heading + image', () => {
	it('## ![alt](img.png) — heading and image', () => {
		const text = '## ![alt](img.png)';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 2, markFrom: 0, markTo: 3 });

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
		expect(images[0].altText).toBe('alt');
	});
});

describe('heading + markdown link', () => {
	it('### [link](url) — heading and markdown link', () => {
		const text = '### [link](url)';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 3, markFrom: 0, markTo: 4 });

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
		expect(links[0].textFrom).toBe(5);
		expect(links[0].textTo).toBe(9);
	});
});

describe('heading + bold-italic', () => {
	it('# ***bold italic heading*** — heading and bold-italic', () => {
		const text = '# ***bold italic heading***';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const boldItalics = findBoldItalicRanges(state, 0, text.length);
		expect(boldItalics).toHaveLength(1);
		expect(boldItalics[0].textFrom).toBe(5);
		expect(boldItalics[0].textTo).toBe(24);
	});
});

describe('heading + highlight', () => {
	it('# ==highlighted heading== — heading and highlight both detected', () => {
		const text = '# ==highlighted heading==';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(4);
		expect(highlights[0].textTo).toBe(23);
	});
});

describe('heading + inline comment', () => {
	it('# %%hidden%% heading — heading and inline comment', () => {
		const text = '# %%hidden%% heading';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 2, to: 12 });
	});
});

describe('heading + inline math', () => {
	it('# $x^2$ formula — heading and inline math both detected', () => {
		const text = '# $x^2$ formula';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

describe('heading + block reference', () => {
	it('# heading ^blockid — heading and block reference at end', () => {
		const text = '# heading ^blockid';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

describe('setext heading + inline formatting', () => {
	it('bold text with = underline — setext h1 and bold both detected', () => {
		const docText = '**bold heading**\n===';
		const state = createMarkdownState(docText);

		const setext = findSetextHeadingRange(state, 0, docText.length);
		expect(setext).not.toBeNull();
		expect(setext!.level).toBe(1);

		const line1 = state.doc.line(1);
		const bolds = findBoldRanges(state, line1.from, line1.to);
		expect(bolds).toHaveLength(1);
		expect(bolds[0].textFrom).toBe(2);
		expect(bolds[0].textTo).toBe(14);
	});

	it('italic text with - underline — setext h2 and italic both detected', () => {
		const docText = '*italic heading*\n---';
		const state = createMarkdownState(docText);

		const setext = findSetextHeadingRange(state, 0, docText.length);
		expect(setext).not.toBeNull();
		expect(setext!.level).toBe(2);

		const line1 = state.doc.line(1);
		const italics = findItalicRanges(state, line1.from, line1.to);
		expect(italics).toHaveLength(1);
	});

	it('[link](url) with = underline — setext h1 and link both detected', () => {
		const docText = '[link](url)\n===';
		const state = createMarkdownState(docText);

		const setext = findSetextHeadingRange(state, 0, docText.length);
		expect(setext).not.toBeNull();
		expect(setext!.level).toBe(1);

		const line1 = state.doc.line(1);
		const links = findMarkdownLinkRanges(state, line1.from, line1.to);
		expect(links).toHaveLength(1);
	});
});

describe('heading + autolink', () => {
	it('# <https://example.com> — heading and autolink both detected', () => {
		const text = '# <https://example.com>';

		const state = createMarkdownState(text);
		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const autolinks = findAutolinkRanges(state, 0, text.length);
		expect(autolinks).toHaveLength(1);
		expect(autolinks[0].url).toBe('https://example.com');
	});
});

// ============================================================
// Heading + footnote / inline footnote / wikilink embed
// ============================================================

describe('heading + footnote ref', () => {
	it('# heading [^1] — heading and footnote ref both detected', () => {
		const text = '# heading [^1]';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('heading + inline footnote', () => {
	it('# heading ^[inline note] — heading and inline footnote both detected', () => {
		const text = '# heading ^[inline note]';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
		expect(inlineFn[0].textFrom).toBe(12);
		expect(inlineFn[0].textTo).toBe(23);
	});
});

describe('heading + wikilink embed', () => {
	it('# heading ![[embed]] — heading and wikilink embed both detected', () => {
		const text = '# heading ![[embed]]';
		const state = createMarkdownState(text);

		const heading = findHeadingMarkRange(state, 0, text.length);
		expect(heading).toEqual({ level: 1, markFrom: 0, markTo: 2 });

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('embed');
	});
});

// ============================================================
// Setext heading + more inline types
// ============================================================

describe('setext heading + strikethrough', () => {
	it('~~strike~~ with = underline — setext h1 and strikethrough both detected', () => {
		const docText = '~~strike heading~~\n===';
		const state = createMarkdownState(docText);

		const setext = findSetextHeadingRange(state, 0, docText.length);
		expect(setext).not.toBeNull();
		expect(setext!.level).toBe(1);

		const line1 = state.doc.line(1);
		const strikes = findStrikethroughRanges(state, line1.from, line1.to);
		expect(strikes).toHaveLength(1);
	});
});

describe('setext heading + inline code', () => {
	it('`code` with - underline — setext h2 and inline code both detected', () => {
		const docText = '`code heading`\n---';
		const state = createMarkdownState(docText);

		const setext = findSetextHeadingRange(state, 0, docText.length);
		expect(setext).not.toBeNull();
		expect(setext!.level).toBe(2);

		const line1 = state.doc.line(1);
		const codes = findInlineCodeRanges(state, line1.from, line1.to);
		expect(codes).toHaveLength(1);
	});
});

describe('setext heading + highlight', () => {
	it('==highlight== with = underline — setext h1 and highlight both detected', () => {
		const docText = '==highlight heading==\n===';
		const state = createMarkdownState(docText);

		const setext = findSetextHeadingRange(state, 0, docText.length);
		expect(setext).not.toBeNull();
		expect(setext!.level).toBe(1);

		const line1 = state.doc.line(1);
		const highlights = findHighlightRanges(state, line1.from, line1.to);
		expect(highlights).toHaveLength(1);
	});
});

describe('setext heading + wikilink', () => {
	it('[[note]] with = underline — setext h1 and wikilink both detected', () => {
		const docText = '[[note]] heading\n===';
		const state = createMarkdownState(docText);

		const setext = findSetextHeadingRange(state, 0, docText.length);
		expect(setext).not.toBeNull();
		expect(setext!.level).toBe(1);

		const line1 = state.doc.line(1);
		const wikilinks = findWikilinkRanges(line1.text, line1.from);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('setext heading + inline math', () => {
	it('$x^2$ with = underline — setext h1 and inline math both detected', () => {
		const docText = '$x^2$ formula\n===';
		const state = createMarkdownState(docText);

		const setext = findSetextHeadingRange(state, 0, docText.length);
		expect(setext).not.toBeNull();

		const line1 = state.doc.line(1);
		const maths = findInlineMathRanges(state, line1.from, line1.to);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

describe('setext heading + block reference', () => {
	it('text ^ref with = underline — setext h1 and block reference both detected', () => {
		const docText = 'heading ^ref\n===';
		const state = createMarkdownState(docText);

		const setext = findSetextHeadingRange(state, 0, docText.length);
		expect(setext).not.toBeNull();

		const line1 = state.doc.line(1);
		const ref = findBlockReference(line1.text, line1.from);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('setext heading + footnote ref', () => {
	it('text [^1] with = underline — setext h1 and footnote ref both detected', () => {
		const docText = 'heading [^1]\n===';
		const state = createMarkdownState(docText);

		const setext = findSetextHeadingRange(state, 0, docText.length);
		expect(setext).not.toBeNull();

		const line1 = state.doc.line(1);
		const refs = findFootnoteRefRanges(state, line1.from, line1.to);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});
