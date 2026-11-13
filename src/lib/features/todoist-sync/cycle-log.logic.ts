/**
 * The `cycle` rows of the Todoist sync log: one per cycle that started, its
 * summary stored as JSON in the row's message, and the dialog's filter.
 * Only counts, command types, ids and the outcome go in: never task content
 * or note text.
 */

import type { TodoistSyncLogEntry, TodoistSyncLogInput } from '#lib/contracts/index.js';
import type { PullCounts } from './pull.logic.js';
import { formatLogTime } from './sync-scheduler.logic.js';

/** Log kind of a cycle row; every other kind is an event. */
export const CYCLE_KIND = 'cycle';

/** What started a cycle: "Sync now", or one of the scheduler's triggers. */
export type CycleTrigger = 'manual' | 'vault-open' | 'interval' | 'focus' | 'after-save';

/** A finished cycle's counts: the pull's, plus the links it detached. */
export interface CycleCounts extends PullCounts {
	/** Links detached this cycle. */
	detached: number;
}

/** What an automatic cycle left out for being over a cap (design rule 9). */
export interface CycleSkips {
	/** Close and reopen pushes. */
	pushes: number;
	/** Link detaches. */
	detaches: number;
	/** Field pushes and moves. */
	fieldPushes: number;
	/** Creates of projects, sections and tasks. */
	creates: number;
}

/** One cycle as it ran. */
export interface CycleRun {
	/** `manual` for "Sync now", `auto` for a scheduler cycle. */
	mode: 'manual' | 'auto';
	/** What started the cycle. */
	trigger: CycleTrigger;
	/** Unix ms when the cycle started. */
	startedAt: number;
	/** How long the cycle ran, in ms. */
	durationMs: number;
	/** `ok`, `cancelled`, or the failure kind. */
	outcome: string;
	/** Null when the cycle stopped before it finished. */
	counts: CycleCounts | null;
	/** Null when the cycle stopped before it finished. */
	skipped: CycleSkips | null;
	/** Commands sent to Todoist, by type. */
	commands: Record<string, number>;
	/** Whether a new `sync_token` was committed. */
	tokenAdvanced: boolean;
}

/** A stored cycle row: the newest run of a series of quiet automatic cycles that one row stands for. */
export interface CycleRecord extends CycleRun {
	/** Cycles this row stands for; 1 unless quiet automatic cycles were folded into it. */
	repeats: number;
	/** `startedAt` of the first of them. */
	firstStartedAt: number;
}

/** Log dialog filter: every row, cycle rows only, or event rows only. */
export type LogFilter = 'all' | 'cycles' | 'events';

const CHANGE_LABELS: [keyof Omit<CycleCounts, 'mode'>, string, string][] = [
	['notesCreated', 'note created', 'notes created'],
	['tasksInserted', 'task inserted', 'tasks inserted'],
	['linksPaired', 'link paired', 'links paired'],
	['linesUnmatched', 'line unmatched', 'lines unmatched'],
	['linesUpdated', 'line updated', 'lines updated'],
	['headingsWritten', 'heading written', 'headings written'],
	['todoistUpdated', 'Todoist update', 'Todoist updates'],
	['todoistCreated', 'Todoist task created', 'Todoist tasks created'],
	['projectsCreated', 'project created', 'projects created'],
	['sectionsCreated', 'section created', 'sections created'],
	['projectsRenamed', 'project renamed', 'projects renamed'],
	['detached', 'detached', 'detached'],
];

const SKIP_LABELS: [keyof CycleSkips, string][] = [
	['pushes', 'close/reopen'],
	['detaches', 'detaches'],
	['fieldPushes', 'field pushes'],
	['creates', 'creates'],
];

/**
 * The log entry for `run`. A quiet automatic cycle (nothing changed, no
 * command sent) whose `newest` row is a quiet automatic cycle with the same
 * outcome and skips replaces that row, counting one more repeat, so idle
 * cycles never push events out of the capped log.
 */
export function cycleLogEntry(run: CycleRun, newest: TodoistSyncLogEntry | null): TodoistSyncLogInput {
	const prev = newest?.kind === CYCLE_KIND ? parseCycle(newest.message) : null;
	const fold = prev !== null && isQuiet(prev) && isQuiet(run) && prev.outcome === run.outcome && JSON.stringify(prev.skipped) === JSON.stringify(run.skipped);
	const record: CycleRecord = fold ? { ...run, repeats: prev.repeats + 1, firstStartedAt: prev.firstStartedAt } : { ...run, repeats: 1, firstStartedAt: run.startedAt };
	return { kind: CYCLE_KIND, anchor: null, message: JSON.stringify(record), ...(fold ? { replaceId: newest!.id } : {}) };
}

/** The cycle record stored in a row's message, or null when it holds none. */
export function parseCycle(message: string): CycleRecord | null {
	try {
		const value: unknown = JSON.parse(message);
		if (typeof value !== 'object' || value === null) return null;
		const r = value as Partial<CycleRecord>;
		return typeof r.outcome === 'string' && typeof r.repeats === 'number' && typeof r.commands === 'object' ? (r as CycleRecord) : null;
	} catch {
		return null;
	}
}

/** One line for a cycle row, e.g. `Automatic (interval) ok in 812 ms; nothing changed; sync_token kept`. */
export function formatCycleSummary(record: CycleRecord): string {
	const outcome = record.outcome === 'ok' || record.outcome === 'cancelled' ? record.outcome : `failed (${record.outcome})`;
	const parts = [`${record.mode === 'manual' ? 'Manual' : 'Automatic'} (${record.trigger}) ${outcome} in ${record.durationMs} ms`];
	if (record.counts !== null) {
		if (record.counts.mode === 'rebuild') parts.push('rebuild');
		const counts = record.counts;
		const moved = CHANGE_LABELS.filter(([key]) => counts[key] > 0).map(([key, one, many]) => `${counts[key]} ${counts[key] === 1 ? one : many}`);
		parts.push(moved.length > 0 ? moved.join(', ') : 'nothing changed');
	}
	const skipped = record.skipped;
	if (skipped !== null && SKIP_LABELS.some(([key]) => skipped[key] > 0)) {
		parts.push(`skipped over cap: ${SKIP_LABELS.filter(([key]) => skipped[key] > 0).map(([key, label]) => `${skipped[key]} ${label}`).join(', ')}`);
	}
	const sent = Object.entries(record.commands);
	if (sent.length > 0) parts.push(`sent ${sent.map(([type, n]) => `${type} ${n}`).join(', ')}`);
	parts.push(record.tokenAdvanced ? 'sync_token advanced' : 'sync_token kept');
	if (record.repeats > 1) parts.push(`${record.repeats} cycles since ${formatLogTime(record.firstStartedAt)}`);
	return parts.join('; ');
}

/** The text the log dialog shows for a row: a cycle row's summary, any other row's message. */
export function logEntryText(entry: TodoistSyncLogEntry): string {
	const record = entry.kind === CYCLE_KIND ? parseCycle(entry.message) : null;
	return record === null ? entry.message : formatCycleSummary(record);
}

/** The rows `filter` keeps, in their order. */
export function filterLogEntries(entries: TodoistSyncLogEntry[], filter: LogFilter): TodoistSyncLogEntry[] {
	if (filter === 'all') return entries;
	return entries.filter((e) => (e.kind === CYCLE_KIND) === (filter === 'cycles'));
}

/** The first cycle row of `entries` (newest first), or null. */
export function newestCycle(entries: TodoistSyncLogEntry[]): TodoistSyncLogEntry | null {
	return entries.find((e) => e.kind === CYCLE_KIND) ?? null;
}

/** An automatic cycle that changed nothing and sent no command. */
function isQuiet(run: CycleRun): boolean {
	const counts = run.counts;
	return run.mode === 'auto' && Object.keys(run.commands).length === 0 && (counts === null || CHANGE_LABELS.every(([key]) => counts[key] === 0));
}
