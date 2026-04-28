import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
import {
	buildIndex,
	rebuildIndex,
	updateIndexForFile,
	removeFileFromIndex,
	updateBacklinksForFile,
	computeUnlinkedMentionsForFile,
	resetBacklinks,
	fetchBacklinksV2,
} from '$lib/features/backlinks/backlinks.service';
import { markIndexed, isAlreadyIndexed, clearAllIndexed } from '$lib/utils/index-dedupe';
import { makeFileNode, makeDirNode, makeSuccessResult, makeErrorResult } from '../../../fixtures/tauri-api.fixture';

describe('buildIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
	});

	it('populates noteIndex and noteContents from vault files', async () => {
		vi.mocked(invoke)
			.mockResolvedValueOnce([
				makeFileNode({ name: 'note.md', path: '/vault/note.md' }),
				makeFileNode({ name: 'other.md', path: '/vault/other.md' }),
			])
			.mockResolvedValueOnce([
				makeSuccessResult('/vault/note.md', 'Link to [[other]]'),
				makeSuccessResult('/vault/other.md', 'No links here'),
			]);

		await buildIndex('/vault');

		expect(noteIndexStore.noteContents.size).toBe(2);
		expect(noteIndexStore.noteContents.get('/vault/note.md')).toBe('Link to [[other]]');
		expect(noteIndexStore.noteContents.get('/vault/other.md')).toBe('No links here');

		expect(noteIndexStore.noteIndex.size).toBe(2);
		const noteLinks = noteIndexStore.noteIndex.get('/vault/note.md')!;
		expect(noteLinks).toHaveLength(1);
		expect(noteLinks[0].target).toBe('other');

		const otherLinks = noteIndexStore.noteIndex.get('/vault/other.md')!;
		expect(otherLinks).toHaveLength(0);
	});

	it('sets loading to false after successful build', async () => {
		vi.mocked(invoke)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]);

		await buildIndex('/vault');

		expect(noteIndexStore.isLoading).toBe(false);
	});

	it('sets loading to false even on error', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('scan error'));

		await buildIndex('/vault').catch(() => {});

		expect(noteIndexStore.isLoading).toBe(false);
	});

	it('skips files with read errors', async () => {
		vi.mocked(invoke)
			.mockResolvedValueOnce([
				makeFileNode({ name: 'good.md', path: '/vault/good.md' }),
				makeFileNode({ name: 'bad.md', path: '/vault/bad.md' }),
			])
			.mockResolvedValueOnce([
				makeSuccessResult('/vault/good.md', 'good content'),
				makeErrorResult('/vault/bad.md', 'permission denied'),
			]);

		await buildIndex('/vault');

		expect(noteIndexStore.noteContents.size).toBe(1);
		expect(noteIndexStore.noteContents.has('/vault/good.md')).toBe(true);
		expect(noteIndexStore.noteContents.has('/vault/bad.md')).toBe(false);
	});

	it('collects markdown files from nested directories', async () => {
		vi.mocked(invoke)
			.mockResolvedValueOnce([
				makeDirNode('subfolder', [
					makeFileNode({ name: 'nested.md', path: '/vault/subfolder/nested.md' }),
				], { path: '/vault/subfolder' }),
			])
			.mockResolvedValueOnce([
				makeSuccessResult('/vault/subfolder/nested.md', 'nested content'),
			]);

		await buildIndex('/vault');

		expect(noteIndexStore.noteContents.get('/vault/subfolder/nested.md')).toBe('nested content');
		expect(invoke).toHaveBeenCalledWith('read_files_batch', {
			vaultPath: '/vault',
			paths: ['/vault/subfolder/nested.md'],
		});
	});

	it('populates reverseIndex so backlinks resolve on first open', async () => {
		vi.mocked(invoke)
			.mockResolvedValueOnce([
				makeFileNode({ name: 'day-20.md', path: '/vault/day-20.md' }),
				makeFileNode({ name: 'week-17.md', path: '/vault/week-17.md' }),
			])
			.mockResolvedValueOnce([
				makeSuccessResult('/vault/day-20.md', 'no outgoing links'),
				makeSuccessResult('/vault/week-17.md', 'See [[day-20]] for details'),
			]);

		await buildIndex('/vault');

		const sources = noteIndexStore.reverseIndex.get('/vault/day-20.md');
		expect(sources).toBeDefined();
		expect(sources!.has('/vault/week-17.md')).toBe(true);
	});

	it('filters out non-markdown files', async () => {
		vi.mocked(invoke)
			.mockResolvedValueOnce([
				makeFileNode({ name: 'note.md', path: '/vault/note.md' }),
				makeFileNode({ name: 'image.png', path: '/vault/image.png' }),
				makeFileNode({ name: 'data.json', path: '/vault/data.json' }),
			])
			.mockResolvedValueOnce([
				makeSuccessResult('/vault/note.md', 'content'),
			]);

		await buildIndex('/vault');

		expect(invoke).toHaveBeenCalledWith('read_files_batch', {
			vaultPath: '/vault',
			paths: ['/vault/note.md'],
		});
		expect(noteIndexStore.noteContents.size).toBe(1);
	});

	it('collects both .md and .markdown files', async () => {
		vi.mocked(invoke)
			.mockResolvedValueOnce([
				makeFileNode({ name: 'note.md', path: '/vault/note.md' }),
				makeFileNode({ name: 'doc.markdown', path: '/vault/doc.markdown' }),
			])
			.mockResolvedValueOnce([
				makeSuccessResult('/vault/note.md', 'md content'),
				makeSuccessResult('/vault/doc.markdown', 'markdown content'),
			]);

		await buildIndex('/vault');

		expect(noteIndexStore.noteContents.size).toBe(2);
		expect(noteIndexStore.noteContents.get('/vault/doc.markdown')).toBe('markdown content');
	});

	it('handles empty vault', async () => {
		vi.mocked(invoke)
			.mockResolvedValueOnce([])
			.mockResolvedValueOnce([]);

		await buildIndex('/vault');

		expect(noteIndexStore.noteIndex.size).toBe(0);
		expect(noteIndexStore.noteContents.size).toBe(0);
	});
});

describe('rebuildIndex', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
	});

	it('does nothing if no vault path was set previously', async () => {
		await rebuildIndex();

		expect(invoke).not.toHaveBeenCalled();
	});

	it('rebuilds from the previously set vault path', async () => {
		// First build sets vaultPath
		vi.mocked(invoke)
			.mockResolvedValueOnce([
				makeFileNode({ name: 'note.md', path: '/vault/note.md' }),
			])
			.mockResolvedValueOnce([
				makeSuccessResult('/vault/note.md', 'original'),
			]);
		await buildIndex('/vault');
		expect(noteIndexStore.noteContents.get('/vault/note.md')).toBe('original');

		// Now rebuild should use the same vault path
		vi.mocked(invoke)
			.mockResolvedValueOnce([
				makeFileNode({ name: 'note.md', path: '/vault/note.md' }),
			])
			.mockResolvedValueOnce([
				makeSuccessResult('/vault/note.md', 'updated'),
			]);
		await rebuildIndex();

		expect(noteIndexStore.noteContents.get('/vault/note.md')).toBe('updated');
	});
});

describe('updateIndexForFile', () => {
	beforeEach(() => {
		resetBacklinks();
	});

	it('adds a new file to the index', () => {
		updateIndexForFile('/vault/note.md', 'Link to [[other]]');

		expect(noteIndexStore.noteContents.get('/vault/note.md')).toBe('Link to [[other]]');
		const links = noteIndexStore.noteIndex.get('/vault/note.md')!;
		expect(links).toHaveLength(1);
		expect(links[0].target).toBe('other');
	});

	it('updates existing file content and re-parses wikilinks', () => {
		// Initial state
		updateIndexForFile('/vault/note.md', 'Link to [[alpha]]');
		expect(noteIndexStore.noteIndex.get('/vault/note.md')).toHaveLength(1);

		// Update content with different links
		updateIndexForFile('/vault/note.md', 'Now links to [[beta]] and [[gamma]]');

		expect(noteIndexStore.noteContents.get('/vault/note.md')).toBe('Now links to [[beta]] and [[gamma]]');
		const links = noteIndexStore.noteIndex.get('/vault/note.md')!;
		expect(links).toHaveLength(2);
		expect(links[0].target).toBe('beta');
		expect(links[1].target).toBe('gamma');
	});

	it('preserves other files when updating one', () => {
		updateIndexForFile('/vault/a.md', 'File A with [[link]]');
		updateIndexForFile('/vault/b.md', 'File B with [[other]]');

		// Update only file A
		updateIndexForFile('/vault/a.md', 'Updated A');

		expect(noteIndexStore.noteContents.get('/vault/a.md')).toBe('Updated A');
		expect(noteIndexStore.noteContents.get('/vault/b.md')).toBe('File B with [[other]]');
	});
});

describe('removeFileFromIndex', () => {
	beforeEach(() => {
		resetBacklinks();
	});

	it('removes file from both noteContents and noteIndex', () => {
		// Pre-populate
		updateIndexForFile('/vault/note.md', 'content with [[link]]');
		expect(noteIndexStore.noteContents.has('/vault/note.md')).toBe(true);

		removeFileFromIndex('/vault/note.md');

		expect(noteIndexStore.noteContents.has('/vault/note.md')).toBe(false);
		expect(noteIndexStore.noteIndex.has('/vault/note.md')).toBe(false);
	});

	it('does not modify stores when file is not in index', () => {
		updateIndexForFile('/vault/existing.md', 'content');
		const contentsBefore = noteIndexStore.noteContents;
		const indexBefore = noteIndexStore.noteIndex;

		removeFileFromIndex('/vault/nonexistent.md');

		// Store references should be the same (no update triggered)
		expect(noteIndexStore.noteContents).toBe(contentsBefore);
		expect(noteIndexStore.noteIndex).toBe(indexBefore);
	});

	it('preserves other files when removing one', () => {
		updateIndexForFile('/vault/keep.md', 'keep this');
		updateIndexForFile('/vault/remove.md', 'remove this');

		removeFileFromIndex('/vault/remove.md');

		expect(noteIndexStore.noteContents.has('/vault/keep.md')).toBe(true);
		expect(noteIndexStore.noteContents.get('/vault/keep.md')).toBe('keep this');
		expect(noteIndexStore.noteContents.has('/vault/remove.md')).toBe(false);
	});

	it('clears the dedup signature so a re-created file with identical content is re-indexed', () => {
		clearAllIndexed();
		// Simulate content-effect or notifyAfterSave having indexed this path before.
		markIndexed('/vault/note.md', 'hello');
		expect(isAlreadyIndexed('/vault/note.md', 'hello')).toBe(true);

		removeFileFromIndex('/vault/note.md');

		// Dedup entry must be gone so the next indexer call actually runs.
		expect(isAlreadyIndexed('/vault/note.md', 'hello')).toBe(false);
	});

	it('only clears the deleted path from the dedup map — other paths are preserved', () => {
		clearAllIndexed();
		markIndexed('/vault/a.md', 'foo');
		markIndexed('/vault/b.md', 'bar');

		removeFileFromIndex('/vault/a.md');

		expect(isAlreadyIndexed('/vault/a.md', 'foo')).toBe(false);
		expect(isAlreadyIndexed('/vault/b.md', 'bar')).toBe(true);
	});
});

describe('updateBacklinksForFile', () => {
	beforeEach(() => {
		resetBacklinks();
	});

	it('computes linked mentions from notes that link to the file', () => {
		updateIndexForFile('/vault/note-a.md', 'Hello world');
		updateIndexForFile('/vault/note-b.md', 'See [[note-a]] for details');

		updateBacklinksForFile('/vault/note-a.md');

		expect(backlinksStore.linkedMentions).toHaveLength(1);
		expect(backlinksStore.linkedMentions[0].sourcePath).toBe('/vault/note-b.md');
		expect(backlinksStore.linkedMentions[0].sourceName).toBe('note-b');
		expect(backlinksStore.linkedMentions[0].snippets).toHaveLength(1);
	});

	it('does not mark unlinked mentions as dirty (deferred to save/tab-switch)', () => {
		updateIndexForFile('/vault/note-a.md', 'Hello world');
		updateIndexForFile('/vault/note-b.md', 'I mention note-a without linking');

		updateBacklinksForFile('/vault/note-a.md');

		// Unlinked should NOT be marked dirty from keystroke path
		expect(backlinksStore.unlinkedDirty).toBe(false);
		expect(backlinksStore.unlinkedMentions).toEqual([]);
	});

	it('returns empty when no notes link to the file', () => {
		updateIndexForFile('/vault/note-a.md', 'Standalone note');
		updateIndexForFile('/vault/note-b.md', 'Another standalone');

		updateBacklinksForFile('/vault/note-a.md');

		expect(backlinksStore.linkedMentions).toEqual([]);
		// Unlinked not marked dirty from keystroke path
		expect(backlinksStore.unlinkedDirty).toBe(false);
	});

	it('excludes self-references from backlinks', () => {
		updateIndexForFile('/vault/note-a.md', 'I link to [[note-a]] myself');

		updateBacklinksForFile('/vault/note-a.md');

		expect(backlinksStore.linkedMentions).toEqual([]);
	});
});

describe('computeUnlinkedMentionsForFile', () => {
	beforeEach(() => {
		resetBacklinks();
	});

	it('computes unlinked mentions on demand and clears dirty flag', () => {
		updateIndexForFile('/vault/note-a.md', 'Hello world');
		updateIndexForFile('/vault/note-b.md', 'I mention note-a without linking');

		// Simulate save/tab-switch marking dirty
		backlinksStore.markUnlinkedDirty();
		expect(backlinksStore.unlinkedDirty).toBe(true);
		expect(backlinksStore.unlinkedMentions).toEqual([]);

		// Now compute unlinked on demand
		computeUnlinkedMentionsForFile('/vault/note-a.md');

		expect(backlinksStore.unlinkedMentions).toHaveLength(1);
		expect(backlinksStore.unlinkedMentions[0].sourcePath).toBe('/vault/note-b.md');
		expect(backlinksStore.unlinkedDirty).toBe(false);
	});

	it('returns empty when no unlinked mentions exist', () => {
		updateIndexForFile('/vault/note-a.md', 'Hello world');
		updateIndexForFile('/vault/note-b.md', 'No mention of the other note');

		computeUnlinkedMentionsForFile('/vault/note-a.md');

		expect(backlinksStore.unlinkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedDirty).toBe(false);
	});
});

describe('resetBacklinks', () => {
	it('clears all backlinks state', () => {
		// Pre-populate with data
		updateIndexForFile('/vault/note.md', 'content with [[link]]');
		updateBacklinksForFile('/vault/note.md');

		resetBacklinks();

		expect(noteIndexStore.noteIndex.size).toBe(0);
		expect(noteIndexStore.noteContents.size).toBe(0);
		expect(backlinksStore.linkedMentions).toEqual([]);
		expect(backlinksStore.unlinkedMentions).toEqual([]);
		expect(noteIndexStore.isLoading).toBe(false);
	});
});

describe('state transitions: buildIndex → updateIndexForFile', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
	});

	it('incremental update reflects in subsequent backlinks computation', async () => {
		// Build initial index with two files
		vi.mocked(invoke)
			.mockResolvedValueOnce([
				makeFileNode({ name: 'note-a.md', path: '/vault/note-a.md' }),
				makeFileNode({ name: 'note-b.md', path: '/vault/note-b.md' }),
			])
			.mockResolvedValueOnce([
				makeSuccessResult('/vault/note-a.md', 'Hello world'),
				makeSuccessResult('/vault/note-b.md', 'No links yet'),
			]);

		await buildIndex('/vault');

		// Verify initial state — no backlinks
		updateBacklinksForFile('/vault/note-a.md');
		expect(backlinksStore.linkedMentions).toHaveLength(0);

		// Now user edits note-b to add a link to note-a
		updateIndexForFile('/vault/note-b.md', 'Now links to [[note-a]]');

		// Recompute backlinks — should now find the new link
		updateBacklinksForFile('/vault/note-a.md');
		expect(backlinksStore.linkedMentions).toHaveLength(1);
		expect(backlinksStore.linkedMentions[0].sourcePath).toBe('/vault/note-b.md');
	});

	it('removing a file updates backlinks for remaining files', async () => {
		// Build index: note-b links to note-a
		vi.mocked(invoke)
			.mockResolvedValueOnce([
				makeFileNode({ name: 'note-a.md', path: '/vault/note-a.md' }),
				makeFileNode({ name: 'note-b.md', path: '/vault/note-b.md' }),
			])
			.mockResolvedValueOnce([
				makeSuccessResult('/vault/note-a.md', 'Target'),
				makeSuccessResult('/vault/note-b.md', 'See [[note-a]]'),
			]);

		await buildIndex('/vault');

		updateBacklinksForFile('/vault/note-a.md');
		expect(backlinksStore.linkedMentions).toHaveLength(1);

		// Delete note-b
		removeFileFromIndex('/vault/note-b.md');

		// Recompute — backlink should be gone
		updateBacklinksForFile('/vault/note-a.md');
		expect(backlinksStore.linkedMentions).toHaveLength(0);
	});
});

describe('fetchBacklinksV2', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		resetBacklinks();
	});

	it('invokes get_backlinks_v2 with the path', async () => {
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchBacklinksV2('/vault/note-a.md');

		expect(invoke).toHaveBeenCalledWith('get_backlinks_v2', { path: '/vault/note-a.md' });
	});

	it('writes converted entries to backlinksStore.linkedMentions', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{
				path: '/vault/note-b.md',
				title: 'note-b',
				frontmatter: {},
				outgoingLinks: [],
				tags: [],
				modifiedAt: 0,
				wordCount: 4,
				snippet: 'See note-a',
			},
		]);

		await fetchBacklinksV2('/vault/note-a.md');

		expect(backlinksStore.linkedMentions).toEqual([
			{
				sourcePath: '/vault/note-b.md',
				sourceName: 'note-b',
				snippets: [{ text: 'See note-a', linkStart: 0, linkEnd: 0 }],
			},
		]);
	});

	it('writes empty linked mentions when the v2 result is empty', async () => {
		backlinksStore.setLinkedMentions([
			{ sourcePath: '/vault/old.md', sourceName: 'old', snippets: [] },
		]);
		vi.mocked(invoke).mockResolvedValue([]);

		await fetchBacklinksV2('/vault/note-a.md');

		expect(backlinksStore.linkedMentions).toEqual([]);
	});

	it('preserves prior linked mentions on IPC error (does not throw)', async () => {
		const prior = [{ sourcePath: '/vault/x.md', sourceName: 'x', snippets: [] }];
		backlinksStore.setLinkedMentions(prior);
		vi.mocked(invoke).mockRejectedValue(new Error('IPC failure'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await expect(fetchBacklinksV2('/vault/note-a.md')).resolves.toBeUndefined();
		expect(backlinksStore.linkedMentions).toEqual(prior);

		consoleSpy.mockRestore();
	});

	it('handles multiple entries and preserves order from the Rust response', async () => {
		vi.mocked(invoke).mockResolvedValue([
			{ path: '/vault/a.md', title: 'a', frontmatter: {}, outgoingLinks: [], tags: [], modifiedAt: 0, wordCount: 1, snippet: 'x' },
			{ path: '/vault/b.md', title: 'b', frontmatter: {}, outgoingLinks: [], tags: [], modifiedAt: 0, wordCount: 1, snippet: 'y' },
		]);

		await fetchBacklinksV2('/vault/note-a.md');

		expect(backlinksStore.linkedMentions.map((e) => e.sourcePath)).toEqual([
			'/vault/a.md',
			'/vault/b.md',
		]);
	});
});
