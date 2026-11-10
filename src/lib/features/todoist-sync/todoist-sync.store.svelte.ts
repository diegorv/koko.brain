import type { TodoistSyncLogEntry } from '#lib/contracts/index.js';
import type { PullCounts } from './pull.logic.js';

/** Where the sync is: idle, running a cycle or check, or stopped on an error. */
export type TodoistSyncStatus = 'idle' | 'syncing' | 'error';

/** The outcome of the last successful run. */
export type TodoistSyncResult = TodoistCheckResult | TodoistPullResult;

/** A successful "Sync now" pull. */
export interface TodoistPullResult extends PullCounts {
	kind: 'pull';
	/** `Date.now()` when the run finished. */
	finishedAt: number;
}

/** A successful connection check. */
export interface TodoistCheckResult {
	/** What ran. */
	kind: 'check';
	/** Projects in the vault's tree, the Inbox included when it is. */
	projects: number;
	/** Open tasks in those projects. */
	openTasks: number;
	/** Whether the Inbox was counted. */
	inboxIncluded: boolean;
	/** `Date.now()` when the run finished. */
	finishedAt: number;
}

/** Current status. */
let status = $state<TodoistSyncStatus>('idle');
/** Last successful result; kept when a later run fails. */
let lastResult = $state<TodoistSyncResult | null>(null);
/** Fixed user-facing message of the last failure, null after a success or a new start. */
let lastError = $state<string | null>(null);
/** `finishedAt` of the last successful pull; a connection check leaves it alone. */
let lastSyncedAt = $state<number | null>(null);
/** Whether the sync log dialog is open. */
let logOpen = $state(false);
/** Sync log rows the open dialog lists, newest first. */
let logEntries = $state<TodoistSyncLogEntry[]>([]);

/** Sync status and last result for the UI. */
export const todoistSyncStore = {
	get status() { return status; },
	/** Whether a cycle or check is running. */
	get isSyncing() { return status === 'syncing'; },
	get lastResult() { return lastResult; },
	get lastError() { return lastError; },
	get lastSyncedAt() { return lastSyncedAt; },
	get logOpen() { return logOpen; },
	get logEntries() { return logEntries; },

	/** Marks a run as started and clears the previous error. */
	start() {
		status = 'syncing';
		lastError = null;
	},

	/** Stores a successful run's result and returns to idle. */
	succeed(result: TodoistSyncResult) {
		lastResult = result;
		if (result.kind === 'pull') lastSyncedAt = result.finishedAt;
		lastError = null;
		status = 'idle';
	},

	/** Stores a failed run's message; the last good result stays. */
	fail(message: string) {
		lastError = message;
		status = 'error';
	},

	/** Opens the sync log dialog on `entries` (newest first). */
	openLog(entries: TodoistSyncLogEntry[]) {
		logEntries = entries;
		logOpen = true;
	},

	/** Closes the sync log dialog and drops its rows. */
	closeLog() {
		logOpen = false;
		logEntries = [];
	},

	/** Resets all state (tests, and vault teardown). */
	reset() {
		status = 'idle';
		lastResult = null;
		lastError = null;
		lastSyncedAt = null;
		logOpen = false;
		logEntries = [];
	},
};
