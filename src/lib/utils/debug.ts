import { invoke } from '@tauri-apps/api/core';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { appendLog } from './log.service';

/** Returns a compact timestamp for console log entries (HH:mm:ss.SSS) */
function logTime(): string {
	return new Date().toISOString().slice(11, 23);
}

/** Logs a debug message to the console when debug mode is enabled in settings.
 *  Messages are prefixed with `[tag]` for easy filtering.
 *  Does nothing when `settingsStore.debugMode` is false. */
export function debug(tag: string, ...args: unknown[]): void {
	if (settingsStore.debugLogToFile) {
		appendLog(tag, ...args);
	}
	if (!settingsStore.debugMode) return;
	console.log(`[${logTime()}] [${tag}]`, ...args);
}

/** Logs an error message to the console. Always visible (not gated by debugMode).
 *  Messages are prefixed with `[tag]` for easy filtering.
 *  Also writes to the log file when `debugLogToFile` is enabled. */
export function error(tag: string, ...args: unknown[]): void {
	if (settingsStore.debugLogToFile) {
		appendLog(`ERROR:${tag}`, ...args);
	}
	console.error(`[${logTime()}] [${tag}]`, ...args);
}

// --- Timing helpers ---

/**
 * Times an async operation and logs the elapsed time via debug().
 * Returns the result of the wrapped function.
 */
export async function timeAsync<T>(
	tag: string,
	label: string,
	fn: () => Promise<T>,
): Promise<T> {
	const start = performance.now();
	const result = await fn();
	const elapsed = (performance.now() - start).toFixed(1);
	debug(tag, `${label} completed in ${elapsed}ms`);
	return result;
}

/**
 * Times a synchronous operation and logs the elapsed time via debug().
 * Returns the result of the wrapped function.
 */
export function timeSync<T>(
	tag: string,
	label: string,
	fn: () => T,
): T {
	const start = performance.now();
	const result = fn();
	const elapsed = (performance.now() - start).toFixed(1);
	debug(tag, `${label} completed in ${elapsed}ms`);
	return result;
}

// --- Inline perf markers ---

/** Starts a performance measurement. Returns the start timestamp.
 *  Returns 0 when debug mode is disabled (zero overhead). */
export function perfStart(): number {
	if (!settingsStore.debugMode && !settingsStore.debugLogToFile) return 0;
	return performance.now();
}

/** Ends a performance measurement and logs the elapsed time via debug().
 *  Skips if debug mode is disabled (start === 0). */
export function perfEnd(tag: string, label: string, start: number): void {
	if (start === 0) return;
	const elapsed = (performance.now() - start).toFixed(1);
	debug(tag, `${label}: ${elapsed}ms`);
}

// --- Tauri debug log forwarding ---

/** Payload received from the Rust backend debug log events */
interface TauriDebugLogPayload {
	tag: string;
	message: string;
}

/** Active unlisten function for the Tauri debug log listener */
let tauriDebugUnlisten: UnlistenFn | null = null;

/**
 * Enables or disables Tauri backend debug logging.
 * Calls the Rust command and starts/stops the frontend event listener.
 */
export async function setTauriDebugMode(enabled: boolean): Promise<void> {
	try {
		await invoke('set_tauri_debug_mode', { enabled });
	} catch (err) {
		error('DEBUG', 'Failed to set Tauri debug mode:', err);
		return;
	}

	if (enabled) {
		await startTauriDebugListener();
	} else {
		stopTauriDebugListener();
	}
}

/** Starts listening for `tauri-debug-log` events and logs them to the browser console. */
async function startTauriDebugListener(): Promise<void> {
	if (tauriDebugUnlisten) return;
	tauriDebugUnlisten = await listen<TauriDebugLogPayload>('tauri-debug-log', (event) => {
		const { tag, message } = event.payload;
		console.log(`[${logTime()}] [TAURI:${tag}] ${message}`);
		if (settingsStore.debugTauriLogToFile) {
			appendLog(`TAURI:${tag}`, message);
		}
	});
}

/** Stops listening for Tauri debug log events. */
export function stopTauriDebugListener(): void {
	if (tauriDebugUnlisten) {
		tauriDebugUnlisten();
		tauriDebugUnlisten = null;
	}
}

// --- Process memory ---

/** Queries the Rust backend for the current process RSS and logs it via debug(). */
export async function logProcessMemory(): Promise<void> {
	try {
		const bytes = await invoke<number>('get_process_memory');
		debug('MEMORY', `Process RSS: ${(bytes / 1048576).toFixed(1)} MB`);
	} catch (err) {
		error('MEMORY', 'Failed to get process memory:', err);
	}
}
