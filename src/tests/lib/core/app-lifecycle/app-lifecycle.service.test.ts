import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve()),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	resetEditor: vi.fn(),
	saveAllDirtyTabs: vi.fn(() => Promise.resolve([])),
}));

vi.mock('$lib/core/editor/editor.hooks', () => ({
	resetHooks: vi.fn(),
	addAfterSaveObserver: vi.fn(() => vi.fn()),
	setFileReadTransform: vi.fn(),
	setFileWriteTransform: vi.fn(),
	notifyAfterSave: vi.fn(),
	areAllRecentSaves: vi.fn(() => false),
	clearRecentSaves: vi.fn(),
	applyReadTransform: vi.fn(() => Promise.resolve(null)),
	applyWriteTransform: vi.fn(() => Promise.resolve(false)),
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
}));

vi.mock('$lib/features/backlinks/backlinks.service', () => ({
	buildIndex: vi.fn(() => Promise.resolve()),
	rebuildIndex: vi.fn(() => Promise.resolve()),
	updateBacklinksForFile: vi.fn(),
	resetBacklinks: vi.fn(),
}));

vi.mock('$lib/features/collection/collection.service', () => ({
	buildPropertyIndex: vi.fn(),
	resetCollection: vi.fn(),
}));

vi.mock('$lib/features/outgoing-links/outgoing-links.service', () => ({
	updateOutgoingLinksForFile: vi.fn(),
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
	saveSettings: vi.fn(() => Promise.resolve()),
	resetSettings: vi.fn(),
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
	loadFileIcons: vi.fn(),
	loadRecentIcons: vi.fn(),
	buildFrontmatterIconIndex: vi.fn(),
	resetFileIcons: vi.fn(),
}));

vi.mock('$lib/plugins/calendar/calendar.service', () => ({
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
	autoOpenDailyNote: vi.fn(),
}));

vi.mock('$lib/plugins/terminal/terminal.service', () => ({
	resetTerminal: vi.fn(),
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

import { invoke } from '@tauri-apps/api/core';
import { error as debugError } from '$lib/utils/debug';
import { resetEditor, saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import { resetHooks } from '$lib/core/editor/editor.hooks';
import { resetFileSystem, loadDirectoryTree } from '$lib/core/filesystem/fs.service';
import { startWatching, stopWatching, onFileChange } from '$lib/core/filesystem/fs.watcher';
import { buildIndex, rebuildIndex, updateBacklinksForFile, resetBacklinks } from '$lib/features/backlinks/backlinks.service';
import { buildPropertyIndex, resetCollection } from '$lib/features/collection/collection.service';
import { updateOutgoingLinksForFile, resetOutgoingLinks } from '$lib/features/outgoing-links/outgoing-links.service';
import { buildTagIndex, resetTags } from '$lib/features/tags/tags.service';
import { resetSearch, buildSearchIndex } from '$lib/features/search/search.service';
import { loadSettings, saveSettings, resetSettings } from '$lib/core/settings/settings.service';
import { resetProperties } from '$lib/features/properties/properties.service';
import { resetGraphView } from '$lib/plugins/graph-view/graph-view.service';
import { resetTemplates, ensureTemplatesFolder } from '$lib/plugins/templates/templates.service';
import { loadBookmarks, resetBookmarks } from '$lib/features/bookmarks/bookmarks.service';
import { loadFileIcons, loadRecentIcons, buildFrontmatterIconIndex, resetFileIcons } from '$lib/features/file-icons/file-icons.service';
import { resetCalendar, scanFilesForCalendar } from '$lib/plugins/calendar/calendar.service';
import { buildTaskIndex, resetTasks } from '$lib/features/tasks/tasks.service';
import { loadTrash, resetTrash } from '$lib/core/trash/trash.service';
import { autoOpenDailyNote } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { resetTerminal } from '$lib/plugins/terminal/terminal.service';
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

	it('opens daily note and prepares templates after settings are ready', async () => {
		await initializeVault('/vault');

		await vi.mocked(loadSettings).mock.results[0].value;
		expect(autoOpenDailyNote).toHaveBeenCalled();
		expect(ensureTemplatesFolder).toHaveBeenCalled();
	});

	it('opens the shared database after settings load', async () => {
		await initializeVault('/vault');

		expect(invoke).toHaveBeenCalledWith('open_vault_db', { vaultPath: '/vault' });
	});

	it('loads user customizations (bookmarks, file icons)', async () => {
		await initializeVault('/vault');

		expect(loadBookmarks).toHaveBeenCalledWith('/vault');
		expect(loadFileIcons).toHaveBeenCalledWith('/vault');
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
		expect(autoOpenDailyNote).toHaveBeenCalled();
		expect(startWatching).toHaveBeenCalledWith('/vault');
	});

	it('builds derived indexes after content indexing completes', async () => {
		await initializeVault('/vault');

		await vi.mocked(buildIndex).mock.results[0].value;

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

	it('refreshes active tab backlinks and outgoing links on file change', async () => {
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

		expect(updateBacklinksForFile).toHaveBeenCalledWith('/vault/note.md');
		expect(updateOutgoingLinksForFile).toHaveBeenCalledWith('/vault/note.md');
	});

	it('skips active tab refresh when no file is open', async () => {
		let capturedCallback: ((paths: string[]) => void) | null = null;
		vi.mocked(onFileChange).mockImplementation((cb) => {
			capturedCallback = cb;
			return vi.fn();
		});
		// editorStore.reset() already called in beforeEach — activeTabPath is null

		await initializeVault('/vault');

		vi.clearAllMocks();
		capturedCallback!(['/vault/note.md']);
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(updateBacklinksForFile).not.toHaveBeenCalled();
		expect(updateOutgoingLinksForFile).not.toHaveBeenCalled();
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

	it('clears editor hooks (encryption transforms) before resetting stores', () => {
		teardownVault();

		expect(resetHooks).toHaveBeenCalled();
	});

	it('resets all core systems to initial state', () => {
		teardownVault();

		expect(resetEditor).toHaveBeenCalled();
		expect(resetFileSystem).toHaveBeenCalled();
		expect(resetSettings).toHaveBeenCalled();
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
		expect(resetTerminal).toHaveBeenCalled();
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
		settingsStore.updateSearch({ semanticSearchEnabled: true });
		// Simulate initSemanticSearch setting model as available
		vi.mocked(initSemanticSearch).mockImplementation(async () => {
			searchStore.setModelAvailable(true);
		});

		await initializeVault('/vault');
		// Wait for the .then() chain to resolve
		await vi.mocked(initSemanticSearch).mock.results[0].value;

		expect(startSemanticProgressListener).toHaveBeenCalled();
		expect(initSemanticSearch).toHaveBeenCalled();
		expect(buildSemanticIndex).toHaveBeenCalled();
		expect(toast.warning).not.toHaveBeenCalled();
	});

	it('disables semantic search and shows toast when model is missing', async () => {
		settingsStore.updateSearch({ semanticSearchEnabled: true });
		// initSemanticSearch resolves but model stays unavailable
		vi.mocked(initSemanticSearch).mockImplementation(async () => {
			searchStore.setModelAvailable(false);
		});

		await initializeVault('/vault');
		await vi.mocked(initSemanticSearch).mock.results[0].value;

		expect(settingsStore.search.semanticSearchEnabled).toBe(false);
		expect(saveSettings).toHaveBeenCalledWith('/vault');
		expect(stopSemanticProgressListener).toHaveBeenCalled();
		expect(toast.warning).toHaveBeenCalledWith(
			'Semantic search model not found. Re-enable in Settings to download.'
		);
		expect(buildSemanticIndex).not.toHaveBeenCalled();
	});

	it('does not auto-download the model on startup', async () => {
		settingsStore.updateSearch({ semanticSearchEnabled: true });
		vi.mocked(initSemanticSearch).mockImplementation(async () => {
			searchStore.setModelAvailable(false);
		});

		await initializeVault('/vault');
		await vi.mocked(initSemanticSearch).mock.results[0].value;

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
		expect(loadFileIcons).toHaveBeenCalledWith('/vault-b');
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
