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

vi.mock('@tauri-apps/api/window', () => ({
	getCurrentWindow: () => ({
		onCloseRequested: (...args: unknown[]) => mockOnCloseRequested(...args),
		destroy: (...args: unknown[]) => mockDestroy(...args),
	}),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
	ask: vi.fn(),
}));

vi.mock('$lib/core/editor/editor.service', () => ({
	saveAllDirtyTabs: vi.fn(),
}));

// --- Imports (after mocks) ---

import { listen } from '@tauri-apps/api/event';
import { ask } from '@tauri-apps/plugin-dialog';
import { settingsDialogStore } from '$lib/core/settings/settings-dialog.store.svelte';
import { saveAllDirtyTabs } from '$lib/core/editor/editor.service';
import { registerMenuSettingsListener, registerCloseHandler } from '$lib/core/layout/tauri-listeners.service';

// --- Tests ---

describe('registerMenuSettingsListener', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		capturedEventHandler = undefined;
		settingsDialogStore.reset();
	});

	it('listens for the menu:settings event', async () => {
		registerMenuSettingsListener();

		// Wait for the listen promise to resolve
		await vi.waitFor(() => expect(listen).toHaveBeenCalledTimes(1));
		expect(listen).toHaveBeenCalledWith('menu:settings', expect.any(Function));
	});

	it('opens the settings dialog when the event fires', async () => {
		registerMenuSettingsListener();
		await vi.waitFor(() => expect(capturedEventHandler).toBeDefined());

		expect(settingsDialogStore.isOpen).toBe(false);
		capturedEventHandler!(undefined);
		expect(settingsDialogStore.isOpen).toBe(true);
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
