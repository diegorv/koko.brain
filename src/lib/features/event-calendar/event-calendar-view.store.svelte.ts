import { settingsStore } from '$lib/core/settings/settings.store.svelte';
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
import type { CalendarViewMode } from './event-calendar.types';

/** Viewport rect the popover anchors to: plain numbers, so the store does no DOM work. */
export interface PopoverRect {
	/** Left edge in viewport pixels. */
	x: number;
	/** Top edge in viewport pixels. */
	y: number;
	/** Width in pixels. */
	width: number;
	/** Height in pixels. */
	height: number;
}

/** The event the details popover shows and where it is anchored. */
export interface EventPopoverTarget {
	/** Absolute path of the event note. */
	path: string;
	/** Rect of the clicked block or chip. */
	rect: PopoverRect;
}

/** What opens the event dialog: a new event (day and optional range) or an existing note. */
export type EventDialogPayload =
	| {
			/** Create a new event. */
			mode: 'create';
			/** Day key of the new event. */
			date: string;
			/** Start in minutes from midnight; the form's default when absent. */
			start?: number;
			/** End in minutes from midnight; start plus the default duration when absent. */
			end?: number;
			/** Whether the new event spans the whole day. */
			allDay?: boolean;
	  }
	| {
			/** Edit an existing event. */
			mode: 'edit';
			/** Absolute path of the event note. */
			path: string;
	  };

/** The open event dialog. */
export interface EventDialogState {
	/** `create` or `edit`, the same as `payload.mode`. */
	mode: EventDialogPayload['mode'];
	/** What the dialog was opened with. */
	payload: EventDialogPayload;
	/** Grows on every `openDialog`, so a `{#key}` block remounts the form. */
	session: number;
}

/** View the tab shows before `initFromSettings` and after `reset`. */
const INITIAL_VIEW: CalendarViewMode = 'week';

/** Which view the Calendar tab shows. */
let view = $state<CalendarViewMode>(INITIAL_VIEW);
/** Day key the visible range is built around: today at module load. */
let focusedDate = $state<string>(toKey(new Date()));
/** The popover target; the selected event derives from it. */
let popover = $state.raw<EventPopoverTarget | null>(null);
/** The open dialog, or null. */
let dialog = $state.raw<EventDialogState | null>(null);
/** Current instant as the mounted view's clock last set it. */
let nowMs = $state<number>(Date.now());
/** Whether `initFromSettings` already applied the default view this session. */
let initialized = $state<boolean>(false);
/** Last dialog session handed out; never reset, so every open remounts. */
let dialogSession = 0;

/** Reactive state of the Calendar tab: view, date, popover, dialog and clock. */
export const eventCalendarViewStore = {
	/** The active view. */
	get view() { return view; },
	/** The day the visible range is built around. */
	get focusedDate() { return focusedDate; },
	/** The popover target, or null. */
	get popover() { return popover; },
	/** The open dialog, or null. */
	get dialog() { return dialog; },
	/** Current instant in epoch milliseconds. */
	get nowMs() { return nowMs; },
	/** Whether the default view was applied this session. */
	get initialized() { return initialized; },

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
	/** Whether a dialog is open. */
	get isDialogOpen(): boolean {
		return dialog !== null;
	},
	/** Path of the selected event: the popover target, else null. */
	get selectedEventPath(): string | null {
		return popover?.path ?? null;
	},

	/** Switches the view and closes the popover. */
	setView(next: CalendarViewMode) {
		view = next;
		popover = null;
	},

	/** Moves to a day and closes the popover. */
	setDate(date: string) {
		focusedDate = date;
		popover = null;
	},

	/** Moves one view unit back (`-1`) or forward (`1`) and closes the popover. */
	step(dir: 1 | -1) {
		focusedDate = stepDate(view, focusedDate, dir);
		popover = null;
	},

	/** Moves to today (read from the system clock) and closes the popover. */
	goToToday() {
		focusedDate = toKey(new Date());
		popover = null;
	},

	/** Opens the popover for an event anchored at `rect` (copied). */
	openPopover(path: string, rect: PopoverRect) {
		popover = { path, rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height } };
	},

	/** Closes the popover. */
	closePopover() {
		popover = null;
	},

	/** Opens the dialog with `payload` under a new session. */
	openDialog(payload: EventDialogPayload) {
		dialogSession += 1;
		dialog = { mode: payload.mode, payload, session: dialogSession };
	},

	/** Closes the dialog. */
	closeDialog() {
		dialog = null;
	},

	/** Closes the popover and the dialog; the view calls it when it unmounts. */
	closeTransient() {
		popover = null;
		dialog = null;
	},

	/** Sets the current instant; the mounted view's clock calls it. */
	setNow(ms: number) {
		nowMs = ms;
	},

	/** Points the popover and an edit dialog at `to` after the note at `from` was renamed. */
	remapPath(from: string, to: string) {
		if (popover?.path === from) {
			popover = { ...popover, path: to };
		}
		if (dialog?.payload.mode === 'edit' && dialog.payload.path === from) {
			dialog = { ...dialog, payload: { mode: 'edit', path: to } };
		}
	},

	/** Applies the `defaultView` setting the first time it is called in a session. */
	initFromSettings() {
		if (initialized) return;
		view = settingsStore.eventCalendar.defaultView;
		initialized = true;
	},

	/** Restores view, date (today), popover, dialog and `initialized`; leaves `nowMs` alone. */
	reset() {
		view = INITIAL_VIEW;
		focusedDate = toKey(new Date());
		popover = null;
		dialog = null;
		initialized = false;
	},
};
