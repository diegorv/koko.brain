/**
 * Service of the Calendar tab. Read side: projects the vault entries snapshot
 * and the dated tasks of the task index into `eventCalendarStore`, opens and
 * closes the singleton Calendar tab, runs the clock that keeps "today"
 * current, and resets the two event-calendar stores. Write side: changes existing events (move, resize, edit with
 * rename) through `updateNoteFrontmatter`, and creates, duplicates, deletes
 * and restores event notes through the note owners (`createTypedNote`,
 * `createFile`, `deleteItem`, `restoreItem`), behind a per-path queue, with
 * the pending overlay, rollback and undo / redo of those changes.
 */

import dayjs from 'dayjs';
import { invoke } from '@tauri-apps/api/core';
import { exists, readDir, readTextFile } from '@tauri-apps/plugin-fs';
import { tick as svelteTick } from 'svelte';
import { toast } from 'svelte-sonner';
import { EVENT_CALENDAR_VIRTUAL_PATH, findTabIndex } from '$lib/core/editor/editor.logic';
import { openFileInEditor, saveFileByPath } from '$lib/core/editor/editor.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { generateUniqueName, getFileName, getParentPath, getRelativePath } from '$lib/core/filesystem/fs.logic';
import { createFile, deleteItem, renameItem } from '$lib/core/filesystem/fs.service';
import { registerPathChangeConsumer } from '$lib/core/filesystem/path-change.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { restoreItem } from '$lib/core/trash/trash.service';
import { trashStore } from '$lib/core/trash/trash.store.svelte';
import type { TrashItem } from '$lib/core/trash/trash.types';
import { getVaultEntries } from '$lib/core/vault/vault-entries.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { FrontmatterWriteError, updateNoteFrontmatter, type FrontmatterWriteReason } from '$lib/features/properties/frontmatter-write.service';
import { detectLossyFrontmatter, extractBody, parseFrontmatterProperties, rebuildContent } from '$lib/features/properties/properties.logic';
import { createTypedNote } from '$lib/features/type-definitions/type-definitions.service';
import { typeDefinitionsStore } from '$lib/features/type-definitions/type-definitions.store.svelte';
import type { FileTaskGroupV2, NoteEntryV2 } from '$lib/types/vault-v2.types';
import { error } from '$lib/utils/debug';
import { applyEventDraft, applyEventFields, eventFileBase, eventState, eventsFromEntries, prunePending, resolveEventTypeName, sameEventState } from './event-calendar-event.logic';
import type { EventTiming } from './event-calendar-drag.logic';
import { planTitleChange, type EventFormPatch } from './event-calendar-form.logic';
import { tasksFromGroups } from './event-calendar-tasks.logic';
import { dropPath, pushOp, refuseOp, removeOp, takeRedo, takeUndo } from './event-calendar-history.logic';
import { eventCalendarStore } from './event-calendar.store.svelte';
import { defaultCreateSlot, focusViewFor } from './event-calendar-view.logic';
import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
import type { CalendarViewMode, EventDraft, EventNote, EventPatch, EventState, HistoryOp } from './event-calendar.types';

/** How often the mounted view's clock re-reads the system time. */
const CLOCK_INTERVAL_MS = 30_000;

/** Bumped by every load and every reset; a load writes only while it still holds the latest value. */
let loadToken = 0;

/** Projection inputs of the snapshot in `eventCalendarStore`, or null while it holds none. */
let storeProjectionKey: string | null = null;

/** `loadToken` of the dated tasks: bumped by every task load and every reset. */
let taskLoadToken = 0;

/** Ids of the "Event deleted" toasts shown since the last reset; their Undo belongs to that vault. */
const deleteToasts = new Set<string | number>();

/** Number of live clock acquirers. */
let clockRefs = 0;
/** Interval of the running clock, or null while nobody holds it. */
let clockTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Projects the current vault entries snapshot into `eventCalendarStore`.
 * Latest wins: a result that lands after a newer load, a reset or a vault
 * switch is discarded; a load stale only by a vault switch still clears
 * `isLoading`. The snapshot is memoized per index version, so a
 * re-projection after a settings change costs no IPC.
 * @throws the IPC error, after logging it and setting `loadError`; events
 *   are left untouched
 */
export async function loadEvents(): Promise<void> {
	const token = ++loadToken;
	const vaultPath = vaultStore.path;
	const version = vaultStore.vaultIndexVersion;
	const isCurrent = () => token === loadToken && vaultStore.path === vaultPath;
	eventCalendarStore.setLoading(true);
	try {
		const entries = await getVaultEntries();
		if (!isCurrent()) {
			// Stale by vault switch only: no newer load or reset owns the flag.
			if (token === loadToken) eventCalendarStore.setLoading(false);
			return;
		}
		const options = projectionOptions();
		const projection = eventsFromEntries(entries, options);
		eventCalendarStore.setSnapshot(projection, version);
		storeProjectionKey = JSON.stringify(options);
		eventCalendarStore.setLoadError(null);
		eventCalendarStore.setLoading(false);
	} catch (err) {
		error('EVENT-CALENDAR', 'loadEvents failed:', err);
		if (isCurrent()) {
			eventCalendarStore.setLoadError(err instanceof Error ? err.message : String(err));
			eventCalendarStore.setLoading(false);
		} else if (token === loadToken) {
			eventCalendarStore.setLoading(false);
		}
		throw err;
	}
}

/**
 * Reads the Rust task index (`get_all_tasks_v2`, the IPC the Tasks view
 * uses, without its section-tag filter) and stores its dated tasks in
 * `eventCalendarStore.tasks`. Latest wins: a result or a failure that lands
 * after a newer task load, a reset or a vault switch is discarded (the
 * failure is still logged), so only the current load reaches the caller.
 * @throws the IPC error of the current load, after logging it; the tasks are
 *   left untouched
 */
export async function loadCalendarTasks(): Promise<void> {
	const token = ++taskLoadToken;
	const vaultPath = vaultStore.path;
	const isCurrent = () => token === taskLoadToken && vaultStore.path === vaultPath;
	try {
		const groups = await invoke<FileTaskGroupV2[]>('get_all_tasks_v2');
		if (!isCurrent()) return;
		eventCalendarStore.setTasks(tasksFromGroups(groups));
	} catch (err) {
		error('EVENT-CALENDAR', 'loadCalendarTasks failed:', err);
		if (isCurrent()) throw err;
	}
}

/**
 * Opens or focuses the Calendar tab, creating it when absent.
 * @param options.date - day key to show; moves the view store there (closes the popover)
 * @param options.view - view to show; switches the view store (closes the popover).
 *   The `defaultView` setting is applied first, so the tab's first mount does
 *   not replace this view with the default.
 */
export function openEventCalendarTab(options: { date?: string; view?: CalendarViewMode } = {}): void {
	if (options.date !== undefined) eventCalendarViewStore.setDate(options.date);
	if (options.view !== undefined) {
		eventCalendarViewStore.initFromSettings();
		eventCalendarViewStore.setView(options.view);
	}
	const existingIndex = findTabIndex(editorStore.tabs, EVENT_CALENDAR_VIRTUAL_PATH);
	if (existingIndex >= 0) {
		editorStore.setActiveIndex(existingIndex);
		return;
	}
	editorStore.addTab({
		path: EVENT_CALENDAR_VIRTUAL_PATH,
		name: 'Calendar',
		content: '',
		savedContent: '',
		fileType: 'event-calendar',
	});
}

/** Closes the Calendar tab if it exists. */
export function closeEventCalendarTab(): void {
	const index = findTabIndex(editorStore.tabs, EVENT_CALENDAR_VIRTUAL_PATH);
	if (index >= 0) {
		editorStore.removeTab(index);
	}
}

/** Toggles the Calendar tab: opens if closed, closes if active, focuses if open but not active. */
export function toggleEventCalendarTab(): void {
	const existingIndex = findTabIndex(editorStore.tabs, EVENT_CALENDAR_VIRTUAL_PATH);
	if (existingIndex < 0) {
		openEventCalendarTab();
	} else if (existingIndex === editorStore.activeIndex) {
		editorStore.removeTab(existingIndex);
	} else {
		editorStore.setActiveIndex(existingIndex);
	}
}

/** Projection behind `findCalendarEvent`, kept while the snapshot and the projection inputs are unchanged. */
let lookupMemo: { entries: NoteEntryV2[]; key: string; events: EventNote[]; byPath: Map<string, EventNote> } | null = null;

/** Inputs of `eventsFromEntries` for the current vault and settings. */
function projectionOptions() {
	const settings = settingsStore.eventCalendar;
	return {
		defaults: { defaultDurationMinutes: settings.defaultDurationMinutes, defaultColor: settings.defaultColor },
		typeName: settings.eventTypeName,
		vaultPath: vaultStore.path,
		systemFolder: settingsStore.templates.systemFolder,
	};
}

/** Strips the store's `pending` flag. */
function withoutPending({ pending: _pending, ...event }: EventNote & { pending?: boolean }): EventNote {
	return event;
}

/**
 * The calendar event at `path` and the events around it. The loaded store
 * answers only while it holds the current index version and projection
 * inputs: it reloads only while the Calendar view is mounted, so it goes
 * stale once another tab is active. A pending write in the store still wins
 * over a stale store while a reload would keep it (`prunePending` against
 * the snapshot), so a move in flight shows its new day, and a rename or
 * delete tombstone finds nothing at the old path until it expires. Otherwise
 * the vault entries snapshot is projected once per index version and
 * settings.
 * @throws the IPC error of the snapshot read
 */
async function lookupCalendarEvent(path: string): Promise<{ event: EventNote | null; events: EventNote[] }> {
	const options = projectionOptions();
	const key = JSON.stringify(options);
	if (storeProjectionKey === key && eventCalendarStore.snapshotVersion === vaultStore.vaultIndexVersion) {
		const loaded = eventCalendarStore.eventByPath(path);
		return { event: loaded ? withoutPending(loaded) : null, events: eventCalendarStore.events };
	}
	const entries = await getVaultEntries();
	if (!lookupMemo || lookupMemo.entries !== entries || lookupMemo.key !== key) {
		const { events } = eventsFromEntries(entries, options);
		lookupMemo = { entries, key, events, byPath: new Map(events.map((event) => [event.path, event])) };
	}
	// A stale store never prunes, so a write counts only while a reload at the
	// current version would keep it; an expired one defers to the snapshot.
	const write = eventCalendarStore.pendingWrite(path);
	const isPending = write !== undefined && prunePending([write], lookupMemo.events, vaultStore.vaultIndexVersion).length > 0;
	const pending = isPending ? eventCalendarStore.eventByPath(path) : undefined;
	// A pending path the store does not show is a tombstone: the snapshot still
	// lists the note the calendar renamed or deleted away.
	if (isPending && !pending) return { event: null, events: lookupMemo.events };
	if (pending) {
		const event = withoutPending(pending);
		return { event, events: [...lookupMemo.events.filter((e) => e.path !== path), event] };
	}
	return { event: lookupMemo.byPath.get(path) ?? null, events: lookupMemo.events };
}

/**
 * The calendar event at `path`, whether or not the Calendar tab has loaded.
 * A current store answers (with its pending writes); otherwise the vault
 * entries snapshot is projected once per index version and settings.
 * @param path - absolute note path
 * @returns the event, or null when the note is not a renderable event
 *   (not event-typed, archived, invalid or dateless)
 * @throws the IPC error of the snapshot read
 */
export async function findCalendarEvent(path: string): Promise<EventNote | null> {
	return (await lookupCalendarEvent(path)).event;
}

/**
 * Opens the Calendar on the day of the event at `path` and asks the view to
 * focus and pulse its block. Keeps the current view (the `defaultView`
 * setting on first open) unless it would not show the block, then shows the
 * day view (`focusViewFor`). The day is the one the index has: the version
 * bump is throttled, so for ~2-10 s after a date edited in the note body it
 * can still be the old day.
 * @param path - absolute note path
 * @returns false, with nothing changed, when the note is not a calendar event
 * @throws the IPC error of the snapshot read
 */
export async function openEventInCalendar(path: string): Promise<boolean> {
	const { event, events } = await lookupCalendarEvent(path);
	if (!event) return false;
	eventCalendarViewStore.initFromSettings();
	const s = settingsStore.eventCalendar;
	const view = focusViewFor(eventCalendarViewStore.view, event, events, s.weekStartsOn, s.showWeekends);
	openEventCalendarTab({ date: event.date, view });
	eventCalendarViewStore.requestFocus(event.path);
	return true;
}

/**
 * Opens the Calendar tab and the create dialog at the default slot: now,
 * rounded, on today; `dayStartHour` on any other focused day. The clock
 * only ticks while the view is mounted, so "now" is read fresh first.
 */
export function openNewEventDialog(): void {
	openEventCalendarTab();
	tick();
	const s = settingsStore.eventCalendar;
	const slot = defaultCreateSlot(
		eventCalendarViewStore.focusedDate,
		eventCalendarViewStore.todayKey,
		eventCalendarViewStore.nowMinutes,
		s.dayStartHour,
		s.defaultDurationMinutes,
	);
	eventCalendarViewStore.openDialog({ mode: 'create', ...slot });
}

/** Sets the view store's clock to the current system time. */
function tick(): void {
	eventCalendarViewStore.setNow(Date.now());
}

/**
 * Holds the calendar clock, which keeps `eventCalendarViewStore.nowMs`
 * current across midnight and sleep: a tick on first acquire, every 30 s,
 * and on window `focus` and document `visibilitychange`. Ref-counted; the
 * last release stops it. The mounted view owns it and no reset touches it.
 * @returns an idempotent release
 */
export function acquireCalendarClock(): () => void {
	if (clockRefs === 0) {
		tick();
		clockTimer = setInterval(tick, CLOCK_INTERVAL_MS);
		window.addEventListener('focus', tick);
		document.addEventListener('visibilitychange', tick);
	}
	clockRefs += 1;
	let released = false;
	return () => {
		if (released) return;
		released = true;
		clockRefs = Math.max(0, clockRefs - 1);
		if (clockRefs > 0) return;
		if (clockTimer !== null) clearInterval(clockTimer);
		clockTimer = null;
		window.removeEventListener('focus', tick);
		document.removeEventListener('visibilitychange', tick);
	};
}

/**
 * Resets the two event-calendar stores, discards any load in flight and
 * bumps the write generation, so a write still in flight leaves the stores
 * alone when it resolves, and drops the `findCalendarEvent` projection.
 * Dismisses the "Event deleted" toasts, whose Undo targets the previous
 * vault. The write queue is kept: a later write to the same path still waits
 * for the one in flight. Leaves the clock and the editor tabs alone.
 */
export function resetEventCalendar(): void {
	loadToken += 1;
	taskLoadToken += 1;
	writeGeneration += 1;
	lookupMemo = null;
	storeProjectionKey = null;
	for (const id of deleteToasts) toast.dismiss(id);
	deleteToasts.clear();
	eventCalendarStore.reset();
	eventCalendarViewStore.reset();
}

/** Minutes in a day: the range an all-day event covers. */
const DAY_MINUTES = 1440;

/** Extension of an event note's filename. */
const NOTE_EXT = '.md';

/** Tail of the write queue per path; deleted when it settles while still the tail. */
const writeTails = new Map<string, Promise<void>>();

/**
 * Queue key of `createEvent`, which has no path until `createTypedNote`
 * plans it. Not a valid absolute path, so no note write shares it.
 */
const CREATE_QUEUE_KEY = '\0create';

/**
 * `from` paths of the renames and deletes the calendar itself is running. The
 * path-change consumer skips them: the write that runs a rename remaps the
 * stores itself, and a delete keeps the ops its undo restores.
 */
const ownPathChanges = new Set<string>();

/** Bumped by `resetEventCalendar`; a write applies its store changes only while it holds the latest value. */
let writeGeneration = 0;

/**
 * Tail of the undo / redo queue. Each undo or redo takes its op only once the
 * previous one has settled, so it sees the history a rename has remapped.
 */
let historyTail: Promise<unknown> = Promise.resolve();

/**
 * Tail of the intake: the turns in which an undo or redo takes its op and
 * claims its path, and the writes started while such a turn was outstanding.
 * Turns run in call order, so an undo keeps its place relative to writes
 * started after it. Never rejects.
 */
let intake: Promise<void> = Promise.resolve();

/** Number of intake turns that have not run yet; writes skip the intake at 0. */
let intakeDepth = 0;

/** Label of a recorded calendar change. */
export type EventChangeLabel = HistoryOp['label'];

/** Label of a recorded `update` op. */
export type EventUpdateLabel = Extract<HistoryOp, { kind: 'update' }>['label'];

/** Outcome of `undoEventChange` / `redoEventChange`. */
export interface EventChangeResult {
	/**
	 * `done`: applied. `refused`: the note changed since, the op was dropped.
	 * `vanished`: the note is gone from its path, every op on it was dropped.
	 * `empty`: nothing to undo or redo.
	 */
	status: 'done' | 'refused' | 'vanished' | 'empty';
	/** Label of the op, or null for `empty`. */
	label: EventChangeLabel | null;
	/** The note a `refused` op targets while it is still on disk, for "Open note"; absent otherwise. */
	path?: string;
	/** Set on a `refused` restore whose Trash entry is gone (the note did not change). */
	reason?: 'not-in-trash';
}

/** Options of `updateEventFields`. */
export interface UpdateEventOptions {
	/** Label of the recorded op. */
	label: EventUpdateLabel;
	/** Whether to push an undo op; default true. */
	record?: boolean;
}

/** Makes `promise` the tail of `path`'s queue, chained after the current tail. */
function holdPath(path: string, promise: Promise<unknown>): void {
	const previous = writeTails.get(path);
	const tail = Promise.allSettled([previous, promise]).then(() => {});
	writeTails.set(path, tail);
	void tail.then(() => {
		if (writeTails.get(path) === tail) writeTails.delete(path);
	});
}

/**
 * Joins `path`'s queue from inside a task queued on another path: resolves
 * once every write already queued on `path` has settled, and holds the
 * writes queued there later until the returned release runs.
 */
async function joinPath(path: string): Promise<() => void> {
	const previous = writeTails.get(path);
	let release!: () => void;
	holdPath(path, new Promise<void>((resolve) => (release = resolve)));
	await previous;
	return release;
}

/** A check that tells whether `resetEventCalendar` ran since it was made. */
function generationCheck(): () => boolean {
	const generation = writeGeneration;
	return () => generation === writeGeneration;
}

/** Chains `task` on `path`'s queue now, after every write already queued there. */
function claimPath<T>(path: string, task: (isCurrent: () => boolean) => Promise<T>, isCurrent: () => boolean): Promise<T> {
	const previous = writeTails.get(path) ?? Promise.resolve();
	const run = previous.then(() => task(isCurrent));
	holdPath(path, run);
	return run;
}

/**
 * Runs `start` at its turn on the intake, after every earlier turn and after
 * `after`, and returns what it starts.
 */
function takeTurn<T>(start: () => Promise<T>, after: Promise<unknown> = Promise.resolve()): Promise<T> {
	intakeDepth += 1;
	const turn = Promise.all([intake, after]).then(() => {
		intakeDepth -= 1;
		return { started: start() };
	});
	intake = turn.then(
		() => {},
		() => {},
	);
	return turn.then(({ started }) => started);
}

/**
 * Runs `task` after every write already queued on `path`, whatever their
 * outcome, and after any undo or redo started before it has claimed its own
 * path. `isCurrent` tells the task whether `resetEventCalendar` ran since it
 * was enqueued.
 */
function enqueue<T>(path: string, task: (isCurrent: () => boolean) => Promise<T>): Promise<T> {
	const isCurrent = generationCheck();
	if (intakeDepth === 0) return claimPath(path, task, isCurrent);
	return takeTurn(() => claimPath(path, task, isCurrent));
}

/**
 * Resolves once every write queued so far has settled. Never rejects; the
 * vault-switch and window-close paths await it before tearing down.
 */
export async function drainEventCalendarWrites(): Promise<void> {
	// Writes waiting on the intake are not in `writeTails` until their turn.
	await intake;
	await Promise.allSettled([historyTail, ...writeTails.values()]);
}

/** Filename base of `path` (its name without `.md`). */
function fileBase(path: string): string {
	const name = getFileName(path);
	return name.endsWith(NOTE_EXT) ? name.slice(0, -NOTE_EXT.length) : name;
}

/** The rendered event at `path` without its overlay flag, or a `missing` error. */
function requireEvent(path: string): EventNote {
	const event = eventCalendarStore.eventByPath(path);
	if (!event) throw new FrontmatterWriteError('missing', path);
	const { pending: _pending, ...plain } = event;
	return plain;
}

/**
 * The state an event shows after `patch`, the way `applyEventFields` writes
 * it: all-day spans 0..1440, a `start` / `end` without `allDay: true` clears
 * all-day, a blank location reads as empty, and a span keeps its `endDate`
 * (no patch reaches the timing of a span, see `writeEvent`).
 */
function patchedState(before: EventState, patch: EventPatch, title: string): EventState {
	const allDay = patch.allDay ?? (patch.start !== undefined || patch.end !== undefined ? false : before.allDay);
	return {
		title,
		date: patch.date ?? before.date,
		...(before.endDate === undefined ? {} : { endDate: before.endDate }),
		allDay,
		start: allDay ? 0 : (patch.start ?? before.start),
		end: allDay ? DAY_MINUTES : (patch.end ?? before.end),
		color: patch.color ?? before.color,
		location: patch.location === undefined ? before.location : patch.location.trim() === '' ? '' : patch.location,
	};
}

/** The field patch that turns `from` into `to` (the title is planned separately). */
function patchBetween(from: EventState, to: EventState): EventPatch {
	const patch: EventPatch = {};
	if (to.date !== from.date) patch.date = to.date;
	if (to.allDay) {
		if (!from.allDay) patch.allDay = true;
	} else if (from.allDay || to.start !== from.start || to.end !== from.end) {
		patch.allDay = false;
		patch.start = to.start;
		patch.end = to.end;
	}
	if (to.color !== from.color) patch.color = to.color;
	if (to.location !== from.location) patch.location = to.location;
	return patch;
}

/** The patch keys that change when an event happens; a read-only span refuses them. */
const TIMING_KEYS = ['date', 'start', 'end', 'allDay'] as const satisfies readonly (keyof EventPatch)[];

/** Runs `change`, a rename or delete of `path`, marked as the calendar's own (`ownPathChanges`). */
async function asOwnPathChange<T>(path: string, change: () => Promise<T>): Promise<T> {
	ownPathChanges.add(path);
	try {
		return await change();
	} finally {
		ownPathChanges.delete(path);
	}
}

/**
 * Follows a rename, move or delete made outside the calendar (file explorer,
 * a drag in the tree) for every path the calendar knows at or under `from`:
 * a rename or move remaps the overlay, the history and the view store the
 * way the calendar's own rename does, with untitled titles following the new
 * filename and the moved event expiring on the usual version clock; a delete
 * drops the path's ops, as an undo that finds the note gone would, and hides
 * its event behind a settled `delete` tombstone until the index drops it.
 *
 * Known limitation: a calendar write still in flight on `from` when the
 * change lands settles and records its op at `from`, not at the new path.
 * The window is one frontmatter write.
 */
function followPathChange(from: string, to: string | null): void {
	if (ownPathChanges.has(from)) return;
	const prefix = `${from}/`;
	const { undo, redo } = eventCalendarStore.history;
	const paths = new Set<string>();
	for (const path of [...eventCalendarStore.events.map((event) => event.path), ...undo.map((op) => op.path), ...redo.map((op) => op.path)]) {
		if (path === from || path.startsWith(prefix)) paths.add(path);
	}
	for (const path of paths) {
		if (to === null) {
			eventCalendarStore.setHistory(dropPath(eventCalendarStore.history, path));
			if (eventCalendarStore.eventByPath(path)) eventCalendarStore.putPending({ kind: 'delete', path, settled: true });
			continue;
		}
		const target = to + path.slice(from.length);
		eventCalendarStore.remapPath(path, target, { fromBase: fileBase(path), toBase: fileBase(target), version: vaultStore.vaultIndexVersion });
		eventCalendarViewStore.remapPath(path, target);
	}
}

/**
 * Registers the calendar as a path-change consumer, so its undo history
 * follows notes renamed, moved or deleted elsewhere. Returns an unregister
 * function; `initializeVault` registers it and `teardownVault` unregisters it.
 */
export function registerEventCalendarPathChangeConsumer(): () => void {
	return registerPathChangeConsumer({ name: 'event-calendar', pathChanged: followPathChange });
}

/** Records `op` in the store's history. */
function record(op: HistoryOp): void {
	eventCalendarStore.setHistory(pushOp(eventCalendarStore.history, op));
}

/**
 * The one write path of an existing event. With `planTitle` and a new title
 * it plans the title (`planTitleChange` over the folder's names), renames the
 * note first when the plan says so and remaps both stores; then it overlays
 * `after`, writes the fields, settles the overlay and records the op. A field
 * failure after a rename keeps the rename visible and records an op that
 * covers only the rename. Store changes are skipped once the generation is
 * stale. A timing patch on a read-only span is refused before anything is
 * written: the calendar never writes `end_date`, so moving `date` alone
 * would desync the span.
 * @returns the note's final path
 * @throws `EventCalendarError('read-only')`, or the read, rename or write
 *   error, after rolling the overlay back
 */
async function writeEvent(
	path: string,
	current: EventNote,
	after: EventState,
	patch: EventPatch,
	options: { label: EventUpdateLabel; record: boolean; planTitle: boolean },
	isCurrent: () => boolean,
): Promise<string> {
	const before = eventState(current);
	if (current.readOnly && TIMING_KEYS.some((key) => patch[key] !== undefined)) throw new EventCalendarError('read-only');
	const fields: EventPatch = { ...patch };
	let target = path;
	if (options.planTitle && after.title !== before.title) {
		const siblings = (await readDir(getParentPath(path))).map((entry) => entry.name);
		const plan = planTitleChange(fileBase(path), after.title, siblings);
		fields.eventTitle = plan.eventTitle;
		if (plan.renameTo !== null) {
			if (!isCurrent()) throw new FrontmatterWriteError('vault-changed', path);
			const renameTo = plan.renameTo;
			const renamed = await asOwnPathChange(path, () => renameItem(path, renameTo));
			if (renamed === null) {
				throw new Error(`Could not rename the note to "${plan.renameTo}": a note with that name may already exist`);
			}
			target = renamed;
			if (isCurrent()) {
				eventCalendarStore.remapPath(path, target);
				eventCalendarViewStore.remapPath(path, target);
			}
		}
	}

	// A renamed note is not in the snapshot yet: a `create` keeps its snippet
	// and readOnly flag, which a bare `update` overlay would render as '' and false.
	const renamedEvent: EventNote = { ...current, ...after, path: target };
	if (isCurrent()) {
		eventCalendarStore.putPending(
			target === path
				? { kind: 'update', path: target, state: after, settled: false }
				: { kind: 'create', path: target, event: renamedEvent, settled: false },
		);
	}
	const write = updateNoteFrontmatter(target, (props) => applyEventFields(props, fields));
	// A later write queued on the new path must wait for this one.
	if (target !== path) holdPath(target, write);
	try {
		await write;
	} catch (caught) {
		let err = caught;
		// The writer passes read errors through as-is: a note deleted on disk
		// before the index caught up surfaces as `missing`, not as the OS message.
		if (!(err instanceof FrontmatterWriteError) && !(await exists(target).catch(() => true))) {
			err = new FrontmatterWriteError('missing', target);
		}
		error('EVENT-CALENDAR', 'event write failed:', target, caught);
		if (isCurrent()) {
			if (target === path) {
				eventCalendarStore.dropPending(target);
			} else {
				// The rename landed: keep it visible and undoable on its own.
				const renamedOnly: EventState = { ...before, title: before.title === fileBase(path) ? fileBase(target) : before.title };
				eventCalendarStore.putPending({
					kind: 'create',
					path: target,
					event: { ...current, ...renamedOnly, path: target },
					settled: true,
					settledAtVersion: vaultStore.vaultIndexVersion,
				});
				if (options.record) record({ kind: 'update', label: options.label, path: target, before, after: renamedOnly });
			}
		}
		throw err;
	}
	if (!isCurrent()) return target;
	// After a rename this settles the `create` at `target` with a version clock:
	// Rust indexes the rename before the field write, so it stays until the
	// snapshot shows `after` (or the clock runs out), not just until `target` appears.
	eventCalendarStore.settlePending(target, vaultStore.vaultIndexVersion);
	if (options.record) record({ kind: 'update', label: options.label, path: target, before, after });
	return target;
}

/**
 * Writes calendar fields to an existing event, queued per path. The change
 * shows at once through the pending overlay, rolls back on failure and is
 * recorded as an `update` op unless `record` is false. Never renames: an
 * `eventTitle` patch only changes the display title.
 * @param path - absolute path of the event note
 * @param patch - fields to change
 * @param options - op label and whether to record it
 * @throws `FrontmatterWriteError` (refusal, `save-failed`, `vault-changed`,
 *   `missing`, also when the calendar does not show `path`) or a read error
 */
export function updateEventFields(path: string, patch: EventPatch, options: UpdateEventOptions): Promise<void> {
	return enqueue(path, async (isCurrent) => {
		const current = requireEvent(path);
		const before = eventState(current);
		const title = typeof patch.eventTitle === 'string' ? patch.eventTitle : patch.eventTitle === null ? fileBase(path) : before.title;
		const after = patchedState(before, patch, title);
		await writeEvent(path, current, after, patch, { label: options.label, record: options.record ?? true, planTitle: false }, isCurrent);
	});
}

/**
 * Moves an event to a new day and time range (a drag), as a 'Move event' op.
 * @param path - absolute path of the event note
 * @param timing - new day, start and end
 */
export function moveEvent(path: string, timing: EventTiming): Promise<void> {
	return updateEventFields(path, { date: timing.date, start: timing.start, end: timing.end }, { label: 'Move event' });
}

/**
 * Moves an event to another day (a drag in the month grid or the all-day
 * lane), as a 'Move event' op. Writes `date` only: `start`, `end` and
 * `all_day` stay as they are, which a `moveEvent` timing would not keep for
 * an all-day event.
 * @param path - absolute path of the event note
 * @param date - new day key
 */
export function moveEventToDay(path: string, date: string): Promise<void> {
	return updateEventFields(path, { date }, { label: 'Move event' });
}

/**
 * Changes an event's end (a resize), as a 'Resize event' op.
 * @param path - absolute path of the event note
 * @param end - new end in minutes from midnight
 */
export function resizeEvent(path: string, end: number): Promise<void> {
	return updateEventFields(path, { end }, { label: 'Resize event' });
}

/**
 * Saves the edit dialog as one queued unit and one 'Edit event' op. A title
 * change is planned against the folder's names: the note is renamed first
 * when the filename changes (numbered for a taken name, never for a
 * case-only change), then the fields are written on the final path with
 * `event_title` set whenever the title differs from the filename base.
 * @param path - absolute path of the event note
 * @param patch - changed fields, plus the trimmed `title` when it changed
 * @returns the note's final path
 * @throws a rename race ("a note with that name may already exist"), a
 *   `FrontmatterWriteError` or a read error; a field failure after a
 *   successful rename still records the rename
 */
export function editEvent(path: string, patch: EventFormPatch): Promise<string> {
	return enqueue(path, async (isCurrent) => {
		const current = requireEvent(path);
		const before = eventState(current);
		const { title, ...fields } = patch;
		const after = patchedState(before, fields, title ?? before.title);
		return writeEvent(path, current, after, fields, { label: 'Edit event', record: true, planTitle: true }, isCurrent);
	});
}

/** Why a create, duplicate, restore or timing write was refused. */
export type EventCalendarErrorReason = 'not-in-trash' | 'template-lossy' | 'create-failed' | 'read-only';

/** Toast text per `EventCalendarError` reason. */
const CALENDAR_ERROR_MESSAGES: Record<EventCalendarErrorReason, string> = {
	'not-in-trash': 'Event is no longer in the Trash',
	'template-lossy': "The Event template's frontmatter has comments or nested values; fix it or remove the template from the Event type",
	'create-failed': 'Could not create the note; a note with the same name, possibly differing only in case, may exist',
	'read-only': 'This event has an end date or crosses midnight; change its date and time in the note',
};

/** A create, duplicate, restore or timing write the calendar refused; `toastEventError` shows its message. */
export class EventCalendarError extends Error {
	/** What went wrong; see `EventCalendarErrorReason`. */
	readonly reason: EventCalendarErrorReason;

	constructor(reason: EventCalendarErrorReason) {
		super(CALENDAR_ERROR_MESSAGES[reason]);
		this.name = 'EventCalendarError';
		this.reason = reason;
	}
}

/** Overlays a just-created note as a settled `create` with a version clock and records its op. */
function showCreated(event: EventNote, label: 'Create event' | 'Duplicate event'): void {
	eventCalendarStore.putPending({ kind: 'create', path: event.path, event, settled: true, settledAtVersion: vaultStore.vaultIndexVersion });
	record({ kind: 'create', label, path: event.path, state: eventState(event) });
}

/**
 * Creates an event note through `createTypedNote`, so it lands in the same
 * folder, with the same dedupe and template, as the type sidebar's
 * "New Event". The template is rendered for the draft's day, and refused
 * when its frontmatter would be rewritten lossily. Shows the note through
 * the overlay and records a 'Create event' op. Creates run one at a time,
 * and `drainEventCalendarWrites` waits for them.
 * @param draft - the new event (a validated form)
 * @returns the created note's path
 * @throws `EventCalendarError` (`template-lossy`, `create-failed`), or
 *   whatever else `createTypedNote` throws; no note is written then
 */
export function createEvent(draft: EventDraft): Promise<string> {
	// Queued so `drainEventCalendarWrites` waits for a create in flight.
	return enqueue(CREATE_QUEUE_KEY, (isCurrent) => createNow(draft, isCurrent));
}

/** Body of `createEvent`, run at its turn on the create queue. */
async function createNow(draft: EventDraft, isCurrent: () => boolean): Promise<string> {
	const typeName = resolveEventTypeName([...typeDefinitionsStore.typeMetadataMap.keys()], settingsStore.eventCalendar.eventTypeName);
	let plannedBase = '';
	let path: string;
	try {
		path = await createTypedNote({
			typeName,
			title: eventFileBase(draft.title),
			contextDate: dayjs(draft.date),
			buildContent: (base, target) => {
				if (detectLossyFrontmatter(base) !== null) throw new EventCalendarError('template-lossy');
				plannedBase = target.title;
				return applyEventDraft(base, draft, target.title, typeName);
			},
		});
	} catch (err) {
		error('EVENT-CALENDAR', 'createEvent failed:', err);
		if (err instanceof Error && err.message === 'create-failed') throw new EventCalendarError('create-failed');
		throw err;
	}
	if (isCurrent()) {
		// `event_title` is written whenever the title differs from the planned
		// base; only a same-instant name race moves the note off that base.
		const title = draft.title === plannedBase ? fileBase(path) : draft.title;
		showCreated(
			{
				path,
				title,
				date: draft.date,
				start: draft.allDay ? 0 : draft.start,
				end: draft.allDay ? DAY_MINUTES : draft.end,
				allDay: draft.allDay,
				color: draft.color,
				location: draft.location.trim() === '' ? '' : draft.location,
				snippet: '',
				readOnly: false,
			},
			'Create event',
		);
	}
	return path;
}

/**
 * Duplicates an event note into the same folder as "<title> (copy).md",
 * queued after the writes on `path` and on the copy's path, which a later
 * write there waits for in turn. The bytes come from the open tab when
 * there is one (unsaved edits included), else from disk, and are copied
 * unchanged, except that a note with `event_title` and safe frontmatter gets
 * `event_title: <title> (copy)`. Records a 'Duplicate event' op.
 * @param path - absolute path of the event note
 * @returns the copy's path
 * @throws `FrontmatterWriteError('missing')` when the calendar does not show
 *   `path`, `EventCalendarError('create-failed')`, or a read error
 */
export function duplicateEvent(path: string): Promise<string> {
	return enqueue(path, async (isCurrent) => {
		const current = requireEvent(path);
		const tab = editorStore.tabs.find((t) => t.path === path);
		const base = tab ? tab.content : await readTextFile(path);
		const copyTitle = `${current.title} (copy)`;
		const properties = parseFrontmatterProperties(base);
		const hasEventTitle = properties.some((p) => p.key === 'event_title');
		const rewrite = hasEventTitle && detectLossyFrontmatter(base) === null;
		const content = rewrite ? rebuildContent(applyEventFields(properties, { eventTitle: copyTitle }), extractBody(base)) : base;
		const parent = getParentPath(path);
		const fileName = `${eventFileBase(current.title)} (copy)${NOTE_EXT}`;
		// `createFile` picks its name from the same listing; joining that path's
		// queue first keeps a restore in flight there from landing on the copy.
		const planned = generateUniqueName(fileName, false, (await readDir(parent)).map((entry) => entry.name));
		const release = await joinPath(`${parent}/${planned}`);
		try {
			const copy = await createFile(parent, fileName, content);
			if (copy === null) throw new EventCalendarError('create-failed');
			if (isCurrent()) {
				// A lossy base keeps its `event_title`, so the copy shows the original title.
				const title = rewrite ? copyTitle : hasEventTitle ? current.title : fileBase(copy);
				showCreated({ ...current, path: copy, title }, 'Duplicate event');
			}
			return copy;
		} finally {
			release();
		}
	});
}

/**
 * Saves `path`'s tab, hides the event, moves the note to the Trash and
 * settles the overlay. Runs inside a claimed slot of `path`'s queue.
 * @returns the Trash entry id, when the newest entry is this note
 * @throws `FrontmatterWriteError('save-failed')` (nothing deleted) or a
 *   delete error (the overlay rolled back)
 */
async function deleteNow(path: string, isCurrent: () => boolean): Promise<string | undefined> {
	// `deleteItem` closes tabs without a dirty check and the Trash keeps only
	// the disk bytes, so an unsaved edit is saved first.
	if (!(await saveFileByPath(path))) throw new FrontmatterWriteError('save-failed', path);
	if (isCurrent()) eventCalendarStore.putPending({ kind: 'delete', path, settled: false });
	if (!(await asOwnPathChange(path, () => deleteItem(path)))) {
		if (isCurrent()) eventCalendarStore.dropPending(path);
		throw new Error('Could not move the note to the Trash');
	}
	if (isCurrent()) eventCalendarStore.settlePending(path, vaultStore.vaultIndexVersion);
	const newest = trashStore.items[0];
	const vaultPath = vaultStore.path;
	return newest && vaultPath && newest.originalPath === getRelativePath(vaultPath, path) ? newest.id : undefined;
}

/**
 * Moves an event note to the Trash, queued per path, and records a
 * 'Delete event' op that can restore it. A dirty tab is saved first, so the
 * Trash keeps the edit.
 * @param path - absolute path of the event note
 * @throws `FrontmatterWriteError` (`missing` when the calendar does not show
 *   `path`, `save-failed`) or an error when the note could not be trashed
 */
export function deleteEvent(path: string): Promise<void> {
	return enqueue(path, async (isCurrent) => {
		const current = requireEvent(path);
		const trashId = await deleteNow(path, isCurrent);
		if (isCurrent()) record({ kind: 'delete', label: 'Delete event', path, state: eventState(current), trashId });
	});
}

/** The Trash entry of `path`: the one with `trashId`, else the newest one whose original path matches. */
function findTrashEntry(path: string, trashId: string | undefined): TrashItem | undefined {
	const vaultPath = vaultStore.path;
	if (trashId !== undefined) {
		const byId = trashStore.items.find((item) => item.id === trashId);
		if (byId) return byId;
	}
	if (!vaultPath) return undefined;
	const relative = getRelativePath(vaultPath, path);
	let newest: TrashItem | undefined;
	for (const item of trashStore.items) {
		if (item.originalPath === relative && (!newest || item.trashedAt > newest.trashedAt)) newest = item;
	}
	return newest;
}

/**
 * The newest recorded `delete` op on `path`, on either stack; with `trashId`,
 * only the one that recorded that Trash entry.
 */
function findDeleteOp(path: string, trashId?: string): Extract<HistoryOp, { kind: 'delete' }> | undefined {
	const { undo, redo } = eventCalendarStore.history;
	for (const op of [...redo, ...undo].reverse()) {
		if (op.kind === 'delete' && op.path === path && (trashId === undefined || op.trashId === trashId)) return op;
	}
	return undefined;
}

/**
 * The history of the note `anchor` deleted: the ops on `path` recorded at or
 * before `anchor`, in recording order (the undo stack oldest first, then the
 * redo stack newest first), back to that note's start at `path`. A `create`
 * starts it and belongs to it; an earlier `delete` ended a different note,
 * so neither it nor anything before it belongs. Empty without an anchor.
 *
 * The walk sees only the calendar's own ops, so it misreads two cases: a
 * note that replaced an earlier one at the path outside the calendar (no
 * `delete` op between them) takes that note's ops, and a note the calendar deleted, restored outside it (the Trash
 * panel) and deleted again stops at that first `delete`, leaving its own
 * earlier ops on the old path. Their undo is then refused by the state
 * precondition, so they are lost rather than misapplied.
 */
function opsUpTo(path: string, anchor: HistoryOp | undefined): Set<HistoryOp> {
	const { undo, redo } = eventCalendarStore.history;
	const timeline = [...undo, ...[...redo].reverse()];
	const owned = new Set<HistoryOp>();
	for (let i = anchor ? timeline.indexOf(anchor) : -1; i >= 0; i--) {
		const op = timeline[i];
		if (op.path !== path) continue;
		if (op.kind === 'delete' && op !== anchor) break;
		owned.add(op);
		if (op.kind === 'create') break;
	}
	return owned;
}

/** `state` with a title read from `from`'s filename moved to `to`'s. */
function followFilename(state: EventState, from: string, to: string): EventState {
	return state.title === fileBase(from) ? { ...state, title: fileBase(to) } : state;
}

/**
 * Restores `path` from the Trash. A note restored under a suffixed path
 * moves its own ops there (`anchor` and the ops on `path` before it, back
 * to that note's start, see `opsUpTo`), and a create or delete op among them
 * whose title was its filename takes the new one. Later ops and the view
 * store stay on `path`: they belong to the note that now holds it, so a
 * delete tombstone at `path` is dropped. With a known `state`, the note
 * shows through a `create` overlay until the snapshot has its path; without
 * one, a same-path restore drops the delete tombstone at `path`.
 * @param anchor - the op that deleted the note, which the restore undoes
 * @param retire - op removed from the history once the restore succeeds,
 *   after its owned ops are known
 * @returns the restored path
 * @throws `EventCalendarError('not-in-trash')` before touching any store,
 *   or the restore error
 */
async function restoreNow(
	path: string,
	trashId: string | undefined,
	state: EventState | undefined,
	isCurrent: () => boolean,
	anchor: HistoryOp | undefined,
	retire?: HistoryOp,
): Promise<string> {
	const item = findTrashEntry(path, trashId);
	const vaultPath = vaultStore.path;
	if (!item || !vaultPath) throw new EventCalendarError('not-in-trash');
	const restored = await restoreItem(vaultPath, item);
	if (restored === null) throw new EventCalendarError('not-in-trash');
	if (!isCurrent()) return restored;
	const owned = restored === path ? new Set<HistoryOp>() : opsUpTo(path, anchor);
	if (retire) eventCalendarStore.setHistory(refuseOp(eventCalendarStore.history, retire));
	if (owned.size > 0) {
		const move = (op: HistoryOp): HistoryOp => {
			if (!owned.has(op)) return op;
			return op.kind === 'update' ? { ...op, path: restored } : { ...op, path: restored, state: followFilename(op.state, path, restored) };
		};
		const { history } = eventCalendarStore;
		eventCalendarStore.setHistory({ ...history, undo: history.undo.map(move), redo: history.redo.map(move) });
	}
	// The note is back at `path`, or another note holds it: either way a delete
	// tombstone there is stale. A same-path restore with a state replaces it below.
	const tombstone = eventCalendarStore.isPending(path) && !eventCalendarStore.eventByPath(path);
	if (tombstone && (restored !== path || !state)) eventCalendarStore.dropPending(path);
	if (state) {
		const { title } = followFilename(state, path, restored);
		eventCalendarStore.putPending({
			kind: 'create',
			path: restored,
			event: { path: restored, ...state, title, snippet: '', readOnly: state.endDate !== undefined },
			settled: true,
		});
	}
	return restored;
}

/**
 * Restores a deleted event note from the Trash, queued per path. Takes the
 * entry with `trashId`, else the newest one whose original path is `path`.
 * `restoreItem` re-indexes the note and may return a suffixed path when
 * `path` is taken again. With `trashId`, overlays the state of the delete op
 * that recorded it, else none.
 * @param path - absolute path the note had
 * @param trashId - Trash entry id recorded by the delete
 * @returns the restored path
 * @throws `EventCalendarError('not-in-trash')` (the Trash was emptied, or
 *   an unknown path) with every store untouched, or the restore error
 */
export function restoreDeletedEvent(path: string, trashId?: string): Promise<string> {
	return enqueue(path, (isCurrent) => {
		// An explicit id overlays only the state its own delete recorded.
		const op = findDeleteOp(path, trashId);
		return restoreNow(path, trashId ?? op?.trashId, op?.state, isCurrent, op);
	});
}

/**
 * The toast's Undo of a delete: restores the event and retires the delete
 * op, so Cmd+Z does not offer it again. The op stays when the restore fails.
 * @param path - absolute path the note had
 * @returns the restored path
 * @throws the same errors as `restoreDeletedEvent`
 */
export function undoDeleteEvent(path: string): Promise<string> {
	return enqueue(path, (isCurrent) => {
		const op = findDeleteOp(path);
		return restoreNow(path, op?.trashId, op?.state, isCurrent, op, op);
	});
}

/**
 * Applies a create or delete op, queued on its path. Deleting needs the note
 * to still show the op's state (else `refused`; gone: `vanished`);
 * restoring needs its Trash entry (else `refused`).
 */
function applyNoteOp(op: Exclude<HistoryOp, { kind: 'update' }>, direction: 'undo' | 'redo'): Promise<EventChangeResult> {
	const deletes = (op.kind === 'create') === (direction === 'undo');
	return claimPath(op.path, async (isCurrent) => {
		if (deletes) {
			const shown = eventCalendarStore.eventByPath(op.path);
			if (!shown || !(await exists(op.path))) {
				if (isCurrent()) eventCalendarStore.setHistory(dropPath(eventCalendarStore.history, op.path));
				return { status: 'vanished', label: op.label };
			}
			if (!sameEventState(eventState(shown), op.state)) {
				if (isCurrent()) eventCalendarStore.setHistory(refuseOp(eventCalendarStore.history, op));
				return { status: 'refused', label: op.label, path: op.path };
			}
			try {
				await deleteNow(op.path, isCurrent);
			} catch (err) {
				if (isCurrent()) eventCalendarStore.setHistory(refuseOp(eventCalendarStore.history, op));
				throw err;
			}
			return { status: 'done', label: op.label };
		}
		try {
			await restoreNow(op.path, op.kind === 'delete' ? op.trashId : undefined, op.state, isCurrent, op);
		} catch (err) {
			// `restoreNow` throws before any remap, so the op is still this reference.
			if (isCurrent()) eventCalendarStore.setHistory(refuseOp(eventCalendarStore.history, op));
			if (err instanceof EventCalendarError && err.reason === 'not-in-trash') return { status: 'refused', label: op.label, reason: 'not-in-trash' };
			throw err;
		}
		return { status: 'done', label: op.label };
	}, generationCheck());
}

/**
 * Runs one undo or redo after the previous one has settled, whatever its
 * outcome, at its turn on the intake: a write started after it waits until it
 * has claimed its path. One that starts after `resetEventCalendar` returns
 * `empty`.
 */
function applyHistory(direction: 'undo' | 'redo'): Promise<EventChangeResult> {
	const isCurrent = generationCheck();
	const run = takeTurn(
		() => (isCurrent() ? applyHistoryNow(direction) : Promise.resolve({ status: 'empty' as const, label: null })),
		historyTail,
	);
	historyTail = run.catch(() => {});
	return run;
}

/**
 * Takes an op off one stack and applies its other state, queued on its path.
 * Runs at its intake turn, so it claims the path at once (before its first await).
 */
async function applyHistoryNow(direction: 'undo' | 'redo'): Promise<EventChangeResult> {
	const taken = direction === 'undo' ? takeUndo(eventCalendarStore.history) : takeRedo(eventCalendarStore.history);
	if (!taken) return { status: 'empty', label: null };
	const { op } = taken;
	eventCalendarStore.setHistory(taken.history);
	if (op.kind !== 'update') return applyNoteOp(op, direction);
	const expected = direction === 'undo' ? op.after : op.before;
	const target = direction === 'undo' ? op.before : op.after;
	return claimPath(op.path, async (isCurrent) => {
		const shown = eventCalendarStore.eventByPath(op.path);
		if (!shown || !(await exists(op.path))) {
			if (isCurrent()) eventCalendarStore.setHistory(dropPath(eventCalendarStore.history, op.path));
			return { status: 'vanished', label: op.label };
		}
		const current = requireEvent(op.path);
		if (!sameEventState(eventState(current), expected)) {
			if (isCurrent()) eventCalendarStore.setHistory(refuseOp(eventCalendarStore.history, op));
			return { status: 'refused', label: op.label, path: op.path };
		}
		try {
			await writeEvent(op.path, current, target, patchBetween(eventState(current), target), { label: op.label, record: false, planTitle: true }, isCurrent);
		} catch (err) {
			// Not offered again. A rename before the failure has replaced the op
			// with a remapped copy that keeps its `before` / `after` objects.
			if (isCurrent()) {
				eventCalendarStore.setHistory(
					removeOp(eventCalendarStore.history, (candidate) => candidate === op || (candidate.kind === 'update' && candidate.before === op.before && candidate.after === op.after)),
				);
			}
			throw err;
		}
		return { status: 'done', label: op.label };
	}, generationCheck());
}

/**
 * Undoes the newest calendar change when the note still shows its result.
 * @returns `done`, `refused` (the note changed since), `vanished` (the note
 *   left its path outside the calendar; its ops are dropped) or `empty`
 * @throws the write error of an undo that passed its precondition
 */
export function undoEventChange(): Promise<EventChangeResult> {
	return applyHistory('undo');
}

/**
 * Redoes the newest undone change when the note still shows its prior state.
 * @returns the same statuses as `undoEventChange`
 * @throws the write error of a redo that passed its precondition
 */
export function redoEventChange(): Promise<EventChangeResult> {
	return applyHistory('redo');
}

/** Toast text per `FrontmatterWriteError` reason that comes with an "Open note" action. */
const WRITE_ERROR_MESSAGES: Partial<Record<FrontmatterWriteReason, string>> = {
	unparseable: "The note's frontmatter could not be parsed; fix it in the note",
	nested: "The note's frontmatter has nested values; the calendar cannot rewrite it",
	comments: "The note's frontmatter has comments; the calendar cannot rewrite it",
	'duplicate-keys': "The note's frontmatter repeats a key; the calendar cannot rewrite it",
	'alias-collision': "The note's frontmatter has two keys for one property; the calendar cannot rewrite it",
	anchors: "The note's frontmatter uses YAML anchors; the calendar cannot rewrite it",
	'vault-changed': 'The vault changed before the event was saved',
};

/**
 * The user-facing text of a failed calendar write, for an inline error.
 * @param err - what the write threw
 * @returns the reason's message for an `EventCalendarError` or a
 *   `FrontmatterWriteError` (`save-failed` and `missing` included), else
 *   the error's own message
 */
export function eventErrorMessage(err: unknown): string {
	if (err instanceof EventCalendarError) return CALENDAR_ERROR_MESSAGES[err.reason];
	if (err instanceof FrontmatterWriteError) {
		if (err.reason === 'save-failed') return 'Could not save the note';
		if (err.reason === 'missing') return 'The note was moved or deleted outside the calendar';
		return WRITE_ERROR_MESSAGES[err.reason] ?? err.message;
	}
	return err instanceof Error ? err.message : String(err);
}

/**
 * Reports a failed calendar write in a toast. An `EventCalendarError` shows
 * its reason's message, `save-failed` is skipped (the editor already
 * toasted), `missing` says the note moved or was deleted, refusals and
 * `vault-changed` offer "Open note", anything else shows its message.
 * @param err - what the write threw
 * @param path - the note the write targeted
 */
export function toastEventError(err: unknown, path: string): void {
	if (err instanceof FrontmatterWriteError) {
		if (err.reason === 'save-failed') return;
		if (err.reason !== 'missing') {
			toast.error(eventErrorMessage(err), {
				action: { label: 'Open note', onClick: () => void openFileInEditor(path) },
			});
			return;
		}
	}
	toast.error(eventErrorMessage(err));
}

/** Focuses the Calendar view root when it is still mounted. */
function focusRoot(root: HTMLElement | undefined): void {
	if (root?.isConnected) root.focus();
}

/**
 * The popover's and the dialog's Delete: deletes the event and shows an
 * "Event deleted" toast, described by the event's title, whose Undo
 * restores it through `undoDeleteEvent` and then focuses the view root (the
 * toast sits outside it). The root is resolved when Undo is clicked, so a
 * view remounted while the toast was up still gets focus. After a
 * `resetEventCalendar` (a vault switch) the toast is dismissed, and an Undo
 * that still fires is refused as `not-in-trash`: its path belongs to the
 * previous vault. A failure is reported through `toastEventError` instead.
 * @param path - absolute path of the event note
 * @param root - the Calendar view root at delete time, the fallback when no live root is found
 */
export async function deleteEventFromUi(path: string, root: HTMLElement | undefined): Promise<void> {
	const isCurrent = generationCheck();
	const title = eventCalendarStore.eventByPath(path)?.title ?? fileBase(path);
	try {
		await deleteEvent(path);
	} catch (err) {
		toastEventError(err, path);
		return;
	}
	// A vault switch during the delete already dismissed this vault's toasts.
	if (!isCurrent()) return;
	const forget = (t: { id: string | number }) => deleteToasts.delete(t.id);
	const id = toast('Event deleted', {
		description: title,
		onDismiss: forget,
		onAutoClose: forget,
		action: {
			label: 'Undo',
			onClick: () => {
				(isCurrent() ? undoDeleteEvent(path) : Promise.reject(new EventCalendarError('not-in-trash')))
					.catch((err) => toastEventError(err, path))
					.finally(() => focusRoot(document.querySelector<HTMLElement>('[data-event-calendar]') ?? root));
			},
		},
	});
	deleteToasts.add(id);
}

/**
 * The popover's and the dialog's Duplicate: duplicates the event, shows an
 * "Event duplicated" toast with the copy's title, and once the view has
 * rendered moves focus to the copy's block, else to the view root. A
 * failure is reported through `toastEventError` and focuses the root.
 * @param path - absolute path of the event note
 * @param root - the Calendar view root
 */
export async function duplicateEventFromUi(path: string, root: HTMLElement | undefined): Promise<void> {
	let copy: string;
	try {
		copy = await duplicateEvent(path);
	} catch (err) {
		toastEventError(err, path);
		focusRoot(root);
		return;
	}
	toast.success('Event duplicated', { description: eventCalendarStore.eventByPath(copy)?.title ?? fileBase(copy) });
	await svelteTick();
	if (!root?.isConnected) return;
	const block = root.querySelector<HTMLElement>(`[data-event-path="${CSS.escape(copy)}"]`);
	(block ?? root).focus();
}

/** Toast texts of the undo / redo feedback, per direction. */
const CHANGE_FEEDBACK = {
	undo: {
		done: 'Undone',
		empty: 'Nothing to undo',
		refused: 'Event changed since; not undone',
		notInTrash: 'The note is no longer in the Trash; cannot undo',
		vanished: 'Event was moved or renamed outside the calendar; cannot undo',
		reverse: 'Redo',
	},
	redo: {
		done: 'Redone',
		empty: 'Nothing to redo',
		refused: 'Event changed since; not redone',
		notInTrash: 'The note is no longer in the Trash; cannot redo',
		vanished: 'Event was moved or renamed outside the calendar; cannot redo',
		reverse: 'Undo',
	},
} as const;

/**
 * The Calendar keys' and the palette's undo: runs `undoEventChange` and
 * reports the outcome in a toast. "Undone: <label>" carries a Redo action
 * that focuses the view root when it finishes; `empty`, `refused` (with
 * "Open note" while the note is on disk, or "no longer in the Trash" for a
 * restore whose Trash entry is gone) and `vanished` say why nothing
 * changed; a thrown write error goes through `toastEventError`.
 * @param root - the Calendar view root, the fallback focus target of the toast's action
 */
export function undoEventChangeFromUi(root?: HTMLElement): Promise<void> {
	return applyEventChangeFromUi('undo', root);
}

/**
 * The Calendar keys' and the palette's redo: `undoEventChangeFromUi` the
 * other way round, "Redone: <label>" with an Undo action.
 * @param root - the Calendar view root, the fallback focus target of the toast's action
 */
export function redoEventChangeFromUi(root?: HTMLElement): Promise<void> {
	return applyEventChangeFromUi('redo', root);
}

/** Runs one undo or redo and toasts its outcome; see `undoEventChangeFromUi`. */
async function applyEventChangeFromUi(direction: 'undo' | 'redo', root: HTMLElement | undefined): Promise<void> {
	let result: EventChangeResult;
	try {
		result = await (direction === 'undo' ? undoEventChange() : redoEventChange());
	} catch (err) {
		toastEventError(err, err instanceof FrontmatterWriteError ? err.path : '');
		return;
	}
	const text = CHANGE_FEEDBACK[direction];
	if (result.status === 'done') {
		const reverse = direction === 'undo' ? 'redo' : 'undo';
		toast(`${text.done}: ${result.label}`, {
			action: {
				label: text.reverse,
				onClick: () => {
					void applyEventChangeFromUi(reverse, root).finally(() =>
						focusRoot(document.querySelector<HTMLElement>('[data-event-calendar]') ?? root),
					);
				},
			},
		});
		return;
	}
	if (result.status === 'empty') {
		toast(text.empty);
		return;
	}
	if (result.status === 'refused') {
		if (result.reason === 'not-in-trash') {
			toast.error(text.notInTrash);
			return;
		}
		const path = result.path;
		if (path === undefined) toast.error(text.refused);
		else toast.error(text.refused, { action: { label: 'Open note', onClick: () => void openFileInEditor(path) } });
		return;
	}
	toast.error(text.vanished);
}
