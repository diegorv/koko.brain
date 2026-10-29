// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Opening a note is the editor's side effect; the stores stay real (CLAUDE.md rule 1).
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn() } }));

// The note write is the service's side effect; the drag tests drive its promise.
vi.mock('$lib/features/event-calendar/event-calendar.service', async () => {
	const actual = await vi.importActual<typeof import('$lib/features/event-calendar/event-calendar.service')>(
		'$lib/features/event-calendar/event-calendar.service',
	);
	return { ...actual, moveEventToDay: vi.fn(), toastEventError: vi.fn() };
});

import { flushSync, mount, unmount } from 'svelte';
import { toast } from 'svelte-sonner';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import EventMonthGrid from '$lib/features/event-calendar/EventMonthGrid.svelte';
import { moveEventToDay, toastEventError } from '$lib/features/event-calendar/event-calendar.service';
import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import { eventCalendarDailyNoteStore } from '$lib/features/event-calendar/event-calendar-daily-note.store.svelte';
import type { CalendarTask } from '$lib/features/event-calendar/event-calendar-tasks.logic';
import type { EventNote } from '$lib/features/event-calendar/event-calendar.types';

const P = (name: string) => `/vault/Events/${name}.md`;

function event(overrides: Partial<EventNote> & Pick<EventNote, 'path' | 'title' | 'date'>): EventNote {
	return {
		start: 540,
		end: 600,
		allDay: false,
		color: 'blue',
		location: '',
		snippet: '',
		readOnly: false,
		...overrides,
	};
}

function seed(events: EventNote[]) {
	eventCalendarStore.setSnapshot({ events, issues: [], archivedCount: 0 }, 1);
}

/** A dated task on `date`, in note `name`, on `line`. */
function datedTask(name: string, date: string, line = 1, overrides: Partial<CalendarTask> = {}): CalendarTask {
	return { path: `/vault/${name}.md`, fileName: name, line, description: name, status: 'todo', date, ...overrides };
}

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function mountGrid() {
	component = mount(EventMonthGrid, { target });
	flushSync();
}

const q = <T extends Element = HTMLElement>(selector: string) => target.querySelector<T>(selector);
const qa = <T extends Element = HTMLElement>(selector: string) => [...target.querySelectorAll<T>(selector)];
const cell = (day: string) => q(`[data-month-cell="${day}"]`)!;
const headers = () => qa('[data-month-weekday]').map((h) => h.textContent?.trim());

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	settingsStore.reset();
	settingsStore.updateEventCalendar({ weekStartsOn: 1 });
	eventCalendarStore.reset();
	eventCalendarViewStore.reset();
	eventCalendarViewStore.setView('month');
	eventCalendarViewStore.setDate('2026-11-10');
	eventCalendarViewStore.setNow(new Date(2026, 10, 10, 10, 0).getTime());
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

describe('EventMonthGrid: cells and headers', () => {
	it('renders 42 cells with Monday-first weekday headers and dims the neighbour-month days', () => {
		mountGrid();

		expect(qa('[data-month-cell]')).toHaveLength(42);
		expect(headers()).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']);
		// November 2026 starts on a Sunday, so a Monday-first grid opens on 2026-10-26.
		expect(qa('[data-month-cell]')[0].getAttribute('data-month-cell')).toBe('2026-10-26');
		expect(cell('2026-10-26').getAttribute('data-in-month')).toBe('false');
		expect(cell('2026-11-01').getAttribute('data-in-month')).toBe('true');
	});

	it('dims out-of-month cells and their day numbers', () => {
		mountGrid();
		const dayNumber = (day: string) => cell(day).querySelector('[data-month-day]')!;

		expect(cell('2026-10-26').classList.contains('bg-muted/40')).toBe(true);
		expect(dayNumber('2026-10-26').classList.contains('text-muted-foreground')).toBe(true);
		expect(cell('2026-11-20').classList.contains('bg-muted/40')).toBe(false);
		expect(dayNumber('2026-11-20').classList.contains('text-muted-foreground')).toBe(false);
	});

	it('colors a today that is not the selected day with text-primary', () => {
		eventCalendarViewStore.setDate('2026-11-20');
		mountGrid();
		const today = cell('2026-11-10').querySelector('[data-month-day]')!;

		expect(today.hasAttribute('data-today')).toBe(true);
		expect(today.getAttribute('aria-pressed')).toBe('false');
		expect(today.classList.contains('text-primary')).toBe(true);
		expect(today.classList.contains('bg-primary')).toBe(false);
	});

	it('follows a Sunday-first weekStartsOn', () => {
		settingsStore.updateEventCalendar({ weekStartsOn: 0 });
		mountGrid();

		expect(headers()).toEqual(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
		expect(qa('[data-month-cell]')[0].getAttribute('data-month-cell')).toBe('2026-11-01');
	});

	it('drops weekend cells and headers when showWeekends is off', () => {
		settingsStore.updateEventCalendar({ showWeekends: false });
		seed([event({ path: P('Brunch'), title: 'Brunch', date: '2026-11-14' })]);
		mountGrid();

		expect(qa('[data-month-cell]')).toHaveLength(30);
		expect(headers()).toEqual(['MON', 'TUE', 'WED', 'THU', 'FRI']);
		expect(q('[data-month-cell="2026-11-14"]')).toBeNull();
		expect(q(`[data-event-path="${P('Brunch')}"]`)).toBeNull();
	});

	it('highlights today from the clock and follows a clock change', () => {
		mountGrid();
		expect(cell('2026-11-10').querySelector('[data-month-day]')!.hasAttribute('data-today')).toBe(true);
		expect(qa('[data-today]')).toHaveLength(1);

		eventCalendarViewStore.setNow(new Date(2026, 10, 11, 10, 0).getTime());
		flushSync();
		expect(cell('2026-11-11').querySelector('[data-month-day]')!.hasAttribute('data-today')).toBe(true);
		expect(qa('[data-today]')).toHaveLength(1);
	});
});

describe('EventMonthGrid: chips', () => {
	it('labels chips with the start time, all-day events first, colored through the tokens', () => {
		seed([
			event({ path: P('Standup'), title: 'Standup', date: '2026-11-11', start: 540, color: 'pink' }),
			event({ path: P('Holiday'), title: 'Holiday', date: '2026-11-11', allDay: true, color: 'green' }),
		]);
		mountGrid();

		const chips = qa<HTMLButtonElement>('[data-month-cell="2026-11-11"] [data-event-path]');
		expect(chips.map((c) => c.textContent?.trim())).toEqual(['Holiday', '09:00 Standup']);
		expect(chips[0].tagName).toBe('BUTTON');
		expect(chips[1].getAttribute('data-event-path')).toBe(P('Standup'));
		expect(chips[1].getAttribute('style')).toContain('background: var(--event-pink-bg)');
		expect(q('[data-month-cell="2026-11-10"] [data-event-path]')).toBeNull();
	});

	it('uses the 12h time format in chip labels', () => {
		settingsStore.updateEventCalendar({ timeFormat: '12h' });
		seed([event({ path: P('Lunch'), title: 'Lunch', date: '2026-11-11', start: 780 })]);
		mountGrid();

		expect(q(`[data-event-path="${P('Lunch')}"]`)!.textContent?.trim()).toBe('1:00 PM Lunch');
	});

	it('shows three chips and a "+N more" that opens day view', () => {
		seed(
			['A', 'B', 'C', 'D', 'E'].map((t, i) => event({ path: P(t), title: t, date: '2026-11-12', start: 480 + i * 60 })),
		);
		mountGrid();

		expect(qa('[data-month-cell="2026-11-12"] [data-event-path]')).toHaveLength(3);
		const more = q<HTMLButtonElement>('[data-month-cell="2026-11-12"] [data-month-more]')!;
		expect(more.textContent?.trim()).toBe('+2 more');

		more.click();
		flushSync();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-12');
		expect(eventCalendarViewStore.view).toBe('day');
	});

	it('has no "+N more" at three events or fewer', () => {
		seed(['A', 'B', 'C'].map((t) => event({ path: P(t), title: t, date: '2026-11-12' })));
		mountGrid();

		expect(qa('[data-month-cell="2026-11-12"] [data-event-path]')).toHaveLength(3);
		expect(q('[data-month-more]')).toBeNull();
	});

	it('shows dated tasks after the events, in the slots the events leave', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-12' })]);
		eventCalendarStore.setTasks([datedTask('Rent', '2026-11-12', 3), datedTask('Bills', '2026-11-12', 4, { status: 'done' })]);
		mountGrid();

		const children = [...cell('2026-11-12').children].slice(1);
		expect(children.map((c) => (c.hasAttribute('data-calendar-task') ? `task:${c.textContent?.trim()}` : c.textContent?.trim()))).toEqual([
			'09:00 Standup',
			'task:Rent',
			'task:Bills',
		]);
		const bills = q(`[data-month-cell="2026-11-12"] [data-task-line="4"]`)!;
		expect(bills.dataset.taskStatus).toBe('done');
		expect(bills.querySelector('.line-through')).not.toBeNull();
		expect(q('[data-month-more]')).toBeNull();
	});

	it('counts tasks that do not fit behind "+N more"', () => {
		seed(['A', 'B'].map((t) => event({ path: P(t), title: t, date: '2026-11-12' })));
		eventCalendarStore.setTasks([datedTask('One', '2026-11-12', 1), datedTask('Two', '2026-11-12', 2), datedTask('Three', '2026-11-12', 3)]);
		mountGrid();

		expect(qa('[data-month-cell="2026-11-12"] [data-event-path]')).toHaveLength(2);
		expect(qa('[data-month-cell="2026-11-12"] [data-calendar-task]')).toHaveLength(1);
		const more = q('[data-month-cell="2026-11-12"] [data-month-more]')!;
		expect(more.textContent?.trim()).toBe('+2 more');
		expect(more.getAttribute('aria-label')).toBe('2 more items, open day view');
	});

	it('shows no tasks when the overlay setting is off', () => {
		settingsStore.updateEventCalendar({ showTasks: false });
		eventCalendarStore.setTasks([datedTask('Rent', '2026-11-12')]);
		mountGrid();

		expect(q('[data-calendar-task]')).toBeNull();
	});

	it('a task chip click opens its note and leaves the selected day alone', () => {
		eventCalendarStore.setTasks([datedTask('Rent', '2026-11-12', 3)]);
		mountGrid();

		q<HTMLButtonElement>('[data-month-cell="2026-11-12"] [data-calendar-task]')!.click();
		flushSync();

		expect(openFileInEditor).toHaveBeenCalledWith('/vault/Rent.md');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('opens the popover on a chip click without changing the selected day, and rings only that chip', () => {
		seed([
			event({ path: P('Standup'), title: 'Standup', date: '2026-11-11' }),
			event({ path: P('Review'), title: 'Review', date: '2026-11-12' }),
		]);
		mountGrid();
		const chip = q<HTMLButtonElement>(`[data-event-path="${P('Standup')}"]`)!;

		chip.click();
		flushSync();
		expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		expect(chip.className).toContain('ring-primary/70');
		expect(q(`[data-event-path="${P('Review')}"]`)!.className).not.toContain('ring-primary/70');
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('marks a pending chip with data-pending and a dashed border', () => {
		seed([event({ path: P('Plain'), title: 'Plain', date: '2026-11-12' })]);
		mountGrid();
		const chip = () => q(`[data-event-path="${P('Plain')}"]`)!;
		expect(chip().hasAttribute('data-pending')).toBe(false);
		expect(chip().classList.contains('border-dashed')).toBe(false);

		eventCalendarStore.putPending({
			kind: 'update',
			path: P('Plain'),
			state: { title: 'Plain', date: '2026-11-12', start: 600, end: 660, allDay: false, color: 'blue', location: '' },
			settled: false,
		});
		flushSync();

		expect(chip().hasAttribute('data-pending')).toBe(true);
		expect(chip().classList.contains('border-dashed')).toBe(true);
	});
});

describe('EventMonthGrid: selection', () => {
	it('selects a day on a cell click', () => {
		mountGrid();

		cell('2026-11-20').click();
		flushSync();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-20');
		expect(eventCalendarViewStore.view).toBe('month');
	});

	it('stays in month view on a cell-body click on the selected day', () => {
		mountGrid();

		cell('2026-11-10').click();
		flushSync();
		cell('2026-11-10').click();
		flushSync();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		expect(eventCalendarViewStore.view).toBe('month');
	});

	it('selects a day on the first day-number click and opens day view on the second', () => {
		mountGrid();
		const day = () => cell('2026-11-20').querySelector<HTMLButtonElement>('[data-month-day]')!;
		expect(day().getAttribute('aria-pressed')).toBe('false');

		day().click();
		flushSync();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-20');
		expect(eventCalendarViewStore.view).toBe('month');
		expect(day().getAttribute('aria-pressed')).toBe('true');
		expect(day().getAttribute('aria-label')).toBe('Friday, November 20, 2026, selected, open day view');

		day().click();
		flushSync();
		expect(eventCalendarViewStore.view).toBe('day');
	});
});

describe('EventMonthGrid: daily note action', () => {
	let unregister: (() => void) | null = null;

	afterEach(() => {
		unregister?.();
		unregister = null;
	});

	it('has no daily note action when no plugin registered an opener', () => {
		mountGrid();

		expect(qa('[data-month-day]')).toHaveLength(42);
		expect(qa('[data-daily-note]')).toHaveLength(0);
	});

	it('puts the action beside each day number and opens that day without selecting it', () => {
		const opener = vi.fn(() => Promise.resolve());
		unregister = eventCalendarDailyNoteStore.register(opener);
		mountGrid();

		expect(qa('[data-daily-note]')).toHaveLength(42);
		const button = cell('2026-11-20').querySelector<HTMLButtonElement>('[data-daily-note]')!;
		expect(button.dataset.dailyNote).toBe('2026-11-20');
		expect(button.parentElement).toBe(cell('2026-11-20').querySelector('[data-month-day]')!.parentElement);

		button.click();
		flushSync();
		expect(opener).toHaveBeenCalledWith('2026-11-20');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		expect(eventCalendarViewStore.view).toBe('month');
	});

	it('ignores clicks while an open is in flight and accepts one after it settles', async () => {
		let resolveOpen: () => void = () => {};
		const opener = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveOpen = resolve;
				}),
		);
		unregister = eventCalendarDailyNoteStore.register(opener);
		mountGrid();
		const button = cell('2026-11-20').querySelector<HTMLButtonElement>('[data-daily-note]')!;

		button.click();
		button.click();
		expect(opener).toHaveBeenCalledTimes(1);

		resolveOpen();
		await vi.waitFor(() => {
			button.click();
			expect(opener).toHaveBeenCalledTimes(2);
		});
		resolveOpen();
		await eventCalendarDailyNoteStore.open('2026-11-20');
	});

	it('a remounted grid joins an open of the same day that is still in flight', async () => {
		let resolveOpen: () => void = () => {};
		const opener = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveOpen = resolve;
				}),
		);
		unregister = eventCalendarDailyNoteStore.register(opener);
		mountGrid();
		cell('2026-11-20').querySelector<HTMLButtonElement>('[data-daily-note]')!.click();

		unmount(component!);
		mountGrid();
		cell('2026-11-20').querySelector<HTMLButtonElement>('[data-daily-note]')!.click();
		expect(opener).toHaveBeenCalledTimes(1);

		resolveOpen();
		await eventCalendarDailyNoteStore.open('2026-11-20');
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('toasts when the opener fails', async () => {
		unregister = eventCalendarDailyNoteStore.register(() => Promise.reject(new Error('disk full')));
		mountGrid();

		cell('2026-11-20').querySelector<HTMLButtonElement>('[data-daily-note]')!.click();
		await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Could not open the daily note', { description: 'disk full' }));
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
	});
});

describe('EventMonthGrid: create', () => {
	const dblclick = (el: HTMLElement) => el.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));

	it('opens the create dialog at dayStartHour on a double-click on an empty cell', () => {
		settingsStore.updateEventCalendar({ dayStartHour: 7 });
		mountGrid();

		dblclick(cell('2026-11-20'));
		flushSync();

		expect(eventCalendarViewStore.dialog?.payload).toEqual({ mode: 'create', date: '2026-11-20', start: 420 });
	});

	it('does not open create on a double-click on a chip or the day number', () => {
		seed([event({ path: P('A'), title: 'A', date: '2026-11-20' })]);
		mountGrid();

		dblclick(cell('2026-11-20').querySelector<HTMLElement>(`[data-event-path="${P('A')}"]`)!);
		dblclick(cell('2026-11-20').querySelector<HTMLElement>('[data-month-day]')!);
		flushSync();

		expect(eventCalendarViewStore.dialog).toBeNull();
	});
});

describe('EventMonthGrid: spans', () => {
	it('shows a span on every cell it covers, crossing the week row, with the time only on its first day', () => {
		seed([
			event({ path: P('Retreat'), title: 'Retreat', date: '2026-11-15', endDate: '2026-11-17', allDay: true, start: 0, end: 1440, readOnly: true }),
			event({ path: P('Late'), title: 'Late show', date: '2026-11-10', endDate: '2026-11-11', start: 1380, end: 60, readOnly: true }),
		]);
		mountGrid();
		const chip = (day: string, name: string) => cell(day).querySelector(`[data-event-path="${P(name)}"]`)?.textContent?.trim();

		expect(['2026-11-14', '2026-11-15', '2026-11-16', '2026-11-17', '2026-11-18'].map((d) => chip(d, 'Retreat'))).toEqual([
			undefined,
			'Retreat',
			'Retreat',
			'Retreat',
			undefined,
		]);
		expect(chip('2026-11-10', 'Late')).toBe('23:00 Late show');
		expect(chip('2026-11-11', 'Late')).toBe('Late show');
		expect(chip('2026-11-12', 'Late')).toBeUndefined();
	});
});

describe('EventMonthGrid: drag to another day', () => {
	// Monday-first November 2026 starts on Oct 26: Nov 10 is cell 15 (row 2, column 1).
	// Cells are stubbed to 100 x 100 px, so a cell's center is (100 * col + 50, 100 * row + 50).
	const at = (index: number) => ({ clientX: (index % 7) * 100 + 50, clientY: Math.floor(index / 7) * 100 + 50 });
	const NOV_10 = 15;
	const NOV_12 = 17;

	function mountSized() {
		mountGrid();
		const area = q('[data-month-cells]')!;
		area.getBoundingClientRect = () => ({ left: 0, top: 0, width: 700, height: 600, right: 700, bottom: 600, x: 0, y: 0, toJSON: () => ({}) });
	}

	const chipIn = (day: string, name: string) => cell(day).querySelector<HTMLElement>(`[data-event-path="${P(name)}"]`);

	function down(name: string, index: number) {
		const chip = q(`[data-event-path="${P(name)}"]`)!;
		chip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1, ...at(index) }));
		flushSync();
	}

	function move(index: number, type: 'pointermove' | 'pointerup' = 'pointermove') {
		window.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1, ...at(index) }));
		flushSync();
	}

	/** A mouse click (`detail: 1`), as a pointer release sends; `el.click()` is a keyboard-style click (`detail: 0`). */
	function pointerClick(el: HTMLElement) {
		el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
		flushSync();
	}

	function press(key: string, mods: KeyboardEventInit = {}): KeyboardEvent {
		const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods });
		document.body.dispatchEvent(e);
		flushSync();
		return e;
	}

	it('moves a chip to the cell under the pointer, writes the new day once and holds it there until the write settles', async () => {
		let settle!: () => void;
		vi.mocked(moveEventToDay).mockReturnValue(new Promise<void>((resolve) => (settle = resolve)));
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountSized();

		down('Standup', NOV_10);
		move(NOV_12);
		expect(chipIn('2026-11-10', 'Standup')).toBeNull();
		expect(chipIn('2026-11-12', 'Standup')?.textContent?.trim()).toBe('09:00 Standup');

		move(NOV_12, 'pointerup');
		pointerClick(chipIn('2026-11-12', 'Standup')!);

		expect(moveEventToDay).toHaveBeenCalledTimes(1);
		expect(moveEventToDay).toHaveBeenCalledWith(P('Standup'), '2026-11-12');
		expect(eventCalendarViewStore.popover).toBeNull();
		expect(chipIn('2026-11-12', 'Standup')).not.toBeNull();

		settle();
		await Promise.resolve();
		await Promise.resolve();
		flushSync();
		// The mocked write changed nothing, so the snapshot's day shows again.
		expect(chipIn('2026-11-10', 'Standup')).not.toBeNull();
		expect(chipIn('2026-11-12', 'Standup')).toBeNull();
	});

	it('moves an all-day chip the same way', () => {
		vi.mocked(moveEventToDay).mockResolvedValue(undefined);
		seed([event({ path: P('Holiday'), title: 'Holiday', date: '2026-11-10', allDay: true, start: 0, end: 1440 })]);
		mountSized();

		down('Holiday', NOV_10);
		move(NOV_12);
		move(NOV_12, 'pointerup');

		expect(moveEventToDay).toHaveBeenCalledWith(P('Holiday'), '2026-11-12');
	});

	it('leaves a press under the threshold to the chip click, which opens the popover', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountSized();

		down('Standup', NOV_10);
		move(NOV_10, 'pointerup');
		chipIn('2026-11-10', 'Standup')!.click();
		flushSync();

		expect(moveEventToDay).not.toHaveBeenCalled();
		expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));
	});

	it('does not write a drop back on the same day', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountSized();

		down('Standup', NOV_10);
		move(NOV_12);
		move(NOV_10, 'pointerup');

		expect(moveEventToDay).not.toHaveBeenCalled();
		expect(chipIn('2026-11-10', 'Standup')).not.toBeNull();
	});

	it('marks a read-only span chip and never drags it', () => {
		seed([event({ path: P('Retreat'), title: 'Retreat', date: '2026-11-10', endDate: '2026-11-11', allDay: true, start: 0, end: 1440, readOnly: true })]);
		mountSized();
		expect(chipIn('2026-11-10', 'Retreat')!.dataset.readonly).toBe('true');

		down('Retreat', NOV_10);
		move(NOV_12);
		move(NOV_12, 'pointerup');

		expect(chipIn('2026-11-12', 'Retreat')).toBeNull();
		expect(chipIn('2026-11-10', 'Retreat')).not.toBeNull();
		expect(moveEventToDay).not.toHaveBeenCalled();
	});

	it('Escape mid-drag puts the chip back and writes nothing; only Escape is kept from the document', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountSized();
		const reached: string[] = [];
		const onKey = (e: KeyboardEvent) => reached.push(e.key);
		document.addEventListener('keydown', onKey);

		down('Standup', NOV_10);
		move(NOV_12);
		const save = press('s', { metaKey: true });
		press('d');
		const liveMidDrag = eventCalendarViewStore.gestureLive;
		const esc = press('Escape');
		move(NOV_12, 'pointerup');
		press('d');
		document.removeEventListener('keydown', onKey);

		expect(liveMidDrag).toBe(true);
		expect(save.defaultPrevented).toBe(false);
		expect(esc.defaultPrevented).toBe(true);
		expect(reached).toEqual(['s', 'd', 'd']);
		expect(eventCalendarViewStore.gestureLive).toBe(false);
		expect(chipIn('2026-11-10', 'Standup')).not.toBeNull();
		expect(moveEventToDay).not.toHaveBeenCalled();
	});

	it('swallows the pointer click that follows an Escape-discarded drag', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountSized();

		down('Standup', NOV_10);
		move(NOV_12);
		press('Escape');
		move(NOV_12, 'pointerup');
		pointerClick(chipIn('2026-11-10', 'Standup')!);

		expect(eventCalendarViewStore.popover).toBeNull();
		expect(moveEventToDay).not.toHaveBeenCalled();
	});

	it('pointercancel mid-drag puts the chip back, writes nothing and clears the live flag', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountSized();

		down('Standup', NOV_10);
		move(NOV_12);
		const liveMidDrag = eventCalendarViewStore.gestureLive;
		window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerType: 'mouse', pointerId: 1, ...at(NOV_12) }));
		flushSync();
		const liveAfterCancel = eventCalendarViewStore.gestureLive;
		move(NOV_12, 'pointerup');

		expect(liveMidDrag).toBe(true);
		expect(liveAfterCancel).toBe(false);
		expect(chipIn('2026-11-10', 'Standup')).not.toBeNull();
		expect(chipIn('2026-11-12', 'Standup')).toBeNull();
		expect(moveEventToDay).not.toHaveBeenCalled();
	});

	it('a drop whose click lands outside the grid does not swallow a later pointer-style click with no press', () => {
		vi.mocked(moveEventToDay).mockReturnValue(new Promise<void>(() => {}));
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' }), event({ path: P('Review'), title: 'Review', date: '2026-11-13' })]);
		mountSized();

		down('Standup', NOV_10);
		move(NOV_12);
		move(NOV_12, 'pointerup');
		// The release's click lands outside the cells.
		pointerClick(document.body);
		// An assistive-tech activation: `detail: 1`, no pointerdown.
		pointerClick(chipIn('2026-11-13', 'Review')!);

		expect(moveEventToDay).toHaveBeenCalledWith(P('Standup'), '2026-11-12');
		expect(eventCalendarViewStore.popover?.path).toBe(P('Review'));
	});

	it('a pointercancel-discarded drag does not swallow a later pointer-style click with no press', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountSized();

		down('Standup', NOV_10);
		move(NOV_12);
		window.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerType: 'mouse', pointerId: 1, ...at(NOV_12) }));
		flushSync();
		pointerClick(chipIn('2026-11-10', 'Standup')!);

		expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));
		expect(moveEventToDay).not.toHaveBeenCalled();
	});

	it('a press anywhere after a moved drop disarms the click swallow', () => {
		vi.mocked(moveEventToDay).mockReturnValue(new Promise<void>(() => {}));
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' }), event({ path: P('Review'), title: 'Review', date: '2026-11-13' })]);
		mountSized();

		down('Standup', NOV_10);
		move(NOV_12);
		move(NOV_12, 'pointerup');
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 2 }));
		pointerClick(chipIn('2026-11-13', 'Review')!);

		expect(eventCalendarViewStore.popover?.path).toBe(P('Review'));
	});

	it('closes an open popover once the press moves past the threshold', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountSized();
		eventCalendarViewStore.openPopover(P('Standup'), { x: 0, y: 0, width: 10, height: 10 });

		down('Standup', NOV_10);
		expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));
		move(NOV_12);

		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('a month step mid-drag discards the drag: nothing is written', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountSized();

		down('Standup', NOV_10);
		move(NOV_12);
		eventCalendarViewStore.setDate('2026-12-10');
		flushSync();
		move(NOV_12, 'pointerup');

		expect(moveEventToDay).not.toHaveBeenCalled();
	});

	it('toasts a failed write and drops the held preview', async () => {
		const failure = new Error('disk full');
		vi.mocked(moveEventToDay).mockRejectedValue(failure);
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountSized();

		down('Standup', NOV_10);
		move(NOV_12);
		move(NOV_12, 'pointerup');
		await vi.waitFor(() => expect(toastEventError).toHaveBeenCalledWith(failure, P('Standup')));
		flushSync();

		expect(chipIn('2026-11-10', 'Standup')).not.toBeNull();
		expect(chipIn('2026-11-12', 'Standup')).toBeNull();
	});
});
