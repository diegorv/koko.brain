import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { toKey } from './event-calendar-dates.logic';
import {
	buildMonthCells,
	nowOffsetMinutes,
	rangeLabel,
	stepDate,
	visibleDays,
	type MonthCell,
	type RangeLabel,
} from './event-calendar-view.logic';
import type {
	CalendarViewMode,
	DialogState,
	EventDialogPayload,
	FocusRequest,
	PopoverRect,
	PopoverTarget,
} from './event-calendar.types';

/** View the tab shows before `initFromSettings` and after `reset`. */
const INITIAL_VIEW: CalendarViewMode = 'week';

/** Which view the Calendar tab shows. */
let view = $state<CalendarViewMode>(INITIAL_VIEW);
/** Day key the visible range is built around: today at module load. */
let focusedDate = $state<string>(toKey(new Date()));
/** The popover target; the selected event derives from it. */
let popover = $state.raw<PopoverTarget | null>(null);
/** The open dialog, or null. */
let dialog = $state.raw<DialogState | null>(null);
/** Whether the keyboard shortcuts help is open. */
let helpOpen = $state<boolean>(false);
/** Current instant as the mounted view's clock last set it. */
let nowMs = $state<number>(Date.now());
/** Whether `initFromSettings` already applied the default view this session. */
let initialized = $state<boolean>(false);
/** Whether a pointer gesture (drag, resize, create) is live on a calendar surface. */
let gestureLive = $state<boolean>(false);
/** Event the mounted view should focus and pulse once it renders, or null. */
let focusRequest = $state.raw<FocusRequest | null>(null);
/** Last dialog session handed out; never reset, so every open remounts. */
let dialogSession = 0;
/** Last focus request seq handed out; never reset, so a repeat request is new. */
let focusSeq = 0;

/** Reactive state of the Calendar tab: view, date, popover, dialogs and clock. */
export const eventCalendarViewStore = {
	/** The active view. */
	get view() { return view; },
	/** The day the visible range is built around. */
	get focusedDate() { return focusedDate; },
	/** The popover target, or null. */
	get popover() { return popover; },
	/** The open dialog, or null. */
	get dialog() { return dialog; },
	/** Whether the keyboard shortcuts help is open. */
	get helpOpen() { return helpOpen; },
	/** Current instant in epoch milliseconds. */
	get nowMs() { return nowMs; },
	/** Whether the default view was applied this session. */
	get initialized() { return initialized; },
	/** Event the view should focus and pulse, or null. */
	get focusRequest() { return focusRequest; },
	/** Whether a pointer gesture is live: the view's shortcuts stay off until it ends. */
	get gestureLive() { return gestureLive; },

	/** Days the active view shows, per the `weekStartsOn` and `showWeekends` settings. */
	get visibleDays(): string[] {
		const s = settingsStore.eventCalendar;
		return visibleDays(view, focusedDate, s.weekStartsOn, s.showWeekends);
	},
	/** Cells of the month grid around `focusedDate`, per the week settings. */
	get monthCells(): MonthCell[] {
		const s = settingsStore.eventCalendar;
		return buildMonthCells(focusedDate, s.weekStartsOn, s.showWeekends);
	},
	/** Header title and subtitle of the visible range. */
	get rangeLabel(): RangeLabel {
		return rangeLabel(view, focusedDate, this.visibleDays);
	},
	/** Day key of `nowMs`. */
	get todayKey(): string {
		return toKey(new Date(nowMs));
	},
	/** Wall-clock minutes from midnight of `nowMs` (correct on DST transition days). */
	get nowMinutes(): number {
		return nowOffsetMinutes(nowMs, this.todayKey) ?? 0;
	},
	/** Whether the event dialog or the shortcuts help is open. */
	get isDialogOpen(): boolean {
		return dialog !== null || helpOpen;
	},
	/** Path of the selected event: the popover target, else null. */
	get selectedEventPath(): string | null {
		return popover?.path ?? null;
	},

	/** Switches the view, closes the popover and drops the focus request. */
	setView(next: CalendarViewMode) {
		view = next;
		popover = null;
		focusRequest = null;
	},

	/** Moves to a day, closes the popover and drops the focus request. */
	setDate(date: string) {
		focusedDate = date;
		popover = null;
		focusRequest = null;
	},

	/** Moves one view unit back (`-1`) or forward (`1`), closes the popover and drops the focus request. */
	step(dir: 1 | -1) {
		focusedDate = stepDate(view, focusedDate, dir);
		popover = null;
		focusRequest = null;
	},

	/** Moves to today (read from the system clock), closes the popover and drops the focus request. */
	goToToday() {
		focusedDate = toKey(new Date());
		popover = null;
		focusRequest = null;
	},

	/** Opens the popover for an event anchored at `rect` (copied). */
	openPopover(path: string, rect: PopoverRect) {
		popover = { path, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
	},

	/** Closes the popover. */
	closePopover() {
		popover = null;
	},

	/** Opens the dialog with a copy of `payload` under a new session. */
	openDialog(payload: EventDialogPayload) {
		dialogSession += 1;
		dialog = { mode: payload.mode, payload: { ...payload }, session: dialogSession };
	},

	/** Closes the dialog. */
	closeDialog() {
		dialog = null;
	},

	/** Opens the keyboard shortcuts help. */
	openHelp() {
		helpOpen = true;
	},

	/** Closes the keyboard shortcuts help. */
	closeHelp() {
		helpOpen = false;
	},

	/**
	 * Asks the view to focus and pulse the event at `path` once it renders.
	 * Call it after any `setDate` / `setView`, which drop the request.
	 */
	requestFocus(path: string) {
		focusSeq += 1;
		focusRequest = { path, seq: focusSeq };
	},

	/** Drops the focus request when it is still the one numbered `seq`. */
	clearFocusRequest(seq: number) {
		if (focusRequest?.seq === seq) focusRequest = null;
	},

	/** Closes the popover, the dialog and the shortcuts help and drops the focus request; the view calls it when it unmounts. */
	closeTransient() {
		popover = null;
		dialog = null;
		helpOpen = false;
		focusRequest = null;
	},

	/** Marks a pointer gesture live or ended; the gesture controllers call it. */
	setGestureLive(live: boolean) {
		gestureLive = live;
	},

	/** Sets the current instant; the mounted view's clock calls it. */
	setNow(ms: number) {
		nowMs = ms;
	},

	/** Points the popover, an edit dialog and the focus request at `to` after the note at `from` was renamed. */
	remapPath(from: string, to: string) {
		if (popover?.path === from) {
			popover = { ...popover, path: to };
		}
		if (dialog?.payload.mode === 'edit' && dialog.payload.path === from) {
			dialog = { ...dialog, payload: { mode: 'edit', path: to } };
		}
		if (focusRequest?.path === from) {
			focusRequest = { ...focusRequest, path: to };
		}
	},

	/** Applies the `defaultView` setting the first time it is called in a session. */
	initFromSettings() {
		if (initialized) return;
		view = settingsStore.eventCalendar.defaultView;
		initialized = true;
	},

	/** Restores view, date (today), popover, dialog, shortcuts help, focus request, `gestureLive` and `initialized`; leaves `nowMs` alone. */
	reset() {
		gestureLive = false;
		view = INITIAL_VIEW;
		focusedDate = toKey(new Date());
		popover = null;
		dialog = null;
		helpOpen = false;
		focusRequest = null;
		initialized = false;
	},
};
