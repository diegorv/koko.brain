import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { resetEditor, saveAllDirtyTabs, reloadExternallyChangedTabs } from '$lib/core/editor/editor.service';
import { resetHooks } from '$lib/core/editor/editor.hooks';
import { queryjsSessionStore } from '$lib/plugins/queryjs/queryjs-session.store.svelte';
import { resetFileSystem, loadDirectoryTree } from '$lib/core/filesystem/fs.service';
import { debounce } from '$lib/utils/debounce';
import { debug, error, logProcessMemory, perfStart, perfEnd, setTauriDebugMode, stopTauriDebugListener } from '$lib/utils/debug';
import { initLogSession, teardownLogSession, startHeartbeat } from '$lib/utils/log.service';
import {
	startWatching,
	stopWatching,
	onFileChange
} from '$lib/core/filesystem/fs.watcher';
import {
	buildIndex,
	resetBacklinks,
} from '$lib/features/backlinks/backlinks.service';
import { buildPropertyIndex, resetCollection } from '$lib/features/collection/collection.service';
import {
	resetOutgoingLinks,
} from '$lib/features/outgoing-links/outgoing-links.service';
import { buildTagIndex, resetTags } from '$lib/features/tags/tags.service';
import { rebuildAllIndexes } from './watcher-handler.service';
import {
	resetSearch,
	buildSearchIndex,
	registerSearchIndexHook,
	initSemanticSearch,
	buildSemanticIndex,
	startSemanticProgressListener,
	stopSemanticProgressListener,
} from '$lib/features/search/search.service';
import { searchStore } from '$lib/features/search/search.store.svelte';
import { loadSettings, saveSettings, resetSettings } from '$lib/core/settings/settings.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { resetProperties } from '$lib/features/properties/properties.service';
import { resetGraphView } from '$lib/plugins/graph-view/graph-view.service';
import {
	resetTemplates,
	ensureTemplatesFolder,
} from '$lib/plugins/templates/templates.service';
import {
	loadBookmarks,
	resetBookmarks,
} from '$lib/features/bookmarks/bookmarks.service';
import { loadTrash, resetTrash } from '$lib/core/trash/trash.service';
import {
	loadRecentIcons,
	buildFrontmatterIconIndex,
	resetFileIcons,
} from '$lib/features/file-icons/file-icons.service';
import {
	resetCalendar,
	scanFilesForCalendar,
} from '$lib/plugins/calendar/calendar.service';
import { buildTaskIndex, resetTasks } from '$lib/features/tasks/tasks.service';
import { resetQuickSwitcher } from '$lib/features/quick-switcher/quick-switcher.service';
import { resetCommandPalette } from '$lib/features/command-palette/command-palette.service';
import { resetPeriodicNotes } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { resetKanban } from '$lib/plugins/kanban/kanban.service';
import { todoistStore } from '$lib/features/tasks/todoist.store.svelte';
import { lifecycleFilterStore } from '$lib/features/properties/lifecycle-filter.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { registerFileHistoryHook, closeFileHistory } from '$lib/features/file-history/file-history.service';
import { executePendingAction, resetDeepLink } from '$lib/features/deep-link/deep-link.service';
import { loadAutoMoveConfig, toggleAutoMoveHook, resetAutoMove } from '$lib/features/auto-move/auto-move.service';
import { buildContentOrderMap } from '$lib/features/folder-notes/folder-notes.logic';
import { applyFolderOrder, attachFileCounts } from '$lib/core/filesystem/fs.logic';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import { clearMermaidCache } from '$lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget';
import { clearCollectionCache } from '$lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget';
import { clearMathCache } from '$lib/core/markdown-editor/extensions/live-preview/widgets/block-math-widget';
import { clearInlineMathCache } from '$lib/core/markdown-editor/extensions/live-preview/widgets/inline-math-widget';

/**
 * Delay (ms) before the deferred semantic-search init kicks in.
 * The ONNX model load + initial chunk+embed pass blocks the main thread
 * for ~2.7s on a fresh boot (1800-note vault). Deferring this past the
 * user's first tab interaction keeps early UI responsiveness intact —
 * profiling showed the first tab switch normally happens within 1.5-2s
 * after initializeVault resolves, so 3s clears that window.
 */
const SEMANTIC_INIT_DEFER_MS = 3000;

/**
 * Version counter for vault initialization.
 * Incremented on every initializeVault call, checked after each await
 * to discard results from obsolete initializations (e.g. rapid vault switch).
 */
let initVersion = 0;
/** Timer handle for the deferred semantic-search init, set during initializeVault */
let semanticInitTimer: ReturnType<typeof setTimeout> | null = null;
/** Timer handle for the deferred secondary builders, set during initializeVault */
let secondaryBuildersTimer: ReturnType<typeof setTimeout> | null = null;
/** Cleanup function for the file change listener, set during initializeVault */
let unsubscribeFileChange: (() => void) | null = null;
/** Cleanup function for the file history after-save hook */
let unsubscribeFileHistory: (() => void) | null = null;
/** Cleanup function for the search index after-save hook */
let unsubscribeSearchIndex: (() => void) | null = null;
/** Debounced handler for file change events, stored for cancellation on teardown */
let debouncedFileChangeHandler: ReturnType<typeof debounce> | null = null;
/** Accumulated changed paths from the watcher, consumed by the debounced handler */
let pendingWatcherPaths: string[] = [];

/**
 * Initializes all app systems when a vault is opened.
 * Loads settings, starts the file watcher, and builds all indexes.
 * Uses a version counter to discard results if a newer initialization starts.
 */
export async function initializeVault(vaultPath: string): Promise<void> {
	// If a vault is already initialized, save dirty tabs and tear down
	// watchers, database connections, hooks, and stores from the old vault
	if (unsubscribeFileChange) {
		debug('LIFECYCLE', 'Saving dirty tabs before tearing down previous vault');
		await saveAllDirtyTabs();
		debug('LIFECYCLE', 'Tearing down previous vault before re-initialization');
		teardownVault();
	}

	const version = ++initVersion;
	const initStart = performance.now();
	debug('LIFECYCLE', 'initializeVault started:', vaultPath);

	// ── Step 1: Settings ─────────────────────────────────────────────
	// Settings MUST load first — other operations depend on it
	const t1 = perfStart();
	await loadSettings(vaultPath);
	perfEnd('LIFECYCLE', 'Step 1: loadSettings', t1);
	if (initVersion !== version) return;

	if (settingsStore.debugModeTauri) {
		debug('LIFECYCLE', 'Tauri debug mode enabled — activating');
		setTauriDebugMode(true);
	}

	if (settingsStore.debugLogToFile || settingsStore.debugTauriLogToFile) {
		debug('LIFECYCLE', 'Log-to-file enabled — initializing log session');
		try {
			await initLogSession();
			if (settingsStore.debugHeartbeat) {
				startHeartbeat();
			}
		} catch (err) {
			error('LIFECYCLE', 'Failed to initialize log session:', err);
		}
	}

	// ── Step 2: Database + hooks ─────────────────────────────────────
	debug('LIFECYCLE', 'Opening vault database...');
	const t2 = perfStart();
	try {
		await invoke('open_vault_db', { vaultPath });
	} catch (err) {
		error('LIFECYCLE', 'Failed to open vault database:', err);
		toast.error('Failed to open vault database. Some features may not work.');
		return;
	}
	perfEnd('LIFECYCLE', 'Step 2: open_vault_db', t2);
	if (initVersion !== version) return;

	if (settingsStore.history.enabled) {
		debug('LIFECYCLE', 'File history enabled — registering after-save hook');
		unsubscribeFileHistory = registerFileHistoryHook();
	} else {
		debug('LIFECYCLE', 'File history disabled — skipping hook registration');
	}

	const retentionDays = settingsStore.history.retentionDays;
	debug('LIFECYCLE', `Cleaning up old snapshots (retention: ${retentionDays} days)...`);
	invoke('cleanup_history', { retentionDays }).catch((err) => {
		error('HISTORY', 'Cleanup failed:', err);
	});

	// ── Step 3: Load user data (parallel) ────────────────────────────
	const t3 = perfStart();
	try {
		await Promise.all([
			loadBookmarks(vaultPath),
			loadRecentIcons(vaultPath),
			loadTrash(vaultPath),
			loadAutoMoveConfig(vaultPath),
		]);
	} catch (err) {
		error('LIFECYCLE', 'Failed to load user data (bookmarks/icons/trash):', err);
		toast.error('Failed to load some user data. Bookmarks, icons, or trash may be missing.');
	}
	perfEnd('LIFECYCLE', 'Step 3: loadUserData(parallel)', t3);
	if (initVersion !== version) return;

	// ── Step 4: Build indexes + file tree ────────────────────────────
	// Must complete before starting the watcher to avoid concurrent builds
	const t4 = perfStart();
	try {
		await Promise.all([
			buildIndex(vaultPath),
			loadDirectoryTree(vaultPath),
		]);
	} catch (err) {
		error('LIFECYCLE', 'Failed to build indexes or load file tree:', err);
		toast.error('Failed to load vault contents. The file explorer or search may not work.');
	}
	perfEnd('LIFECYCLE', 'Step 4: buildIndex+loadDirectoryTree(parallel)', t4);
	if (initVersion !== version) return;

	// ── Step 4b: Apply _order frontmatter to file tree ──────────────
	// Index is now ready, fetch entries once to build contentOrder map.
	// The watcher handles subsequent updates via fsStore.contentOrder.
	try {
		const entries = await invoke<NoteEntryV2[]>('get_all_vault_entries_v2');
		const contentOrder = buildContentOrderMap(entries);
		fsStore.setContentOrder(contentOrder);
		if (contentOrder.size > 0 && fsStore.fileTree.length > 0) {
			const sorted = applyFolderOrder(fsStore.fileTree, fsStore.folderOrder, vaultPath, vaultPath, contentOrder);
			attachFileCounts(sorted);
			fsStore.setFileTree(sorted);
		}
	} catch (err) {
		error('LIFECYCLE', 'Failed to build content order:', err);
	}
	if (initVersion !== version) return;

	// ── Step 5: Post-index setup ─────────────────────────────────────
	// Templates folder stays here (cheap, avoids racing loadDirectoryTree).
	// autoOpenDailyNote is deliberately NOT called here — it is triggered
	// from +layout.svelte after initializeVault resolves, so the daily-note
	// `exists() → readTextFile` chain doesn't compete for the main thread
	// with the synchronous index builds below and with Svelte's initial
	// UI mount. Profiling showed that calling it here delayed the open
	// of the daily note by ~2 seconds even though the Rust side responded
	// in <10 ms — the JS microtask was starved.
	const t5a = perfStart();
	await ensureTemplatesFolder();
	perfEnd('LIFECYCLE', 'Step 5a: ensureTemplatesFolder', t5a);

	// Secondary index builders are deferred off the init critical path. Each
	// iterates over every note's content and together add ~460ms of synchronous
	// JS work on the main thread — none of them are required for the daily
	// note to open. Their stores back the Tags / Properties / Calendar / file
	// icon panels, which degrade gracefully if briefly empty. Running them via
	// `setTimeout(…, 0)` lets the WebKit first render + daily-note IPC proceed
	// first, then the builders run as macrotasks.
	secondaryBuildersTimer = setTimeout(() => {
		secondaryBuildersTimer = null;
		if (initVersion !== version) return;
		const t5b = perfStart();
		buildTagIndex();
		buildTaskIndex();
		buildPropertyIndex();
		buildFrontmatterIconIndex().catch((err) =>
			error('LIFECYCLE', 'buildFrontmatterIconIndex failed:', err),
		);
		scanFilesForCalendar();
		perfEnd('LIFECYCLE', 'Step 5b: secondary builders (tags+tasks+properties+icons+calendar)', t5b);
	}, 0);

	// ── Step 6: Search ───────────────────────────────────────────────
	debug('LIFECYCLE', 'Building FTS5 search index...');
	const t6 = perfStart();
	buildSearchIndex()
		.then(() => perfEnd('LIFECYCLE', 'Step 6: buildSearchIndex (async)', t6))
		.catch((err) => {
			error('LIFECYCLE', 'Search index build failed:', err);
		});
	unsubscribeSearchIndex = registerSearchIndexHook();

	if (settingsStore.autoMove.enabled) {
		debug('LIFECYCLE', 'Auto-move enabled — registering after-save hook');
		toggleAutoMoveHook(true);
	} else {
		debug('LIFECYCLE', 'Auto-move disabled — skipping hook registration');
	}

	// Semantic search: if enabled but model is missing, disable and notify.
	// Model download only happens from the Settings toggle, never on startup.
	// DEFERRED by SEMANTIC_INIT_DEFER_MS — the ONNX model load blocks the
	// main thread for ~2.7s and used to hit right as the user tried their
	// first tab switch, making the app feel frozen. Pushing it past the
	// initial interaction window moves the unavoidable jank to a time the
	// user isn't actively clicking around.
	debug('LIFECYCLE', `Semantic search enabled: ${settingsStore.search.semanticSearchEnabled}`);
	if (settingsStore.search.semanticSearchEnabled) {
		debug('LIFECYCLE', `Scheduling deferred semantic search init in ${SEMANTIC_INIT_DEFER_MS}ms...`);
		semanticInitTimer = setTimeout(async () => {
			semanticInitTimer = null;
			if (initVersion !== version) return;
			debug('LIFECYCLE', 'Running deferred semantic search init...');
			await startSemanticProgressListener();
			initSemanticSearch().then(async () => {
				if (initVersion !== version) return;
				if (!searchStore.modelAvailable) {
					debug('LIFECYCLE', 'Model not found — disabling semantic search');
					settingsStore.updateSearch({ semanticSearchEnabled: false });
					await saveSettings(vaultPath);
					stopSemanticProgressListener();
					toast.warning('Semantic search model not found. Re-enable in Settings to download.');
					return;
				}
				debug('LIFECYCLE', `Semantic model available: ${searchStore.modelAvailable}`);
				// Fire-and-forget: buildSemanticIndex self-handles its errors (logs
				// + clears the indexing flag, never rejects). Deliberately NOT chained
				// into the init `.catch` below — a transient build failure must not
				// disable semantic search and show an "init failed" toast.
				void buildSemanticIndex();
			}).catch(async (err) => {
				if (initVersion !== version) return;
				error('LIFECYCLE', 'Semantic search init failed:', err);
				settingsStore.updateSearch({ semanticSearchEnabled: false });
				await saveSettings(vaultPath);
				stopSemanticProgressListener();
				toast.error('Semantic search initialization failed. Re-enable in Settings to retry.');
			});
		}, SEMANTIC_INIT_DEFER_MS);
	}

	// ── Step 7: File watcher ─────────────────────────────────────────
	// Registered LAST (after indexes are built) to avoid rebuildIndex()
	// racing with the initial buildIndex().
	// Debounced to prevent concurrent rebuilds from rapid file changes.
	debouncedFileChangeHandler = debounce(async () => {
		const paths = [...pendingWatcherPaths];
		pendingWatcherPaths = [];
		await reloadExternallyChangedTabs(paths);
		await rebuildAllIndexes(paths);
	}, 300);
	unsubscribeFileChange = onFileChange((paths) => {
		debug('LIFECYCLE', `file change listener fired at ${Date.now()}, paths: ${paths.length}`);
		pendingWatcherPaths.push(...paths);
		debouncedFileChangeHandler?.();
	});
	startWatching(vaultPath).catch((err) => {
		error('LIFECYCLE', 'Failed to start file watcher:', err);
	});
	// ── Step 8: Execute pending deep-link action ────────────────────
	executePendingAction().catch((err) => {
		error('LIFECYCLE', 'Failed to execute pending deep-link action:', err);
	});

	debug('LIFECYCLE', `initializeVault complete in ${(performance.now() - initStart).toFixed(1)}ms:`, vaultPath);
	logProcessMemory();
}

/**
 * Tears down all app systems when a vault is closed.
 * Stops the file watcher and resets all stores to their initial state.
 */
export function teardownVault(): void {
	debug('LIFECYCLE', 'teardownVault started');

	// ── Invalidate in-flight initialization ──────────────────────────
	initVersion++;
	pendingWatcherPaths = [];
	if (semanticInitTimer) {
		clearTimeout(semanticInitTimer);
		semanticInitTimer = null;
	}
	if (secondaryBuildersTimer) {
		clearTimeout(secondaryBuildersTimer);
		secondaryBuildersTimer = null;
	}

	// ── Unsubscribe hooks + listeners ────────────────────────────────
	if (debouncedFileChangeHandler) {
		debouncedFileChangeHandler.cancel();
		debouncedFileChangeHandler = null;
	}
	if (unsubscribeFileChange) {
		unsubscribeFileChange();
		unsubscribeFileChange = null;
	}
	if (unsubscribeFileHistory) {
		debug('LIFECYCLE', 'Unsubscribing file history hook');
		unsubscribeFileHistory();
		unsubscribeFileHistory = null;
	}
	if (unsubscribeSearchIndex) {
		unsubscribeSearchIndex();
		unsubscribeSearchIndex = null;
	}
	// ── Stop background processes ────────────────────────────────────
	stopWatching();
	stopSemanticProgressListener();
	stopTauriDebugListener();
	teardownLogSession();

	// ── Save index cache before teardown ─────────────────────────────
	if (vaultStore.path) {
		invoke('save_vault_cache', { path: vaultStore.path }).catch((err: unknown) => {
			error('LIFECYCLE', 'Failed to save vault cache:', err);
		});
	}

	// ── Close database + async cleanup ───────────────────────────────
	debug('LIFECYCLE', 'Closing vault database...');
	invoke('close_vault_db').catch((err: unknown) => {
		error('LIFECYCLE', 'Failed to close vault database:', err);
	});
	closeFileHistory();

	// ── Reset hooks + stores ────────────────────────────────────────
	resetHooks();
	queryjsSessionStore.reset();
	clearMermaidCache();
	clearCollectionCache();
	clearMathCache();
	clearInlineMathCache();
	resetEditor();
	resetFileSystem();
	resetBacklinks();
	resetOutgoingLinks();
	resetTags();
	resetSettings();
	resetSearch();
	resetGraphView();
	resetKanban();
	resetTemplates();
	resetBookmarks();
	resetFileIcons();
	resetCalendar();
	resetTasks();
	resetProperties();
	resetCollection();
	resetQuickSwitcher();
	resetCommandPalette();
	resetAutoMove();
	resetDeepLink();
	resetPeriodicNotes();
	resetTrash();
	todoistStore.reset();
	lifecycleFilterStore.reset();
	typeDefinitionsStore.reset();
}
