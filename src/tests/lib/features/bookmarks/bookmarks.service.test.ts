import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/core/filesystem/fs-rust.service', () => ({
	pathExists: vi.fn(),
	readText: vi.fn(),
	writeText: vi.fn(),
	createFolder: vi.fn(),
}));

import { pathExists, readText, writeText, createFolder } from '$lib/core/filesystem/fs-rust.service';
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
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(readText).mockResolvedValue(JSON.stringify(bookmarks));

		await loadBookmarks('/vault');

		expect(pathExists).toHaveBeenCalledWith('/vault', '/vault/.kokobrain/bookmarks.json');
		expect(readText).toHaveBeenCalledWith('/vault', '/vault/.kokobrain/bookmarks.json');
		expect(bookmarksStore.bookmarks).toHaveLength(2);
		expect(bookmarksStore.bookmarks[0].path).toBe('/vault/a.md');
		expect(bookmarksStore.bookmarks[1].path).toBe('/vault/b.md');
	});

	it('sets empty bookmarks when file does not exist', async () => {
		vi.mocked(pathExists).mockResolvedValue(false);

		await loadBookmarks('/vault');

		expect(readText).not.toHaveBeenCalled();
		expect(bookmarksStore.bookmarks).toEqual([]);
	});

	it('sets empty bookmarks on parse error', async () => {
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(readText).mockResolvedValue('not valid json');

		await loadBookmarks('/vault');

		expect(bookmarksStore.bookmarks).toEqual([]);
	});

	it('sets empty bookmarks when readText rejects', async () => {
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(readText).mockRejectedValue(new Error('read failed'));

		await loadBookmarks('/vault');

		expect(bookmarksStore.bookmarks).toEqual([]);
	});

	it('updates isBookmarked state after loading', async () => {
		const bookmarks = [
			{ path: '/vault/a.md', name: 'a.md', isDirectory: false, createdAt: 1000 },
		];
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(readText).mockResolvedValue(JSON.stringify(bookmarks));

		await loadBookmarks('/vault');

		expect(bookmarksStore.isBookmarked('/vault/a.md')).toBe(true);
		expect(bookmarksStore.isBookmarked('/vault/other.md')).toBe(false);
	});
});

describe('toggleBookmarkForPath', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		bookmarksStore.reset();
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(writeText).mockResolvedValue(undefined);
	});

	it('adds a bookmark and saves to disk', async () => {
		await toggleBookmarkForPath('/vault', '/vault/a.md', 'a.md', false);

		expect(bookmarksStore.bookmarks).toHaveLength(1);
		expect(bookmarksStore.bookmarks[0].path).toBe('/vault/a.md');
		expect(writeText).toHaveBeenCalledWith(
			'/vault',
			'/vault/.kokobrain/bookmarks.json',
			expect.any(String),
		);
	});

	it('removes a bookmark when toggled again', async () => {
		await toggleBookmarkForPath('/vault', '/vault/a.md', 'a.md', false);
		expect(bookmarksStore.bookmarks).toHaveLength(1);

		await toggleBookmarkForPath('/vault', '/vault/a.md', 'a.md', false);

		expect(bookmarksStore.bookmarks).toHaveLength(0);
	});

	it('keeps the in-memory toggle when saveBookmarks rejects', async () => {
		vi.mocked(writeText).mockRejectedValue(new Error('disk full'));

		await toggleBookmarkForPath('/vault', '/vault/a.md', 'a.md', false);

		expect(bookmarksStore.bookmarks).toHaveLength(1);
	});
});

describe('updateBookmarkPathsAfterMove', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		bookmarksStore.reset();
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(writeText).mockResolvedValue(undefined);
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
		vi.mocked(createFolder).mockResolvedValue(undefined);
	});

	it('writes the manifest when the .kokobrain dir already exists', async () => {
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(writeText).mockResolvedValue(undefined);

		await saveBookmarks('/vault');

		expect(createFolder).not.toHaveBeenCalled();
		expect(writeText).toHaveBeenCalledWith(
			'/vault',
			'/vault/.kokobrain/bookmarks.json',
			expect.any(String),
		);
	});

	it('creates the .kokobrain dir via createFolder when missing', async () => {
		vi.mocked(pathExists).mockResolvedValue(false);
		vi.mocked(writeText).mockResolvedValue(undefined);

		await saveBookmarks('/vault');

		expect(createFolder).toHaveBeenCalledWith('/vault/.kokobrain');
		expect(writeText).toHaveBeenCalled();
	});

	it('propagates errors to the caller', async () => {
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(writeText).mockRejectedValue(new Error('disk full'));

		await expect(saveBookmarks('/vault')).rejects.toThrow('disk full');
	});

	it('propagates createFolder errors', async () => {
		vi.mocked(pathExists).mockResolvedValue(false);
		vi.mocked(createFolder).mockRejectedValue(new Error('mkdir failed'));

		await expect(saveBookmarks('/vault')).rejects.toThrow('mkdir failed');
	});

	it('does not throw on success', async () => {
		vi.mocked(pathExists).mockResolvedValue(true);
		vi.mocked(writeText).mockResolvedValue(undefined);

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
