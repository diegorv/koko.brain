/**
 * Pointer gestures of the time grid (create, move and resize) and of the
 * day cells of the month grid and the all-day lane (move to another day). A
 * desktop-only
 * port of `calender-app-design/src/components/calendar/time-grid.tsx:225-380`
 * without the touch branches. The component owns the pointer events and the
 * live rect; this module maps a point to a slot, tracks the drag and decides
 * what the gesture does.
 *
 * Times are minutes from midnight (0..1440). Pure logic: no framework imports.
 */

import { clampMinutes, floorToSnap, MIN_EVENT_MINUTES, pxToMinutes, snap } from './event-calendar-layout.logic';
import type { DayDragState, DragState, EventNote } from './event-calendar.types';

/** Distance, in px, the pointer must travel before a press becomes a drag. */
export const DRAG_THRESHOLD_PX = 4;

/** Minutes in a day: the end of the time grid. */
const DAY_MINUTES = 1440;

/** The part of the grid body's bounding rect the slot math reads. */
export type GridRect = Pick<DOMRect, 'left' | 'top' | 'width'>;

/** A point on the time grid: a visible day column and the minutes under the pointer. */
export interface Slot {
	/** Index of the visible day column. */
	dayIndex: number;
	/** Minutes from midnight, 0..1440, not snapped. */
	minutes: number;
}

/** Day and time range of an event: a create payload or a move's new timing. */
export interface EventTiming {
	/** Day key. */
	date: string;
	/** Start in minutes from midnight. */
	start: number;
	/** End in minutes from midnight. */
	end: number;
}

/** What a finished gesture does. */
export type DragResult =
	| {
			/** Open the create dialog prefilled with `payload`. */
			kind: 'create';
			/** Day and range of the new event. */
			payload: EventTiming;
	  }
	| {
			/** Write new timing to the event (a move or a resize). */
			kind: 'move';
			/** Absolute path of the event note. */
			path: string;
			/** New day and range. */
			timing: EventTiming;
	  }
	| {
			/** Open the popover of the event that was clicked. */
			kind: 'popover';
			/** Absolute path of the event note. */
			path: string;
	  }
	| {
			/** Do nothing (an unchanged drop, or the event is gone). */
			kind: 'none';
	  };

/** Range the create ghost draws while a create drag is in progress. */
export interface CreateGhost {
	/** Index of the visible day column. */
	dayIndex: number;
	/** Start in minutes from midnight. */
	start: number;
	/** End in minutes from midnight. */
	end: number;
}

/**
 * Maps a pointer position to a slot. `rect` is the grid body's bounding rect,
 * read live by the caller on every event so that scrolling during a drag
 * stays correct. The day index is clamped to the visible columns and the
 * minutes to the day.
 */
export function slotFromPoint(rect: GridRect, clientX: number, clientY: number, dayCount: number): Slot {
	const columnWidth = rect.width / dayCount;
	return {
		dayIndex: clampMinutes(Math.floor((clientX - rect.left) / columnWidth), 0, dayCount - 1),
		minutes: clampMinutes(pxToMinutes(clientY - rect.top), 0, DAY_MINUTES),
	};
}

/**
 * Starts a create gesture on empty grid space. The anchor is the slot floored
 * to the snap step, capped so a minimal event still fits before midnight; the
 * range starts as the click range `[anchor, anchor + defaultDurationMinutes]`,
 * capped at 1440.
 */
export function beginCreate(slot: Slot, defaultDurationMinutes: number): DragState {
	const anchor = Math.min(floorToSnap(slot.minutes), DAY_MINUTES - MIN_EVENT_MINUTES);
	const end = Math.min(anchor + defaultDurationMinutes, DAY_MINUTES);
	return {
		kind: 'create',
		path: null,
		originDay: slot.dayIndex,
		day: slot.dayIndex,
		anchorMinutes: anchor,
		originStart: anchor,
		originEnd: end,
		start: anchor,
		end,
		moved: false,
	};
}

/** Shared start of a move or resize gesture on `event`. */
function beginOnEvent(kind: 'move' | 'resize', event: EventNote, slot: Slot): DragState {
	return {
		kind,
		path: event.path,
		originDay: slot.dayIndex,
		day: slot.dayIndex,
		anchorMinutes: slot.minutes,
		originStart: event.start,
		originEnd: event.end,
		start: event.start,
		end: event.end,
		moved: false,
	};
}

/** Starts a move gesture on the body of `event`, pressed at `slot`. */
export function beginMove(event: EventNote, slot: Slot): DragState {
	return beginOnEvent('move', event, slot);
}

/** Starts a resize gesture on the bottom handle of `event`, pressed at `slot`. */
export function beginResize(event: EventNote, slot: Slot): DragState {
	return beginOnEvent('resize', event, slot);
}

/**
 * Advances a drag to the pointer at `slot`. `distancePx` is the distance from
 * the press point; until it exceeds `DRAG_THRESHOLD_PX` once, the same `drag`
 * is returned unchanged.
 *
 * - Create: `[min(anchor, current), max(anchor, current, min + 15)]`, capped
 *   at 1440, on the day where it started.
 * - Move: keeps the duration and the grab offset, clamps the start to
 *   `[0, 1440 - length]`, and follows the pointer's day.
 * - Resize: clamps the end to `[start + 15, 1440]` (the day's end wins).
 */
export function updateDrag(drag: DragState, slot: Slot, distancePx: number): DragState {
	if (!drag.moved && distancePx <= DRAG_THRESHOLD_PX) return drag;

	if (drag.kind === 'create') {
		const current = snap(slot.minutes);
		const start = Math.min(drag.anchorMinutes, current);
		const end = Math.min(Math.max(drag.anchorMinutes, current, start + MIN_EVENT_MINUTES), DAY_MINUTES);
		return { ...drag, moved: true, start, end };
	}

	if (drag.kind === 'move') {
		const length = drag.originEnd - drag.originStart;
		const grabOffset = drag.anchorMinutes - drag.originStart;
		const start = clampMinutes(snap(slot.minutes - grabOffset), 0, DAY_MINUTES - length);
		return { ...drag, moved: true, day: slot.dayIndex, start, end: start + length };
	}

	const end = clampMinutes(snap(slot.minutes), drag.originStart + MIN_EVENT_MINUTES, DAY_MINUTES);
	return { ...drag, moved: true, end };
}

/**
 * Decides what a finished gesture does. `days` are the visible day keys the
 * drag's indices point into, and `events` the events the grid shows.
 *
 * - A create resolves to its payload (the click range, or the dragged range).
 * - A drag whose day index no longer points into `days` (the view changed
 *   mid-drag) resolves to `none`.
 * - A move or resize of an event that is no longer shown resolves to `none`.
 * - A press that never passed the threshold, or any drag of a read-only
 *   event, opens the popover.
 * - A drop with the same date, start and end resolves to `none`, so no
 *   no-op write is recorded.
 * - Anything else resolves to `move` with the new timing; a resize does too,
 *   keeping the event's own date, and the caller tells them apart by
 *   `drag.kind`.
 */
export function resolveDrag(drag: DragState, events: EventNote[], days: string[]): DragResult {
	if (drag.kind === 'create') {
		const date = days[drag.originDay];
		if (date === undefined) return { kind: 'none' };
		return { kind: 'create', payload: { date, start: drag.start, end: drag.end } };
	}

	const event = events.find((e) => e.path === drag.path);
	if (!event) return { kind: 'none' };
	if (!drag.moved || event.readOnly) return { kind: 'popover', path: event.path };

	const date = drag.kind === 'resize' ? event.date : days[drag.day];
	if (date === undefined) return { kind: 'none' };
	const timing = { date, start: drag.start, end: drag.end };
	if (timing.date === event.date && timing.start === event.start && timing.end === event.end) {
		return { kind: 'none' };
	}
	return { kind: 'move', path: event.path, timing };
}

/** Range of the create ghost for a create drag; `null` for a move or resize. */
export function createGhost(drag: DragState): CreateGhost | null {
	if (drag.kind !== 'create') return null;
	return { dayIndex: drag.originDay, start: drag.start, end: drag.end };
}

/**
 * Events of one visible day column as a move or resize drag shows them, or
 * `null` when the drag leaves that column alone, so the caller re-lays out
 * only the source and target columns. The source is the dragged event's own
 * day; the target is the pointer's day for a move and the source for a
 * resize. The dragged event leaves the source and lands in the target with
 * the drag's range, keeping its other fields.
 * @param drag - the live drag, or `null` when none is in progress
 * @param dragged - the event being dragged, as the grid showed it at pointerdown
 * @param dayIndex - index of the column in the visible days
 * @param dayKey - day key of the column
 * @param dayEvents - timed events the column shows without the drag
 */
export function previewDayEvents<T extends EventNote>(
	drag: DragState | null,
	dragged: T | null,
	dayIndex: number,
	dayKey: string,
	dayEvents: T[],
): T[] | null {
	if (!drag || drag.kind === 'create' || !drag.moved || !dragged) return null;
	const isSource = dragged.date === dayKey;
	const isTarget = drag.kind === 'move' ? dayIndex === drag.day : isSource;
	if (!isSource && !isTarget) return null;
	const rest = dayEvents.filter((e) => e.path !== dragged.path);
	if (isTarget) rest.push({ ...dragged, date: dayKey, start: drag.start, end: drag.end });
	return rest;
}

/** The part of a cell area's bounding rect the day-cell math reads. */
export type CellRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

/** Where a day drag drops. */
export type DayDragResult =
	| {
			/** Write the new day to the event. */
			kind: 'move';
			/** Absolute path of the event note. */
			path: string;
			/** New day key. */
			date: string;
	  }
	| {
			/** Do nothing (an unmoved press, a same-day drop, a read-only or gone event). */
			kind: 'none';
	  };

/**
 * Maps a pointer position to a day cell of a `cols` x `rows` area laid out
 * row by row (the month grid, or the one-row all-day lane). `rect` is read
 * live by the caller. A point outside the area clamps to the nearest cell.
 * @returns the row-major cell index, an index into the visible days
 */
export function cellFromPoint(rect: CellRect, clientX: number, clientY: number, cols: number, rows: number): number {
	const col = rect.width > 0 ? Math.floor(((clientX - rect.left) * cols) / rect.width) : 0;
	const row = rect.height > 0 ? Math.floor(((clientY - rect.top) * rows) / rect.height) : 0;
	return clampMinutes(row, 0, rows - 1) * cols + clampMinutes(col, 0, cols - 1);
}

/** Starts a day drag on the chip of `event`, pressed in cell `dayIndex`. */
export function beginDayDrag(event: EventNote, dayIndex: number): DayDragState {
	return { path: event.path, originDay: dayIndex, day: dayIndex, moved: false };
}

/**
 * Advances a day drag to the cell under the pointer. `distancePx` is the
 * distance from the press point; until it exceeds `DRAG_THRESHOLD_PX` once,
 * the same `drag` is returned unchanged.
 */
export function updateDayDrag(drag: DayDragState, dayIndex: number, distancePx: number): DayDragState {
	if (!drag.moved && distancePx <= DRAG_THRESHOLD_PX) return drag;
	return { ...drag, moved: true, day: dayIndex };
}

/**
 * Decides what a finished day drag does. A drop moves only the date: the
 * start, end and all-day flag stay. An unmoved press resolves to `none` (the
 * chip's own click opens the popover), and so do a drop on the event's
 * current day, a read-only event, an event no longer shown and a day index
 * that no longer points into `days` (the view changed mid-drag).
 * @param drag - the finished drag
 * @param events - the events the surface shows
 * @param days - the visible day keys the drag's indices point into
 */
export function resolveDayDrag(drag: DayDragState, events: EventNote[], days: string[]): DayDragResult {
	if (!drag.moved) return { kind: 'none' };
	const event = events.find((e) => e.path === drag.path);
	const date = days[drag.day];
	if (!event || event.readOnly || date === undefined || date === event.date) return { kind: 'none' };
	return { kind: 'move', path: event.path, date };
}

/**
 * Events as a day drag shows them: the dragged event re-dated to the target
 * day, keeping its other fields. Returns `events` itself when no moved drag
 * is in progress or the target is out of range, so derived views stay put.
 */
export function previewDayMove<T extends EventNote>(events: T[], drag: DayDragState | null, days: string[]): T[] {
	const date = drag?.moved ? days[drag.day] : undefined;
	if (!drag || date === undefined) return events;
	return events.map((e) => (e.path === drag.path ? { ...e, date } : e));
}
