import { invoke } from '@tauri-apps/api/core';
import { fsStore } from './fs.store.svelte';
import { refreshTree } from './fs.service';
import { collectFilePathsUnder, getFileName, isMarkdownFile } from './fs.logic';
import { updateLinksAfterRename, updateTabAfterRenameOrMove } from './link-updater.service';
import { applyNoteChange } from './note-change.service';
import { closeTabsForDeletedPath } from '$lib/core/editor/editor.service';
import { updateBookmarkPathsAfterMove } from '$lib/features/bookmarks/bookmarks.service';
import { clearViewParseCache } from '$lib/features/type-definitions/view-parse-cache';
import { error } from '$lib/utils/debug';

/** One path change: where the item goes, and how the disk move is performed. */
export interface PathChange {
	/** Absolute path the item is leaving. */
	from: string;
	/** Absolute path it lands on, or `null` for a deletion. */
	to: string | null;
	/**
	 * Whether `from` is a directory, when the caller knows. An explicit `false`
	 * skips the child walk, since a file node has no children. Omitted means
	 * "unknown" and the walk runs: only `deleteItem` carries the flag, and
	 * threading it into the rename and drag-and-drop entry points would change
	 * four call sites to save a tree walk that already returns nothing.
	 */
	isDirectory?: boolean;
	/** Performs the disk mutation. Runs between the pre-op and post-op steps. */
	diskOp: () => Promise<void>;
}

/**
 * Drops every trace of a note that stops existing at `path`: the index-dedupe
 * signature (so a later re-creation with identical bytes is not silently
 * skipped), every registered per-file index, and the Rust `VaultIndex` entry
 * (entries + tags_index + backlinks + properties_index + by_path). The Rust
 * command emits `vault-index-updated` so panels reactively refetch.
 *
 * A thin adapter over the note-change owner's delete branch. No vault root is
 * passed: the FTS5 row is dropped by the watcher event that follows the disk
 * operation, which is the only source that carries one.
 *
 * Fire-and-forget: the Rust removal is not awaited, its failure is logged.
 *
 * @param path Absolute path the note is vanishing from (delete, rename, move).
 */
export function forgetNote(path: string): void {
	void applyNoteChange({ kind: 'delete', source: 'fs', path });
}

/**
 * THE one owner of "a note's path changed". Delete, rename and move all route
 * through here so the six path-keyed consumers cannot drift into hand-picked
 * per-operation subsets, and so a FOLDER change reaches its children instead of
 * evicting a single directory key that no index holds.
 *
 * Ordering is the whole point, and it is load-bearing at three places:
 * - `closeTabsForDeletedPath` runs BEFORE `diskOp` so the 2 s auto-save debounce
 *   cannot fire with a stale path during the async gap and recreate the file.
 *   That is why the disk operation arrives as a callback rather than being done
 *   by the caller beforehand.
 * - `updateTabAfterRenameOrMove` runs immediately after `diskOp`, before any
 *   further await, so the same debounce writes to the NEW path.
 * - Rust `rename_note` runs BEFORE the per-path removal sweep. Reversed, the
 *   sweep's `remove_note_from_index` would delete the entries the re-key needs
 *   and the children would vanish from the `VaultIndex` instead of following
 *   the folder.
 *
 * The child paths are snapshotted from `fsStore.fileTree` BEFORE `diskOp`,
 * because `refreshTree()` below replaces the tree with the post-rename shape
 * in which the old child paths no longer exist.
 *
 * Never throws on the index legs: the Rust IPC failures are logged, the
 * consumer fan-out isolates its own failures. `diskOp` rejections propagate:
 * the caller owns the user-facing error.
 *
 * @param change What moved, where to, and how to move it.
 */
export async function applyPathChange(change: PathChange): Promise<void> {
	const { from, to, diskOp } = change;

	// Snapshot before the disk op: refreshTree() re-scans into the new shape.
	const childPaths = change.isDirectory === false
		? []
		: collectFilePathsUnder(fsStore.fileTree, from);

	if (to === null) closeTabsForDeletedPath(from);

	await diskOp();

	if (to !== null) {
		updateTabAfterRenameOrMove(from, to);
		// Must precede the removal sweep: `updateLinksAfterRename` resolves the
		// affected files through `get_backlinks_v2(from)`, which reads the very
		// Rust entry the sweep is about to prune. A pure move keeps the note
		// name, so the function's own same-name guard makes it inert there.
		if (isMarkdownFile(getFileName(to))) {
			await updateLinksAfterRename(from, to);
		}
	}

	await refreshTree();

	if (to !== null) {
		// Re-key the Rust `VaultIndex` for `from` and everything under
		// `from + '/'`. Awaited so the sweep below cannot race ahead of it.
		try {
			await invoke('rename_note', { from, to });
		} catch (err) {
			error('FS', 'rename_note failed:', err);
		}
	}

	// Drop the OLD paths from the dedupe map, the registered per-file indexes
	// and the Rust index. On a rename/move the Rust leg is a no-op by now (the
	// entries already moved), while the TS leg still evicts the stale keys.
	for (const path of [from, ...childPaths]) {
		forgetNote(path);
		// Drop the parsed `.view` definition so a view later living at this
		// path is re-read from disk instead of served from the stale cache.
		clearViewParseCache(path);
	}

	// Already prefix-aware internally, so do not walk the children again here.
	const { quickSwitcherStore } = await import('$lib/features/quick-switcher/quick-switcher.store.svelte');
	quickSwitcherStore.removeRecentPath(from);

	if (to !== null) {
		// Deliberately not done on delete: a trashed file is restorable, so its
		// bookmark must survive.
		const { vaultStore } = await import('$lib/core/vault/vault.store.svelte');
		if (vaultStore.path) {
			updateBookmarkPathsAfterMove(vaultStore.path, from, to);
		}
	}
}
