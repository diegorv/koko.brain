// @vitest-environment jsdom
// Repro for o06 vault-lifecycle-5. Harness copied from
// src/tests/lib/app/lifecycle/app-lifecycle.service.test.ts, with the REAL
// settings.service and settings-persistence modules over an in-memory
// plugin-fs. Asserts the CORRECT behaviour, so it fails while the bug exists.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage } from '../../fixtures/localStorage.fixture';
setupLocalStorage();

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/core/editor/editor.service.js', () => ({
	resetEditor: vi.fn(),
	saveAllDirtyTabs: vi.fn(() => Promise.resolve([])),
	reloadExternallyChangedTabs: vi.fn(() => Promise.resolve()),
}));

vi.mock('#lib/core/editor/editor.hooks.js', () => ({
	resetHooks: vi.fn(),
	addAfterSaveObserver: vi.fn(() => vi.fn()),
	notifyAfterSave: vi.fn(),
	areAllRecentSaves: vi.fn(() => false),
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

vi.mock('#lib/utils/debounce.js', () => ({
	debounce: vi.fn((fn: (...args: any[]) => any) => {
		const debounced = (...args: any[]) => fn(...args);
		debounced.cancel = vi.fn();
		debounced.flush = vi.fn();
		return debounced;
	}),
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



/** In-memory plugin-fs. A read can be gated to model a slow IPC round-trip. */
const fsMock = vi.hoisted(() => ({
	disk: new Map<string, string>(),
	gates: new Map<string, Promise<void>>(),
}));

vi.mock('@tauri-apps/plugin-fs', () => ({
	exists: vi.fn(async (p: string) => fsMock.disk.has(p) || p.endsWith('/.kokobrain')),
	readTextFile: vi.fn(async (p: string) => {
		const gate = fsMock.gates.get(p);
		if (gate) await gate;
		const c = fsMock.disk.get(p);
		if (c === undefined) throw new Error(`ENOENT: ${p}`);
		return c;
	}),
	writeTextFile: vi.fn(async (p: string, c: string) => {
		fsMock.disk.set(p, c);
	}),
	mkdir: vi.fn(async () => {}),
}));

vi.mock('#lib/core/settings/theme.service.js', () => ({
	applyActiveTheme: vi.fn(),
}));

/** Sentry is a side-effect service; its first configure call is held open. */
const sentryGate = vi.hoisted(() => ({ release: null as null | (() => void) }));
vi.mock('#lib/core/settings/sentry.service.js', () => ({
	configureSentry: vi.fn(() => {
		if (sentryGate.release === null) {
			return new Promise((resolve) => {
				sentryGate.release = () => resolve('disabled');
			});
		}
		return Promise.resolve('disabled');
	}),
	disableSentry: vi.fn(() => Promise.resolve('disabled')),
}));

import { initializeVault, teardownVault } from '#lib/app/lifecycle/app-lifecycle.service.js';
import { stopSettingsPersistence } from '#lib/core/settings/settings-persistence.svelte.js';
import { configureSentry } from '#lib/core/settings/sentry.service.js';

const A_FILE = '/vault-a/.kokobrain/settings.json';
const B_FILE = '/vault-b/.kokobrain/settings.json';

/** Lets every pending microtask and zero-delay timer run. */
async function drain(rounds = 20): Promise<void> {
	for (let i = 0; i < rounds; i++) await new Promise((r) => setTimeout(r, 0));
}

describe('o06 initializeVault: a superseded init must not start settings persistence', () => {
	it('does not write vault B settings into vault A when init(B) starts while init(A) awaits configureSentry', async () => {
		fsMock.disk.set(A_FILE, JSON.stringify({ periodicNotes: { folder: 'A-journal' } }));
		fsMock.disk.set(B_FILE, JSON.stringify({ periodicNotes: { folder: 'B-journal' } }));

		const initA = initializeVault('/vault-a');
		await vi.waitFor(() => expect(configureSentry).toHaveBeenCalledTimes(1));

		// A deep link switches to B while A is still in configureSentry. B's
		// settings read is a slower IPC than A's Sentry configure.
		let releaseBRead!: () => void;
		fsMock.gates.set(B_FILE, new Promise<void>((r) => { releaseBRead = r; }));
		const initB = initializeVault('/vault-b');
		sentryGate.release!();
		await drain();
		releaseBRead();

		await Promise.all([initA, initB]);
		await drain();
		await stopSettingsPersistence();

		expect(JSON.parse(fsMock.disk.get(A_FILE)!).periodicNotes.folder).toBe('A-journal');
		teardownVault();
	});
});
