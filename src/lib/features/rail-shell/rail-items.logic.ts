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
 * both build from this list.
 */
export function railItems(navigators: readonly RailNavigator[], pins: readonly RailPin[]): RailItem[] {
	return [
		{ key: SEARCH_RAIL_ITEM, label: 'Search', group: 'top' },
		{ key: 'inbox', label: 'Inbox', group: 'top' },
		{ key: TODAY_RAIL_ITEM, label: 'Today', group: 'top' },
		{ key: 'favorites', label: 'Favorites', group: 'top' },
		{ key: TYPES_RAIL_ITEM, label: 'Types', group: 'navigator' },
		...navigators.map((navigator): RailItem => ({ key: navigator.id, label: navigator.label, group: 'navigator', navigator })),
		{ key: FILES_RAIL_ITEM, label: 'Files', group: 'navigator' },
		...pins.map((pin): RailItem => ({ key: pin.key, label: pin.label, group: 'pinned', pin })),
		{ key: 'archive', label: 'Archive', group: 'bottom' },
	];
}
