import { pathExists, readText, writeText, createFolder } from '$lib/core/filesystem/fs-rust.service';
import type { BookmarkEntry } from './bookmarks.types';
import { bookmarksStore } from './bookmarks.store.svelte';
import { toggleBookmark, updateBookmarkPaths } from './bookmarks.logic';
import { error } from '$lib/utils/debug';

/** Internal directory inside the vault that stores app metadata */
const KOKOBRAIN_DIR = '.kokobrain';
const BOOKMARKS_FILE = 'bookmarks.json';

/** Resolves the full path to the bookmarks JSON file */
function getBookmarksPath(vaultPath: string): string {
	return `${vaultPath}/${KOKOBRAIN_DIR}/${BOOKMARKS_FILE}`;
}

/** Resolves the full path to the internal metadata directory */
function getDirPath(vaultPath: string): string {
	return `${vaultPath}/${KOKOBRAIN_DIR}`;
}

/** Reads bookmarks from disk. Falls back to empty array if file is missing or invalid. */
export async function loadBookmarks(vaultPath: string): Promise<void> {
	const filePath = getBookmarksPath(vaultPath);
	try {
		const fileExists = await pathExists(vaultPath, filePath);
		if (!fileExists) {
			bookmarksStore.setBookmarks([]);
			return;
		}
		const content = await readText(vaultPath, filePath);
		const parsed = JSON.parse(content) as BookmarkEntry[];
		bookmarksStore.setBookmarks(Array.isArray(parsed) ? parsed : []);
	} catch (err) {
		error('BOOKMARKS', 'Failed to load bookmarks:', err);
		bookmarksStore.setBookmarks([]);
	}
}

/** Persists the current bookmarks to disk, creating the `.kokobrain` dir if needed */
export async function saveBookmarks(vaultPath: string): Promise<void> {
	const dirPath = getDirPath(vaultPath);
	const filePath = getBookmarksPath(vaultPath);
	try {
		const dirExists = await pathExists(vaultPath, dirPath);
		if (!dirExists) {
			await createFolder(dirPath);
		}
		const content = JSON.stringify(bookmarksStore.bookmarks, null, 2);
		await writeText(vaultPath, filePath, content);
	} catch (err) {
		error('BOOKMARKS', 'Failed to save bookmarks:', err);
		throw err;
	}
}

/** Toggles a bookmark for the given path and saves to disk */
export async function toggleBookmarkForPath(
	vaultPath: string,
	path: string,
	name: string,
	isDirectory: boolean,
): Promise<void> {
	const updated = toggleBookmark(bookmarksStore.bookmarks, path, name, isDirectory);
	bookmarksStore.setBookmarks(updated);
	try {
		await saveBookmarks(vaultPath);
	} catch {
		// Store updated in memory; retry on next toggle
	}
}

/** Updates bookmark paths after a rename or move and saves to disk */
export async function updateBookmarkPathsAfterMove(
	vaultPath: string,
	oldPath: string,
	newPath: string,
): Promise<void> {
	const updated = updateBookmarkPaths(bookmarksStore.bookmarks, oldPath, newPath);
	bookmarksStore.setBookmarks(updated);
	try {
		await saveBookmarks(vaultPath);
	} catch {
		// Store updated in memory; retry on next operation
	}
}

/** Clears bookmark state (e.g. when switching vaults) */
export function resetBookmarks(): void {
	bookmarksStore.reset();
}
