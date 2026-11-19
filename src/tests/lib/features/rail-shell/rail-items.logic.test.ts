import { describe, expect, it } from 'vitest';
import CalendarDays from '@lucide/svelte/icons/calendar-days';
import {
	arrangeRailGroups,
	moveRailItem,
	parseRailCollapsed,
	parseRailHidden,
	parseRailInboxBadge,
	parseRailOrder,
	parseRailStyle,
	parseRailWidth,
	RAIL_ACTION_COLOR,
	RAIL_PIN_COLOR,
	RAIL_STYLES,
	RAIL_WIDTH,
	railActionColor,
	railBadgeTextColor,
	railFormWidth,
	railHeaderPad,
	railItemColor,
	railItems,
} from '#lib/features/rail-shell/rail-items.logic.js';
import { GRAPH_VIRTUAL_PATH, TAGS_VIRTUAL_PATH, TASKS_VIRTUAL_PATH } from '#lib/core/editor/editor.logic.js';
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
			['tab:tasks', 'Tasks', 'tabs'],
			['tab:graph', 'Graph', 'tabs'],
			['tab:tags', 'Tags', 'tabs'],
			['archive', 'Archive', 'bottom'],
		]);
	});

	it('puts registered navigators between Types and Files, carrying the navigator', () => {
		const items = railItems([CALENDAR], []);
		expect(items.map((i) => i.key)).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'calendar', 'files', 'tab:tasks', 'tab:graph', 'tab:tags', 'archive']);
		const calendar = items.find((i) => i.key === 'calendar')!;
		expect(calendar).toMatchObject({ label: 'Calendar', group: 'navigator', navigator: CALENDAR });
		expect(calendar.pin).toBeUndefined();
	});

	it('puts the pins, in their order, after the tabs and before Archive, carrying the pin', () => {
		const items = railItems([CALENDAR], [READING, PROJECT]);
		expect(summary(items).slice(-4)).toEqual([
			['tab:tags', 'Tags', 'tabs'],
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
		expect(items.map((i) => i.key)).toEqual(['search', 'inbox', 'today', 'files', 'types', 'calendar', 'tab:tasks', 'tab:graph', 'tab:tags', READING.key, PROJECT.key]);
		expect(items.find((i) => i.key === 'calendar')!.navigator).toBe(CALENDAR);
	});

	it('puts Tasks, Graph and Tags in their own group after the navigators, each carrying the tab it opens', () => {
		const items = railItems([CALENDAR], [READING]);
		expect(items.filter((i) => i.group === 'tabs').map((i) => [i.key, i.label, i.tabPath])).toEqual([
			['tab:tasks', 'Tasks', TASKS_VIRTUAL_PATH],
			['tab:graph', 'Graph', GRAPH_VIRTUAL_PATH],
			['tab:tags', 'Tags', TAGS_VIRTUAL_PATH],
		]);
		const keys = items.map((i) => i.key);
		expect(keys.indexOf('tab:tasks')).toBe(keys.indexOf('files') + 1);
		expect(keys.indexOf(READING.key)).toBe(keys.indexOf('tab:tags') + 1);
		expect(items.filter((i) => i.group !== 'tabs').every((i) => i.tabPath === undefined)).toBe(true);
	});

	it('uses keys no navigator, pin or other built-in item has', () => {
		for (const key of ['tab:tasks', 'tab:graph', 'tab:tags']) {
			expect(key.startsWith('view:') || key.startsWith('type:')).toBe(false);
			expect(railItems([CALENDAR], []).filter((i) => i.key === key)).toHaveLength(1);
		}
	});

	it('hides a tab item listed in railHidden and orders the tabs by railOrder, within their group', () => {
		const items = railItems([CALENDAR], [], ['tab:graph'], ['tab:tags', 'archive', 'tab:tasks']);
		expect(items.filter((i) => i.group === 'tabs').map((i) => i.key)).toEqual(['tab:tags', 'tab:tasks']);
		expect(items.map((i) => i.key).slice(-3)).toEqual(['tab:tags', 'tab:tasks', 'archive']);
	});

	it('lists the tab items when a saved railHidden predates them', () => {
		const items = railItems([CALENDAR], [], ['archive', 'calendar']);
		expect(items.filter((i) => i.group === 'tabs').map((i) => i.key)).toEqual(['tab:tasks', 'tab:graph', 'tab:tags']);
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
		expect(moveRailItem(items, 'files', -1)).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'files', 'calendar', 'tab:tasks', 'tab:graph', 'tab:tags', 'archive']);
		expect(moveRailItem(items, 'inbox', 1)).toEqual(['search', 'today', 'inbox', 'favorites', 'types', 'calendar', 'files', 'tab:tasks', 'tab:graph', 'tab:tags', 'archive']);
	});

	it('moves a tab item within the tabs group and never out of it', () => {
		expect(moveRailItem(items, 'tab:graph', -1)).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'calendar', 'files', 'tab:graph', 'tab:tasks', 'tab:tags', 'archive']);
		expect(moveRailItem(items, 'tab:graph', 1)).toEqual(['search', 'inbox', 'today', 'favorites', 'types', 'calendar', 'files', 'tab:tasks', 'tab:tags', 'tab:graph', 'archive']);
		expect(moveRailItem(items, 'tab:tasks', -1)).toBeNull();
		expect(moveRailItem(items, 'tab:tags', 1)).toBeNull();
		expect(moveRailItem(items, 'files', 1)).toBeNull();
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
		['tab:tasks', '#22c55e'],
		['tab:graph', '#6366f1'],
		['tab:tags', '#ec4899'],
	])('gives %s its own color', (key, color) => {
		expect(railItemColor(key)).toBe(color);
	});

	it('gives any other key, such as another registered navigator, the fallback', () => {
		expect(railItemColor('some-navigator')).toBe('#0ea5e9');
		expect(railItemColor('toString')).toBe('#0ea5e9');
	});
});

describe('railBadgeTextColor', () => {
	it('gives black text on the Inbox blue, where black contrasts more than white', () => {
		expect(railBadgeTextColor('#3b82f6')).toBe('#000000');
		expect(railBadgeTextColor(railItemColor('inbox'))).toBe('#000000');
	});

	it('gives white text on a dark navy', () => {
		expect(railBadgeTextColor('#1e293b')).toBe('#ffffff');
	});

	it('gives the theme primary foreground for a color it cannot parse', () => {
		expect(railBadgeTextColor('var(--primary)')).toBe('var(--primary-foreground)');
		expect(railBadgeTextColor('')).toBe('var(--primary-foreground)');
	});
});

describe('rail colors outside the palette', () => {
	it('falls back to sky for a pin and fuchsia for an action', () => {
		expect(RAIL_PIN_COLOR).toBe('#0ea5e9');
		expect(RAIL_ACTION_COLOR).toBe('#d946ef');
	});
});

describe('railActionColor', () => {
	const COLOR = { light: '#7c3aed', dark: '#c4b5fd' };

	it('gives the declared value for the theme', () => {
		expect(railActionColor(COLOR, false)).toBe('#7c3aed');
		expect(railActionColor(COLOR, true)).toBe('#c4b5fd');
	});

	it('gives the default color without a declared one, on either theme', () => {
		expect(railActionColor(undefined, false)).toBe('#d946ef');
		expect(railActionColor(undefined, true)).toBe('#d946ef');
	});
});

describe('RAIL_WIDTH', () => {
	it('defaults to its minimum, 140', () => {
		expect(RAIL_WIDTH.default).toBe(140);
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
		expect(parseRailWidth(saved)).toBe(140);
	});
});

describe('RAIL_STYLES', () => {
	it('offers labeled and captioned, each with a name and a description', () => {
		expect(RAIL_STYLES).toEqual([
			{ key: 'labeled', name: 'Labeled', description: 'Titles, sections and counts; drag the edge to resize' },
			{ key: 'captioned', name: 'Captioned', description: 'A caption under each icon' },
		]);
	});
});

describe('parseRailStyle', () => {
	it.each([
		['labeled', 'labeled'],
		['captioned', 'captioned'],
		["the prototype's A", 'A'],
		["the prototype's B", 'B'],
		['a number', 1],
		['null', null],
		['undefined', undefined],
	])('reads %s', (name, saved) => {
		expect(parseRailStyle(saved)).toBe(name === 'captioned' ? 'captioned' : 'labeled');
	});
});

describe('parseRailCollapsed', () => {
	it.each([
		['true', true, true],
		['false', false, false],
		['the string "true"', 'true', false],
		['1', 1, false],
		['null', null, false],
		['undefined', undefined, false],
	])('reads %s', (_name, saved, collapsed) => {
		expect(parseRailCollapsed(saved)).toBe(collapsed);
	});
});

describe('railFormWidth', () => {
	it('is the saved width when labeled', () => {
		expect(railFormWidth('labeled', false, 260)).toBe(260);
	});

	it('is 84 when captioned, ignoring a saved width', () => {
		expect(railFormWidth('captioned', false, 300)).toBe(84);
	});

	it.each(['labeled', 'captioned'] as const)('is 48 when collapsed from %s', (style) => {
		expect(railFormWidth(style, true, 300)).toBe(48);
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
