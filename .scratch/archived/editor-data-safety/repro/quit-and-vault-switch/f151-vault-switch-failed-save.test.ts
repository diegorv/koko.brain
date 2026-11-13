/**
 * Audit repro F151: a vault switch with a dirty tab whose save keeps failing.
 * Real editor service + store, real switchVault, real initializeVault teardown.
 * Only Tauri APIs and side-effect services are mocked (mock set copied from
 * app-lifecycle.service.test.ts, minus the editor service / hooks / debounce).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/plugin-fs', () => ({
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	exists: vi.fn(() => Promise.resolve(true)),
	mkdir: vi.fn(),
	readDir: vi.fn(() => Promise.resolve([])),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	open: vi.fn(),
	// The user answers "No, do not discard" to any discard prompt.
	ask: vi.fn(() => Promise.resolve(false)),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve()),
}));



vi.mock('#lib/core/filesystem/fs.service.js', () => ({
	resetFileSystem: vi.fn(),
	loadDirectoryTree: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/core/filesystem/fs.watcher.js', () => ({
	startWatching: vi.fn(() => Promise.resolve()),
	stopWatching: vi.fn(),
	onFileChange: vi.fn(() => vi.fn()),
}));


vi.mock('#lib/utils/debug.js', () => ({
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
	perfBaseline: vi.fn(),
}));

vi.mock('#lib/features/backlinks/backlinks.service.js', () => ({
	buildIndex: vi.fn(() => Promise.resolve(true)),
	rebuildIndex: vi.fn(() => Promise.resolve()),
	resetBacklinks: vi.fn(),
}));

// The register function is kept REAL: the wiring probe below asserts that
// initializeVault actually connects the collection index to the note-change
// owner, and that teardownVault disconnects it again.
vi.mock('#lib/features/collection/collection.service.js', async (importOriginal) => ({
	...(await importOriginal<typeof import('#lib/features/collection/collection.service.js')>()),
	buildPropertyIndex: vi.fn(),
	resetCollection: vi.fn(),
}));

vi.mock('#lib/features/outgoing-links/outgoing-links.service.js', () => ({
	resetOutgoingLinks: vi.fn(),
}));

vi.mock('#lib/features/tags/tags.service.js', () => ({
	buildTagIndex: vi.fn(),
	resetTags: vi.fn(),
}));

vi.mock('#lib/features/search/search.service.js', () => ({
	resetSearch: vi.fn(),
	buildSearchIndex: vi.fn(() => Promise.resolve()),
	registerSearchIndexHook: vi.fn(() => vi.fn()),
	initSemanticSearch: vi.fn(() => Promise.resolve()),
	buildSemanticIndex: vi.fn(() => Promise.resolve()),
	startSemanticProgressListener: vi.fn(() => Promise.resolve()),
	stopSemanticProgressListener: vi.fn(),
}));

vi.mock('#lib/core/settings/settings.service.js', () => ({
	loadSettings: vi.fn(() => Promise.resolve()),
	resetSettings: vi.fn(),
}));

vi.mock('#lib/core/settings/sentry.service.js', () => ({
	configureSentry: vi.fn(() => Promise.resolve('disabled')),
	disableSentry: vi.fn(() => Promise.resolve('disabled')),
}));

// The persistence owner runs a Svelte `$effect.root`; its real behaviour is
// covered in settings-persistence.test.ts (jsdom). Here only the lifecycle
// wiring matters, so the module is a spy.
vi.mock('#lib/core/settings/settings-persistence.svelte.js', () => ({
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

vi.mock('#lib/features/properties/properties.service.js', () => ({
	resetProperties: vi.fn(),
}));

vi.mock('#lib/plugins/graph-view/graph-view.service.js', () => ({
	resetGraphView: vi.fn(),
}));

vi.mock('#lib/plugins/templates/templates.service.js', () => ({
	resetTemplates: vi.fn(),
	ensureTemplatesFolder: vi.fn(),
}));

vi.mock('#lib/features/properties/bookmark-migration.service.js', () => ({
	migrateBookmarksToFavorites: vi.fn(),
}));

vi.mock('#lib/features/file-icons/file-icons.service.js', () => ({
	loadRecentIcons: vi.fn(),
	// Phase 11.5g: buildFrontmatterIconIndex is async (awaits Rust IPC).
	// Mock with a resolved promise so the `.catch()` chain in the
	// app-lifecycle caller doesn't blow up.
	buildFrontmatterIconIndex: vi.fn().mockResolvedValue(undefined),
	registerFileIconsNoteChangeConsumer: vi.fn(() => vi.fn()),
	resetFileIcons: vi.fn(),
}));

vi.mock('#lib/plugins/calendar/calendar.service.js', () => ({
	resetCalendar: vi.fn(),
}));

/** Unregister handle returned by the mocked Calendar path-change registration. */
const unregisterEventCalendarPathChange = vi.hoisted(() => vi.fn());

/** Unregister handle returned by the mocked Files navigator path-change registration. */
const unregisterFilesNavigatorPathChange = vi.hoisted(() => vi.fn());

vi.mock('#lib/features/rail-shell/files-navigator.service.js', () => ({
	registerFilesNavigatorPathChangeConsumer: vi.fn(() => unregisterFilesNavigatorPathChange),
}));

/** Unregister handle returned by the mocked Neighbourhood path-change registration. */
const unregisterNeighbourhoodPathChange = vi.hoisted(() => vi.fn());

vi.mock('#lib/features/rail-shell/neighbourhood.service.js', () => ({
	registerNeighbourhoodPathChangeConsumer: vi.fn(() => unregisterNeighbourhoodPathChange),
}));

vi.mock('#lib/features/event-calendar/event-calendar.service.js', () => ({
	registerEventCalendarPathChangeConsumer: vi.fn(() => unregisterEventCalendarPathChange),
	resetEventCalendar: vi.fn(),
	drainEventCalendarWrites: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/features/tasks/tasks.service.js', () => ({
	buildTaskIndex: vi.fn(),
	resetTasks: vi.fn(),
}));

vi.mock('#lib/core/trash/trash.service.js', () => ({
	loadTrash: vi.fn(() => Promise.resolve()),
	resetTrash: vi.fn(),
}));

// The opener registers a stub into the REAL bridge store, so the wiring is
// observable on store state without the note-creator side effects.
vi.mock('#lib/plugins/periodic-notes/periodic-notes.service.js', async () => {
	const { eventCalendarDailyNoteStore } = await import('#lib/features/event-calendar/event-calendar-daily-note.store.svelte.js');
	return {
		autoOpenDailyNote: vi.fn(() => Promise.resolve()),
		registerCalendarDailyNoteOpener: vi.fn(() => eventCalendarDailyNoteStore.register(() => Promise.resolve())),
		resetPeriodicNotes: vi.fn(),
	};
});

vi.mock('#lib/core/settings/update-check.service.js', () => ({
	maybeAutoCheckForUpdates: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/features/quick-switcher/quick-switcher.service.js', () => ({
	resetQuickSwitcher: vi.fn(),
}));

vi.mock('#lib/features/command-palette/command-palette.service.js', () => ({
	resetCommandPalette: vi.fn(),
}));

vi.mock('#lib/features/auto-move/auto-move.service.js', () => ({
	loadAutoMoveConfig: vi.fn(() => Promise.resolve()),
	toggleAutoMoveHook: vi.fn(),
	resetAutoMove: vi.fn(),
}));



import { writeTextFile } from '@tauri-apps/plugin-fs';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { switchVault } from '#lib/core/vault/vault.service.js';
import { initializeVault } from '#lib/app/lifecycle/app-lifecycle.service.js';

const VAULT_A = '/vaults/A';
const VAULT_B = '/vaults/B';
const NOTE = `${VAULT_A}/note.md`;

describe('F151: vault switch with a tab whose save fails', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vaultStore._reset();
		editorStore.reset();
		vi.mocked(writeTextFile).mockRejectedValue(new Error('EACCES: permission denied'));
	});

	it('does not silently drop the unsaved content of a tab that could not be saved', async () => {
		// Vault A is open and initialized (as the +layout.svelte effect does).
		vaultStore.open(VAULT_A);
		await initializeVault(VAULT_A);

		editorStore.addTab({ path: NOTE, name: 'note.md', content: 'old', savedContent: 'old' });
		editorStore.updateContent('typed text that never reached disk');
		expect(editorStore.tabs.map((t) => t.content)).toEqual(['typed text that never reached disk']);

		// Deep link / picker -> switchVault, then the layout effect runs initializeVault(B).
		await switchVault(VAULT_B);
		if (vaultStore.path === VAULT_B) await initializeVault(VAULT_B);

		// Sanity: the switch really happened, every write attempt failed, and no
		// prompt was offered to the user.
		expect(vaultStore.path).toBe(VAULT_B);
		expect(vi.mocked(writeTextFile).mock.calls.filter(([p]) => p === NOTE).length).toBeGreaterThanOrEqual(2);
		const { ask } = await import('@tauri-apps/plugin-dialog');
		expect(ask).not.toHaveBeenCalled();

		// The write failed every time, so the text exists only in memory. The
		// user declined any discard prompt, so it must still be in a tab.
		const survivor = editorStore.tabs.find((t) => t.content === 'typed text that never reached disk');
		expect(survivor, 'unsaved content was wiped from memory with no successful write').toBeDefined();
	});
});
