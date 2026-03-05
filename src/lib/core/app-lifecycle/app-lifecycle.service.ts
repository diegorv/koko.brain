import { invoke } from '@tauri-apps/api/core';
import { toast } from 'svelte-sonner';
import { resetEditor, saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import { resetHooks } from '$lib/core/editor/editor.hooks';
import { resetFileSystem, loadDirectoryTree } from '$lib/core/filesystem/fs.service';
import { debounce } from '$lib/utils/debounce';
import { debug, error, logProcessMemory, setTauriDebugMode, stopTauriDebugListener } from '$lib/utils/debug';
import { initLogSession, teardownLogSession } from '$lib/utils/log.service';
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
	loadFileIcons,
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
import { autoOpenDailyNote } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { resetTerminal } from '$lib/plugins/terminal/terminal.service';
import { resetKanban } from '$lib/plugins/kanban/kanban.service';
import { registerFileHistoryHook, closeFileHistory } from '$lib/features/file-history/file-history.service';
import { registerEncryptionHooks, resetEncryptedNotes } from '$lib/plugins/encrypted-notes/encrypted-notes.service';
import { executePendingAction, resetDeepLink } from '$lib/features/deep-link/deep-link.service';
import { loadAutoMoveConfig, toggleAutoMoveHook, resetAutoMove } from '$lib/features/auto-move/auto-move.service';

/**
 * Version counter for vault initialization.
 * Incremented on every initializeVault call, checked after each await
 * to discard results from obsolete initializations (e.g. rapid vault switch).
 */
let initVersion = 0;
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
	await loadSettings(vaultPath);
	if (initVersion !== version) return;

	if (settingsStore.debugModeTauri) {
		debug('LIFECYCLE', 'Tauri debug mode enabled — activating');
		setTauriDebugMode(true);
	}

	if (settingsStore.debugLogToFile || settingsStore.debugTauriLogToFile) {
		debug('LIFECYCLE', 'Log-to-file enabled — initializing log session');
		try {
			await initLogSession();
		} catch (err) {
			error('LIFECYCLE', 'Failed to initialize log session:', err);
		}
	}

	// ── Step 2: Database + hooks ─────────────────────────────────────
	debug('LIFECYCLE', 'Opening vault database...');
	try {
		await invoke('open_vault_db', { vaultPath });
	} catch (err) {
		error('LIFECYCLE', 'Failed to open vault database:', err);
		toast.error('Failed to open vault database. Some features may not work.');
		return;
	}
	debug('LIFECYCLE', 'Vault database opened');
	if (initVersion !== version) return;

	if (settingsStore.history.enabled) {
		debug('LIFECYCLE', 'File history enabled — registering after-save hook');
		unsubscribeFileHistory = registerFileHistoryHook();
	} else {
		debug('LIFECYCLE', 'File history disabled — skipping hook registration');
	}

	debug('LIFECYCLE', 'Registering encryption hooks...');
	registerEncryptionHooks();

	const retentionDays = settingsStore.history.retentionDays;
	debug('LIFECYCLE', `Cleaning up old snapshots (retention: ${retentionDays} days)...`);
	invoke('cleanup_history', { retentionDays }).catch((err) => {
		error('HISTORY', 'Cleanup failed:', err);
	});

	// ── Step 3: Load user data (parallel) ────────────────────────────
	try {
		await Promise.all([
			loadBookmarks(vaultPath),
			loadFileIcons(vaultPath),
			loadRecentIcons(vaultPath),
			loadTrash(vaultPath),
			loadAutoMoveConfig(vaultPath),
		]);
	} catch (err) {
		error('LIFECYCLE', 'Failed to load user data (bookmarks/icons/trash):', err);
		toast.error('Failed to load some user data. Bookmarks, icons, or trash may be missing.');
	}
	if (initVersion !== version) return;

	// ── Step 4: Build indexes + file tree ────────────────────────────
	// Must complete before starting the watcher to avoid concurrent builds
	try {
		await Promise.all([
			buildIndex(vaultPath),
			loadDirectoryTree(vaultPath),
		]);
	} catch (err) {
		error('LIFECYCLE', 'Failed to build indexes or load file tree:', err);
		toast.error('Failed to load vault contents. The file explorer or search may not work.');
	}
	if (initVersion !== version) return;

	// ── Step 5: Post-index setup ─────────────────────────────────────
	// Templates folder + daily note AFTER tree is loaded to avoid
	// concurrent loadDirectoryTree calls racing with isLoading state
	await ensureTemplatesFolder();
	autoOpenDailyNote();

	buildTagIndex();
	buildTaskIndex();
	buildPropertyIndex();
	buildFrontmatterIconIndex();
	scanFilesForCalendar();

	// ── Step 6: Search ───────────────────────────────────────────────
	debug('LIFECYCLE', 'Building FTS5 search index...');
	buildSearchIndex().catch((err) => {
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
	debug('LIFECYCLE', `Semantic search enabled: ${settingsStore.search.semanticSearchEnabled}`);
	if (settingsStore.search.semanticSearchEnabled) {
		debug('LIFECYCLE', 'Starting semantic search init...');
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
			buildSemanticIndex();
		}).catch(async (err) => {
			if (initVersion !== version) return;
			error('LIFECYCLE', 'Semantic search init failed:', err);
			settingsStore.updateSearch({ semanticSearchEnabled: false });
			await saveSettings(vaultPath);
			stopSemanticProgressListener();
			toast.error('Semantic search initialization failed. Re-enable in Settings to retry.');
		});
	}

	// ── Step 7: File watcher ─────────────────────────────────────────
	// Registered LAST (after indexes are built) to avoid rebuildIndex()
	// racing with the initial buildIndex().
	// Debounced to prevent concurrent rebuilds from rapid file changes.
	debouncedFileChangeHandler = debounce(async () => {
		const paths = [...pendingWatcherPaths];
		pendingWatcherPaths = [];
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

	// ── Close database + async cleanup ───────────────────────────────
	debug('LIFECYCLE', 'Closing vault database...');
	invoke('close_vault_db').catch((err: unknown) => {
		error('LIFECYCLE', 'Failed to close vault database:', err);
	});
	debug('LIFECYCLE', 'Resetting encryption state...');
	resetEncryptedNotes().catch(() => {});
	closeFileHistory();

	// ── Reset hooks + stores ────────────────────────────────────────
	resetHooks();
	resetTerminal();
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
	resetTrash();
}
