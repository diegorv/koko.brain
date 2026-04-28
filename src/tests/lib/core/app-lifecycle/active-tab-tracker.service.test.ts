import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { parseWikilinks } from '$lib/features/backlinks/backlinks.logic';
import { updateActiveTabLinks } from '$lib/core/app-lifecycle/active-tab-tracker.service';
import * as outgoingLinksService from '$lib/features/outgoing-links/outgoing-links.service';

describe('updateActiveTabLinks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		backlinksStore.reset();
		outgoingLinksStore.reset();
		// Default invoke mock returns empty array (Rust returns no backlinks)
		vi.mocked(invoke).mockResolvedValue([]);
	});

	it('invokes get_backlinks_v2 with the active path and writes the converted result', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{
				path: '/vault/note-b.md',
				title: 'note-b',
				frontmatter: {},
				outgoingLinks: [],
				tags: [],
				modifiedAt: 0,
				wordCount: 5,
				snippet: 'See note-a',
			},
		]);

		await updateActiveTabLinks('/vault/note-a.md');

		expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/note-a.md' });
		expect(backlinksStore.linkedMentions[0].sourcePath).toBe('/vault/note-b.md');
	});

	it('populates outgoing links from wikilinks in the active file (TS path until Phase 6)', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/note-a.md', 'Link to [[note-b]]'],
			['/vault/note-b.md', 'Target note'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note-a.md', parseWikilinks('Link to [[note-b]]')],
			['/vault/note-b.md', parseWikilinks('Target note')],
		]));

		await updateActiveTabLinks('/vault/note-a.md');

		expect(outgoingLinksStore.outgoingLinks.length).toBeGreaterThan(0);
		expect(outgoingLinksStore.outgoingLinks[0].target).toBe('note-b');
	});

	it('skips computation when noteIndexStore is still loading', async () => {
		noteIndexStore.setLoading(true);

		await updateActiveTabLinks('/vault/note-a.md');

		expect(invoke).not.toHaveBeenCalled();
		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(outgoingLinksStore.outgoingLinks).toEqual([]);

		noteIndexStore.setLoading(false);
	});

	it('still clears stores when path is null even if loading', async () => {
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] },
		]);
		noteIndexStore.setLoading(true);

		await updateActiveTabLinks(null);

		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);

		noteIndexStore.setLoading(false);
	});

	it('clears all link stores when path is null', async () => {
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] },
		]);
		outgoingLinksStore.setOutgoingLinks([
			{ target: 'y', alias: null, heading: null, resolvedPath: null, position: 0 },
		]);

		await updateActiveTabLinks(null);

		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);
		expect(outgoingLinksStore.outgoingLinks).toEqual([]);
		expect(outgoingLinksStore.unlinkedMentions).toEqual([]);
	});

	it('writes empty linked mentions when the v2 result is empty', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await updateActiveTabLinks('/vault/note-a.md');

		expect(backlinksStore.linkedMentions).toEqual([]);
	});

	it('does not throw when fetchBacklinksV2 IPC rejects', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('IPC error'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(updateActiveTabLinks('/vault/note-a.md')).resolves.toBeUndefined();

		consoleSpy.mockRestore();
	});

	it('does not throw when updateOutgoingLinksForFile throws', async () => {
		const spy = vi.spyOn(outgoingLinksService, 'updateOutgoingLinksForFile').mockImplementation(() => {
			throw new Error('outgoing links exploded');
		});

		await expect(updateActiveTabLinks('/vault/note-a.md')).resolves.toBeUndefined();

		spy.mockRestore();
	});

	it('marks unlinked mentions as dirty after the v2 fetch completes', async () => {
		expect(backlinksStore.unlinkedDirty).toBe(false);
		await updateActiveTabLinks('/vault/note-a.md');
		expect(backlinksStore.unlinkedDirty).toBe(true);
	});
});
