import { describe, it, expect } from 'vitest';
import { findBoldRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/bold';
import { findItalicRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/italic';
import { findMarkdownLinkRanges, findAutolinkRanges, findExtendedAutolinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { findImageRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/image';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { findStrikethroughRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/strikethrough';
import { findHighlightRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/highlight';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findInlineCodeRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/inline-code';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findInlineMathRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/math';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Link/image + formatting
// ============================================================

describe('bold wraps link', () => {
	it('**[link text](url)** — bold wraps entire link', () => {
		const text = '**[link text](url)**';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 2,
			textFrom: 2,
			textTo: 18,
			closeMarkFrom: 18,
			closeMarkTo: 20,
		});

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
		expect(links[0]).toEqual({
			openBracketFrom: 2,
			openBracketTo: 3,
			textFrom: 3,
			textTo: 12,
			closeBracketUrlFrom: 12,
			closeBracketUrlTo: 18,
		});
	});
});

describe('italic wraps link', () => {
	it('*[link](url)* — italic wraps entire link', () => {
		const text = '*[link](url)*';
		const state = createMarkdownState(text);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 1,
			textFrom: 1,
			textTo: 12,
			closeMarkFrom: 12,
			closeMarkTo: 13,
		});

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
		expect(links[0]).toEqual({
			openBracketFrom: 1,
			openBracketTo: 2,
			textFrom: 2,
			textTo: 6,
			closeBracketUrlFrom: 6,
			closeBracketUrlTo: 12,
		});
	});
});

describe('bold inside link text', () => {
	it('[**bold text**](url) — bold inside link text', () => {
		const text = '[**bold text**](url)';
		const state = createMarkdownState(text);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
		expect(links[0]).toEqual({
			openBracketFrom: 0,
			openBracketTo: 1,
			textFrom: 1,
			textTo: 14,
			closeBracketUrlFrom: 14,
			closeBracketUrlTo: 20,
		});

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 1,
			openMarkTo: 3,
			textFrom: 3,
			textTo: 12,
			closeMarkFrom: 12,
			closeMarkTo: 14,
		});
	});
});

describe('image + bold on same line', () => {
	it('![alt](img.png) **caption** — image and bold on same line', () => {
		const text = '![alt](img.png) **caption**';
		const state = createMarkdownState(text);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
		expect(images[0]).toEqual({
			fullFrom: 0,
			fullTo: 15,
			altText: 'alt',
			url: 'img.png',
		});

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 16,
			openMarkTo: 18,
			textFrom: 18,
			textTo: 25,
			closeMarkFrom: 25,
			closeMarkTo: 27,
		});
	});
});

// ============================================================
// Wikilink + formatting
// ============================================================

describe('bold wraps wikilink', () => {
	it('**[[note]]** — bold wraps wikilink', () => {
		const text = '**[[note]]**';
		const state = createMarkdownState(text);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 2,
			textFrom: 2,
			textTo: 10,
			closeMarkFrom: 10,
			closeMarkTo: 12,
		});

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].openBracketFrom).toBe(2);
		expect(wikilinks[0].openBracketTo).toBe(4);
		expect(wikilinks[0].targetFrom).toBe(4);
		expect(wikilinks[0].targetTo).toBe(8);
		expect(wikilinks[0].targetText).toBe('note');
		expect(wikilinks[0].closeBracketFrom).toBe(8);
		expect(wikilinks[0].closeBracketTo).toBe(10);
	});
});

describe('italic wraps wikilink', () => {
	it('*[[note]]* — italic wraps wikilink', () => {
		const text = '*[[note]]*';
		const state = createMarkdownState(text);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0]).toEqual({
			openMarkFrom: 0,
			openMarkTo: 1,
			textFrom: 1,
			textTo: 9,
			closeMarkFrom: 9,
			closeMarkTo: 10,
		});

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].openBracketFrom).toBe(1);
		expect(wikilinks[0].targetText).toBe('note');
		expect(wikilinks[0].closeBracketTo).toBe(9);
	});
});

describe('wikilink + bold on same line', () => {
	it('text [[note]] and **bold** — wikilink and bold on same line', () => {
		const text = 'text [[note]] and **bold**';
		const state = createMarkdownState(text);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].openBracketFrom).toBe(5);
		expect(wikilinks[0].targetText).toBe('note');
		expect(wikilinks[0].closeBracketTo).toBe(13);

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
		expect(bolds[0]).toEqual({
			openMarkFrom: 18,
			openMarkTo: 20,
			textFrom: 20,
			textTo: 24,
			closeMarkFrom: 24,
			closeMarkTo: 26,
		});
	});
});

describe('wikilink + markdown link coexist', () => {
	it('[[note|display]] and [link](url) — wikilink and markdown link coexist', () => {
		const text = '[[note|display]] and [link](url)';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
		expect(wikilinks[0].displayFrom).not.toBeNull();
		expect(wikilinks[0].closeBracketTo).toBe(16);

		const state = createMarkdownState(text);
		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
		expect(links[0]).toEqual({
			openBracketFrom: 21,
			openBracketTo: 22,
			textFrom: 22,
			textTo: 26,
			closeBracketUrlFrom: 26,
			closeBracketUrlTo: 32,
		});
	});
});

describe('wikilink heading-only + regular wikilink', () => {
	it('[[#Heading]] and [[Note]] — heading-only and regular wikilink both detected', () => {
		const text = '[[#Heading]] and [[Note]]';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(2);
		expect(wikilinks[0].targetText).toBe('');
		expect(wikilinks[1].targetText).toBe('Note');
	});
});

// ============================================================
// Wikilink embed + inline formatting
// ============================================================

describe('wikilink embed + bold', () => {
	it('**bold** ![[note]] — bold and wikilink embed on same line', () => {
		const text = '**bold** ![[note]]';
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

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('note');
		expect(embeds[0].type).toBe('note');
		expect(embeds[0].fullFrom).toBe(9);
		expect(embeds[0].fullTo).toBe(18);
	});
});

describe('wikilink embed + italic', () => {
	it('![[image.png]] *italic caption* — embed and italic coexist', () => {
		const text = '![[image.png]] *italic caption*';
		const state = createMarkdownState(text);

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('image.png');
		expect(embeds[0].type).toBe('image');

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
		expect(italics[0].textFrom).toBe(16);
		expect(italics[0].textTo).toBe(30);
	});
});

describe('wikilink embed with heading anchor + highlight', () => {
	it('![[note#heading]] and ==highlight== — embed with heading anchor + highlight', () => {
		const text = '![[note#heading]] and ==highlight==';
		const state = createMarkdownState(text);

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('note');
		expect(embeds[0].heading).toBe('heading');
		expect(embeds[0].blockId).toBeNull();

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);
		expect(highlights[0].textFrom).toBe(24);
		expect(highlights[0].textTo).toBe(33);
	});
});

describe('wikilink embed with display + strikethrough', () => {
	it('![[image.png|300]] ~~strike~~ — embed with display + strikethrough', () => {
		const text = '![[image.png|300]] ~~strike~~';
		const state = createMarkdownState(text);

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('image.png');
		expect(embeds[0].display).toBe('300');
		expect(embeds[0].type).toBe('image');

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
		expect(strikes[0].textFrom).toBe(21);
		expect(strikes[0].textTo).toBe(27);
	});
});

// ============================================================
// Wikilink embed vs markdown image disambiguation
// ============================================================

describe('wikilink embed vs markdown image', () => {
	it('![[file]] — wikilink embed is NOT detected as a markdown image', () => {
		const text = '![[file]]';
		const state = createMarkdownState(text);

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('file');

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(0);
	});

	it('![alt](url) — markdown image is NOT detected as wikilink embed', () => {
		const text = '![alt](url)';
		const state = createMarkdownState(text);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
		expect(images[0].altText).toBe('alt');

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(0);
	});

	it('![alt](img.png) and ![[embed.png]] — image and wikilink embed on same line', () => {
		const text = '![alt](img.png) ![[embed.png]]';
		const state = createMarkdownState(text);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
		expect(images[0].altText).toBe('alt');

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('embed.png');
		expect(embeds[0].type).toBe('image');
	});
});

// ============================================================
// Autolink + inline formatting
// ============================================================

describe('autolink + bold', () => {
	it('<https://example.com> **bold** — autolink and bold both detected', () => {
		const text = '<https://example.com> **bold**';
		const state = createMarkdownState(text);

		const autolinks = findAutolinkRanges(state, 0, text.length);
		expect(autolinks).toHaveLength(1);
		expect(autolinks[0].url).toBe('https://example.com');

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
	});
});

describe('autolink + italic', () => {
	it('<user@email.com> *italic* — autolink and italic both detected', () => {
		const text = '<user@email.com> *italic*';
		const state = createMarkdownState(text);

		const autolinks = findAutolinkRanges(state, 0, text.length);
		expect(autolinks).toHaveLength(1);
		expect(autolinks[0].url).toBe('user@email.com');

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
	});
});

describe('extended autolink + bold', () => {
	it('Visit https://example.com and **bold** — extended autolink and bold both detected', () => {
		const text = 'Visit https://example.com and **bold**';
		const state = createMarkdownState(text);

		const extLinks = findExtendedAutolinkRanges(text, 0);
		expect(extLinks).toHaveLength(1);
		expect(extLinks[0].url).toBe('https://example.com');

		const bolds = findBoldRanges(state, 0, text.length);
		expect(bolds).toHaveLength(1);
	});
});

// ============================================================
// Link + wikilink on same line
// ============================================================

describe('link + wikilink coexist', () => {
	it('[link](url) and [[note]] — markdown link and wikilink on same line', () => {
		const text = '[link](url) and [[note]]';
		const state = createMarkdownState(text);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
		expect(links[0].textFrom).toBe(1);
		expect(links[0].textTo).toBe(5);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('link + footnote ref coexist', () => {
	it('[link](url) and [^ref] — markdown link and footnote ref coexist', () => {
		const text = '[link](url) and [^ref]';

		const state = createMarkdownState(text);
		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
		expect(links[0].textFrom).toBe(1);
		expect(links[0].textTo).toBe(5);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('ref');
	});
});

// ============================================================
// Strikethrough + references
// ============================================================

describe('strikethrough wraps link', () => {
	it('~~[link](url)~~ — strikethrough wraps link', () => {
		const text = '~~[link](url)~~';
		const state = createMarkdownState(text);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('strikethrough wraps wikilink', () => {
	it('~~[[note]]~~ — strikethrough wraps wikilink', () => {
		const text = '~~[[note]]~~';
		const state = createMarkdownState(text);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('strikethrough wraps image', () => {
	it('~~![alt](img.png)~~ — strikethrough wraps image', () => {
		const text = '~~![alt](img.png)~~';
		const state = createMarkdownState(text);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
	});
});

// ============================================================
// Highlight + references
// ============================================================

describe('highlight wraps link', () => {
	it('==[link](url)== — highlight wraps link', () => {
		const text = '==[link](url)==';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('highlight wraps wikilink', () => {
	it('==[[note]]== — highlight wraps wikilink', () => {
		const text = '==[[note]]==';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
	});
});

describe('highlight wraps image', () => {
	it('==![alt](img.png)== — highlight wraps image', () => {
		const text = '==![alt](img.png)==';
		const state = createMarkdownState(text);

		const highlights = findHighlightRanges(state, 0, text.length);
		expect(highlights).toHaveLength(1);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
	});
});

// ============================================================
// Inline code suppression of references
// ============================================================

describe('inline code suppresses link', () => {
	it('`[not link](url)` — inline code suppresses link inside', () => {
		const text = '`[not link](url)`';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(0);
	});
});

describe('inline code suppresses wikilink (Lezer context)', () => {
	it('`[[note]]` — inline code: wikilink regex still finds it but Lezer sees it as code', () => {
		const text = '`[[note]]`';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);

		// Wikilink is regex-based, still detects text pattern
		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
	});
});

describe('inline code suppresses image', () => {
	it('`![alt](url)` — inline code suppresses image inside', () => {
		const text = '`![alt](url)`';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(0);
	});
});

// ============================================================
// Inline comment + references
// ============================================================

describe('inline comment + link', () => {
	it('%%hidden%% [link](url) — inline comment and link coexist', () => {
		const text = '%%hidden%% [link](url)';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('inline comment + image', () => {
	it('%%hidden%% ![alt](img.png) — inline comment and image coexist', () => {
		const text = '%%hidden%% ![alt](img.png)';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
	});
});

// ============================================================
// Footnote ref + image
// ============================================================

describe('footnote ref + image', () => {
	it('[^1] ![alt](img.png) — footnote ref and image coexist', () => {
		const text = '[^1] ![alt](img.png)';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
	});
});

// ============================================================
// Inline math + references
// ============================================================

describe('inline math + image', () => {
	it('$x$ ![alt](img.png) — inline math and image coexist', () => {
		const text = '$x$ ![alt](img.png)';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);
	});
});

describe('inline math + wikilink embed', () => {
	it('$x$ ![[note]] — inline math and wikilink embed coexist', () => {
		const text = '$x$ ![[note]]';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
	});
});

describe('inline math + autolink', () => {
	it('$x$ <https://example.com> — inline math and autolink coexist', () => {
		const text = '$x$ <https://example.com>';
		const state = createMarkdownState(text);

		const maths = findInlineMathRanges(state, 0, text.length);
		expect(maths).toHaveLength(1);

		const autolinks = findAutolinkRanges(state, 0, text.length);
		expect(autolinks).toHaveLength(1);
	});
});

// ============================================================
// Autolink + more types
// ============================================================

describe('autolink + strikethrough', () => {
	it('<https://example.com> ~~strike~~ — autolink and strikethrough coexist', () => {
		const text = '<https://example.com> ~~strike~~';
		const state = createMarkdownState(text);

		const autolinks = findAutolinkRanges(state, 0, text.length);
		expect(autolinks).toHaveLength(1);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);
	});
});

describe('autolink + wikilink', () => {
	it('<https://example.com> [[note]] — autolink and wikilink coexist', () => {
		const text = '<https://example.com> [[note]]';
		const state = createMarkdownState(text);

		const autolinks = findAutolinkRanges(state, 0, text.length);
		expect(autolinks).toHaveLength(1);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
	});
});

// ============================================================
// Extended autolink + more types
// ============================================================

describe('extended autolink + italic', () => {
	it('Visit https://example.com and *italic* — ext autolink and italic', () => {
		const text = 'Visit https://example.com and *italic*';
		const state = createMarkdownState(text);

		const extLinks = findExtendedAutolinkRanges(text, 0);
		expect(extLinks).toHaveLength(1);

		const italics = findItalicRanges(state, 0, text.length);
		expect(italics).toHaveLength(1);
	});
});

describe('extended autolink + link', () => {
	it('See https://example.com and [link](url) — ext autolink and md link', () => {
		const text = 'See https://example.com and [link](url)';
		const state = createMarkdownState(text);

		const extLinks = findExtendedAutolinkRanges(text, 0);
		expect(extLinks).toHaveLength(1);

		const links = findMarkdownLinkRanges(state, 0, text.length);
		expect(links).toHaveLength(1);
	});
});

describe('extended autolink + wikilink', () => {
	it('See https://example.com and [[note]] — ext autolink and wikilink', () => {
		const text = 'See https://example.com and [[note]]';

		const extLinks = findExtendedAutolinkRanges(text, 0);
		expect(extLinks).toHaveLength(1);

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
	});
});

// ============================================================
// Block reference + more types
// ============================================================

describe('block reference + strikethrough', () => {
	it('~~strike~~ ^ref — strikethrough and block reference coexist', () => {
		const text = '~~strike~~ ^ref';
		const state = createMarkdownState(text);

		const strikes = findStrikethroughRanges(state, 0, text.length);
		expect(strikes).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('block reference + inline code', () => {
	it('`code` ^ref — inline code and block reference coexist', () => {
		const text = '`code` ^ref';
		const state = createMarkdownState(text);

		const codes = findInlineCodeRanges(state, 0, text.length);
		expect(codes).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('block reference + inline comment', () => {
	it('%%hidden%% ^ref — inline comment and block reference coexist', () => {
		const text = '%%hidden%% ^ref';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('block reference + footnote ref', () => {
	it('[^1] text ^ref — footnote ref and block reference coexist', () => {
		const text = '[^1] text ^ref';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');

		const blockRef = findBlockReference(text, 0);
		expect(blockRef).not.toBeNull();
		expect(blockRef!.id).toBe('ref');
	});
});

describe('block reference + wikilink embed', () => {
	it('![[embed]] ^ref — wikilink embed and block reference coexist', () => {
		const text = '![[embed]] ^ref';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('block reference + image', () => {
	it('![alt](img.png) ^ref — image and block reference coexist', () => {
		const text = '![alt](img.png) ^ref';
		const state = createMarkdownState(text);

		const images = findImageRanges(state, 0, text.length);
		expect(images).toHaveLength(1);

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});
