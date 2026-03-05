import { describe, it, expect } from 'vitest';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findMarkdownLinkRanges, findAutolinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { findImageRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/image';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findFootnoteRefRanges, findInlineFootnoteRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findBoldItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold-italic';
import { findOrderedListMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/ordered-list';
import { findTaskMarkerRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/task-list';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { findInlineMathRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';
import { parseCalloutHeader } from '$lib/core/markdown-editor/extensions/live-preview/parsers/callout';
import { createMarkdownState } from '../../../test-helpers';

describe('blockquote + bold', () => {
	it('> **bold text** — blockquote and bold both detected', () => {
		const text = '> **bold text**';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 2,
			openMarkTo: 4,
			textFrom: 4,
			textTo: 13,
			closeMarkFrom: 13,
			closeMarkTo: 15,
		});
	});
});

describe('blockquote + italic and bold', () => {
	it('> *italic* and **bold** — blockquote with italic and bold', () => {
		const text = '> *italic* and **bold**';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 2,
			openMarkTo: 3,
			textFrom: 3,
			textTo: 9,
			closeMarkFrom: 9,
			closeMarkTo: 10,
		});

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 15,
			openMarkTo: 17,
			textFrom: 17,
			textTo: 21,
			closeMarkFrom: 21,
			closeMarkTo: 23,
		});
	});
});

describe('blockquote + link', () => {
	it('> [link](url) — blockquote and link both detected', () => {
		const text = '> [link](url)';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
		expect(links[0]).toEqual({
			openBracketFrom: 2,
			openBracketTo: 3,
			textFrom: 3,
			textTo: 7,
			closeBracketUrlFrom: 7,
			closeBracketUrlTo: 13,
		});
	});
});

describe('blockquote + wikilink', () => {
	it('> [[wikilink]] — blockquote and wikilink both detected', () => {
		const text = '> [[wikilink]]';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].openBracketFrom).toBe(2);
		expect(wikilinks[0].targetText).toBe('wikilink');
		expect(wikilinks[0].closeBracketTo).toBe(14);
	});
});

describe('blockquote + strikethrough', () => {
	it('> ~~strikethrough~~ — blockquote and strikethrough both detected', () => {
		const text = '> ~~strikethrough~~';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0]).toEqual({
			openMarkFrom: 2,
			openMarkTo: 4,
			textFrom: 4,
			textTo: 17,
			closeMarkFrom: 17,
			closeMarkTo: 19,
		});
	});
});

describe('blockquote + image', () => {
	it('> ![alt](img.png) — blockquote and image both detected', () => {
		const text = '> ![alt](img.png)';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
		expect(images[0]).toEqual({
			fullFrom: 2,
			fullTo: 17,
			altText: 'alt',
			url: 'img.png',
		});
	});
});

describe('nested blockquote + inline', () => {
	it('> > **bold nested** — nested blockquote and bold both detected', () => {
		const text = '> > **bold nested**';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();
		expect(blockquote!.depth).toBe(2);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
	});
});

describe('blockquote + task list', () => {
	it('> - [ ] **task** — blockquote, task marker, and bold all detected', () => {
		const text = '> - [ ] **task**';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const task = findTaskMarkerRange(state, 0, text.length);
		expect(task).not.toBeNull();
		expect(task!.checked).toBe(false);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
	});
});

describe('blockquote + ordered list', () => {
	it('> 1. **bold** — blockquote, ordered list, and bold all detected', () => {
		const text = '> 1. **bold**';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const olMark = findOrderedListMarkRange(state, 0, text.length);
		expect(olMark).not.toBeNull();
		expect(olMark!.number).toBe(1);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
	});
});

describe('blockquote + wikilink embed', () => {
	it('> ![[embed]] — blockquote and wikilink embed', () => {
		const text = '> ![[embed]]';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('embed');
	});
});

describe('blockquote + footnote ref', () => {
	it('> [^1] footnote — blockquote and footnote ref', () => {
		const text = '> [^1] footnote';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});

	it('> [^note] — blockquote and footnote ref', () => {
		const text = '> [^note]';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('note');
	});
});

describe('blockquote + highlight', () => {
	it('> ==highlight== — blockquote and highlight', () => {
		const text = '> ==highlight==';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(4);
		expect(highlights[0].textTo).toBe(13);
	});
});

describe('blockquote + inline comment', () => {
	it('> %%hidden%% — blockquote and inline comment', () => {
		const text = '> %%hidden%%';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 2, to: 12 });
	});
});

describe('blockquote + inline math', () => {
	it('> $x^2$ — blockquote and inline math both detected', () => {
		const text = '> $x^2$';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);
		expect(maths[0].formula).toBe('x^2');
	});
});

describe('blockquote + autolink', () => {
	it('> <https://example.com> — blockquote and autolink both detected', () => {
		const text = '> <https://example.com>';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const autolinks = findAutolinkRanges(state, 0, text.length);
		expect(autolinks).toHaveLength(1);
		expect(autolinks[0].url).toBe('https://example.com');
	});
});

describe('blockquote + block reference', () => {
	it('> text ^blockid — blockquote and block reference both detected', () => {
		const text = '> text ^blockid';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

describe('callout header vs blockquote', () => {
	it('> [!note] Title — is callout, NOT a plain blockquote', () => {
		const text = '> [!note] Title';
		const state = createMarkdownState(text);

		const callout = parseCalloutHeader(text, 0);
		expect(callout).not.toBeNull();
		expect(callout!.type).toBe('note');
		expect(callout!.title).toBe('Title');

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toBeNull();
	});

	it('> [!warning]+ Foldable — foldable callout is not blockquote', () => {
		const text = '> [!warning]+ Foldable';
		const state = createMarkdownState(text);

		const callout = parseCalloutHeader(text, 0);
		expect(callout).not.toBeNull();
		expect(callout!.type).toBe('warning');
		expect(callout!.foldable).toBe('+');

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toBeNull();
	});

	it('> normal quote — is blockquote, NOT a callout', () => {
		const text = '> normal quote';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();
		expect(blockquote!.depth).toBe(1);

		const callout = parseCalloutHeader(text, 0);
		expect(callout).toBeNull();
	});
});

describe('blockquote + inline code', () => {
	it('> `code` — blockquote and inline code both detected', () => {
		const text = '> `code`';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);
	});
});

// ============================================================
// Blockquote + bold-italic
// ============================================================

describe('blockquote + bold-italic', () => {
	it('> ***bold italic*** — blockquote and bold-italic both detected', () => {
		const text = '> ***bold italic***';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const boldItalics = findBoldItalicRanges(state, 0, text.length);
		expect(boldItalics).toHaveLength(1);
	});
});

// ============================================================
// Blockquote + inline footnote
// ============================================================

describe('blockquote + inline footnote', () => {
	it('> ^[inline note] — blockquote and inline footnote both detected', () => {
		const text = '> ^[inline note]';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
		expect(inlineFn[0].textFrom).toBe(4);
		expect(inlineFn[0].textTo).toBe(15);
	});
});
