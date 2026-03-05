import { describe, it, expect, vi } from 'vitest';
import {
	isBookmarked,
	addBookmark,
	removeBookmark,
	toggleBookmark,
	updateBookmarkPaths,
} from '$lib/features/bookmarks/bookmarks.logic';
import type { BookmarkEntry } from '$lib/features/bookmarks/bookmarks.types';

function makeBookmark(path: string, name?: string, isDirectory = false): BookmarkEntry {
	return { path, name: name ?? path.split('/').pop()!, isDirectory, createdAt: 1000 };
}

describe('isBookmarked', () => {
	const bookmarks = [makeBookmark('/vault/a.md'), makeBookmark('/vault/folder', 'folder', true)];

	it('returns true for a bookmarked path', () => {
		expect(isBookmarked(bookmarks, '/vault/a.md')).toBe(true);
	});

	it('returns false for a non-bookmarked path', () => {
		expect(isBookmarked(bookmarks, '/vault/b.md')).toBe(false);
	});

	it('returns false for empty bookmarks', () => {
		expect(isBookmarked([], '/vault/a.md')).toBe(false);
	});
});

describe('addBookmark', () => {
	it('adds a new bookmark entry', () => {
		vi.spyOn(Date, 'now').mockReturnValue(5000);
		const result = addBookmark([], '/vault/a.md', 'a.md', false);

		expect(result).toHaveLength(1);
		expect(result[0]).toEqual({ path: '/vault/a.md', name: 'a.md', isDirectory: false, createdAt: 5000 });
		vi.restoreAllMocks();
	});

	it('returns unchanged array if already bookmarked', () => {
		const bookmarks = [makeBookmark('/vault/a.md')];
		const result = addBookmark(bookmarks, '/vault/a.md', 'a.md', false);

		expect(result).toBe(bookmarks);
	});
});

describe('removeBookmark', () => {
	it('removes a bookmark by path', () => {
		const bookmarks = [makeBookmark('/vault/a.md'), makeBookmark('/vault/b.md')];
		const result = removeBookmark(bookmarks, '/vault/a.md');

		expect(result).toHaveLength(1);
		expect(result[0].path).toBe('/vault/b.md');
	});

	it('returns unchanged array if path not found', () => {
		const bookmarks = [makeBookmark('/vault/a.md')];
		const result = removeBookmark(bookmarks, '/vault/missing.md');

		expect(result).toHaveLength(1);
	});
});

describe('toggleBookmark', () => {
	it('adds bookmark when not present', () => {
		const result = toggleBookmark([], '/vault/a.md', 'a.md', false);

		expect(result).toHaveLength(1);
		expect(result[0].path).toBe('/vault/a.md');
	});

	it('removes bookmark when already present', () => {
		const bookmarks = [makeBookmark('/vault/a.md')];
		const result = toggleBookmark(bookmarks, '/vault/a.md', 'a.md', false);

		expect(result).toHaveLength(0);
	});
});

describe('updateBookmarkPaths', () => {
	it('updates an exact path match', () => {
		const bookmarks = [makeBookmark('/vault/old.md')];
		const result = updateBookmarkPaths(bookmarks, '/vault/old.md', '/vault/new.md');

		expect(result[0].path).toBe('/vault/new.md');
		expect(result[0].name).toBe('new.md');
	});

	it('updates child paths under a renamed directory', () => {
		const bookmarks = [makeBookmark('/vault/folder/note.md')];
		const result = updateBookmarkPaths(bookmarks, '/vault/folder', '/vault/renamed');

		expect(result[0].path).toBe('/vault/renamed/note.md');
	});

	it('leaves unrelated paths unchanged', () => {
		const bookmarks = [makeBookmark('/vault/other.md')];
		const result = updateBookmarkPaths(bookmarks, '/vault/folder', '/vault/renamed');

		expect(result[0].path).toBe('/vault/other.md');
	});

	it('handles deeply nested child paths', () => {
		const bookmarks = [makeBookmark('/vault/a/b/c.md')];
		const result = updateBookmarkPaths(bookmarks, '/vault/a', '/vault/x');

		expect(result[0].path).toBe('/vault/x/b/c.md');
	});

	it('returns empty array for empty bookmarks', () => {
		const result = updateBookmarkPaths([], '/vault/old.md', '/vault/new.md');
		expect(result).toEqual([]);
	});

	it('handles path with no matching entries gracefully', () => {
		const bookmarks = [makeBookmark('/vault/a.md'), makeBookmark('/vault/b.md')];
		const result = updateBookmarkPaths(bookmarks, '/vault/nonexistent', '/vault/new');

		expect(result).toHaveLength(2);
		expect(result[0].path).toBe('/vault/a.md');
		expect(result[1].path).toBe('/vault/b.md');
	});
});
