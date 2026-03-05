import { describe, it, expect, vi, beforeEach } from 'vitest';

import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { parseWikilinks } from '$lib/features/backlinks/backlinks.logic';
import { updateOutgoingLinksForFile, resetOutgoingLinks } from '$lib/features/outgoing-links/outgoing-links.service';

describe('updateOutgoingLinksForFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		noteIndexStore.reset();
		outgoingLinksStore.reset();
	});

	it('populates outgoing links from wikilinks in file content', () => {
		const content = 'Links to [[other]] and [[third]]';
		noteIndexStore.setNoteContents(new Map([
			['/vault/note.md', content],
			['/vault/other.md', 'Some content'],
			['/vault/third.md', 'More content'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note.md', parseWikilinks(content)],
		]));

		updateOutgoingLinksForFile('/vault/note.md');

		expect(outgoingLinksStore.outgoingLinks).toHaveLength(2);
		const targets = outgoingLinksStore.outgoingLinks.map(l => l.target);
		expect(targets).toContain('other');
		expect(targets).toContain('third');
	});

	it('resolves link target to matching file path', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/note.md', '[[other]]'],
			['/vault/other.md', 'content'],
		]));
		noteIndexStore.setNoteIndex(new Map());

		updateOutgoingLinksForFile('/vault/note.md');

		expect(outgoingLinksStore.outgoingLinks[0].resolvedPath).toBe('/vault/other.md');
	});

	it('deduplicates outgoing links with same target', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/note.md', '[[other]] and [[other]] again'],
			['/vault/other.md', 'content'],
		]));
		noteIndexStore.setNoteIndex(new Map());

		updateOutgoingLinksForFile('/vault/note.md');

		expect(outgoingLinksStore.outgoingLinks).toHaveLength(1);
		expect(outgoingLinksStore.outgoingLinks[0].target).toBe('other');
	});

	it('finds unlinked mentions of other note names in plain text', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/note.md', 'Mentions other in plain text'],
			['/vault/other.md', 'content'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note.md', []],
			['/vault/other.md', []],
		]));

		updateOutgoingLinksForFile('/vault/note.md');

		expect(outgoingLinksStore.unlinkedMentions).toHaveLength(1);
		expect(outgoingLinksStore.unlinkedMentions[0].noteName).toBe('other');
		expect(outgoingLinksStore.unlinkedMentions[0].count).toBe(1);
	});

	it('returns empty results for file with no links or mentions', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/note.md', 'Just plain text'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note.md', []],
		]));

		updateOutgoingLinksForFile('/vault/note.md');

		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
		expect(outgoingLinksStore.unlinkedMentions).toEqual([]);
	});

	it('uses empty string content for unknown file', () => {
		noteIndexStore.setNoteContents(new Map());
		noteIndexStore.setNoteIndex(new Map());

		updateOutgoingLinksForFile('/vault/unknown.md');

		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
	});
});

describe('resetOutgoingLinks', () => {
	it('clears outgoing links store to initial state', () => {
		outgoingLinksStore.setOutgoingLinks([
			{ target: 'test', alias: null, heading: null, resolvedPath: null, position: 0 },
		]);

		resetOutgoingLinks();

		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
		expect(outgoingLinksStore.unlinkedMentions).toEqual([]);
	});
});
