import { invoke } from '@tauri-apps/api/core';
import { debug, error as errorLog, perfStart, perfEnd } from '$lib/utils/debug';
import { backlinksStore } from './backlinks.store.svelte';
import { noteEntryV2ToBacklinkEntry } from './backlinks.logic';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';

let vaultPath: string | null = null;
let isBuilding = false;
let pendingRebuild = false;

/**
 * Bootstraps the Rust `VaultIndex` for the given vault path. Replaces
 * the old TS scan + parse loop that populated `noteIndexStore`. The
 * Rust `scan_vault_v2` command walks the filesystem, builds VaultIndex,
 * and emits `vault-index-updated` once complete; `vaultStore.vaultIndexVersion`
 * bumps and every panel `$effect` reactively refetches.
 */
export async function buildIndex(path: string) {
	if (isBuilding) {
		pendingRebuild = true;
		return;
	}
	isBuilding = true;
	vaultPath = path;

	const t0 = perfStart();
	try {
		await invoke('scan_vault_v2', { path });
		perfEnd('BACKLINKS', 'buildIndex:scan_vault_v2', t0);
		debug('BACKLINKS', 'Rust VaultIndex bootstrapped');
	} catch (err) {
		errorLog('BACKLINKS', 'scan_vault_v2 failed:', err);
	} finally {
		isBuilding = false;
		if (pendingRebuild && vaultPath) {
			pendingRebuild = false;
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
