/**
 * Schema of event notes: how a Rust `VaultIndex` entry of the configured
 * event type becomes a calendar event or a Needs-attention issue, what a
 * calendar write puts in a note, and how pending writes overlay the index
 * snapshot until it catches up.
 *
 * Reads never default a value they cannot read: a present but unreadable
 * `start`, `end` or `all_day` makes the note an issue, so a drag can never
 * overwrite the user's value. Defaults apply only to absent keys.
 */

import type { EventCalendarSettings } from '$lib/core/settings/settings.types';
import type { NoteEntryV2 } from '$lib/types/vault-v2.types';
import type { Property } from '$lib/features/properties/properties.types';
import { EVENT_CALENDAR_COLORS } from '$lib/core/settings/settings.logic';
import { extractBody, parseFrontmatterProperties, rebuildContent } from '$lib/features/properties/properties.logic';
import { excludeSystemFolder } from '$lib/features/type-definitions/type-sidebar.logic';
import { addDays, formatTime, isValidDayKey, parseTimeStrict } from './event-calendar-dates.logic';
import type {
	EventColor,
	EventDraft,
	EventIssue,
	EventIssueReason,
	EventNote,
	EventPatch,
	EventProjection,
	EventState,
	PendingWrite,
} from './event-calendar.types';

const MINUTES_PER_DAY = 1440;

/** Keys whose values must not carry a trailing YAML comment (Rust keeps it in the value). */
const COMMENT_CHECKED_KEYS = ['date', 'end_date', 'start', 'end', 'all_day', 'event_color'] as const;

/** Characters a file name cannot contain (mirrors `isValidFileName` in `fs.logic.ts`). */
const FORBIDDEN_FILE_CHARS = /[<>:"/\\|?*\x00-\x1F]/g;

/** File base used when a title sanitizes to nothing. */
const UNTITLED_EVENT = 'Untitled Event';

/** The settings an event projection falls back to for absent keys. */
export type EventDefaults = Pick<EventCalendarSettings, 'defaultDurationMinutes' | 'defaultColor'>;

/** Options of {@link eventsFromEntries}. */
export interface EventProjectionOptions {
	/** Fallbacks for absent keys. */
	defaults: EventDefaults;
	/** Configured event type name (`settings.eventCalendar.eventTypeName`). */
	typeName: string;
	/** Absolute vault path; needed to exclude the system folder. */
	vaultPath: string | null | undefined;
	/** Vault-relative system/templates folder; blank disables the exclusion. */
	systemFolder: string;
}

/** Result of reading one time field. */
export type EventTime = { kind: 'absent' } | { kind: 'ok'; minutes: number } | { kind: 'invalid' };

/** Result of projecting one entry: an event or an issue. */
export type EntryProjection = { event: EventNote; issue?: undefined } | { event?: undefined; issue: EventIssue };

/** An event as the calendar shows it after the pending overlay. */
export type PendingEventNote = EventNote & {
	/** True while a calendar write for this event has not reached the index (`data-pending`). */
	pending: boolean;
};

/** True for a frontmatter value Rust reports for a missing, bare or empty key. */
function isAbsent(value: unknown): boolean {
	return value === undefined || value === null || value === '';
}

/**
 * Whether an entry is a note of the configured event type.
 * @param entry - Rust index entry
 * @param typeName - configured event type name
 * @returns true when `entry.isA` equals `typeName` ignoring case; a
 *   type-definition note (`isA` of `Type`) never matches
 */
export function isEventEntry(entry: NoteEntryV2, typeName: string): boolean {
	if (typeof entry.isA !== 'string') return false;
	const isA = entry.isA.toLowerCase();
	return isA !== 'type' && isA === typeName.toLowerCase();
}

/**
 * Reads a `start` or `end` value.
 * @param value - raw frontmatter value from the Rust index
 * @returns `absent` for missing, null or `''`; `ok` for an `HH:mm` string or
 *   an integer 0..1440 (the YAML 1.1 sexagesimal fallback); else `invalid`
 */
export function parseEventTime(value: unknown): EventTime {
	if (isAbsent(value)) return { kind: 'absent' };
	if (typeof value === 'string') {
		const minutes = parseTimeStrict(value);
		return minutes === null ? { kind: 'invalid' } : { kind: 'ok', minutes };
	}
	if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MINUTES_PER_DAY) {
		return { kind: 'ok', minutes: value };
	}
	return { kind: 'invalid' };
}

/**
 * Display title of an event note (D6).
 * @param entry - Rust index entry
 * @returns `event_title` when it is a non-empty string, else the filename base
 */
function eventTitle(entry: NoteEntryV2): string {
	const title = entry.frontmatter.event_title;
	return typeof title === 'string' && title !== '' ? title : entry.title;
}

/**
 * Projects one event-typed entry.
 *
 * A span is read-only and carries `endDate`: a note with `end_date` (even
 * the same day as `date`, since a date move would desync it), or a timed
 * note without `end_date` whose `end` is before its `start`, which ends the
 * next day. `end: 00:00` after a later `start` is midnight of the same day.
 * A timed note with `end_date` and no `end` ends at 24:00 of `end_date`.
 * @param entry - Rust index entry of the event type
 * @param defaults - fallbacks for absent keys
 * @returns `{ event }` when it renders, else `{ issue }`
 */
export function entryToEvent(entry: NoteEntryV2, defaults: EventDefaults): EntryProjection {
	const fm = entry.frontmatter;
	const title = eventTitle(entry);
	const issue = (reason: EventIssueReason, detail?: string): EventIssue => ({
		path: entry.path,
		title,
		reason,
		...(detail === undefined ? {} : { detail }),
		rendered: false,
	});

	for (const key of COMMENT_CHECKED_KEYS) {
		const value = fm[key];
		if (typeof value === 'string' && /\s#/.test(value)) return { issue: issue('trailing-comment', key) };
	}

	const date = fm.date;
	if (isAbsent(date)) return { issue: issue('unscheduled', 'no-date') };
	if (!isValidDayKey(date)) return { issue: issue('unscheduled', 'not-a-day') };
	const endDateValue = fm.end_date;
	const hasEndDate = !isAbsent(endDateValue);
	if (hasEndDate && !isValidDayKey(endDateValue)) return { issue: issue('invalid-time', 'end_date') };
	let endDate = hasEndDate ? (endDateValue as string) : date;
	if (endDate < date) return { issue: issue('end-before-start', 'end_date') };

	const start = parseEventTime(fm.start);
	if (start.kind === 'invalid') return { issue: issue('invalid-time', 'start') };
	const end = parseEventTime(fm.end);
	if (end.kind === 'invalid') return { issue: issue('invalid-time', 'end') };
	const allDayValue = fm.all_day;
	if (!isAbsent(allDayValue) && typeof allDayValue !== 'boolean') return { issue: issue('invalid-time', 'all_day') };

	const allDay = allDayValue === true || start.kind === 'absent';
	let startMinutes = 0;
	let endMinutes = MINUTES_PER_DAY;
	if (!allDay && start.kind === 'ok') {
		startMinutes = start.minutes;
		endMinutes =
			end.kind === 'ok'
				? end.minutes
				: hasEndDate
					? MINUTES_PER_DAY
					: Math.min(start.minutes + defaults.defaultDurationMinutes, MINUTES_PER_DAY);
		if (endDate === date && endMinutes < startMinutes) {
			if (endMinutes === 0) endMinutes = MINUTES_PER_DAY;
			else if (!hasEndDate) endDate = addDays(date, 1);
		}
		if (endDate === date && endMinutes <= startMinutes) return { issue: issue('end-before-start', 'end') };
	}

	const colorValue = fm.event_color;
	const color: EventColor =
		typeof colorValue === 'string' && (EVENT_CALENDAR_COLORS as readonly string[]).includes(colorValue)
			? (colorValue as EventColor)
			: defaults.defaultColor;
	const locationValue = fm.location;
	const location = typeof locationValue === 'string' ? locationValue : typeof locationValue === 'number' ? String(locationValue) : '';
	const span = hasEndDate || endDate !== date;

	const event: EventNote = {
		path: entry.path,
		title,
		date,
		...(span ? { endDate } : {}),
		start: startMinutes,
		end: endMinutes,
		allDay,
		color,
		location,
		snippet: entry.snippet,
		readOnly: span,
	};
	return { event };
}

/**
 * Whether an issue counts toward the Needs-attention badge (D26).
 * @param reason - issue reason
 * @returns false only for the informational `unscheduled`
 */
export function isActionableIssue(reason: EventIssueReason): boolean {
	return reason !== 'unscheduled';
}

/**
 * Projects the vault index onto the calendar (D26 read scope).
 * @param entries - the Rust `VaultIndex` snapshot
 * @param options - defaults, type name, vault path and system folder
 * @returns rendered events, issues and the number of archived events left
 *   out; notes under the system folder are skipped entirely
 */
export function eventsFromEntries(entries: NoteEntryV2[], options: EventProjectionOptions): EventProjection {
	const projection: EventProjection = { events: [], issues: [], archivedCount: 0 };
	for (const entry of excludeSystemFolder(entries, options.vaultPath, options.systemFolder)) {
		if (!isEventEntry(entry, options.typeName)) continue;
		if (entry.archived) {
			projection.archivedCount++;
			continue;
		}
		const result = entryToEvent(entry, options.defaults);
		if (result.event) projection.events.push(result.event);
		if (result.issue) projection.issues.push(result.issue);
	}
	return projection;
}

/**
 * Sanitized filename base for a typed title (D6).
 * @param title - title typed by the user
 * @returns the title with every forbidden file-name character replaced by
 *   `-`, trimmed and without leading dots; `Untitled Event` when nothing is
 *   left. With `.md` added it always passes `isValidFileName`.
 */
export function eventFileBase(title: string): string {
	const base = title.replace(FORBIDDEN_FILE_CHARS, '-').trim().replace(/^\.+/, '').trim();
	return base === '' ? UNTITLED_EVENT : base;
}

/**
 * Formats minutes from midnight as the `HH:mm` text a note stores.
 * @param minutes - 0..1440
 * @returns e.g. `09:30`; 1440 is `24:00`
 */
export function formatEventTime(minutes: number): string {
	return formatTime(minutes, '24h');
}

/** Sets `key` in place when present, else appends it. */
function setProperty(properties: Property[], key: string, value: Property['value'], type: Property['type']): Property[] {
	if (properties.some((p) => p.key === key)) {
		return properties.map((p) => (p.key === key ? { key, value, type } : p));
	}
	return [...properties, { key, value, type }];
}

/** Removes `key` when present. */
function deleteProperty(properties: Property[], key: string): Property[] {
	return properties.filter((p) => p.key !== key);
}

/**
 * Applies a calendar patch to a note's properties. Keys are never aliased
 * (every key satisfies `canonicalizeKey(k) === k`), so `color` is never
 * written (D7).
 * @param properties - current properties of the note
 * @param patch - fields to change; `undefined` fields are left alone
 * @returns new properties: `date` typed `date`; `start` / `end` as `HH:mm`
 *   text, removed for an all-day patch; `all_day: true` only for all-day,
 *   removed for `allDay: false` or a `start` / `end` patch without
 *   `allDay: true`; `event_color` when patched; an empty
 *   `location` removed; `event_title` written for a string, removed for null
 */
export function applyEventFields(properties: Property[], patch: EventPatch): Property[] {
	let result = properties;
	if (patch.date !== undefined) result = setProperty(result, 'date', patch.date, 'date');
	if (patch.allDay === true) {
		result = deleteProperty(deleteProperty(result, 'start'), 'end');
		result = setProperty(result, 'all_day', true, 'boolean');
	} else {
		if (patch.allDay === false || patch.start !== undefined || patch.end !== undefined) {
			result = deleteProperty(result, 'all_day');
		}
		if (patch.start !== undefined) result = setProperty(result, 'start', formatEventTime(patch.start), 'text');
		if (patch.end !== undefined) result = setProperty(result, 'end', formatEventTime(patch.end), 'text');
	}
	if (patch.color !== undefined) result = setProperty(result, 'event_color', patch.color, 'text');
	if (patch.location !== undefined) {
		result =
			patch.location.trim() === '' ? deleteProperty(result, 'location') : setProperty(result, 'location', patch.location, 'text');
	}
	if (typeof patch.eventTitle === 'string') result = setProperty(result, 'event_title', patch.eventTitle, 'text');
	else if (patch.eventTitle === null) result = deleteProperty(result, 'event_title');
	return result;
}

/**
 * Merges a draft onto a base note (the Event type template or the inline
 * `_type` template). Pure: it assumes a safe base; the caller refuses a
 * lossy template first (`createEvent`, ticket 28).
 * @param baseContent - template content, possibly empty
 * @param draft - the new event
 * @param fileBase - filename base the note will get (`eventFileBase`)
 * @param typeName - resolved event type name, written when the base has no `_type`
 * @returns full note content: the base's keys with the draft's fields
 *   applied (`event_title` only when the title differs from `fileBase`),
 *   then the draft's notes and the template body joined by one blank line
 */
export function applyEventDraft(baseContent: string, draft: EventDraft, fileBase: string, typeName: string): string {
	let properties = parseFrontmatterProperties(baseContent);
	if (!properties.some((p) => p.key === '_type')) {
		properties = [{ key: '_type', value: typeName, type: 'text' }, ...properties];
	}
	properties = applyEventFields(properties, {
		date: draft.date,
		start: draft.start,
		end: draft.end,
		allDay: draft.allDay,
		color: draft.color,
		location: draft.location,
		eventTitle: draft.title !== fileBase ? draft.title : null,
	});
	const templateBody = extractBody(baseContent);
	const notes = draft.notes.replace(/\n+$/, '');
	const trimmedBody = templateBody.replace(/^\n+/, '');
	const body = notes === '' ? templateBody : trimmedBody === '' ? draft.notes : `${notes}\n\n${trimmedBody}`;
	return rebuildContent(properties, body);
}

/**
 * The calendar-visible state of an event, the undo precondition.
 * @param event - rendered event
 * @returns its title and fields
 */
export function eventState(event: EventNote): EventState {
	return {
		title: event.title,
		date: event.date,
		...(event.endDate === undefined ? {} : { endDate: event.endDate }),
		start: event.start,
		end: event.end,
		allDay: event.allDay,
		color: event.color,
		location: event.location,
	};
}

/**
 * Every `EventState` key, checked at compile time: a field added to
 * `EventState` fails here until it is listed, so `sameEventState` never
 * misses it.
 */
const EVENT_STATE_KEY_SET = {
	title: true,
	date: true,
	endDate: true,
	start: true,
	end: true,
	allDay: true,
	color: true,
	location: true,
} satisfies Record<keyof EventState, true>;

/** The keys of `EVENT_STATE_KEY_SET`, in declaration order. */
export const EVENT_STATE_KEYS: readonly (keyof EventState)[] = Object.keys(EVENT_STATE_KEY_SET) as (keyof EventState)[];

/**
 * Whether two event states are equal field by field.
 * @param a - one state
 * @param b - the other state
 */
export function sameEventState(a: EventState, b: EventState): boolean {
	return EVENT_STATE_KEYS.every((key) => a[key] === b[key]);
}

/**
 * Resolves the configured event type to the casing an existing type uses,
 * for the exact-key lookup of `createTypedNote`.
 * @param typeNames - names of the vault's type definitions
 * @param configured - `settings.eventCalendar.eventTypeName`
 * @returns the first name equal to `configured` ignoring case, else `configured`
 */
export function resolveEventTypeName(typeNames: readonly string[], configured: string): string {
	const wanted = configured.toLowerCase();
	return typeNames.find((name) => name.toLowerCase() === wanted) ?? configured;
}

/**
 * Inline style for an event chip.
 * @param color - event color
 * @returns `background` and `color` pointing at the `--event-<c>-*` tokens
 */
export function eventColorStyle(color: EventColor): string {
	return `background: var(--event-${color}-bg); color: var(--event-${color}-fg)`;
}

/**
 * Overlays pending writes on the projected snapshot.
 * @param snapshot - events projected from the current index snapshot
 * @param pending - writes the index may not reflect yet
 * @returns the snapshot with each `update` state applied, each `delete`
 *   path hidden (rename tombstones included) and each `create` appended in
 *   place of any snapshot copy. An `update` whose path is not in the
 *   snapshot (the new path of a rename) is appended as an event built from
 *   its state, with an empty snippet, read-only when the state is a span
 *   (`endDate`). Overlaid and
 *   created events carry `pending: true`
 */
export function mergePending(snapshot: EventNote[], pending: PendingWrite[]): PendingEventNote[] {
	const hidden = new Set<string>();
	const updates = new Map<string, EventState>();
	const creates: EventNote[] = [];
	for (const write of pending) {
		if (write.kind === 'delete') hidden.add(write.path);
		else if (write.kind === 'update') updates.set(write.path, write.state);
		else {
			hidden.add(write.path);
			creates.push(write.event);
		}
	}
	const merged: PendingEventNote[] = [];
	const seen = new Set<string>();
	for (const event of snapshot) {
		seen.add(event.path);
		if (hidden.has(event.path)) continue;
		const state = updates.get(event.path);
		merged.push(state ? { ...event, ...state, pending: true } : { ...event, pending: false });
	}
	for (const [path, state] of updates) {
		if (seen.has(path) || hidden.has(path)) continue;
		merged.push({ path, ...state, snippet: '', readOnly: state.endDate !== undefined, pending: true });
	}
	for (const event of creates) {
		if (pending.some((w) => w.kind === 'delete' && w.path === event.path)) continue;
		merged.push({ ...event, pending: true });
	}
	return merged;
}

/**
 * Drops the pending writes the index has caught up with.
 * @param pending - current pending writes
 * @param snapshot - events projected from the current index snapshot
 * @param version - current `vaultIndexVersion`
 * @returns the writes still pending. Unsettled writes always stay. A settled
 *   `update` goes when the snapshot event at its path has its state, a
 *   settled `create` with a version clock likewise (a renamed note is
 *   indexed before its field write), a settled `create` without one (the
 *   one `remapPath` leaves) when its path is present, a settled `delete`
 *   when its path is absent. Any other settled write goes only once
 *   `version >= settledAtVersion + 2`, because the first refresh after a
 *   settle can predate Rust's fire-and-forget index update.
 */
export function prunePending(pending: PendingWrite[], snapshot: EventNote[], version: number): PendingWrite[] {
	const byPath = new Map(snapshot.map((e) => [e.path, e]));
	return pending.filter((write) => {
		if (!write.settled) return true;
		const current = byPath.get(write.path);
		if (write.kind === 'update' && current && sameEventState(eventState(current), write.state)) return false;
		if (write.kind === 'create' && current && (write.settledAtVersion === undefined || sameEventState(eventState(current), eventState(write.event)))) return false;
		if (write.kind === 'delete' && !current) return false;
		return write.settledAtVersion === undefined || version < write.settledAtVersion + 2;
	});
}
