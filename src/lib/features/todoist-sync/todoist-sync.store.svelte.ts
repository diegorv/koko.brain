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

/** Sync status and last result for the UI. */
export const todoistSyncStore = {
	get status() { return status; },
	/** Whether a cycle or check is running. */
	get isSyncing() { return status === 'syncing'; },
	get lastResult() { return lastResult; },
	get lastError() { return lastError; },

	/** Marks a run as started and clears the previous error. */
	start() {
		status = 'syncing';
		lastError = null;
	},

	/** Stores a successful run's result and returns to idle. */
	succeed(result: TodoistSyncResult) {
		lastResult = result;
		lastError = null;
		status = 'idle';
	},

	/** Stores a failed run's message; the last good result stays. */
	fail(message: string) {
		lastError = message;
		status = 'error';
	},

	/** @internal Resets all state (for testing only). */
	reset() {
		status = 'idle';
		lastResult = null;
		lastError = null;
	},
};
