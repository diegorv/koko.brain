import type { PeriodType } from '#lib/core/settings/settings.types.js';
import { openOrCreatePeriodicNoteForDate as openPeriodicNote } from '#lib/plugins/periodic-notes/periodic-notes.service.js';
import { calendarStore } from './calendar.store.svelte';
import dayjs from 'dayjs';

/**
 * Opens or creates a periodic note of any type for an arbitrary date.
 * Parses the dateKey and delegates to the periodic-notes service.
 */
export async function openOrCreatePeriodicNoteForDate(periodType: PeriodType, dateKey: string): Promise<void> {
	await openPeriodicNote(periodType, dayjs(dateKey, 'YYYY-MM-DD'));
}

/** Resets the calendar store */
export function resetCalendar(): void {
	calendarStore.reset();
}
