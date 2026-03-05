import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { saveSettings } from '$lib/core/settings/settings.service';
import { terminalStore } from './terminal.store.svelte';
import type { TerminalOutputPayload } from './terminal.types';
import { error } from '$lib/utils/debug';

/** Map of sessionId → xterm.Terminal instance (registered by the component) */
const xtermInstances = new Map<string, import('@xterm/xterm').Terminal>();

/** Map of sessionId → unlisten functions for Tauri events */
const eventListeners = new Map<string, (() => void)[]>();

/** Counter for naming terminals ("Terminal 1", "Terminal 2", ...) */
let sessionCounter = 0;

/** Registers an xterm.js instance so the output listener can write to it */
export function registerXtermInstance(sessionId: string, terminal: import('@xterm/xterm').Terminal): void {
	xtermInstances.set(sessionId, terminal);
}

/** Unregisters an xterm.js instance when the component is destroyed */
export function unregisterXtermInstance(sessionId: string): void {
	xtermInstances.delete(sessionId);
}

/**
 * Spawns a new terminal session via the Rust backend.
 * Registers event listeners for output and exit, adds the session to the store.
 * Returns the session ID or null on failure.
 */
export async function spawnTerminal(): Promise<string | null> {
	if (!vaultStore.path) return null;

	try {
		const sessionId = await invoke<string>('spawn_terminal', {
			cwd: vaultStore.path,
			rows: 24,
			cols: 80,
		});

		sessionCounter++;
		terminalStore.addSession({
			sessionId,
			title: `Terminal ${sessionCounter}`,
			alive: true,
		});

		const unlistenOutput = await listen<TerminalOutputPayload>(
			`terminal:output:${sessionId}`,
			(event) => {
				const xterm = xtermInstances.get(sessionId);
				if (xterm) {
					xterm.write(event.payload.data);
				}
			},
		);

		const unlistenExit = await listen<string>(
			`terminal:exit:${sessionId}`,
			() => {
				terminalStore.markExited(sessionId);
			},
		);

		eventListeners.set(sessionId, [unlistenOutput, unlistenExit]);
		return sessionId;
	} catch (err) {
		error('TERMINAL', 'Failed to spawn terminal:', err);
		return null;
	}
}

/** Sends input data (keystrokes) to a terminal session's PTY stdin (fire-and-forget) */
export function writeToTerminal(sessionId: string, data: string): void {
	invoke('write_terminal', { sessionId, data }).catch((err) =>
		error('TERMINAL', 'Failed to write to terminal:', err),
	);
}

/** Resizes a terminal session's PTY to the given dimensions (fire-and-forget) */
export function resizeTerminal(sessionId: string, rows: number, cols: number): void {
	invoke('resize_terminal', { sessionId, rows, cols }).catch((err) =>
		error('TERMINAL', 'Failed to resize terminal:', err),
	);
}

/** Kills a single terminal session and cleans up its resources */
export async function killTerminal(sessionId: string): Promise<void> {
	try {
		await invoke('kill_terminal', { sessionId });
	} catch (err) {
		error('TERMINAL', 'Failed to kill terminal:', err);
	}
	cleanup(sessionId);
}

/** Kills all terminal sessions and resets all state */
export async function killAllTerminals(): Promise<void> {
	try {
		await invoke('kill_all_terminals');
	} catch (err) {
		error('TERMINAL', 'Failed to kill all terminals:', err);
	}
	for (const [, unlisteners] of eventListeners) {
		unlisteners.forEach((fn) => fn());
	}
	xtermInstances.clear();
	eventListeners.clear();
	sessionCounter = 0;
	terminalStore.reset();
}

/** Toggles terminal sidebar visibility and persists the setting */
export async function toggleTerminal(): Promise<void> {
	const current = settingsStore.layout.terminalVisible;
	if (current) {
		await killAllTerminals();
	}
	settingsStore.updateLayout({ terminalVisible: !current });
	if (vaultStore.path) saveSettings(vaultStore.path).catch((err) => error('TERMINAL', 'Failed to save terminal settings:', err));
}

/** Resets terminal state — called during vault teardown */
export async function resetTerminal(): Promise<void> {
	await killAllTerminals();
}

/** Cleans up a single session's event listeners and store entry */
function cleanup(sessionId: string): void {
	const unlisteners = eventListeners.get(sessionId);
	if (unlisteners) {
		unlisteners.forEach((fn) => fn());
		eventListeners.delete(sessionId);
	}
	xtermInstances.delete(sessionId);
	terminalStore.removeSession(sessionId);
}
