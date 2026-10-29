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

	it('a later registration replaces the opener and a stale unregister leaves it and its opens in flight in place', async () => {
		const first = vi.fn(() => Promise.resolve());
		let finish!: () => void;
		const second = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
		const unregisterFirst = eventCalendarDailyNoteStore.register(first);
		unregister = eventCalendarDailyNoteStore.register(second);
		const pending = eventCalendarDailyNoteStore.open('2026-11-13');

		unregisterFirst();
		expect(eventCalendarDailyNoteStore.available).toBe(true);
		expect(eventCalendarDailyNoteStore.open('2026-11-13')).toBe(pending);
		expect(second).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledWith('2026-11-13');
		expect(first).not.toHaveBeenCalled();
		finish();
		await pending;
	});

	it('joins a second open of the same day while the first is in flight', async () => {
		let finish!: () => void;
		const opener = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
		unregister = eventCalendarDailyNoteStore.register(opener);

		const first = eventCalendarDailyNoteStore.open('2026-11-12');
		const second = eventCalendarDailyNoteStore.open('2026-11-12');
		expect(opener).toHaveBeenCalledTimes(1);
		expect(second).toBe(first);

		finish();
		await Promise.all([first, second]);
		const again = eventCalendarDailyNoteStore.open('2026-11-12');
		expect(opener).toHaveBeenCalledTimes(2);
		finish();
		await again;
	});

	it('opens different days independently', async () => {
		const finishers: (() => void)[] = [];
		const opener = vi.fn(() => new Promise<void>((resolve) => finishers.push(resolve)));
		unregister = eventCalendarDailyNoteStore.register(opener);

		const opens = [eventCalendarDailyNoteStore.open('2026-11-12'), eventCalendarDailyNoteStore.open('2026-11-13')];
		expect(opener.mock.calls).toEqual([['2026-11-12'], ['2026-11-13']]);

		finishers.forEach((finish) => finish());
		await Promise.all(opens);
	});

	it('after an unregister (vault teardown), a new registration does not join an open of the previous opener', async () => {
		let finishOld!: () => void;
		const old = vi.fn(() => new Promise<void>((resolve) => (finishOld = resolve)));
		const oldUnregister = eventCalendarDailyNoteStore.register(old);
		const stale = eventCalendarDailyNoteStore.open('2026-11-12');

		oldUnregister();
		let finishNext!: () => void;
		const next = vi.fn(() => new Promise<void>((resolve) => (finishNext = resolve)));
		unregister = eventCalendarDailyNoteStore.register(next);
		const fresh = eventCalendarDailyNoteStore.open('2026-11-12');
		expect(fresh).not.toBe(stale);
		expect(next).toHaveBeenCalledWith('2026-11-12');

		finishOld();
		await stale;
		expect(eventCalendarDailyNoteStore.open('2026-11-12')).toBe(fresh);
		expect(next).toHaveBeenCalledTimes(1);
		finishNext();
		await fresh;
	});

	it('a registration that replaces the opener without an unregister (double vault switch) does not join an open of the previous opener', async () => {
		let finishOld!: () => void;
		const old = vi.fn(() => new Promise<void>((resolve) => (finishOld = resolve)));
		eventCalendarDailyNoteStore.register(old);
		const stale = eventCalendarDailyNoteStore.open('2026-11-12');

		let finishNext!: () => void;
		const next = vi.fn(() => new Promise<void>((resolve) => (finishNext = resolve)));
		unregister = eventCalendarDailyNoteStore.register(next);
		const fresh = eventCalendarDailyNoteStore.open('2026-11-12');
		expect(fresh).not.toBe(stale);
		expect(next).toHaveBeenCalledWith('2026-11-12');

		finishOld();
		await stale;
		expect(eventCalendarDailyNoteStore.open('2026-11-12')).toBe(fresh);
		expect(next).toHaveBeenCalledTimes(1);
		finishNext();
		await fresh;
	});

	it('lets the day open again after a failed open', async () => {
		const opener = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValueOnce(undefined);
		unregister = eventCalendarDailyNoteStore.register(opener);

		await expect(eventCalendarDailyNoteStore.open('2026-11-12')).rejects.toThrow('disk full');
		await eventCalendarDailyNoteStore.open('2026-11-12');
		expect(opener).toHaveBeenCalledTimes(2);
	});
});
