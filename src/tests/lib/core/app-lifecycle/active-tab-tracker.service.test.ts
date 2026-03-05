import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri core API — needed because backlinks.service imports invoke
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { parseWikilinks } from '$lib/features/backlinks/backlinks.logic';
import { updateActiveTabLinks } from '$lib/core/app-lifecycle/active-tab-tracker.service';
import * as backlinksService from '$lib/features/backlinks/backlinks.service';
import * as outgoingLinksService from '$lib/features/outgoing-links/outgoing-links.service';

describe('updateActiveTabLinks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		backlinksStore.reset();
		outgoingLinksStore.reset();
	});

	it('populates backlinks when another note links to the active file', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/note-a.md', 'Hello world'],
			['/vault/note-b.md', 'See [[note-a]] for details'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note-a.md', parseWikilinks('Hello world')],
			['/vault/note-b.md', parseWikilinks('See [[note-a]] for details')],
		]));

		updateActiveTabLinks('/vault/note-a.md');

		expect(backlinksStore.linkedMentions.length).toBeGreaterThan(0);
		expect(backlinksStore.linkedMentions[0].sourcePath).toBe('/vault/note-b.md');
	});

	it('populates outgoing links from wikilinks in the active file', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/note-a.md', 'Link to [[note-b]]'],
			['/vault/note-b.md', 'Target note'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note-a.md', parseWikilinks('Link to [[note-b]]')],
			['/vault/note-b.md', parseWikilinks('Target note')],
		]));

		updateActiveTabLinks('/vault/note-a.md');

		expect(outgoingLinksStore.outgoingLinks.length).toBeGreaterThan(0);
		expect(outgoingLinksStore.outgoingLinks[0].target).toBe('note-b');
	});

	it('skips computation when noteIndexStore is still loading', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/note-a.md', 'Hello world'],
			['/vault/note-b.md', 'See [[note-a]] for details'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note-a.md', parseWikilinks('Hello world')],
			['/vault/note-b.md', parseWikilinks('See [[note-a]] for details')],
		]));
		noteIndexStore.setLoading(true);

		updateActiveTabLinks('/vault/note-a.md');

		// Should not compute backlinks when index is loading
		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(outgoingLinksStore.outgoingLinks).toEqual([]);

		noteIndexStore.setLoading(false);
	});

	it('still clears stores when path is null even if loading', () => {
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] },
		]);
		noteIndexStore.setLoading(true);

		updateActiveTabLinks(null);

		// null path should always clear, regardless of loading state
		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);

		noteIndexStore.setLoading(false);
	});

	it('clears all link stores when path is null', () => {
		// Pre-populate stores with data
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] },
		]);
		outgoingLinksStore.setOutgoingLinks([
			{ target: 'y', alias: null, heading: null, resolvedPath: null, position: 0 },
		]);

		updateActiveTabLinks(null);

		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);
		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
		expect(outgoingLinksStore.unlinkedMentions).toEqual([]);
	});

	it('returns empty backlinks when no notes link to the active file', () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/note-a.md', 'Standalone note'],
			['/vault/note-b.md', 'Another standalone'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note-a.md', []],
			['/vault/note-b.md', []],
		]));

		updateActiveTabLinks('/vault/note-a.md');

		expect(backlinksStore.linkedMentions).toEqual([]);
	});

	it('does not throw when updateBacklinksForFile throws', () => {
		const spy = vi.spyOn(backlinksService, 'updateBacklinksForFile').mockImplementation(() => {
			throw new Error('backlinks exploded');
		});

		// Outgoing links should still update despite backlinks failure
		noteIndexStore.setNoteContents(new Map([
			['/vault/note-a.md', 'Link to [[note-b]]'],
			['/vault/note-b.md', 'Target note'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note-a.md', parseWikilinks('Link to [[note-b]]')],
			['/vault/note-b.md', parseWikilinks('Target note')],
		]));

		expect(() => updateActiveTabLinks('/vault/note-a.md')).not.toThrow();
		expect(outgoingLinksStore.outgoingLinks.length).toBeGreaterThan(0);

		spy.mockRestore();
	});

	it('does not throw when updateOutgoingLinksForFile throws', () => {
		const spy = vi.spyOn(outgoingLinksService, 'updateOutgoingLinksForFile').mockImplementation(() => {
			throw new Error('outgoing links exploded');
		});

		// Backlinks should still update despite outgoing links failure
		noteIndexStore.setNoteContents(new Map([
			['/vault/note-a.md', 'Hello world'],
			['/vault/note-b.md', 'See [[note-a]] for details'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note-a.md', parseWikilinks('Hello world')],
			['/vault/note-b.md', parseWikilinks('See [[note-a]] for details')],
		]));

		expect(() => updateActiveTabLinks('/vault/note-a.md')).not.toThrow();
		expect(backlinksStore.linkedMentions.length).toBeGreaterThan(0);

		spy.mockRestore();
	});
});
