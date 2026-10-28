import { describe, expect, it } from 'vitest';

import { fromKey, isWeekend } from '$lib/features/event-calendar/event-calendar-dates.logic';
import { MIN_EVENT_MINUTES } from '$lib/features/event-calendar/event-calendar-layout.logic';
import {
	ALL_DAY_MAX_ROWS,
	buildAllDayChips,
	buildMonthCells,
	defaultCreateSlot,
	eventWhenLabel,
	focusViewFor,
	groupEventsByDay,
	itemsByDay,
	itemsForDay,
	laneRows,
	MONTH_MAX_CHIPS,
	nowOffsetMinutes,
	rangeLabel,
	segmentOnDay,
	stepDate,
	visibleDays,
} from '$lib/features/event-calendar/event-calendar-view.logic';
import type { EventNote } from '$lib/features/event-calendar/event-calendar.types';
import { runtimeTimeZoneSwitchWorks, withTimeZone } from '../../../fixtures/timezone.fixture';

/** Builds a timed event; `id` doubles as the path and the title. */
const ev = (id: string, date: string, start: number, end: number): EventNote => ({
	path: id,
	title: id,
	date,
	start,
	end,
	allDay: false,
	color: 'blue',
	location: '',
	snippet: '',
	readOnly: false,
});

/** Builds an all-day event; `id` doubles as the path and the title. */
const allDay = (id: string, date: string): EventNote => ({ ...ev(id, date, 0, 1440), allDay: true });

describe('visibleDays', () => {
	// 2026-11-10 is a Tuesday.
	const date = '2026-11-10';

	it('shows only the date in day view, for every week setting', () => {
		for (const weekStartsOn of [0, 1] as const) {
			for (const showWeekends of [true, false]) {
				expect(visibleDays('day', date, weekStartsOn, showWeekends)).toEqual([date]);
			}
		}
	});

	it('shows a weekend date in day view even when weekends are hidden', () => {
		expect(visibleDays('day', '2026-11-08', 1, false)).toEqual(['2026-11-08']);
	});

	it('shows a Monday-first week with weekends', () => {
		expect(visibleDays('week', date, 1, true)).toEqual([
			'2026-11-09',
			'2026-11-10',
			'2026-11-11',
			'2026-11-12',
			'2026-11-13',
			'2026-11-14',
			'2026-11-15',
		]);
	});

	it('shows a Sunday-first week with weekends', () => {
		expect(visibleDays('week', date, 0, true)).toEqual([
			'2026-11-08',
			'2026-11-09',
			'2026-11-10',
			'2026-11-11',
			'2026-11-12',
			'2026-11-13',
			'2026-11-14',
		]);
	});

	it('drops the weekend from both week starts when weekends are hidden', () => {
		const weekdays = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];
		expect(visibleDays('week', date, 1, false)).toEqual(weekdays);
		expect(visibleDays('week', date, 0, false)).toEqual(weekdays);
	});

	it('crosses a month boundary in week view', () => {
		expect(visibleDays('week', '2026-12-01', 1, true)).toEqual([
			'2026-11-30',
			'2026-12-01',
			'2026-12-02',
			'2026-12-03',
			'2026-12-04',
			'2026-12-05',
			'2026-12-06',
		]);
	});

	it('crosses a year boundary in week view', () => {
		expect(visibleDays('week', '2027-01-01', 1, true)).toEqual([
			'2026-12-28',
			'2026-12-29',
			'2026-12-30',
			'2026-12-31',
			'2027-01-01',
			'2027-01-02',
			'2027-01-03',
		]);
		expect(visibleDays('week', '2027-01-01', 0, false)).toEqual([
			'2026-12-28',
			'2026-12-29',
			'2026-12-30',
			'2026-12-31',
			'2027-01-01',
		]);
	});

	it('shows every day of the month in month view, whatever the week start', () => {
		for (const weekStartsOn of [0, 1] as const) {
			const days = visibleDays('month', '2026-02-14', weekStartsOn, true);
			expect(days).toHaveLength(28);
			expect(days[0]).toBe('2026-02-01');
			expect(days[27]).toBe('2026-02-28');
		}
	});

	it('drops weekend days from month view when weekends are hidden', () => {
		for (const weekStartsOn of [0, 1] as const) {
			const days = visibleDays('month', '2026-11-20', weekStartsOn, false);
			expect(days).toHaveLength(21);
			expect(days[0]).toBe('2026-11-02');
			expect(days[20]).toBe('2026-11-30');
			expect(days.some(isWeekend)).toBe(false);
		}
	});
});

describe('stepDate', () => {
	it('steps one day in day view, across a year boundary', () => {
		expect(stepDate('day', '2026-12-31', 1)).toBe('2027-01-01');
		expect(stepDate('day', '2027-01-01', -1)).toBe('2026-12-31');
	});

	it('steps seven days in week view, across month and year boundaries', () => {
		expect(stepDate('week', '2026-11-26', 1)).toBe('2026-12-03');
		expect(stepDate('week', '2026-12-29', 1)).toBe('2027-01-05');
		expect(stepDate('week', '2027-01-05', -1)).toBe('2026-12-29');
	});

	it('steps one month in month view, clamping the day', () => {
		expect(stepDate('month', '2026-01-31', 1)).toBe('2026-02-28');
		expect(stepDate('month', '2026-12-15', 1)).toBe('2027-01-15');
		expect(stepDate('month', '2026-01-15', -1)).toBe('2025-12-15');
	});
});

describe('rangeLabel', () => {
	it('labels a Monday-first week by the ISO week of its Monday', () => {
		const days = visibleDays('week', '2026-11-10', 1, true);
		expect(rangeLabel('week', '2026-11-10', days)).toEqual({
			title: 'November, 2026',
			subtitle: 'Week 46 · Nov 9 – 15',
		});
	});

	it('labels a Sunday-first week by the ISO week of its Monday, not its Sunday', () => {
		// Sunday 2026-11-08 is still ISO week 45; Monday 2026-11-09 starts week 46.
		const days = visibleDays('week', '2026-11-10', 0, true);
		expect(rangeLabel('week', '2026-11-10', days)).toEqual({
			title: 'November, 2026',
			subtitle: 'Week 46 · Nov 8 – 14',
		});
	});

	it('titles a week by its first visible day, not by the anchor month', () => {
		const days = visibleDays('week', '2026-12-03', 1, true);
		expect(rangeLabel('week', '2026-12-03', days)).toEqual({
			title: 'November, 2026',
			subtitle: 'Week 49 · Nov 30 – Dec 6',
		});
	});

	it('reads "Week 53" for the year boundary 2026-12-28..2027-01-03', () => {
		const days = visibleDays('week', '2027-01-02', 1, true);
		expect(days[0]).toBe('2026-12-28');
		expect(days[6]).toBe('2027-01-03');
		expect(rangeLabel('week', '2027-01-02', days)).toEqual({
			title: 'December, 2026',
			subtitle: 'Week 53 · Dec 28 – Jan 3',
		});
	});

	it('uses the Monday of a Sunday-first week at the year boundary', () => {
		const days = visibleDays('week', '2027-01-02', 0, true);
		expect(rangeLabel('week', '2027-01-02', days)).toEqual({
			title: 'December, 2026',
			subtitle: 'Week 53 · Dec 27 – Jan 2',
		});
	});

	it('spans only the visible weekdays when weekends are hidden', () => {
		const days = visibleDays('week', '2026-11-10', 0, false);
		expect(rangeLabel('week', '2026-11-10', days)).toEqual({
			title: 'November, 2026',
			subtitle: 'Week 46 · Nov 9 – 13',
		});
	});

	it('labels day view with the ISO week, weekday and short date', () => {
		expect(rangeLabel('day', '2026-11-10', ['2026-11-10'])).toEqual({
			title: 'November, 2026',
			subtitle: 'Week 46 · Tuesday, Nov 10',
		});
		// A Sunday belongs to the ISO week that started the Monday before.
		expect(rangeLabel('day', '2027-01-03', ['2027-01-03'])).toEqual({
			title: 'January, 2027',
			subtitle: 'Week 53 · Sunday, Jan 3',
		});
	});

	it('labels month view with the whole month, even when its first visible day is later', () => {
		// 2026-11-01 is a Sunday, so with weekends hidden the first visible day is Nov 2.
		const days = visibleDays('month', '2026-11-20', 1, false);
		expect(rangeLabel('month', '2026-11-20', days)).toEqual({
			title: 'November, 2026',
			subtitle: 'Nov 1 – 30',
		});
		expect(rangeLabel('month', '2026-02-10', visibleDays('month', '2026-02-10', 1, true))).toEqual({
			title: 'February, 2026',
			subtitle: 'Feb 1 – 28',
		});
	});
});

/** Builds a read-only span from `date` to `endDate`. */
const span = (base: EventNote, endDate: string): EventNote => ({ ...base, endDate, readOnly: true });

describe('segmentOnDay', () => {
	const trip = span(ev('trip', '2026-11-10', 540, 1020), '2026-11-12');

	it('returns a single-day event itself on its day and null elsewhere', () => {
		const e = ev('a', '2026-11-10', 540, 600);
		expect(segmentOnDay(e, '2026-11-10')).toBe(e);
		expect(segmentOnDay(e, '2026-11-11')).toBeNull();
	});

	it('clips a timed span: from start on the first day, whole middle days, to end on the last day', () => {
		expect(segmentOnDay(trip, '2026-11-09')).toBeNull();
		expect(segmentOnDay(trip, '2026-11-10')).toMatchObject({ path: 'trip', date: '2026-11-10', start: 540, end: 1440 });
		expect(segmentOnDay(trip, '2026-11-11')).toMatchObject({ start: 0, end: 1440 });
		expect(segmentOnDay(trip, '2026-11-12')).toMatchObject({ start: 0, end: 1020 });
		expect(segmentOnDay(trip, '2026-11-13')).toBeNull();
	});

	it('splits a cross-midnight event over its two days', () => {
		const late = span(ev('late', '2026-11-10', 1380, 60), '2026-11-11');
		expect(segmentOnDay(late, '2026-11-10')).toMatchObject({ start: 1380, end: 1440 });
		expect(segmentOnDay(late, '2026-11-11')).toMatchObject({ start: 0, end: 60 });
	});

	it('drops an empty last-day segment (a span ending at 00:00)', () => {
		expect(segmentOnDay(span(ev('a', '2026-11-10', 540, 0), '2026-11-11'), '2026-11-11')).toBeNull();
	});

	it('returns an all-day span itself on every day it covers', () => {
		const retreat = span(allDay('retreat', '2026-11-10'), '2026-11-12');
		for (const day of ['2026-11-10', '2026-11-11', '2026-11-12']) expect(segmentOnDay(retreat, day)).toBe(retreat);
		expect(segmentOnDay(retreat, '2026-11-13')).toBeNull();
	});
});

describe('eventWhenLabel', () => {
	it('shows the day and the time range with its duration', () => {
		expect(eventWhenLabel(ev('a', '2026-11-10', 540, 630), '24h')).toEqual({ date: 'Tuesday, November 10, 2026', time: '09:00 – 10:30 · 1h 30m' });
	});

	it('shows All day for an all-day event', () => {
		expect(eventWhenLabel(allDay('a', '2026-11-10'), '24h')).toEqual({ date: 'Tuesday, November 10, 2026', time: 'All day' });
	});

	it('shows both days of a span and the duration across them', () => {
		expect(eventWhenLabel(span(ev('late', '2026-11-10', 1380, 60), '2026-11-11'), '24h')).toEqual({
			date: 'Tuesday, November 10, 2026 – Wednesday, November 11, 2026',
			time: '23:00 – 01:00 · 2h',
		});
		expect(eventWhenLabel(span(allDay('r', '2026-11-10'), '2026-11-12'), '12h').time).toBe('All day');
	});

	it('counts a span of a day or more in days and hours', () => {
		expect(eventWhenLabel(span(ev('trip', '2026-11-10', 540, 1020), '2026-11-12'), '24h').time).toBe('09:00 – 17:00 · 2d 8h');
		expect(eventWhenLabel(span(ev('day', '2026-11-10', 540, 540), '2026-11-11'), '24h').time).toBe('09:00 – 09:00 · 1d');
		expect(eventWhenLabel(span(ev('long', '2026-11-10', 540, 570), '2026-11-11'), '24h').time).toBe('09:00 – 09:30 · 1d 30m');
	});
});

describe('groupEventsByDay', () => {
	const days = ['2026-11-09', '2026-11-10'];

	it('splits events into timed and all-day lists for every visible day', () => {
		const t1 = ev('t1', '2026-11-09', 540, 600);
		const a1 = allDay('a1', '2026-11-09');
		const t2 = ev('t2', '2026-11-10', 600, 660);
		const t3 = ev('t3', '2026-11-10', 420, 480);
		const { timed, allDay: allDayByDay } = groupEventsByDay([t1, a1, t2, t3], days);
		expect([...timed.keys()]).toEqual(days);
		expect([...allDayByDay.keys()]).toEqual(days);
		expect(timed.get('2026-11-09')).toEqual([t1]);
		expect(timed.get('2026-11-10')).toEqual([t2, t3]);
		expect(allDayByDay.get('2026-11-09')).toEqual([a1]);
		expect(allDayByDay.get('2026-11-10')).toEqual([]);
	});

	it('drops events outside the visible days', () => {
		const { timed, allDay: allDayByDay } = groupEventsByDay(
			[ev('x', '2026-11-11', 540, 600), allDay('y', '2026-11-08')],
			days,
		);
		expect(timed.get('2026-11-09')).toEqual([]);
		expect(timed.get('2026-11-10')).toEqual([]);
		expect(timed.has('2026-11-11')).toBe(false);
		expect(allDayByDay.has('2026-11-08')).toBe(false);
	});

	it('lists a timed span on each visible day as its clipped segment, and an all-day span as itself', () => {
		const late = span(ev('late', '2026-11-09', 1380, 60), '2026-11-10');
		const retreat = span(allDay('retreat', '2026-11-08'), '2026-11-10');
		const { timed, allDay: allDayByDay } = groupEventsByDay([late, retreat], days);
		expect(timed.get('2026-11-09')).toEqual([{ ...late, start: 1380, end: 1440 }]);
		expect(timed.get('2026-11-10')).toEqual([{ ...late, start: 0, end: 60 }]);
		expect(allDayByDay.get('2026-11-09')).toEqual([retreat]);
		expect(allDayByDay.get('2026-11-10')).toEqual([retreat]);
	});

	it('returns empty maps for no days', () => {
		const { timed, allDay: allDayByDay } = groupEventsByDay([ev('x', '2026-11-10', 540, 600)], []);
		expect(timed.size).toBe(0);
		expect(allDayByDay.size).toBe(0);
	});
});

describe('buildMonthCells', () => {
	it('builds six Monday-first weeks around November 2026', () => {
		const cells = buildMonthCells('2026-11-10', 1, true);
		expect(cells).toHaveLength(42);
		expect(cells[0]).toEqual({ day: '2026-10-26', inMonth: false });
		expect(cells[6]).toEqual({ day: '2026-11-01', inMonth: true });
		expect(cells[41]).toEqual({ day: '2026-12-06', inMonth: false });
		expect(cells.filter((c) => c.inMonth)).toHaveLength(30);
	});

	it('builds six Sunday-first weeks around November 2026', () => {
		const cells = buildMonthCells('2026-11-10', 0, true);
		expect(cells).toHaveLength(42);
		expect(cells[0]).toEqual({ day: '2026-11-01', inMonth: true });
		expect(cells[41]).toEqual({ day: '2026-12-12', inMonth: false });
	});

	it('drops weekend cells when weekends are hidden, for both week starts', () => {
		for (const weekStartsOn of [0, 1] as const) {
			const cells = buildMonthCells('2026-11-10', weekStartsOn, false);
			expect(cells).toHaveLength(30);
			expect(cells.some((c) => isWeekend(c.day))).toBe(false);
			expect(cells.filter((c) => c.inMonth)).toHaveLength(21);
		}
		expect(buildMonthCells('2026-11-10', 1, false)[0]).toEqual({ day: '2026-10-26', inMonth: false });
		expect(buildMonthCells('2026-11-10', 0, false)[0]).toEqual({ day: '2026-11-02', inMonth: true });
	});

	it('starts January 2027 in the last days of December 2026', () => {
		const cells = buildMonthCells('2027-01-20', 1, true);
		expect(cells[0]).toEqual({ day: '2026-12-28', inMonth: false });
		expect(cells[4]).toEqual({ day: '2027-01-01', inMonth: true });
	});
});

describe('itemsForDay', () => {
	const day = '2026-11-10';
	const events = [
		ev('b', day, 600, 660),
		allDay('z', day),
		ev('a', day, 600, 630),
		ev('other', '2026-11-11', 480, 540),
		allDay('y', day),
		ev('c', day, 540, 600),
	];

	it('orders all-day before timed, then by start, then by title', () => {
		expect(itemsForDay(events, day, '24h').map((i) => i.event.path)).toEqual(['y', 'z', 'c', 'a', 'b']);
	});

	it('labels timed items with their start time in the chosen format', () => {
		expect(itemsForDay(events, day, '24h').map((i) => i.label)).toEqual(['y', 'z', '09:00 c', '10:00 a', '10:00 b']);
		expect(itemsForDay(events, day, '12h').map((i) => i.label)).toEqual(['y', 'z', '9:00 AM c', '10:00 AM a', '10:00 AM b']);
	});

	it('returns nothing for a day without events', () => {
		expect(itemsForDay(events, '2026-11-12', '24h')).toEqual([]);
		expect(itemsForDay([], day, '24h')).toEqual([]);
	});

	it('returns the input event objects, so extra fields such as pending survive', () => {
		const pending = { ...ev('p', day, 540, 600), pending: true };
		const [item] = itemsForDay([pending], day, '24h');
		expect(item.event).toBe(pending);
		expect(item.event.pending).toBe(true);
	});

	it('lists a span on every day it covers, with the start time only on its first day', () => {
		const trip = span(ev('trip', '2026-11-09', 1080, 480), '2026-11-11');
		const early = ev('early', day, 30, 90);
		expect(itemsForDay([trip, early], '2026-11-09', '24h').map((i) => i.label)).toEqual(['18:00 trip']);
		expect(itemsForDay([trip, early], day, '24h').map((i) => i.label)).toEqual(['trip', '00:30 early']);
		expect(itemsForDay([trip], '2026-11-11', '24h').map((i) => i.label)).toEqual(['trip']);
		expect(itemsForDay([trip], '2026-11-12', '24h')).toEqual([]);
		expect(itemsForDay([trip], day, '24h')[0].event).toBe(trip);
	});

	it('caps month chips at 3', () => {
		expect(MONTH_MAX_CHIPS).toBe(3);
	});
});

describe('itemsByDay', () => {
	const day = '2026-11-10';
	const events = [
		ev('b', day, 600, 660),
		allDay('z', day),
		ev('a', day, 600, 630),
		ev('other', '2026-11-11', 480, 540),
		ev('outside', '2026-12-01', 480, 540),
		allDay('y', day),
		ev('c', day, 540, 600),
	];

	it('gives each day the same chips itemsForDay gives it', () => {
		const map = itemsByDay(events, [day, '2026-11-11'], '24h');
		expect(map.get(day)).toEqual(itemsForDay(events, day, '24h'));
		expect(map.get('2026-11-11')!.map((i) => i.label)).toEqual(['08:00 other']);
	});

	it('keys every day in order, empty days included, and drops events outside the days', () => {
		const map = itemsByDay(events, ['2026-11-12', day], '12h');
		expect([...map.keys()]).toEqual(['2026-11-12', day]);
		expect(map.get('2026-11-12')).toEqual([]);
		expect([...map.values()].flat().some((i) => i.event.path === 'outside')).toBe(false);
		expect(map.get(day)!.map((i) => i.label)).toEqual(['y', 'z', '9:00 AM c', '10:00 AM a', '10:00 AM b']);
	});

	it('returns an empty map for no days and empty lists for no events', () => {
		expect(itemsByDay(events, [], '24h').size).toBe(0);
		expect(itemsByDay([], [day], '24h').get(day)).toEqual([]);
	});

	it('keeps the input event objects', () => {
		const pending = { ...ev('p', day, 540, 600), pending: true };
		expect(itemsByDay([pending], [day], '24h').get(day)![0].event).toBe(pending);
	});

	it('places a span that starts before the first day on every visible day it covers', () => {
		const retreat = span(allDay('retreat', '2026-11-08'), '2026-11-11');
		const map = itemsByDay([retreat], ['2026-11-10', '2026-11-11', '2026-11-12'], '24h');
		expect(map.get('2026-11-10')!.map((i) => i.event)).toEqual([retreat]);
		expect(map.get('2026-11-11')!.map((i) => i.label)).toEqual(['retreat']);
		expect(map.get('2026-11-12')).toEqual([]);
	});
});

describe('all-day lane', () => {
	const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12'];
	const events = [
		allDay('c', '2026-11-10'),
		allDay('a', '2026-11-10'),
		allDay('b', '2026-11-10'),
		...['e', 'd', 'f', 'g', 'h'].map((id) => allDay(id, '2026-11-11')),
		allDay('solo', '2026-11-12'),
		ev('timed', '2026-11-12', 540, 600),
		allDay('hidden', '2026-11-13'),
	];

	it('shows up to 3 chips per day without overflow, sorted by title', () => {
		const cells = buildAllDayChips(days, events);
		expect(cells.map((c) => c.day)).toEqual(days);
		expect(cells[0]).toEqual({ day: '2026-11-09', chips: [], overflow: 0 });
		expect(cells[1].chips.map((e) => e.path)).toEqual(['a', 'b', 'c']);
		expect(cells[1].overflow).toBe(0);
	});

	it('keeps an overflowing day within 3 rows: 2 chips plus the hidden count', () => {
		const cell = buildAllDayChips(days, events)[2];
		expect(cell.chips.map((e) => e.path)).toEqual(['d', 'e']);
		expect(cell.overflow).toBe(3);
		expect(cell.chips.length + (cell.overflow > 0 ? 1 : 0)).toBe(ALL_DAY_MAX_ROWS);
	});

	it('leaves timed events out of the lane', () => {
		const cell = buildAllDayChips(days, events)[3];
		expect(cell.chips.map((e) => e.path)).toEqual(['solo']);
		expect(cell.overflow).toBe(0);
	});

	it('shows 2 chips and an overflow of 2 when a day holds 4 all-day events', () => {
		const four = ['w', 'x', 'y', 'z'].map((id) => allDay(id, '2026-11-09'));
		const [cell] = buildAllDayChips(['2026-11-09'], four);
		expect(cell.chips.map((e) => e.path)).toEqual(['w', 'x']);
		expect(cell.overflow).toBe(2);
	});

	it('returns no cells for no days', () => {
		expect(buildAllDayChips([], events)).toEqual([]);
	});

	it('shows an all-day span on each day it covers, but not a timed span', () => {
		const retreat = span(allDay('retreat', '2026-11-09'), '2026-11-10');
		const late = span(ev('late', '2026-11-09', 1380, 60), '2026-11-10');
		const cells = buildAllDayChips(['2026-11-09', '2026-11-10', '2026-11-11'], [retreat, late]);
		expect(cells.map((c) => c.chips.map((e) => e.path))).toEqual([['retreat'], ['retreat'], []]);
	});

	it('sizes the lane between 1 and 3 rows', () => {
		expect(ALL_DAY_MAX_ROWS).toBe(3);
		expect(laneRows(0)).toBe(1);
		expect(laneRows(1)).toBe(1);
		expect(laneRows(2)).toBe(2);
		expect(laneRows(3)).toBe(3);
		expect(laneRows(4)).toBe(3);
		expect(laneRows(50)).toBe(3);
	});

	it('sizes the lane from chips plus overflow, giving 3 rows for the 5-event day', () => {
		const cells = buildAllDayChips(['2026-11-11'], events);
		const maxEvents = Math.max(...cells.map((c) => c.chips.length + c.overflow));
		expect(maxEvents).toBe(5);
		expect(laneRows(maxEvents)).toBe(3);
		// Counting only the shown chips would undercount the overflowing day.
		expect(laneRows(Math.max(...cells.map((c) => c.chips.length)))).toBe(2);
	});
});

describe('nowOffsetMinutes', () => {
	it('returns the wall-clock minutes on the same day', () => {
		const now = new Date(2026, 10, 10, 9, 30, 45).getTime();
		expect(nowOffsetMinutes(now, '2026-11-10')).toBe(570);
	});

	it('returns 0 at midnight and 1439 one minute before the next day', () => {
		expect(nowOffsetMinutes(new Date(2026, 10, 10, 0, 0).getTime(), '2026-11-10')).toBe(0);
		expect(nowOffsetMinutes(new Date(2026, 10, 10, 23, 59, 59).getTime(), '2026-11-10')).toBe(1439);
	});

	it('returns null for another day', () => {
		const now = new Date(2026, 10, 10, 9, 30).getTime();
		expect(nowOffsetMinutes(now, '2026-11-11')).toBeNull();
		expect(nowOffsetMinutes(now, '2026-11-09')).toBeNull();
	});
});

describe.runIf(runtimeTimeZoneSwitchWorks())('nowOffsetMinutes across DST (America/New_York)', () => {
	it('gives 600 at 10:00 local on the spring-forward day 2026-03-08', () => {
		withTimeZone('America/New_York', () => {
			const now = new Date(2026, 2, 8, 10, 0).getTime();
			expect(nowOffsetMinutes(now, '2026-03-08')).toBe(600);
			// The prototype's elapsed-milliseconds offset is an hour short here.
			expect((now - fromKey('2026-03-08').getTime()) / 60000).toBe(540);
		});
	});

	it('gives 600 at 10:00 local on the fall-back day 2026-11-01', () => {
		withTimeZone('America/New_York', () => {
			const now = new Date(2026, 10, 1, 10, 0).getTime();
			expect(nowOffsetMinutes(now, '2026-11-01')).toBe(600);
			// The prototype's elapsed-milliseconds offset is an hour long here.
			expect((now - fromKey('2026-11-01').getTime()) / 60000).toBe(660);
		});
	});
});

describe('defaultCreateSlot', () => {
	it('starts at dayStartHour on a day other than today', () => {
		expect(defaultCreateSlot('2026-11-11', '2026-11-10', 600, 7, 60)).toEqual({
			date: '2026-11-11',
			start: 420,
			end: 480,
		});
	});

	it('starts at the current 15-minute slot today', () => {
		expect(defaultCreateSlot('2026-11-10', '2026-11-10', 607, 7, 60)).toEqual({
			date: '2026-11-10',
			start: 600,
			end: 660,
		});
		expect(defaultCreateSlot('2026-11-10', '2026-11-10', 600, 7, 30)).toEqual({
			date: '2026-11-10',
			start: 600,
			end: 630,
		});
	});

	it('floors, not rounds, now to the slot start today', () => {
		expect(defaultCreateSlot('2026-11-10', '2026-11-10', 614, 7, 60)).toEqual({
			date: '2026-11-10',
			start: 600,
			end: 660,
		});
	});

	it('caps the start at 1440 - MIN_EVENT_MINUTES', () => {
		expect(MIN_EVENT_MINUTES).toBe(15);
		expect(defaultCreateSlot('2026-11-10', '2026-11-10', 1439, 7, 60)).toEqual({
			date: '2026-11-10',
			start: 1425,
			end: 1440,
		});
		expect(defaultCreateSlot('2026-11-10', '2026-11-10', 1440, 7, 60).start).toBe(1425);
		expect(defaultCreateSlot('2026-11-11', '2026-11-10', 0, 24, 60).start).toBe(1425);
	});

	it('caps the end at 1440', () => {
		expect(defaultCreateSlot('2026-11-11', '2026-11-10', 0, 23, 120)).toEqual({
			date: '2026-11-11',
			start: 1380,
			end: 1440,
		});
		expect(defaultCreateSlot('2026-11-10', '2026-11-10', 1410, 7, 15)).toEqual({
			date: '2026-11-10',
			start: 1410,
			end: 1425,
		});
	});
});

describe('focusViewFor', () => {
	// 2026-11-14 is a Saturday, 2026-11-10 a Tuesday.
	it('keeps every view that shows the day', () => {
		expect(focusViewFor('week', '2026-11-10', 1, true)).toBe('week');
		expect(focusViewFor('month', '2026-11-10', 1, false)).toBe('month');
		expect(focusViewFor('day', '2026-11-14', 1, false)).toBe('day');
		expect(focusViewFor('week', '2026-11-14', 0, true)).toBe('week');
	});

	it('falls back to the day view when hidden weekends would hide the day', () => {
		expect(focusViewFor('week', '2026-11-14', 1, false)).toBe('day');
		expect(focusViewFor('month', '2026-11-14', 0, false)).toBe('day');
	});
});
