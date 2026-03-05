import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupLocalStorage, clearLocalStorage } from '../../../fixtures/localStorage.fixture';

// Must set up localStorage BEFORE any store imports (vaultStore reads localStorage at top-level)
setupLocalStorage();

vi.mock('$lib/utils/debug', () => ({
	debug: vi.fn(),
	error: vi.fn((_tag: string, ...args: unknown[]) => {
		console.error(...args);
	}),
	timeAsync: vi.fn((_tag: string, _label: string, fn: () => Promise<unknown>) => fn()),
	timeSync: vi.fn((_tag: string, _label: string, fn: () => unknown) => fn()),
}));

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn(),
}));

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(),
}));

vi.mock('$lib/core/settings/settings.service', () => ({
	saveSettings: vi.fn(() => Promise.resolve()),
}));

// No mocks for stores — use real implementations per CLAUDE.md

import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { error as debugError } from '$lib/utils/debug';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { saveSettings } from '$lib/core/settings/settings.service';
import { terminalStore } from '$lib/plugins/terminal/terminal.store.svelte';
import {
	registerXtermInstance,
	unregisterXtermInstance,
	spawnTerminal,
	writeToTerminal,
	resizeTerminal,
	killTerminal,
	killAllTerminals,
	toggleTerminal,
} from '$lib/plugins/terminal/terminal.service';

describe('registerXtermInstance / unregisterXtermInstance', () => {
	it('registerXtermInstance does not throw', () => {
		const mockTerminal = { write: vi.fn() } as any;
		expect(() => registerXtermInstance('s1', mockTerminal)).not.toThrow();
	});

	it('unregisterXtermInstance does not throw', () => {
		expect(() => unregisterXtermInstance('s1')).not.toThrow();
	});
});

describe('spawnTerminal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		terminalStore.reset();
		vaultStore.open('/vault');
	});

	it('invokes spawn_terminal and adds session to store', async () => {
		vi.mocked(invoke).mockResolvedValue('session-1');
		vi.mocked(listen).mockResolvedValue(vi.fn());

		const sessionId = await spawnTerminal();

		expect(invoke).toHaveBeenCalledWith('spawn_terminal', { cwd: '/vault', rows: 24, cols: 80 });
		expect(listen).toHaveBeenCalledTimes(2);
		expect(sessionId).toBe('session-1');

		// Verify real store state
		expect(terminalStore.sessions).toHaveLength(1);
		expect(terminalStore.sessions[0].sessionId).toBe('session-1');
		expect(terminalStore.sessions[0].alive).toBe(true);
	});

	it('marks session as exited but keeps it visible when terminal exits naturally', async () => {
		vi.mocked(invoke).mockResolvedValue('session-exit');
		const unlistenOutput = vi.fn();
		const unlistenExit = vi.fn();
		// Capture the exit handler so we can fire it manually
		let exitHandler: (() => void) | undefined;
		vi.mocked(listen)
			.mockImplementationOnce(async () => unlistenOutput)
			.mockImplementationOnce(async (_event, handler) => {
				exitHandler = handler as () => void;
				return unlistenExit;
			});

		await spawnTerminal();

		// Verify session was added
		expect(terminalStore.sessions).toHaveLength(1);
		expect(terminalStore.sessions[0].alive).toBe(true);

		// Simulate the terminal process exiting naturally
		exitHandler!();

		// Session stays in store with alive=false so user can see "(exited)" label
		expect(terminalStore.sessions).toHaveLength(1);
		expect(terminalStore.sessions[0].alive).toBe(false);
		// Event listeners are NOT cleaned up yet — user dismisses manually via killTerminal
		expect(unlistenOutput).not.toHaveBeenCalled();
		expect(unlistenExit).not.toHaveBeenCalled();
	});

	it('returns null when vaultPath is null', async () => {
		vaultStore.close();

		const result = await spawnTerminal();

		expect(result).toBeNull();
		expect(invoke).not.toHaveBeenCalled();
	});

	it('returns null and logs error when invoke fails', async () => {
		vi.mocked(invoke).mockRejectedValue(new Error('spawn failed'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		const result = await spawnTerminal();

		expect(result).toBeNull();
		expect(consoleSpy).toHaveBeenCalledWith('Failed to spawn terminal:', expect.any(Error));
		consoleSpy.mockRestore();
	});
});

describe('writeToTerminal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('invokes write_terminal with session and data', () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		writeToTerminal('s1', 'ls\n');

		expect(invoke).toHaveBeenCalledWith('write_terminal', { sessionId: 's1', data: 'ls\n' });
	});
});

describe('resizeTerminal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('invokes resize_terminal with dimensions', () => {
		vi.mocked(invoke).mockResolvedValue(undefined);

		resizeTerminal('s1', 30, 100);

		expect(invoke).toHaveBeenCalledWith('resize_terminal', { sessionId: 's1', rows: 30, cols: 100 });
	});
});

describe('killTerminal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		terminalStore.reset();
	});

	it('invokes kill_terminal and removes session', async () => {
		// Add a session first
		terminalStore.addSession({ sessionId: 's1', title: 'Terminal 1', alive: true });
		expect(terminalStore.sessions).toHaveLength(1);

		vi.mocked(invoke).mockResolvedValue(undefined);

		await killTerminal('s1');

		expect(invoke).toHaveBeenCalledWith('kill_terminal', { sessionId: 's1' });
		// Verify real store state: session should be removed
		expect(terminalStore.sessions).toHaveLength(0);
	});

	it('still cleans up even when invoke fails', async () => {
		terminalStore.addSession({ sessionId: 's1', title: 'Terminal 1', alive: true });
		vi.mocked(invoke).mockRejectedValue(new Error('kill failed'));
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await killTerminal('s1');

		// Verify real store state: session should still be removed despite error
		expect(terminalStore.sessions).toHaveLength(0);
		consoleSpy.mockRestore();
	});
});

describe('killAllTerminals', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		terminalStore.reset();
	});

	it('invokes kill_all_terminals and resets store', async () => {
		// Add some sessions
		terminalStore.addSession({ sessionId: 's1', title: 'Terminal 1', alive: true });
		terminalStore.addSession({ sessionId: 's2', title: 'Terminal 2', alive: true });
		expect(terminalStore.sessions).toHaveLength(2);

		vi.mocked(invoke).mockResolvedValue(undefined);

		await killAllTerminals();

		expect(invoke).toHaveBeenCalledWith('kill_all_terminals');
		// Verify real store state: all sessions should be gone
		expect(terminalStore.sessions).toHaveLength(0);
	});
});

describe('toggleTerminal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		clearLocalStorage();
		vaultStore._reset();
		settingsStore.reset();
		terminalStore.reset();
		vaultStore.open('/vault');
	});

	it('hides terminal and kills all when currently visible', async () => {
		settingsStore.updateLayout({ terminalVisible: true });
		expect(settingsStore.layout.terminalVisible).toBe(true);
		vi.mocked(invoke).mockResolvedValue(undefined);

		await toggleTerminal();

		// Verify real store state: terminal should now be hidden
		expect(settingsStore.layout.terminalVisible).toBe(false);
		expect(saveSettings).toHaveBeenCalledWith('/vault');
	});

	it('shows terminal when currently hidden', async () => {
		expect(settingsStore.layout.terminalVisible).toBe(false);

		await toggleTerminal();

		// Verify real store state: terminal should now be visible
		expect(settingsStore.layout.terminalVisible).toBe(true);
		expect(saveSettings).toHaveBeenCalledWith('/vault');
	});

	it('logs error when saveSettings fails instead of silently swallowing', async () => {
		const settingsError = new Error('disk full');
		vi.mocked(saveSettings).mockRejectedValueOnce(settingsError);
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		await toggleTerminal();

		await vi.waitFor(() => {
			expect(debugError).toHaveBeenCalledWith(
				'TERMINAL',
				'Failed to save terminal settings:',
				settingsError,
			);
		});
		consoleSpy.mockRestore();
	});
});
