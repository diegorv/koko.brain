import type { BookmarkEntry } from './bookmarks.types';

let bookmarks = $state<BookmarkEntry[]>([]);

/** Reactive store for bookmarked files and folders */
export const bookmarksStore = {
	get bookmarks() { return bookmarks; },

	/** Checks if a path is currently bookmarked */
	isBookmarked(path: string): boolean {
		return bookmarks.some((b) => b.path === path);
	},

	/** Replaces the entire bookmarks list (used on load) */
	setBookmarks(value: BookmarkEntry[]) {
		bookmarks = value;
	},

	/** Clears all bookmarks */
	reset() {
		bookmarks = [];
	},
};
