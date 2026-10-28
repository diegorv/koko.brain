import { beforeEach, describe, expect, it } from 'vitest';

import { isValidFileName } from '$lib/core/filesystem/fs.logic';
import {
	EVENT_STATE_KEYS,
	applyEventDraft,
	applyEventFields,
	entryToEvent,
	eventColorStyle,
	eventFileBase,
	eventsFromEntries,
	eventState,
	formatEventTime,
	isActionableIssue,
	isEventEntry,
	mergePending,
	parseEventTime,
	prunePending,
	resolveEventTypeName,
	sameEventState,
	type EventDefaults,
} from '$lib/features/event-calendar/event-calendar-event.logic';
import type { EventDraft, EventNote, PendingWrite } from '$lib/features/event-calendar/event-calendar.types';
import { _resetParseFrontmatterCache, parseFrontmatterProperties } from '$lib/features/properties/properties.logic';
import type { Property } from '$lib/features/properties/properties.types';
import type { FrontmatterValue } from '$lib/types/vault-v2.types';
import { canonicalizeKey } from '$lib/utils/frontmatter-aliases';
import {
	eventEntry,
	eventEntryFromContent,
	eventNote,
	rustFrontmatter,
	SEED_EVENTS,
} from '../../../fixtures/event-notes.fixture';

const VAULT = '/vault';
const DEFAULTS: EventDefaults = { defaultDurationMinutes: 60, defaultColor: 'blue' };
const P = (name: string) => `${VAULT}/${name}.md`;

function eventOf(result: ReturnType<typeof entryToEvent>): EventNote {
	if (!result.event) throw new Error(`expected an event, got issue ${result.issue.reason}`);
	return result.event;
}

function issueOf(result: ReturnType<typeof entryToEvent>) {
	if (!result.issue) throw new Error('expected an issue');
	return result.issue;
}

function makeEvent(path: string, overrides: Partial<EventNote> = {}): EventNote {
	return {
		path,
		title: 'Standup',
		date: '2026-11-10',
		start: 570,
		end: 600,
		allDay: false,
		color: 'blue',
		location: '',
		snippet: '',
		readOnly: false,
		...overrides,
	};
}

function draft(overrides: Partial<EventDraft> = {}): EventDraft {
	return {
		title: 'Standup',
		date: '2026-11-10',
		start: 570,
		end: 600,
		allDay: false,
		color: 'blue',
		location: '',
		notes: '',
		...overrides,
	};
}

function prop(props: Property[], key: string): Property | undefined {
	return props.find((p) => p.key === key);
}

beforeEach(() => {
	_resetParseFrontmatterCache();
});

describe('isEventEntry', () => {
	it('matches the configured type ignoring case', () => {
		expect(isEventEntry(eventEntry(P('a'), { _type: 'EVENT' }), 'Event')).toBe(true);
		expect(isEventEntry(eventEntry(P('a'), { _type: 'event' }), 'event')).toBe(true);
		expect(isEventEntry(eventEntry(P('a'), { _type: 'Meeting' }), 'Event')).toBe(false);
	});

	it('supports a configured Meeting type', () => {
		expect(isEventEntry(eventEntry(P('a'), { _type: 'meeting' }), 'Meeting')).toBe(true);
		expect(isEventEntry(eventEntry(P('a')), 'Meeting')).toBe(false);
	});

	it('never matches an untyped or a type-definition note', () => {
		expect(isEventEntry(eventEntry(P('a'), {}, { isA: null }), 'Event')).toBe(false);
		expect(isEventEntry(eventEntry(P('a'), { _type: 'Type' }), 'Type')).toBe(false);
		expect(isEventEntry(eventEntry(P('a'), { _type: 'type' }), 'type')).toBe(false);
	});
});

describe('parseEventTime', () => {
	it('treats missing, null and empty as absent', () => {
		expect(parseEventTime(undefined)).toEqual({ kind: 'absent' });
		expect(parseEventTime(null)).toEqual({ kind: 'absent' });
		expect(parseEventTime('')).toEqual({ kind: 'absent' });
	});

	it('reads HH:mm strings and the integer fallback', () => {
		expect(parseEventTime('09:30')).toEqual({ kind: 'ok', minutes: 570 });
		expect(parseEventTime('24:00')).toEqual({ kind: 'ok', minutes: 1440 });
		expect(parseEventTime(570)).toEqual({ kind: 'ok', minutes: 570 });
		expect(parseEventTime(0)).toEqual({ kind: 'ok', minutes: 0 });
		expect(parseEventTime(1440)).toEqual({ kind: 'ok', minutes: 1440 });
	});

	it('rejects everything else', () => {
		for (const value of ['9:30 AM', '2026-11-12', '2026-11-10T09:30', '25:00', 1441, -1, 9.5, true, ['09:30']]) {
			expect(parseEventTime(value)).toEqual({ kind: 'invalid' });
		}
	});
});

describe('entryToEvent', () => {
	it('projects a timed event', () => {
		const entry = eventEntry(P('Standup'), { date: '2026-11-10', start: '09:30', end: '10:00', event_color: 'purple', location: 'Room 1' }, { snippet: 'agenda' });
		expect(eventOf(entryToEvent(entry, DEFAULTS))).toEqual({
			path: P('Standup'),
			title: 'Standup',
			date: '2026-11-10',
			start: 570,
			end: 600,
			allDay: false,
			color: 'purple',
			location: 'Room 1',
			snippet: 'agenda',
			readOnly: false,
		});
	});

	it('defaults a missing end to start plus the duration, capped at 1440', () => {
		expect(eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '09:30' }), DEFAULTS)).end).toBe(630);
		expect(eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '23:30' }), DEFAULTS)).end).toBe(1440);
		expect(eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '09:00', end: null }), { ...DEFAULTS, defaultDurationMinutes: 30 })).end).toBe(570);
	});

	it('treats a missing or empty start, or all_day true, as all-day', () => {
		const cases: Record<string, FrontmatterValue>[] = [{ date: '2026-11-10' }, { date: '2026-11-10', start: '' }, { date: '2026-11-10', start: null }, { date: '2026-11-10', start: '09:00', end: '10:00', all_day: true }];
		for (const fm of cases) {
			const event = eventOf(entryToEvent(eventEntry(P('a'), fm), DEFAULTS));
			expect(event).toMatchObject({ allDay: true, start: 0, end: 1440 });
		}
	});

	it('reads all_day false as a timed event', () => {
		expect(eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '09:00', all_day: false }), DEFAULTS)).allDay).toBe(false);
	});

	it('accepts the integer fallback', () => {
		const event = eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: 570, end: 600 }), DEFAULTS));
		expect(event).toMatchObject({ start: 570, end: 600 });
	});

	it('renders an unknown color with the default color', () => {
		expect(eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', event_color: 'teal' }), DEFAULTS)).color).toBe('blue');
		expect(eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10' }), { ...DEFAULTS, defaultColor: 'pink' })).color).toBe('pink');
	});

	it('prefers a non-empty event_title over the filename', () => {
		expect(eventOf(entryToEvent(eventEntry(P('1-1 with manager'), { date: '2026-11-04', event_title: '1:1 with manager' }), DEFAULTS)).title).toBe('1:1 with manager');
		expect(eventOf(entryToEvent(eventEntry(P('Standup'), { date: '2026-11-04', event_title: '' }), DEFAULTS)).title).toBe('Standup');
		expect(eventOf(entryToEvent(eventEntry(P('Standup'), { date: '2026-11-04', event_title: 42 }), DEFAULTS)).title).toBe('Standup');
	});

	it('reports a missing or empty date as unscheduled no-date', () => {
		const cases: Record<string, FrontmatterValue>[] = [{}, { date: '' }, { date: null }];
		for (const fm of cases) {
			const issue = issueOf(entryToEvent(eventEntry(P('a'), fm), DEFAULTS));
			expect(issue).toMatchObject({ reason: 'unscheduled', detail: 'no-date', rendered: false, path: P('a'), title: 'a' });
			expect('event' in entryToEvent(eventEntry(P('a'), fm), DEFAULTS)).toBe(false);
		}
	});

	it('reports a date that is not a day as unscheduled not-a-day', () => {
		for (const date of ['2024-03-02T14:00', '2026-02-30', 'tomorrow', 20261110]) {
			expect(issueOf(entryToEvent(eventEntry(P('a'), { date }), DEFAULTS))).toMatchObject({ reason: 'unscheduled', detail: 'not-a-day' });
		}
	});

	it('reports an invalid start or end as invalid-time and never renders it', () => {
		const cases: Record<string, FrontmatterValue>[] = [
			{ start: '9:30 AM' },
			{ start: '09:00', end: '2026-11-12' },
			{ start: '2026-11-10T09:30' },
			{ start: '09:00', end: '25:00' },
			{ end: 'noon' },
		];
		for (const fm of cases) {
			const result = entryToEvent(eventEntry(P('a'), { date: '2026-11-10', ...fm }), DEFAULTS);
			expect('event' in result).toBe(false);
			expect(issueOf(result)).toMatchObject({ reason: 'invalid-time', rendered: false });
		}
	});

	it('reports an all_day that is not a boolean as invalid-time', () => {
		expect(issueOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', all_day: 'yes' }), DEFAULTS))).toMatchObject({ reason: 'invalid-time', detail: 'all_day' });
		expect(issueOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', all_day: 1 }), DEFAULTS)).reason).toBe('invalid-time');
	});

	it('reports an empty range as end-before-start', () => {
		expect(issueOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '10:00', end: '10:00' }), DEFAULTS))).toMatchObject({ reason: 'end-before-start', detail: 'end', rendered: false });
		expect(issueOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '24:00' }), DEFAULTS)).reason).toBe('end-before-start');
		expect(issueOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '00:00', end: '00:00' }), DEFAULTS)).reason).toBe('end-before-start');
	});

	it('renders an end before the start as a read-only event that ends the next day', () => {
		const result = entryToEvent(eventEntry(P('Late show'), { date: '2026-11-10', start: '23:00', end: '01:00' }), DEFAULTS);
		expect(result.issue).toBeUndefined();
		expect(eventOf(result)).toMatchObject({ date: '2026-11-10', endDate: '2026-11-11', start: 1380, end: 60, allDay: false, readOnly: true });
	});

	it('crosses the month and year boundary', () => {
		const result = entryToEvent(eventEntry(P('NYE'), { date: '2026-12-31', start: '22:00', end: '02:00' }), DEFAULTS);
		expect(eventOf(result)).toMatchObject({ date: '2026-12-31', endDate: '2027-01-01' });
	});

	it('reads end 00:00 after a later start as midnight of the same day, editable', () => {
		const event = eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '23:00', end: '00:00' }), DEFAULTS));
		expect(event).toMatchObject({ date: '2026-11-10', start: 1380, end: 1440, readOnly: false });
		expect(event.endDate).toBeUndefined();
	});

	it('leaves endDate off a single-day event', () => {
		expect('endDate' in eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '09:00', end: '10:00' }), DEFAULTS))).toBe(false);
	});

	it('reports a trailing comment in a time field', () => {
		for (const [key, value] of [['date', '2026-11-10 # x'], ['end_date', '2026-11-12 # x'], ['start', '09:30 # standup'], ['end', '10:00 # x'], ['all_day', 'true # x'], ['event_color', 'blue # x']]) {
			const result = entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '09:00', [key]: value }), DEFAULTS);
			expect(issueOf(result)).toMatchObject({ reason: 'trailing-comment', detail: key, rendered: false });
		}
	});

	it('reports a trailing comment after a tab', () => {
		const result = entryToEvent(eventEntry(P('a'), { date: '2026-11-10\t# x', start: '09:00' }), DEFAULTS);
		expect(issueOf(result)).toMatchObject({ reason: 'trailing-comment', detail: 'date', rendered: false });
	});

	it('never reports a trailing comment in location, event_title or the filename', () => {
		const entry = eventEntry(P('Sprint #4'), { date: '2026-11-10', location: 'Room #4', event_title: 'Retro #4' });
		const result = entryToEvent(entry, DEFAULTS);
		expect(result.issue).toBeUndefined();
		expect(eventOf(result)).toMatchObject({ location: 'Room #4', title: 'Retro #4' });
	});

	it('renders an end_date note as a read-only span without an issue', () => {
		const timed = entryToEvent(eventEntry(P('Trip'), { date: '2026-11-10', start: '09:00', end: '17:00', end_date: '2026-11-12' }), DEFAULTS);
		expect(timed.issue).toBeUndefined();
		expect(eventOf(timed)).toMatchObject({ date: '2026-11-10', endDate: '2026-11-12', start: 540, end: 1020, allDay: false, readOnly: true });
		const allDay = eventOf(entryToEvent(eventEntry(P('Retreat'), { date: '2026-11-10', end_date: '2026-11-12' }), DEFAULTS));
		expect(allDay).toMatchObject({ date: '2026-11-10', endDate: '2026-11-12', start: 0, end: 1440, allDay: true, readOnly: true });
	});

	it('ends a timed end_date note without end at 24:00 of end_date, and allows an end before the start', () => {
		expect(eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '09:00', end_date: '2026-11-11' }), DEFAULTS))).toMatchObject({ endDate: '2026-11-11', start: 540, end: 1440 });
		expect(eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '18:00', end: '08:00', end_date: '2026-11-12' }), DEFAULTS))).toMatchObject({ endDate: '2026-11-12', start: 1080, end: 480 });
	});

	it('keeps an end_date on the same day read-only, without crossing midnight', () => {
		expect(eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '09:00', end: '10:00', end_date: '2026-11-10' }), DEFAULTS))).toMatchObject({ endDate: '2026-11-10', readOnly: true });
		expect(issueOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '23:00', end: '01:00', end_date: '2026-11-10' }), DEFAULTS))).toMatchObject({ reason: 'end-before-start', detail: 'end' });
	});

	it('reports an unreadable end_date as invalid-time and one before date as end-before-start', () => {
		for (const value of ['soon', '2026-11-12T10:00', '2026-02-30']) {
			expect(issueOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', end_date: value }), DEFAULTS))).toMatchObject({ reason: 'invalid-time', detail: 'end_date' });
		}
		expect(issueOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', end_date: '2026-11-09' }), DEFAULTS))).toMatchObject({ reason: 'end-before-start', detail: 'end_date' });
	});

	it('treats an empty end_date as absent', () => {
		const event = eventOf(entryToEvent(eventEntry(P('a'), { date: '2026-11-10', start: '09:00', end_date: '' }), DEFAULTS));
		expect(event).toMatchObject({ readOnly: false });
		expect(event.endDate).toBeUndefined();
	});

	it('only unscheduled is not actionable', () => {
		expect(isActionableIssue('unscheduled')).toBe(false);
		for (const reason of ['invalid-time', 'end-before-start', 'trailing-comment'] as const) {
			expect(isActionableIssue(reason)).toBe(true);
		}
	});
});

describe('eventsFromEntries', () => {
	const opts = { defaults: DEFAULTS, typeName: 'Event', vaultPath: VAULT, systemFolder: '_system' };

	it('returns an empty projection for no entries', () => {
		expect(eventsFromEntries([], opts)).toEqual({ events: [], issues: [], archivedCount: 0 });
	});

	it('projects events and issues, skipping other types', () => {
		const projection = eventsFromEntries(
			[
				eventEntry(P('a'), { date: '2026-11-10' }),
				eventEntry(P('b'), {}),
				eventEntry(P('c'), { date: '2026-11-10', end_date: '2026-11-11' }),
				eventEntry(P('d'), { _type: 'Book', date: '2026-11-10' }),
			],
			opts,
		);
		expect(projection.events.map((e) => e.path)).toEqual([P('a'), P('c')]);
		expect(projection.issues.map((i) => [i.path, i.reason])).toEqual([[P('b'), 'unscheduled']]);
		expect(projection.archivedCount).toBe(0);
	});

	it('excludes an Event note under the system templates folder', () => {
		const template = eventEntry(`${VAULT}/_system/templates/Event.md`, { date: '<% tp.date.now() %>' });
		expect(eventsFromEntries([template], opts)).toEqual({ events: [], issues: [], archivedCount: 0 });
	});

	it('includes the template when systemFolder is blank', () => {
		const template = eventEntry(`${VAULT}/_system/templates/Event.md`, { date: '<% tp.date.now() %>' });
		const projection = eventsFromEntries([template], { ...opts, systemFolder: '  ' });
		expect(projection.issues).toHaveLength(1);
		expect(projection.issues[0]).toMatchObject({ reason: 'unscheduled', detail: 'not-a-day' });
	});

	it('hides archived events and counts them', () => {
		const projection = eventsFromEntries(
			[eventEntry(P('a'), { date: '2026-11-10' }, { archived: true }), eventEntry(P('b'), {}, { archived: true }), eventEntry(P('c'), { date: '2026-11-11' })],
			opts,
		);
		expect(projection.events.map((e) => e.path)).toEqual([P('c')]);
		expect(projection.issues).toEqual([]);
		expect(projection.archivedCount).toBe(2);
	});

	it('honors a configured Meeting type', () => {
		const projection = eventsFromEntries([eventEntry(P('a'), { _type: 'meeting', date: '2026-11-10' }), eventEntry(P('b'), { date: '2026-11-10' })], { ...opts, typeName: 'Meeting' });
		expect(projection.events.map((e) => e.path)).toEqual([P('a')]);
	});

	it('projects every prototype seed event', () => {
		const entries = SEED_EVENTS.map((s) =>
			eventEntry(P(s.id), {
				date: s.date,
				...(s.allDay ? { all_day: true } : { start: formatEventTime(s.start), end: formatEventTime(s.end) }),
				event_color: s.color,
				event_title: s.title,
			}),
		);
		const projection = eventsFromEntries(entries, opts);
		expect(projection.issues).toEqual([]);
		expect(projection.events.map((e) => eventState(e))).toEqual(
			SEED_EVENTS.map((s) => ({ title: s.title, date: s.date, start: s.start, end: s.end, allDay: s.allDay, color: s.color, location: '' })),
		);
	});
});

describe('eventFileBase', () => {
	it('replaces forbidden characters, trims and strips leading dots', () => {
		expect(eventFileBase('1:1 with manager')).toBe('1-1 with manager');
		expect(eventFileBase('Lunch w/ Bob')).toBe('Lunch w- Bob');
		expect(eventFileBase('.hidden')).toBe('hidden');
		expect(eventFileBase('  Standup  ')).toBe('Standup');
		expect(eventFileBase('a<b>c"d|e?f*g\\h\u0001')).toBe('a-b-c-d-e-f-g-h-');
	});

	it('falls back to Untitled Event when nothing is left', () => {
		expect(eventFileBase('...')).toBe('Untitled Event');
		expect(eventFileBase('  ')).toBe('Untitled Event');
		expect(eventFileBase('')).toBe('Untitled Event');
	});

	it('always produces a valid file name', () => {
		for (const title of ['1:1 with manager', 'Lunch w/ Bob', '.hidden', '...', '  ', ' . x', 'a\tb', ...SEED_EVENTS.map((s) => s.title)]) {
			expect(isValidFileName(`${eventFileBase(title)}.md`)).toBe(true);
		}
	});
});

describe('applyEventFields', () => {
	it('writes a timed event with canonical keys and types', () => {
		const props = applyEventFields([], { date: '2026-11-10', start: 570, end: 1440, allDay: false, color: 'cyan', location: 'Room 1' });
		expect(props).toEqual([
			{ key: 'date', value: '2026-11-10', type: 'date' },
			{ key: 'start', value: '09:30', type: 'text' },
			{ key: 'end', value: '24:00', type: 'text' },
			{ key: 'event_color', value: 'cyan', type: 'text' },
			{ key: 'location', value: 'Room 1', type: 'text' },
		]);
	});

	it('removes start and end for all-day events and writes all_day true', () => {
		const base: Property[] = [
			{ key: 'start', value: '09:00', type: 'text' },
			{ key: 'end', value: '10:00', type: 'text' },
		];
		expect(applyEventFields(base, { allDay: true, start: 0, end: 1440 })).toEqual([{ key: 'all_day', value: true, type: 'boolean' }]);
	});

	it('removes all_day for a timed event', () => {
		const base: Property[] = [{ key: 'all_day', value: true, type: 'boolean' }];
		expect(applyEventFields(base, { allDay: false, start: 540, end: 600 })).toEqual([
			{ key: 'start', value: '09:00', type: 'text' },
			{ key: 'end', value: '10:00', type: 'text' },
		]);
	});

	it('removes all_day for a start/end patch without allDay', () => {
		const base: Property[] = [{ key: 'all_day', value: true, type: 'boolean' }];
		expect(applyEventFields(base, { start: 540, end: 600 })).toEqual([
			{ key: 'start', value: '09:00', type: 'text' },
			{ key: 'end', value: '10:00', type: 'text' },
		]);
		expect(applyEventFields(base, { end: 600 })).toEqual([{ key: 'end', value: '10:00', type: 'text' }]);
		expect(applyEventFields(base, { color: 'pink' })).toEqual([...base, { key: 'event_color', value: 'pink', type: 'text' }]);
	});

	it('updates existing keys in place and keeps unrelated ones', () => {
		const base: Property[] = [
			{ key: '_type', value: 'Event', type: 'text' },
			{ key: 'start', value: 570, type: 'number' },
			{ key: 'tags', value: ['work'], type: 'list' },
		];
		expect(applyEventFields(base, { start: 600 })).toEqual([
			{ key: '_type', value: 'Event', type: 'text' },
			{ key: 'start', value: '10:00', type: 'text' },
			{ key: 'tags', value: ['work'], type: 'list' },
		]);
	});

	it('removes an empty location', () => {
		const base: Property[] = [{ key: 'location', value: 'Room 1', type: 'text' }];
		expect(applyEventFields(base, { location: '' })).toEqual([]);
		expect(applyEventFields(base, { location: '   ' })).toEqual([]);
	});

	it('writes event_title for a string and removes it for null', () => {
		expect(applyEventFields([], { eventTitle: '1:1 with manager' })).toEqual([{ key: 'event_title', value: '1:1 with manager', type: 'text' }]);
		expect(applyEventFields([{ key: 'event_title', value: 'x', type: 'text' }], { eventTitle: null })).toEqual([]);
		expect(applyEventFields([{ key: 'event_title', value: 'x', type: 'text' }], {})).toEqual([{ key: 'event_title', value: 'x', type: 'text' }]);
	});

	it('returns the input unchanged for an empty patch', () => {
		expect(applyEventFields([], {})).toEqual([]);
	});

	it('never writes an aliased key', () => {
		const props = applyEventFields([], { date: '2026-11-10', start: 0, end: 60, allDay: true, color: 'pink', location: 'x', eventTitle: 'y' });
		for (const p of props) expect(canonicalizeKey(p.key)).toBe(p.key);
		expect(props.some((p) => p.key === 'color' || p.key === '_color')).toBe(false);
	});
});

describe('applyEventDraft', () => {
	it('round-trips start and date through the real parser', () => {
		const content = applyEventDraft('', draft(), 'Standup', 'Event');
		const props = parseFrontmatterProperties(content);
		expect(prop(props, 'start')?.value).toBe('09:30');
		expect(prop(props, 'end')?.value).toBe('10:00');
		expect(prop(props, 'date')?.value).toBe('2026-11-10');
		expect(prop(props, '_type')?.value).toBe('Event');
		expect(prop(props, 'event_title')).toBeUndefined();
	});

	it('writes event_title only when the title differs from the file base', () => {
		const withTitle = applyEventDraft('', draft({ title: '1:1 with manager' }), eventFileBase('1:1 with manager'), 'Event');
		expect(prop(parseFrontmatterProperties(withTitle), 'event_title')?.value).toBe('1:1 with manager');
		const withoutTitle = applyEventDraft('', draft({ title: 'Standup' }), 'Standup', 'Event');
		expect(prop(parseFrontmatterProperties(withoutTitle), 'event_title')).toBeUndefined();
	});

	it('drops a template event_title when the title is the file base', () => {
		const template = '---\n_type: Event\nevent_title: Old\n---\n';
		expect(prop(parseFrontmatterProperties(applyEventDraft(template, draft(), 'Standup', 'Event')), 'event_title')).toBeUndefined();
	});

	it('keeps template keys and body, and keeps _type', () => {
		const template = '---\n_type: Meeting\nattendees: [Ana, Bob]\n---\n## Agenda\n';
		const content = applyEventDraft(template, draft({ notes: 'Bring slides' }), 'Standup', 'Event');
		const props = parseFrontmatterProperties(content);
		expect(prop(props, '_type')?.value).toBe('Meeting');
		expect(prop(props, 'attendees')?.value).toEqual(['Ana', 'Bob']);
		expect(content.endsWith('---\nBring slides\n\n## Agenda\n')).toBe(true);
	});

	it('joins notes and the template body with exactly one blank line', () => {
		const content = applyEventDraft('---\n_type: Event\n---\n\n## Agenda\n', draft({ notes: 'Hi\n' }), 'Standup', 'Event');
		expect(content.endsWith('---\nHi\n\n## Agenda\n')).toBe(true);
	});

	it('adds _type when the base has none', () => {
		const content = applyEventDraft('---\ntags: [work]\n---\nBody\n', draft(), 'Standup', 'Meeting');
		const props = parseFrontmatterProperties(content);
		expect(props[0]).toEqual({ key: '_type', value: 'Meeting', type: 'text' });
		expect(prop(props, 'tags')?.value).toEqual(['work']);
		expect(content.endsWith('---\nBody\n')).toBe(true);
	});

	it('writes an all-day draft without start or end', () => {
		const props = parseFrontmatterProperties(applyEventDraft('', draft({ allDay: true, start: 0, end: 1440 }), 'Standup', 'Event'));
		expect(prop(props, 'all_day')?.value).toBe(true);
		expect(prop(props, 'start')).toBeUndefined();
		expect(prop(props, 'end')).toBeUndefined();
	});

	it('never writes color, and the notes alone become the body', () => {
		const content = applyEventDraft('---\ncolor: red\n---\n', draft({ color: 'green', notes: 'Hi' }), 'Standup', 'Event');
		expect(content).not.toMatch(/^color:/m);
		expect(prop(parseFrontmatterProperties(content), 'event_color')?.value).toBe('green');
		expect(content.endsWith('---\nHi')).toBe(true);
	});

	it('reads Room #4 back as an event, not an issue', () => {
		const content = applyEventDraft('', draft({ location: 'Room #4' }), 'Standup', 'Event');
		expect(rustFrontmatter(content).location).toBe('Room #4');
		const result = entryToEvent(eventEntryFromContent(P('Standup'), content), DEFAULTS);
		expect(result.issue).toBeUndefined();
		expect(eventOf(result)).toMatchObject({ location: 'Room #4', start: 570, end: 600, date: '2026-11-10' });
	});

	it('round-trips through the Rust-shaped fixture for a forbidden-character title', () => {
		const base = eventFileBase('1:1 with manager');
		const content = applyEventDraft('', draft({ title: '1:1 with manager' }), base, 'Event');
		expect(eventOf(entryToEvent(eventEntryFromContent(P(base), content), DEFAULTS)).title).toBe('1:1 with manager');
	});
});

describe('the Rust-shaped fixture', () => {
	it('models a bare key as null and a quoted empty as empty', () => {
		const fm = rustFrontmatter(eventNote({ type: 'event', start: '', end: '""', all_day: 'true', count: '570', location: '"Room #4"', note: '09:30 # x' }));
		expect(fm).toEqual({ _type: 'event', start: null, end: '', all_day: true, count: 570, location: 'Room #4', note: '09:30 # x' });
		expect(eventEntryFromContent(P('a'), eventNote({ type: 'event' })).isA).toBe('Event');
	});
});

describe('small helpers', () => {
	it('formatEventTime gives 24:00 for 1440', () => {
		expect(formatEventTime(1440)).toBe('24:00');
		expect(formatEventTime(570)).toBe('09:30');
		expect(formatEventTime(0)).toBe('00:00');
	});

	it('eventState and sameEventState compare the calendar-visible state', () => {
		const a = makeEvent(P('a'), { snippet: 'x', readOnly: true });
		expect(eventState(a)).toEqual({ title: 'Standup', date: '2026-11-10', start: 570, end: 600, allDay: false, color: 'blue', location: '' });
		expect(sameEventState(eventState(a), eventState(makeEvent(P('b'))))).toBe(true);
		for (const change of [{ title: 'x' }, { date: '2026-11-11' }, { start: 0 }, { end: 1 }, { allDay: true }, { color: 'pink' as const }, { location: 'y' }]) {
			expect(sameEventState(eventState(a), { ...eventState(a), ...change })).toBe(false);
		}
	});

	it('eventState carries the endDate of a span, and sameEventState tells a span from a single day', () => {
		const span = makeEvent(P('a'), { endDate: '2026-11-11', readOnly: true });
		expect(eventState(span)).toMatchObject({ date: '2026-11-10', endDate: '2026-11-11' });
		expect(sameEventState(eventState(span), eventState(makeEvent(P('a'))))).toBe(false);
	});

	it('EVENT_STATE_KEYS lists every key eventState produces, so sameEventState compares them all', () => {
		const s = eventState(makeEvent(P('a'), { endDate: '2026-11-11' }));
		expect([...EVENT_STATE_KEYS].sort()).toEqual(Object.keys(s).sort());
		for (const key of Object.keys(s) as (keyof typeof s)[]) {
			const value = s[key];
			const other = typeof value === 'number' ? value + 1 : typeof value === 'boolean' ? !value : `${value}x`;
			const changed = { ...s, [key]: other };
			expect(sameEventState(s, changed)).toBe(false);
		}
	});

	it('resolveEventTypeName returns the existing casing, else the configured name', () => {
		expect(resolveEventTypeName(['Book', 'event'], 'Event')).toBe('event');
		expect(resolveEventTypeName(['Book'], 'Event')).toBe('Event');
		expect(resolveEventTypeName([], 'Meeting')).toBe('Meeting');
	});

	it('eventColorStyle points at the color tokens', () => {
		expect(eventColorStyle('cyan')).toBe('background: var(--event-cyan-bg); color: var(--event-cyan-fg)');
	});
});

describe('mergePending', () => {
	const a = makeEvent(P('a'));
	const b = makeEvent(P('b'), { title: 'Other' });

	it('marks snapshot events as not pending when nothing is pending', () => {
		expect(mergePending([a], [])).toEqual([{ ...a, pending: false }]);
		expect(mergePending([], [])).toEqual([]);
	});

	it('overlays the state of an update', () => {
		const state = { ...eventState(a), start: 600, end: 660, title: 'Moved' };
		const merged = mergePending([a, b], [{ kind: 'update', path: P('a'), state, settled: false }]);
		expect(merged).toEqual([{ ...a, ...state, pending: true }, { ...b, pending: false }]);
	});

	it('builds an event from an update whose path the snapshot does not have', () => {
		const state = { ...eventState(a), title: 'Elsewhere' };
		expect(mergePending([a], [{ kind: 'update', path: P('zz'), state, settled: false }])).toEqual([
			{ ...a, pending: false },
			{ path: P('zz'), ...state, snippet: '', readOnly: false, pending: true },
		]);
	});

	it('keeps a span read-only when an update builds it from its state', () => {
		const state = { ...eventState(makeEvent(P('a'), { endDate: '2026-11-12' })), title: 'Trip' };
		expect(mergePending([], [{ kind: 'update', path: P('zz'), state, settled: false }])).toEqual([
			{ path: P('zz'), ...state, snippet: '', readOnly: true, pending: true },
		]);
	});

	it('keeps exactly one event across a rename (delete tombstone plus update at the new path)', () => {
		const state = { ...eventState(a), title: 'Renamed' };
		const pending: PendingWrite[] = [
			{ kind: 'delete', path: P('a'), settled: false },
			{ kind: 'update', path: P('a2'), state, settled: false },
		];
		expect(mergePending([a], pending)).toEqual([{ path: P('a2'), ...state, snippet: '', readOnly: false, pending: true }]);
		expect(mergePending([b], [{ kind: 'delete', path: P('zz'), settled: false }, { kind: 'update', path: P('zz'), state, settled: false }])).toEqual([{ ...b, pending: false }]);
	});

	it('adds a create, replacing a snapshot copy at the same path', () => {
		const c = makeEvent(P('c'), { title: 'New' });
		expect(mergePending([a], [{ kind: 'create', path: P('c'), event: c, settled: false }])).toEqual([{ ...a, pending: false }, { ...c, pending: true }]);
		expect(mergePending([a, c], [{ kind: 'create', path: P('c'), event: c, settled: true, settledAtVersion: 1 }])).toEqual([{ ...a, pending: false }, { ...c, pending: true }]);
	});

	it('hides a delete, including a rename tombstone', () => {
		const renamed = makeEvent(P('a2'), { title: 'Renamed' });
		const pending: PendingWrite[] = [
			{ kind: 'delete', path: P('a'), settled: false },
			{ kind: 'create', path: P('a2'), event: renamed, settled: false },
		];
		expect(mergePending([a, b], pending)).toEqual([{ ...b, pending: false }, { ...renamed, pending: true }]);
	});
});

describe('prunePending', () => {
	const a = makeEvent(P('a'));

	it('never prunes an unsettled entry', () => {
		const pending: PendingWrite[] = [
			{ kind: 'update', path: P('a'), state: eventState(a), settled: false },
			{ kind: 'create', path: P('a'), event: a, settled: false },
			{ kind: 'delete', path: P('zz'), settled: false },
		];
		expect(prunePending(pending, [a], 100)).toEqual(pending);
	});

	it('prunes a settled update when the snapshot matches its state', () => {
		const update: PendingWrite = { kind: 'update', path: P('a'), state: eventState(a), settled: true, settledAtVersion: 5 };
		expect(prunePending([update], [a], 5)).toEqual([]);
	});

	it('prunes a settled create when the path is present', () => {
		const create: PendingWrite = { kind: 'create', path: P('a'), event: a, settled: true, settledAtVersion: 5 };
		expect(prunePending([create], [a], 5)).toEqual([]);
		expect(prunePending([create], [], 5)).toEqual([create]);
	});

	it('keeps a settled create with a clock while the snapshot at its path shows other fields, until +2', () => {
		const create: PendingWrite = { kind: 'create', path: P('a'), event: { ...a, start: 600, end: 660 }, settled: true, settledAtVersion: 5 };
		expect(prunePending([create], [a], 6)).toEqual([create]);
		expect(prunePending([create], [a], 7)).toEqual([]);
		expect(prunePending([create], [{ ...a, start: 600, end: 660 }], 6)).toEqual([]);
	});

	it('prunes a settled create without a clock once its path is present, whatever its fields', () => {
		const create: PendingWrite = { kind: 'create', path: P('a'), event: { ...a, title: 'Old name' }, settled: true };
		expect(prunePending([create], [a], 1)).toEqual([]);
		expect(prunePending([create], [], 1)).toEqual([create]);
	});

	it('prunes a settled delete when the path is absent', () => {
		const del: PendingWrite = { kind: 'delete', path: P('a'), settled: true, settledAtVersion: 5 };
		expect(prunePending([del], [], 5)).toEqual([]);
		expect(prunePending([del], [a], 5)).toEqual([del]);
	});

	it('a settled update plus a newer snapshot with old values does not prune at +1, prunes at +2', () => {
		const update: PendingWrite = { kind: 'update', path: P('a'), state: { ...eventState(a), start: 600, end: 660 }, settled: true, settledAtVersion: 7 };
		expect(prunePending([update], [a], 7)).toEqual([update]);
		expect(prunePending([update], [a], 8)).toEqual([update]);
		expect(prunePending([update], [a], 9)).toEqual([]);
	});

	it('a settled create whose path never appears stays at +1 and prunes at +2', () => {
		const create: PendingWrite = { kind: 'create', path: P('gone'), event: makeEvent(P('gone')), settled: true, settledAtVersion: 3 };
		expect(prunePending([create], [a], 4)).toEqual([create]);
		expect(prunePending([create], [a], 5)).toEqual([]);
	});

	it('a settled delete whose path stays present stays at +1 and prunes at +2', () => {
		const del: PendingWrite = { kind: 'delete', path: P('a'), settled: true, settledAtVersion: 3 };
		expect(prunePending([del], [a], 4)).toEqual([del]);
		expect(prunePending([del], [a], 5)).toEqual([]);
	});

	it('falls back to settledAtVersion + 2 for a settled entry without a version', () => {
		const del: PendingWrite = { kind: 'delete', path: P('a'), settled: true };
		expect(prunePending([del], [a], 1)).toEqual([del]);
	});
});
