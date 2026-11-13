import { readTextFile, writeTextFile, mkdir, remove, rename, exists, copyFile, readDir } from '@tauri-apps/plugin-fs';
import { revealItemInDir } from '@tauri-apps/plugin-opener';
import { call } from '#lib/contracts/ipc.js';
import type { FileTreeNode, FolderOrderMap } from './fs.types';
import { fsStore } from './fs.store.svelte';
import { getParentPath, getFileName, generateCopyName, generateUniqueName, applyFolderOrder, insertTreeNode, isMarkdownFile, renamedPath, TargetExistsError, type TreeOrder } from './fs.logic';
import { applyNoteChange } from './note-change.service';
import { applyPathChange } from './path-change.service';
import { markRecentSave } from '#lib/core/editor/editor.hooks.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { debug, error, timeAsync, timeSync } from '#lib/utils/debug.js';

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

/** Bumped by every `loadDirectoryTree` call; only the newest call writes the tree. */
let treeLoadGeneration = 0;

/** `loadDirectoryTree` calls whose scan has not settled yet. */
let treeLoadsInFlight = 0;

/**
 * Builds the full file tree for a vault and updates the store. The IPC wait,
 * the JS that orders the tree, and the store write are timed
 * apart: the total alone mixes IPC wait, JS and the Svelte flush.
 *
 * `scan_vault` runs off the main thread, so two overlapping calls can
 * complete out of order: a call that is no longer the newest when its scan
 * returns drops its tree instead of overwriting the newer one.
 */
export async function loadDirectoryTree(vaultPath: string) {
	const generation = ++treeLoadGeneration;
	treeLoadsInFlight++;
	fsStore.startLoading();
	try {
		await timeAsync('FS', 'loadDirectoryTree', async () => {
			const [tree, order] = await timeAsync('FS', 'loadDirectoryTree: ipc', () =>
				Promise.all([
					call('scan_vault', {
						path: vaultPath,
						sortBy: 'name',
					}),
					loadFolderOrder(vaultPath),
				]),
			);

			debug('FS', 'loadDirectoryTree:', vaultPath);
			if (generation !== treeLoadGeneration) {
				debug('FS', 'loadDirectoryTree: superseded by a newer load, tree dropped');
				return;
			}
			const orderedTree = timeSync('FS', 'loadDirectoryTree: order', () => {
				const co = fsStore.contentOrder;
				const hasOrder = Object.keys(order).length > 0 || co.size > 0;
				return hasOrder
					? applyFolderOrder(tree, order, vaultPath, vaultPath, co.size > 0 ? co : undefined)
					: tree;
			});
			timeSync('FS', 'loadDirectoryTree: set', () => fsStore.setFileTree(orderedTree));
			debug('FS', `Tree: ${countTreeNodes(orderedTree)} total nodes`);
		});
	} catch (err) {
		error('FS', 'Failed to load directory tree:', err);
		throw err;
	} finally {
		treeLoadsInFlight--;
		fsStore.stopLoading();
	}
}

/** Re-reads the current vault's file tree (lazy-imports vaultStore to avoid circular deps) */
export async function refreshTree() {
	const { path } = await import('#lib/core/vault/vault.store.svelte.js').then(m => ({ path: m.vaultStore.path }));
	if (path) {
		await loadDirectoryTree(path);
	}
}

/** The ordering a full tree load applies, read from the store, for placing one node the same way. */
export function currentTreeOrder(vaultPath: string): TreeOrder {
	const co = fsStore.contentOrder;
	return { vaultPath, folderOrder: fsStore.folderOrder, contentOrder: co.size > 0 ? co : undefined };
}

/**
 * Adds a node the app just created on disk to the file tree, in the position
 * the next full load gives it, instead of rescanning the vault. Reads the
 * tree at call time, so a patch that landed earlier is kept. Times are set to
 * now (the tree has no `stat`); missing ancestor folders are created. A no-op
 * when no vault is open or the path is already in the tree.
 *
 * A full load in flight would overwrite the insert with a tree scanned
 * before it, and no watcher event restores it while the vault is still
 * opening (the watcher starts after the first load). So the insert also
 * starts a new load, which supersedes the in-flight one and sees the item.
 *
 * @param path Absolute path of the new file or folder.
 * @param isDirectory Whether it is a folder.
 * @param children A folder's children, already ordered; empty by default.
 */
export function addToTree(path: string, isDirectory = false, children: FileTreeNode[] = []): void {
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;
	const now = Date.now();
	const node: FileTreeNode = isDirectory
		? { name: getFileName(path), path, isDirectory, children, modifiedAt: now, createdAt: now }
		: { name: getFileName(path), path, isDirectory, modifiedAt: now, createdAt: now };
	fsStore.setFileTree(insertTreeNode(fsStore.fileTree, node, currentTreeOrder(vaultPath), now));
	debug('FS', 'added to tree:', path);
	if (treeLoadsInFlight > 0) {
		// loadDirectoryTree logs its own failure; the insert above already shows the item.
		loadDirectoryTree(vaultPath).catch(() => {});
	}
}

/**
 * `addToTree` for an item that arrived on disk with content (a copied or
 * restored folder): a folder's subtree comes from `scan_vault` on that folder
 * alone. The insert happens after the scan, on the tree as it is then.
 * Rejects when the scan fails.
 */
export async function addScannedToTree(path: string, isDirectory: boolean): Promise<void> {
	if (!isDirectory) {
		addToTree(path);
		return;
	}
	const scanned = await call('scan_vault', { path, sortBy: 'name' });
	const vaultPath = vaultStore.path;
	if (!vaultPath) return;
	const { folderOrder, contentOrder } = currentTreeOrder(vaultPath);
	addToTree(path, true, applyFolderOrder(scanned, folderOrder, vaultPath, path, contentOrder));
}

/**
 * Creates a file on disk with the given initial content (empty by default)
 * and adds it to the tree. Returns the new path; failures are logged and
 * rethrown so the caller can tell the user. Content
 * must be passed here — not written afterwards — so the Rust `create_note`
 * indexes the real content instead of an empty document.
 */
export async function createFile(parentPath: string, fileName: string, content: string = ''): Promise<string> {
	try {
		const entries = await readDir(parentPath);
		const siblingNames = entries.map((e) => e.name);
		const uniqueName = generateUniqueName(fileName, false, siblingNames);
		const filePath = `${parentPath}/${uniqueName}`;
		// Phase 8.6: Rust `create_note` does the disk write, updates
		// the `VaultIndex`, and emits `vault-index-updated`. The TS
		// `markRecentSave` still flips the watcher self-save guard so
		// the subsequent fs event doesn't trigger a redundant rebuild.
		await call('create_note', { path: filePath, content });
		markRecentSave(filePath);
		// Refresh the per-file TS indexes for the new file. The 'fs' policy row
		// skips the Rust IPC - `create_note` above already indexed it. Passing
		// the vault root upserts a Markdown note into FTS5 / semantic at
		// creation, so it is searchable before its first save; other files
		// stay out, as on the save side.
		const vaultPath = isMarkdownFile(uniqueName) ? (vaultStore.path ?? undefined) : undefined;
		void applyNoteChange({ kind: 'upsert', source: 'fs', path: filePath, content, vaultPath });
		addToTree(filePath);
		debug('FS', 'created file:', filePath);
		return filePath;
	} catch (err) {
		error('FS', 'Failed to create file:', err);
		throw err;
	}
}

/** Creates a directory on disk and adds it to the tree. Failures are logged and rethrown. */
export async function createFolder(parentPath: string, folderName: string): Promise<string> {
	try {
		const entries = await readDir(parentPath);
		const siblingNames = entries.map((e) => e.name);
		const uniqueName = generateUniqueName(folderName, true, siblingNames);
		const folderPath = `${parentPath}/${uniqueName}`;
		// Phase 8.6: Rust `create_folder` (recursive — no-op when
		// the dir exists, but `generateUniqueName` ensures it doesn't).
		await call('create_folder', { path: folderPath });
		addToTree(folderPath, true);
		debug('FS', 'created folder:', folderPath);
		return folderPath;
	} catch (err) {
		error('FS', 'Failed to create folder:', err);
		throw err;
	}
}

/** Moves a file or folder to trash (soft delete), closes open tabs, and removes it from the tree. Failures are logged and rethrown. */
export async function deleteItem(itemPath: string, isDirectory: boolean = false): Promise<void> {
	try {
		await applyPathChange({
			from: itemPath,
			to: null,
			isDirectory,
			diskOp: async () => {
				const { vaultStore } = await import('#lib/core/vault/vault.store.svelte.js');
				const vaultPath = vaultStore.path;
				if (vaultPath) {
					const { moveToTrash } = await import('#lib/core/trash/trash.service.js');
					await moveToTrash(vaultPath, itemPath, isDirectory);
				} else {
					// Fallback: permanent delete if no vault is open
					await remove(itemPath, { recursive: true });
				}
			},
		});
		debug('FS', 'deleted item:', itemPath);
	} catch (err) {
		error('FS', 'Failed to delete item:', err);
		throw err;
	}
}

/**
 * Renames a file or folder and returns the new path. Throws a
 * `TargetExistsError` when the target already exists, or the disk error.
 */
export async function renameItem(oldPath: string, newName: string): Promise<string> {
	const newPath = renamedPath(oldPath, newName);
	try {
		if (oldPath === newPath) return oldPath;
		if (await exists(newPath)) throw new TargetExistsError(newName);
		await applyPathChange({
			from: oldPath,
			to: newPath,
			// `isDirectory` omitted: the rename entry points (FileTreeItem,
			// type-definitions) do not carry it, so the owner walks the tree.
			diskOp: () => rename(oldPath, newPath),
		});

		debug('FS', 'renamed item:', oldPath, '→', newPath);
		return newPath;
	} catch (err) {
		error('FS', 'Failed to rename item:', err);
		throw err;
	}
}

/**
 * Moves a file or folder into a different directory, as `fileName` there, in
 * one path change (links and tabs follow). Returns the new path, or null when
 * the item is already there.
 * Throws a `TargetExistsError` when the target folder already holds that
 * name, or the disk error.
 * @param fileName - the name in the target folder; the item's own name by default
 */
export async function moveItem(sourcePath: string, targetDirPath: string, fileName = getFileName(sourcePath)): Promise<string | null> {
	const newPath = `${targetDirPath}/${fileName}`;
	try {
		if (sourcePath === newPath) return null;
		if (await exists(newPath)) throw new TargetExistsError(fileName);
		await applyPathChange({
			from: sourcePath,
			to: newPath,
			// `isDirectory` omitted: the drag-and-drop entry points do not
			// carry it, so the owner walks the tree.
			diskOp: () => rename(sourcePath, newPath),
		});

		debug('FS', 'moved item:', sourcePath, '→', newPath);
		return newPath;
	} catch (err) {
		// A taken name is not an app fault: every caller shows or resolves it.
		if (!(err instanceof TargetExistsError)) error('FS', 'Failed to move item:', err);
		throw err;
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

/** Duplicates a file or folder, generating a unique "copy" name. Returns the new path; failures are logged and rethrown. */
export async function duplicateItem(itemPath: string, isDirectory: boolean): Promise<string> {
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
		await addScannedToTree(newPath, isDirectory);
		return newPath;
	} catch (err) {
		error('FS', 'Failed to duplicate item:', err);
		throw err;
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
