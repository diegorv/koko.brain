import { describe, expect, it } from 'vitest';

import {
	beginCreate,
	beginDayDrag,
	beginMove,
	beginResize,
	cellFromPoint,
	createGhost,
	DRAG_THRESHOLD_PX,
	previewDayEvents,
	previewDayMove,
	resolveDayDrag,
	resolveDrag,
	slotFromPoint,
	updateDayDrag,
	updateDrag,
} from '$lib/features/event-calendar/event-calendar-drag.logic';
import { HOUR_HEIGHT } from '$lib/features/event-calendar/event-calendar-layout.logic';
import type { EventNote } from '$lib/features/event-calendar/event-calendar.types';

const days = ['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13'];

/** Builds a timed event on `days[dayIndex]`; `id` doubles as the path and the title. */
const ev = (id: string, dayIndex: number, start: number, end: number, readOnly = false): EventNote => ({
	path: id,
	title: id,
	date: days[dayIndex],
	start,
	end,
	allDay: false,
	color: 'blue',
	location: '',
	snippet: '',
	readOnly,
});

/** Builds a slot. */
const slot = (dayIndex: number, minutes: number) => ({ dayIndex, minutes });

/** A distance past the drag threshold. */
const FAR = DRAG_THRESHOLD_PX + 1;

describe('slotFromPoint', () => {
	const rect = { left: 100, top: 50, width: 500 };

	it('maps a point to its day column and minutes', () => {
		expect(slotFromPoint(rect, 100, 50, 5)).toEqual({ dayIndex: 0, minutes: 0 });
		expect(slotFromPoint(rect, 350, 50 + HOUR_HEIGHT * 9.5, 5)).toEqual({ dayIndex: 2, minutes: 570 });
		expect(slotFromPoint(rect, 599, 50, 5)).toEqual({ dayIndex: 4, minutes: 0 });
	});

	it('clamps the day index to the visible columns', () => {
		expect(slotFromPoint(rect, 20, 50, 5).dayIndex).toBe(0);
		expect(slotFromPoint(rect, 600, 50, 5).dayIndex).toBe(4);
		expect(slotFromPoint(rect, 2000, 50, 5).dayIndex).toBe(4);
	});

	it('clamps the minutes to the day', () => {
		expect(slotFromPoint(rect, 100, 0, 5).minutes).toBe(0);
		expect(slotFromPoint(rect, 100, 50 + HOUR_HEIGHT * 30, 5).minutes).toBe(1440);
	});

	it('reads the rect it is given, so a scrolled body maps correctly', () => {
		const scrolled = { left: 100, top: 50 - HOUR_HEIGHT * 8, width: 500 };
		expect(slotFromPoint(scrolled, 100, 50, 5).minutes).toBe(480);
	});

	it('maps a single-day view to day 0', () => {
		expect(slotFromPoint(rect, 550, 50, 1).dayIndex).toBe(0);
	});
});

describe('updateDrag threshold', () => {
	it(`ignores moves up to ${DRAG_THRESHOLD_PX} px`, () => {
		const drag = beginMove(ev('a', 1, 540, 600), slot(1, 550));
		expect(updateDrag(drag, slot(3, 900), DRAG_THRESHOLD_PX)).toBe(drag);
		expect(updateDrag(drag, slot(3, 900), 0)).toBe(drag);
	});

	it('starts the drag past the threshold', () => {
		const drag = beginMove(ev('a', 1, 540, 600), slot(1, 550));
		expect(updateDrag(drag, slot(1, 610), DRAG_THRESHOLD_PX + 0.5).moved).toBe(true);
	});

	it('keeps tracking once moved, even when the pointer comes back', () => {
		const drag = beginMove(ev('a', 1, 540, 600), slot(1, 540));
		const moved = updateDrag(drag, slot(1, 600), FAR);
		const back = updateDrag(moved, slot(1, 540), 0);
		expect(back.moved).toBe(true);
		expect(back.start).toBe(540);
	});
});

describe('create', () => {
	it('a click floors the anchor and uses the default duration', () => {
		const drag = beginCreate(slot(2, 548), 60);
		expect(drag.kind).toBe('create');
		expect(drag.path).toBeNull();
		expect(resolveDrag(drag, [], days)).toEqual({
			kind: 'create',
			payload: { date: days[2], start: 540, end: 600 },
		});
	});

	it('a click at anchor 1425 stays inside the day', () => {
		expect(resolveDrag(beginCreate(slot(0, 1425), 60), [], days)).toEqual({
			kind: 'create',
			payload: { date: days[0], start: 1425, end: 1440 },
		});
	});

	it('a click at anchor 1440 starts at 1425', () => {
		expect(resolveDrag(beginCreate(slot(0, 1440), 30), [], days)).toEqual({
			kind: 'create',
			payload: { date: days[0], start: 1425, end: 1440 },
		});
	});

	it('a drag down spans anchor to current', () => {
		const drag = updateDrag(beginCreate(slot(1, 540), 60), slot(1, 668), FAR);
		expect(resolveDrag(drag, [], days)).toEqual({
			kind: 'create',
			payload: { date: days[1], start: 540, end: 675 },
		});
	});

	it('a drag up spans current to anchor', () => {
		const drag = updateDrag(beginCreate(slot(1, 600), 60), slot(1, 480), FAR);
		expect(resolveDrag(drag, [], days)).toEqual({
			kind: 'create',
			payload: { date: days[1], start: 480, end: 600 },
		});
	});

	it('a short drag keeps the 15-minute minimum', () => {
		const drag = updateDrag(beginCreate(slot(1, 600), 60), slot(1, 602), FAR);
		expect(resolveDrag(drag, [], days)).toEqual({
			kind: 'create',
			payload: { date: days[1], start: 600, end: 615 },
		});
	});

	it('a drag from anchor 1425 to the end of the day ends at 1440', () => {
		const drag = updateDrag(beginCreate(slot(0, 1425), 60), slot(0, 1440), FAR);
		expect(resolveDrag(drag, [], days)).toEqual({
			kind: 'create',
			payload: { date: days[0], start: 1425, end: 1440 },
		});
	});

	it('a drag from anchor 1440 upward starts at the pointer and ends at the capped anchor', () => {
		const drag = updateDrag(beginCreate(slot(0, 1440), 60), slot(0, 1380), FAR);
		expect(resolveDrag(drag, [], days)).toEqual({
			kind: 'create',
			payload: { date: days[0], start: 1380, end: 1425 },
		});
	});

	it('a drag at anchor 1440 that stays at 1440 keeps a 15-minute slot', () => {
		const drag = updateDrag(beginCreate(slot(0, 1440), 60), slot(0, 1440), FAR);
		expect(resolveDrag(drag, [], days)).toEqual({
			kind: 'create',
			payload: { date: days[0], start: 1425, end: 1440 },
		});
	});

	it('stays on the day where it started', () => {
		const drag = updateDrag(beginCreate(slot(1, 540), 60), slot(3, 600), FAR);
		expect(resolveDrag(drag, [], days)).toMatchObject({ payload: { date: days[1] } });
	});

	it('resolves to none when the visible days shrank mid-drag', () => {
		const drag = updateDrag(beginCreate(slot(3, 540), 60), slot(3, 600), FAR);
		expect(resolveDrag(drag, [], days.slice(0, 1))).toEqual({ kind: 'none' });
	});
});

describe('createGhost', () => {
	it('shows the click range before the threshold', () => {
		expect(createGhost(beginCreate(slot(2, 548), 60))).toEqual({ dayIndex: 2, start: 540, end: 600 });
	});

	it('shows the dragged range once moved', () => {
		const drag = updateDrag(beginCreate(slot(2, 540), 60), slot(2, 720), FAR);
		expect(createGhost(drag)).toEqual({ dayIndex: 2, start: 540, end: 720 });
	});

	it('is null for a move or resize', () => {
		expect(createGhost(beginMove(ev('a', 1, 540, 600), slot(1, 550)))).toBeNull();
		expect(createGhost(beginResize(ev('a', 1, 540, 600), slot(1, 595)))).toBeNull();
	});
});

describe('move', () => {
	it('moves from day 1 to day 3 keeping the duration', () => {
		const event = ev('a', 1, 540, 630);
		const drag = updateDrag(beginMove(event, slot(1, 560)), slot(3, 680), FAR);
		expect(resolveDrag(drag, [event], days)).toEqual({
			kind: 'move',
			path: 'a',
			timing: { date: days[3], start: 660, end: 750 },
		});
	});

	it('keeps the grab offset and snaps the start', () => {
		const event = ev('a', 1, 540, 600);
		const drag = updateDrag(beginMove(event, slot(1, 570)), slot(1, 647), FAR);
		expect(drag.start).toBe(615);
		expect(drag.end).toBe(675);
	});

	it('clamps at the start of the day', () => {
		const event = ev('a', 1, 60, 120);
		const drag = updateDrag(beginMove(event, slot(1, 90)), slot(1, 0), FAR);
		expect([drag.start, drag.end]).toEqual([0, 60]);
	});

	it('clamps at the end of the day', () => {
		const event = ev('a', 1, 1200, 1290);
		const drag = updateDrag(beginMove(event, slot(1, 1200)), slot(1, 1440), FAR);
		expect([drag.start, drag.end]).toEqual([1350, 1440]);
	});

	it('resolves to none when dropped where it started', () => {
		const event = ev('a', 1, 540, 600);
		const away = updateDrag(beginMove(event, slot(1, 560)), slot(2, 700), FAR);
		const back = updateDrag(away, slot(1, 560), FAR);
		expect(back.moved).toBe(true);
		expect(resolveDrag(back, [event], days)).toEqual({ kind: 'none' });
	});

	it('resolves to popover for a click that did not move', () => {
		const event = ev('a', 1, 540, 600);
		const drag = updateDrag(beginMove(event, slot(1, 560)), slot(1, 562), 2);
		expect(resolveDrag(drag, [event], days)).toEqual({ kind: 'popover', path: 'a' });
	});

	it('resolves a read-only event to popover even when dragged', () => {
		const event = ev('a', 1, 540, 600, true);
		const drag = updateDrag(beginMove(event, slot(1, 560)), slot(3, 800), FAR);
		expect(resolveDrag(drag, [event], days)).toEqual({ kind: 'popover', path: 'a' });
	});

	it('resolves to none when the event is gone', () => {
		const event = ev('a', 1, 540, 600);
		const drag = updateDrag(beginMove(event, slot(1, 560)), slot(1, 700), FAR);
		expect(resolveDrag(drag, [], days)).toEqual({ kind: 'none' });
		expect(resolveDrag(beginMove(event, slot(1, 560)), [], days)).toEqual({ kind: 'none' });
	});

	it('resolves to none when the visible days shrank mid-drag', () => {
		const event = ev('a', 1, 540, 600);
		const drag = updateDrag(beginMove(event, slot(1, 560)), slot(3, 700), FAR);
		expect(resolveDrag(drag, [event], days.slice(0, 1))).toEqual({ kind: 'none' });
	});
});

describe('resize', () => {
	it('moves the end and keeps start and day', () => {
		const event = ev('a', 1, 540, 600);
		const drag = updateDrag(beginResize(event, slot(1, 598)), slot(3, 688), FAR);
		expect(drag.kind).toBe('resize');
		expect(resolveDrag(drag, [event], days)).toEqual({
			kind: 'move',
			path: 'a',
			timing: { date: days[1], start: 540, end: 690 },
		});
	});

	it('clamps the end to start + 15', () => {
		const event = ev('a', 1, 540, 600);
		const drag = updateDrag(beginResize(event, slot(1, 598)), slot(1, 300), FAR);
		expect([drag.start, drag.end]).toEqual([540, 555]);
	});

	it('clamps the end to the end of the day', () => {
		const event = ev('a', 1, 1380, 1410);
		const drag = updateDrag(beginResize(event, slot(1, 1408)), slot(1, 1440), FAR);
		expect(drag.end).toBe(1440);
	});

	it('ends at 1440, not 1445, for a start of 1430 (max wins)', () => {
		const event = ev('a', 1, 1430, 1440);
		const drag = updateDrag(beginResize(event, slot(1, 1438)), slot(1, 1200), FAR);
		expect(drag.end).toBe(1440);
	});

	it('resolves an unchanged resize to none and an unmoved one to popover', () => {
		const event = ev('a', 1, 540, 600);
		const same = updateDrag(beginResize(event, slot(1, 598)), slot(1, 601), FAR);
		expect(resolveDrag(same, [event], days)).toEqual({ kind: 'none' });
		expect(resolveDrag(beginResize(event, slot(1, 598)), [event], days)).toEqual({ kind: 'popover', path: 'a' });
	});

	it("keeps the event's own date when the press slot is in another column", () => {
		const event = ev('a', 1, 540, 600);
		const drag = updateDrag(beginResize(event, slot(2, 598)), slot(2, 688), FAR);
		expect(resolveDrag(drag, [event], days)).toEqual({
			kind: 'move',
			path: 'a',
			timing: { date: days[1], start: 540, end: 690 },
		});
	});
});

describe('previewDayEvents', () => {
	const a = ev('a', 1, 540, 600);
	const b = ev('b', 1, 570, 630);
	const c = ev('c', 3, 600, 660);

	it('leaves every column alone with no drag, a create, or a press under the threshold', () => {
		expect(previewDayEvents(null, null, 1, days[1], [a, b])).toBeNull();
		const create = updateDrag(beginCreate(slot(1, 540), 60), slot(1, 700), FAR);
		expect(previewDayEvents(create, null, 1, days[1], [a, b])).toBeNull();
		expect(previewDayEvents(beginMove(a, slot(1, 560)), a, 1, days[1], [a, b])).toBeNull();
	});

	it('moves the dragged event out of its source column and into the target column', () => {
		const drag = updateDrag(beginMove(a, slot(1, 560)), slot(3, 680), FAR);
		expect(previewDayEvents(drag, a, 1, days[1], [a, b])).toEqual([b]);
		expect(previewDayEvents(drag, a, 3, days[3], [c])).toEqual([c, { ...a, date: days[3], start: 660, end: 720 }]);
	});

	it('leaves columns that are neither source nor target alone', () => {
		const drag = updateDrag(beginMove(a, slot(1, 560)), slot(3, 680), FAR);
		expect(previewDayEvents(drag, a, 2, days[2], [])).toBeNull();
		expect(previewDayEvents(drag, a, 0, days[0], [])).toBeNull();
	});

	it('replaces the event in place for a move within its own day', () => {
		const drag = updateDrag(beginMove(a, slot(1, 560)), slot(1, 680), FAR);
		expect(previewDayEvents(drag, a, 1, days[1], [a, b])).toEqual([b, { ...a, start: 660, end: 720 }]);
	});

	it("resizes in the event's own column even when the press slot was in another", () => {
		const drag = updateDrag(beginResize(a, slot(2, 598)), slot(2, 688), FAR);
		expect(previewDayEvents(drag, a, 1, days[1], [a, b])).toEqual([b, { ...a, end: 690 }]);
		expect(previewDayEvents(drag, a, 2, days[2], [])).toBeNull();
	});

	it('keeps the fields of the dragged event, such as its pending flag', () => {
		const pending = { ...a, pending: true };
		const drag = updateDrag(beginMove(pending, slot(1, 560)), slot(1, 680), FAR);
		expect(previewDayEvents(drag, pending, 1, days[1], [pending])).toEqual([{ ...pending, start: 660, end: 720 }]);
	});

	it('leaves every column alone when the dragged event is unknown', () => {
		const drag = updateDrag(beginMove(a, slot(1, 560)), slot(3, 680), FAR);
		expect(previewDayEvents(drag, null, 3, days[3], [c])).toBeNull();
	});
});

describe('cellFromPoint', () => {
	const rect = { left: 100, top: 50, width: 700, height: 600 };

	it('maps a point to the row-major index of its cell', () => {
		expect(cellFromPoint(rect, 150, 60, 7, 6)).toBe(0);
		expect(cellFromPoint(rect, 250, 60, 7, 6)).toBe(1);
		expect(cellFromPoint(rect, 150, 160, 7, 6)).toBe(7);
		expect(cellFromPoint(rect, 799, 649, 7, 6)).toBe(41);
	});

	it('clamps a point outside the rect to the nearest cell', () => {
		expect(cellFromPoint(rect, 0, 0, 7, 6)).toBe(0);
		expect(cellFromPoint(rect, 2000, 2000, 7, 6)).toBe(41);
		expect(cellFromPoint(rect, 2000, 0, 7, 6)).toBe(6);
	});

	it('reads one row of cells for the all-day lane', () => {
		expect(cellFromPoint(rect, 450, 9999, 5, 1)).toBe(2);
	});

	it('returns 0 for a rect with no size (an element not laid out)', () => {
		expect(cellFromPoint({ left: 0, top: 0, width: 0, height: 0 }, 10, 10, 7, 6)).toBe(0);
	});
});

describe('beginDayDrag and updateDayDrag', () => {
	const a = ev('a', 1, 540, 600);

	it('starts unmoved on the pressed cell', () => {
		expect(beginDayDrag(a, 1)).toEqual({ path: 'a', originDay: 1, day: 1, moved: false });
	});

	it('returns the same drag until the pointer passes the threshold', () => {
		const drag = beginDayDrag(a, 1);
		expect(updateDayDrag(drag, 3, DRAG_THRESHOLD_PX)).toBe(drag);
	});

	it('follows the pointer cell once past the threshold, and keeps following below it', () => {
		const moved = updateDayDrag(beginDayDrag(a, 1), 3, FAR);
		expect(moved).toEqual({ path: 'a', originDay: 1, day: 3, moved: true });
		expect(updateDayDrag(moved, 2, 0)).toEqual({ path: 'a', originDay: 1, day: 2, moved: true });
	});
});

describe('resolveDayDrag', () => {
	const a = ev('a', 1, 540, 600);
	const allDay: EventNote = { ...ev('h', 1, 0, 1440), allDay: true };

	it('moves the event to the target day, keeping the rest to the service', () => {
		const drag = updateDayDrag(beginDayDrag(a, 1), 3, FAR);
		expect(resolveDayDrag(drag, [a], days)).toEqual({ kind: 'move', path: 'a', date: days[3] });
	});

	it('moves an all-day event the same way', () => {
		const drag = updateDayDrag(beginDayDrag(allDay, 1), 0, FAR);
		expect(resolveDayDrag(drag, [allDay], days)).toEqual({ kind: 'move', path: 'h', date: days[0] });
	});

	it('does nothing for a press that never passed the threshold (the chip click opens the popover)', () => {
		expect(resolveDayDrag(beginDayDrag(a, 1), [a], days)).toEqual({ kind: 'none' });
	});

	it('does nothing for a drop on the same day', () => {
		const drag = updateDayDrag(updateDayDrag(beginDayDrag(a, 1), 3, FAR), 1, 0);
		expect(resolveDayDrag(drag, [a], days)).toEqual({ kind: 'none' });
	});

	it('does nothing for a read-only event', () => {
		const span = { ...a, endDate: days[2], readOnly: true };
		const drag = updateDayDrag(beginDayDrag(span, 1), 3, FAR);
		expect(resolveDayDrag(drag, [span], days)).toEqual({ kind: 'none' });
	});

	it('does nothing when the event is gone or the day index is out of range', () => {
		const drag = updateDayDrag(beginDayDrag(a, 1), 3, FAR);
		expect(resolveDayDrag(drag, [], days)).toEqual({ kind: 'none' });
		expect(resolveDayDrag(drag, [a], days.slice(0, 2))).toEqual({ kind: 'none' });
	});

	it('compares with the event as it is now, not as it was at the press', () => {
		const drag = updateDayDrag(beginDayDrag(a, 1), 3, FAR);
		expect(resolveDayDrag(drag, [{ ...a, date: days[3] }], days)).toEqual({ kind: 'none' });
	});
});

describe('previewDayMove', () => {
	const a = ev('a', 1, 540, 600);
	const b = ev('b', 2, 600, 660);

	it('returns the input untouched without a moved drag', () => {
		const events = [a, b];
		expect(previewDayMove(events, null, days)).toBe(events);
		expect(previewDayMove(events, beginDayDrag(a, 1), days)).toBe(events);
	});

	it('re-dates only the dragged event to the target day, keeping its other fields', () => {
		const pending = { ...a, pending: true };
		const drag = updateDayDrag(beginDayDrag(pending, 1), 3, FAR);
		expect(previewDayMove([pending, b], drag, days)).toEqual([{ ...pending, date: days[3] }, b]);
	});

	it('returns the input untouched when the target index is out of range', () => {
		const events = [a, b];
		const drag = updateDayDrag(beginDayDrag(a, 1), 9, FAR);
		expect(previewDayMove(events, drag, days)).toBe(events);
	});
});
