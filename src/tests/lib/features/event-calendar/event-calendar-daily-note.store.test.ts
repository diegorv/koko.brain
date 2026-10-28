import { afterEach, describe, expect, it, vi } from 'vitest';

import { eventCalendarDailyNoteStore } from '$lib/features/event-calendar/event-calendar-daily-note.store.svelte';

let unregister: (() => void) | null = null;

afterEach(() => {
	unregister?.();
	unregister = null;
});

describe('eventCalendarDailyNoteStore', () => {
	it('is unavailable while no opener is registered', async () => {
		expect(eventCalendarDailyNoteStore.available).toBe(false);
		await expect(eventCalendarDailyNoteStore.open('2026-11-12')).rejects.toThrow('No daily note opener is registered');
	});

	it('hands the day to the registered opener and passes its result through', async () => {
		const opener = vi.fn(() => Promise.resolve());
		unregister = eventCalendarDailyNoteStore.register(opener);

		expect(eventCalendarDailyNoteStore.available).toBe(true);
		await eventCalendarDailyNoteStore.open('2026-11-12');
		expect(opener).toHaveBeenCalledWith('2026-11-12');
	});

	it('propagates a failing opener to the caller', async () => {
		unregister = eventCalendarDailyNoteStore.register(() => Promise.reject(new Error('disk full')));

		await expect(eventCalendarDailyNoteStore.open('2026-11-12')).rejects.toThrow('disk full');
		expect(eventCalendarDailyNoteStore.available).toBe(true);
	});

	it('unregister clears the slot', () => {
		eventCalendarDailyNoteStore.register(() => Promise.resolve())();

		expect(eventCalendarDailyNoteStore.available).toBe(false);
	});

	it('a later registration replaces the opener and a stale unregister leaves it in place', async () => {
		const first = vi.fn(() => Promise.resolve());
		const second = vi.fn(() => Promise.resolve());
		const unregisterFirst = eventCalendarDailyNoteStore.register(first);
		unregister = eventCalendarDailyNoteStore.register(second);

		unregisterFirst();
		expect(eventCalendarDailyNoteStore.available).toBe(true);
		await eventCalendarDailyNoteStore.open('2026-11-13');
		expect(second).toHaveBeenCalledWith('2026-11-13');
		expect(first).not.toHaveBeenCalled();
	});
});
