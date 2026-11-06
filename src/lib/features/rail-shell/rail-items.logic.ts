import { FILES_RAIL_ITEM, SEARCH_RAIL_ITEM, TODAY_RAIL_ITEM, TYPES_RAIL_ITEM } from './lens.logic';
import type { RailNavigator, RailPin } from './rail-shell.types';

/** Where a rail item sits: above the divider, among the navigators, among the pins, or at the bottom. */
export type RailItemGroup = 'top' | 'navigator' | 'pinned' | 'bottom';

/** A rail button: what it saves as `layout.railItem` and what it is called. */
export interface RailItem {
	/** The rail item key saved in `layout.railItem` */
	key: string;
	/** Tooltip and accessible name; the palette's "Go to <label>" */
	label: string;
	/** The part of the rail the item sits in */
	group: RailItemGroup;
	/** The navigator a plugin registered, for its items; it brings the icon */
	navigator?: RailNavigator;
	/** The pin, for a pinned item; it brings the icon and the `_open_in_editor` rule */
	pin?: RailPin;
}

/**
 * Every rail button in rail order: Search, Inbox, Today, Favorites; Types, the
 * registered navigators (Calendar), Files; the pins; Archive. The Neighbourhood
 * lens has no button, so no item. The rail and the palette's Go to commands
 * both build from this list, so a hidden item has neither a button nor a
 * command. `hidden` and `order` are the parsed `layout.railHidden` /
 * `layout.railOrder`, applied by `arrangeRailGroups` to every group but the
 * pins, which go by their own `_order`.
 */
export function railItems(
	navigators: readonly RailNavigator[],
	pins: readonly RailPin[],
	hidden: readonly string[] = [],
	order: readonly string[] = [],
): RailItem[] {
	const top: RailItem[] = [
		{ key: SEARCH_RAIL_ITEM, label: 'Search', group: 'top' },
		{ key: 'inbox', label: 'Inbox', group: 'top' },
		{ key: TODAY_RAIL_ITEM, label: 'Today', group: 'top' },
		{ key: 'favorites', label: 'Favorites', group: 'top' },
	];
	const navigatorItems: RailItem[] = [
		{ key: TYPES_RAIL_ITEM, label: 'Types', group: 'navigator' },
		...navigators.map((navigator): RailItem => ({ key: navigator.id, label: navigator.label, group: 'navigator', navigator })),
		{ key: FILES_RAIL_ITEM, label: 'Files', group: 'navigator' },
	];
	const bottom: RailItem[] = [{ key: 'archive', label: 'Archive', group: 'bottom' }];
	const groups = [top, navigatorItems, bottom];
	const [arrangedTop, arrangedNavigators, arrangedBottom] = arrangeRailGroups(
		groups.map((group) => group.map((item) => item.key)),
		hidden,
		order,
	).map((keys, i) => keys.map((key) => groups[i].find((item) => item.key === key)!));
	return [
		...arrangedTop,
		...arrangedNavigators,
		...pins.map((pin): RailItem => ({ key: pin.key, label: pin.label, group: 'pinned', pin })),
		...arrangedBottom,
	];
}

/**
 * The rail's groups of keys as the rail draws them, from the groups in default
 * order: a hidden key is dropped, except Search and Today (the way into search
 * and the fallback lens); Search stays first in its group; within each group
 * the keys `order` lists come first, in that order, and the unlisted ones
 * follow in default order. A key no group has, or one of another group, has no
 * effect.
 */
export function arrangeRailGroups(
	groups: readonly (readonly string[])[],
	hidden: readonly string[],
	order: readonly string[],
): string[][] {
	return groups.map((group) => {
		const visible = group.filter((key) => key === SEARCH_RAIL_ITEM || key === TODAY_RAIL_ITEM || !hidden.includes(key));
		const listed = order.filter((key, i) => visible.includes(key) && order.indexOf(key) === i);
		const arranged = [...listed, ...visible.filter((key) => !listed.includes(key))];
		return arranged.includes(SEARCH_RAIL_ITEM) ? [SEARCH_RAIL_ITEM, ...arranged.filter((key) => key !== SEARCH_RAIL_ITEM)] : arranged;
	});
}

/**
 * The new `layout.railOrder` after moving `key` one place up (`-1`) or down
 * (`1`) within its group: the keys of every listed item (every item but the
 * pins), in rail order. Null when the item cannot move that way: Search, a pin
 * or an unknown key, or a move past the end of the group or above Search.
 */
export function moveRailItem(items: readonly RailItem[], key: string, delta: -1 | 1): string[] | null {
	const listed = items.filter((item) => item.group !== 'pinned');
	const from = listed.findIndex((item) => item.key === key);
	const to = from + delta;
	if (from < 0 || key === SEARCH_RAIL_ITEM) return null;
	const neighbour = listed[to];
	if (!neighbour || neighbour.group !== listed[from].group || neighbour.key === SEARCH_RAIL_ITEM) return null;
	const keys = listed.map((item) => item.key);
	[keys[from], keys[to]] = [keys[to], keys[from]];
	return keys;
}

/** A list of keys saved in settings.json; a hand-edited non-array reads as none, non-strings are dropped. */
function parseKeyList(saved: unknown): string[] {
	return Array.isArray(saved) ? saved.filter((key): key is string => typeof key === 'string') : [];
}

/** The hidden rail items saved in `layout.railHidden`; a hand-edited non-array reads as none, non-strings are dropped. */
export function parseRailHidden(saved: unknown): string[] {
	return parseKeyList(saved);
}

/** The rail order saved in `layout.railOrder`; a hand-edited non-array reads as the default order, non-strings are dropped. */
export function parseRailOrder(saved: unknown): string[] {
	return parseKeyList(saved);
}

/** Whether the rail's Inbox badge is on, from `layout.railInboxBadge`: off only for the boolean `false`. */
export function parseRailInboxBadge(saved: unknown): boolean {
	return saved !== false;
}

/** The icon color of each built-in rail item, the same on every theme. */
const RAIL_ITEM_COLORS = new Map([
	['search', '#64748b'],
	['inbox', '#3b82f6'],
	['today', '#f97316'],
	['favorites', '#eab308'],
	['types', '#8b5cf6'],
	['calendar', '#f43f5e'],
	['files', '#14b8a6'],
	['archive', '#78716c'],
]);

/** The color of any other registered navigator. */
const RAIL_FALLBACK_COLOR = '#0ea5e9';

/** The color of a pin whose resolved icon has none. */
export const RAIL_PIN_COLOR = RAIL_FALLBACK_COLOR;

/** The color of a mod's rail button. */
export const RAIL_ACTION_COLOR = '#d946ef';

/** The labeled rail's width in px. */
export const RAIL_WIDTH = { default: 192 } as const;

/** A rail item's color: a built-in key gives its own, any other key the fallback. */
export function railItemColor(key: string): string {
	return RAIL_ITEM_COLORS.get(key) ?? RAIL_FALLBACK_COLOR;
}

/**
 * The left padding, in px, of the header strip beside a rail this wide: the
 * macOS traffic lights and the rail toggle reach 120 px from the window's edge,
 * and past that the header keeps its usual 12 px.
 */
export function railHeaderPad(railWidth: number): number {
	return Math.max(12, 120 - railWidth);
}
