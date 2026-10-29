// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Opening a note is the editor's side effect; the stores stay real (CLAUDE.md rule 1).
vi.mock('$lib/core/editor/editor.service', () => ({
	openFileInEditor: vi.fn(),
}));

// A drop's write is the service's side effect; only the two writers are replaced.
vi.mock('$lib/features/event-calendar/event-calendar.service', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/features/event-calendar/event-calendar.service')>()),
	moveEvent: vi.fn(async () => {}),
	resizeEvent: vi.fn(async () => {}),
}));

import { flushSync, mount, unmount } from 'svelte';
import { openFileInEditor } from '$lib/core/editor/editor.service';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import EventTimeGrid from '$lib/features/event-calendar/EventTimeGrid.svelte';
import { weekDays } from '$lib/features/event-calendar/event-calendar-dates.logic';
import { eventCalendarStore } from '$lib/features/event-calendar/event-calendar.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import { eventCalendarDailyNoteStore } from '$lib/features/event-calendar/event-calendar-daily-note.store.svelte';
import { moveEvent, resizeEvent } from '$lib/features/event-calendar/event-calendar.service';
import type { CalendarTask } from '$lib/features/event-calendar/event-calendar-tasks.logic';
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

/** A dated task on `date`, in note `name`, on `line`. */
function datedTask(name: string, date: string, line = 1, overrides: Partial<CalendarTask> = {}): CalendarTask {
	return { path: `/vault/${name}.md`, fileName: name, line, description: name, status: 'todo', date, ...overrides };
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

	it('labels each segment of a timed span with the whole range while the time text shows the day part', () => {
		seed([event({ path: P('Trip'), title: 'Trip', date: '2026-11-10', endDate: '2026-11-12', start: 1320, end: 120 })]);
		mountGrid();

		const segment = (day: string) => q(`[data-day-column="${day}"] [data-event-path="${P('Trip')}"]`)!;
		for (const day of ['2026-11-10', '2026-11-11', '2026-11-12']) {
			expect(segment(day).getAttribute('aria-label')).toBe('Trip, Nov 10 22:00 – Nov 12 02:00');
		}
		expect(segment('2026-11-11').querySelector('[data-event-time]')?.textContent).toBe('00:00 – 24:00');
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
		// The header's z-40 must stay inside the grid, under app overlays like Settings.
		expect(q('[data-time-grid]')!.classList.contains('isolate')).toBe(true);
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

describe('EventTimeGrid: daily note action', () => {
	let unregister: (() => void) | null = null;

	afterEach(() => {
		unregister?.();
		unregister = null;
	});

	it('has no daily note action when no plugin registered an opener', () => {
		mountGrid();

		expect(qa('[data-day-header]')).toHaveLength(7);
		expect(qa('[data-daily-note]')).toHaveLength(0);
	});

	it('opens the daily note of its day without selecting it', () => {
		const opener = vi.fn(() => Promise.resolve());
		unregister = eventCalendarDailyNoteStore.register(opener);
		mountGrid();

		const buttons = qa<HTMLButtonElement>('[data-daily-note]');
		expect(buttons.map((b) => b.dataset.dailyNote)).toEqual(WEEK);
		const button = q<HTMLButtonElement>('[data-daily-note="2026-11-12"]')!;
		expect(button.getAttribute('aria-label')).toBe('Open daily note for November 12, 2026');

		button.click();
		flushSync();
		expect(opener).toHaveBeenCalledWith('2026-11-12');
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-10');
		expect(eventCalendarViewStore.view).toBe('week');
	});

	it('drops the action when the opener is unregistered', () => {
		unregister = eventCalendarDailyNoteStore.register(() => Promise.resolve());
		mountGrid();
		expect(qa('[data-daily-note]')).toHaveLength(7);

		unregister();
		unregister = null;
		flushSync();
		expect(qa('[data-daily-note]')).toHaveLength(0);
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

describe('EventTimeGrid: keys during a gesture', () => {
	/** Keys that reached a bubbling listener on `document` (where the view's shortcuts sit). */
	let reached: string[];
	const onKey = (e: KeyboardEvent) => reached.push(e.key);

	beforeEach(() => {
		reached = [];
		document.addEventListener('keydown', onKey);
	});

	afterEach(() => {
		document.removeEventListener('keydown', onKey);
	});

	function press(key: string, mods: KeyboardEventInit = {}): KeyboardEvent {
		const e = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...mods });
		document.body.dispatchEvent(e);
		return e;
	}

	function startGesture() {
		q('[data-time-grid-body]')!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1 }));
		flushSync();
	}

	it('lets every key but Escape reach the app\'s document shortcuts while a gesture is live, and marks the gesture live', () => {
		mountGrid();
		startGesture();

		const save = press('s', { metaKey: true });
		press('p', { metaKey: true });
		press('C', { metaKey: true, shiftKey: true });
		press('d');
		press('Delete');

		expect(reached).toEqual(['s', 'p', 'C', 'd', 'Delete']);
		expect(save.defaultPrevented).toBe(false);
		expect(eventCalendarViewStore.gestureLive).toBe(true);
	});

	it('Escape discards the gesture without reaching the document, and clears the live flag', () => {
		mountGrid();
		startGesture();

		const esc = press('Escape');
		flushSync();
		press('d');

		expect(esc.defaultPrevented).toBe(true);
		expect(reached).toEqual(['d']);
		expect(eventCalendarViewStore.gestureLive).toBe(false);
	});

	it('Enter on a block mid-gesture opens no popover', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountGrid();
		const block = q(`[data-event-path="${P('Standup')}"]`)!;
		block.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1 }));
		flushSync();

		block.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
		flushSync();

		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('does not touch keys when no gesture is live', () => {
		mountGrid();

		const e = press('d');

		expect(reached).toEqual(['d']);
		expect(e.defaultPrevented).toBe(false);
	});

	it('lets keys through once the gesture ends on pointerup', () => {
		mountGrid();
		startGesture();

		q('[data-time-grid-body]')!.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1 }));
		flushSync();
		press('d');

		expect(reached).toEqual(['d']);
		expect(eventCalendarViewStore.gestureLive).toBe(false);
	});

	it.each(['pointercancel', 'lostpointercapture'])('clears the live flag when the gesture ends on %s', (type) => {
		mountGrid();
		startGesture();

		q('[data-time-grid-body]')!.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerType: 'mouse', pointerId: 1 }));
		flushSync();
		press('d');

		expect(reached).toEqual(['d']);
		expect(eventCalendarViewStore.gestureLive).toBe(false);
	});

	it('clears the live flag when the grid unmounts mid-gesture', () => {
		mountGrid();
		startGesture();

		unmount(component!);
		component = null;

		expect(eventCalendarViewStore.gestureLive).toBe(false);
	});
});

describe('EventTimeGrid: focus leaving the calendar mid-gesture', () => {
	/** Keys that reached a bubbling listener on `document` (where an overlay's Escape handler sits). */
	let reached: string[];
	const onKey = (e: KeyboardEvent) => reached.push(e.key);
	/** Stands in for an overlay's input (the command palette, the quick switcher). */
	let outside: HTMLInputElement;

	beforeEach(() => {
		reached = [];
		document.addEventListener('keydown', onKey);
		// The grid sits inside the Calendar view's root.
		target.setAttribute('data-event-calendar', '');
		outside = document.body.appendChild(document.createElement('input'));
	});

	afterEach(() => {
		document.removeEventListener('keydown', onKey);
	});

	const body = () => q('[data-time-grid-body]')!;

	/** Mounts the grid with its body stubbed to 100 px per day column, so a press lands on a real slot. */
	function mountSized() {
		mountGrid();
		body().getBoundingClientRect = () => ({ left: 0, top: 0, width: 700, height: 1440, right: 700, bottom: 1440, x: 0, y: 0, toJSON: () => ({}) });
	}

	function pointer(el: HTMLElement, type: string, clientX = 0, clientY = 0) {
		el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1, clientX, clientY }));
		flushSync();
	}

	it('discards a create gesture: the live flag clears, Escape reaches the document and the release opens no dialog', () => {
		mountSized();
		pointer(body(), 'pointerdown');

		outside.focus();
		flushSync();
		const liveAfterFocus = eventCalendarViewStore.gestureLive;
		document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		pointer(body(), 'pointerup');

		expect(liveAfterFocus).toBe(false);
		expect(reached).toEqual(['Escape']);
		expect(eventCalendarViewStore.dialog).toBeNull();
	});

	it('discards a press on a block: the release opens no popover', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10' })]);
		mountSized();
		const block = q(`[data-event-path="${P('Standup')}"]`)!;
		pointer(block, 'pointerdown');

		outside.focus();
		flushSync();
		pointer(block, 'pointerup');
		block.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
		flushSync();

		expect(eventCalendarViewStore.gestureLive).toBe(false);
		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it.each(['move', 'resize'] as const)('discards a %s of a block past the threshold: the release writes nothing', (kind) => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-10', start: 540, end: 600 })]);
		mountSized();
		const block = q(`[data-event-path="${P('Standup')}"]`)!;
		// 09:10 inside the block, or 09:57 on its bottom handle, in the first 100 px column.
		const [grab, y] = kind === 'resize' ? [block.querySelector<HTMLElement>('[data-resize]')!, 636] : [block, 586];
		pointer(grab, 'pointerdown', 50, y);
		pointer(body(), 'pointermove', 150, y + 110);

		outside.focus();
		flushSync();
		pointer(body(), 'pointerup', 150, y + 110);
		block.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
		flushSync();

		expect(moveEvent).not.toHaveBeenCalled();
		expect(resizeEvent).not.toHaveBeenCalled();
		expect(q(`[data-day-column="2026-11-10"] [data-event-path="${P('Standup')}"]`)).not.toBeNull();
		expect(q(`[data-day-column="2026-11-11"] [data-event-path="${P('Standup')}"]`)).toBeNull();
		expect(eventCalendarViewStore.gestureLive).toBe(false);
		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('keeps the gesture when focus moves within the calendar root', () => {
		seed([event({ path: P('Standup'), title: 'Standup', date: '2026-11-11' })]);
		mountSized();
		const elsewhereInRoot = target.appendChild(document.createElement('button'));
		pointer(body(), 'pointerdown');

		q(`[data-event-path="${P('Standup')}"]`)!.focus();
		elsewhereInRoot.focus();
		flushSync();
		const liveAfterFocus = eventCalendarViewStore.gestureLive;
		pointer(body(), 'pointerup');

		expect(liveAfterFocus).toBe(true);
		expect(eventCalendarViewStore.dialog?.mode).toBe('create');
	});
});

describe('EventTimeGrid: click swallow after a gesture', () => {
	const body = () => q('[data-time-grid-body]')!;
	const block = (name: string) => q(`[data-event-path="${P(name)}"]`)!;

	/** Mounts the grid with its body stubbed to 100 px per day column, so a press lands on a real slot. */
	function mountSized() {
		mountGrid();
		body().getBoundingClientRect = () => ({ left: 0, top: 0, width: 700, height: 1440, right: 700, bottom: 1440, x: 0, y: 0, toJSON: () => ({}) });
	}

	function pointer(el: HTMLElement, type: string, clientX = 0, clientY = 0) {
		el.dispatchEvent(new PointerEvent(type, { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 1, clientX, clientY }));
		flushSync();
	}

	/** `detail: 1` is a mouse click (or an assistive-tech activation with no press); `detail: 0` is a keyboard one. */
	function click(el: HTMLElement, detail: number) {
		el.dispatchEvent(new MouseEvent('click', { bubbles: true, detail }));
		flushSync();
	}

	/** Presses Standup (09:00-10:00 on Nov 10) and drags it a day right, past the threshold. */
	function dragStandup() {
		pointer(block('Standup'), 'pointerdown', 50, 586);
		pointer(body(), 'pointermove', 150, 696);
	}

	beforeEach(() => {
		seed([
			event({ path: P('Standup'), title: 'Standup', date: '2026-11-10', start: 540, end: 600 }),
			event({ path: P('Review'), title: 'Review', date: '2026-11-12', start: 540, end: 600 }),
		]);
	});

	it.each([
		['pointercancel', 0],
		['pointercancel', 1],
		['lostpointercapture', 0],
		['lostpointercapture', 1],
	] as const)('a gesture ended by %s arms nothing: a later detail-%i click with no press opens the popover', (type, detail) => {
		mountSized();
		dragStandup();
		pointer(body(), type, 150, 696);

		click(block('Standup'), detail);

		expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));
		expect(moveEvent).not.toHaveBeenCalled();
	});

	it('a pointercancel-discarded gesture does not arm the swallow on a later unrelated pointerup', () => {
		mountSized();
		dragStandup();
		pointer(body(), 'pointercancel', 150, 696);
		pointer(body(), 'pointerup', 150, 696);

		click(block('Standup'), 1);

		expect(eventCalendarViewStore.popover?.path).toBe(P('Standup'));
	});

	it('swallows the click a moved block\'s release produces', () => {
		vi.mocked(moveEvent).mockReturnValue(new Promise<void>(() => {}));
		mountSized();
		dragStandup();
		pointer(body(), 'pointerup', 150, 696);

		click(block('Standup'), 1);

		expect(moveEvent).toHaveBeenCalledTimes(1);
		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('swallows the click of the release after an Escape-discarded gesture', () => {
		mountSized();
		dragStandup();
		document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		flushSync();
		pointer(block('Standup'), 'pointerup', 150, 696);

		click(block('Standup'), 1);

		expect(eventCalendarViewStore.gestureLive).toBe(false);
		expect(eventCalendarViewStore.popover).toBeNull();
		expect(moveEvent).not.toHaveBeenCalled();
	});

	it('lets a keyboard click (detail 0) on a block act while the swallow is armed', () => {
		vi.mocked(moveEvent).mockReturnValue(new Promise<void>(() => {}));
		mountSized();
		dragStandup();
		pointer(body(), 'pointerup', 150, 696);

		click(block('Review'), 0);

		expect(eventCalendarViewStore.popover?.path).toBe(P('Review'));
	});

	it('a release whose click lands outside the body does not swallow a later click with no press', () => {
		vi.mocked(moveEvent).mockReturnValue(new Promise<void>(() => {}));
		mountSized();
		dragStandup();
		pointer(body(), 'pointerup', 150, 696);
		click(document.body, 1);

		click(block('Review'), 1);

		expect(eventCalendarViewStore.popover?.path).toBe(P('Review'));
	});

	it('a press anywhere after a moved drop disarms the swallow', () => {
		vi.mocked(moveEvent).mockReturnValue(new Promise<void>(() => {}));
		mountSized();
		dragStandup();
		pointer(body(), 'pointerup', 150, 696);
		document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse', pointerId: 2 }));

		click(block('Review'), 1);

		expect(eventCalendarViewStore.popover?.path).toBe(P('Review'));
	});
});

describe('EventTimeGrid: task lane', () => {
	it('shows the dated tasks of the visible days under the all-day lane', () => {
		eventCalendarStore.setTasks([datedTask('Rent', '2026-11-12', 3), datedTask('Later', '2026-12-01')]);
		mountGrid();

		const header = q('[data-time-grid-header]')!;
		const lanes = [...header.children].map((c) => (c.hasAttribute('data-all-day-lane') ? 'all-day' : c.hasAttribute('data-task-lane') ? 'tasks' : null)).filter(Boolean);
		expect(lanes).toEqual(['all-day', 'tasks']);
		expect(q('[data-task-lane-cell="2026-11-12"] [data-calendar-task]')?.textContent?.trim()).toBe('Rent');
		expect(qa('[data-calendar-task]')).toHaveLength(1);
	});

	it('has no task lane when the overlay setting is off or no visible day has a task', () => {
		eventCalendarStore.setTasks([datedTask('Later', '2026-12-01')]);
		mountGrid();
		expect(q('[data-task-lane]')).toBeNull();
		unmount(component!);
		component = null;

		settingsStore.updateEventCalendar({ showTasks: false });
		eventCalendarStore.setTasks([datedTask('Rent', '2026-11-12')]);
		mountGrid();
		expect(q('[data-task-lane]')).toBeNull();
	});

	it('shows only the focused day\'s tasks in day view', () => {
		eventCalendarStore.setTasks([datedTask('Rent', '2026-11-12'), datedTask('Gym', '2026-11-10')]);
		mountGrid(['2026-11-10']);

		expect(qa('[data-calendar-task]').map((c) => c.textContent?.trim())).toEqual(['Gym']);
	});
});
