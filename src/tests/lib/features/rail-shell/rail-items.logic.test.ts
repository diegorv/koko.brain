import { describe, expect, it } from 'vitest';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import {
	arrangeRailGroups,
	moveRailItem,
	parseRailHidden,
	parseRailInboxBadge,
	parseRailOrder,
	parseRailWidth,
	RAIL_ACTION_COLOR,
	RAIL_PIN_COLOR,
	RAIL_WIDTH,
	railHeaderPad,
	railItemColor,
	railItems,
} from '#lib/features/rail-shell/rail-items.logic.js';
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

	it('drops the hidden items and orders each group by the saved order, leaving the pins alone', () => {
		const items = railItems([CALENDAR], [READING, PROJECT], ['archive', 'favorites', READING.key], ['files', 'types', PROJECT.key, READING.key]);
		expect(items.map((i) => i.key)).toEqual(['search', 'inbox', 'today', 'files', 'types', 'calendar', READING.key, PROJECT.key]);
		expect(items.find((i) => i.key === 'calendar')!.navigator).toBe(CALENDAR);
	});
});

describe('parseRailHidden / parseRailOrder', () => {
	it('reads a list of keys and drops what is not a string', () => {
		expect(parseRailHidden(['archive', 3, null, 'calendar'])).toEqual(['archive', 'calendar']);
		expect(parseRailOrder(['files', {}, 'types'])).toEqual(['files', 'types']);
	});

	it('reads a non-array as no keys', () => {
		for (const saved of [undefined, null, 'archive', 7, { archive: true }]) {
			expect(parseRailHidden(saved)).toEqual([]);
			expect(parseRailOrder(saved)).toEqual([]);
		}
	});
});

describe('parseRailInboxBadge', () => {
	it('is off only for the boolean false', () => {
		expect(parseRailInboxBadge(false)).toBe(false);
		for (const saved of [true, undefined, null, 'false', 0]) expect(parseRailInboxBadge(saved)).toBe(true);
	});
});

describe('arrangeRailGroups', () => {
	const TOP = ['search', 'inbox', 'today', 'favorites'];
	const NAVIGATORS = ['types', 'calendar', 'files'];
	const BOTTOM = ['archive'];

	it('returns the groups in default order when nothing is hidden or ordered', () => {
		expect(arrangeRailGroups([TOP, NAVIGATORS, BOTTOM], [], [])).toEqual([TOP, NAVIGATORS, BOTTOM]);
	});

	it('drops a hidden key, a whole group included', () => {
		expect(arrangeRailGroups([TOP, NAVIGATORS, BOTTOM], ['favorites', 'calendar', 'archive'], [])).toEqual([
			['search', 'inbox', 'today'],
			['types', 'files'],
			[],
		]);
	});

	it('keeps Search and Today when they are hidden', () => {
		expect(arrangeRailGroups([TOP], ['search', 'today'], [])).toEqual([TOP]);
	});

	it('keeps Search first in the top group whatever the order says', () => {
		expect(arrangeRailGroups([TOP], [], ['favorites', 'today', 'search'])).toEqual([['search', 'favorites', 'today', 'inbox']]);
	});

	it('puts the listed keys first in their order and the unlisted ones after, in default order', () => {
		expect(arrangeRailGroups([NAVIGATORS], [], ['files', 'types'])).toEqual([['files', 'types', 'calendar']]);
	});

	it('ignores unknown keys and keys of another group', () => {
		expect(arrangeRailGroups([TOP, NAVIGATORS], ['people'], ['people', 'files', 'inbox', 'favorites'])).toEqual([
			['search', 'inbox', 'favorites', 'today'],
			['files', 'types', 'calendar'],
		]);
		expect(arrangeRailGroups([NAVIGATORS], [], ['archive', 'inbox'])).toEqual([NAVIGATORS]);
	});
});

describe('moveRailItem', () => {
	const items = railItems([CALENDAR], [READING]);

	it('swaps an item with its neighbour in its group and returns the order of every listed item', () => {
		expect(moveRailItem(items, 'files', -1)).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'files', 'calendar', 'archive']);
		expect(moveRailItem(items, 'inbox', 1)).toEqual(['search', 'today', 'inbox', 'favorites', 'types', 'calendar', 'files', 'archive']);
	});

	it('does not move an item past the end of its group, above Search, or Search itself', () => {
		expect(moveRailItem(items, 'types', -1)).toBeNull();
		expect(moveRailItem(items, 'files', 1)).toBeNull();
		expect(moveRailItem(items, 'archive', 1)).toBeNull();
		expect(moveRailItem(items, 'inbox', -1)).toBeNull();
		expect(moveRailItem(items, 'search', 1)).toBeNull();
	});

	it('does not move a pin or an unknown key', () => {
		expect(moveRailItem(items, READING.key, -1)).toBeNull();
		expect(moveRailItem(items, 'people', 1)).toBeNull();
	});
});

describe('railItemColor', () => {
	it.each([
		['search', '#64748b'],
		['inbox', '#3b82f6'],
		['today', '#f97316'],
		['favorites', '#eab308'],
		['types', '#8b5cf6'],
		['calendar', '#f43f5e'],
		['files', '#14b8a6'],
		['archive', '#78716c'],
	])('gives %s its own color', (key, color) => {
		expect(railItemColor(key)).toBe(color);
	});

	it('gives any other key, such as another registered navigator, the fallback', () => {
		expect(railItemColor('some-navigator')).toBe('#0ea5e9');
		expect(railItemColor('toString')).toBe('#0ea5e9');
	});
});

describe('rail colors outside the palette', () => {
	it('falls back to sky for a pin and fuchsia for an action', () => {
		expect(RAIL_PIN_COLOR).toBe('#0ea5e9');
		expect(RAIL_ACTION_COLOR).toBe('#d946ef');
	});
});

describe('RAIL_WIDTH', () => {
	it('defaults to 192', () => {
		expect(RAIL_WIDTH.default).toBe(192);
	});

	it('drags between 140 and 320', () => {
		expect(RAIL_WIDTH.min).toBe(140);
		expect(RAIL_WIDTH.max).toBe(320);
	});
});

describe('parseRailWidth', () => {
	it.each([
		['in range', 260, 260],
		['the low bound', 140, 140],
		['the high bound', 320, 320],
		['below the range', 139, 140],
		['far below the range', -50, 140],
		['above the range', 321, 320],
		['a fraction, rounded', 200.6, 201],
		['a fraction below the range, clamped after rounding', 139.4, 140],
	])('reads %s', (_name, saved, width) => {
		expect(parseRailWidth(saved)).toBe(width);
	});

	it.each([
		['a string', 'wide'],
		['a numeric string', '200'],
		['NaN', Number.NaN],
		['Infinity', Number.POSITIVE_INFINITY],
		['-Infinity', Number.NEGATIVE_INFINITY],
		['null', null],
		['undefined', undefined],
		['an object', { width: 200 }],
	])('reads %s as the default', (_name, saved) => {
		expect(parseRailWidth(saved)).toBe(192);
	});
});

describe('railHeaderPad', () => {
	it.each([
		[48, 72],
		[84, 36],
		[108, 12],
		[140, 12],
		[192, 12],
	])('at %i px is %i px', (width, pad) => {
		expect(railHeaderPad(width)).toBe(pad);
	});
});
