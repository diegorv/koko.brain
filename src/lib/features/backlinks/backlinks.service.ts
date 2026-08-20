import { invoke } from '@tauri-apps/api/core';
import { debug, error as errorLog, perfStart, perfEnd } from '$lib/utils/debug';
import { dedupeInflight, isStillCurrentPath } from '$lib/utils/inflight';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { backlinksStore } from './backlinks.store.svelte';
import { noteEntryV2ToBacklinkEntry } from './backlinks.logic';
import type { NoteEntryV2, RelationshipBacklinkV2 } from '$lib/types/vault-v2.types';

let vaultPath: string | null = null;
let isBuilding = false;
let pendingRebuild = false;

/**
 * Per-path cache of the `vaultStore.vaultIndexVersion` value at which we
 * last wrote `linkedMentions` for that path. Used by the stale-aware
 * skip in `fetchBacklinksV2Inner` — a save-burst that re-fires the
 * panel `$effect` 5 times within 1 s should produce one IPC, not five.
 */
const lastFetchedBacklinksVersion = new Map<string, number>();
/** Same idea as `lastFetchedBacklinksVersion`, for unlinked-mentions. */
const lastFetchedUnlinkedVersion = new Map<string, number>();

interface CachedScanResult {
	source: 'cache' | 'cache_reconciled' | 'full_scan';
	entryCount: number;
	loadMs: number;
	filesReread: number;
}

/**
 * The promise of the build currently in flight, or `null` when idle. Read
 * only from the `isBuilding` branch of `buildIndex`, and `isBuilding = true`
 * is always followed synchronously by the assignment below, so it can never
 * hand out a settled promise from a previous vault. That still holds across a
 * `resetBacklinks()`, which leaves `isBuilding` alone: the flag is then owned
 * by a scan that has not settled yet, so `inflightBuild` is that scan's
 * still-pending promise. Deliberately not cleared by `resetBacklinks` for the
 * same reason.
 */
let inflightBuild: Promise<boolean> | null = null;

/**
 * Bootstraps the Rust `VaultIndex` for the given vault path. Uses the
 * persistent disk cache when available, falling back to a full scan on
 * cache miss. Mtime reconciliation re-reads only files that changed
 * since the cache was written.
 *
 * Coalescing + completion contract: concurrent calls do not start a second
 * scan. The latest requested `path` wins (it becomes the module-level
 * `vaultPath`, which is what the queued rerun and every later
 * `rebuildIndex()` replay), and the queued caller receives the in-flight
 * build's promise. So `await buildIndex(p)` always means "the Rust
 * `VaultIndex` has been built for `p`", never "a build for some other vault
 * was already running". One exception: a `resetBacklinks()` landing between
 * the queue and the replay clears `pendingRebuild`, so the queued caller then
 * resolves with the dying vault's outcome and its own path is never scanned.
 * `initializeVault`'s `initVersion !== version` guard, not this function, is
 * what makes that safe. IPC failures are still logged and swallowed rather
 * than rethrown (the in-flight promise is shared with the queued caller), so
 * the resolved value carries the outcome instead: `true` only when the scan
 * for the LATEST requested path completed, `false` when it failed.
 */
export function buildIndex(path: string): Promise<boolean> {
	// Before the early return: a build queued during an in-flight scan must
	// rerun against the LATEST path, not the one the running scan started with.
	vaultPath = path;
	if (isBuilding) {
		pendingRebuild = true;
		return inflightBuild ?? Promise.resolve(false);
	}
	isBuilding = true;
	inflightBuild = runBuildIndex(path);
	return inflightBuild;
}

/**
 * Runs one `scan_vault_v2_cached` round trip and then replays any build queued
 * while it was running. Returning the rerun is what makes the queued caller's
 * promise settle only once the latest vault is indexed, AND carry that vault's
 * own outcome: the replay must stay OUTSIDE the `finally`, because a value
 * awaited inside `finally` is discarded and the queued caller would receive
 * the failed first scan's `false`.
 *
 * `isBuilding` is reset in the `finally`, i.e. BEFORE the rerun on purpose:
 * the rerun re-enters through `buildIndex`, which must take the build branch,
 * not the await branch. Moving the reset below the rerun self-deadlocks.
 *
 * Resolves `true` only once a scan actually completed. IPC failures are logged
 * and swallowed (never rethrown: `inflightBuild` is shared with the queued
 * caller) and reported as `false`.
 */
async function runBuildIndex(path: string): Promise<boolean> {
	let ok = false;
	try {
		// Inside the `try` so that nothing at all can throw between `isBuilding = true`
		// in `buildIndex` and the `finally` that clears it. The flag is now the only
		// serializer across a `resetBacklinks()`, so a leaked `true` would wedge every
		// later build behind a promise that never settles again.
		const t0 = perfStart();
		const result = await invoke<CachedScanResult>('scan_vault_v2_cached', { path });
		ok = true;
		perfEnd('BACKLINKS', `buildIndex:${result.source}`, t0);
		debug(
			'BACKLINKS',
			`VaultIndex loaded: source=${result.source} entries=${result.entryCount} reread=${result.filesReread} ${result.loadMs}ms`,
		);
	} catch (err) {
		errorLog('BACKLINKS', 'scan_vault_v2_cached failed:', err);
	} finally {
		isBuilding = false;
	}
	if (pendingRebuild && vaultPath) {
		pendingRebuild = false;
		return buildIndex(vaultPath);
	}
	return ok;
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
 * Used by both the +layout.svelte tab-switch effect (path change) and
 * `BacklinksPanel.svelte` (path change OR `vaultStore.vaultIndexVersion`
 * bump). Wrapped in `dedupeInflight` so concurrent calls for the same
 * `path` collapse into a single IPC — this handles the burst case where
 * a tab switch + a version bump land in the same JS turn.
 *
 * Stale-aware skip: a snapshot of `vaultStore.vaultIndexVersion` is taken
 * on entry. If it matches the last value at which we successfully wrote
 * `linkedMentions` for this path, the IPC is skipped — the panel data
 * is already up to date with the current Rust `VaultIndex` state. This
 * elides redundant IPCs in burst-save scenarios where the panel effect
 * re-fires several times across 150 ms debounce windows but the
 * underlying data for the active tab has not changed.
 *
 * Errors are logged via `errorLog('BACKLINKS', ...)` and swallowed — the
 * linked-mentions panel keeps its prior contents on IPC failure. The
 * stale-cache is NOT updated on error, so the next call retries.
 */
async function fetchBacklinksV2Inner(path: string): Promise<void> {
	const snapshotVersion = vaultStore.vaultIndexVersion;
	if (lastFetchedBacklinksVersion.get(path) === snapshotVersion) {
		// Data on screen already matches this version of the Rust index.
		// Common in burst-save: 5 saves emit 5 bumps, BacklinksPanel's
		// 150 ms debounce coalesces inside each window but each window's
		// debounced trigger still hits the service — without this guard
		// each one would fan out to Rust unnecessarily.
		return;
	}
	const t0 = perfStart();
	try {
		const entries = await invoke<NoteEntryV2[]>('get_backlinks_v2', { path });
		// Active-path guard: the user may have switched tabs while this
		// IPC was in flight. Writing the stale result would briefly
		// flash the previous tab's backlinks before the new tab's fetch
		// overwrites it.
		if (!isStillCurrentPath(path, editorStore.activeTabPath)) {
			perfEnd('BACKLINKS', 'fetchBacklinksV2(stale, dropped)', t0);
			return;
		}
		const linked = entries.map(noteEntryV2ToBacklinkEntry);
		backlinksStore.setLinkedMentions(linked);
		lastFetchedBacklinksVersion.set(path, snapshotVersion);
		perfEnd('BACKLINKS', 'fetchBacklinksV2', t0);
	} catch (err) {
		errorLog('BACKLINKS', 'fetchBacklinksV2 failed:', err);
	}
}
export const fetchBacklinksV2 = dedupeInflight(fetchBacklinksV2Inner, (path: string) => path);

/**
 * Fetches relationship backlinks for a file from the Rust `VaultIndex`.
 * These are notes that reference the target via frontmatter fields
 * (`_belongs_to`, `_related_to`, `_has_many`, or custom wikilink-bearing fields).
 */
async function fetchRelationshipBacklinksInner(path: string): Promise<void> {
	try {
		const entries = await invoke<RelationshipBacklinkV2[]>('get_relationship_backlinks_v2', { path });
		if (!isStillCurrentPath(path, editorStore.activeTabPath)) return;
		backlinksStore.setRelationshipBacklinks(entries);
	} catch (err) {
		errorLog('BACKLINKS', 'fetchRelationshipBacklinks failed:', err);
	}
}
export const fetchRelationshipBacklinks = dedupeInflight(fetchRelationshipBacklinksInner, (path: string) => path);

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
 * Wrapped in `dedupeInflight` because the BacklinksPanel `$effect`
 * tracks `(unlinkedDirty, activeTabPath, unlinkedOpen)` and can re-fire
 * for the same `filePath` while a prior IPC is still in flight (e.g. a
 * dirty-bump arrives during a 400 ms disk scan). Stale-aware skip on
 * `vaultIndexVersion` matches the `fetchBacklinksV2` rationale.
 * Errors are logged via `errorLog('BACKLINKS', ...)` and swallowed.
 */
async function computeUnlinkedMentionsForFileInner(filePath: string): Promise<void> {
	const snapshotVersion = vaultStore.vaultIndexVersion;
	if (lastFetchedUnlinkedVersion.get(filePath) === snapshotVersion) {
		return;
	}
	const t0 = perfStart();
	try {
		const entries = await invoke<NoteEntryV2[]>('get_unlinked_mentions_v2', { path: filePath });
		// Same active-path guard as `fetchBacklinksV2Inner` — the
		// 400 ms unlinked-mentions disk scan is the LONGEST window
		// where a tab switch could land mid-flight.
		if (!isStillCurrentPath(filePath, editorStore.activeTabPath)) {
			perfEnd('BACKLINKS', 'computeUnlinkedMentionsForFile(stale, dropped)', t0);
			return;
		}
		const unlinked = entries.map(noteEntryV2ToBacklinkEntry);
		backlinksStore.setUnlinkedMentions(unlinked);
		lastFetchedUnlinkedVersion.set(filePath, snapshotVersion);
		perfEnd('BACKLINKS', 'computeUnlinkedMentionsForFile', t0);
	} catch (err) {
		errorLog('BACKLINKS', 'computeUnlinkedMentionsForFile failed:', err);
	}
}
export const computeUnlinkedMentionsForFile = dedupeInflight(
	computeUnlinkedMentionsForFileInner,
	(filePath: string) => filePath,
);

/**
 * Clears the per-vault path, the queued-rebuild flag, the per-path version
 * caches and the store. Called by `teardownVault()` in
 * `core/app-lifecycle/app-lifecycle.service.ts`, which is its only production
 * caller. `isBuilding` and `inflightBuild` are deliberately left alone, for
 * the reasons below.
 *
 * `isBuilding` is deliberately NOT cleared. It is the only thing serializing
 * scans, and a teardown can land while a watcher-triggered
 * `scan_vault_v2_cached` for the dying vault is still on the Rust blocking
 * pool. Clearing the flag there let the next vault's `buildIndex` take the
 * build branch and run a SECOND concurrent scan; whichever scan reached the
 * `VaultIndexState` write lock last replaced the whole process-wide index, so
 * a slow scan of the old vault could land after the new one and leave the
 * index holding the old vault's entries. Leaving the flag true makes the new
 * vault's build queue behind the live scan instead, which costs the switch the
 * dying vault's remaining scan time but makes the wrong ordering impossible.
 * The flag still always returns to false on its own: `runBuildIndex`'s
 * `finally` runs on every path, including the swallowed IPC rejection.
 *
 * `pendingRebuild` IS cleared: a stale flag would make the next vault's first
 * `buildIndex` fire one spurious extra full scan, and any post-teardown caller
 * re-arms it by itself.
 */
export function resetBacklinks() {
	vaultPath = null;
	pendingRebuild = false;
	lastFetchedBacklinksVersion.clear();
	lastFetchedUnlinkedVersion.clear();
	backlinksStore.reset();
}
