import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	exists: vi.fn(),
}));

import { readTextFile, writeTextFile, exists } from '@tauri-apps/plugin-fs';
import { bookmarksStore } from '$lib/features/bookmarks/bookmarks.store.svelte';
import { loadBookmarks, saveBookmarks, toggleBookmarkForPath, updateBookmarkPathsAfterMove, resetBookmarks } from '$lib/features/bookmarks/bookmarks.service';

describe('loadBookmarks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		bookmarksStore.reset();
	});

	it('loads bookmarks from disk into the store', async () => {
		const bookmarks = [
			{ path: '/vault/a.md', name: 'a.md', isDirectory: false, createdAt: 1000 },
			{ path: '/vault/b.md', name: 'b.md', isDirectory: false, createdAt: 2000 },
		];
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(bookmarks));

		await loadBookmarks('/vault');

		expect(bookmarksStore.bookmarks).toHaveLength(2);
		expect(bookmarksStore.bookmarks[0].path).toBe('/vault/a.md');
		expect(bookmarksStore.bookmarks[1].path).toBe('/vault/b.md');
	});

	it('sets empty bookmarks when file does not exist', async () => {
		vi.mocked(exists).mockResolvedValue(false);

		await loadBookmarks('/vault');

		expect(bookmarksStore.bookmarks).toEqual([]);
	});

	it('sets empty bookmarks on parse error', async () => {
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue('not valid json');

		await loadBookmarks('/vault');

		expect(bookmarksStore.bookmarks).toEqual([]);
	});

	it('updates isBookmarked state after loading', async () => {
		const bookmarks = [
			{ path: '/vault/a.md', name: 'a.md', isDirectory: false, createdAt: 1000 },
		];
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(readTextFile).mockResolvedValue(JSON.stringify(bookmarks));

		await loadBookmarks('/vault');

		expect(bookmarksStore.isBookmarked('/vault/a.md')).toBe(true);
		expect(bookmarksStore.isBookmarked('/vault/other.md')).toBe(false);
	});
});

describe('toggleBookmarkForPath', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		bookmarksStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	it('adds a bookmark and saves to disk', async () => {
		await toggleBookmarkForPath('/vault', '/vault/a.md', 'a.md', false);

		expect(bookmarksStore.bookmarks).toHaveLength(1);
		expect(bookmarksStore.bookmarks[0].path).toBe('/vault/a.md');
		expect(writeTextFile).toHaveBeenCalled();
	});

	it('removes a bookmark when toggled again', async () => {
		await toggleBookmarkForPath('/vault', '/vault/a.md', 'a.md', false);
		expect(bookmarksStore.bookmarks).toHaveLength(1);

		await toggleBookmarkForPath('/vault', '/vault/a.md', 'a.md', false);

		expect(bookmarksStore.bookmarks).toHaveLength(0);
	});
});

describe('updateBookmarkPathsAfterMove', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		bookmarksStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
		vi.mocked(writeTextFile).mockResolvedValue(undefined);
	});

	it('updates bookmark paths after file move', async () => {
		bookmarksStore.setBookmarks([
			{ path: '/vault/old.md', name: 'old.md', isDirectory: false, createdAt: 1000 },
		]);

		await updateBookmarkPathsAfterMove('/vault', '/vault/old.md', '/vault/new.md');

		expect(bookmarksStore.bookmarks[0].path).toBe('/vault/new.md');
		expect(bookmarksStore.isBookmarked('/vault/new.md')).toBe(true);
		expect(bookmarksStore.isBookmarked('/vault/old.md')).toBe(false);
	});
});

describe('saveBookmarks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		bookmarksStore.reset();
		vi.mocked(exists).mockResolvedValue(true);
	});

	it('propagates errors to the caller', async () => {
		vi.mocked(writeTextFile).mockRejectedValue(new Error('disk full'));

		await expect(saveBookmarks('/vault')).rejects.toThrow('disk full');
	});

	it('does not throw on success', async () => {
		vi.mocked(writeTextFile).mockResolvedValue(undefined);

		await expect(saveBookmarks('/vault')).resolves.toBeUndefined();
	});
});

describe('resetBookmarks', () => {
	it('clears bookmarks store', () => {
		bookmarksStore.setBookmarks([
			{ path: '/vault/a.md', name: 'a.md', isDirectory: false, createdAt: 1000 },
		]);

		resetBookmarks();

		expect(bookmarksStore.bookmarks).toEqual([]);
	});
});
