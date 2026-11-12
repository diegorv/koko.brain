import { getCurrentWindow } from '@tauri-apps/api/window';
import { toast } from 'svelte-sonner';
import { EVENT_NAMES } from '#lib/contracts/events.js';
import type { IndexDelta } from '#lib/contracts/index.js';
import { call, on } from '#lib/contracts/ipc.js';
import { settingsPanelStore } from '#lib/core/settings/settings-panel.store.svelte.js';
import { refreshDailyNoteIfDateChanged } from '#lib/plugins/periodic-notes/periodic-notes.service.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { prepareForExit } from '#lib/core/vault/exit.service.js';
import { getVaultEntries, invalidateVaultEntries, patchVaultEntries } from '#lib/core/vault/vault-entries.service.js';
import { refreshArchivedPaths } from '#lib/features/properties/lifecycle-filter.service.js';
import { refreshTypeDefinitions } from '#lib/features/type-definitions/type-definitions.service.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { loadDirectoryTree } from '#lib/core/filesystem/fs.service.js';
import { buildContentOrderMap, patchContentOrderMap } from '#lib/core/filesystem/folder-notes.logic.js';
import { applyPropertyDelta, buildPropertyIndex, propertyIndexNeedsWholeRead } from '#lib/features/collection/collection.service.js';
import { error } from '#lib/utils/debug.js';

/**
 * Registers a listener for the native macOS menu "Settings" event.
 * Opens the settings dialog when the user clicks Settings in the app menu.
 * Returns a cleanup function to unsubscribe.
 */
export function registerMenuSettingsListener(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	on(EVENT_NAMES.MENU_SETTINGS, () => {
		settingsPanelStore.toggle();
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		error('LISTENERS', 'Failed to listen for menu:settings:', err);
	});
	return () => {
		cancelled = true;
		unlisten?.();
	};
}

/**
 * Registers a handler that runs `prepareForExit` before the window closes,
 * preventing data loss on close. The window stays open when the user cancels
 * at the discard prompt.
 * Returns a cleanup function to unsubscribe.
 */
export function registerCloseHandler(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	getCurrentWindow().onCloseRequested(async (event) => {
		event.preventDefault();
		if (!(await prepareForExit())) return;
		getCurrentWindow().destroy();
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		error('LISTENERS', 'Failed to listen for close-requested:', err);
	});
	return () => {
		cancelled = true;
		unlisten?.();
	};
}

/**
 * Registers a listener for the Rust `app:exit-requested` event, which Quit
 * (Cmd+Q, the app menu) raises after holding the exit back. Runs
 * `prepareForExit`, then invokes `confirm_exit` so Rust lets the exit go on.
 * A cancel at the discard prompt, or a failed flush, keeps the app open; a
 * failed flush also shows a toast, since Quit would otherwise do nothing
 * visible. Rust emits the event on every Quit, so a request that arrives
 * while one is still running (a flush or the discard prompt) is ignored.
 * Returns a cleanup function to unsubscribe.
 */
export function registerExitRequestListener(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	let exitInFlight = false;
	on(EVENT_NAMES.APP_EXIT_REQUESTED, async () => {
		if (exitInFlight) return;
		exitInFlight = true;
		try {
			if (!(await prepareForExit())) return;
			await call('confirm_exit');
		} catch (err) {
			error('LISTENERS', 'Exit flush failed:', err);
			toast.error('Kokobrain could not finish saving before quitting. Try quitting again.');
		} finally {
			exitInFlight = false;
		}
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		error('LISTENERS', 'Failed to listen for app:exit-requested:', err);
	});
	return () => {
		cancelled = true;
		unlisten?.();
	};
}

/** Delay between a `vault-index-updated` event and its refresh when no refresh ran recently. */
const REFRESH_DELAY_MS = 2000;

/** Minimum spacing between two `vault-index-updated` refreshes during a burst. */
const REFRESH_MIN_INTERVAL_MS = 10_000;

/**
 * Above this many changed paths in one refresh window, the refresh re-reads
 * the whole vault instead of patching per path (a type rename, a large
 * external sync).
 */
const INCREMENTAL_REFRESH_MAX_PATHS = 200;

const EMPTY_DELTA: IndexDelta = { entries: [], records: [] };

/**
 * Registers a listener for the Rust `vault-index-updated` event.
 * Bumps `vaultStore.vaultIndexVersion` from the payload's monotonic counter
 * so consumer panels (Backlinks, Outgoing, etc.) can invalidate cached views
 * via `$effect` on the version getter instead of polling.
 *
 * Phase 3.2 of the perf refactor (`tasks/todo/performance-architecture-refactor.md`).
 *
 * The handler is throttled because the event fires in bursts: the watcher
 * incremental loop emits ONE event PER FILE (`watcher-handler.service.ts`),
 * plus one per content-changed save and per 1 s typing pause. Each firing
 * used to refetch the ENTIRE vault snapshot (`get_all_vault_entries_v2` —
 * clone + sort + multi-MB JSON IPC) and re-run 4-5 O(N) rebuilds, so a
 * 10-file burst meant 10 full-snapshot fetches on the main thread (audit
 * 2026-06-10, HIGH finding 3). Throttling the bump itself also collapses the
 * burst for every `vaultIndexVersion` consumer (TasksView, GraphView, panels).
 * A trailing debounce could not coalesce files that land 5-10 s apart (an
 * embedder burst, 2026-10-27 log: ~198 refreshes in one session), so the
 * throttle works on time since the last refresh instead: an event arms a
 * timer only when none is pending, firing `REFRESH_DELAY_MS` after the event
 * but never sooner than `REFRESH_MIN_INTERVAL_MS` after the previous refresh.
 * Events that arrive while a timer is pending only update `latestVersion`, so
 * the trailing refresh after the last event always carries the latest version.
 * The wait is capped at `REFRESH_MIN_INTERVAL_MS`, so a backward wall-clock
 * jump cannot stall the refresh. Events delivered after cleanup are ignored.
 * Panels may lag up to 10 s behind external changes during a burst (the
 * snapshot is a cache, CLAUDE.md Indexing 12). The one exception is
 * `vaultStore.requestPromptIndexRefresh()`: the event after it refreshes at
 * once and cancels the pending timer, which that refresh supersedes.
 * `fetchSeq` is a latest-wins guard: a slow older fetch resolving after
 * a newer one must not overwrite the stores with a stale snapshot.
 * The snapshot read goes through the shared version-keyed memo
 * (`vault-entries.service.ts`), so this fan-out, wikilink completion and the
 * queryjs widget share ONE snapshot per index version, and the memo's vault
 * open/close invalidation covers these store writes too.
 *
 * The refresh is INCREMENTAL by default: each payload lists the paths it
 * upserted and removed, the window folds them (last operation per path
 * wins), and the refresh reads only those paths (`get_index_delta`) and
 * patches the property index, the memoized snapshot, the sidebar entries and
 * the content order. A path the delta no longer finds counts as removed, so
 * a stale or out-of-order path list cannot resurrect a note. It falls back to
 * the whole-vault reads (`get_all_property_records` +
 * `get_all_vault_entries_v2`) for a `fullRescan` payload, a window above
 * `INCREMENTAL_REFRESH_MAX_PATHS`, no cached snapshot to patch (vault open or
 * close dropped it), and a failed delta read. Two whole-vault payloads
 * deserialized on the main thread per one-note save stalled it (Issue 65).
 *
 * Incremental patches chain on the memo, so they land in order. The sidebar
 * entries and the content order are patched only when the sidebar still holds
 * the snapshot the patch started from; otherwise (a skipped stale fan-out, a
 * reset store) they are rebuilt from the patched snapshot.
 *
 * The refresh is also the PRODUCER for `collectionStore` (plan C11 option 2):
 * `buildPropertyIndex` otherwise only runs on vault open and on the watcher's
 * FULL rebuild, so an external edit or an incremental (<= 10 file) watcher
 * batch refreshed the Rust index without ever reprojecting the TS snapshot
 * that embedded collection blocks query. The whole-vault read keeps its own
 * try/catch and needs no `fetchSeq` guard: it publishes a whole snapshot and
 * replays the deltas applied while it was in flight, so landing after a newer
 * delta does not roll that note back. Deltas wait for a whole read while the
 * index was never built or its latest whole read failed.
 *
 * Returns a cleanup function to unsubscribe (cancels any pending refresh).
 */
export function registerVaultIndexUpdatedListener(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	let latestVersion = 0;
	let fetchSeq = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;
	let lastRefreshAt = Number.NEGATIVE_INFINITY;

	/** Changed path -> whether the last event of the window left it in the index. */
	let pendingPaths = new Map<string, boolean>();
	let pendingFullRescan = false;

	const publishContentOrder = (newOrder: Map<string, number>) => {
		const oldOrder = fsStore.contentOrder;
		const orderChanged = newOrder.size !== oldOrder.size
			|| [...newOrder].some(([k, v]) => oldOrder.get(k) !== v);
		fsStore.setContentOrder(newOrder);
		if (orderChanged && vaultStore.path) {
			loadDirectoryTree(vaultStore.path);
		}
	};

	const fullRefresh = () => {
		buildPropertyIndex();
		const seq = ++fetchSeq;
		getVaultEntries().then((entries) => {
			if (cancelled || seq !== fetchSeq) return;
			refreshArchivedPaths(entries);
			refreshTypeDefinitions(entries);
			typeDefinitionsStore.setEntries(entries);
			publishContentOrder(buildContentOrderMap(entries));
		}).catch((err) => { error('LISTENERS', 'get_all_vault_entries_v2 failed:', err); });
	};

	const incrementalRefresh = (changes: Map<string, boolean>) => {
		const upsertPaths = [...changes].filter(([, indexed]) => indexed).map(([path]) => path);
		let deltaRead: Promise<IndexDelta> | undefined;
		const readDelta = () => (deltaRead ??= upsertPaths.length > 0
			? call('get_index_delta', { paths: upsertPaths })
			: Promise.resolve(EMPTY_DELTA));
		const removedIn = (delta: IndexDelta) => {
			const indexed = new Set(delta.entries.map((e) => e.path));
			return [...changes.keys()].filter((path) => !indexed.has(path));
		};
		const patch = patchVaultEntries(() => readDelta().then((delta) => ({
			upserted: delta.entries,
			removed: removedIn(delta),
		})));
		if (!patch) {
			fullRefresh();
			return;
		}
		const propertyIndexReady = !propertyIndexNeedsWholeRead();
		if (!propertyIndexReady) buildPropertyIndex();
		const seq = ++fetchSeq;
		Promise.all([patch, readDelta()]).then(([{ previous, entries }, delta]) => {
			if (cancelled) return;
			const removed = removedIn(delta);
			// Applied even when a newer refresh started: the patches chain on
			// the memo, so they land in order and each carries only its paths.
			if (propertyIndexReady) applyPropertyDelta(delta.records, removed);
			if (seq !== fetchSeq) return;
			refreshArchivedPaths(entries);
			refreshTypeDefinitions(entries);
			if (typeDefinitionsStore.entries === previous) {
				const touched = [...changes.keys()];
				typeDefinitionsStore.patchEntries(entries, touched, delta.entries);
				publishContentOrder(patchContentOrderMap(fsStore.contentOrder, touched, delta.entries));
			} else {
				typeDefinitionsStore.setEntries(entries);
				publishContentOrder(buildContentOrderMap(entries));
			}
		}).catch((err) => {
			error('LISTENERS', 'get_index_delta failed:', err);
			if (cancelled || seq !== fetchSeq) return;
			// The failed patch may still be the memo entry (its own drop runs
			// a few microtasks later), and the whole-vault read must not join it.
			invalidateVaultEntries();
			fullRefresh();
		});
	};

	const refresh = () => {
		vaultStore.bumpVaultIndexVersion(latestVersion);
		const changes = pendingPaths;
		const fullRescan = pendingFullRescan;
		pendingPaths = new Map();
		pendingFullRescan = false;
		if (fullRescan || changes.size > INCREMENTAL_REFRESH_MAX_PATHS) fullRefresh();
		else incrementalRefresh(changes);
	};
	const scheduleRefresh = () => {
		if (cancelled || timer !== undefined) return;
		// Capped at the min interval: `Date.now()` is wall-clock time, so a
		// backward clock jump would otherwise stretch the wait by the jump.
		const wait = Math.min(
			REFRESH_MIN_INTERVAL_MS,
			Math.max(REFRESH_DELAY_MS, lastRefreshAt + REFRESH_MIN_INTERVAL_MS - Date.now()),
		);
		timer = setTimeout(() => {
			timer = undefined;
			lastRefreshAt = Date.now();
			refresh();
		}, wait);
	};

	on(EVENT_NAMES.VAULT_INDEX_UPDATED, (payload) => {
		latestVersion = payload.version;
		if (payload.fullRescan) pendingFullRescan = true;
		for (const path of payload.removed) pendingPaths.set(path, false);
		for (const path of payload.upserted) pendingPaths.set(path, true);
		// A user's own write that a view must show now (a sidebar lifecycle click, a Tasks status
		// change): one refresh per click is cheap next to the bursts the throttle is for.
		if (!cancelled && vaultStore.takePromptIndexRefresh()) {
			clearTimeout(timer);
			timer = undefined;
			lastRefreshAt = Date.now();
			refresh();
			return;
		}
		scheduleRefresh();
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		error('LISTENERS', 'Failed to listen for vault-index-updated:', err);
	});
	return () => {
		cancelled = true;
		clearTimeout(timer);
		timer = undefined;
		unlisten?.();
	};
}


/**
 * Registers a listener for window focus changes.
 * When the window regains focus, checks if the date has changed
 * and refreshes the auto-pinned daily note if needed.
 * Returns a cleanup function to unsubscribe.
 */
export function registerFocusListener(): () => void {
	let cancelled = false;
	let unlisten: (() => void) | undefined;
	getCurrentWindow().onFocusChanged(({ payload: focused }) => {
		if (focused) {
			refreshDailyNoteIfDateChanged().catch((err) => {
				error('LISTENERS', 'Failed to refresh daily note on focus:', err);
			});
		}
	}).then((fn) => {
		if (cancelled) fn();
		else unlisten = fn;
	}).catch((err) => {
		error('LISTENERS', 'Failed to listen for focus changes:', err);
	});
	return () => {
		cancelled = true;
		unlisten?.();
	};
}
