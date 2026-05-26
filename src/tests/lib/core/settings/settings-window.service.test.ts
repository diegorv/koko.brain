import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Mocks ---

const mockSetFocus = vi.fn(() => Promise.resolve());
const mockClose = vi.fn(() => Promise.resolve());
const mockOnce = vi.fn();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockGetByLabel: (...args: any[]) => any = vi.fn(() => Promise.resolve(null));
const mockConstructor = vi.fn();

vi.mock('@tauri-apps/api/webviewWindow', () => {
	class MockWebviewWindow {
		static getByLabel(...args: unknown[]) { return mockGetByLabel(...args); }
		constructor(public label: string, public options: unknown) {
			mockConstructor(label, options);
			this.once = mockOnce;
		}
		once: typeof mockOnce;
	}
	return { WebviewWindow: MockWebviewWindow };
});

const mockEmit = vi.fn((..._args: unknown[]) => Promise.resolve());
vi.mock('@tauri-apps/api/event', () => ({
	emit: (...args: unknown[]) => mockEmit(...args),
}));

vi.mock('$lib/utils/debug', () => ({
	error: vi.fn(),
}));

// --- Imports (after mocks) ---

import { openSettingsWindow, closeSettingsWindow, emitSettingsChanged } from '$lib/core/settings/settings-window.service';

// --- Tests ---

describe('openSettingsWindow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGetByLabel = vi.fn(() => Promise.resolve(null));
	});

	it('creates a new WebviewWindow when none exists', async () => {
		await openSettingsWindow('/my-vault');

		expect(mockGetByLabel).toHaveBeenCalledWith('settings');
		expect(mockConstructor).toHaveBeenCalledWith('settings', expect.objectContaining({
			url: '/settings?vault=%2Fmy-vault',
			title: 'Settings',
			width: 820,
			height: 600,
		}));
	});

	it('encodes vault path in the URL', async () => {
		await openSettingsWindow('/path with spaces/vault');

		expect(mockConstructor).toHaveBeenCalledWith('settings', expect.objectContaining({
			url: '/settings?vault=%2Fpath%20with%20spaces%2Fvault',
		}));
	});

	it('includes section param when provided', async () => {
		await openSettingsWindow('/my-vault', 'editor');

		expect(mockConstructor).toHaveBeenCalledWith('settings', expect.objectContaining({
			url: '/settings?vault=%2Fmy-vault&section=editor',
		}));
	});

	it('focuses existing window instead of creating a new one', async () => {
		mockGetByLabel = vi.fn(() => Promise.resolve({ setFocus: mockSetFocus }));

		await openSettingsWindow('/my-vault');

		expect(mockSetFocus).toHaveBeenCalledTimes(1);
		expect(mockConstructor).not.toHaveBeenCalled();
	});

	it('emits settings-navigate when focusing existing window with section', async () => {
		mockGetByLabel = vi.fn(() => Promise.resolve({ setFocus: mockSetFocus }));

		await openSettingsWindow('/my-vault', 'appearance');

		expect(mockSetFocus).toHaveBeenCalledTimes(1);
		expect(mockEmit).toHaveBeenCalledWith('settings-navigate', 'appearance');
	});

	it('does not emit settings-navigate when focusing without section', async () => {
		mockGetByLabel = vi.fn(() => Promise.resolve({ setFocus: mockSetFocus }));

		await openSettingsWindow('/my-vault');

		expect(mockEmit).not.toHaveBeenCalled();
	});

	it('registers a tauri://error listener on the new window', async () => {
		await openSettingsWindow('/my-vault');

		expect(mockOnce).toHaveBeenCalledWith('tauri://error', expect.any(Function));
	});
});

describe('closeSettingsWindow', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('closes the window when it exists', async () => {
		mockGetByLabel = vi.fn(() => Promise.resolve({ close: mockClose }));

		await closeSettingsWindow();

		expect(mockGetByLabel).toHaveBeenCalledWith('settings');
		expect(mockClose).toHaveBeenCalledTimes(1);
	});

	it('does nothing when no window exists', async () => {
		mockGetByLabel = vi.fn(() => Promise.resolve(null));

		await closeSettingsWindow();

		expect(mockClose).not.toHaveBeenCalled();
	});
});

describe('emitSettingsChanged', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('emits the settings-changed event', async () => {
		await emitSettingsChanged();

		expect(mockEmit).toHaveBeenCalledWith('settings-changed');
	});
});
