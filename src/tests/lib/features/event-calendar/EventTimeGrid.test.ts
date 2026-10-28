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
import EventTimeGrid from '$lib/features/event-calendar/EventTimeGrid.svelte';
import { weekDays } from '$lib/features/event-calendar/event-calendar-dates.logic';
import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import type { EventNote } from '$lib/features/event-calendar/event-calendar.types';

const P = (name: string) => `/vault/Events/${name}.md`;
/** Monday-first week of 2026-11-09 (the default `weekStartsOn` is 0, so the test passes it). */
const WEEK = weekDays('2026-11-10', 1);

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

function mountGrid(days: string[] = WEEK) {
	component = mount(EventTimeGrid, { target, props: { days } });
	flushSync();
}

const q = <T extends Element = HTMLElement>(selector: string) => target.querySelector<T>(selector);
const qa = <T extends Element = HTMLElement>(selector: string) => [...target.querySelectorAll<T>(selector)];

beforeEach(() => {
	vi.clearAllMocks();
	clearLocalStorage();
	settingsStore.reset();
	eventCalendarStore.reset();
	eventCalendarViewStore.reset();
	eventCalendarViewStore.setDate('2026-11-10');
	eventCalendarViewStore.setNow(new Date(2026, 10, 10, 10, 0).getTime());
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

describe('EventTimeGrid: timed blocks', () => {
	it('renders a seeded event in its day column with its title, time and snippet line', () => {
		seed([
			event({ path: P('Standup'), title: 'Standup', date: '2026-11-11', start: 540, end: 600, snippet: 'Agenda first\nsecond line' }),
		]);
		mountGrid();

		const column = q('[data-day-column="2026-11-11"]')!;
		const block = column.querySelector<HTMLElement>(`[data-event-path="${P('Standup')}"]`)!;
		expect(block).not.toBeNull();
		expect(block.querySelector('[data-event-title]')?.textContent?.trim()).toBe('Standup');
		expect(block.querySelector('[data-event-time]')?.textContent).toBe('09:00 – 10:00');
		expect(block.querySelector('[data-event-snippet]')?.textContent).toBe('Agenda first');
		expect(block.getAttribute('role')).toBe('button');
		expect(block.getAttribute('tabindex')).toBe('0');
		expect(block.getAttribute('aria-label')).toBe('Standup, 09:00 – 10:00, Agenda first');
		expect(block.getAttribute('style')).toContain('background: var(--event-blue-bg)');
		expect(block.getAttribute('style')).toContain('top: 577px');
		expect(q('[data-day-column="2026-11-10"] [data-event-path]')).toBeNull();
	});

	it('leaves the snippet line out of a short block', () => {
		seed([event({ path: P('Quick'), title: 'Quick', date: '2026-11-10', start: 540, end: 570, snippet: 'Hidden' })]);
		mountGrid();

		const block = q(`[data-event-path="${P('Quick')}"]`)!;
		expect(block.querySelector('[data-event-snippet]')).toBeNull();
		expect(block.getAttribute('aria-label')).toBe('Quick, 09:00 – 09:30, Hidden');
	});

	it('splits overlapping events into columns', () => {
		seed([
			event({ path: P('A'), title: 'A', date: '2026-11-10', start: 540, end: 660 }),
			event({ path: P('B'), title: 'B', date: '2026-11-10', start: 600, end: 690 }),
		]);
		mountGrid();

		// jsdom normalizes calc(): `(100% - 5px) / 2 - 2px` reads back as `-2px + 0.5 * (100% - 5px)`.
		const a = q(`[data-event-path="${P('A')}"]`)!;
		const b = q(`[data-event-path="${P('B')}"]`)!;
		expect(a.style.width).toBe('calc(-2px + 0.5 * (100% - 5px))');
		expect(a.style.left).toBe('calc(2px + 0 * (100% - 5px))');
		expect(b.style.left).toBe('calc(2px + 0.5 * (100% - 5px))');
	});

	it('marks read-only and pending blocks', () => {
		seed([
			event({ path: P('Trip'), title: 'Trip', date: '2026-11-10', readOnly: true }),
			event({ path: P('Plain'), title: 'Plain', date: '2026-11-12' }),
		]);
		mountGrid();

		expect(q(`[data-event-path="${P('Trip')}"]`)!.hasAttribute('data-readonly')).toBe(true);
		expect(q(`[data-event-path="${P('Plain')}"]`)!.hasAttribute('data-readonly')).toBe(false);
		expect(q(`[data-event-path="${P('Plain')}"]`)!.getAttribute('data-pending')).toBe('false');

		eventCalendarStore.putPending({
			kind: 'update',
			path: P('Plain'),
			state: { title: 'Plain', date: '2026-11-12', start: 600, end: 660, allDay: false, color: 'blue', location: '' },
			settled: false,
		});
		flushSync();

		expect(q(`[data-event-path="${P('Plain')}"]`)!.getAttribute('data-pending')).toBe('true');
	});

	it('gives writable blocks a bottom resize handle and read-only blocks none', () => {
		seed([
			event({ path: P('Trip'), title: 'Trip', date: '2026-11-10', readOnly: true }),
			event({ path: P('Plain'), title: 'Plain', date: '2026-11-12' }),
		]);
		mountGrid();

		const handle = q(`[data-event-path="${P('Plain')}"] [data-resize]`);
		expect(handle).not.toBeNull();
		expect(handle!.className).toContain('cursor-ns-resize');
		expect(handle!.getAttribute('aria-hidden')).toBe('true');
		expect(q(`[data-event-path="${P('Trip')}"] [data-resize]`)).toBeNull();
	});

	it('marks a pending block with a dashed border instead of dimming it', () => {
		seed([event({ path: P('Plain'), title: 'Plain', date: '2026-11-12' })]);
		mountGrid();
		const block = () => q(`[data-event-path="${P('Plain')}"]`)!;
		expect(block().classList.contains('border-dashed')).toBe(false);

		eventCalendarStore.putPending({
			kind: 'update',
			path: P('Plain'),
			state: { title: 'Plain', date: '2026-11-12', start: 600, end: 660, allDay: false, color: 'blue', location: '' },
			settled: false,
		});
		flushSync();

		expect(block().classList.contains('border-dashed')).toBe(true);
		expect(block().className).not.toMatch(/opacity-/);
	});

	it('draws the time and snippet lines at full opacity', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10', start: 540, end: 600, snippet: 'Agenda' })]);
		mountGrid();

		const block = q(`[data-event-path="${P('Standup')}"]`)!;
		expect(block.querySelector('[data-event-time]')!.className).not.toMatch(/opacity-/);
		expect(block.querySelector('[data-event-snippet]')!.className).not.toMatch(/opacity-/);
	});

	it('clamps the z-index of deep overlap columns below the now-line and the axis', () => {
		seed(
			Array.from({ length: 12 }, (_, i) =>
				event({ path: P(`E${i}`), title: `E${i}`, date: '2026-11-10', start: 540, end: 600 }),
			),
		);
		mountGrid();

		const zs = qa('[data-day-column="2026-11-10"] [data-event-path]').map((el) => Number(el.style.zIndex));
		expect(zs).toHaveLength(12);
		expect(Math.min(...zs)).toBe(10);
		expect(Math.max(...zs)).toBe(19);
	});

	it('opens the popover, not the note, on a block click and on Enter, and rings the block', () => {
		seed([
			event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' }),
			event({ path: P('Review'), title: 'Review', date: '2026-11-11' }),
		]);
		mountGrid();
		const block = q(`[data-event-path="${P('Standup')}"]`)!;

		block.click();
		flushSync();
		expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));
		expect(block.className).toContain('ring-primary/70');
		expect(q(`[data-event-path="${P('Review')}"]`)!.className).not.toContain('ring-primary/70');

		eventCalendarViewStore.closePopover();
		block.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('renders no blocks for an empty week', () => {
		mountGrid();

		expect(qa('[data-day-column]')).toHaveLength(7);
		expect(qa('[data-event-path]')).toHaveLength(0);
	});
});

describe('EventTimeGrid: layout', () => {
	it('gives the 7-day container a 96 px-per-column min-width', () => {
		mountGrid();

		expect(q('[data-time-grid-columns]')!.getAttribute('style')).toContain('min-width: calc(var(--axis) + 7 * 96px)');
		expect(q('[data-time-grid]')!.getAttribute('style')).toContain('--axis: 56px');
	});

	it('draws 23 hour labels in the 24h format', () => {
		mountGrid();

		const labels = qa('[data-time-axis] span').map((s) => s.textContent);
		expect(labels).toHaveLength(23);
		expect(labels[0]).toBe('01:00');
		expect(labels[8]).toBe('09:00');
	});

	it('drops :00 from 12h labels', () => {
		settingsStore.updateEventCalendar({ timeFormat: '12h' });
		mountGrid();

		const labels = qa('[data-time-axis] span').map((s) => s.textContent);
		expect(labels[8]).toBe('9 AM');
		expect(labels[12]).toBe('1 PM');
	});

	it('masks the hour line under the sticky header with an axis-wide cell', () => {
		mountGrid();

		const mask = q('[data-time-grid-header] > [data-time-grid-mask]')!;
		expect(mask).not.toBeNull();
		expect(mask.getAttribute('aria-hidden')).toBe('true');
		expect(mask.querySelector('.sticky.left-0.w-\\(--axis\\)')).not.toBeNull();
	});

	it('scrolls to dayStartHour on mount', () => {
		settingsStore.updateEventCalendar({ dayStartHour: 8 });
		mountGrid();

		expect(q('[data-time-grid]')!.scrollTop).toBe(512);
	});
});

describe('EventTimeGrid: accessibility and headers', () => {
	it('labels day columns and lane cells as groups', () => {
		mountGrid();

		const columns = qa('[data-day-column]');
		expect(columns.every((c) => c.getAttribute('role') === 'group')).toBe(true);
		expect(columns[1].getAttribute('aria-label')).toBe('November 10, 2026 schedule');
		const cells = qa('[data-all-day-cell]');
		expect(cells).toHaveLength(7);
		expect(cells.every((c) => c.getAttribute('role') === 'group' && c.getAttribute('aria-label') === 'All-day events')).toBe(true);
	});

	it('presses the selected day header and labels it for day view', () => {
		mountGrid();

		const headers = qa<HTMLButtonElement>('[data-day-header]');
		expect(headers.map((h) => h.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false', 'false', 'false', 'false']);
		expect(headers[1].getAttribute('aria-label')).toBe('Tuesday, November 10, 2026, selected, open day view');
		expect(headers[2].getAttribute('aria-label')).toBe('Wednesday, November 11, 2026');
	});

	it('selects a day on the first click and opens day view on the second', () => {
		mountGrid();
		const header = () => q<HTMLButtonElement>('[data-day-header="2026-11-12"]')!;

		header().click();
		flushSync();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-12');
		expect(eventCalendarViewStore.view).toBe('week');
		expect(header().getAttribute('aria-pressed')).toBe('true');

		header().click();
		flushSync();
		expect(eventCalendarViewStore.view).toBe('day');
	});
});

describe('EventTimeGrid: all-day lane', () => {
	it('renders an all-day chip as a button with data-event-path that opens the popover', () => {
		seed([event({ path: P('Off'), title: 'Time off', date: '2026-11-09', allDay: true, start: 0, end: 1440, color: 'green' })]);
		mountGrid();

		const chip = q<HTMLButtonElement>(`[data-all-day-cell="2026-11-09"] [data-event-path="${P('Off')}"]`)!;
		expect(chip.tagName).toBe('BUTTON');
		expect(chip.textContent?.trim()).toBe('Time off');
		expect(chip.getAttribute('style')).toContain('var(--event-green-bg)');
		expect(q(`[data-day-column] [data-event-path="${P('Off')}"]`)).toBeNull();

		chip.click();
		flushSync();
		expect(eventCalendarViewStore.popover?.path).toBe(P('Off'));
		expect(chip.className).toContain('ring-primary/70');
		expect(openFileInEditor).not.toHaveBeenCalled();
	});

	it('caps the lane at 3 rows with a "+N" that opens day view', () => {
		seed(
			['A', 'B', 'C', 'D'].map((t) => event({ path: P(t), title: t, date: '2026-11-11', allDay: true, start: 0, end: 1440 })),
		);
		mountGrid();

		const cell = q('[data-all-day-cell="2026-11-11"]')!;
		expect(cell.querySelectorAll('[data-event-path]')).toHaveLength(2);
		const more = cell.querySelector<HTMLButtonElement>('[data-all-day-more]')!;
		expect(more.textContent?.trim()).toBe('+2');
		expect(q('[data-all-day-lane]')!.style.height).toBe('105px');

		more.click();
		flushSync();
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-11');
		expect(eventCalendarViewStore.view).toBe('day');
	});

	it('opens the create dialog in all-day mode on a click on empty lane space, not on a chip', () => {
		seed([event({ path: P('Off'), title: 'Time off', date: '2026-11-09', allDay: true, start: 0, end: 1440 })]);
		mountGrid();

		q<HTMLButtonElement>(`[data-all-day-cell="2026-11-09"] [data-event-path="${P('Off')}"]`)!.click();
		flushSync();
		expect(eventCalendarViewStore.dialog).toBeNull();

		q('[data-all-day-cell="2026-11-11"]')!.click();
		flushSync();
		expect(eventCalendarViewStore.dialog?.payload).toEqual({ mode: 'create', date: '2026-11-11', allDay: true });
	});
});

describe('EventTimeGrid: now-line', () => {
	it('shows the now-line only in today\'s column, hidden from assistive tech', () => {
		mountGrid();

		const lines = qa('[data-now-line]');
		expect(lines).toHaveLength(1);
		expect(lines[0].closest('[data-day-column]')?.getAttribute('data-day-column')).toBe('2026-11-10');
		expect(lines[0].getAttribute('aria-hidden')).toBe('true');
		expect(lines[0].style.top).toBe('640px');
	});

	it('has no now-line when today is not visible', () => {
		mountGrid(weekDays('2026-11-17', 1));

		expect(qa('[data-now-line]')).toHaveLength(0);
	});
});
