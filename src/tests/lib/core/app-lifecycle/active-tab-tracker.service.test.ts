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
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import * as backlinksService from '$lib/features/backlinks/backlinks.service';
import * as outgoingLinksService from '$lib/features/outgoing-links/outgoing-links.service';
import { invoke } from '@tauri-apps/api/core';

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

	describe('rustBacklinks flag', () => {
		beforeEach(() => {
			settingsStore.updateExperimental({ rustBacklinks: false });
			vi.mocked(invoke).mockReset();
		});

		it('invokes get_backlinks_v2 when flag is on', async () => {
			settingsStore.updateExperimental({ rustBacklinks: true });
			vi.mocked(invoke).mockImplementation(async (cmd) => {
				if (cmd === 'get_backlinks_v2') {
					return [
						{
							path: '/vault/note-b.md',
							title: 'note-b',
							frontmatter: {},
							outgoingLinks: ['note-a'],
							tags: [],
							modifiedAt: null,
							wordCount: 3,
							snippet: 'See [[note-a]] for details',
						},
					];
				}
				return undefined;
			});

			updateActiveTabLinks('/vault/note-a.md');

			await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/note-a.md' }));
			await vi.waitFor(() => expect(backlinksStore.linkedMentions).toHaveLength(1));

			expect(backlinksStore.linkedMentions[0].sourcePath).toBe('/vault/note-b.md');
			expect(backlinksStore.linkedMentions[0].sourceName).toBe('note-b');
			// Snippets intentionally empty in the Phase 3 migration — pinned so a
			// future enrichment commit must update this test deliberately.
			expect(backlinksStore.linkedMentions[0].snippets).toEqual([]);

			settingsStore.updateExperimental({ rustBacklinks: false });
		});

		it('falls back to TS path when flag is off', () => {
			noteIndexStore.setNoteContents(new Map([
				['/vault/note-a.md', 'body'],
				['/vault/note-b.md', 'See [[note-a]] for details'],
			]));
			noteIndexStore.setNoteIndex(new Map([
				['/vault/note-a.md', parseWikilinks('body')],
				['/vault/note-b.md', parseWikilinks('See [[note-a]] for details')],
			]));

			updateActiveTabLinks('/vault/note-a.md');

			expect(invoke).not.toHaveBeenCalledWith('get_backlinks_v2', expect.anything());
			expect(backlinksStore.linkedMentions[0].sourcePath).toBe('/vault/note-b.md');
		});

		it('bypasses the loading guard when flag is on (Rust index has its own state)', async () => {
			settingsStore.updateExperimental({ rustBacklinks: true });
			noteIndexStore.setLoading(true);
			vi.mocked(invoke).mockResolvedValue([]);

			updateActiveTabLinks('/vault/note-a.md');

			await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/note-a.md' }));

			settingsStore.updateExperimental({ rustBacklinks: false });
			noteIndexStore.setLoading(false);
		});
	});

	describe('rustOutgoing flag', () => {
		beforeEach(() => {
			settingsStore.updateExperimental({ rustBacklinks: false, rustOutgoing: false });
			vi.mocked(invoke).mockReset();
			editorStore.reset();
		});

		it('invokes get_outgoing_links_v2 + unlinked_mentions_v2 when flag is on', async () => {
			settingsStore.updateExperimental({ rustOutgoing: true });
			editorStore.addTab({
				path: '/vault/note-a.md',
				name: 'note-a.md',
				content: 'body mentions beta',
				savedContent: 'body mentions beta',
			});
			vi.mocked(invoke).mockImplementation(async (cmd) => {
				if (cmd === 'get_outgoing_links_v2') {
					return [{
						path: '/vault/beta.md',
						title: 'beta',
						frontmatter: {},
						outgoingLinks: [],
						tags: [],
						modifiedAt: null,
						wordCount: 0,
						snippet: '',
					}];
				}
				if (cmd === 'get_outgoing_unlinked_mentions_v2') {
					return [{ noteName: 'gamma', notePath: '/vault/gamma.md', count: 2 }];
				}
				return undefined;
			});

			updateActiveTabLinks('/vault/note-a.md');

			await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('get_outgoing_links_v2', { path: '/vault/note-a.md' }));
			await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('get_outgoing_unlinked_mentions_v2', { path: '/vault/note-a.md', content: 'body mentions beta' }));
			await vi.waitFor(() => expect(outgoingLinksStore.outgoingLinks).toHaveLength(1));

			expect(outgoingLinksStore.outgoingLinks[0].target).toBe('beta');
			expect(outgoingLinksStore.outgoingLinks[0].resolvedPath).toBe('/vault/beta.md');
			expect(outgoingLinksStore.outgoingLinks[0].alias).toBeNull();
			expect(outgoingLinksStore.unlinkedMentions).toEqual([
				{ noteName: 'gamma', notePath: '/vault/gamma.md', count: 2 },
			]);

			settingsStore.updateExperimental({ rustOutgoing: false });
		});

		it('falls back to TS outgoing path when flag is off', () => {
			noteIndexStore.setNoteContents(new Map([
				['/vault/note-a.md', 'Link to [[note-b]]'],
				['/vault/note-b.md', 'Target note'],
			]));
			noteIndexStore.setNoteIndex(new Map([
				['/vault/note-a.md', parseWikilinks('Link to [[note-b]]')],
				['/vault/note-b.md', parseWikilinks('Target note')],
			]));

			updateActiveTabLinks('/vault/note-a.md');

			expect(invoke).not.toHaveBeenCalledWith('get_outgoing_links_v2', expect.anything());
			expect(outgoingLinksStore.outgoingLinks[0].target).toBe('note-b');
		});

		it('skips the unlinked-mentions invoke on a stale tab (race guard)', async () => {
			settingsStore.updateExperimental({ rustOutgoing: true });
			// Active tab is a DIFFERENT path than the one requested — should skip
			// the unlinked mentions fetch entirely.
			editorStore.addTab({
				path: '/vault/other-tab.md',
				name: 'other-tab.md',
				content: 'different buffer',
				savedContent: 'different buffer',
			});
			vi.mocked(invoke).mockResolvedValue([]);

			updateActiveTabLinks('/vault/note-a.md');

			// get_outgoing_links_v2 always fires (no content needed).
			await vi.waitFor(() => expect(invoke).toHaveBeenCalledWith('get_outgoing_links_v2', { path: '/vault/note-a.md' }));
			// But the unlinked-mentions invoke must NOT — the active tab doesn't match.
			const calls = vi.mocked(invoke).mock.calls.map((c) => c[0]);
			expect(calls).not.toContain('get_outgoing_unlinked_mentions_v2');

			settingsStore.updateExperimental({ rustOutgoing: false });
		});

		it('both rustBacklinks and rustOutgoing can be on independently', async () => {
			settingsStore.updateExperimental({ rustBacklinks: true, rustOutgoing: true });
			editorStore.addTab({
				path: '/vault/note-a.md',
				name: 'note-a.md',
				content: 'buffer',
				savedContent: 'buffer',
			});
			vi.mocked(invoke).mockResolvedValue([]);

			updateActiveTabLinks('/vault/note-a.md');

			await vi.waitFor(() => {
				const calls = vi.mocked(invoke).mock.calls.map((c) => c[0]);
				expect(calls).toContain('get_backlinks_v2');
				expect(calls).toContain('get_outgoing_links_v2');
				expect(calls).toContain('get_outgoing_unlinked_mentions_v2');
			});

			settingsStore.updateExperimental({ rustBacklinks: false, rustOutgoing: false });
		});
	});
});
