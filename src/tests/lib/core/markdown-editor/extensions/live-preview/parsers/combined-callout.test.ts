import { describe, it, expect } from 'vitest';
import { parseCalloutHeader, findAllCallouts } from '$lib/core/markdown-editor/extensions/live-preview/parsers/callout';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { createMarkdownState } from '../../../test-helpers';

describe('callout header + bold', () => {
	it('> [!note] **Bold Title** — callout header detected with bold in the title', () => {
		const text = '> [!note] **Bold Title**';

		const header = parseCalloutHeader(text, 0);
		expect(header).not.toBeNull();
		expect(header!.type).toBe('note');
	});
});

describe('callout with italic content', () => {
	it('callout with italic content line — callout block detected', () => {
		const docText = '> [!tip] Tip\n> *italic content*';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
		expect(callouts[0].endLine).toBe(2);
	});
});

describe('callout with bold and italic content', () => {
	it('callout block with bold and italic content lines', () => {
		const docText = '> [!note] Title\n> **bold line**\n> *italic line*';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
		expect(callouts[0].startLine).toBe(1);
		expect(callouts[0].endLine).toBe(3);
		expect(callouts[0].header.type).toBe('note');
	});
});

describe('callout with wikilink content', () => {
	it('callout block with wikilink in content', () => {
		const docText = '> [!tip] Tip\n> See [[note]]';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
		expect(callouts[0].endLine).toBe(2);

		const line2 = state.doc.line(2);
		const wikilinks = findWikilinkRanges(line2.text, line2.from);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('callout with code content', () => {
	it('callout block with code in content', () => {
		const docText = '> [!info] Info\n> Use `code` here';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
	});
});

describe('callout with highlight content', () => {
	it('> [!note] Title\\n> ==highlighted text== — callout with highlight in content', () => {
		const docText = '> [!note] Title\n> ==highlighted text==';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
	});
});

describe('callout with footnote content', () => {
	it('> [!note] Title\\n> text [^1] — callout with footnote ref in content', () => {
		const docText = '> [!note] Title\n> text [^1]';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);

		const line2 = state.doc.line(2);
		const refs = findFootnoteRefRanges(state, line2.from, line2.to);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('callout with math content', () => {
	it('> [!note] Title\\n> $x^2$ formula — callout with inline math in content', () => {
		const docText = '> [!note] Title\n> $x^2$ formula';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
	});
});

describe('callout with strikethrough content', () => {
	it('> [!note] Title\\n> ~~strike~~ — callout with strikethrough in content', () => {
		const docText = '> [!note] Title\n> ~~strike~~';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
	});
});

describe('callout with link content', () => {
	it('> [!note] Title\\n> [link](url) — callout with link in content', () => {
		const docText = '> [!note] Title\n> [link](url)';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
	});
});

describe('callout with image content', () => {
	it('> [!note] Title\\n> ![alt](img.png) — callout with image in content', () => {
		const docText = '> [!note] Title\n> ![alt](img.png)';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
	});
});

describe('callout with wikilink embed content', () => {
	it('> [!note] Title\\n> ![[embed]] — callout with wikilink embed in content', () => {
		const docText = '> [!note] Title\n> ![[embed]]';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);

		const line2 = state.doc.line(2);
		const embeds = findWikilinkEmbedRanges(line2.text, line2.from);
		expect(embeds).toHaveLength(1);
	});
});

describe('callout with autolink content', () => {
	it('> [!note] Title\\n> <https://example.com> — callout with autolink in content', () => {
		const docText = '> [!note] Title\n> <https://example.com>';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
	});
});

describe('callout with block reference content', () => {
	it('> [!note] Title\\n> text ^ref — callout with block reference in content', () => {
		const docText = '> [!note] Title\n> text ^ref';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);

		const line2 = state.doc.line(2);
		const ref = findBlockReference(line2.text, line2.from);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('callout with inline comment content', () => {
	it('> [!note] Title\\n> %%hidden%% text — callout with inline comment in content', () => {
		const docText = '> [!note] Title\n> %%hidden%% text';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);

		const line2 = state.doc.line(2);
		const comments = findInlineCommentRanges(state, line2.from, line2.to);
		expect(comments).toHaveLength(1);
	});
});

describe('callout with bold-italic content', () => {
	it('> [!note] Title\\n> ***bold italic*** — callout with bold-italic in content', () => {
		const docText = '> [!note] Title\n> ***bold italic***';
		const state = createMarkdownState(docText);

		const callouts = findAllCallouts(state);
		expect(callouts).toHaveLength(1);
	});
});
