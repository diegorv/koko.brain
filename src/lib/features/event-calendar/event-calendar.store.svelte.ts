/**
 * Reactive data of the Calendar tab: the projected index snapshot, the
 * pending-write overlay, the undo history, the load state and the dated
 * tasks overlay.
 *
 * Derived values (merged and sorted events, the path map, the pending path
 * set and the split issue lists) are recomputed once at the end of every
 * method that changes their inputs, never per read, so `eventByPath` and
 * `isPending` are O(1) and getters return the same instances until the next
 * mutation.
 */

import { createEventHistory, followRename, remapPath as remapHistoryPath, type EventHistory } from './event-calendar-history.logic';
import { isActionableIssue, mergePending, prunePending, type PendingEventNote } from './event-calendar-event.logic';
import type { CalendarTask } from './event-calendar-tasks.logic';
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
/** Dated tasks from the latest task index read, sorted by due date. */
let tasks = $state.raw<CalendarTask[]>([]);

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
	/** The pending write held for `path`, or undefined. O(1). */
	pendingWrite(path: string): PendingWrite | undefined { return pending.get(path); },
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
	/** Dated tasks the calendar overlays, sorted by due date. */
	get tasks() { return tasks; },

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
	 * Marks the write at `path` as finished on disk. No-op when there is none
	 * or it is already settled, so a write keeps its first version clock and a
	 * rename tombstone left by `remapPath` never gains one (it must prune only
	 * once the snapshot drops its path).
	 * @param path - absolute note path
	 * @param versionAtSettle - `vaultIndexVersion` when the write finished
	 */
	settlePending(path: string, versionAtSettle: number) {
		const write = pending.get(path);
		if (!write || write.settled) return;
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
	 * Follows a renamed or restored note. The visible event at `from` (with any
	 * pending update or create already applied) becomes a `create` at `to` with
	 * no version clock, so it prunes only once the snapshot has `to`; it keeps
	 * the moved write's `settled` flag, and is settled when there was no write.
	 * A `delete` at `from` stays put, as moving it would hide `to`. `from`
	 * keeps a settled `delete` tombstone that prunes once the snapshot no
	 * longer contains it. History ops on `from` are re-pointed at `to`.
	 *
	 * Call it before putting any write at `to`: a write already held at `to`
	 * is kept and the event at `from` is not moved over it. A write still in
	 * flight when the rename lands must be settled at `to` afterwards;
	 * settling `from` hits the tombstone and is a no-op.
	 *
	 * With `outside` (a rename or move made outside the calendar, which writes
	 * no `event_title`), a title equal to `outside.fromBase` becomes
	 * `outside.toBase`, on the moved event and in the history (`followRename`).
	 * The `create` at `to` is then settled with a version clock instead: `to`
	 * may never enter the projection (a dot-folder, the system folder, a
	 * non-`.md` name), and a clockless overlay would stay there for good.
	 * @param outside - filename bases of `from` and `to` (without `.md`), and
	 *   the current `vaultIndexVersion`
	 */
	remapPath(from: string, to: string, outside?: { fromBase: string; toBase: string; version: number }) {
		if (from === to) return;
		const write = pending.get(from);
		const current = eventMap.get(from);
		const next = new Map(pending);
		if (current && !pending.has(to)) {
			const event = { ...plainEvent(current), path: to };
			if (outside) {
				if (event.title === outside.fromBase) event.title = outside.toBase;
				next.set(to, { kind: 'create', path: to, event, settled: true, settledAtVersion: outside.version });
			} else {
				next.set(to, { kind: 'create', path: to, event, settled: write ? write.settled : true });
			}
		}
		next.set(from, { kind: 'delete', path: from, settled: true });
		pending = next;
		history = outside ? followRename(history, from, to, outside.fromBase, outside.toBase) : remapHistoryPath(history, from, to);
		recompute();
	},

	/** Replaces the undo / redo history. */
	setHistory(value: EventHistory) { history = value; },

	/** Replaces the dated tasks (`tasksFromGroups` output). */
	setTasks(value: CalendarTask[]) { tasks = value; },

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
		tasks = [];
		recompute();
	},
};
