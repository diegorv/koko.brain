/**
 * Service of the Calendar tab. Read side: projects the vault entries snapshot
 * into `eventCalendarStore`, opens and closes the singleton Calendar tab, runs
 * the clock that keeps "today" current, and resets the two event-calendar
 * stores. Write side: changes existing events (move, resize, edit with
 * rename) through `updateNoteFrontmatter` behind a per-path queue, with the
 * pending overlay, rollback and undo / redo of those changes.
 */

import { exists, readDir } from '@tauri-apps/plugin-fs';
import { toast } from 'svelte-sonner';
import { EVENT_CALENDAR_VIRTUAL_PATH, findTabIndex } from '$lib/core/editor/editor.logic';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { editorStore } from '$lib/core/editor/editor.store.svelte';
import { getFileName, getParentPath } from '$lib/core/filesystem/fs.logic';
import { renameItem } from '$lib/core/filesystem/fs.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { getVaultEntries } from '$lib/core/vault/vault-entries.service';
import { vaultStore } from '$lib/core/vault/vault.store.svelte';
import { FrontmatterWriteError, updateNoteFrontmatter, type FrontmatterWriteReason } from '$lib/features/properties/frontmatter-write.service';
import { error } from '$lib/utils/debug';
import { applyEventFields, eventState, eventsFromEntries, sameEventState } from './event-calendar-event.logic';
import type { EventTiming } from './event-calendar-drag.logic';
import { planTitleChange, type EventFormPatch } from './event-calendar-form.logic';
import { dropPath, pushOp, refuseOp, removeOp, takeRedo, takeUndo } from './event-calendar-history.logic';
import { eventCalendarStore } from './event-calendar.store.svelte';
import { eventCalendarViewStore } from './event-calendar-view.store.svelte';
import type { CalendarViewMode, EventNote, EventPatch, EventState, HistoryOp } from './event-calendar.types';

/** How often the mounted view's clock re-reads the system time. */
const CLOCK_INTERVAL_MS = 30_000;

/** Bumped by every load and every reset; a load writes only while it still holds the latest value. */
let loadToken = 0;

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
		const settings = settingsStore.eventCalendar;
		const projection = eventsFromEntries(entries, {
			defaults: { defaultDurationMinutes: settings.defaultDurationMinutes, defaultColor: settings.defaultColor },
			typeName: settings.eventTypeName,
			vaultPath,
			systemFolder: settingsStore.templates.systemFolder,
		});
		eventCalendarStore.setSnapshot(projection, version);
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
 * Opens or focuses the Calendar tab, creating it when absent.
 * @param options.date - day key to show; moves the view store there (closes the popover)
 * @param options.view - view to show; switches the view store (closes the popover)
 */
export function openEventCalendarTab(options: { date?: string; view?: CalendarViewMode } = {}): void {
	if (options.date !== undefined) eventCalendarViewStore.setDate(options.date);
	if (options.view !== undefined) eventCalendarViewStore.setView(options.view);
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
 * alone when it resolves. The write queue is kept: a later write to the same
 * path still waits for the one in flight. Leaves the clock and the editor
 * tabs alone.
 */
export function resetEventCalendar(): void {
	loadToken += 1;
	writeGeneration += 1;
	eventCalendarStore.reset();
	eventCalendarViewStore.reset();
}

/** Minutes in a day: the range an all-day event covers. */
const DAY_MINUTES = 1440;

/** Extension of an event note's filename. */
const NOTE_EXT = '.md';

/** Tail of the write queue per path; deleted when it settles while still the tail. */
const writeTails = new Map<string, Promise<void>>();

/** Bumped by `resetEventCalendar`; a write applies its store changes only while it holds the latest value. */
let writeGeneration = 0;

/**
 * Tail of the undo / redo queue. Each undo or redo takes its op only once the
 * previous one has settled, so it sees the history a rename has remapped.
 */
let historyTail: Promise<unknown> = Promise.resolve();

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
 * Runs `task` after every write already queued on `path`, whatever their
 * outcome. `isCurrent` tells the task whether `resetEventCalendar` ran since
 * it was enqueued.
 */
function enqueue<T>(path: string, task: (isCurrent: () => boolean) => Promise<T>): Promise<T> {
	const generation = writeGeneration;
	const isCurrent = () => generation === writeGeneration;
	const previous = writeTails.get(path) ?? Promise.resolve();
	const run = previous.then(() => task(isCurrent));
	holdPath(path, run);
	return run;
}

/**
 * Resolves once every write queued so far has settled. Never rejects; the
 * vault-switch and window-close paths await it before tearing down.
 */
export async function drainEventCalendarWrites(): Promise<void> {
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
 * all-day, and a blank location reads as empty.
 */
function patchedState(before: EventState, patch: EventPatch, title: string): EventState {
	const allDay = patch.allDay ?? (patch.start !== undefined || patch.end !== undefined ? false : before.allDay);
	return {
		title,
		date: patch.date ?? before.date,
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
 * stale.
 * @returns the note's final path
 * @throws the read, rename or write error, after rolling the overlay back
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
	const fields: EventPatch = { ...patch };
	let target = path;
	if (options.planTitle && after.title !== before.title) {
		const siblings = (await readDir(getParentPath(path))).map((entry) => entry.name);
		const plan = planTitleChange(fileBase(path), after.title, siblings);
		fields.eventTitle = plan.eventTitle;
		if (plan.renameTo !== null) {
			if (!isCurrent()) throw new FrontmatterWriteError('vault-changed', path);
			const renamed = await renameItem(path, plan.renameTo);
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
				eventCalendarStore.putPending({ kind: 'create', path: target, event: { ...current, ...renamedOnly, path: target }, settled: true });
				if (options.record) record({ kind: 'update', label: options.label, path: target, before, after: renamedOnly });
			}
		}
		throw err;
	}
	if (!isCurrent()) return target;
	if (target === path) {
		eventCalendarStore.settlePending(target, vaultStore.vaultIndexVersion);
	} else {
		// Like the `create` `remapPath` leaves: no version clock, it prunes once the snapshot has `target`.
		eventCalendarStore.putPending({ kind: 'create', path: target, event: renamedEvent, settled: true });
	}
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

/**
 * Runs one undo or redo after the previous one has settled, whatever its
 * outcome. One that starts after `resetEventCalendar` returns `empty`.
 */
function applyHistory(direction: 'undo' | 'redo'): Promise<EventChangeResult> {
	const generation = writeGeneration;
	const run = historyTail.then(() =>
		generation === writeGeneration ? applyHistoryNow(direction) : { status: 'empty' as const, label: null },
	);
	historyTail = run.catch(() => {});
	return run;
}

/** Takes an op off one stack and applies its other state, queued on its path. */
async function applyHistoryNow(direction: 'undo' | 'redo'): Promise<EventChangeResult> {
	const taken = direction === 'undo' ? takeUndo(eventCalendarStore.history) : takeRedo(eventCalendarStore.history);
	if (!taken) return { status: 'empty', label: null };
	const { op } = taken;
	eventCalendarStore.setHistory(taken.history);
	if (op.kind !== 'update') {
		// Create and delete ops are recorded from ticket 28 on.
		eventCalendarStore.setHistory(refuseOp(eventCalendarStore.history, op));
		return { status: 'refused', label: op.label };
	}
	const expected = direction === 'undo' ? op.after : op.before;
	const target = direction === 'undo' ? op.before : op.after;
	return enqueue(op.path, async (isCurrent) => {
		const shown = eventCalendarStore.eventByPath(op.path);
		if (!shown || !(await exists(op.path))) {
			if (isCurrent()) eventCalendarStore.setHistory(dropPath(eventCalendarStore.history, op.path));
			return { status: 'vanished', label: op.label };
		}
		const current = requireEvent(op.path);
		if (!sameEventState(eventState(current), expected)) {
			if (isCurrent()) eventCalendarStore.setHistory(refuseOp(eventCalendarStore.history, op));
			return { status: 'refused', label: op.label };
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
	});
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
 * Reports a failed calendar write in a toast. `save-failed` is skipped (the
 * editor already toasted), `missing` says the note moved or was deleted,
 * refusals and `vault-changed` offer "Open note", anything else shows its
 * message.
 * @param err - what the write threw
 * @param path - the note the write targeted
 */
export function toastEventError(err: unknown, path: string): void {
	if (err instanceof FrontmatterWriteError) {
		if (err.reason === 'save-failed') return;
		if (err.reason === 'missing') {
			toast.error('The note was moved or deleted outside the calendar');
			return;
		}
		toast.error(WRITE_ERROR_MESSAGES[err.reason] ?? err.message, {
			action: { label: 'Open note', onClick: () => void openFileInEditor(path) },
		});
		return;
	}
	toast.error(err instanceof Error ? err.message : String(err));
}
