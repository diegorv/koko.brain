import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { refreshTree } from './fs.service';
import { fsStore } from './fs.store.svelte';
import { getParentPath, applyFolderOrder, attachFileCounts } from './fs.logic';
import { debug, error } from '$lib/utils/debug';
import type { FileTreeNode } from './fs.types';

/**
 * Phase 9 — Native Rust watcher consumer.
 *
 * The TS-side debounce, hidden-dir filter, ancestor filter, and path
 * accumulation now live in `src-tauri/src/vault/watcher.rs`. This
 * module is a thin event consumer:
 *
 *   1. `startWatching` invokes `start_vault_watcher` (Rust) which
 *      installs a `notify::recommended_watcher` rooted at the vault.
 *   2. `listen('vault-files-changed', ...)` receives the already-
 *      filtered, already-debounced path bursts and runs the
 *      tree-rebuild orchestration (incremental vs full rescan, listener
 *      fan-out).
 *   3. `stopWatching` invokes `stop_vault_watcher` and detaches the
 *      Tauri event listener.
 *
 * The external `onFileChange(listener)` API is preserved verbatim;
 * `app-lifecycle.service.ts` and any future consumer don't notice the
 * swap.
 */

/** Watcher session counters for debug metrics */
let counters = {
	rawEvents: 0,
	skippedAncestorPaths: 0,
	debounceFires: 0,
	fullRefreshes: 0,
	incrementalRefreshes: 0,
};

function logCounters() {
	debug('WATCHER', `Counters: ${JSON.stringify(counters)}`);
}

/** Returns a snapshot of the current watcher counters (for testing) */
export function getWatcherCounters() {
	return { ...counters };
}

/** External subscribers notified whenever the vault's files change on disk */
let changeListeners: Array<(paths: string[]) => void> = [];
/** Current vault path being watched (for `patchSubtree` ancestor checks) */
let currentVaultPath: string | null = null;
/** Detach function for the Tauri event listener; null when not watching */
let unlisten: UnlistenFn | null = null;
/** Version counter — incremented on stopWatching to invalidate in-flight callbacks */
let watchVersion = 0;

/**
 * Registers a callback that fires whenever the vault's files change.
 * The callback receives the list of changed file paths (already
 * filtered + ancestor-collapsed by the Rust watcher) so consumers can
 * decide whether to act (e.g. skip rebuilds for self-saved files).
 * Returns an unsubscribe function.
 */
export function onFileChange(listener: (paths: string[]) => void): () => void {
	changeListeners.push(listener);
	return () => {
		changeListeners = changeListeners.filter((l) => l !== listener);
	};
}

/** Notifies all registered change listeners with the paths that changed */
function notifyListeners(paths: string[]) {
	debug('WATCHER', `notifyListeners() — ${changeListeners.length} listeners at ${Date.now()}`);
	for (const listener of changeListeners) {
		try {
			listener(paths);
		} catch (err) {
			debug('WATCHER', 'File change listener error:', err);
		}
	}
}

/**
 * Replaces a subtree in the file tree by finding the parent node
 * and swapping its children with the newly scanned ones.
 */
export function patchSubtree(
	tree: FileTreeNode[],
	parentPath: string,
	newChildren: FileTreeNode[],
	vaultPath: string | null = currentVaultPath,
): FileTreeNode[] {
	if (parentPath === vaultPath) {
		return newChildren;
	}

	let changed = false;
	const result = tree.map((node) => {
		if (node.path === parentPath && node.isDirectory) {
			changed = true;
			return { ...node, children: newChildren };
		}
		if (node.isDirectory && node.children) {
			const patched = patchSubtree(node.children, parentPath, newChildren, vaultPath);
			if (patched !== node.children) {
				changed = true;
				return { ...node, children: patched };
			}
		}
		return node;
	});
	return changed ? result : tree;
}

/** Payload of the `vault-files-changed` event emitted by the Rust watcher. */
interface VaultFilesChangedPayload {
	paths: string[];
}

/**
 * Handles a single Rust-emitted batch. Decides between incremental
 * (subtree rescan for ≤5 unique parent dirs) and full (`refreshTree`)
 * refresh, then notifies listeners. Mirrors the previous TS handler
 * minus the debounce + filter (now Rust-side).
 */
async function handleChangedPaths(changedPaths: string[]) {
	if (changedPaths.length === 0) return;
	counters.debounceFires++;
	counters.rawEvents += changedPaths.length;
	const refreshStart = performance.now();
	const version = watchVersion;

	const logElapsed = (type: string) => {
		debug('WATCHER', `handleChangedPaths (${type}) completed in ${(performance.now() - refreshStart).toFixed(1)}ms`);
		logCounters();
	};

	const vaultPath = currentVaultPath;
	if (!vaultPath) {
		counters.fullRefreshes++;
		await refreshTree();
		if (watchVersion !== version) return;
		notifyListeners(changedPaths);
		logElapsed('full — no vault');
		return;
	}

	// Determine unique parent directories that need rescanning.
	const parentsToRescan = new Set<string>();
	for (const changedPath of changedPaths) {
		const parent = getParentPath(changedPath);
		if (parent.startsWith(vaultPath)) {
			parentsToRescan.add(parent);
		}
	}

	// Too many changes or no specific paths — full rescan.
	if (parentsToRescan.size === 0 || parentsToRescan.size > 5) {
		counters.fullRefreshes++;
		await refreshTree();
		if (watchVersion !== version) return;
		notifyListeners(changedPaths);
		logElapsed(`full — ${parentsToRescan.size} parents`);
		return;
	}

	// Incremental: rescan only affected parent directories.
	let currentTree = [...fsStore.fileTree];
	const order = fsStore.folderOrder;
	for (const parentDir of parentsToRescan) {
		if (watchVersion !== version) return;
		try {
			let subtree = await invoke<FileTreeNode[]>('scan_vault', {
				path: parentDir,
				sortBy: fsStore.sortBy,
			});
			if (watchVersion !== version) return;
			const co = fsStore.contentOrder;
			if (Object.keys(order).length > 0 || co.size > 0) {
				subtree = applyFolderOrder(subtree, order, vaultPath, parentDir, co.size > 0 ? co : undefined);
			}
			currentTree = patchSubtree(currentTree, parentDir, subtree);
		} catch {
			// If subtree scan fails, fall back to full rescan
			counters.fullRefreshes++;
			await refreshTree();
			if (watchVersion !== version) return;
			notifyListeners(changedPaths);
			logElapsed('full — fallback');
			return;
		}
	}
	counters.incrementalRefreshes++;
	attachFileCounts(currentTree);
	fsStore.setFileTree(currentTree);
	notifyListeners(changedPaths);
	logElapsed(`incremental — ${parentsToRescan.size} parents`);
}

/** Starts the Rust-native vault watcher and subscribes to its events. */
export async function startWatching(vaultPath: string) {
	await stopWatching();
	currentVaultPath = vaultPath;

	try {
		// Register the event listener BEFORE starting the watcher to
		// avoid losing the first burst from a fast filesystem (e.g. a
		// rapid post-init save).
		unlisten = await listen<VaultFilesChangedPayload>('vault-files-changed', (event) => {
			void handleChangedPaths(event.payload.paths);
		});
		await invoke('start_vault_watcher', { path: vaultPath });
	} catch (err) {
		error('WATCHER', 'Failed to start file watcher:', err);
		// Tear down the listener if invoke failed so we don't leak it.
		if (unlisten) {
			unlisten();
			unlisten = null;
		}
	}
}

/** Stops the Rust-native vault watcher and detaches the event listener. */
export async function stopWatching() {
	watchVersion++;
	if (unlisten) {
		unlisten();
		unlisten = null;
	}
	try {
		await invoke('stop_vault_watcher');
	} catch (err) {
		debug('WATCHER', 'stop_vault_watcher invoke failed (likely already stopped):', err);
	}
	currentVaultPath = null;
	counters = { rawEvents: 0, skippedAncestorPaths: 0, debounceFires: 0, fullRefreshes: 0, incrementalRefreshes: 0 };
}
