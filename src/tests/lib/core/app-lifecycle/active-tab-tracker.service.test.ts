import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Tauri core API — needed because backlinks.service imports invoke
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import { outgoingLinksStore } from '$lib/features/outgoing-links/outgoing-links.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { parseWikilinks } from '$lib/features/backlinks/backlinks.logic';
import { updateActiveTabLinks } from '$lib/core/app-lifecycle/active-tab-tracker.service';
import * as backlinksService from '$lib/features/backlinks/backlinks.service';
import * as outgoingLinksService from '$lib/features/outgoing-links/outgoing-links.service';

describe('updateActiveTabLinks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		backlinksStore.reset();
		outgoingLinksStore.reset();
		settingsStore.reset();
	});

	it('populates backlinks when another note links to the active file', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/note-a.md', 'Hello world'],
			['/vault/note-b.md', 'See [[note-a]] for details'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note-a.md', parseWikilinks('Hello world')],
			['/vault/note-b.md', parseWikilinks('See [[note-a]] for details')],
		]));

		await updateActiveTabLinks('/vault/note-a.md');

		expect(backlinksStore.linkedMentions.length).toBeGreaterThan(0);
		expect(backlinksStore.linkedMentions[0].sourcePath).toBe('/vault/note-b.md');
	});

	it('populates outgoing links from wikilinks in the active file', async () => {
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
		noteIndexStore.setNoteContents(new Map([
			['/vault/note-a.md', 'Hello world'],
			['/vault/note-b.md', 'See [[note-a]] for details'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note-a.md', parseWikilinks('Hello world')],
			['/vault/note-b.md', parseWikilinks('See [[note-a]] for details')],
		]));
		noteIndexStore.setLoading(true);

		await updateActiveTabLinks('/vault/note-a.md');

		// Should not compute backlinks when index is loading
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

		// null path should always clear, regardless of loading state
		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);

		noteIndexStore.setLoading(false);
	});

	it('clears all link stores when path is null', async () => {
		// Pre-populate stores with data
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

	it('returns empty backlinks when no notes link to the active file', async () => {
		noteIndexStore.setNoteContents(new Map([
			['/vault/note-a.md', 'Standalone note'],
			['/vault/note-b.md', 'Another standalone'],
		]));
		noteIndexStore.setNoteIndex(new Map([
			['/vault/note-a.md', []],
			['/vault/note-b.md', []],
		]));

		await updateActiveTabLinks('/vault/note-a.md');

		expect(backlinksStore.linkedMentions).toEqual([]);
	});

	it('does not throw when updateBacklinksForFile throws', async () => {
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

		await expect(updateActiveTabLinks('/vault/note-a.md')).resolves.toBeUndefined();
		expect(outgoingLinksStore.outgoingLinks.length).toBeGreaterThan(0);

		spy.mockRestore();
	});

	it('does not throw when updateOutgoingLinksForFile throws', async () => {
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

		await expect(updateActiveTabLinks('/vault/note-a.md')).resolves.toBeUndefined();
		expect(backlinksStore.linkedMentions.length).toBeGreaterThan(0);

		spy.mockRestore();
	});

	describe('experimental.rustBacklinks (Phase 3.3)', () => {
		it('flag-off: does NOT call get_backlinks_v2 (TS path)', async () => {
			noteIndexStore.setNoteContents(new Map([
				['/vault/note-a.md', 'Hello world'],
				['/vault/note-b.md', 'See [[note-a]] for details'],
			]));
			noteIndexStore.setNoteIndex(new Map([
				['/vault/note-a.md', parseWikilinks('Hello world')],
				['/vault/note-b.md', parseWikilinks('See [[note-a]] for details')],
			]));

			expect(settingsStore.experimental.rustBacklinks).toBe(false);
			await updateActiveTabLinks('/vault/note-a.md');

			expect(invoke).not.toHaveBeenCalledWith('get_backlinks_v2', expect.anything());
		});

		it('flag-on: invokes get_backlinks_v2 and converts NoteEntryV2 → BacklinkEntry', async () => {
			settingsStore.updateExperimental({ rustBacklinks: true });
			vi.mocked(invoke).mockResolvedValue([
				{
					path: '/vault/note-b.md',
					title: 'note-b',
					frontmatter: {},
					outgoingLinks: [],
					tags: [],
					modifiedAt: 0,
					wordCount: 5,
					snippet: 'See note-a for details',
				},
			]);

			await updateActiveTabLinks('/vault/note-a.md');

			expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/note-a.md' });
			expect(backlinksStore.linkedMentions).toEqual([
				{
					sourcePath: '/vault/note-b.md',
					sourceName: 'note-b',
					snippets: [{ text: 'See note-a for details', linkStart: 0, linkEnd: 0 }],
				},
			]);
		});

		it('flag-on: empty snippet produces empty snippets array', async () => {
			settingsStore.updateExperimental({ rustBacklinks: true });
			vi.mocked(invoke).mockResolvedValue([
				{
					path: '/vault/x.md',
					title: 'x',
					frontmatter: {},
					outgoingLinks: [],
					tags: [],
					modifiedAt: 0,
					wordCount: 0,
					snippet: '',
				},
			]);

			await updateActiveTabLinks('/vault/note-a.md');

			expect(backlinksStore.linkedMentions[0].snippets).toEqual([]);
		});

		it('flag-on: empty result writes empty linked mentions', async () => {
			settingsStore.updateExperimental({ rustBacklinks: true });
			vi.mocked(invoke).mockResolvedValue([]);

			backlinksStore.setLinkedMentions([
				{ sourcePath: '/vault/old.md', sourceName: 'old', snippets: [] },
			]);

			await updateActiveTabLinks('/vault/note-a.md');

			expect(backlinksStore.linkedMentions).toEqual([]);
		});

		it('flag-on: invoke rejection is swallowed and does not affect outgoing links path', async () => {
			settingsStore.updateExperimental({ rustBacklinks: true });
			vi.mocked(invoke).mockRejectedValue(new Error('IPC error'));

			noteIndexStore.setNoteContents(new Map([
				['/vault/note-a.md', 'Link to [[note-b]]'],
				['/vault/note-b.md', 'Target note'],
			]));
			noteIndexStore.setNoteIndex(new Map([
				['/vault/note-a.md', parseWikilinks('Link to [[note-b]]')],
				['/vault/note-b.md', parseWikilinks('Target note')],
			]));

			await expect(updateActiveTabLinks('/vault/note-a.md')).resolves.toBeUndefined();
			// Outgoing links path still ran via TS
			expect(outgoingLinksStore.outgoingLinks.length).toBeGreaterThan(0);
		});

		it('flag-on: still markUnlinkedDirty so the panel can compute via TS path', async () => {
			settingsStore.updateExperimental({ rustBacklinks: true });
			vi.mocked(invoke).mockResolvedValue([]);

			expect(backlinksStore.unlinkedDirty).toBe(false);
			await updateActiveTabLinks('/vault/note-a.md');
			expect(backlinksStore.unlinkedDirty).toBe(true);
		});
	});
});
