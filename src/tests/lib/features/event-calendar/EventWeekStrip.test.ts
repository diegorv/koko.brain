// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearLocalStorage, setupLocalStorage } from '../../../fixtures/localStorage.fixture';

setupLocalStorage();

import { flushSync, mount, unmount } from 'svelte';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import EventWeekStrip from '$lib/features/event-calendar/EventWeekStrip.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

function mountStrip() {
	component = mount(EventWeekStrip, { target });
	flushSync();
}

const q = <T extends Element = HTMLElement>(selector: string) => target.querySelector<T>(selector);
const qa = <T extends Element = HTMLElement>(selector: string) => [...target.querySelectorAll<T>(selector)];
const days = () => qa<HTMLButtonElement>('[data-week-strip-day]');
const keys = () => days().map((d) => d.getAttribute('data-week-strip-day'));
const day = (key: string) => q<HTMLButtonElement>(`[data-week-strip-day="${key}"]`)!;

beforeEach(() => {
	clearLocalStorage();
	settingsStore.reset();
	settingsStore.updateEventCalendar({ weekStartsOn: 1 });
	eventCalendarViewStore.reset();
	eventCalendarViewStore.setView('day');
	eventCalendarViewStore.setDate('2026-11-10');
	eventCalendarViewStore.setNow(new Date(2026, 10, 12, 10, 0).getTime());
	target = document.body.appendChild(document.createElement('div'));
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	document.body.innerHTML = '';
});

describe('EventWeekStrip: days', () => {
	it('lists the seven days of the selected week, Monday-first, with weekday and day number', () => {
		mountStrip();

		expect(keys()).toEqual(['2026-11-09', '2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']);
		expect(days()[0].textContent?.replace(/\s+/g, ' ').trim()).toBe('MON 9');
		expect(days()[6].textContent?.replace(/\s+/g, ' ').trim()).toBe('SUN 15');
	});

	it('follows a Sunday-first week start', () => {
		settingsStore.updateEventCalendar({ weekStartsOn: 0 });
		mountStrip();

		expect(keys()[0]).toBe('2026-11-08');
		expect(keys()[6]).toBe('2026-11-14');
		expect(days()[0].textContent).toContain('SUN');
	});

	it('re-renders when the week start setting changes while mounted', () => {
		mountStrip();

		settingsStore.updateEventCalendar({ weekStartsOn: 0 });
		flushSync();
		expect(keys()[0]).toBe('2026-11-08');
	});

	it('keeps the weekend days when showWeekends is off', () => {
		settingsStore.updateEventCalendar({ showWeekends: false });
		mountStrip();

		expect(days()).toHaveLength(7);
	});

	it('marks today without pressing it', () => {
		mountStrip();

		expect(day('2026-11-12').getAttribute('data-today')).toBe('true');
		expect(day('2026-11-12').getAttribute('aria-pressed')).toBe('false');
		expect(day('2026-11-11').hasAttribute('data-today')).toBe(false);
	});
});

describe('EventWeekStrip: selection and ARIA', () => {
	it('is a labelled group of buttons that press the selected day', () => {
		mountStrip();

		const group = q('[data-week-strip]')!;
		expect(group.getAttribute('role')).toBe('group');
		expect(group.getAttribute('aria-label')).toBe('Days of the week');
		expect(days().every((d) => d.tagName === 'BUTTON' && d.type === 'button')).toBe(true);
		expect(days().map((d) => d.getAttribute('aria-pressed'))).toEqual(['false', 'true', 'false', 'false', 'false', 'false', 'false']);
		expect(day('2026-11-10').getAttribute('aria-label')).toBe('Tuesday, November 10, 2026, selected');
		expect(day('2026-11-11').getAttribute('aria-label')).toBe('Wednesday, November 11, 2026');
	});

	it('selects a clicked day and stays in day view', () => {
		mountStrip();

		day('2026-11-13').click();
		flushSync();

		expect(eventCalendarViewStore.focusedDate).toBe('2026-11-13');
		expect(eventCalendarViewStore.view).toBe('day');
		expect(day('2026-11-13').getAttribute('aria-pressed')).toBe('true');
		expect(day('2026-11-10').getAttribute('aria-pressed')).toBe('false');
	});

	it('closes an open popover on a click', () => {
		mountStrip();
		eventCalendarViewStore.openPopover('/vault/Events/A.md', { x: 0, y: 0, width: 10, height: 10 });

		day('2026-11-11').click();

		expect(eventCalendarViewStore.popover).toBeNull();
	});

	it('moves to the neighbour week when the selected day steps past the edge', () => {
		mountStrip();

		eventCalendarViewStore.setDate('2026-11-16');
		flushSync();

		expect(keys()[0]).toBe('2026-11-16');
		expect(day('2026-11-16').getAttribute('aria-pressed')).toBe('true');
	});

	it('keeps focus in the strip when a focused day steps past the week edge', () => {
		mountStrip();
		eventCalendarViewStore.setDate('2026-11-15');
		flushSync();
		day('2026-11-15').focus();

		eventCalendarViewStore.setDate('2026-11-16');
		flushSync();

		expect(document.activeElement).toBe(day('2026-11-16'));
	});

	it('moves focus to the pressed day when a focused day steps inside the week', () => {
		mountStrip();
		day('2026-11-10').focus();

		eventCalendarViewStore.setDate('2026-11-11');
		flushSync();

		expect(document.activeElement).toBe(day('2026-11-11'));
	});

	it('does not take focus when nothing in the strip had it', () => {
		mountStrip();
		const outside = document.body.appendChild(document.createElement('button'));
		outside.focus();

		eventCalendarViewStore.setDate('2026-11-16');
		flushSync();

		expect(document.activeElement).toBe(outside);
	});
});
