import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Mocks ---

const mockUnlistenEvent = vi.fn();
let capturedEventHandler: ((payload: unknown) => void) | undefined;
vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn((_event: string, handler: (payload: unknown) => void) => {
		capturedEventHandler = handler;
		return Promise.resolve(mockUnlistenEvent);
	}),
}));

const mockUnlistenClose = vi.fn();
const mockDestroy = vi.fn();
const mockOnCloseRequested = vi.fn();
let capturedCloseHandler: ((event: { preventDefault: () => void }) => Promise<void>) | undefined;

// Default implementation — captures the handler and resolves with unlisten
mockOnCloseRequested.mockImplementation((handler: (event: { preventDefault: () => void }) => Promise<void>) => {
	capturedCloseHandler = handler;
	return Promise.resolve(mockUnlistenClose);
});

const mockUnlistenFocus = vi.fn();
const mockOnFocusChanged = vi.fn();
let capturedFocusHandler: ((event: { payload: boolean }) => void) | undefined;

mockOnFocusChanged.mockImplementation((handler: (event: { payload: boolean }) => void) => {
	capturedFocusHandler = handler;
	return Promise.resolve(mockUnlistenFocus);
});

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: () => ({
		onCloseRequested: (...args: unknown[]) => mockOnCloseRequested(...args),
		destroy: (...args: unknown[]) => mockDestroy(...args),
		onFocusChanged: (...args: unknown[]) => mockOnFocusChanged(...args),
	}),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(),
}));

// Default resolves to an empty entries snapshot so the fan-out inside
// registerVaultIndexUpdatedListener never chains `.then` off undefined.
vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn().mockResolvedValue([]),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	saveAllDirtyTabs: vi.fn(),
}));

// loadDirectoryTree is a side-effect service (scan_vault IPC + fsStore tree
// write) — mocked per docs/TESTING.md allowlist.
vi.mock('$lib/core/filesystem/fs.service', () => ({
	loadDirectoryTree: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/plugins/periodic-notes/periodic-notes.service', () => ({
	refreshDailyNoteIfDateChanged: vi.fn().mockResolvedValue(undefined),
}));

// settingsPanelStore is a real store per CLAUDE.md — not mocked. Tests reset it
// via _reset() and assert real isOpen state.

// vault.store.svelte uses localStorage on module load — provide a minimal stub
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
		removeItem: vi.fn((key: string) => { delete store[key]; }),
		clear: vi.fn(() => { store = {}; }),
	};
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// --- Imports (after mocks) ---

import { listen } from '@tauri-apps/api/event';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';
import { saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import { loadDirectoryTree } from '$lib/core/filesystem/fs.service';
import { refreshDailyNoteIfDateChanged } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsPanelStore } from '$lib/core/settings/settings-panel.store.svelte';
import { fsStore } from '$lib/core/filesystem/fs.store.svelte';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import { lifecycleFilterStore } from '$lib/features/properties/lifecycle-filter.store.svelte';
import { registerMenuSettingsListener, registerCloseHandler, registerFocusListener, registerVaultIndexUpdatedListener } from '$lib/core/layout/tauri-listeners.service';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

// --- Tests ---

describe('registerMenuSettingsListener', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedEventHandler = undefined;
		vaultStore._reset();
		settingsPanelStore._reset();
	});

	it('listens for the menu:settings event', async () => {
		registerMenuSettingsListener();

		// Wait for the listen promise to resolve
		await vi.waitFor(() => expect(listen).toHaveBeenCalledTimes(1));
		expect(listen).toHaveBeenCalledWith('menu:settings', expect.any(Function));
	});

	it('toggles the real settings panel open when the event fires', async () => {
		registerMenuSettingsListener();
		await vi.waitFor(() => expect(capturedEventHandler).toBeDefined());

		expect(settingsPanelStore.isOpen).toBe(false);
		capturedEventHandler!(undefined);
		// Real store state flips, not just a spy call count.
		expect(settingsPanelStore.isOpen).toBe(true);
	});

	it('returns a cleanup function that unsubscribes', async () => {
		const cleanup = registerMenuSettingsListener();
		await vi.waitFor(() => expect(mockUnlistenEvent).not.toHaveBeenCalled());

		cleanup();
		expect(mockUnlistenEvent).toHaveBeenCalledTimes(1);
	});

	it('cleanup cancels subscription if called before listen resolves', () => {
		// Make listen hang (never resolve) to test the cancelled flag
		let resolveListen: ((fn: () => void) => void) | undefined;
		vi.mocked(listen).mockImplementationOnce(() =>
			new Promise((resolve) => { resolveListen = resolve; }),
		);

		const cleanup = registerMenuSettingsListener();
		// Call cleanup BEFORE listen resolves
		cleanup();

		// Now resolve listen — the unlisten should be called immediately
		const unlistenFn = vi.fn();
		resolveListen!(unlistenFn);

		// Use waitFor since the .then() callback runs asynchronously
		return vi.waitFor(() => expect(unlistenFn).toHaveBeenCalledTimes(1));
	});

	it('logs via the project logger when registration fails', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(listen).mockRejectedValueOnce(new Error('listen failed'));

		registerMenuSettingsListener();

		await vi.waitFor(() =>
			expect(consoleErrorSpy).toHaveBeenCalledWith(
				expect.stringContaining('LISTENERS'),
				'Failed to listen for menu:settings:',
				expect.any(Error),
			),
		);
		consoleErrorSpy.mockRestore();
	});
});

describe('registerCloseHandler', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedCloseHandler = undefined;
	});

	it('registers an onCloseRequested handler', async () => {
		registerCloseHandler();

		await vi.waitFor(() => expect(capturedCloseHandler).toBeDefined());
	});

	it('saves all dirty tabs before destroying the window', async () => {
		vi.mocked(saveAllDirtyTabs).mockResolvedValue([]);

		registerCloseHandler();
		await vi.waitFor(() => expect(capturedCloseHandler).toBeDefined());

		const preventDefault = vi.fn();
		await capturedCloseHandler!({ preventDefault });

		expect(preventDefault).toHaveBeenCalledTimes(1);
		expect(saveAllDirtyTabs).toHaveBeenCalledTimes(1);
		expect(mockDestroy).toHaveBeenCalledTimes(1);
	});

	it('destroys the window when all saves succeed', async () => {
		vi.mocked(saveAllDirtyTabs).mockResolvedValue([]);

		registerCloseHandler();
		await vi.waitFor(() => expect(capturedCloseHandler).toBeDefined());

		await capturedCloseHandler!({ preventDefault: vi.fn() });

		// No dialog shown
		expect(ask).not.toHaveBeenCalled();
		expect(mockDestroy).toHaveBeenCalledTimes(1);
	});

	it('shows confirmation dialog when saves fail', async () => {
		vi.mocked(saveAllDirtyTabs).mockResolvedValue(['/vault/note.md']);
		vi.mocked(ask).mockResolvedValue(true);

		registerCloseHandler();
		await vi.waitFor(() => expect(capturedCloseHandler).toBeDefined());

		await capturedCloseHandler!({ preventDefault: vi.fn() });

		expect(ask).toHaveBeenCalledTimes(1);
		expect(ask).toHaveBeenCalledWith(
			expect.stringContaining('note.md'),
			expect.objectContaining({ kind: 'warning' }),
		);
	});

	it('destroys the window when user confirms discard', async () => {
		vi.mocked(saveAllDirtyTabs).mockResolvedValue(['/vault/note.md']);
		vi.mocked(ask).mockResolvedValue(true);

		registerCloseHandler();
		await vi.waitFor(() => expect(capturedCloseHandler).toBeDefined());

		await capturedCloseHandler!({ preventDefault: vi.fn() });

		expect(mockDestroy).toHaveBeenCalledTimes(1);
	});

	it('does NOT destroy the window when user cancels discard', async () => {
		vi.mocked(saveAllDirtyTabs).mockResolvedValue(['/vault/note.md']);
		vi.mocked(ask).mockResolvedValue(false);

		registerCloseHandler();
		await vi.waitFor(() => expect(capturedCloseHandler).toBeDefined());

		await capturedCloseHandler!({ preventDefault: vi.fn() });

		expect(mockDestroy).not.toHaveBeenCalled();
	});

	it('includes all failed file names in the dialog message', async () => {
		vi.mocked(saveAllDirtyTabs).mockResolvedValue([
			'/vault/note-a.md',
			'/vault/folder/note-b.md',
		]);
		vi.mocked(ask).mockResolvedValue(false);

		registerCloseHandler();
		await vi.waitFor(() => expect(capturedCloseHandler).toBeDefined());

		await capturedCloseHandler!({ preventDefault: vi.fn() });

		const message = vi.mocked(ask).mock.calls[0][0] as string;
		expect(message).toContain('note-a.md');
		expect(message).toContain('note-b.md');
	});

	it('returns a cleanup function that unsubscribes', async () => {
		const cleanup = registerCloseHandler();
		await vi.waitFor(() => expect(mockUnlistenClose).not.toHaveBeenCalled());

		cleanup();
		expect(mockUnlistenClose).toHaveBeenCalledTimes(1);
	});

	it('cleanup cancels subscription if called before onCloseRequested resolves', () => {
		let resolveClose: ((fn: () => void) => void) | undefined;
		mockOnCloseRequested.mockImplementationOnce(() =>
			new Promise((resolve) => { resolveClose = resolve; }),
		);

		const cleanup = registerCloseHandler();
		cleanup();

		const unlistenFn = vi.fn();
		resolveClose!(unlistenFn);

		return vi.waitFor(() => expect(unlistenFn).toHaveBeenCalledTimes(1));
	});
});

describe('registerVaultIndexUpdatedListener', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedEventHandler = undefined;
		vaultStore._reset();
		vi.mocked(invoke).mockResolvedValue([]);
	});

	it('listens for the vault-index-updated event', async () => {
		registerVaultIndexUpdatedListener();

		await vi.waitFor(() => expect(listen).toHaveBeenCalledTimes(1));
		expect(listen).toHaveBeenCalledWith('vault-index-updated', expect.any(Function));
	});

	it('bumps vaultIndexVersion only after the 300ms debounce window', async () => {
		vi.useFakeTimers();
		try {
			registerVaultIndexUpdatedListener();
			expect(capturedEventHandler).toBeDefined();

			capturedEventHandler!({ payload: { changed: true, affected: ['/vault/a.md'], version: 3 } });
			// No synchronous bump — the handler coalesces bursts behind a debounce.
			expect(vaultStore.vaultIndexVersion).toBe(0);

			await vi.advanceTimersByTimeAsync(300);
			expect(vaultStore.vaultIndexVersion).toBe(3);
		} finally {
			vi.useRealTimers();
		}
	});

	it('coalesces a burst of events into a single bump carrying the last version', async () => {
		vi.useFakeTimers();
		try {
			registerVaultIndexUpdatedListener();
			expect(capturedEventHandler).toBeDefined();

			capturedEventHandler!({ payload: { changed: true, affected: [], version: 1 } });
			await vi.advanceTimersByTimeAsync(100);
			capturedEventHandler!({ payload: { changed: false, affected: [], version: 2 } });
			await vi.advanceTimersByTimeAsync(100);
			capturedEventHandler!({ payload: { changed: true, affected: ['/x'], version: 5 } });

			// Each event re-arms the trailing debounce; nothing fired yet.
			expect(vaultStore.vaultIndexVersion).toBe(0);
			await vi.advanceTimersByTimeAsync(300);
			expect(vaultStore.vaultIndexVersion).toBe(5);
		} finally {
			vi.useRealTimers();
		}
	});

	it('returns a cleanup function that unsubscribes', async () => {
		const cleanup = registerVaultIndexUpdatedListener();
		await vi.waitFor(() => expect(mockUnlistenEvent).not.toHaveBeenCalled());

		cleanup();
		expect(mockUnlistenEvent).toHaveBeenCalledTimes(1);
	});

	it('cleanup cancels subscription if called before listen resolves', () => {
		let resolveListen: ((fn: () => void) => void) | undefined;
		vi.mocked(listen).mockImplementationOnce(() =>
			new Promise((resolve) => { resolveListen = resolve; }),
		);

		const cleanup = registerVaultIndexUpdatedListener();
		cleanup();

		const unlistenFn = vi.fn();
		resolveListen!(unlistenFn);

		return vi.waitFor(() => expect(unlistenFn).toHaveBeenCalledTimes(1));
	});
});

describe('registerVaultIndexUpdatedListener — entries fan-out', () => {
	/** Runs the 300ms trailing debounce and settles the invoke `.then` chain. */
	const settleFanOut = async () => {
		await vi.advanceTimersByTimeAsync(300);
		await vi.advanceTimersByTimeAsync(0);
	};

	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
		capturedEventHandler = undefined;
		vaultStore._reset();
		fsStore.reset();
		typeDefinitionsStore.reset();
		lifecycleFilterStore.reset();
		vi.mocked(invoke).mockResolvedValue([]);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	function fireEvent(version: number) {
		// The listen mock captures the handler synchronously at registration.
		expect(capturedEventHandler).toBeDefined();
		capturedEventHandler!({ payload: { changed: true, affected: [], version } });
	}

	it('fetches the full entries snapshot and fans out to the real stores', async () => {
		const entries = [
			entryV2('/vault/archived.md', { archived: true }),
			entryV2('/vault/Project.md', { isA: 'Type', frontmatter: { _icon: 'rocket' } }),
			entryV2('/vault/notes/notes.md', { frontmatter: { _order: 2 } }),
		];
		vi.mocked(invoke).mockResolvedValue(entries);

		registerVaultIndexUpdatedListener();
		fireEvent(1);
		await settleFanOut();
		expect(typeDefinitionsStore.entriesVersion).toBe(1);

		expect(invoke).toHaveBeenCalledWith('get_all_vault_entries_v2');
		// refreshArchivedPaths → real lifecycleFilterStore
		expect(lifecycleFilterStore.isArchived('/vault/archived.md')).toBe(true);
		expect(lifecycleFilterStore.isArchived('/vault/Project.md')).toBe(false);
		expect(lifecycleFilterStore.archivedCount).toBe(1);
		// refreshTypeDefinitions → real typeDefinitionsStore metadata map
		expect(typeDefinitionsStore.getTypeMetadata('Project')?.icon).toBe('rocket');
		expect(typeDefinitionsStore.sortedTypes.map((t) => t.name)).toEqual(['Project']);
		// setEntries → snapshot stored for sidebar consumption
		expect(typeDefinitionsStore.entries).toEqual(entries);
		// buildContentOrderMap → fsStore.contentOrder (folder note indexed under dir too)
		expect(fsStore.contentOrder.get('/vault/notes/notes.md')).toBe(2);
		expect(fsStore.contentOrder.get('/vault/notes')).toBe(2);
	});

	it('reloads the directory tree when the content order changed and a vault is open', async () => {
		vaultStore.open('/vault');
		vi.mocked(invoke).mockResolvedValue([
			entryV2('/vault/pinned.md', { frontmatter: { _order: 1 } }),
		]);

		registerVaultIndexUpdatedListener();
		fireEvent(1);
		await settleFanOut();
		expect(typeDefinitionsStore.entriesVersion).toBe(1);

		// Order map went from empty to one entry → tree reload with vault path.
		expect(fsStore.contentOrder.get('/vault/pinned.md')).toBe(1);
		expect(loadDirectoryTree).toHaveBeenCalledWith('/vault');
	});

	it('does not reload the tree when the content order is unchanged', async () => {
		vaultStore.open('/vault');
		// Pre-seed the store with the exact map the entries produce.
		fsStore.setContentOrder(new Map([['/vault/pinned.md', 1]]));
		vi.mocked(invoke).mockResolvedValue([
			entryV2('/vault/pinned.md', { frontmatter: { _order: 1 } }),
		]);

		registerVaultIndexUpdatedListener();
		fireEvent(1);
		await settleFanOut();
		expect(typeDefinitionsStore.entriesVersion).toBe(1);

		expect(fsStore.contentOrder.get('/vault/pinned.md')).toBe(1);
		expect(loadDirectoryTree).not.toHaveBeenCalled();
	});

	it('does not reload the tree when no vault is open, but still updates the order map', async () => {
		// vaultStore._reset() left path null.
		vi.mocked(invoke).mockResolvedValue([
			entryV2('/vault/pinned.md', { frontmatter: { _order: 3 } }),
		]);

		registerVaultIndexUpdatedListener();
		fireEvent(1);
		await settleFanOut();
		expect(typeDefinitionsStore.entriesVersion).toBe(1);

		expect(fsStore.contentOrder.get('/vault/pinned.md')).toBe(3);
		expect(loadDirectoryTree).not.toHaveBeenCalled();
	});

	it('skips the fan-out when cleanup runs before the in-flight fetch resolves', async () => {
		let resolveInvoke!: (v: unknown) => void;
		vi.mocked(invoke).mockReturnValue(new Promise((r) => { resolveInvoke = r; }));

		const cleanup = registerVaultIndexUpdatedListener();
		fireEvent(7);
		// Debounce fires: bump applied, fetch starts (still pending).
		await vi.advanceTimersByTimeAsync(300);
		expect(vaultStore.vaultIndexVersion).toBe(7);

		cleanup();
		resolveInvoke([entryV2('/vault/late.md', { archived: true })]);
		await vi.advanceTimersByTimeAsync(0);

		// cancelled flag dropped the late snapshot — no store writes.
		expect(typeDefinitionsStore.entriesVersion).toBe(0);
		expect(typeDefinitionsStore.entries).toEqual([]);
		expect(lifecycleFilterStore.archivedCount).toBe(0);
		expect(fsStore.contentOrder.size).toBe(0);
	});

	it('cleanup cancels a pending debounced refresh', async () => {
		const cleanup = registerVaultIndexUpdatedListener();
		fireEvent(9);

		cleanup(); // before the 300ms window elapses
		await vi.advanceTimersByTimeAsync(300);

		expect(invoke).not.toHaveBeenCalled();
		expect(vaultStore.vaultIndexVersion).toBe(0);
	});

	it('coalesces a burst into one snapshot fetch carrying the final version', async () => {
		const snapshot = [entryV2('/vault/c.md', { archived: true })];
		vi.mocked(invoke).mockResolvedValue(snapshot);

		registerVaultIndexUpdatedListener();

		// Rapid burst: three events inside one debounce window (watcher
		// incremental loop emits one event per changed file).
		fireEvent(1);
		fireEvent(2);
		fireEvent(3);

		await settleFanOut();

		expect(invoke).toHaveBeenCalledTimes(1);
		expect(vaultStore.vaultIndexVersion).toBe(3);
		expect(typeDefinitionsStore.entries).toEqual(snapshot);
		expect(lifecycleFilterStore.isArchived('/vault/c.md')).toBe(true);
	});

	it('drops a stale in-flight response that resolves after a newer one', async () => {
		const older = [entryV2('/vault/old.md')];
		const newer = [entryV2('/vault/new.md')];
		let resolveFirst!: (v: unknown) => void;
		let resolveSecond!: (v: unknown) => void;
		vi.mocked(invoke)
			.mockReturnValueOnce(new Promise((r) => { resolveFirst = r; }))
			.mockReturnValueOnce(new Promise((r) => { resolveSecond = r; }));

		registerVaultIndexUpdatedListener();
		fireEvent(1);
		await vi.advanceTimersByTimeAsync(300); // fetch 1 in flight
		fireEvent(2);
		await vi.advanceTimersByTimeAsync(300); // fetch 2 in flight

		resolveSecond(newer);
		await vi.advanceTimersByTimeAsync(0);
		expect(typeDefinitionsStore.entries).toEqual(newer);

		resolveFirst(older);
		await vi.advanceTimersByTimeAsync(0);

		// Latest-wins guard: the stale snapshot must not overwrite the newer one.
		expect(typeDefinitionsStore.entries).toEqual(newer);
	});

	it('logs and leaves stores untouched when the entries fetch fails', async () => {
		const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
		vi.mocked(invoke).mockRejectedValue(new Error('ipc down'));

		registerVaultIndexUpdatedListener();
		fireEvent(4);
		await settleFanOut();

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.stringContaining('LISTENERS'),
			'get_all_vault_entries_v2 failed:',
			expect.any(Error),
		);

		// Version bump still applied; the fan-out stores are untouched.
		expect(vaultStore.vaultIndexVersion).toBe(4);
		expect(typeDefinitionsStore.entriesVersion).toBe(0);
		expect(typeDefinitionsStore.entries).toEqual([]);
		expect(lifecycleFilterStore.archivedCount).toBe(0);
		expect(fsStore.contentOrder.size).toBe(0);
		expect(loadDirectoryTree).not.toHaveBeenCalled();

		consoleErrorSpy.mockRestore();
	});
});

describe('registerFocusListener', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedFocusHandler = undefined;
	});

	it('registers an onFocusChanged handler', async () => {
		registerFocusListener();

		await vi.waitFor(() => expect(mockOnFocusChanged).toHaveBeenCalledTimes(1));
		expect(mockOnFocusChanged).toHaveBeenCalledWith(expect.any(Function));
	});

	it('calls refreshDailyNoteIfDateChanged when window gains focus', async () => {
		registerFocusListener();
		await vi.waitFor(() => expect(capturedFocusHandler).toBeDefined());

		capturedFocusHandler!({ payload: true });

		expect(refreshDailyNoteIfDateChanged).toHaveBeenCalledTimes(1);
	});

	it('does not call refreshDailyNoteIfDateChanged when window loses focus', async () => {
		registerFocusListener();
		await vi.waitFor(() => expect(capturedFocusHandler).toBeDefined());

		capturedFocusHandler!({ payload: false });

		expect(refreshDailyNoteIfDateChanged).not.toHaveBeenCalled();
	});

	it('returns a cleanup function that unsubscribes', async () => {
		const cleanup = registerFocusListener();
		await vi.waitFor(() => expect(mockUnlistenFocus).not.toHaveBeenCalled());

		cleanup();
		expect(mockUnlistenFocus).toHaveBeenCalledTimes(1);
	});

	it('cleanup cancels subscription if called before onFocusChanged resolves', () => {
		let resolveFocus: ((fn: () => void) => void) | undefined;
		mockOnFocusChanged.mockImplementationOnce(() =>
			new Promise((resolve) => { resolveFocus = resolve; }),
		);

		const cleanup = registerFocusListener();
		cleanup();

		const unlistenFn = vi.fn();
		resolveFocus!(unlistenFn);

		return vi.waitFor(() => expect(unlistenFn).toHaveBeenCalledTimes(1));
	});
});

