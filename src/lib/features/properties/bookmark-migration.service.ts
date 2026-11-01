import { exists, readTextFile, remove } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { isMarkdownFile } from '#lib/core/filesystem/fs.logic.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { error } from '#lib/utils/debug.js';
import { basename, normalizePath } from '#lib/utils/path.js';
import { FrontmatterWriteError, updateNoteFrontmatter } from './frontmatter-write.service';
import { toggleFavorite } from './lifecycle.logic';

/** The file the removed bookmarks feature kept its list in, relative to the vault. */
const BOOKMARKS_FILE = '.kokobrain/bookmarks.json';

/** One entry of the legacy bookmarks file; only the fields the migration reads. */
interface LegacyBookmark {
	/** Absolute path of the bookmarked item */
	path: string;
	/** Whether the bookmarked item is a folder */
	isDirectory?: boolean;
}

/** The entries of a parsed bookmarks file. Anything that is not a list of paths counts as empty. */
function bookmarksFrom(content: string): LegacyBookmark[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(content);
	} catch (err) {
		error('BOOKMARKS', 'Bookmarks file is not valid JSON; deleting it with no bookmarks moved:', err);
		return [];
	}
	if (!Array.isArray(parsed)) return [];
	return parsed.filter(
		(b): b is LegacyBookmark => typeof b === 'object' && b !== null && typeof b.path === 'string',
	);
}

/**
 * Moves the legacy bookmarks into Favorites, once per vault (ADR 0033, PRD Q7).
 *
 * Every bookmarked markdown note inside the vault gets `_favorite: true`.
 * Folders, non-markdown files, notes that no longer exist and paths outside the
 * vault are not touched: they are named in one toast and dropped. The bookmarks
 * file is deleted only when every write succeeded, so a failed write leaves it
 * for the next vault open; the rerun is idempotent because an already-favorite
 * note is not rewritten. When the user switches vaults mid-run, it stops with no
 * toast and keeps the file.
 *
 * Never rejects: a migration problem must not stop the vault from opening.
 */
export async function migrateBookmarksToFavorites(vaultPath: string): Promise<void> {
	const filePath = `${vaultPath}/${BOOKMARKS_FILE}`;
	let bookmarks: LegacyBookmark[];
	try {
		if (!(await exists(filePath))) return;
		bookmarks = bookmarksFrom(await readTextFile(filePath));
	} catch (err) {
		error('BOOKMARKS', 'Failed to read bookmarks for the Favorites migration:', err);
		toast.error('Could not read your bookmarks to move them to Favorites. Kokobrain will try again next time the vault opens.');
		return;
	}

	const dropped: string[] = [];
	const failed: string[] = [];
	// Sequential: `updateNoteFrontmatter` requires writes to be serialized per path.
	for (const bookmark of bookmarks) {
		const name = basename(bookmark.path);
		// The fs scope spans every vault, so a copied vault's file can point at the original's notes.
		const insideVault = normalizePath(bookmark.path).startsWith(`${vaultPath}/`);
		if (!insideVault || bookmark.isDirectory || !isMarkdownFile(name)) {
			dropped.push(name);
			continue;
		}
		try {
			if (!(await exists(bookmark.path))) {
				dropped.push(name);
				continue;
			}
			// `updateNoteFrontmatter` takes the vault open at its entry as its baseline,
			// so a switch between two bookmarks is caught only here.
			if (vaultStore.path !== vaultPath) return;
			await updateNoteFrontmatter(bookmark.path, (props) => toggleFavorite(props, true));
		} catch (err) {
			if (err instanceof FrontmatterWriteError && err.reason === 'missing') {
				dropped.push(name);
				continue;
			}
			// The user left this vault: no toast about it. The kept file finishes the job on its next open.
			if (err instanceof FrontmatterWriteError && err.reason === 'vault-changed') return;
			error('BOOKMARKS', `Failed to favorite bookmarked note ${bookmark.path}:`, err);
			failed.push(name);
		}
	}

	if (vaultStore.path !== vaultPath) return;
	if (failed.length > 0) {
		toast.error(
			`Could not mark these bookmarked notes as favorites: ${failed.join(', ')}. Your bookmarks are kept and Kokobrain will try again next time the vault opens.`,
		);
		return;
	}

	try {
		await remove(filePath);
	} catch (err) {
		error('BOOKMARKS', 'Failed to delete the bookmarks file after the Favorites migration:', err);
		toast.error('Your bookmarks were moved to Favorites, but the old bookmarks file could not be deleted.');
		return;
	}

	if (vaultStore.path !== vaultPath) return;
	if (dropped.length > 0) {
		toast.info(
			`Bookmarks are now Favorites. Only notes can be favorites, so these bookmarks were removed: ${dropped.join(', ')}`,
		);
	}
}
