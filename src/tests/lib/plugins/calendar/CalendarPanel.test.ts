// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

// Opening and creating notes are side effects; the stores stay real (CLAUDE.md rule 1).
vi.mock('#lib/core/editor/editor.service.js', () => ({
	openFileInEditor: vi.fn(),
}));

vi.mock('#lib/core/note-creator/note-creator.service.js', () => ({
	openOrCreateNote: vi.fn(),
}));

import { flushSync, mount, unmount } from 'svelte';
import { editorStore } from '#lib/core/editor/editor.store.svelte.js';
import { EVENT_CALENDAR_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { resetEventCalendar } from '#lib/features/event-calendar/event-calendar.service.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import { toDateKey } from '#lib/plugins/calendar/calendar.logic.js';
import { calendarStore } from '#lib/plugins/calendar/calendar.store.svelte.js';
import CalendarPanel from '#lib/plugins/calendar/CalendarPanel.svelte';

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function mountPanel() {
	component = mount(CalendarPanel, { target });
	flushSync();
}

const q = <T extends Element = HTMLElement>(selector: string) => target.querySelector<T>(selector);
const openButton = () => q<HTMLButtonElement>('button[aria-label="Open Calendar"]')!;
const calendarTabs = () => editorStore.tabs.filter((t) => t.path === EVENT_CALENDAR_VIRTUAL_PATH);

beforeEach(() => {
	clearLocalStorage();
	settingsStore.reset();
	editorStore.reset();
	resetEventCalendar();
	calendarStore.reset();
	eventCalendarViewStore.setDate('2000-01-01');
	target = document.createElement('div');
	document.body.appendChild(target);
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	target.remove();
});

describe('CalendarPanel bridge to the Calendar tab', () => {
	it('renders the Open Calendar button with the calendar-range icon, not the plain calendar icon', () => {
		mountPanel();
		const svg = openButton().querySelector('svg')!;
		expect(svg.classList.contains('lucide-calendar-range')).toBe(true);
		expect(svg.classList.contains('lucide-calendar')).toBe(false);
	});

	it('gives the Daily Note button a notebook icon, so it does not read as a second Open Calendar', () => {
		mountPanel();
		const icons = [...target.querySelectorAll('button svg')].map((svg) => svg.getAttribute('class') ?? '');
		expect(icons.some((c) => c.includes('lucide-notebook-pen'))).toBe(true);
		expect(icons.some((c) => c.includes('lucide-calendar-days'))).toBe(false);
	});

	it('opens the Calendar tab at the selected date', () => {
		calendarStore.setSelectedDateKey('2026-11-24');
		mountPanel();
		openButton().click();
		flushSync();
		expect(calendarTabs()).toHaveLength(1);
		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-24');
	});

	it('falls back to today when no date is selected', () => {
		calendarStore.setSelectedDateKey(null);
		mountPanel();
		openButton().click();
		flushSync();
		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.focusedDate).toBe(toDateKey(new Date()));
	});

	it('leaves the selected date and the view untouched', () => {
		calendarStore.setSelectedDateKey('2026-11-24');
		eventCalendarViewStore.setView('month');
		mountPanel();
		openButton().click();
		flushSync();
		expect(calendarStore.selectedDateKey).toBe('2026-11-24');
		expect(eventCalendarViewStore.view).toBe('month');
	});

	it('opens the Calendar tab in day view on a double-clicked day', () => {
		mountPanel();
		const todayKey = toDateKey(new Date());
		q(`[data-date="${todayKey}"]`)!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		flushSync();
		expect(editorStore.activeTab?.path).toBe(EVENT_CALENDAR_VIRTUAL_PATH);
		expect(eventCalendarViewStore.view).toBe('day');
		expect(eventCalendarViewStore.focusedDate).toBe(todayKey);
	});

	it('still selects a day on a single click without opening the tab', () => {
		mountPanel();
		const day = target.querySelector<HTMLButtonElement>('button[data-date]')!;
		day.click();
		flushSync();
		expect(calendarStore.selectedDateKey).toBe(day.dataset.date);
		expect(calendarTabs()).toHaveLength(0);
	});
});

describe('CalendarPanel week start', () => {
	const headerLabels = () => [...target.querySelectorAll('[data-day-header]')].map((h) => h.textContent?.trim());
	const firstDayKey = () => target.querySelector<HTMLButtonElement>('button[data-date]')!.dataset.date;

	beforeEach(() => {
		// Step to November 2026 (Nov 1 is a Sunday); the store has no direct month setter
		const wanted = 2026 * 12 + 10;
		while (calendarStore.currentYear * 12 + calendarStore.currentMonth < wanted) calendarStore.nextMonth();
		while (calendarStore.currentYear * 12 + calendarStore.currentMonth > wanted) calendarStore.prevMonth();
	});

	it('starts the grid on Monday by default', () => {
		mountPanel();
		expect(headerLabels()[0]).toBe('MON');
		expect(firstDayKey()).toBe('2026-10-26');
	});

	it('starts the grid on Sunday when weekStartsOn is Sunday', () => {
		settingsStore.updateEventCalendar({ weekStartsOn: 0 });
		mountPanel();
		expect(headerLabels()).toEqual(['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']);
		expect(firstDayKey()).toBe('2026-11-01');
	});

	it('rebuilds the open grid when the setting changes', () => {
		mountPanel();
		settingsStore.updateEventCalendar({ weekStartsOn: 0 });
		flushSync();
		expect(headerLabels()[0]).toBe('SUN');
		expect(firstDayKey()).toBe('2026-11-01');
		settingsStore.updateEventCalendar({ weekStartsOn: 1 });
		flushSync();
		expect(headerLabels()[0]).toBe('MON');
		expect(firstDayKey()).toBe('2026-10-26');
	});
});
