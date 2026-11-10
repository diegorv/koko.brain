/**
 * Pure rules of the automatic Todoist sync: which saves trigger a cycle,
 * when an automatic cycle may run, and the fixed texts it shows. Design:
 * `.scratch/todoist-bisync/research/design.md` (Triggers, rules 9 and 13).
 */

import { readAnchor } from './anchor.logic.js';
import { extractTaskLines } from './pull.logic.js';

/** Failure kinds an automatic cycle reports in a persistent toast. */
export type AutoSyncFailureKind = 'invalid-token' | 'rate-limit' | 'unreachable' | 'root-missing' | 'lines-missing' | 'error';

/** Wait after a 429 whose response carries no `retry_after`. */
const DEFAULT_RATE_LIMIT_WAIT_S = 60;

/** Whether a note's content holds a task line with a `🆔 td-…` anchor (code fences skipped). */
export function hasAnchoredLine(content: string): boolean {
	return extractTaskLines(content).some((line) => readAnchor(line.text) !== null);
}

/** Whether the sync state's `first_run_done` row is set (`1` or `true`). */
export function isFirstRunDone(kv: readonly { key: string; value: string }[]): boolean {
	const value = kv.find((row) => row.key === 'first_run_done')?.value;
	return value === '1' || value === 'true';
}

/**
 * Milliseconds an automatic cycle must wait before it may run: until
 * `minGapMs` after the last cycle ended and until a rate limit lifts at
 * `blockedUntil`. Zero when it may run now.
 */
export function autoCycleDelay(now: number, lastEndedAt: number, blockedUntil: number, minGapMs: number): number {
	return Math.max(0, lastEndedAt + minGapMs - now, blockedUntil - now);
}

/** How long to wait after a 429: `retry_after` seconds, else 60 seconds. */
export function rateLimitWaitMs(retryAfter: number | undefined): number {
	return (retryAfter ?? DEFAULT_RATE_LIMIT_WAIT_S) * 1000;
}

/** The fixed message of an automatic cycle's failure kind. */
export function autoSyncFailureMessage(kind: AutoSyncFailureKind): string {
	switch (kind) {
		case 'invalid-token':
			return 'Todoist automatic sync stopped: the API token is invalid. Update it in Settings > Todoist.';
		case 'rate-limit':
			return 'Todoist rate limit reached. Automatic sync will retry later.';
		case 'unreachable':
			return 'Could not reach Todoist. Automatic sync will retry later.';
		case 'root-missing':
			return 'The sync root project was not found in Todoist. Choose it again in Settings > Todoist.';
		case 'lines-missing':
			return 'Todoist automatic sync stopped: fewer than half of the synced task lines were found in the vault. Nothing was changed.';
		case 'error':
			return 'Todoist automatic sync failed. Details are in the log.';
	}
}

/** The toast of an automatic cycle that skipped `count` close/reopen pushes over the cap (design rule 9). */
export function autoSyncOverCapMessage(count: number): string {
	return `Todoist automatic sync skipped closing or reopening ${count} tasks: more than 25 in one sync. Run "Todoist: Sync now" to confirm them.`;
}

/** The toast of an automatic cycle that skipped the field pushes of `count` tasks over the cap (design rule 9). */
export function autoSyncFieldCapMessage(count: number): string {
	return `Todoist automatic sync skipped sending brain edits of ${count} tasks: more than 50 in one sync. Run "Todoist: Sync now" to confirm them.`;
}

/** The toast of an automatic cycle that skipped `count` detaches over the cap (design rule 9). */
export function autoSyncDetachCapMessage(count: number): string {
	return `Todoist automatic sync skipped detaching ${count} deleted or moved tasks: more than 10 in one sync. Run "Todoist: Sync now" to confirm them.`;
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** A local time as `HH:MM`. */
export function formatClockTime(ms: number): string {
	const date = new Date(ms);
	return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** A local date and time as `YYYY-MM-DD HH:MM`, for sync log rows. */
export function formatLogTime(ms: number): string {
	const date = new Date(ms);
	return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${formatClockTime(ms)}`;
}

/** What the status bar item reads from the sync store. */
export interface SyncStatusInput {
	status: 'idle' | 'syncing' | 'error';
	/** `finishedAt` of the last successful pull, or null. */
	lastSyncedAt: number | null;
	/** Message of the last failure, or null. */
	lastError: string | null;
}

/** The status bar item's text, and the tooltip carrying an error's message. */
export function syncStatusLabel(input: SyncStatusInput): { text: string; title: string | null } {
	if (input.status === 'syncing') return { text: 'Todoist syncing', title: null };
	if (input.status === 'error') return { text: 'Todoist sync error', title: input.lastError };
	if (input.lastSyncedAt === null) return { text: 'Todoist not synced yet', title: null };
	return { text: `Todoist synced ${formatClockTime(input.lastSyncedAt)}`, title: null };
}
