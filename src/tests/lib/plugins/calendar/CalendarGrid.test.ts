// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { flushSync, mount, unmount } from 'svelte';
import { buildMonthGrid } from '#lib/plugins/calendar/calendar.logic.js';
import CalendarGrid from '#lib/plugins/calendar/CalendarGrid.svelte';

let target: HTMLElement;
let component: Record<string, unknown> | null = null;

const grid = buildMonthGrid(2026, 10); // November 2026, Monday start: Oct 26 .. Dec 6

function mountGrid(props: Record<string, unknown> = {}) {
	component = mount(CalendarGrid, {
		target,
		props: { grid, dayFileCounts: new Map(), selectedDateKey: null, onDayClick: vi.fn(), ...props },
	});
	flushSync();
}

const day = (key: string) => target.querySelector<HTMLButtonElement>(`[data-date="${key}"]`);

beforeEach(() => {
	target = document.createElement('div');
	document.body.appendChild(target);
});

afterEach(() => {
	if (component) unmount(component);
	component = null;
	target.remove();
});

describe('CalendarGrid', () => {
	it('tags every day button with its date key', () => {
		mountGrid();
		const keys = [...target.querySelectorAll<HTMLButtonElement>('button[data-date]')].map((b) => b.dataset.date);
		expect(keys).toEqual(grid.weeks.flat().map((d) => d.dateKey));
		expect(keys[0]).toBe('2026-10-26');
		expect(day('2026-11-10')?.textContent?.trim()).toBe('10');
	});

	it('leaves the week-number buttons without a date key', () => {
		mountGrid();
		const weekButtons = [...target.querySelectorAll('button[title^="Open weekly note"]')];
		expect(weekButtons).toHaveLength(grid.weeks.length);
		expect(weekButtons.every((b) => !b.hasAttribute('data-date'))).toBe(true);
	});

	it('calls onDayClick on click and onDayDblClick on double-click with the day key', () => {
		const onDayClick = vi.fn();
		const onDayDblClick = vi.fn();
		mountGrid({ onDayClick, onDayDblClick });
		day('2026-11-24')!.click();
		expect(onDayClick).toHaveBeenCalledWith('2026-11-24');
		day('2026-11-24')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		expect(onDayDblClick).toHaveBeenCalledOnce();
		expect(onDayDblClick).toHaveBeenCalledWith('2026-11-24');
	});

	it('ignores a double-click when no onDayDblClick is given', () => {
		const onDayClick = vi.fn();
		mountGrid({ onDayClick });
		expect(() => day('2026-11-24')!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))).not.toThrow();
		expect(onDayClick).not.toHaveBeenCalled();
	});
});
