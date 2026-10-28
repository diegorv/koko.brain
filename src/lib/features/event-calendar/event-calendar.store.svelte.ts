/**
 * Reactive data of the Calendar tab: the projected index snapshot, the
 * pending-write overlay, the undo history and the load state.
 *
 * Derived values (merged and sorted events, the path map, the pending path
 * set and the split issue lists) are recomputed once at the end of every
 * method that changes their inputs, never per read, so `eventByPath` and
 * `isPending` are O(1) and getters return the same instances until the next
 * mutation.
 */

import { createEventHistory, remapPath as remapHistoryPath, type EventHistory } from './event-calendar-history.logic';
import { isActionableIssue, mergePending, prunePending, type PendingEventNote } from './event-calendar-event.logic';
import type { EventIssue, EventNote, EventProjection, PendingWrite } from './event-calendar.types';

/** Events projected from the latest index snapshot, before the overlay. */
let snapshot = $state.raw<EventNote[]>([]);
/** Issues projected from the latest index snapshot. */
let issues = $state.raw<EventIssue[]>([]);
/** Archived event notes left out of the latest snapshot. */
let archivedCount = $state(0);
/** `vaultIndexVersion` the latest snapshot was read at. */
let snapshotVersion = $state(0);
/** Writes the index may not reflect yet, one per path. Always reassigned, never mutated. */
let pending = $state.raw<Map<string, PendingWrite>>(new Map());
/** Undo / redo history of calendar changes. */
let history = $state.raw<EventHistory>(createEventHistory());
/** Message of the last failed load, or null. */
let loadError = $state<string | null>(null);
/** Whether a load is in progress. */
let loading = $state(false);

/** Cached: snapshot with the overlay applied, sorted. */
let events = $state.raw<PendingEventNote[]>([]);
/** Cached: `events` by path. */
let eventMap = $state.raw<Map<string, PendingEventNote>>(new Map());
/** Cached: paths that hold a pending write (rename tombstones included). */
let pendingSet = $state.raw<Set<string>>(new Set());
/** Cached: issues that count toward Needs attention. */
let attentionIssues = $state.raw<EventIssue[]>([]);
/** Cached: informational `unscheduled` issues. */
let unscheduledIssues = $state.raw<EventIssue[]>([]);

/** Orders events by date, start, end, title, then path. */
function compareEvents(a: EventNote, b: EventNote): number {
	if (a.date !== b.date) return a.date < b.date ? -1 : 1;
	if (a.start !== b.start) return a.start - b.start;
	if (a.end !== b.end) return a.end - b.end;
	if (a.title !== b.title) return a.title < b.title ? -1 : 1;
	return a.path < b.path ? -1 : a.path > b.path ? 1 : 0;
}

/** Rebuilds every cached value from the source state. */
function recompute(): void {
	const merged = mergePending(snapshot, [...pending.values()]).sort(compareEvents);
	events = merged;
	eventMap = new Map(merged.map((event) => [event.path, event]));
	pendingSet = new Set(pending.keys());
	attentionIssues = issues.filter((i) => isActionableIssue(i.reason));
	unscheduledIssues = issues.filter((i) => !isActionableIssue(i.reason));
}

/** Strips the overlay flag from a merged event. */
function plainEvent(event: PendingEventNote): EventNote {
	const { pending: _pending, ...rest } = event;
	return rest;
}

/** Reactive data store of the Calendar tab. */
export const eventCalendarStore = {
	/** Merged and sorted events the calendar renders. */
	get events() { return events; },
	/** Merged event at `path`, or undefined. O(1). */
	eventByPath(path: string): PendingEventNote | undefined { return eventMap.get(path); },
	/** Whether `path` holds a pending write. O(1). */
	isPending(path: string): boolean { return pendingSet.has(path); },
	/** Paths that hold a pending write. */
	get pendingPaths(): ReadonlySet<string> { return pendingSet; },
	/** Every issue of the latest snapshot. */
	get issues() { return issues; },
	/** Issues that count toward Needs attention (`isActionableIssue`). */
	get attentionIssues() { return attentionIssues; },
	/** Informational `unscheduled` issues. */
	get unscheduledIssues() { return unscheduledIssues; },
	/** Number of Needs-attention issues. */
	get attentionCount() { return attentionIssues.length; },
	/** Archived event notes left out of the latest snapshot. */
	get archivedCount() { return archivedCount; },
	/** Whether a load is in progress. */
	get isLoading() { return loading; },
	/** Message of the last failed load, or null. */
	get loadError() { return loadError; },
	/** `vaultIndexVersion` the latest snapshot was read at. */
	get snapshotVersion() { return snapshotVersion; },
	/** Undo / redo history. */
	get history() { return history; },
	/** Whether there is an op to undo. */
	get canUndo() { return history.undo.length > 0; },
	/** Whether there is an op to redo. */
	get canRedo() { return history.redo.length > 0; },

	/**
	 * Replaces the snapshot and drops the pending writes it has caught up with.
	 * @param projection - events, issues and archived count of the new snapshot
	 * @param version - `vaultIndexVersion` the snapshot was read at
	 */
	setSnapshot(projection: EventProjection, version: number) {
		snapshot = projection.events;
		issues = projection.issues;
		archivedCount = projection.archivedCount;
		snapshotVersion = version;
		pending = new Map(prunePending([...pending.values()], snapshot, version).map((w) => [w.path, w]));
		recompute();
	},

	/** Sets whether a load is in progress. */
	setLoading(value: boolean) { loading = value; },

	/** Sets the last load error; null clears it. */
	setLoadError(message: string | null) { loadError = message; },

	/** Adds a pending write, replacing any write already held for its path. */
	putPending(write: PendingWrite) {
		pending = new Map(pending).set(write.path, write);
		recompute();
	},

	/**
	 * Marks the write at `path` as finished on disk; no-op when there is none.
	 * @param path - absolute note path
	 * @param versionAtSettle - `vaultIndexVersion` when the write finished
	 */
	settlePending(path: string, versionAtSettle: number) {
		const write = pending.get(path);
		if (!write) return;
		pending = new Map(pending).set(path, { ...write, settled: true, settledAtVersion: versionAtSettle });
		recompute();
	},

	/** Removes the pending write at `path` (a failed or abandoned write). */
	dropPending(path: string) {
		if (!pending.has(path)) return;
		const next = new Map(pending);
		next.delete(path);
		pending = next;
		recompute();
	},

	/**
	 * Follows a renamed or restored note. The write at `from` moves to `to`
	 * (a visible event without one becomes a settled `create` at `to`, which
	 * prunes once the snapshot has `to`); a `delete` at `from` stays put, as
	 * moving it would hide `to`. `from` keeps a settled `delete` tombstone
	 * that prunes once the snapshot no longer contains it. History ops on
	 * `from` are re-pointed at `to`.
	 */
	remapPath(from: string, to: string) {
		if (from === to) return;
		const write = pending.get(from);
		const current = eventMap.get(from);
		const next = new Map(pending);
		if (write?.kind === 'update') next.set(to, { ...write, path: to });
		else if (write?.kind === 'create') next.set(to, { ...write, path: to, event: { ...write.event, path: to } });
		else if (!write && current) next.set(to, { kind: 'create', path: to, event: { ...plainEvent(current), path: to }, settled: true });
		next.set(from, { kind: 'delete', path: from, settled: true });
		pending = next;
		history = remapHistoryPath(history, from, to);
		recompute();
	},

	/** Replaces the undo / redo history. */
	setHistory(value: EventHistory) { history = value; },

	/** Returns every field to its initial value. */
	reset() {
		snapshot = [];
		issues = [];
		archivedCount = 0;
		snapshotVersion = 0;
		pending = new Map();
		history = createEventHistory();
		loadError = null;
		loading = false;
		recompute();
	},
};
