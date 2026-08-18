import { describe, it, expect } from 'vitest';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';
import { findFootnoteRefRanges, findInlineFootnoteRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { createMarkdownState } from '../../../test-helpers';

describe('heading + wikilink', () => {
	it('# [[wikilink]] — wikilink detected on a heading line', () => {
		const text = '# [[wikilink]]';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('wikilink');
	});
});

describe('heading + inline comment', () => {
	it('# %%hidden%% heading — inline comment detected on a heading line', () => {
		const text = '# %%hidden%% heading';

		const state = createMarkdownState(text);
		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
		expect(comments[0]).toEqual({ from: 2, to: 12 });
	});
});

describe('heading + block reference', () => {
	it('# heading ^blockid — block reference detected at end of a heading line', () => {
		const text = '# heading ^blockid';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

// ============================================================
// Heading + footnote / inline footnote / wikilink embed
// ============================================================

describe('heading + footnote ref', () => {
	it('# heading [^1] — footnote ref detected on a heading line', () => {
		const text = '# heading [^1]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('heading + inline footnote', () => {
	it('# heading ^[inline note] — inline footnote detected on a heading line', () => {
		const text = '# heading ^[inline note]';
		const state = createMarkdownState(text);

		const inlineFn = findInlineFootnoteRanges(state, 0, text.length);
		expect(inlineFn).toHaveLength(1);
		expect(inlineFn[0].textFrom).toBe(12);
		expect(inlineFn[0].textTo).toBe(23);
	});
});

describe('heading + wikilink embed', () => {
	it('# heading ![[embed]] — wikilink embed detected on a heading line', () => {
		const text = '# heading ![[embed]]';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('embed');
	});
});

// ============================================================
// Setext heading + more inline types
// ============================================================

describe('setext heading + wikilink', () => {
	it('[[note]] with = underline — wikilink detected on the setext text line', () => {
		const docText = '[[note]] heading\n===';
		const state = createMarkdownState(docText);

		const line1 = state.doc.line(1);
		const wikilinks = findWikilinkRanges(line1.text, line1.from);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('setext heading + block reference', () => {
	it('text ^ref with = underline — block reference detected on the setext text line', () => {
		const docText = 'heading ^ref\n===';
		const state = createMarkdownState(docText);

		const line1 = state.doc.line(1);
		const ref = findBlockReference(line1.text, line1.from);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('setext heading + footnote ref', () => {
	it('text [^1] with = underline — footnote ref detected on the setext text line', () => {
		const docText = 'heading [^1]\n===';
		const state = createMarkdownState(docText);

		const line1 = state.doc.line(1);
		const refs = findFootnoteRefRanges(state, line1.from, line1.to);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});
