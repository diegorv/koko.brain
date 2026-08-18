import { describe, it, expect } from 'vitest';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { findBlockquoteMarkRange } from '$lib/core/markdown-editor/extensions/live-preview/parsers/blockquote';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { parseCalloutHeader } from '$lib/core/markdown-editor/extensions/live-preview/parsers/callout';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Empty and malformed markers
// ============================================================

describe('unmatched markers', () => {
	it('%%comment — unclosed inline comment', () => {
		const text = '%%comment';
		const state = createMarkdownState(text);
		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(0);
	});
});

// ============================================================
// Special characters in link targets
// ============================================================

describe('special characters in targets', () => {
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
	it('![[file]] — wikilink embed is detected', () => {
		const text = '![[file]]';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
	});

	it('![alt](url) — markdown image is NOT detected as wikilink embed', () => {
		const text = '![alt](url)';

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
