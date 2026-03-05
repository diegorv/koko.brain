import { watch, type UnwatchFn, type WatchEvent } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { refreshTree } from './fs.service';
import { fsStore } from './fs.store.svelte';
import { getParentPath, applyFolderOrder, attachFileCounts } from './fs.logic';
import { debounce } from '$lib/utils/debounce';
import { debug, error } from '$lib/utils/debug';
import type { FileTreeNode } from './fs.types';

/** Watcher session counters for debug metrics */
let counters = {
	rawEvents: 0,
	skippedKokobrain: 0,
	skippedVaultRoot: 0,
	accepted: 0,
	skippedAncestorPaths: 0,
	debounceFires: 0,
	fullRefreshes: 0,
	incrementalRefreshes: 0,
};

/** Logs the current counter summary */
function logCounters() {
	debug('WATCHER', `Counters: ${JSON.stringify(counters)}`);
}

/** Returns a snapshot of the current watcher counters (for testing) */
export function getWatcherCounters() {
	return { ...counters };
}

/** Cleanup function returned by Tauri's watch API */
let unwatch: UnwatchFn | null = null;
/** External subscribers notified whenever the vault's files change on disk */
let changeListeners: Array<(paths: string[]) => void> = [];
/** Current vault path being watched */
let currentVaultPath: string | null = null;
/** Accumulated changed paths within the debounce window */
let pendingChangedPaths: Set<string> = new Set();
/** Version counter — incremented on stopWatching to invalidate in-flight callbacks */
let watchVersion = 0;

/**
 * Registers a callback that fires whenever the vault's files change.
 * The callback receives the list of changed file paths so consumers
 * can decide whether to act (e.g. skip rebuilds for self-saved files).
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
 * Filters out paths that are ancestors of other paths in the set.
 * macOS FSEvents reports parent directories as changed when files inside them
 * change (metadata propagation). This keeps only the most specific (deepest)
 * paths, eliminating redundant parent directory rescans.
 */
export function filterAncestorPaths(paths: string[]): string[] {
	return paths.filter((p) => !paths.some((other) => other !== p && other.startsWith(p + '/')));
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

/** Debounced handler — performs incremental or full refresh after 500ms of quiet */
const debouncedRefresh = debounce(async () => {
	counters.debounceFires++;
	const refreshStart = performance.now();
	// Capture version at start — if stopWatching runs mid-flight, we bail out
	const version = watchVersion;
	const rawPaths = [...pendingChangedPaths];
	pendingChangedPaths = new Set();

	// Filter out ancestor directory paths — macOS FSEvents reports parent directories
	// as changed when files inside them change (metadata propagation). Keeping only the
	// deepest paths avoids redundant scan_vault calls on intermediate directories.
	const changedPaths = filterAncestorPaths(rawPaths);
	if (changedPaths.length < rawPaths.length) {
		counters.skippedAncestorPaths += rawPaths.length - changedPaths.length;
	}
	debug('WATCHER', `debouncedRefresh fired — paths: ${changedPaths.length} (filtered from ${rawPaths.length})`, changedPaths);

	const logElapsed = (type: string) => {
		debug('WATCHER', `debouncedRefresh (${type}) completed in ${(performance.now() - refreshStart).toFixed(1)}ms`);
		logCounters();
	};

	// Capture vault path into a local variable — currentVaultPath can become null
	// after stopWatching() runs mid-flight (race between debounce fire and teardown).
	const vaultPath = currentVaultPath;
	if (!vaultPath) {
		counters.fullRefreshes++;
		await refreshTree();
		if (watchVersion !== version) return;
		notifyListeners(changedPaths);
		logElapsed('full — no vault');
		return;
	}

	// Determine unique parent directories that need rescanning
	const parentsToRescan = new Set<string>();
	for (const changedPath of changedPaths) {
		const parent = getParentPath(changedPath);
		if (parent.startsWith(vaultPath)) {
			parentsToRescan.add(parent);
		}
	}

	// Too many changes or no specific paths — full rescan
	if (parentsToRescan.size === 0 || parentsToRescan.size > 5) {
		counters.fullRefreshes++;
		await refreshTree();
		if (watchVersion !== version) return;
		notifyListeners(changedPaths);
		logElapsed(`full — ${parentsToRescan.size} parents`);
		return;
	}

	// Incremental: rescan only affected parent directories
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
			if (Object.keys(order).length > 0) {
				subtree = applyFolderOrder(subtree, order, vaultPath, parentDir);
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
}, 500);

/** Starts recursively watching the vault directory for file system changes */
export async function startWatching(vaultPath: string) {
	await stopWatching();
	currentVaultPath = vaultPath;

	const kokobrainDir = `${vaultPath}/.kokobrain`;
	try {
		unwatch = await watch(vaultPath, (event: WatchEvent) => {
			let addedAny = false;
			counters.rawEvents++;
			debug('WATCHER', `Raw event — type: ${JSON.stringify(event.type)}, paths: [${event.paths.map(String).join(', ')}]`);
			for (const p of event.paths) {
				const pathStr = String(p);
				// Skip the vault root itself — macOS FSEvents reports parent directories
				// as changed when files inside them change. If .kokobrain/* triggered the event,
				// we'd only see the vault root here, causing an infinite refresh loop.
				if (pathStr === vaultPath) {
					counters.skippedVaultRoot++;
					debug('WATCHER', `Skipped (vault root): ${pathStr}`);
					continue;
				}
				// Skip changes inside the .kokobrain internal directory (logs, db, settings)
				// to prevent feedback loops when debug logging or DB writes trigger the watcher.
				if (pathStr === kokobrainDir || pathStr.startsWith(`${kokobrainDir}/`)) {
					counters.skippedKokobrain++;
					debug('WATCHER', `Skipped (.kokobrain): ${pathStr}`);
					continue;
				}
				counters.accepted++;
				debug('WATCHER', `Accepted: ${pathStr}`);
				pendingChangedPaths.add(pathStr);
				addedAny = true;
			}
			if (addedAny) {
				debouncedRefresh();
			}
		}, { recursive: true, delayMs: 1000 });
	} catch (err) {
		error('WATCHER', 'Failed to start file watcher:', err);
	}
}

/** Stops the file watcher and cancels any pending or in-flight debounced refresh */
export async function stopWatching() {
	watchVersion++;
	debouncedRefresh.cancel();
	pendingChangedPaths = new Set();
	if (unwatch) {
		unwatch();
		unwatch = null;
	}
	currentVaultPath = null;
	counters = { rawEvents: 0, skippedKokobrain: 0, skippedVaultRoot: 0, accepted: 0, skippedAncestorPaths: 0, debounceFires: 0, fullRefreshes: 0, incrementalRefreshes: 0 };
}
