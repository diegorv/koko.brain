import type { BookmarkEntry } from './bookmarks.types';

/** Checks if a path is bookmarked */
export function isBookmarked(bookmarks: BookmarkEntry[], path: string): boolean {
	return bookmarks.some((b) => b.path === path);
}

/** Adds a bookmark entry. Returns unchanged array if already bookmarked. */
export function addBookmark(
	bookmarks: BookmarkEntry[],
	path: string,
	name: string,
	isDirectory: boolean,
): BookmarkEntry[] {
	if (isBookmarked(bookmarks, path)) return bookmarks;
	return [...bookmarks, { path, name, isDirectory, createdAt: Date.now() }];
}

/** Removes a bookmark by path. Returns unchanged array if not found. */
export function removeBookmark(bookmarks: BookmarkEntry[], path: string): BookmarkEntry[] {
	return bookmarks.filter((b) => b.path !== path);
}

/** Toggles a bookmark: adds if missing, removes if present */
export function toggleBookmark(
	bookmarks: BookmarkEntry[],
	path: string,
	name: string,
	isDirectory: boolean,
): BookmarkEntry[] {
	if (isBookmarked(bookmarks, path)) {
		return removeBookmark(bookmarks, path);
	}
	return addBookmark(bookmarks, path, name, isDirectory);
}

/**
 * Updates bookmark paths after a rename or move.
 * Handles both exact matches and child paths under a renamed directory.
 */
export function updateBookmarkPaths(
	bookmarks: BookmarkEntry[],
	oldPath: string,
	newPath: string,
): BookmarkEntry[] {
	return bookmarks.map((b) => {
		if (b.path === oldPath) {
			const newName = newPath.split('/').pop() ?? b.name;
			return { ...b, path: newPath, name: newName };
		}
		if (b.path.startsWith(oldPath + '/')) {
			const relativeSuffix = b.path.substring(oldPath.length);
			return { ...b, path: newPath + relativeSuffix };
		}
		return b;
	});
}
