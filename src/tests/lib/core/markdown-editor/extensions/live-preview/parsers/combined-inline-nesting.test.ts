import { describe, it, expect } from 'vitest';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findFootnoteRefRanges, findInlineFootnoteRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Strikethrough + inline comment
// ============================================================

describe('strikethrough + inline comment', () => {
	it('~~strike~~ %%hidden%% — inline comment found next to strikethrough', () => {
		const text = '~~strike~~ %%hidden%%';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

// ============================================================
// Strikethrough + footnote ref
// ============================================================

describe('strikethrough + footnote ref', () => {
	it('~~strike~~ [^1] — footnote ref found next to strikethrough', () => {
		const text = '~~strike~~ [^1]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

// ============================================================
// Inline code + inline comment
// ============================================================

describe('inline code + inline comment', () => {
	it('`code` %%hidden%% — inline comment found next to a code span', () => {
		const text = '`code` %%hidden%%';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

// ============================================================
// Inline code + footnote ref
// ============================================================

describe('inline code + footnote ref', () => {
	it('`code` [^1] — footnote ref found next to a code span', () => {
		const text = '`code` [^1]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

// ============================================================
// Inline footnote + various inline types
// ============================================================

describe('inline footnote + strikethrough', () => {
	it('^[note] ~~strike~~ — inline footnote found next to strikethrough', () => {
		const text = '^[note] ~~strike~~';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
		expect(inlineFn[0].textFrom).toBe(2);
		expect(inlineFn[0].textTo).toBe(6);
	});
});

describe('inline footnote + inline code', () => {
	it('^[note] `code` — inline footnote found next to a code span', () => {
		const text = '^[note] `code`';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

describe('inline footnote + highlight', () => {
	it('^[note] ==highlight== — inline footnote found next to a highlight', () => {
		const text = '^[note] ==highlight==';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

describe('inline footnote + inline math', () => {
	it('^[note] $x^2$ — inline footnote detected next to inline math', () => {
		const text = '^[note] $x^2$';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
	});
});

describe('inline footnote + link', () => {
	it('^[note] [link](url) — inline footnote detected next to a markdown link', () => {
		const text = '^[note] [link](url)';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
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
