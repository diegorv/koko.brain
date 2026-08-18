import { describe, it, expect } from 'vitest';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findFootnoteRefRanges, findInlineFootnoteRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';
import { parseCalloutHeader } from '$lib/core/markdown-editor/extensions/live-preview/parsers/callout';
import { createMarkdownState } from '../../../test-helpers';

describe('blockquote + bold', () => {
	it('> **bold text** — blockquote mark detected', () => {
		const text = '> **bold text**';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
	});
});

describe('blockquote + italic and bold', () => {
	it('> *italic* and **bold** — blockquote mark detected', () => {
		const text = '> *italic* and **bold**';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
	});
});

describe('blockquote + link', () => {
	it('> [link](url) — blockquote mark detected on a line with a link', () => {
		const text = '> [link](url)';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
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
	it('> ~~strikethrough~~ — blockquote mark detected', () => {
		const text = '> ~~strikethrough~~';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
	});
});

describe('blockquote + image', () => {
	it('> ![alt](img.png) — blockquote mark detected', () => {
		const text = '> ![alt](img.png)';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
	});
});

describe('nested blockquote + inline', () => {
	it('> > **bold nested** — nested blockquote depth detected', () => {
		const text = '> > **bold nested**';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).not.toBeNull();
		expect(blockquote!.depth).toBe(2);
	});
});

describe('blockquote + task list', () => {
	it('> - [ ] **task** — blockquote mark detected', () => {
		const text = '> - [ ] **task**';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
	});
});

describe('blockquote + ordered list', () => {
	it('> 1. **bold** — blockquote mark detected', () => {
		const text = '> 1. **bold**';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
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
	it('> ==highlight== — blockquote mark detected', () => {
		const text = '> ==highlight==';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
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
	it('> $x^2$ — blockquote mark detected on a line with inline math', () => {
		const text = '> $x^2$';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
	});
});

describe('blockquote + autolink', () => {
	it('> <https://example.com> — blockquote mark detected on a line with an autolink', () => {
		const text = '> <https://example.com>';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
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
	it('> `code` — blockquote mark detected', () => {
		const text = '> `code`';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
	});
});

// ============================================================
// Blockquote + bold-italic
// ============================================================

describe('blockquote + bold-italic', () => {
	it('> ***bold italic*** — blockquote mark detected', () => {
		const text = '> ***bold italic***';
		const state = createMarkdownState(text);

		const blockquote = findBlockquoteMarkRange(state, 0, text.length);
		expect(blockquote).toEqual({ markFrom: 0, markTo: 2, depth: 1 });
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
