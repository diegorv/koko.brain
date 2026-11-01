import CalendarDays from '@lucide/svelte/icons/calendar-days';
import NotebookPen from '@lucide/svelte/icons/notebook-pen';
import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { eventCalendarViewStore } from '#lib/features/event-calendar/event-calendar-view.store.svelte.js';
import { railRegistryStore } from '#lib/features/rail-shell/rail-registry.store.svelte.js';
import type { Lens } from '#lib/features/rail-shell/rail-shell.types.js';
import { openOrCreatePeriodicNoteForDate } from './calendar.service';
import { CALENDAR_RAIL_ITEM, DAY_LENS_KIND, dayNewNoteRule, parseRailDay, pickedDayLens, resolveDayLens } from './day-lens.logic';
import CalendarNavigator from './CalendarNavigator.svelte';

/** Opens or creates the daily note of the lens's day; rejects on failure or a lens without a day. */
async function openDailyNoteForLens(lens: Lens): Promise<void> {
	const day = parseRailDay(lens.target);
	if (!day) throw new Error(`not a day lens target: ${String(lens.target)}`);
	await openOrCreatePeriodicNoteForDate('daily', day);
}

/**
 * Adds the Calendar navigator and the Day lens to the rail shell, which may
 * not import plugins (ADR 0003). The navigator's pick is `layout.railDay`
 * (today when unset); the lens's header offers the day's daily note. Returns
 * one unregister function for both; `initializeVault` registers them and
 * `teardownVault` unregisters them.
 */
export function registerCalendarRail(): () => void {
	const offNavigator = railRegistryStore.registerNavigator({
		id: CALENDAR_RAIL_ITEM,
		label: 'Calendar',
		icon: CalendarDays,
		component: CalendarNavigator,
		lens: () => pickedDayLens(settingsStore.layout.railDay, eventCalendarViewStore.todayKey),
	});
	const offLens = railRegistryStore.registerLensProvider({
		kind: DAY_LENS_KIND,
		resolve: resolveDayLens,
		newNote: dayNewNoteRule,
		headerAction: {
			label: 'Daily note',
			title: "Open or create this day's daily note",
			icon: NotebookPen,
			failureMessage: 'Could not open the daily note',
			run: openDailyNoteForLens,
		},
	});
	return () => {
		offNavigator();
		offLens();
	};
}
