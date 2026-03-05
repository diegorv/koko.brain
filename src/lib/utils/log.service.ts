import { writeTextFile, mkdir, exists } from '@tauri-apps/plugin-fs';
import { appLogDir } from '@tauri-apps/api/path';
import { openPath } from '@tauri-apps/plugin-opener';

/** Active log file path (null when no session is active) */
let activeLogPath: string | null = null;

/** Cached resolved log directory path */
let resolvedLogDir: string | null = null;

/** Serial write queue — each write chains off the previous to guarantee ordering */
let writeChain: Promise<void> = Promise.resolve();

/** Formats a Date as YYYY-MM-DD_HH-mm-ss */
function formatTimestamp(date: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

/** Formats an ISO timestamp for log entries (HH:mm:ss.SSS) */
function logTime(): string {
	return new Date().toISOString().slice(11, 23);
}

/**
 * Resolves and caches the system log directory path.
 * Uses Tauri's `appLogDir()` which maps to ~/Library/Logs/<bundle-id>/ on macOS.
 */
async function getLogDir(): Promise<string> {
	if (!resolvedLogDir) {
		resolvedLogDir = await appLogDir();
	}
	return resolvedLogDir;
}

/**
 * Initializes a log session by creating the logs directory and setting the active log file path.
 * Logs are stored in the system log directory (~/Library/Logs/<bundle-id>/ on macOS).
 * If a session is already active, this is a no-op.
 */
export async function initLogSession(): Promise<void> {
	if (activeLogPath) return;

	try {
		const logsDir = await getLogDir();
		const dirExists = await exists(logsDir);
		if (!dirExists) {
			await mkdir(logsDir, { recursive: true });
		}
		const filename = `${formatTimestamp(new Date())}.log`;
		activeLogPath = `${logsDir}/${filename}`;
	} catch (err) {
		console.error('Failed to init log session:', err);
	}
}

/** Appends a tagged log entry to the active log file. No-op if no session is active.
 *  Writes are serialized through a promise chain to guarantee ordering. */
export function appendLog(tag: string, ...args: unknown[]): void {
	if (!activeLogPath) return;

	const path = activeLogPath;
	const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
	const line = `[${logTime()}] [${tag}] ${message}\n`;
	writeChain = writeChain.then(async () => {
		try {
			await writeTextFile(path, line, { append: true });
		} catch (err) {
			console.error('Failed to write log:', err);
		}
	});
}

/** Tears down the active log session, clearing the log file path and cached directory. */
export function teardownLogSession(): void {
	activeLogPath = null;
	resolvedLogDir = null;
	writeChain = Promise.resolve();
}

/** Returns whether a log session is currently active. */
export function isLogSessionActive(): boolean {
	return activeLogPath !== null;
}

/** Flushes the pending write queue. Useful for tests to await serialized writes. */
export function flushLog(): Promise<void> {
	return writeChain;
}

/** Opens the system log directory in the file manager. */
export async function openLogDir(): Promise<void> {
	const logsDir = await getLogDir();
	const dirExists = await exists(logsDir);
	if (!dirExists) {
		await mkdir(logsDir, { recursive: true });
	}
	await openPath(logsDir);
}
