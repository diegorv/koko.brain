import { describe, expect, it } from 'vitest';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import { railItems } from '#lib/features/rail-shell/rail-items.logic.js';
import type { RailNavigator, RailPin } from '#lib/features/rail-shell/rail-shell.types.js';

const CALENDAR: RailNavigator = {
	id: 'calendar',
	label: 'Calendar',
	icon: CalendarDays,
	component: CalendarDays,
	lens: () => ({ kind: 'day' }),
};

const READING: RailPin = { key: 'view:/vault/Reading.view', label: 'To read', path: '/vault/Reading.view', kind: 'view', opensInEditor: false };
const PROJECT: RailPin = { key: 'type:Project', label: 'Projects', path: '/vault/Project.md', kind: 'type', opensInEditor: false };

const summary = (items: ReturnType<typeof railItems>) => items.map((i) => [i.key, i.label, i.group]);

describe('railItems', () => {
	it('lists the built-in items in rail order, grouped, with no navigator and no pin', () => {
		expect(summary(railItems([], []))).toEqual([
			['search', 'Search', 'top'],
			['inbox', 'Inbox', 'top'],
			['today', 'Today', 'top'],
			['favorites', 'Favorites', 'top'],
			['types', 'Types', 'navigator'],
			['files', 'Files', 'navigator'],
			['archive', 'Archive', 'bottom'],
		]);
	});

	it('puts registered navigators between Types and Files, carrying the navigator', () => {
		const items = railItems([CALENDAR], []);
		expect(items.map((i) => i.key)).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'calendar', 'files', 'archive']);
		const calendar = items.find((i) => i.key === 'calendar')!;
		expect(calendar).toMatchObject({ label: 'Calendar', group: 'navigator', navigator: CALENDAR });
		expect(calendar.pin).toBeUndefined();
	});

	it('puts the pins, in their order, after the navigators and before Archive, carrying the pin', () => {
		const items = railItems([CALENDAR], [READING, PROJECT]);
		expect(summary(items).slice(-3)).toEqual([
			['view:/vault/Reading.view', 'To read', 'pinned'],
			['type:Project', 'Projects', 'pinned'],
			['archive', 'Archive', 'bottom'],
		]);
		expect(items.find((i) => i.key === 'type:Project')!.pin).toBe(PROJECT);
	});

	it('has no Neighbourhood item, which has no rail button', () => {
		expect(railItems([CALENDAR], [READING]).map((i) => i.key)).not.toContain('neighbourhood');
	});
});
