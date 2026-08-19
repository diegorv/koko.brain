import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	resetEditor: vi.fn(),
	saveAllDirtyTabs: vi.fn(() => Promise.resolve([])),
	reloadExternallyChangedTabs: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/core/editor/editor.hooks', () => ({
	resetHooks: vi.fn(),
	addAfterSaveObserver: vi.fn(() => vi.fn()),
	notifyAfterSave: vi.fn(),
	areAllRecentSaves: vi.fn(() => false),
}));

vi.mock('$lib/core/filesystem/fs.service', () => ({
	resetFileSystem: vi.fn(),
	loadDirectoryTree: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/core/filesystem/fs.watcher', () => ({
	startWatching: vi.fn(() => Promise.resolve()),
	stopWatching: vi.fn(),
	onFileChange: vi.fn(() => vi.fn()),
}));

vi.mock('$lib/utils/debounce', () => ({
	debounce: vi.fn((fn: (...args: any[]) => any) => {
		const debounced = (...args: any[]) => fn(...args);
		debounced.cancel = vi.fn();
		debounced.flush = vi.fn();
		return debounced;
	}),
}));

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	logProcessMemory: vi.fn(() => Promise.resolve()),
	setTauriDebugMode: vi.fn(() => Promise.resolve()),
	stopTauriDebugListener: vi.fn(),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
	perfStart: vi.fn(() => 0),
	perfEnd: vi.fn(),
}));

vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	buildIndex: vi.fn(() => Promise.resolve()),
	rebuildIndex: vi.fn(() => Promise.resolve()),
	resetBacklinks: vi.fn(),
}));

// The register function is kept REAL: the wiring probe below asserts that
// initializeVault actually connects the collection index to the note-change
// owner, and that teardownVault disconnects it again.
vi.mock('$lib/features/collection/collection.service', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/features/collection/collection.service')>()),
	buildPropertyIndex: vi.fn(),
	resetCollection: vi.fn(),
}));

vi.mock('$lib/features/outgoing-links/outgoing-links.service', () => ({
	resetOutgoingLinks: vi.fn(),
}));

vi.mock('$lib/features/tags/tags.service', () => ({
	buildTagIndex: vi.fn(),
	resetTags: vi.fn(),
}));

vi.mock('$lib/features/search/search.service', () => ({
	resetSearch: vi.fn(),
	buildSearchIndex: vi.fn(() => Promise.resolve()),
	registerSearchIndexHook: vi.fn(() => vi.fn()),
	initSemanticSearch: vi.fn(() => Promise.resolve()),
	buildSemanticIndex: vi.fn(() => Promise.resolve()),
	startSemanticProgressListener: vi.fn(() => Promise.resolve()),
	stopSemanticProgressListener: vi.fn(),
}));

vi.mock('$lib/core/settings/settings.service', () => ({
	loadSettings: vi.fn(() => Promise.resolve()),
	resetSettings: vi.fn(),
}));

// The persistence owner runs a Svelte `$effect.root`; its real behaviour is
// covered in settings-persistence.test.ts (jsdom). Here only the lifecycle
// wiring matters, so the module is a spy.
vi.mock('$lib/core/settings/settings-persistence.svelte', () => ({
	startSettingsPersistence: vi.fn(),
	stopSettingsPersistence: vi.fn(() => Promise.resolve()),
	flushSettingsPersistence: vi.fn(() => Promise.resolve()),
}));

vi.mock('svelte-sonner', () => ({
	toast: {
		warning: vi.fn(),
		error: vi.fn(),
		success: vi.fn(),
	},
}));

vi.mock('$lib/features/properties/properties.service', () => ({
	resetProperties: vi.fn(),
}));

vi.mock('$lib/plugins/graph-view/graph-view.service', () => ({
	resetGraphView: vi.fn(),
}));

vi.mock('$lib/plugins/templates/templates.service', () => ({
	resetTemplates: vi.fn(),
	ensureTemplatesFolder: vi.fn(),
}));

vi.mock('$lib/features/bookmarks/bookmarks.service', () => ({
	loadBookmarks: vi.fn(),
	resetBookmarks: vi.fn(),
}));

vi.mock('$lib/features/file-icons/file-icons.service', () => ({
	loadRecentIcons: vi.fn(),
	// Phase 11.5g: buildFrontmatterIconIndex is async (awaits Rust IPC).
	// Mock with a resolved promise so the `.catch()` chain in the
	// app-lifecycle caller doesn't blow up.
	buildFrontmatterIconIndex: vi.fn().mockResolvedValue(undefined),
	registerFileIconsNoteChangeConsumer: vi.fn(() => vi.fn()),
	resetFileIcons: vi.fn(),
}));

vi.mock('$lib/plugins/calendar/calendar.service', () => ({
	registerCalendarNoteChangeConsumer: vi.fn(() => vi.fn()),
	resetCalendar: vi.fn(),
	scanFilesForCalendar: vi.fn(),
}));

vi.mock('$lib/features/tasks/tasks.service', () => ({
	buildTaskIndex: vi.fn(),
	resetTasks: vi.fn(),
}));

vi.mock('$lib/core/trash/trash.service', () => ({
	loadTrash: vi.fn(() => Promise.resolve()),
	resetTrash: vi.fn(),
}));

vi.mock('$lib/plugins/periodic-notes/periodic-notes.service', () => ({
	autoOpenDailyNote: vi.fn(() => Promise.resolve()),
	resetPeriodicNotes: vi.fn(),
}));

vi.mock('$lib/core/settings/update-check.service', () => ({
	maybeAutoCheckForUpdates: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/features/quick-switcher/quick-switcher.service', () => ({
	resetQuickSwitcher: vi.fn(),
}));

vi.mock('$lib/features/command-palette/command-palette.service', () => ({
	resetCommandPalette: vi.fn(),
}));

vi.mock('$lib/features/auto-move/auto-move.service', () => ({
	loadAutoMoveConfig: vi.fn(() => Promise.resolve()),
	toggleAutoMoveHook: vi.fn(),
	resetAutoMove: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
}));

import { invoke } from '@tauri-apps/api/core';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { error as debugError } from '$lib/utils/debug';
import { resetEditor, saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import { resetHooks, addAfterSaveObserver } from '$lib/core/editor/editor.hooks';
import { resetFileSystem, loadDirectoryTree } from '$lib/core/filesystem/fs.service';
import { startWatching, stopWatching, onFileChange } from '$lib/core/filesystem/fs.watcher';
import { buildIndex, rebuildIndex, resetBacklinks } from '$lib/features/backlinks/backlinks.service';
import { buildPropertyIndex, resetCollection } from '$lib/features/collection/collection.service';
import { resetOutgoingLinks } from '$lib/features/outgoing-links/outgoing-links.service';
import { buildTagIndex, resetTags } from '$lib/features/tags/tags.service';
import { resetSearch, buildSearchIndex } from '$lib/features/search/search.service';
import { loadSettings, resetSettings } from '$lib/core/settings/settings.service';
import { startSettingsPersistence, stopSettingsPersistence } from '$lib/core/settings/settings-persistence.svelte';
import { resetProperties } from '$lib/features/properties/properties.service';
import { resetGraphView } from '$lib/plugins/graph-view/graph-view.service';
import { resetTemplates, ensureTemplatesFolder } from '$lib/plugins/templates/templates.service';
import { loadBookmarks, resetBookmarks } from '$lib/features/bookmarks/bookmarks.service';
import { loadRecentIcons, buildFrontmatterIconIndex, resetFileIcons } from '$lib/features/file-icons/file-icons.service';
import { resetCalendar, scanFilesForCalendar } from '$lib/plugins/calendar/calendar.service';
import { buildTaskIndex, resetTasks } from '$lib/features/tasks/tasks.service';
import { loadTrash, resetTrash } from '$lib/core/trash/trash.service';
import { autoOpenDailyNote } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { maybeAutoCheckForUpdates } from '$lib/core/settings/update-check.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { backlinksStore } from '$lib/features/backlinks/backlinks.store.svelte';
import { resetQuickSwitcher } from '$lib/features/quick-switcher/quick-switcher.service';
import { resetCommandPalette } from '$lib/features/command-palette/command-palette.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { searchStore } from '$lib/features/search/search.store.svelte';
import {
	initSemanticSearch,
	buildSemanticIndex,
	startSemanticProgressListener,
	stopSemanticProgressListener,
} from '$lib/features/search/search.service';
import { toast } from 'svelte-sonner';
import { initializeVault, teardownVault } from '$lib/core/app-lifecycle/app-lifecycle.service';
import { todoistStore } from '$lib/features/tasks/todoist.store.svelte';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { lifecycleFilterStore } from '$lib/features/properties/lifecycle-filter.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { refreshViewDefinition, getCachedViewDefinition } from '$lib/features/type-definitions/view-parse-cache';
import { applyNoteChange } from '$lib/core/filesystem/note-change.service';
import { collectionStore } from '$lib/features/collection/collection.store.svelte';
import { wikilinkCompletionSource } from '$lib/core/markdown-editor/extensions/wikilink/completion';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import type { CompletionContext } from '@codemirror/autocomplete';
import type { NoteRecord } from '$lib/features/collection/collection.types';

describe('initializeVault', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		backlinksStore.reset();
		settingsStore.reset();
		searchStore.reset();
	});

	it('loads vault settings before other operations', async () => {
		await initializeVault('/vault');

		expect(loadSettings).toHaveBeenCalledWith('/vault');
	});

	it('starts settings persistence for the opened vault, after its settings are loaded', async () => {
		await initializeVault('/vault');

		expect(startSettingsPersistence).toHaveBeenCalledWith('/vault');
		// Starting before the load would serialize DEFAULT_SETTINGS over the
		// vault's own settings.json on the effect's first run.
		expect(vi.mocked(loadSettings).mock.invocationCallOrder[0])
			.toBeLessThan(vi.mocked(startSettingsPersistence).mock.invocationCallOrder[0]);
	});

	it('stops any running persistence session before loading the next vault settings', async () => {
		// Leading teardown clears the watcher handle, so the init below takes
		// the branch that SKIPS teardownVault: the rapid double-switch window
		// the comment at the top of initializeVault describes.
		teardownVault();
		vi.clearAllMocks();

		await initializeVault('/vault-c');

		// Without this, the previous vault's session is still live when
		// loadSettings puts the new vault's settings in the store, and the
		// restart flush writes them into the previous vault's settings.json.
		expect(stopSettingsPersistence).toHaveBeenCalledTimes(1);
		expect(vi.mocked(stopSettingsPersistence).mock.invocationCallOrder[0])
			.toBeLessThan(vi.mocked(loadSettings).mock.invocationCallOrder[0]);
	});

	it('prepares templates after settings are ready, then runs the post-open side effects', async () => {
		// Leading teardown invalidates any Step 9 timer left pending by an
		// earlier test in this file, so the call counts below are exact.
		teardownVault();
		vi.clearAllMocks();

		await initializeVault('/vault');

		await vi.mocked(loadSettings).mock.results[0].value;
		expect(ensureTemplatesFolder).toHaveBeenCalled();

		// Step 9 defers both post-open side effects by one macrotask so their
		// file IO / network work isn't starved behind the synchronous index
		// builds. Flush the macrotask queue before asserting they ran.
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(autoOpenDailyNote).toHaveBeenCalledTimes(1);
		expect(maybeAutoCheckForUpdates).toHaveBeenCalledTimes(1);
	});

	it('runs the post-open side effects once, for the vault that actually opened', async () => {
		vi.useFakeTimers();
		try {
			teardownVault();
			vi.clearAllMocks();

			// Vault A's init is superseded before its Step 9 timer fires.
			await initializeVault('/vault-a');
			teardownVault();
			await vi.advanceTimersByTimeAsync(100);

			expect(autoOpenDailyNote).not.toHaveBeenCalled();
			expect(maybeAutoCheckForUpdates).not.toHaveBeenCalled();

			// Vault B opens for real - one daily-note open, one update check.
			await initializeVault('/vault-b');
			await vi.advanceTimersByTimeAsync(100);

			expect(autoOpenDailyNote).toHaveBeenCalledTimes(1);
			expect(maybeAutoCheckForUpdates).toHaveBeenCalledTimes(1);
		} finally {
			// Restore even on failure - a leaked fake clock hangs every later
			// test in this file that awaits a real setTimeout.
			vi.useRealTimers();
		}
	});

	it('still rejects when settings fail to load, and skips the post-open side effects', async () => {
		// loadSettings is awaited without a try/catch (so are saveAllDirtyTabs
		// and ensureTemplatesFolder), so its rejection is what the layout's
		// `.catch` + error toast hangs on. Absorbing the init tail must not
		// swallow that rejection.
		teardownVault();
		vi.clearAllMocks();
		vi.mocked(loadSettings).mockRejectedValueOnce(new Error('settings corrupt'));

		await expect(initializeVault('/vault')).rejects.toThrow('settings corrupt');
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(autoOpenDailyNote).not.toHaveBeenCalled();
		expect(maybeAutoCheckForUpdates).not.toHaveBeenCalled();
	});

	it('opens the shared database after settings load', async () => {
		await initializeVault('/vault');

		expect(invoke).toHaveBeenCalledWith('open_vault_db', { vaultPath: '/vault' });
	});

	it('loads user customizations (bookmarks, file icons)', async () => {
		await initializeVault('/vault');

		expect(loadBookmarks).toHaveBeenCalledWith('/vault');
		expect(loadRecentIcons).toHaveBeenCalledWith('/vault');
	});

	it('loads trash manifest during initialization', async () => {
		await initializeVault('/vault');

		expect(loadTrash).toHaveBeenCalledWith('/vault');
	});

	it('continues initialization when user data loading fails (bookmarks/icons)', async () => {
		vi.mocked(loadBookmarks).mockRejectedValueOnce(new Error('db corrupt'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await initializeVault('/vault');
		consoleSpy.mockRestore();

		// Should continue to Step 4+ despite Step 3 failure
		expect(buildIndex).toHaveBeenCalledWith('/vault');
		expect(loadDirectoryTree).toHaveBeenCalledWith('/vault');
		expect(startWatching).toHaveBeenCalledWith('/vault');
	});

	it('populates the file explorer tree', async () => {
		await initializeVault('/vault');

		expect(loadDirectoryTree).toHaveBeenCalledWith('/vault');
	});

	it('indexes vault content for backlinks', async () => {
		await initializeVault('/vault');

		expect(buildIndex).toHaveBeenCalledWith('/vault');
	});

	it('continues initialization when index build or file tree loading fails', async () => {
		vi.mocked(loadDirectoryTree).mockRejectedValueOnce(new Error('scan failed'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await initializeVault('/vault');
		consoleSpy.mockRestore();

		// Should continue to Step 5+ despite Step 4 failure
		expect(ensureTemplatesFolder).toHaveBeenCalled();
		expect(startWatching).toHaveBeenCalledWith('/vault');
	});

	it('builds derived indexes after content indexing completes', async () => {
		await initializeVault('/vault');

		await vi.mocked(buildIndex).mock.results[0].value;
		// Secondary index builders are deferred via setTimeout(…, 0). Flush
		// the macrotask queue before asserting they ran.
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(buildTagIndex).toHaveBeenCalled();
		expect(buildTaskIndex).toHaveBeenCalled();
		expect(buildPropertyIndex).toHaveBeenCalled();
		expect(buildFrontmatterIconIndex).toHaveBeenCalled();
		expect(scanFilesForCalendar).toHaveBeenCalled();
	});

	it('enables file system monitoring for the vault', async () => {
		await initializeVault('/vault');

		expect(startWatching).toHaveBeenCalledWith('/vault');
		expect(onFileChange).toHaveBeenCalledWith(expect.any(Function));
	});

	it('catches and logs startWatching errors instead of unhandled rejection', async () => {
		const watchError = new Error('watch failed');
		vi.mocked(startWatching).mockReturnValueOnce(Promise.reject(watchError));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await initializeVault('/vault');
		// Wait for the rejected promise .catch() to be processed
		await vi.waitFor(() => {
			expect(debugError).toHaveBeenCalledWith(
				'LIFECYCLE',
				'Failed to start file watcher:',
				watchError,
			);
		});

		consoleSpy.mockRestore();
	});

	it('catches and logs buildSearchIndex errors instead of unhandled rejection', async () => {
		const searchError = new Error('FTS5 build failed');
		vi.mocked(buildSearchIndex).mockReturnValueOnce(Promise.reject(searchError));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await initializeVault('/vault');
		await vi.waitFor(() => {
			expect(debugError).toHaveBeenCalledWith(
				'LIFECYCLE',
				'Search index build failed:',
				searchError,
			);
		});

		consoleSpy.mockRestore();
	});
});

describe('initializeVault — file change listener', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		backlinksStore.reset();
		settingsStore.reset();
		searchStore.reset();
	});

	it('rebuilds all indexes when external file change is detected', async () => {
		let capturedCallback: ((paths: string[]) => void) | null = null;
		vi.mocked(onFileChange).mockImplementation((cb) => {
			capturedCallback = cb;
			return vi.fn();
		});

		await initializeVault('/vault');
		expect(capturedCallback).not.toBeNull();

		vi.clearAllMocks();
		capturedCallback!(['/vault/note.md']);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(rebuildIndex).toHaveBeenCalled();
		expect(buildTagIndex).toHaveBeenCalled();
		expect(buildTaskIndex).toHaveBeenCalled();
		expect(buildPropertyIndex).toHaveBeenCalled();
		expect(buildFrontmatterIconIndex).toHaveBeenCalled();
		expect(scanFilesForCalendar).toHaveBeenCalled();
	});

	it('runs the full set of index rebuilders on file change (backlinks + outgoing auto-refresh via vault-index-updated)', async () => {
		let capturedCallback: ((paths: string[]) => void) | null = null;
		vi.mocked(onFileChange).mockImplementation((cb) => {
			capturedCallback = cb;
			return vi.fn();
		});

		await initializeVault('/vault');
		editorStore.addTab({ path: '/vault/note.md', name: 'note.md', content: '', savedContent: '' });

		vi.clearAllMocks();
		capturedCallback!(['/vault/note.md']);
		await new Promise((resolve) => setTimeout(resolve, 0));

		// Backlinks AND outgoing links auto-refresh via vault-index-updated
		// after the watcher's incremental update_note_in_index calls — no
		// explicit call here. Verify the TS-side rebuilders that still run.
		expect(buildTagIndex).toHaveBeenCalled();
	});
});

describe('note-change consumer wiring', () => {
	/** Seeds the real property index with a bare record for `path`. */
	function seed(path: string): void {
		const record: NoteRecord = {
			path, name: 'note.md', basename: 'note', folder: '/vault',
			ext: 'md', mtime: 0, ctime: 0, size: 0, properties: new Map(),
		};
		collectionStore.setPropertyIndex(new Map([[path, record]]));
	}

	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		backlinksStore.reset();
		settingsStore.reset();
		searchStore.reset();
		collectionStore.reset();
		teardownVault();
	});

	it('registers the collection consumer during initializeVault and unregisters it on teardown', async () => {
		// Without this wiring every consumer is a silent no-op in production
		// even though the service-level tests, which register by hand, stay green.
		await initializeVault('/vault');

		seed('/vault/note.md');
		await applyNoteChange({ kind: 'delete', source: 'fs', path: '/vault/note.md' });
		expect(collectionStore.propertyIndex.has('/vault/note.md')).toBe(false);

		teardownVault();

		seed('/vault/note.md');
		await applyNoteChange({ kind: 'delete', source: 'fs', path: '/vault/note.md' });
		expect(collectionStore.propertyIndex.has('/vault/note.md')).toBe(true);
	});

	it('unregisters the superseded init hooks when a second initializeVault overwrites the handles', async () => {
		// Baseline: the registry must already be empty, otherwise a leak from an
		// earlier test would keep this red even against the fixed code.
		seed('/vault/note.md');
		await applyNoteChange({ kind: 'delete', source: 'fs', path: '/vault/note.md' });
		expect(collectionStore.propertyIndex.has('/vault/note.md')).toBe(true);

		// Stall vault A inside Step 3, which is AFTER it registers its consumers
		// and its file-history hook and long before Step 7 assigns
		// `unsubscribeFileChange` - the exact window where the entry teardown is
		// skipped because that handle is still null.
		let releaseA: () => void = () => {};
		vi.mocked(loadBookmarks).mockImplementation((vaultPath: string) =>
			vaultPath === '/vault-a'
				? new Promise<void>((resolve) => { releaseA = resolve; })
				: Promise.resolve(),
		);
		let unsubscribeFileHistoryA: unknown;
		try {
			const initA = initializeVault('/vault-a');
			await new Promise((r) => setTimeout(r, 0));
			// Precondition: A really is parked mid-init, past registration.
			expect(loadBookmarks).toHaveBeenCalledWith('/vault-a');
			expect(startWatching).not.toHaveBeenCalled();
			unsubscribeFileHistoryA = vi.mocked(addAfterSaveObserver).mock.results[0]?.value;
			expect(unsubscribeFileHistoryA).toBeTypeOf('function');

			await initializeVault('/vault-b');
			releaseA();
			await initA;
		} finally {
			// The deferred implementation outlives `vi.clearAllMocks()`, which
			// only drops recorded calls - leaving it in place hangs every later
			// initializeVault('/vault-a').
			vi.mocked(loadBookmarks).mockReset();
		}

		teardownVault();

		// Teardown drained B's handles. A's must have been drained by B's entry,
		// or its consumers stay in the module-level registry for the session and
		// every note change fans out twice.
		seed('/vault/note.md');
		await applyNoteChange({ kind: 'delete', source: 'fs', path: '/vault/note.md' });
		expect(collectionStore.propertyIndex.has('/vault/note.md')).toBe(true);
		expect(unsubscribeFileHistoryA).toHaveBeenCalled();
	});
});

describe('teardownVault', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		backlinksStore.reset();
		settingsStore.reset();
		searchStore.reset();
	});

	it('stops file system monitoring', () => {
		teardownVault();

		expect(stopWatching).toHaveBeenCalled();
	});

	it('closes the shared database', () => {
		teardownVault();

		expect(invoke).toHaveBeenCalledWith('close_vault_db');
	});

	it('clears editor hooks before resetting stores', () => {
		teardownVault();

		expect(resetHooks).toHaveBeenCalled();
	});

	it('resets all core systems to initial state', () => {
		teardownVault();

		expect(resetEditor).toHaveBeenCalled();
		expect(resetFileSystem).toHaveBeenCalled();
		expect(resetSettings).toHaveBeenCalled();
	});

	it('stops settings persistence BEFORE resetting the settings store', () => {
		teardownVault();

		// Order is load-bearing: resetSettings() puts DEFAULT_SETTINGS in the
		// store, and a persistence effect still alive at that point serializes
		// those defaults over the settings of the vault being left.
		expect(stopSettingsPersistence).toHaveBeenCalledTimes(1);
		expect(resetSettings).toHaveBeenCalledTimes(1);
		expect(vi.mocked(stopSettingsPersistence).mock.invocationCallOrder[0])
			.toBeLessThan(vi.mocked(resetSettings).mock.invocationCallOrder[0]);
	});

	it('resets all feature modules to initial state', () => {
		teardownVault();

		expect(resetBacklinks).toHaveBeenCalled();
		expect(resetOutgoingLinks).toHaveBeenCalled();
		expect(resetTags).toHaveBeenCalled();
		expect(resetSearch).toHaveBeenCalled();
		expect(resetBookmarks).toHaveBeenCalled();
		expect(resetFileIcons).toHaveBeenCalled();
		expect(resetTasks).toHaveBeenCalled();
		expect(resetProperties).toHaveBeenCalled();
		expect(resetCollection).toHaveBeenCalled();
	});

	it('resets all plugin modules to initial state', () => {
		teardownVault();

		expect(resetGraphView).toHaveBeenCalled();
		expect(resetTemplates).toHaveBeenCalled();
		expect(resetCalendar).toHaveBeenCalled();
	});

	it('resets UI state (quick switcher, command palette)', () => {
		teardownVault();

		expect(resetQuickSwitcher).toHaveBeenCalled();
		expect(resetCommandPalette).toHaveBeenCalled();
	});

	it('resets trash store to prevent cross-vault data leakage', () => {
		teardownVault();

		expect(resetTrash).toHaveBeenCalled();
	});

	it('clears the view parse cache to prevent cross-vault definition leakage', async () => {
		const VIEW_PATH = '/vault-a/Task.view';
		vi.mocked(readTextFile).mockResolvedValue('source: notes\nviews:\n  - name: all\n');

		await refreshViewDefinition(VIEW_PATH);
		expect(readTextFile).toHaveBeenCalledTimes(1);

		teardownVault();

		// The next vault must re-read from disk, not serve the previous
		// vault's parsed definition for a same-named path.
		await getCachedViewDefinition(VIEW_PATH);
		expect(readTextFile).toHaveBeenCalledTimes(2);
	});

	it('drops the wikilink entries snapshot so the next vault never suggests the old vault aliases', async () => {
		// Cross-vault completion leak: the entries snapshot is keyed on
		// `vaultStore.vaultIndexVersion`, which teardown deliberately never
		// rewinds (monotonicity contract). Without an explicit invalidation
		// the next vault's completion serves the PREVIOUS vault's aliases
		// until its own first `vault-index-updated` lands (~300 ms).
		const restoreInvoke = () => {
			vi.mocked(invoke).mockImplementation((() => Promise.resolve()) as unknown as typeof invoke);
		};
		/** Routes `get_all_vault_entries_v2` to `entries`, everything else to undefined. */
		const routeEntries = (entries: unknown[]) => {
			vi.mocked(invoke).mockImplementation(((command: string) =>
				command === 'get_all_vault_entries_v2'
					? Promise.resolve(entries)
					: Promise.resolve()) as unknown as typeof invoke);
		};
		/** Minimal CompletionContext: the source only reads doc text, pos and explicit. */
		const contextFor = (doc: string) => ({
			state: { doc: { toString: () => doc, length: doc.length, sliceString: () => '' } },
			pos: doc.length,
			explicit: true,
		} as unknown as CompletionContext);

		try {
			vaultStore._reset();
			// A real, already-built index for vault A. Deliberately NOT reset
			// between the two completion calls: rewinding the version would bust
			// the snapshot for the wrong reason and fake a pass.
			vaultStore.bumpVaultIndexVersion(5);
			routeEntries([entryV2('/vault-a/Alpha Note.md', { frontmatter: { aliases: ['Alphaxyz'] } })]);

			const inVaultA = await wikilinkCompletionSource(contextFor('[[Alphax'));
			expect(inVaultA?.options.map((o) => o.displayLabel)).toContain('Alphaxyz');

			// Vault B's snapshot is what the IPC would return from here on.
			routeEntries([entryV2('/vault-b/Other.md', { frontmatter: { aliases: ['Zetaqqq'] } })]);

			teardownVault();

			const inVaultB = await wikilinkCompletionSource(contextFor('[[Zetaq'));
			const labels = (inVaultB?.options ?? []).map((o) => o.displayLabel);
			expect(labels).toContain('Zetaqqq');
			expect(labels).not.toContain('Alphaxyz');
		} finally {
			restoreInvoke();
		}
	});

	it('clears index readiness so the next vault shows the indexing state', async () => {
		// Simulate the first vault's index having been built.
		vaultStore._reset();
		vaultStore.bumpVaultIndexVersion(7);
		expect(vaultStore.indexReady).toBe(true);

		teardownVault();

		// Readiness resets, but the counter itself is never rewound —
		// wikilink completion.ts caches by version and depends on monotonicity.
		expect(vaultStore.indexReady).toBe(false);
		expect(vaultStore.vaultIndexVersion).toBe(7);

		// A stale vault-index-updated from the torn-down vault (the debounced
		// listener survives teardown) must NOT clear the placeholder early.
		vaultStore.bumpVaultIndexVersion(8);
		expect(vaultStore.indexReady).toBe(false);

		// Readiness returns only when the NEXT vault's index build completes.
		await initializeVault('/vault-b');
		expect(vaultStore.indexReady).toBe(true);
	});

	it('initializeVault clears readiness at entry even when the internal teardown is skipped', () => {
		// Double-switch window: unsubscribeFileChange is null (teardown already
		// ran), so initializeVault skips its internal teardown — readiness from
		// the previous init must still be cleared before the new vault loads.
		teardownVault();
		vaultStore.markIndexReady();
		expect(vaultStore.indexReady).toBe(true);

		// Hold init at step 1 so only the synchronous entry code runs.
		vi.mocked(loadSettings).mockImplementationOnce(() => new Promise(() => {}));
		void initializeVault('/vault-c');

		expect(vaultStore.indexReady).toBe(false);

		// Abandon the hanging init so it can never complete in later tests.
		teardownVault();
	});

	it('resets todoist store to prevent cross-vault data leakage', () => {
		todoistStore.setProjects([{ id: '1', name: 'Old Vault Project' }] as any);
		expect(todoistStore.projects.length).toBe(1);

		teardownVault();

		expect(todoistStore.projects).toEqual([]);
	});

	it('resets lifecycle filter store to prevent stale archived paths', () => {
		lifecycleFilterStore.setArchivedPaths(new Set(['/old-vault/archived.md']));
		expect(lifecycleFilterStore.archivedPaths.size).toBe(1);

		teardownVault();

		expect(lifecycleFilterStore.archivedPaths.size).toBe(0);
	});

	it('resets type definitions store to prevent stale sidebar data', () => {
		typeDefinitionsStore.setEntries([{ path: '/old-vault/note.md' }] as any);
		expect(typeDefinitionsStore.entries.length).toBe(1);

		teardownVault();

		expect(typeDefinitionsStore.entries).toEqual([]);
	});

	it('cancels deferred secondary builders when vault is torn down before they fire', async () => {
		vi.useFakeTimers();

		await initializeVault('/vault');

		// Secondary builders are deferred via setTimeout(…, 0). Clear their
		// call counts before teardown so we can verify they don't fire after.
		vi.mocked(buildTagIndex).mockClear();
		vi.mocked(buildTaskIndex).mockClear();
		vi.mocked(buildPropertyIndex).mockClear();
		vi.mocked(scanFilesForCalendar).mockClear();

		teardownVault();

		// Advance past the setTimeout(…, 0) — the builders should NOT fire
		// because teardownVault should have cancelled or guarded them.
		await vi.advanceTimersByTimeAsync(100);

		expect(buildTagIndex).not.toHaveBeenCalled();
		expect(buildTaskIndex).not.toHaveBeenCalled();
		expect(buildPropertyIndex).not.toHaveBeenCalled();
		expect(scanFilesForCalendar).not.toHaveBeenCalled();
		vi.useRealTimers();
	});

	it('logs error when close_vault_db fails instead of silently swallowing', async () => {
		const dbError = new Error('database locked');
		vi.mocked(invoke).mockImplementation((cmd: string) => {
			if (cmd === 'close_vault_db') return Promise.reject(dbError);
			return Promise.resolve();
		});
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		teardownVault();

		// Wait for the rejected promise to be caught
		await vi.waitFor(() => {
			expect(debugError).toHaveBeenCalledWith(
				'LIFECYCLE',
				'Failed to close vault database:',
				dbError,
			);
		});
		consoleSpy.mockRestore();
		// Reset invoke to default so it doesn't leak to subsequent tests
		vi.mocked(invoke).mockImplementation(() => Promise.resolve() as Promise<any>);
	});

	it('shuts down the semantic engine (releases model, clears cross-vault search cache)', () => {
		// Without this, the process-static SEARCH_CACHE in Rust survives a vault
		// switch and search_semantic serves the PREVIOUS vault's chunks.
		teardownVault();

		expect(invoke).toHaveBeenCalledWith('shutdown_semantic');
	});

	it('logs error when shutdown_semantic fails and still completes teardown', async () => {
		const semErr = new Error('semantic busy');
		vi.mocked(invoke).mockImplementation((cmd: string) => {
			if (cmd === 'shutdown_semantic') return Promise.reject(semErr);
			return Promise.resolve();
		});

		teardownVault();

		// Teardown must not abort: stores are still reset.
		expect(resetEditor).toHaveBeenCalled();
		await vi.waitFor(() => {
			expect(debugError).toHaveBeenCalledWith(
				'LIFECYCLE',
				'Failed to shut down semantic engine:',
				semErr,
			);
		});
		vi.mocked(invoke).mockImplementation(() => Promise.resolve() as Promise<any>);
	});
});

describe('initializeVault — semantic search startup', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		editorStore.reset();
		backlinksStore.reset();
		settingsStore.reset();
		searchStore.reset();
		settingsStore.updateSearch({ semanticSearchEnabled: false });
		searchStore.setModelAvailable(false);
	});

	it('skips semantic search entirely when disabled in settings', async () => {
		settingsStore.updateSearch({ semanticSearchEnabled: false });

		await initializeVault('/vault');

		expect(initSemanticSearch).not.toHaveBeenCalled();
		expect(startSemanticProgressListener).not.toHaveBeenCalled();
	});

	it('initializes and builds index when model is available', async () => {
		vi.useFakeTimers();
		settingsStore.updateSearch({ semanticSearchEnabled: true });
		// Simulate initSemanticSearch setting model as available
		vi.mocked(initSemanticSearch).mockImplementation(async () => {
			searchStore.setModelAvailable(true);
		});

		await initializeVault('/vault');
		// Semantic init is deferred — advance past the timer and let the chain flush
		await vi.advanceTimersByTimeAsync(3000);
		await vi.mocked(initSemanticSearch).mock.results[0].value;
		vi.useRealTimers();

		expect(startSemanticProgressListener).toHaveBeenCalled();
		expect(initSemanticSearch).toHaveBeenCalled();
		expect(buildSemanticIndex).toHaveBeenCalled();
		expect(toast.warning).not.toHaveBeenCalled();
	});

	it('disables semantic search and shows toast when model is missing', async () => {
		vi.useFakeTimers();
		settingsStore.updateSearch({ semanticSearchEnabled: true });
		// initSemanticSearch resolves but model stays unavailable
		vi.mocked(initSemanticSearch).mockImplementation(async () => {
			searchStore.setModelAvailable(false);
		});

		await initializeVault('/vault');
		await vi.advanceTimersByTimeAsync(3000);
		await vi.mocked(initSemanticSearch).mock.results[0].value;
		vi.useRealTimers();

		expect(settingsStore.search.semanticSearchEnabled).toBe(false);
		// No explicit save here any more: the persistence owner started for this
		// vault picks the mutation up, so the flag reaches /vault/settings.json.
		expect(startSettingsPersistence).toHaveBeenCalledWith('/vault');
		expect(stopSemanticProgressListener).toHaveBeenCalled();
		expect(toast.warning).toHaveBeenCalledWith(
			'Semantic search model not found. Re-enable in Settings to download.'
		);
		expect(buildSemanticIndex).not.toHaveBeenCalled();
	});

	it('does not auto-download the model on startup', async () => {
		vi.useFakeTimers();
		settingsStore.updateSearch({ semanticSearchEnabled: true });
		vi.mocked(initSemanticSearch).mockImplementation(async () => {
			searchStore.setModelAvailable(false);
		});

		await initializeVault('/vault');
		await vi.advanceTimersByTimeAsync(3000);
		await vi.mocked(initSemanticSearch).mock.results[0].value;
		vi.useRealTimers();

		expect(invoke).not.toHaveBeenCalledWith('download_semantic_model', expect.anything());
	});
});

describe('state transitions: teardown → reinitialize', () => {
	beforeEach(() => {
		teardownVault(); // Reset module-level state (unsubscribeFileChange, etc.)
		vi.clearAllMocks();
		editorStore.reset();
		backlinksStore.reset();
		settingsStore.reset();
		searchStore.reset();
	});

	it('fully reinitializes after teardown with a different vault', async () => {
		// Initialize vault A
		await initializeVault('/vault-a');

		expect(loadSettings).toHaveBeenCalledWith('/vault-a');
		expect(buildIndex).toHaveBeenCalledWith('/vault-a');
		expect(startWatching).toHaveBeenCalledWith('/vault-a');

		// Teardown vault A
		teardownVault();

		expect(stopWatching).toHaveBeenCalled();
		expect(resetEditor).toHaveBeenCalled();
		expect(resetBacklinks).toHaveBeenCalled();

		vi.clearAllMocks();

		// Initialize vault B — all operations should target the new path
		await initializeVault('/vault-b');

		expect(loadSettings).toHaveBeenCalledWith('/vault-b');
		expect(buildIndex).toHaveBeenCalledWith('/vault-b');
		expect(loadDirectoryTree).toHaveBeenCalledWith('/vault-b');
		expect(startWatching).toHaveBeenCalledWith('/vault-b');
		expect(loadBookmarks).toHaveBeenCalledWith('/vault-b');
		expect(loadRecentIcons).toHaveBeenCalledWith('/vault-b');

		// Vault A path should not appear in any calls after reinit
		expect(loadSettings).not.toHaveBeenCalledWith('/vault-a');
		expect(buildIndex).not.toHaveBeenCalledWith('/vault-a');
	});

	it('discards stale initialization when vault is switched rapidly', async () => {
		// Simulate slow loadSettings for vault A
		let resolveA: () => void;
		const slowSettingsA = new Promise<void>((r) => { resolveA = r; });
		vi.mocked(loadSettings).mockReturnValueOnce(slowSettingsA);

		const initA = initializeVault('/vault-a');

		// Before vault A finishes, start vault B
		await initializeVault('/vault-b');

		// Now resolve vault A's settings — its continuation should be discarded
		resolveA!();
		await initA;

		// buildIndex should only have been called for vault B, not vault A
		// (vault A's init was superseded by vault B's version counter bump)
		expect(buildIndex).toHaveBeenCalledTimes(1);
		expect(buildIndex).toHaveBeenCalledWith('/vault-b');
	});

	it('saves all dirty tabs before tearing down previous vault on switch', async () => {
		// Initialize vault A
		await initializeVault('/vault-a');
		vi.clearAllMocks();

		// Track call order to verify saveAllDirtyTabs runs before resetEditor
		const callOrder: string[] = [];
		vi.mocked(saveAllDirtyTabs).mockImplementation(async () => {
			callOrder.push('saveAllDirtyTabs');
			return [];
		});
		vi.mocked(resetEditor).mockImplementation(() => {
			callOrder.push('resetEditor');
		});

		// Switch directly to vault B — should save dirty tabs before teardown
		await initializeVault('/vault-b');

		expect(saveAllDirtyTabs).toHaveBeenCalled();
		expect(callOrder.indexOf('saveAllDirtyTabs')).toBeLessThan(
			callOrder.indexOf('resetEditor'),
		);
	});

	it('tears down previous vault automatically when switching without explicit teardown', async () => {
		// Initialize vault A
		await initializeVault('/vault-a');
		expect(startWatching).toHaveBeenCalledWith('/vault-a');

		vi.clearAllMocks();

		// Directly initialize vault B (no manual teardown) — simulates the
		// $effect in +layout.svelte when vaultStore.path changes A → B
		await initializeVault('/vault-b');

		// Teardown should have been called automatically for vault A
		expect(stopWatching).toHaveBeenCalled();
		expect(resetEditor).toHaveBeenCalled();
		expect(resetBacklinks).toHaveBeenCalled();

		// Vault B should be fully initialized
		expect(loadSettings).toHaveBeenCalledWith('/vault-b');
		expect(buildIndex).toHaveBeenCalledWith('/vault-b');
		expect(startWatching).toHaveBeenCalledWith('/vault-b');
	});

	it('saves the index cache under the torn-down vault path, not the newly opened one', async () => {
		// Real switch ordering: vaultStore.open(B) mutates the store first, and
		// only then does the layout $effect call initializeVault(B), whose
		// internal teardown runs while the Rust index still holds vault A.
		vaultStore._reset();
		vaultStore.open('/vault-a');
		await initializeVault('/vault-a');

		vi.clearAllMocks();

		vaultStore.open('/vault-b');
		await initializeVault('/vault-b');

		expect(invoke).toHaveBeenCalledWith('save_vault_cache', { path: '/vault-a' });
		expect(invoke).not.toHaveBeenCalledWith('save_vault_cache', { path: '/vault-b' });
	});

	it('does not tear down when no vault was previously initialized', async () => {
		// First initialization — no prior vault, so no teardown
		await initializeVault('/vault-a');

		// resetEditor is called by teardownVault; it should NOT have been
		// called before the first initialization
		expect(resetEditor).not.toHaveBeenCalled();
		expect(stopWatching).not.toHaveBeenCalled();
		expect(saveAllDirtyTabs).not.toHaveBeenCalled();
	});
});
