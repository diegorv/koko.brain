import { invoke } from '@tauri-apps/api/core';
import { readTextFile, writeTextFile, mkdir, remove, rename, exists, copyFile, readDir } from '@tauri-apps/plugin-fs';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import type { FileTreeNode, FolderOrderMap } from './fs.types';
import { fsStore } from './fs.store.svelte';
import { getParentPath, getFileName, isMarkdownFile, generateCopyName, generateUniqueName, applyFolderOrder, attachFileCounts } from './fs.logic';
import { updateLinksAfterRename, updateTabAfterRenameOrMove } from './link-updater.service';
import { applyNoteChange } from './note-change.service';
import { markRecentSave } from '$lib/core/editor/editor.hooks';
import { updateBookmarkPathsAfterMove } from '$lib/features/bookmarks/bookmarks.service';
import { closeTabsForDeletedPath } from '$lib/core/editor/editor.service';
import { clearViewParseCache } from '$lib/features/type-definitions/view-parse-cache';
import { debug, error, timeAsync } from '$lib/utils/debug';

/** Counts total nodes in a file tree (files + directories, recursive) */
function countTreeNodes(nodes: FileTreeNode[]): number {
	let count = 0;
	for (const node of nodes) {
		count++;
		if (node.children) count += countTreeNodes(node.children);
	}
	return count;
}

/** Internal directory inside the vault that stores app metadata */
const KOKOBRAIN_DIR = '.kokobrain';
const FOLDER_ORDER_FILE = 'folder-order.json';

/** Default template written to `.kokobrain/folder-order.json` when the file doesn't exist yet */
const FOLDER_ORDER_TEMPLATE: Record<string, unknown> = {
	_comment: 'Custom folder order for the file explorer. Keys are relative directory paths (use "." for vault root). Values are arrays of folder names in the desired display order. Unlisted folders appear after listed ones. Only affects folders, not files.',
	_example: {
		'.': ['Projects', 'Archive', 'Daily'],
		'Projects': ['active', 'backlog'],
	},
};

/** Ensures the `.kokobrain` directory exists, creating it if needed */
async function ensureKokobrainDir(vaultPath: string): Promise<void> {
	await mkdir(`${vaultPath}/${KOKOBRAIN_DIR}`, { recursive: true });
}

/** Reads the folder order config from `.kokobrain/folder-order.json`. Creates a template file if missing. Falls back to `{}` on error. */
export async function loadFolderOrder(vaultPath: string): Promise<FolderOrderMap> {
	const filePath = `${vaultPath}/${KOKOBRAIN_DIR}/${FOLDER_ORDER_FILE}`;
	try {
		const fileExists = await exists(filePath);
		if (!fileExists) {
			await ensureKokobrainDir(vaultPath);
			await writeTextFile(filePath, JSON.stringify(FOLDER_ORDER_TEMPLATE, null, 2));
			fsStore.setFolderOrder({});
			return {};
		}
		const content = await readTextFile(filePath);
		const parsed = JSON.parse(content);
		if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
			fsStore.setFolderOrder({});
			return {};
		}
		const order: FolderOrderMap = {};
		for (const [key, value] of Object.entries(parsed)) {
			if (!key.startsWith('_') && Array.isArray(value) && value.every(v => typeof v === 'string')) {
				order[key] = value as string[];
			}
		}
		fsStore.setFolderOrder(order);
		return order;
	} catch (err) {
		error('FS', 'Failed to load folder order:', err);
		fsStore.setFolderOrder({});
		return {};
	}
}

/** Builds the full file tree for a vault and updates the store. */
export async function loadDirectoryTree(vaultPath: string) {
	fsStore.startLoading();
	try {
		await timeAsync('FS', 'loadDirectoryTree', async () => {
			const [tree, order] = await Promise.all([
				invoke<FileTreeNode[]>('scan_vault', {
					path: vaultPath,
					sortBy: 'name',
				}),
				loadFolderOrder(vaultPath),
			]);

			debug('FS', 'loadDirectoryTree:', vaultPath);
			const co = fsStore.contentOrder;
			const hasOrder = Object.keys(order).length > 0 || co.size > 0;
			const orderedTree = hasOrder
				? applyFolderOrder(tree, order, vaultPath, vaultPath, co.size > 0 ? co : undefined)
				: tree;
			attachFileCounts(orderedTree);
			fsStore.setFileTree(orderedTree);
			debug('FS', `Tree: ${countTreeNodes(orderedTree)} total nodes`);
		});
	} catch (err) {
		error('FS', 'Failed to load directory tree:', err);
		throw err;
	} finally {
		fsStore.stopLoading();
	}
}

/** Re-reads the current vault's file tree (lazy-imports vaultStore to avoid circular deps) */
export async function refreshTree() {
	const { path } = await import('$lib/core/vault/vault.store.svelte').then(m => ({ path: m.vaultStore.path }));
	if (path) {
		await loadDirectoryTree(path);
	}
}

/**
 * Creates a file on disk with the given initial content (empty by default)
 * and refreshes the tree. Returns the new path or null on failure. Content
 * must be passed here — not written afterwards — so the Rust `create_note`
 * indexes the real content instead of an empty document.
 */
export async function createFile(parentPath: string, fileName: string, content: string = ''): Promise<string | null> {
	try {
		const entries = await readDir(parentPath);
		const siblingNames = entries.map((e) => e.name);
		const uniqueName = generateUniqueName(fileName, false, siblingNames);
		const filePath = `${parentPath}/${uniqueName}`;
		// Phase 8.6: Rust `create_note` does the disk write, updates
		// the `VaultIndex`, and emits `vault-index-updated`. The TS
		// `markRecentSave` still flips the watcher self-save guard so
		// the subsequent fs event doesn't trigger a redundant rebuild.
		await invoke('create_note', { path: filePath, content });
		markRecentSave(filePath);
		// Refresh the per-file TS indexes for the new file. The 'fs' policy row
		// skips the Rust IPC - `create_note` above already indexed it.
		void applyNoteChange({ kind: 'upsert', source: 'fs', path: filePath, content });
		await refreshTree();
		debug('FS', 'created file:', filePath);
		return filePath;
	} catch (err) {
		error('FS', 'Failed to create file:', err);
		return null;
	}
}

/** Creates a directory on disk, refreshes the tree, and auto-expands it */
export async function createFolder(parentPath: string, folderName: string): Promise<string | null> {
	try {
		const entries = await readDir(parentPath);
		const siblingNames = entries.map((e) => e.name);
		const uniqueName = generateUniqueName(folderName, true, siblingNames);
		const folderPath = `${parentPath}/${uniqueName}`;
		// Phase 8.6: Rust `create_folder` (recursive — no-op when
		// the dir exists, but `generateUniqueName` ensures it doesn't).
		await invoke('create_folder', { path: folderPath });
		await refreshTree();
		fsStore.expandDir(folderPath);
		debug('FS', 'created folder:', folderPath);
		return folderPath;
	} catch (err) {
		error('FS', 'Failed to create folder:', err);
		return null;
	}
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

/** Moves a file or folder to trash (soft delete), closes open tabs, and refreshes the tree */
export async function deleteItem(itemPath: string, isDirectory: boolean = false): Promise<boolean> {
	try {
		// Close tabs BEFORE the disk operation so the auto-save debounce
		// cannot fire with a stale path during the async gap and recreate
		// the file at its original location.
		closeTabsForDeletedPath(itemPath);

		const { vaultStore } = await import('$lib/core/vault/vault.store.svelte');
		const vaultPath = vaultStore.path;
		if (vaultPath) {
			const { moveToTrash } = await import('$lib/core/trash/trash.service');
			await moveToTrash(vaultPath, itemPath, isDirectory);
		} else {
			// Fallback: permanent delete if no vault is open
			await remove(itemPath, { recursive: true });
		}
		await refreshTree();
		const { quickSwitcherStore } = await import('$lib/features/quick-switcher/quick-switcher.store.svelte');
		forgetNote(itemPath);
		// Drop the parsed `.view` definition so a re-created view at the same
		// path is re-read from disk instead of served from the stale cache.
		clearViewParseCache(itemPath);
		quickSwitcherStore.removeRecentPath(itemPath);
		debug('FS', 'deleted item:', itemPath);
		return true;
	} catch (err) {
		error('FS', 'Failed to delete item:', err);
		return false;
	}
}

/** Renames a file or folder. Returns the new path, or null if the target already exists. */
export async function renameItem(oldPath: string, newName: string): Promise<string | null> {
	const parentDir = getParentPath(oldPath);
	const newPath = `${parentDir}/${newName}`;
	try {
		if (oldPath === newPath) return oldPath;
		const targetExists = await exists(newPath);
		if (targetExists) {
			error('FS', 'Target already exists:', newPath);
			return null;
		}
		await rename(oldPath, newPath);

		// Update tab path immediately after rename so the auto-save
		// debounce writes to the NEW path, not the old one.
		updateTabAfterRenameOrMove(oldPath, newPath);

		// Update wikilinks BEFORE refreshTree — findFilesLinkingTo uses
		// excludePath=oldPath which must still be keyed in noteContents.
		// refreshTree can trigger the file watcher which would re-index
		// under the new path, making the old-path lookup miss.
		if (isMarkdownFile(newName)) {
			await updateLinksAfterRename(oldPath, newPath);
		}
		await refreshTree();

		// Drop the OLD path from the dedupe map and the Rust `VaultIndex`. The
		// new path gets re-indexed via the watcher (or the next save).
		forgetNote(oldPath);

		const { vaultStore } = await import('$lib/core/vault/vault.store.svelte');
		if (vaultStore.path) {
			updateBookmarkPathsAfterMove(vaultStore.path, oldPath, newPath);
		}

		debug('FS', 'renamed item:', oldPath, '→', newPath);
		return newPath;
	} catch (err) {
		error('FS', 'Failed to rename item:', err);
		return null;
	}
}

/** Moves a file or folder into a different directory and auto-expands the target */
export async function moveItem(sourcePath: string, targetDirPath: string): Promise<string | null> {
	const fileName = getFileName(sourcePath);
	const newPath = `${targetDirPath}/${fileName}`;
	try {
		if (sourcePath === newPath) return null;
		const targetExists = await exists(newPath);
		if (targetExists) {
			error('FS', 'Target already exists:', newPath);
			return null;
		}
		await rename(sourcePath, newPath);

		// Update tab path immediately after rename so the auto-save
		// debounce writes to the NEW path, not the old one.
		updateTabAfterRenameOrMove(sourcePath, newPath);

		await refreshTree();
		fsStore.expandDir(targetDirPath);

		// Drop the OLD path from the dedupe map and the Rust `VaultIndex`. The
		// destination path gets re-indexed via the watcher (or the next save).
		forgetNote(sourcePath);

		const { vaultStore } = await import('$lib/core/vault/vault.store.svelte');
		if (vaultStore.path) {
			updateBookmarkPathsAfterMove(vaultStore.path, sourcePath, newPath);
		}

		debug('FS', 'moved item:', sourcePath, '→', newPath);
		return newPath;
	} catch (err) {
		error('FS', 'Failed to move item:', err);
		return null;
	}
}

/** Recursively copies a directory and all its contents */
async function copyDirectoryRecursive(sourcePath: string, destPath: string): Promise<void> {
	await mkdir(destPath);
	const entries = await readDir(sourcePath);
	for (const entry of entries) {
		const srcChild = `${sourcePath}/${entry.name}`;
		const destChild = `${destPath}/${entry.name}`;
		if (entry.isDirectory) {
			await copyDirectoryRecursive(srcChild, destChild);
		} else {
			await copyFile(srcChild, destChild);
		}
	}
}

/** Duplicates a file or folder, generating a unique "copy" name. Returns the new path or null. */
export async function duplicateItem(itemPath: string, isDirectory: boolean): Promise<string | null> {
	try {
		const parentDir = getParentPath(itemPath);
		const entries = await readDir(parentDir);
		const siblingNames = entries.map((e) => e.name);
		const itemName = getFileName(itemPath);
		const copyName = generateCopyName(itemName, isDirectory, siblingNames);
		const newPath = `${parentDir}/${copyName}`;

		if (isDirectory) {
			await copyDirectoryRecursive(itemPath, newPath);
		} else {
			await copyFile(itemPath, newPath);
		}
		await refreshTree();
		return newPath;
	} catch (err) {
		error('FS', 'Failed to duplicate item:', err);
		return null;
	}
}

/** Opens the system file explorer with the given item selected */
export async function revealInSystemExplorer(itemPath: string): Promise<void> {
	try {
		await revealItemInDir(itemPath);
	} catch (err) {
		error('FS', 'Failed to reveal in system explorer:', err);
	}
}

/** Resets all file system state (e.g. when switching vaults) */
export function resetFileSystem() {
	fsStore.reset();
}
