/**
 * Rules of the event dialog's form: building a draft, keeping start, end and
 * all-day consistent, validation messages, the patch an edit writes, and the
 * rename plan a title change needs. A port of
 * `calender-app-design/src/components/dialogs/event-dialog.tsx:61-94, 126-140`.
 *
 * Times are minutes from midnight (0..1440). Pure logic: no framework imports.
 */

import type { EventCalendarSettings } from '#lib/core/settings/settings.types.js';
import { generateUniqueName } from '#lib/core/filesystem/fs.logic.js';
import { isValidDayKey, parseTimeStrict } from './event-calendar-dates.logic';
import { eventFileBase } from './event-calendar-event.logic';
import { MIN_EVENT_MINUTES } from './event-calendar-layout.logic';
import type { EventDraft, EventNote, EventPatch, EventState } from './event-calendar.types';

/** Minutes in a day: the latest end an event can have. */
const DAY_MINUTES = 1440;

/** Start of a create payload that names none (09:00, as in the prototype). */
const DEFAULT_CREATE_START = 540;

/** Extension of an event note's filename. */
const NOTE_EXT = '.md';

/** The form state of the event dialog. */
export type EventFormDraft = EventDraft & {
	/** When true, date and time cannot be edited (a read-only event, such as a multi-day span). */
	timingLocked: boolean;
};

/** What opens the create dialog: a day and, optionally, a range or the all-day flag. */
export interface EventCreatePayload {
	/** Day key of the new event. */
	date: string;
	/** Start anchor in minutes from midnight; 09:00 when absent. */
	start?: number;
	/** End in minutes from midnight; start plus the default duration when absent. */
	end?: number;
	/** Whether the new event spans the whole day. */
	allDay?: boolean;
}

/** The settings a new draft reads. */
export type EventCreateSettings = Pick<EventCalendarSettings, 'defaultDurationMinutes' | 'defaultColor'>;

/** Visible validation messages, one per form area; an empty object means valid. */
export interface EventFormErrors {
	/** Message for the title field. */
	title?: string;
	/** Message for the date field. */
	date?: string;
	/** Message for the start / end fields. */
	time?: string;
}

/** What an edit writes: the changed fields, plus the trimmed title when it changed. */
export type EventFormPatch = Omit<EventPatch, 'eventTitle'> & {
	/** New display title; the write service turns it into a rename plan. */
	title?: string;
};

/** How a title change lands on disk. */
export interface TitleChangePlan {
	/** New filename (with `.md`) to rename the note to, or `null` to keep the file. */
	renameTo: string | null;
	/** Value for `event_title`, or `null` to remove the key. */
	eventTitle: string | null;
}

/**
 * Builds the edit draft of an existing event.
 * @param event - the event as the calendar shows it
 * @returns its fields and title, empty notes (the body is not an edit field),
 *   and `timingLocked` set for a read-only event
 */
export function draftFromEvent(event: EventNote): EventFormDraft {
	return {
		title: event.title,
		date: event.date,
		start: event.start,
		end: event.end,
		allDay: event.allDay,
		color: event.color,
		location: event.location,
		notes: '',
		timingLocked: event.readOnly,
	};
}

/**
 * Builds the draft of a new event. Uses the same cap as a pointer create:
 * `start = min(anchor, 1440 - MIN_EVENT_MINUTES)` and the end capped at 1440,
 * so the draft never starts invalid.
 * @param payload - day and optional range of the new event
 * @param settings - default duration and color
 * @returns an untitled, unlocked draft
 */
export function draftForCreate(payload: EventCreatePayload, settings: EventCreateSettings): EventFormDraft {
	const start = Math.min(payload.start ?? DEFAULT_CREATE_START, DAY_MINUTES - MIN_EVENT_MINUTES);
	const wanted = payload.end ?? start + settings.defaultDurationMinutes;
	const end = Math.min(Math.max(wanted, start + MIN_EVENT_MINUTES), DAY_MINUTES);
	return {
		title: '',
		date: payload.date,
		start,
		end,
		allDay: payload.allDay ?? false,
		color: settings.defaultColor,
		location: '',
		notes: '',
		timingLocked: false,
	};
}

/**
 * Applies a new start from the time input, keeping the duration (at least
 * `MIN_EVENT_MINUTES`) and capping the end at 1440.
 * @param draft - current draft
 * @param value - the `<input type="time">` value; an empty or unreadable value counts as 0
 * @returns a new draft
 */
export function applyStartChange(draft: EventFormDraft, value: string): EventFormDraft {
	const start = parseTimeStrict(value) ?? 0;
	const length = Math.max(MIN_EVENT_MINUTES, draft.end - draft.start);
	return { ...draft, start, end: Math.min(DAY_MINUTES, start + length) };
}

/**
 * Applies a new end from the time input.
 * @param draft - current draft
 * @param value - the `<input type="time">` value; an empty or unreadable value
 *   and `00:00` become 1440, as in the prototype (`|| 1440`). A time input
 *   cannot show `24:00`, so `00:00` is how a user ends an event at midnight
 * @returns a new draft
 */
export function applyEndChange(draft: EventFormDraft, value: string): EventFormDraft {
	const end = parseTimeStrict(value);
	return { ...draft, end: end === null || end === 0 ? DAY_MINUTES : end };
}

/**
 * Sets the all-day flag. Start and end are kept, so switching it off again
 * restores the previous times.
 * @param draft - current draft
 * @param allDay - new value; flips the current one when absent
 * @returns a new draft
 */
export function toggleAllDay(draft: EventFormDraft, allDay = !draft.allDay): EventFormDraft {
	return { ...draft, allDay };
}

/**
 * Validates a draft. A title with `:` or `/` is valid: the filename is
 * sanitized instead (`eventFileBase`).
 * @param draft - draft to check
 * @returns a message per failing area: an empty title (after trim), an empty
 *   or invalid date, and an end at or before the start of a timed,
 *   unlocked draft
 */
export function validateDraft(draft: EventFormDraft): EventFormErrors {
	const errors: EventFormErrors = {};
	if (draft.title.trim() === '') errors.title = 'Enter a title.';
	if (!isValidDayKey(draft.date)) errors.date = 'Enter a valid date.';
	// A locked span may end on a later day, so its `end` can be before its `start`.
	if (!draft.timingLocked && !draft.allDay && draft.end <= draft.start) errors.time = 'End time must be after the start time.';
	return errors;
}

/**
 * Computes what an edit changes. An all-day draft compares as 0..1440, the
 * range an all-day event has, as the prototype's submit did.
 * @param draft - edited draft
 * @param original - state of the event when the dialog opened
 * @returns only the changed fields, plus the trimmed `title` when it changed;
 *   never `eventTitle` (see `planTitleChange`)
 */
export function draftToPatch(draft: EventFormDraft, original: EventState): EventFormPatch {
	const start = draft.allDay ? 0 : draft.start;
	const end = draft.allDay ? DAY_MINUTES : draft.end;
	const title = draft.title.trim();
	const patch: EventFormPatch = {};
	if (title !== original.title) patch.title = title;
	if (draft.date !== original.date) patch.date = draft.date;
	if (draft.allDay !== original.allDay) patch.allDay = draft.allDay;
	if (start !== original.start) patch.start = start;
	if (end !== original.end) patch.end = end;
	if (draft.color !== original.color) patch.color = draft.color;
	if (draft.location !== original.location) patch.location = draft.location;
	return patch;
}

/**
 * Plans how a new title lands on disk. The filename base is
 * `eventFileBase(newTitle)`. Names compare case-insensitively: a case-only
 * change renames nothing, because `renameItem` refuses a target that
 * `exists`, which a case-only change does on a case-insensitive volume, and a
 * sibling that differs only in case counts as taken. A taken name gets a
 * number (`Standup 1.md`) instead of failing; when that number lands on the
 * note's own name, nothing is renamed.
 * @param currentFileBase - the note's filename without `.md`
 * @param newTitle - the new display title (already trimmed)
 * @param siblingNames - names of the entries in the note's folder, the note itself included or not
 * @returns the rename target and the `event_title` value: `newTitle` when it
 *   differs from the final filename base, else `null` (the key is removed)
 */
export function planTitleChange(currentFileBase: string, newTitle: string, siblingNames: string[]): TitleChangePlan {
	const base = eventFileBase(newTitle);
	const lowerBase = base.toLowerCase();
	let finalBase = currentFileBase;
	let renameTo: string | null = null;
	if (lowerBase !== currentFileBase.toLowerCase()) {
		const self = `${currentFileBase}${NOTE_EXT}`.toLowerCase();
		const siblings = siblingNames.map((n) => n.toLowerCase()).filter((n) => n !== self);
		const unique = generateUniqueName(`${lowerBase}${NOTE_EXT}`, false, siblings);
		// A numbered result can be the note's own name (`Standup 1` retitled
		// `standup`): keep the file instead of renaming it onto itself.
		if (unique !== self) {
			finalBase = base + unique.slice(lowerBase.length, -NOTE_EXT.length);
			renameTo = `${finalBase}${NOTE_EXT}`;
		}
	}
	return { renameTo, eventTitle: newTitle !== finalBase ? newTitle : null };
}
