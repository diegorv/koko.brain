import { invoke } from '@tauri-apps/api/core';
import { debug, error as errorLog, timeAsync, perfStart, perfEnd } from '$lib/utils/debug';
import { clearIndexedEntry } from '$lib/utils/index-dedupe';
import { backlinksStore } from './backlinks.store.svelte';
import { noteIndexStore } from './note-index.store.svelte';
import { parseWikilinks, getNoteName, buildResolutionCache, findLinkedMentions, findLinkedMentionsFromReverse, findUnlinkedMentions, noteEntryV2ToBacklinkEntry } from './backlinks.logic';
import type { WikilinkResolutionCache } from './backlinks.logic';
import type { WikiLink } from './backlinks.types';
import type { FileTreeNode, FileReadResult } from '$lib/core/filesystem/fs.types';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

let vaultPath: string | null = null;
let isBuilding = false;
let pendingRebuild = false;

/** Recursively collects all markdown file paths from a pre-scanned file tree */
function collectMarkdownPaths(nodes: FileTreeNode[]): string[] {
	const paths: string[] = [];
	for (const node of nodes) {
		if (node.isDirectory && node.children) {
			paths.push(...collectMarkdownPaths(node.children));
		} else if (node.name.endsWith('.md') || node.name.endsWith('.markdown')) {
			paths.push(node.path);
		}
	}
	return paths;
}

export async function buildIndex(path: string) {
	if (isBuilding) {
		pendingRebuild = true;
		return;
	}
	isBuilding = true;
	vaultPath = path;
	noteIndexStore.setLoading(true);

	try {
		await timeAsync('BACKLINKS', 'buildIndex', async () => {
			const tScan = perfStart();
			const tree = await invoke<FileTreeNode[]>('scan_vault', {
				path,
				sortBy: 'name',
			});
			perfEnd('BACKLINKS', 'buildIndex:scan_vault(IPC)', tScan);

			const tCollect = perfStart();
			const filePaths = collectMarkdownPaths(tree);
			perfEnd('BACKLINKS', `buildIndex:collectMarkdownPaths(${filePaths.length} files)`, tCollect);

			const tRead = perfStart();
			const readResults = await invoke<FileReadResult[]>('read_files_batch', {
				vaultPath: path,
				paths: filePaths,
			});
			perfEnd('BACKLINKS', `buildIndex:read_files_batch(IPC, ${readResults.length} files)`, tRead);

			const tParse = perfStart();
			const index = new Map<string, WikiLink[]>();
			const contents = new Map<string, string>();

			for (const result of readResults) {
				if (result.content !== null) {
					contents.set(result.path, result.content);
					index.set(result.path, parseWikilinks(result.content));
				}
			}
			perfEnd('BACKLINKS', `buildIndex:parseWikilinks(${index.size} files)`, tParse);

			// Contents must be set BEFORE the index: setNoteIndex triggers
			// rebuildReverseIndex, which resolves wikilinks using noteContents.keys().
			// If reversed, the resolution cache is empty and reverseIndex stays empty
			// until an incremental update happens to populate it file-by-file.
			const tStore = perfStart();
			noteIndexStore.setNoteContents(contents);
			noteIndexStore.setNoteIndex(index);
			perfEnd('BACKLINKS', 'buildIndex:setStores(incl. rebuildReverseIndex)', tStore);
			debug('BACKLINKS', `Index: ${index.size} notes, ${contents.size} contents`);
		});
	} finally {
		noteIndexStore.setLoading(false);
		isBuilding = false;
		if (pendingRebuild && vaultPath) {
			pendingRebuild = false;
			// Use module-level vaultPath (not the argument 'path') to ensure
			// the rebuild uses the current vault, not a stale one
			await buildIndex(vaultPath);
		}
	}
}

export async function rebuildIndex() {
	debug('BACKLINKS', `rebuildIndex() called at ${Date.now()}`);
	if (vaultPath) {
		await buildIndex(vaultPath);
	}
}

export function updateIndexForFile(filePath: string, content: string) {
	noteIndexStore.updateNoteEntry(filePath, content, parseWikilinks(content));
}

/** Removes a file from both noteIndex and noteContents (e.g. when a file is deleted) */
export function removeFileFromIndex(filePath: string) {
	// Drop the dedup signature so a later re-creation with the same content
	// isn't silently skipped by `isAlreadyIndexed`.
	clearIndexedEntry(filePath);

	const nextContents = new Map(noteIndexStore.noteContents);
	const nextIndex = new Map(noteIndexStore.noteIndex);
	const deletedContents = nextContents.delete(filePath);
	const deletedIndex = nextIndex.delete(filePath);

	if (deletedContents || deletedIndex) {
		noteIndexStore.setNoteContents(nextContents);
		noteIndexStore.setNoteIndex(nextIndex);
	}
}

/**
 * Updates only linked mentions for a file.
 * Does NOT mark unlinked mentions as dirty — callers that need unlinked
 * recomputation (tab switch, save, external change) should call
 * `backlinksStore.markUnlinkedDirty()` explicitly.
 * This keeps the keystroke path (index-updater) free of the ~30ms unlinked cost.
 */
export function updateBacklinksForFile(
	filePath: string,
	sharedFilePaths?: string[],
	sharedCache?: WikilinkResolutionCache,
) {
	const t0 = perfStart();
	const noteIndex = noteIndexStore.noteIndex;
	const noteContents = noteIndexStore.noteContents;
	const allFilePaths = sharedFilePaths ?? Array.from(noteContents.keys());

	const t1 = perfStart();
	const reverseIdx = noteIndexStore.reverseIndex;
	const cache = sharedCache ?? buildResolutionCache(allFilePaths);
	const linked = reverseIdx.size > 0
		? findLinkedMentionsFromReverse(filePath, reverseIdx, noteIndex, noteContents, cache)
		: findLinkedMentions(filePath, noteIndex, noteContents, allFilePaths, sharedCache);
	perfEnd('BACKLINKS', 'findLinkedMentions', t1);

	backlinksStore.setLinkedMentions(linked);
	perfEnd('BACKLINKS', 'updateBacklinksForFile', t0);
}

/**
 * Fetches backlinks for a file from the Rust `VaultIndex` via
 * `invoke('get_backlinks_v2')` and writes them to `backlinksStore.linkedMentions`.
 *
 * Phase 3 of the perf refactor (`tasks/todo/performance-architecture-refactor.md`).
 * Used by both the active-tab tracker (path change) and `BacklinksPanel.svelte`
 * (path change OR `vaultStore.vaultIndexVersion` bump). Errors are logged via
 * `error('BACKLINKS', ...)` and swallowed — the linked-mentions panel keeps
 * its prior contents on IPC failure.
 *
 * Caller is responsible for gating on `settingsStore.experimental.rustBacklinks`.
 * This function does not check the flag; it always invokes.
 */
export async function fetchBacklinksV2(path: string): Promise<void> {
	const t0 = perfStart();
	try {
		const entries = await invoke<NoteEntryV2[]>('get_backlinks_v2', { path });
		const linked = entries.map(noteEntryV2ToBacklinkEntry);
		backlinksStore.setLinkedMentions(linked);
		perfEnd('BACKLINKS', 'fetchBacklinksV2', t0);
	} catch (err) {
		errorLog('BACKLINKS', 'fetchBacklinksV2 failed:', err);
	}
}

/**
 * Computes unlinked mentions on demand. Called by the BacklinksPanel when
 * the unlinked section is visible and the dirty flag is set.
 * This is the expensive O(N) operation that scans all note contents.
 */
export function computeUnlinkedMentionsForFile(filePath: string) {
	const t0 = perfStart();
	const noteIndex = noteIndexStore.noteIndex;
	const noteContents = noteIndexStore.noteContents;
	const noteName = getNoteName(filePath);
	const unlinked = findUnlinkedMentions(filePath, noteName, noteContents, noteIndex);
	backlinksStore.setUnlinkedMentions(unlinked);
	perfEnd('BACKLINKS', 'computeUnlinkedMentionsForFile', t0);
}

export function resetBacklinks() {
	vaultPath = null;
	isBuilding = false;
	pendingRebuild = false;
	backlinksStore.reset();
}
