import { describe, it, expect, vi, beforeEach } from 'vitest';

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

vi.mock('$lib/core/editor/editor.service', () => ({
	saveAllDirtyTabs: vi.fn(),
}));

vi.mock('$lib/plugins/periodic-notes/periodic-notes.service', () => ({
	refreshDailyNoteIfDateChanged: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('$lib/core/settings/settings-panel.store.svelte', () => ({
	settingsPanelStore: {
		toggle: vi.fn(),
		open: vi.fn(),
		close: vi.fn(),
	},
}));

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
import { ask } from '@tauri-apps/plugin-dialog';
import { saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import { refreshDailyNoteIfDateChanged } from '$lib/plugins/periodic-notes/periodic-notes.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsPanelStore } from '$lib/core/settings/settings-panel.store.svelte';
import { registerMenuSettingsListener, registerCloseHandler, registerFocusListener, registerVaultIndexUpdatedListener } from '$lib/core/layout/tauri-listeners.service';

// --- Tests ---

describe('registerMenuSettingsListener', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedEventHandler = undefined;
		vaultStore._reset();
	});

	it('listens for the menu:settings event', async () => {
		registerMenuSettingsListener();

		// Wait for the listen promise to resolve
		await vi.waitFor(() => expect(listen).toHaveBeenCalledTimes(1));
		expect(listen).toHaveBeenCalledWith('menu:settings', expect.any(Function));
	});

	it('toggles settings panel when the event fires', async () => {
		registerMenuSettingsListener();
		await vi.waitFor(() => expect(capturedEventHandler).toBeDefined());

		capturedEventHandler!(undefined);
		expect(settingsPanelStore.toggle).toHaveBeenCalledTimes(1);
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
	});

	it('listens for the vault-index-updated event', async () => {
		registerVaultIndexUpdatedListener();

		await vi.waitFor(() => expect(listen).toHaveBeenCalledTimes(1));
		expect(listen).toHaveBeenCalledWith('vault-index-updated', expect.any(Function));
	});

	it('bumps vaultIndexVersion from the payload when the event fires', async () => {
		registerVaultIndexUpdatedListener();
		await vi.waitFor(() => expect(capturedEventHandler).toBeDefined());

		expect(vaultStore.vaultIndexVersion).toBe(0);
		capturedEventHandler!({ payload: { changed: true, affected: ['/vault/a.md'], version: 3 } });
		expect(vaultStore.vaultIndexVersion).toBe(3);
	});

	it('overwrites prior version on subsequent events', async () => {
		registerVaultIndexUpdatedListener();
		await vi.waitFor(() => expect(capturedEventHandler).toBeDefined());

		capturedEventHandler!({ payload: { changed: true, affected: [], version: 1 } });
		capturedEventHandler!({ payload: { changed: false, affected: [], version: 2 } });
		capturedEventHandler!({ payload: { changed: true, affected: ['/x'], version: 5 } });
		expect(vaultStore.vaultIndexVersion).toBe(5);
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

