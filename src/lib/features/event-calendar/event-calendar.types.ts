/**
 * Shared types of the event-calendar feature. Types only: the runtime color
 * and view-mode lists live in `$lib/core/settings/settings.logic.ts`
 * (`EVENT_CALENDAR_COLORS`, `EVENT_CALENDAR_VIEW_MODES`) and feature code
 * imports them from there.
 *
 * Days are `YYYY-MM-DD` keys and times are minutes from midnight (0..1440),
 * as in `event-calendar-dates.logic.ts`.
 */

import type { EventCalendarColor, EventCalendarViewMode } from '$lib/core/settings/settings.types';

/** One of the event colors (`EVENT_CALENDAR_COLORS`). */
export type EventColor = EventCalendarColor;

/** One of the calendar views (`EVENT_CALENDAR_VIEW_MODES`). */
export type CalendarViewMode = EventCalendarViewMode;

/**
 * An event note as the calendar renders it. Named `EventNote` to avoid the
 * unrelated `CalendarEvent` of `features/collection/calendar.logic.ts`.
 */
export interface EventNote {
	/** Absolute path of the note. */
	path: string;
	/** Display title: `event_title` when set, else the filename base. */
	title: string;
	/** Day key the event falls on. */
	date: string;
	/** Start in minutes from midnight (0 for an all-day event). */
	start: number;
	/** End in minutes from midnight (1440 for an all-day event). */
	end: number;
	/** Whether the event spans the whole day (`all_day`). */
	allDay: boolean;
	/** Display color (`event_color`, else the settings default). */
	color: EventColor;
	/** Free-text location (`location`), empty when unset. */
	location: string;
	/** Short excerpt of the note body, empty when there is none. */
	snippet: string;
	/** When true, the timing cannot be changed from the calendar (for example a multi-day span). */
	readOnly: boolean;
}

/** The scheduling fields an event note stores in its frontmatter. */
export interface EventFields {
	/** Day key (`date`). */
	date: string;
	/** Start in minutes from midnight (`start`). */
	start: number;
	/** End in minutes from midnight (`end`). */
	end: number;
	/** Whether the event spans the whole day (`all_day`). */
	allDay: boolean;
	/** Display color (`event_color`). */
	color: EventColor;
	/** Free-text location (`location`). */
	location: string;
}

/** Full calendar-visible state of an event: its fields plus the display title. */
export type EventState = EventFields & {
	/** Display title of the event. */
	title: string;
};

/** A partial update to an event's fields. */
export type EventPatch = Partial<EventFields> & {
	/** New `event_title`; `null` removes the key, `undefined` leaves it alone. */
	eventTitle?: string | null;
};

/** Everything needed to create a new event note. */
export type EventDraft = EventFields & {
	/** Title typed by the user (becomes the filename and, if needed, `event_title`). */
	title: string;
	/** Initial note body. */
	notes: string;
};

/** Why an event-typed note cannot be shown, or is shown with a caveat. */
export type EventIssueReason = 'unscheduled' | 'invalid-time' | 'crosses-midnight' | 'trailing-comment' | 'multi-day';

/** One problem found while projecting event notes. */
export interface EventIssue {
	/** Absolute path of the note. */
	path: string;
	/** Display title of the note. */
	title: string;
	/** What is wrong. */
	reason: EventIssueReason;
	/** Human-readable detail, for example the offending value. */
	detail?: string;
	/** Whether the note still renders on the calendar despite the issue. */
	rendered: boolean;
}

/** Result of projecting the vault entries onto the calendar. */
export interface EventProjection {
	/** Events that render. */
	events: EventNote[];
	/** Event-typed notes with a problem. */
	issues: EventIssue[];
	/** Number of archived event notes left out. */
	archivedCount: number;
}

/**
 * A calendar write that the vault index may not reflect yet. The projection
 * overlays it until it is settled and the index has caught up.
 */
export type PendingWrite =
	| {
			/** An edit of an existing event. */
			kind: 'update';
			/** Absolute path of the note. */
			path: string;
			/** State the calendar shows until the index catches up. */
			state: EventState;
			/** Whether the write has finished on disk. */
			settled: boolean;
			/** `vaultIndexVersion` at the moment the write settled. */
			settledAtVersion?: number;
	  }
	| {
			/** A newly created event. */
			kind: 'create';
			/** Absolute path of the new note. */
			path: string;
			/** Event the calendar shows until the index catches up. */
			event: EventNote;
			/** Whether the write has finished on disk. */
			settled: boolean;
			/** `vaultIndexVersion` at the moment the write settled. */
			settledAtVersion?: number;
	  }
	| {
			/** A deleted event; also the tombstone of a renamed note's old path. */
			kind: 'delete';
			/** Absolute path that must stay hidden. */
			path: string;
			/** Whether the write has finished on disk. */
			settled: boolean;
			/** `vaultIndexVersion` at the moment the write settled. */
			settledAtVersion?: number;
	  };

/** One undoable calendar change. */
export type HistoryOp =
	| {
			/** A change to an existing event. */
			kind: 'update';
			/** Label shown in the undo / redo feedback. */
			label: 'Move event' | 'Resize event' | 'Edit event';
			/** Absolute path of the note. */
			path: string;
			/** State before the change. */
			before: EventState;
			/** State after the change. */
			after: EventState;
	  }
	| {
			/** A created or duplicated event. */
			kind: 'create';
			/** Label shown in the undo / redo feedback. */
			label: 'Create event' | 'Duplicate event';
			/** Absolute path of the created note. */
			path: string;
			/** State of the created event. */
			state: EventState;
	  }
	| {
			/** A deleted event. */
			kind: 'delete';
			/** Label shown in the undo / redo feedback. */
			label: 'Delete event';
			/** Absolute path the note had. */
			path: string;
			/** State of the event before deletion. */
			state: EventState;
			/** Trash entry id, used to restore the note on undo. */
			trashId?: string;
	  };

/**
 * A pointer drag in progress on the time grid. Days are indices into the
 * visible days, so `slotFromPoint` needs only the column count; the drag
 * logic maps them back to day keys when it resolves.
 */
export interface DragState {
	/** What the drag does. */
	kind: 'create' | 'move' | 'resize';
	/** Absolute path of the dragged event; `null` for a create. */
	path: string | null;
	/** Index of the visible day where the drag started. */
	originDay: number;
	/** Index of the visible day the drag currently targets. */
	day: number;
	/**
	 * Minutes from midnight where the pointer went down: the snapped, capped
	 * anchor for a create, the raw pointer minutes for a move or resize.
	 */
	anchorMinutes: number;
	/** Start of the dragged event before the drag (the click range for a create). */
	originStart: number;
	/** End of the dragged event before the drag (the click range for a create). */
	originEnd: number;
	/** Start of the dragged range now. */
	start: number;
	/** End of the dragged range now. */
	end: number;
	/** Whether the pointer has moved past the drag threshold. */
	moved: boolean;
}

/** A timed event placed in its day column by the overlap layout. */
export interface PositionedEvent {
	/** The event being placed. */
	event: EventNote;
	/** Zero-based column within its overlap cluster. */
	column: number;
	/** Number of columns in its overlap cluster (one width per cluster). */
	columns: number;
}

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
export interface PopoverTarget {
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

/** The open event dialog; the view store holds `null` while it is closed. */
export interface DialogState {
	/** `create` or `edit`, the same as `payload.mode`. */
	mode: EventDialogPayload['mode'];
	/** What the dialog was opened with. */
	payload: EventDialogPayload;
	/** Grows on every `openDialog`, so a `{#key}` block remounts the form. */
	session: number;
}
