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
 * hand out a settled promise from a previous vault. Deliberately not cleared
 * by `resetBacklinks` for the same reason.
 */
let inflightBuild: Promise<void> | null = null;

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
 * was already running". IPC failures are logged and swallowed, so a resolved
 * promise does not by itself prove the scan succeeded.
 */
export function buildIndex(path: string): Promise<void> {
	// Before the early return: a build queued during an in-flight scan must
	// rerun against the LATEST path, not the one the running scan started with.
	vaultPath = path;
	if (isBuilding) {
		pendingRebuild = true;
		return inflightBuild ?? Promise.resolve();
	}
	isBuilding = true;
	inflightBuild = runBuildIndex(path);
	return inflightBuild;
}

/**
 * Runs one `scan_vault_v2_cached` round trip and, in its `finally`, replays
 * any build queued while it was running. Awaiting the rerun is what makes the
 * queued caller's promise settle only once the latest vault is indexed.
 *
 * `isBuilding` is reset BEFORE the rerun on purpose: the rerun re-enters
 * through `buildIndex`, which must take the build branch, not the await
 * branch. Moving the reset below the rerun self-deadlocks.
 */
async function runBuildIndex(path: string): Promise<void> {
	const t0 = perfStart();
	try {
		const result = await invoke<CachedScanResult>('scan_vault_v2_cached', { path });
		perfEnd('BACKLINKS', `buildIndex:${result.source}`, t0);
		debug(
			'BACKLINKS',
			`VaultIndex loaded: source=${result.source} entries=${result.entryCount} reread=${result.filesReread} ${result.loadMs}ms`,
		);
	} catch (err) {
		errorLog('BACKLINKS', 'scan_vault_v2_cached failed:', err);
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

export function resetBacklinks() {
	vaultPath = null;
	isBuilding = false;
	pendingRebuild = false;
	lastFetchedBacklinksVersion.clear();
	lastFetchedUnlinkedVersion.clear();
	backlinksStore.reset();
}
