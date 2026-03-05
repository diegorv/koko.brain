import { readTextFile, writeTextFile, mkdir, remove, rename, exists } from '@tauri-apps/plugin-fs';
import type { TrashItem } from './trash.types';
import { trashStore } from './trash.store.svelte';
import {
	getTrashDir,
	getTrashItemsDir,
	getTrashManifestPath,
	getTrashItemPath,
	getTrashItemDir,
	createTrashItem,
	parseTrashManifest,
	serializeTrashManifest,
} from './trash.logic';
import { getRelativePath } from '$lib/core/filesystem/fs.logic';
import { debug, error } from '$lib/utils/debug';

/**
 * Loads the trash manifest from disk and updates the store.
 * Creates the trash directory structure if it doesn't exist.
 */
export async function loadTrash(vaultPath: string): Promise<void> {
	trashStore.setLoading(true);
	try {
		const manifestPath = getTrashManifestPath(vaultPath);
		const manifestExists = await exists(manifestPath);
		if (!manifestExists) {
			trashStore.setItems([]);
			return;
		}
		const json = await readTextFile(manifestPath);
		const items = parseTrashManifest(json);
		trashStore.setItems(items);
		debug('Trash', `Loaded ${items.length} trashed items`);
	} catch (err) {
		error('Trash', 'Failed to load trash:', err);
		trashStore.setItems([]);
	} finally {
		trashStore.setLoading(false);
	}
}

/**
 * Moves a file or folder to the trash instead of permanently deleting it.
 * Creates the trash directory structure if needed, moves the item, and updates the manifest.
 */
export async function moveToTrash(vaultPath: string, absolutePath: string, isDirectory: boolean): Promise<boolean> {
	const relativePath = getRelativePath(vaultPath, absolutePath);
	const item = createTrashItem(relativePath, isDirectory);
	const itemDir = getTrashItemDir(vaultPath, item.id);
	let containerCreated = false;

	try {
		// Ensure trash directories exist
		const trashDir = getTrashDir(vaultPath);
		if (!(await exists(trashDir))) {
			await mkdir(trashDir, { recursive: true });
		}
		const itemsDir = getTrashItemsDir(vaultPath);
		if (!(await exists(itemsDir))) {
			await mkdir(itemsDir, { recursive: true });
		}

		// Create the UUID container and move the item into it
		await mkdir(itemDir, { recursive: true });
		containerCreated = true;
		const trashPath = getTrashItemPath(vaultPath, item.id, item.fileName);
		await rename(absolutePath, trashPath);

		// Persist manifest to disk first, then update store (avoids desync on write failure)
		await saveManifest(vaultPath, [item, ...trashStore.items]);
		trashStore.addItem(item);

		debug('Trash', `Moved to trash: ${relativePath}`);
		return true;
	} catch (err) {
		// Clean up orphaned container directory if it was created before the failure
		if (containerCreated) {
			try { await remove(itemDir, { recursive: true }); } catch { /* ignore cleanup failure */ }
		}
		error('Trash', 'Failed to move to trash:', err);
		throw err;
	}
}

/**
 * Restores a trashed item to its original location.
 * Creates parent directories if they no longer exist.
 * Appends a numeric suffix if the original path is occupied.
 */
export async function restoreItem(vaultPath: string, item: TrashItem): Promise<string | null> {
	try {
		const trashPath = getTrashItemPath(vaultPath, item.id, item.fileName);
		let restorePath = `${vaultPath}/${item.originalPath}`;

		// If original location is occupied, find a unique path with incrementing suffix
		if (await exists(restorePath)) {
			restorePath = await findUniqueRestorePath(restorePath, item.isDirectory);
		}

		// Ensure parent directory exists
		const parentDir = restorePath.substring(0, restorePath.lastIndexOf('/'));
		if (!(await exists(parentDir))) {
			await mkdir(parentDir, { recursive: true });
		}

		await rename(trashPath, restorePath);

		// Clean up the empty timestamped container
		const itemDir = getTrashItemDir(vaultPath, item.id);
		await remove(itemDir, { recursive: true });

		// Persist manifest to disk first, then update store (avoids desync on write failure)
		await saveManifest(vaultPath, trashStore.items.filter(i => i.id !== item.id));
		trashStore.removeItem(item.id);

		// Refresh the file tree so the restored item appears
		const { refreshTree } = await import('$lib/core/filesystem/fs.service');
		await refreshTree();

		debug('Trash', `Restored: ${item.originalPath} → ${restorePath}`);
		return restorePath;
	} catch (err) {
		error('Trash', 'Failed to restore item:', err);
		throw err;
	}
}

/**
 * Permanently deletes a single trashed item from disk and removes it from the manifest.
 */
export async function deletePermanently(vaultPath: string, item: TrashItem): Promise<boolean> {
	try {
		const itemDir = getTrashItemDir(vaultPath, item.id);
		await remove(itemDir, { recursive: true });

		// Persist manifest to disk first, then update store (avoids desync on write failure)
		await saveManifest(vaultPath, trashStore.items.filter(i => i.id !== item.id));
		trashStore.removeItem(item.id);

		debug('Trash', `Permanently deleted: ${item.originalPath}`);
		return true;
	} catch (err) {
		error('Trash', 'Failed to permanently delete item:', err);
		throw err;
	}
}

/**
 * Permanently deletes all items in the trash and clears the manifest.
 */
export async function emptyTrash(vaultPath: string): Promise<boolean> {
	try {
		const itemsDir = getTrashItemsDir(vaultPath);
		if (await exists(itemsDir)) {
			await remove(itemsDir, { recursive: true });
		}

		// Persist manifest to disk first, then update store (avoids desync on write failure)
		await saveManifest(vaultPath, []);
		trashStore.clear();

		debug('Trash', 'Emptied trash');
		return true;
	} catch (err) {
		error('Trash', 'Failed to empty trash:', err);
		throw err;
	}
}

/**
 * Resets the trash store to its initial empty state.
 * Called during vault teardown to prevent cross-vault data leakage.
 */
export function resetTrash(): void {
	trashStore.clear();
}

/**
 * Writes the current manifest to disk as JSON.
 */
async function saveManifest(vaultPath: string, items: TrashItem[]): Promise<void> {
	const manifestPath = getTrashManifestPath(vaultPath);
	const trashDir = getTrashDir(vaultPath);
	if (!(await exists(trashDir))) {
		await mkdir(trashDir, { recursive: true });
	}
	await writeTextFile(manifestPath, serializeTrashManifest(items));
}

/**
 * Finds a unique restore path by trying incrementing suffixes until one is free.
 * E.g., "notes/file.md" → "notes/file (restored).md" → "notes/file (restored 2).md" → ...
 * For directories: "projects" → "projects (restored)" → "projects (restored 2)" → ...
 */
async function findUniqueRestorePath(originalPath: string, isDirectory: boolean): Promise<string> {
	const { base, ext } = splitPathForSuffix(originalPath, isDirectory);
	// Try "base (restored).ext", then "base (restored 2).ext", etc.
	for (let i = 1; ; i++) {
		const suffix = i === 1 ? '(restored)' : `(restored ${i})`;
		const candidate = `${base} ${suffix}${ext}`;
		if (!(await exists(candidate))) return candidate;
	}
}

/**
 * Splits a path into base and extension parts for suffix insertion.
 * For files: "/path/file.md" → { base: "/path/file", ext: ".md" }
 * For directories or extensionless files: "/path/dir" → { base: "/path/dir", ext: "" }
 */
function splitPathForSuffix(path: string, isDirectory: boolean): { base: string; ext: string } {
	if (isDirectory) return { base: path, ext: '' };
	const lastDot = path.lastIndexOf('.');
	const lastSlash = path.lastIndexOf('/');
	if (lastDot > lastSlash + 1) {
		return { base: path.substring(0, lastDot), ext: path.substring(lastDot) };
	}
	return { base: path, ext: '' };
}
