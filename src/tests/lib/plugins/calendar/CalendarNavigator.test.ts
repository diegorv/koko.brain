// @vitest-environment jsdom
// The rail shell's Calendar navigator over the real stores: the mini month, its
// dots by note date, the picked day saved in layout settings, the periodic notes
// for the shown period and the Open Calendar tab button.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

vi.mock('#lib/core/note-creator/note-creator.service.js', () => ({ openOrCreateNote: vi.fn() }));
vi.mock('#lib/core/editor/editor.service.js', () => ({ openFileInEditor: vi.fn() }));
vi.mock('svelte-sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { flushSync, mount, unmount } from 'svelte';
import { toast } from 'svelte-sonner';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { openOrCreateNote } from '#lib/core/note-creator/note-creator.service.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { vaultStore } from '#lib/core/vault/vault.store.svelte.js';
import { fsStore } from '#lib/core/filesystem/fs.store.svelte.js';
import { typeDefinitionsStore } from '#lib/features/type-definitions/type-definitions.store.svelte.js';
import { resetEventCalendar } from '#lib/features/event-calendar/event-calendar.service.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import { calendarStore } from '#lib/plugins/calendar/calendar.store.svelte.js';
import { pickedDayLens } from '#lib/plugins/calendar/day-lens.logic.js';
import CalendarNavigator from '#lib/plugins/calendar/CalendarNavigator.svelte';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function mountNavigator() {
	component = mount(CalendarNavigator, { target });
	flushSync();
}

const q = <T extends Element = HTMLElement>(selector: string) => target.querySelector<T>(selector);
const cell = (key: string) => q<HTMLButtonElement>(`button[data-date="${key}"]`)!;
const dots = (key: string) => cell(key).querySelectorAll('span > span').length;
const headerLabels = () => [...target.querySelectorAll('[data-day-header]')].map((h) => h.textContent?.trim());
const firstDayKey = () => q<HTMLButtonElement>('button[data-date]')!.dataset.date;
const monthLabel = () => q<HTMLButtonElement>('[data-calendar-month-label]')!;
const todayCellKeys = () =>
	[...target.querySelectorAll<HTMLButtonElement>('button[data-date]')]
		.filter((b) => b.classList.contains('ring-1'))
		.map((b) => b.dataset.date);
const selectedKeys = () =>
	[...target.querySelectorAll<HTMLButtonElement>('button[data-date]')]
		.filter((b) => b.classList.contains('bg-file-explorer-primary'))
		.map((b) => b.dataset.date);

/** Steps the shown month to `year`/`month` (0-11); the store has no direct month setter. */
function showMonth(year: number, month: number) {
	const wanted = year * 12 + month;
	while (calendarStore.currentYear * 12 + calendarStore.currentMonth < wanted) calendarStore.nextMonth();
	while (calendarStore.currentYear * 12 + calendarStore.currentMonth > wanted) calendarStore.prevMonth();
}

beforeEach(() => {
	clearLocalStorage();
	settingsStore.reset();
	resetEventCalendar();
	calendarStore.reset();
	typeDefinitionsStore.reset();
	vaultStore._reset();
	vaultStore.open('/vault');
	editorStore.reset();
	fsStore.reset();
	vi.mocked(openOrCreateNote).mockReset();
	vi.mocked(toast.error).mockReset();
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	target.remove();
	vi.useRealTimers();
});

describe('CalendarNavigator header', () => {
	it('clears the traffic lights with the header pad', () => {
		mountNavigator();
		expect(target.querySelector('[data-calendar-navigator]')!.firstElementChild!.classList).toContain('pl-[var(--rail-header-pad)]');
	});
});

describe('CalendarNavigator mini month', () => {
	beforeEach(() => showMonth(2026, 10));

	it('shows the month label and steps by month and year', () => {
		mountNavigator();
		expect(monthLabel().textContent?.trim()).toBe('November 2026');
		q<HTMLButtonElement>('button[aria-label="Next month"]')!.click();
		flushSync();
		expect(monthLabel().textContent?.trim()).toBe('December 2026');
		q<HTMLButtonElement>('button[aria-label="Previous year"]')!.click();
		flushSync();
		expect(monthLabel().textContent?.trim()).toBe('December 2025');
		q<HTMLButtonElement>('button[aria-label="Next year"]')!.click();
		q<HTMLButtonElement>('button[aria-label="Previous month"]')!.click();
		flushSync();
		expect(monthLabel().textContent?.trim()).toBe('November 2026');
	});

	it('starts the grid on Monday by default and follows weekStartsOn live', () => {
		mountNavigator();
		expect(headerLabels()[0]).toBe('MON');
		expect(firstDayKey()).toBe('2026-10-26');

		settingsStore.updateEventCalendar({ weekStartsOn: 0 });
		flushSync();
		expect(headerLabels()).toEqual(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
		expect(firstDayKey()).toBe('2026-11-01');
	});

	it('puts dots on the days that have notes, counted by note date', () => {
		typeDefinitionsStore.setEntries([
			entryV2('/vault/a.md', { frontmatter: { date: '2026-11-05' } }),
			entryV2('/vault/b.md', { frontmatter: { date: '2026-11-05' } }),
			// `date` wins over `created`: this note is on the 6th, not the 5th.
			entryV2('/vault/c.md', { frontmatter: { date: '2026-11-06', created: '2026-11-05' } }),
			entryV2('/vault/_system/templates/t.md', { frontmatter: { date: '2026-11-07' } }),
		]);
		mountNavigator();
		expect(dots('2026-11-05')).toBe(2);
		expect(dots('2026-11-06')).toBe(1);
		expect(dots('2026-11-07')).toBe(0);
		expect(dots('2026-11-08')).toBe(0);

		typeDefinitionsStore.setEntries([entryV2('/vault/a.md', { frontmatter: { date: '2026-11-08' } })]);
		flushSync();
		expect(dots('2026-11-05')).toBe(0);
		expect(dots('2026-11-08')).toBe(1);
	});

	it('does not recount the dots when the file tree is replaced, and still follows a new dated note', () => {
		typeDefinitionsStore.setEntries([entryV2('/vault/a.md', { frontmatter: { date: '2026-11-05' } })]);
		const entriesRead = vi.spyOn(typeDefinitionsStore, 'entries', 'get');
		mountNavigator();
		expect(dots('2026-11-05')).toBe(1);
		entriesRead.mockClear();

		fsStore.setFileTree([{ name: 'a.md', path: '/vault/a.md', isDirectory: false }]);
		flushSync();
		expect(entriesRead).not.toHaveBeenCalled();

		typeDefinitionsStore.setEntries([
			entryV2('/vault/a.md', { frontmatter: { date: '2026-11-05' } }),
			entryV2('/vault/b.md', { frontmatter: { date: '2026-11-09' } }),
		]);
		flushSync();
		expect(dots('2026-11-09')).toBe(1);
		entriesRead.mockRestore();
	});

	it('shows no dots for an empty vault', () => {
		mountNavigator();
		expect(target.querySelectorAll('button[data-date] span').length).toBe(0);
	});

	it('uses the region theme tokens, never hard-coded colors', () => {
		mountNavigator();
		const nav = q('[data-calendar-navigator]')!;
		expect(nav.className).toContain('bg-nav-bg');
		expect(nav.outerHTML).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(/i);
	});
});

describe('CalendarNavigator picked day', () => {
	beforeEach(() => showMonth(2026, 9));

	it('picking a day saves it, and the lens follows', () => {
		mountNavigator();
		cell('2026-10-27').click();
		flushSync();
		expect(settingsStore.layout.railDay).toBe('2026-10-27');
		expect(pickedDayLens(settingsStore.layout.railDay, '2026-11-01')).toEqual({ kind: 'day', target: '2026-10-27' });
		expect(selectedKeys()).toEqual(['2026-10-27']);
	});

	it('opens on the saved day\'s month and highlights it after a restart', () => {
		vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
		vi.setSystemTime(new Date(2026, 10, 1, 10));
		resetEventCalendar();
		calendarStore.reset();
		settingsStore.updateLayout({ railDay: '2026-09-10' });
		mountNavigator();
		expect(monthLabel().textContent?.trim()).toBe('September 2026');
		expect(selectedKeys()).toEqual(['2026-09-10']);
	});

	it('highlights today when no day was picked', () => {
		vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
		vi.setSystemTime(new Date(2026, 9, 14, 10));
		resetEventCalendar();
		mountNavigator();
		expect(selectedKeys()).toEqual(['2026-10-14']);
	});

	it('the month label goes to today and clears the saved day, so the pick follows the clock', () => {
		vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
		vi.setSystemTime(new Date(2026, 11, 3, 23, 59, 50));
		resetEventCalendar();
		settingsStore.updateLayout({ railDay: '2026-10-20' });
		mountNavigator();
		monthLabel().click();
		flushSync();
		expect(monthLabel().textContent?.trim()).toBe('December 2026');
		expect(settingsStore.layout.railDay).toBeNull();
		expect(selectedKeys()).toEqual(['2026-12-03']);

		vi.advanceTimersByTime(30_000);
		flushSync();
		expect(selectedKeys()).toEqual(['2026-12-04']);
		// Unmount while the fake clock is live, so the clock release clears a fake timer id.
		unmount(component!);
		component = null;
	});

	it('a week number opens its weekly note', () => {
		mountNavigator();
		q<HTMLButtonElement>('button[title^="Open weekly note"]')!.click();
		expect(openOrCreateNote).toHaveBeenCalledTimes(1);
	});
});

describe('CalendarNavigator today', () => {
	it('moves the today cell when the clock passes midnight, without changing month', () => {
		vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
		vi.setSystemTime(new Date(2026, 10, 10, 23, 59, 50));
		calendarStore.reset();
		mountNavigator();
		expect(todayCellKeys()).toEqual(['2026-11-10']);

		vi.advanceTimersByTime(30_000);
		flushSync();
		expect(todayCellKeys()).toEqual(['2026-11-11']);
		expect(calendarStore.currentMonth).toBe(10);
		// With no saved day, the picked day is today and moves with it.
		expect(selectedKeys()).toEqual(['2026-11-11']);
		// Unmount while the fake clock is live, so the clock release clears a fake timer id.
		unmount(component!);
		component = null;
	});
});

const periodicButtons = () => [...target.querySelectorAll<HTMLButtonElement>('button[data-periodic-note]')];
const periodicLabels = () => periodicButtons().map((b) => b.textContent?.trim());
const periodicButton = (period: string) => q<HTMLButtonElement>(`button[data-periodic-note="${period}"]`)!;
const openCalendarTabButton = () => q<HTMLButtonElement>('button[data-open-calendar-tab]')!;
const calendarTabs = () => editorStore.tabs.filter((t) => t.path === EVENT_CALENDAR_VIRTUAL_PATH);
/** Lets the click handler's promise chain settle. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('CalendarNavigator periodic notes', () => {
	beforeEach(() => {
		showMonth(2026, 9);
		settingsStore.updateLayout({ railDay: '2026-10-28' });
	});

	it('names the picked day\'s week and the shown month, quarter and year', () => {
		mountNavigator();
		expect(periodicLabels()).toEqual(['Week 44', 'October 2026', 'Q4 2026', '2026']);
	});

	it('the month, quarter and year follow the shown month; the week follows the picked day', () => {
		mountNavigator();
		q<HTMLButtonElement>('button[aria-label="Next month"]')!.click();
		q<HTMLButtonElement>('button[aria-label="Next month"]')!.click();
		q<HTMLButtonElement>('button[aria-label="Next month"]')!.click();
		flushSync();
		expect(periodicLabels()).toEqual(['Week 44', 'January 2027', 'Q1 2027', '2027']);

		cell('2027-01-05').click();
		flushSync();
		expect(periodicLabels()).toEqual(['Week 1', 'January 2027', 'Q1 2027', '2027']);
	});

	it('the week follows today when no day was picked', () => {
		vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
		vi.setSystemTime(new Date(2026, 9, 14, 10));
		resetEventCalendar();
		settingsStore.updateLayout({ railDay: null });
		mountNavigator();
		expect(periodicLabels()[0]).toBe('Week 42');
		unmount(component!);
		component = null;
	});

	it('the yearly entry opens or creates the note in the yearly format from its template', async () => {
		settingsStore.updatePeriodicNotes({ folder: 'Journal', yearly: { format: '[Year-]YYYY', templatePath: 'tpl/Year.md' } });
		mountNavigator();
		periodicButton('yearly').click();
		await settle();
		expect(openOrCreateNote).toHaveBeenCalledTimes(1);
		expect(vi.mocked(openOrCreateNote).mock.calls[0][0]).toMatchObject({
			filePath: '/vault/Journal/Year-2026.md',
			templatePath: '/vault/tpl/Year.md',
			title: 'Year-2026',
		});
		expect(toast.error).not.toHaveBeenCalled();
	});

	it('each entry opens the note of its own period', async () => {
		settingsStore.updatePeriodicNotes({
			folder: 'J',
			weekly: { format: 'GGGG-[W]WW' },
			monthly: { format: 'YYYY-MM' },
			quarterly: { format: 'YYYY-[Q]Q' },
		});
		mountNavigator();
		for (const period of ['weekly', 'monthly', 'quarterly']) periodicButton(period).click();
		await settle();
		expect(vi.mocked(openOrCreateNote).mock.calls.map(([options]) => options.filePath)).toEqual([
			'/vault/J/2026-W44.md',
			'/vault/J/2026-10.md',
			'/vault/J/2026-Q4.md',
		]);
	});

	it('toasts when the note cannot be opened', async () => {
		vi.mocked(openOrCreateNote).mockRejectedValueOnce(new Error('disk full'));
		mountNavigator();
		periodicButton('quarterly').click();
		await settle();
		expect(toast.error).toHaveBeenCalledWith('Could not open the Q4 2026 note');
	});

	it('uses the region theme tokens, never hard-coded colors', () => {
		mountNavigator();
		const section = q('[data-calendar-periodic-notes]')!;
		expect(section.outerHTML).toContain('text-file-explorer-');
		expect(section.outerHTML).not.toMatch(/#[0-9a-f]{3,6}\b|rgb\(|(?:bg|text|border)-(?:white|black|gray|slate|zinc|neutral|stone)/i);
	});
});

describe('CalendarNavigator Open Calendar tab', () => {
	it('opens the Calendar tab on the picked day', () => {
		showMonth(2026, 9);
		settingsStore.updateLayout({ railDay: '2026-10-28' });
		eventCalendarViewStore.setDate('2000-01-01');
		mountNavigator();
		openCalendarTabButton().click();
		flushSync();
		expect(calendarTabs()).toHaveLength(1);
		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.focusedDate).toBe('2026-10-28');
		expect(openCalendarTabButton().textContent?.trim()).toBe('Open Calendar tab');
	});

	it('opens on today when no day was picked, and reuses an open Calendar tab', () => {
		vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
		vi.setSystemTime(new Date(2026, 9, 14, 10));
		resetEventCalendar();
		eventCalendarViewStore.setDate('2000-01-01');
		mountNavigator();
		openCalendarTabButton().click();
		openCalendarTabButton().click();
		flushSync();
		expect(calendarTabs()).toHaveLength(1);
		expect(eventCalendarViewStore.focusedDate).toBe('2026-10-14');
		unmount(component!);
		component = null;
	});
});
