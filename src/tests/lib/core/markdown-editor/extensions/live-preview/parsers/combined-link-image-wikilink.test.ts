import { describe, it, expect } from 'vitest';
import { findExtendedAutolinkRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/link';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Wikilink + formatting
// ============================================================

describe('bold wraps wikilink', () => {
	it('**[[note]]** — wikilink detected inside bold marks', () => {
		const text = '**[[note]]**';

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
	it('*[[note]]* — wikilink detected inside italic marks', () => {
		const text = '*[[note]]*';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].openBracketFrom).toBe(1);
		expect(wikilinks[0].targetText).toBe('note');
		expect(wikilinks[0].closeBracketTo).toBe(9);
	});
});

describe('wikilink + bold on same line', () => {
	it('text [[note]] and **bold** — wikilink detected next to bold', () => {
		const text = 'text [[note]] and **bold**';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].openBracketFrom).toBe(5);
		expect(wikilinks[0].targetText).toBe('note');
		expect(wikilinks[0].closeBracketTo).toBe(13);
	});
});

describe('wikilink + markdown link coexist', () => {
	it('[[note|display]] and [link](url) — wikilink detected next to a markdown link', () => {
		const text = '[[note|display]] and [link](url)';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
		expect(wikilinks[0].displayFrom).not.toBeNull();
		expect(wikilinks[0].closeBracketTo).toBe(16);
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
	it('**bold** ![[note]] — wikilink embed detected next to bold', () => {
		const text = '**bold** ![[note]]';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('note');
		expect(embeds[0].type).toBe('note');
		expect(embeds[0].fullFrom).toBe(9);
		expect(embeds[0].fullTo).toBe(18);
	});
});

describe('wikilink embed + italic', () => {
	it('![[image.png]] *italic caption* — embed detected next to italic', () => {
		const text = '![[image.png]] *italic caption*';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('image.png');
		expect(embeds[0].type).toBe('image');
	});
});

describe('wikilink embed with heading anchor + highlight', () => {
	it('![[note#heading]] and ==highlight== — embed with heading anchor detected', () => {
		const text = '![[note#heading]] and ==highlight==';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('note');
		expect(embeds[0].heading).toBe('heading');
		expect(embeds[0].blockId).toBeNull();
	});
});

describe('wikilink embed with display + strikethrough', () => {
	it('![[image.png|300]] ~~strike~~ — embed with display detected', () => {
		const text = '![[image.png|300]] ~~strike~~';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('image.png');
		expect(embeds[0].display).toBe('300');
		expect(embeds[0].type).toBe('image');
	});
});

// ============================================================
// Wikilink embed vs markdown image disambiguation
// ============================================================

describe('wikilink embed vs markdown image', () => {
	it('![[file]] — wikilink embed is detected', () => {
		const text = '![[file]]';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('file');
	});

	it('![alt](url) — markdown image is NOT detected as wikilink embed', () => {
		const text = '![alt](url)';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(0);
	});

	it('![alt](img.png) and ![[embed.png]] — only the wikilink embed is detected', () => {
		const text = '![alt](img.png) ![[embed.png]]';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
		expect(embeds[0].target).toBe('embed.png');
		expect(embeds[0].type).toBe('image');
	});
});

// ============================================================
// Autolink + inline formatting
// ============================================================

describe('extended autolink + bold', () => {
	it('Visit https://example.com and **bold** — extended autolink detected next to bold', () => {
		const text = 'Visit https://example.com and **bold**';

		const extLinks = findExtendedAutolinkRanges(text, 0);
		expect(extLinks).toHaveLength(1);
		expect(extLinks[0].url).toBe('https://example.com');
	});
});

// ============================================================
// Link + wikilink on same line
// ============================================================

describe('link + wikilink coexist', () => {
	it('[link](url) and [[note]] — wikilink detected next to a markdown link', () => {
		const text = '[link](url) and [[note]]';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

describe('link + footnote ref coexist', () => {
	it('[link](url) and [^ref] — footnote ref detected next to a markdown link', () => {
		const text = '[link](url) and [^ref]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('ref');
	});
});

// ============================================================
// Strikethrough + references
// ============================================================

describe('strikethrough wraps wikilink', () => {
	it('~~[[note]]~~ — wikilink detected inside strikethrough marks', () => {
		const text = '~~[[note]]~~';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('note');
	});
});

// ============================================================
// Highlight + references
// ============================================================

describe('highlight wraps wikilink', () => {
	it('==[[note]]== — wikilink detected inside highlight marks', () => {
		const text = '==[[note]]==';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
	});
});

// ============================================================
// Inline code suppression of references
// ============================================================

describe('inline code suppresses wikilink (Lezer context)', () => {
	it('`[[note]]` — inline code: wikilink regex still finds it but Lezer sees it as code', () => {
		const text = '`[[note]]`';

		// Wikilink is regex-based, still detects text pattern
		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
	});
});

// ============================================================
// Inline comment + references
// ============================================================

describe('inline comment + link', () => {
	it('%%hidden%% [link](url) — inline comment detected next to a markdown link', () => {
		const text = '%%hidden%% [link](url)';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

describe('inline comment + image', () => {
	it('%%hidden%% ![alt](img.png) — inline comment detected next to an image', () => {
		const text = '%%hidden%% ![alt](img.png)';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

// ============================================================
// Footnote ref + image
// ============================================================

describe('footnote ref + image', () => {
	it('[^1] ![alt](img.png) — footnote ref detected next to an image', () => {
		const text = '[^1] ![alt](img.png)';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

// ============================================================
// Inline math + references
// ============================================================

describe('inline math + wikilink embed', () => {
	it('$x$ ![[note]] — wikilink embed detected next to inline math', () => {
		const text = '$x$ ![[note]]';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
	});
});

// ============================================================
// Autolink + more types
// ============================================================

describe('autolink + wikilink', () => {
	it('<https://example.com> [[note]] — wikilink detected next to an autolink', () => {
		const text = '<https://example.com> [[note]]';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
	});
});

// ============================================================
// Extended autolink + more types
// ============================================================

describe('extended autolink + italic', () => {
	it('Visit https://example.com and *italic* — ext autolink detected next to italic', () => {
		const text = 'Visit https://example.com and *italic*';

		const extLinks = findExtendedAutolinkRanges(text, 0);
		expect(extLinks).toHaveLength(1);
	});
});

describe('extended autolink + link', () => {
	it('See https://example.com and [link](url) — ext autolink detected next to a markdown link', () => {
		const text = 'See https://example.com and [link](url)';

		const extLinks = findExtendedAutolinkRanges(text, 0);
		expect(extLinks).toHaveLength(1);
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
	it('~~strike~~ ^ref — block reference detected next to strikethrough', () => {
		const text = '~~strike~~ ^ref';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});

describe('block reference + inline code', () => {
	it('`code` ^ref — block reference detected next to a code span', () => {
		const text = '`code` ^ref';

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
	it('![alt](img.png) ^ref — block reference detected next to an image', () => {
		const text = '![alt](img.png) ^ref';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('ref');
	});
});
