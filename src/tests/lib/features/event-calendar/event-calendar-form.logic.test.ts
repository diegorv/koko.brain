import { describe, expect, it } from 'vitest';

import {
	applyEndChange,
	applyStartChange,
	draftForCreate,
	draftFromEvent,
	draftToPatch,
	type EventFormDraft,
	planTitleChange,
	toggleAllDay,
	validateDraft,
} from '#lib/features/event-calendar/event-calendar-form.logic.js';
import { eventState } from '#lib/features/event-calendar/event-calendar-event.logic.js';
import type { EventNote } from '#lib/features/event-calendar/event-calendar.types.js';

const settings = { defaultDurationMinutes: 60, defaultColor: 'green' as const };

/** Builds a timed event note. */
const ev = (overrides: Partial<EventNote> = {}): EventNote => ({
	path: '/vault/Events/Standup.md',
	title: 'Standup',
	date: '2026-11-10',
	start: 540,
	end: 570,
	allDay: false,
	color: 'blue',
	location: 'Room 1',
	snippet: 'agenda',
	readOnly: false,
	...overrides,
});

/** Builds a valid timed draft. */
const draft = (overrides: Partial<EventFormDraft> = {}): EventFormDraft => ({
	title: 'Standup',
	date: '2026-11-10',
	start: 540,
	end: 570,
	allDay: false,
	color: 'blue',
	location: '',
	notes: '',
	timingLocked: false,
	...overrides,
});

describe('draftFromEvent', () => {
	it('copies the event fields with empty notes', () => {
		expect(draftFromEvent(ev())).toEqual({
			title: 'Standup',
			date: '2026-11-10',
			start: 540,
			end: 570,
			allDay: false,
			color: 'blue',
			location: 'Room 1',
			notes: '',
			timingLocked: false,
		});
	});

	it('leaves the timing of a span alone when only the title changes', () => {
		const event = ev({ start: 1380, end: 60, endDate: '2026-11-11', readOnly: true });
		const patch = draftToPatch({ ...draftFromEvent(event), title: 'Late show' }, eventState(event));
		expect(patch).toEqual({ title: 'Late show' });
	});

	it('locks the timing of a read-only event', () => {
		expect(draftFromEvent(ev({ readOnly: true })).timingLocked).toBe(true);
	});
});

describe('draftForCreate', () => {
	it('uses the payload range and the settings color', () => {
		expect(draftForCreate({ date: '2026-11-10', start: 600, end: 690 }, settings)).toEqual({
			title: '',
			date: '2026-11-10',
			start: 600,
			end: 690,
			allDay: false,
			color: 'green',
			location: '',
			notes: '',
			timingLocked: false,
		});
	});

	it('defaults to 09:00 for the default duration', () => {
		const d = draftForCreate({ date: '2026-11-10' }, settings);
		expect([d.start, d.end]).toEqual([540, 600]);
	});

	it('keeps an anchor of 1425 and caps the end at 1440', () => {
		const d = draftForCreate({ date: '2026-11-10', start: 1425 }, settings);
		expect([d.start, d.end]).toEqual([1425, 1440]);
	});

	it('moves an anchor of 1440 back to 1425', () => {
		const d = draftForCreate({ date: '2026-11-10', start: 1440, end: 1440 }, settings);
		expect([d.start, d.end]).toEqual([1425, 1440]);
	});

	it('raises an end at or before the start to the minimum length', () => {
		const d = draftForCreate({ date: '2026-11-10', start: 600, end: 600 }, settings);
		expect([d.start, d.end]).toEqual([600, 615]);
	});

	it('carries the all-day flag', () => {
		expect(draftForCreate({ date: '2026-11-10', allDay: true }, settings).allDay).toBe(true);
	});

	it('gives an empty date for an empty payload date', () => {
		expect(validateDraft({ ...draftForCreate({ date: '' }, settings), title: 'x' }).date).toBeDefined();
	});
});

describe('applyStartChange', () => {
	it('keeps the duration', () => {
		expect(applyStartChange(draft(), '10:00')).toMatchObject({ start: 600, end: 630 });
	});

	it('caps the end at 1440', () => {
		expect(applyStartChange(draft({ start: 540, end: 660 }), '23:30')).toMatchObject({ start: 1410, end: 1440 });
	});

	it('keeps at least the minimum length when the range was inverted', () => {
		expect(applyStartChange(draft({ start: 600, end: 540 }), '10:00')).toMatchObject({ start: 600, end: 615 });
	});

	it('turns an empty value into 0, as in the prototype', () => {
		expect(applyStartChange(draft(), '')).toMatchObject({ start: 0, end: 30 });
	});

	it('does not mutate the draft', () => {
		const d = draft();
		applyStartChange(d, '10:00');
		expect(d.start).toBe(540);
	});
});

describe('applyEndChange', () => {
	it('sets the end', () => {
		expect(applyEndChange(draft(), '11:15')).toMatchObject({ start: 540, end: 675 });
	});

	it('turns an empty value into 1440', () => {
		expect(applyEndChange(draft(), '').end).toBe(1440);
	});

	it('turns 00:00 into 1440 so the event ends at midnight and validates', () => {
		const d = applyEndChange(draft(), '00:00');
		expect(d.end).toBe(1440);
		expect(validateDraft(d)).toEqual({});
	});
});

describe('toggleAllDay', () => {
	it('flips the flag and keeps the times', () => {
		const on = toggleAllDay(draft());
		expect(on).toMatchObject({ allDay: true, start: 540, end: 570 });
		expect(toggleAllDay(on)).toMatchObject({ allDay: false, start: 540, end: 570 });
	});

	it('sets an explicit value', () => {
		expect(toggleAllDay(draft({ allDay: true }), true).allDay).toBe(true);
	});
});

describe('validateDraft', () => {
	it('returns no messages for a valid draft', () => {
		expect(validateDraft(draft())).toEqual({});
	});

	it('reports an empty title after trim', () => {
		expect(validateDraft(draft({ title: '   ' })).title).toBe('Enter a title.');
	});

	it('accepts a title with : or /', () => {
		expect(validateDraft(draft({ title: '1:1 with manager' }))).toEqual({});
		expect(validateDraft(draft({ title: 'Lunch w/ Bob' }))).toEqual({});
	});

	it('reports an empty or invalid date', () => {
		expect(validateDraft(draft({ date: '' })).date).toBe('Enter a valid date.');
		expect(validateDraft(draft({ date: '2026-02-30' })).date).toBe('Enter a valid date.');
	});

	it('reports an end at or before the start', () => {
		expect(validateDraft(draft({ start: 600, end: 600 })).time).toBe('End time must be after the start time.');
		expect(validateDraft(draft({ start: 600, end: 540 })).time).toBeDefined();
	});

	it('skips the time check for an all-day draft', () => {
		expect(validateDraft(draft({ allDay: true, start: 600, end: 540 }))).toEqual({});
	});

	it('skips the time check for a locked span, whose end may be on a later day', () => {
		const late = draftFromEvent(ev({ start: 1380, end: 60, endDate: '2026-11-11', readOnly: true }));
		expect(validateDraft(late)).toEqual({});
		expect(validateDraft({ ...late, title: '' })).toEqual({ title: 'Enter a title.' });
	});

	it('reports every problem at once', () => {
		expect(Object.keys(validateDraft(draft({ title: '', date: '', end: 0 }))).sort()).toEqual(['date', 'time', 'title']);
	});
});

describe('draftToPatch', () => {
	it('returns an empty patch for an unchanged draft', () => {
		expect(draftToPatch(draftFromEvent(ev()), ev())).toEqual({});
	});

	it('returns only the changed fields', () => {
		const d = { ...draftFromEvent(ev()), end: 600, color: 'pink' as const };
		expect(draftToPatch(d, ev())).toEqual({ end: 600, color: 'pink' });
	});

	it('includes the trimmed title when it changed', () => {
		expect(draftToPatch({ ...draftFromEvent(ev()), title: ' Retro ' }, ev())).toEqual({ title: 'Retro' });
	});

	it('ignores surrounding whitespace on an unchanged title', () => {
		expect(draftToPatch({ ...draftFromEvent(ev()), title: 'Standup ' }, ev())).toEqual({});
	});

	it('normalizes an all-day draft to 0..1440', () => {
		expect(draftToPatch(toggleAllDay(draftFromEvent(ev())), ev())).toEqual({ allDay: true, start: 0, end: 1440 });
	});

	it('sees no change on an untouched all-day event', () => {
		const allDay = ev({ allDay: true, start: 0, end: 1440 });
		expect(draftToPatch(draftFromEvent(allDay), allDay)).toEqual({});
	});
});

describe('planTitleChange', () => {
	it('renames 1:1 with manager to a safe filename and keeps the typed title', () => {
		expect(planTitleChange('Meeting', '1:1 with manager', ['Meeting.md'])).toEqual({
			renameTo: '1-1 with manager.md',
			eventTitle: '1:1 with manager',
		});
	});

	it('numbers a second Standup and keeps both displaying "Standup"', () => {
		expect(planTitleChange('Retro', 'Standup', ['Standup.md', 'Retro.md'])).toEqual({
			renameTo: 'Standup 1.md',
			eventTitle: 'Standup',
		});
	});

	it('does not rename for a case-only change', () => {
		expect(planTitleChange('standup', 'Standup', ['standup.md'])).toEqual({ renameTo: null, eventTitle: 'Standup' });
	});

	it('does nothing for an unchanged title', () => {
		expect(planTitleChange('Standup', 'Standup', ['Standup.md'])).toEqual({ renameTo: null, eventTitle: null });
	});

	it('removes event_title when the new title is a plain filename', () => {
		expect(planTitleChange('1-1 with manager', 'Retro', ['1-1 with manager.md'])).toEqual({
			renameTo: 'Retro.md',
			eventTitle: null,
		});
	});

	it('keeps event_title on the same base when the typed title differs from it', () => {
		expect(planTitleChange('1-1 with manager', '1:1 with manager', ['1-1 with manager.md'])).toEqual({
			renameTo: null,
			eventTitle: '1:1 with manager',
		});
	});

	it('treats a sibling that differs only in case as taken', () => {
		expect(planTitleChange('Retro', 'Standup', ['standup.md', 'Retro.md'])).toEqual({
			renameTo: 'Standup 1.md',
			eventTitle: 'Standup',
		});
	});

	it('skips numbers that are already taken', () => {
		expect(planTitleChange('Retro', 'Standup', ['Standup.md', 'standup 1.md', 'Retro.md']).renameTo).toBe('Standup 2.md');
	});

	it('does not rename a numbered note onto itself for a case-only retitle', () => {
		expect(planTitleChange('Standup 1', 'standup', ['Standup.md', 'Standup 1.md'])).toEqual({
			renameTo: null,
			eventTitle: 'standup',
		});
	});

	it('does not rename a numbered note onto its own name with the same casing', () => {
		expect(
			planTitleChange('1-1 with manager 1', '1/1 with manager', ['1-1 with manager.md', '1-1 with manager 1.md']),
		).toEqual({ renameTo: null, eventTitle: '1/1 with manager' });
	});

	it('works with an empty sibling list', () => {
		expect(planTitleChange('Retro', 'Standup', [])).toEqual({ renameTo: 'Standup.md', eventTitle: null });
	});
});
