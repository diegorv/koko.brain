import { invoke } from '@tauri-apps/api/core';
import { debug, error as errorLog, timeAsync, perfStart, perfEnd } from '$lib/utils/debug';
import { clearIndexedEntry } from '$lib/utils/index-dedupe';
import { backlinksStore } from './backlinks.store.svelte';
import { noteIndexStore } from './note-index.store.svelte';
import { parseWikilinks, noteEntryV2ToBacklinkEntry } from './backlinks.logic';
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
		// Bootstrap the Rust `VaultIndex` in parallel with the TS scan.
		// `scan_vault_v2` does its own filesystem scan, builds the Rust index,
		// and emits `vault-index-updated` so `BacklinksPanel.svelte`'s reactive
		// `$effect` re-fetches once the Rust side is ready. Fire-and-forget —
		// errors logged via `errorLog('BACKLINKS', ...)`. The TS scan below
		// still populates `noteIndexStore.noteContents`/`noteIndex` because
		// the unlinked-mentions, outgoing-links, and link-updater paths still
		// read from those maps (Phase 6/8 will migrate those too).
		const tV2 = perfStart();
		invoke('scan_vault_v2', { path })
			.then(() => perfEnd('BACKLINKS', 'buildIndex:scan_vault_v2(IPC, parallel)', tV2))
			.catch((err) => errorLog('BACKLINKS', 'scan_vault_v2 failed:', err));

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
			//
			// `noteIndexStore.reverseIndex` is no longer consumed by the backlinks
			// panel (Rust path replaces it) but is still read as a fallback by
			// `link-updater.service.ts` on rename — so we keep building it.
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
 * Fetches backlinks for a file from the Rust `VaultIndex` via
 * `invoke('get_backlinks_v2')` and writes them to `backlinksStore.linkedMentions`.
 *
 * Used by both the active-tab tracker (path change) and `BacklinksPanel.svelte`
 * (path change OR `vaultStore.vaultIndexVersion` bump). Errors are logged via
 * `errorLog('BACKLINKS', ...)` and swallowed — the linked-mentions panel keeps
 * its prior contents on IPC failure.
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
 * Computes unlinked mentions on demand by invoking the Rust
 * `get_unlinked_mentions_v2` command (Phase 11.5a). Called by the
 * BacklinksPanel when the unlinked section is visible and the dirty
 * flag is set. The Rust side iterates `VaultIndex.entries`, skips
 * already-linked sources via the reverse-link index, reads each
 * candidate's body from disk, and applies the same word-boundary +
 * frontmatter/code-stripping rules the TS-side `findUnlinkedMentions`
 * used.
 *
 * Errors are logged via `errorLog('BACKLINKS', ...)` and swallowed —
 * the panel keeps its prior contents on IPC failure.
 */
export async function computeUnlinkedMentionsForFile(filePath: string): Promise<void> {
	const t0 = perfStart();
	try {
		const entries = await invoke<NoteEntryV2[]>('get_unlinked_mentions_v2', { path: filePath });
		const unlinked = entries.map(noteEntryV2ToBacklinkEntry);
		backlinksStore.setUnlinkedMentions(unlinked);
		perfEnd('BACKLINKS', 'computeUnlinkedMentionsForFile', t0);
	} catch (err) {
		errorLog('BACKLINKS', 'computeUnlinkedMentionsForFile failed:', err);
	}
}

export function resetBacklinks() {
	vaultPath = null;
	isBuilding = false;
	pendingRebuild = false;
	backlinksStore.reset();
}
