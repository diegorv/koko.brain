import { describe, it, expect } from 'vitest';
import { findWikilinkRanges } from '$lib/core/markdown-editor/extensions/wikilink/decoration.logic';
import { findFootnoteRefRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/footnote';
import { findBlockReference } from '$lib/core/markdown-editor/extensions/live-preview/parsers/block-reference';
import { findWikilinkEmbedRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed';
import { findInlineCommentRanges } from '$lib/core/markdown-editor/extensions/live-preview/parsers/comment';
import { createMarkdownState } from '../../../test-helpers';

// ============================================================
// Task list + inline formatting
// ============================================================

describe('task list + wikilink', () => {
	it('- [ ] [[wikilink]] — wikilink detected on a task line', () => {
		const text = '- [ ] [[wikilink]]';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('wikilink');
	});
});

describe('task list + footnote ref', () => {
	it('- [ ] [^1] task with footnote — footnote ref detected on a task line', () => {
		const text = '- [ ] [^1] task with footnote';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});

	it('- [ ] text [^1] — footnote ref inside task list', () => {
		const text = '- [ ] text [^1]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('1');
	});
});

describe('task list + block reference', () => {
	it('- [ ] task ^blockid — block reference detected on a task line', () => {
		const text = '- [ ] task ^blockid';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

// ============================================================
// Ordered list + inline formatting
// ============================================================

describe('ordered list + wikilink', () => {
	it('1. [[wikilink]] — wikilink detected on an ordered list line', () => {
		const text = '1. [[wikilink]]';

		const wikilinks = findWikilinkRanges(text, 0);
		expect(wikilinks).toHaveLength(1);
		expect(wikilinks[0].targetText).toBe('wikilink');
	});
});

describe('ordered list + footnote ref', () => {
	it('1. item [^3] — footnote ref detected on an ordered list line', () => {
		const text = '1. item [^3]';
		const state = createMarkdownState(text);

		const refs = findFootnoteRefRanges(state, 0, text.length);
		expect(refs).toHaveLength(1);
		expect(refs[0].label).toBe('3');
	});
});

describe('ordered list + block reference', () => {
	it('1. item ^blockid — block reference detected on an ordered list line', () => {
		const text = '1. item ^blockid';

		const ref = findBlockReference(text, 0);
		expect(ref).not.toBeNull();
		expect(ref!.id).toBe('blockid');
	});
});

// ============================================================
// Ordered list + more inline types
// ============================================================

describe('ordered list + wikilink embed', () => {
	it('1. ![[embed]] — wikilink embed detected on an ordered list line', () => {
		const text = '1. ![[embed]]';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
	});
});

// ============================================================
// Task list + more inline types
// ============================================================

describe('task list + inline comment', () => {
	it('- [ ] %%hidden%% task — inline comment detected on a task line', () => {
		const text = '- [ ] %%hidden%% task';
		const state = createMarkdownState(text);

		const comments = findInlineCommentRanges(state, 0, text.length);
		expect(comments).toHaveLength(1);
	});
});

describe('task list + wikilink embed', () => {
	it('- [ ] ![[embed]] task — wikilink embed detected on a task line', () => {
		const text = '- [ ] ![[embed]] task';

		const embeds = findWikilinkEmbedRanges(text, 0);
		expect(embeds).toHaveLength(1);
	});
});
