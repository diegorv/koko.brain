// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Opening a note is the editor's side effect; the stores stay real (CLAUDE.md rule 1).
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

import { flushSync, mount, unmount } from 'svelte';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import EventMonthGrid from '$lib/features/event-calendar/EventMonthGrid.svelte';
import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
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

	it('opens the note on a chip click without changing the selected day', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-11' })]);
		mountGrid();

		q<HTMLButtonElement>(`[data-event-path="${P('Standup')}"]`)!.click();
		expect(openFileInEditor).toHaveBeenCalledWith(P('Standup'));
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
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
