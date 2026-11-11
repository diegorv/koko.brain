import { call } from '#lib/contracts/ipc.js';
import { fsStore } from './fs.store.svelte';
import { currentTreeOrder, refreshTree } from './fs.service';
import { collectFilePathsUnder, findNodeByPath, getFileName, isMarkdownFile, moveTreeNode, PreDeleteSaveError, removeNodeByPath } from './fs.logic';
import { updateLinksAfterRename, updateTabAfterRenameOrMove } from './link-updater.service';
import { applyNoteChange } from './note-change.service';
import { closeTabsForDeletedPath, saveFileByPath } from '#lib/core/editor/editor.service.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { isTabDirty, isVirtualTab } from '#lib/core/editor/editor.logic.js';
import type { EditorTab } from '#lib/core/editor/editor.types.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { debug, error } from '#lib/utils/debug.js';
import { vaultRelativeKey } from '#lib/utils/path.js';

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
 * A feature index keyed by note path that must follow a rename, move or
 * delete. Registered rather than imported: `core/` must not import
 * `features/` (ADR-0003).
 */
export interface PathChangeConsumer {
	/** Name used in failure logs. */
	name: string;
	/**
	 * Called once per change, after the disk operation succeeded and before
	 * `applyPathChange` awaits anything else. A folder change arrives once,
	 * for the folder: paths under `from + '/'` moved to `to + '/'` with it.
	 * @param from - absolute path the item left
	 * @param to - absolute path it landed on, or `null` for a deletion
	 */
	pathChanged(from: string, to: string | null): void;
	/**
	 * Called once per rename or move, after `applyPathChange` finished every
	 * step: the link rewrite, the tree re-key, `rename_note`,
	 * `rename_in_search_index` and the removal sweep. Never for a delete,
	 * never when `diskOp` failed, and not when the change rejected part way
	 * (the link rewrite's `get_backlinks_v2` is not caught).
	 * @param from - absolute path the item left
	 * @param to - absolute path it landed on
	 */
	settled?(from: string, to: string): void;
}

/**
 * Saves every non-virtual dirty tab at `path` or under `path + '/'`, in tab
 * order. Throws `PreDeleteSaveError` on the first failed save.
 */
async function saveDirtyTabsUnder(path: string): Promise<void> {
	const dirty = editorStore.tabs
		.filter((t) => (t.path === path || t.path.startsWith(path + '/')) && !isVirtualTab(t) && isTabDirty(t))
		.map((t) => t.path);
	for (const tabPath of dirty) {
		if (!(await saveFileByPath(tabPath))) throw new PreDeleteSaveError(tabPath);
	}
}

/** Registered path-change consumers, in registration order. */
const pathChangeConsumers: PathChangeConsumer[] = [];

/**
 * Registers a consumer to follow every path change. Returns an unregister
 * function. A consumer has one of three lifetimes: vault-lifetime (wired by
 * `initializeVault`, unregistered in `teardownVault`), app-lifetime (wired
 * once by `app/boot.ts::registerAppPorts`, never unregistered) or
 * mod-lifetime (registered by a mod's subscription, unregistered by its
 * disposer or the mod's unload).
 */
export function registerPathChangeConsumer(consumer: PathChangeConsumer): () => void {
	pathChangeConsumers.push(consumer);
	debug('FS', `Path-change consumer registered: ${consumer.name}`);
	return () => {
		const idx = pathChangeConsumers.indexOf(consumer);
		if (idx >= 0) pathChangeConsumers.splice(idx, 1);
	};
}

/**
 * Drops every trace of a note that stops existing at `path`: the index-dedupe
 * signature (so a later re-creation with identical bytes is not silently
 * skipped), every registered per-file index, and the Rust `VaultIndex` entry
 * (entries + tags_index + backlinks + properties_index + by_path). The Rust
 * command emits `vault-index-updated` so panels reactively refetch.
 *
 * A thin adapter over the note-change owner's delete branch. The vault root is
 * passed so the FTS5 row and the semantic chunks (+ the `mtime:` key) go with
 * it. On a rename or move `applyPathChange` has already moved those rows to the
 * new key (`rename_in_search_index`), so these removals find nothing at the old
 * one; on a delete they drop the rows. The watcher event that follows the disk
 * operation is NOT a substitute for either:
 * it is dropped whenever the burst matches `areAllRecentSaves` (a 2 s autosave
 * before the delete leaves a 15 s marker), a folder delete arrives as a single
 * directory rename that the directory-only filter discards, and a burst above
 * `INCREMENTAL_THRESHOLD` takes the full-rebuild branch, which removes nothing
 * per path.
 *
 * Fire-and-forget: the Rust removal is not awaited, its failure is logged.
 *
 * @param path Absolute path the note is vanishing from (delete, rename, move).
 */
export function forgetNote(path: string): void {
	void applyNoteChange({ kind: 'delete', source: 'fs', path, vaultPath: vaultStore.path ?? undefined });
}

/**
 * THE one owner of "a note's path changed". Delete, rename and move all route
 * through here so the path-keyed consumers cannot drift into hand-picked
 * per-operation subsets, and so a FOLDER change reaches its children instead of
 * evicting a single directory key that no index holds.
 *
 * Ordering is the whole point, and it is load-bearing at three places:
 * - On a delete, every dirty tab at or under `from` is saved first (the Trash
 *   keeps the disk bytes), then `closeTabsForDeletedPath` runs BEFORE `diskOp`
 *   so the 2 s auto-save debounce cannot fire with a stale path during the
 *   async gap and recreate the file. That is why the disk operation arrives as
 *   a callback rather than being done by the caller beforehand. A failed save
 *   throws `PreDeleteSaveError` before anything is closed; a failed `diskOp`
 *   re-adds the closed tabs (not their order, focus or view state).
 * - `updateTabAfterRenameOrMove` runs immediately after `diskOp`, before any
 *   further await, so the same debounce writes to the NEW path.
 * - Rust `rename_note` and `rename_in_search_index` run BEFORE the per-path
 *   removal sweep. Reversed, the sweep's `remove_note_from_index`,
 *   `remove_from_search_index` and `remove_semantic_file` would delete the
 *   entries and search rows the re-keys need, and the children would vanish
 *   from the `VaultIndex` and from text and semantic search instead of
 *   following the folder.
 *
 * The child paths and the moved node are snapshotted from `fsStore.fileTree`
 * BEFORE `diskOp`. The tree drops the old paths after it: a delete removes
 * the node, a rename or move re-inserts the snapshot at `to` (on the tree as
 * it is after the link rewrite, so a watcher patch that landed meanwhile is
 * kept). With no snapshot (the item was not in the tree), the tree is
 * rescanned instead.
 *
 * Never throws on the index legs: the Rust IPC failures are logged, the
 * consumer fan-out isolates its own failures. `diskOp` rejections propagate:
 * the caller owns the user-facing error.
 *
 * @param change What moved, where to, and how to move it.
 */
export async function applyPathChange(change: PathChange): Promise<void> {
	const { from, to, diskOp } = change;

	// Snapshot before the disk op: the tree loses the old paths after it.
	const childPaths = change.isDirectory === false
		? []
		: collectFilePathsUnder(fsStore.fileTree, from);
	const movedNode = to === null ? null : findNodeByPath(fsStore.fileTree, from);

	let closedTabs: EditorTab[] = [];
	if (to === null) {
		await saveDirtyTabsUnder(from);
		// No await between the last save and the close: the buffer the Trash
		// receives is the one just written.
		closedTabs = closeTabsForDeletedPath(from);
	}

	try {
		await diskOp();
	} catch (err) {
		// `moveToTrash` throws only before its rename lands, so the notes are
		// still at their paths, holding the bytes the pre-delete save wrote.
		for (const tab of closedTabs) editorStore.addTab(tab);
		throw err;
	}

	// Removed at once: a deleted item left in the explorer stays clickable and fails to open.
	if (to === null) fsStore.setFileTree(removeNodeByPath(fsStore.fileTree, from));
	if (to !== null) updateTabAfterRenameOrMove(from, to);
	// Synchronous and before the next await, so a consumer is never a step
	// behind the disk while the link rewrite below runs.
	for (const consumer of [...pathChangeConsumers]) {
		try {
			consumer.pathChanged(from, to);
		} catch (err) {
			error('FS', `${consumer.name} path change failed:`, err);
		}
	}

	if (to !== null) {
		// Must precede the removal sweep: `updateLinksAfterRename` resolves the
		// affected files through `get_backlinks_v2(from)`, which reads the very
		// Rust entry the sweep is about to prune. A pure move keeps the note
		// name, so the function's own same-name guard makes it inert there.
		if (isMarkdownFile(getFileName(to))) {
			await updateLinksAfterRename(from, to);
		}
	}

	if (to !== null) {
		// The tree is read here, after the await above, so a watcher patch
		// that landed during the link rewrite is kept.
		const vaultPath = vaultStore.path;
		if (movedNode && vaultPath) {
			fsStore.setFileTree(moveTreeNode(fsStore.fileTree, from, to, movedNode, currentTreeOrder(vaultPath), Date.now()));
		} else {
			await refreshTree();
		}
	}

	if (to !== null) {
		// Re-key the Rust `VaultIndex` for `from` and everything under
		// `from + '/'`. Awaited so the sweep below cannot race ahead of it.
		try {
			await call('rename_note', { from, to });
		} catch (err) {
			error('FS', 'rename_note failed:', err);
		}
		// Same for the FTS5 rows, the semantic chunks and their `mtime:` keys,
		// which are vault-relative. Moving them keeps every note findable at its
		// new path without re-reading or re-embedding it. Skipped, like
		// `forgetNote`'s search legs, when no key can be derived.
		const vaultPath = vaultStore.path;
		const fromKey = vaultPath ? vaultRelativeKey(vaultPath, from) : null;
		const toKey = vaultPath ? vaultRelativeKey(vaultPath, to) : null;
		if (fromKey !== null && toKey !== null) {
			try {
				await call('rename_in_search_index', { from: fromKey, to: toKey });
			} catch (err) {
				error('FS', 'rename_in_search_index failed:', err);
			}
		}
	}

	// Drop the OLD paths from the dedupe map, the registered per-file indexes
	// and the Rust index. On a rename/move the Rust legs are no-ops by now (the
	// entries and search rows already moved), while the TS leg still evicts the
	// stale keys.
	for (const path of [from, ...childPaths]) {
		forgetNote(path);
	}

	if (to !== null) {
		for (const consumer of [...pathChangeConsumers]) {
			try {
				consumer.settled?.(from, to);
			} catch (err) {
				error('FS', `${consumer.name} settled failed:`, err);
			}
		}
	}
}
