import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { settingsStore } from '$lib/core/settings/settings.store.svelte';
import { eventCalendarViewStore } from '$lib/features/event-calendar/event-calendar-view.store.svelte';
import { runtimeTimeZoneSwitchWorks, withTimeZone } from '../../../fixtures/timezone.fixture';

/** Wednesday 2026-10-28 10:30 local time. */
const NOW = new Date(2026, 9, 28, 10, 30);
const RECT = { x: 10, y: 20, width: 100, height: 40 };

describe('eventCalendarViewStore', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);
		settingsStore.reset();
		eventCalendarViewStore.reset();
		eventCalendarViewStore.setNow(NOW.getTime());
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('initial state after reset', () => {
		it('shows the week of today with nothing open', () => {
			expect(eventCalendarViewStore.view).toBe('week');
			expect(eventCalendarViewStore.focusedDate).toBe('2026-10-28');
			expect(eventCalendarViewStore.popover).toBeNull();
			expect(eventCalendarViewStore.dialog).toBeNull();
			expect(eventCalendarViewStore.helpOpen).toBe(false);
			expect(eventCalendarViewStore.initialized).toBe(false);
			expect(eventCalendarViewStore.isDialogOpen).toBe(false);
			expect(eventCalendarViewStore.selectedEventPath).toBeNull();
			expect(eventCalendarViewStore.gestureLive).toBe(false);
		});

		it('reset takes focusedDate from the clock, not a fixed date', () => {
			vi.setSystemTime(new Date(2027, 0, 5, 9, 0));
			eventCalendarViewStore.reset();
			expect(eventCalendarViewStore.focusedDate).toBe('2027-01-05');
		});

		it('reset leaves nowMs alone', () => {
			const ms = new Date(2026, 9, 28, 14, 0).getTime();
			eventCalendarViewStore.setNow(ms);
			eventCalendarViewStore.reset();
			expect(eventCalendarViewStore.nowMs).toBe(ms);
		});
	});

	describe('module load', () => {
		it('focusedDate and nowMs are today at module load', async () => {
			vi.setSystemTime(new Date(2031, 4, 17, 8, 15));
			vi.resetModules();
			const fresh = await import('$lib/features/event-calendar/event-calendar-view.store.svelte');
			expect(fresh.eventCalendarViewStore.focusedDate).toBe('2031-05-17');
			expect(fresh.eventCalendarViewStore.nowMs).toBe(new Date(2031, 4, 17, 8, 15).getTime());
			expect(fresh.eventCalendarViewStore.view).toBe('week');
		});
	});

	describe('visibleDays', () => {
		it('week view follows weekStartsOn', () => {
			settingsStore.updateEventCalendar({ weekStartsOn: 1 });
			expect(eventCalendarViewStore.visibleDays[0]).toBe('2026-10-26');
			expect(eventCalendarViewStore.visibleDays).toHaveLength(7);
			settingsStore.updateEventCalendar({ weekStartsOn: 0 });
			expect(eventCalendarViewStore.visibleDays[0]).toBe('2026-10-25');
		});

		it('week view drops weekends when showWeekends is false', () => {
			settingsStore.updateEventCalendar({ weekStartsOn: 1, showWeekends: false });
			expect(eventCalendarViewStore.visibleDays).toEqual([
				'2026-10-26',
				'2026-10-27',
				'2026-10-28',
				'2026-10-29',
				'2026-10-30',
			]);
		});

		it('day view shows the focused day only', () => {
			eventCalendarViewStore.setView('day');
			expect(eventCalendarViewStore.visibleDays).toEqual(['2026-10-28']);
		});

		it('month view shows every day of the month', () => {
			eventCalendarViewStore.setView('month');
			const days = eventCalendarViewStore.visibleDays;
			expect(days).toHaveLength(31);
			expect(days[0]).toBe('2026-10-01');
			expect(days[30]).toBe('2026-10-31');
		});
	});

	describe('monthCells', () => {
		it('builds 42 cells starting on weekStartsOn', () => {
			settingsStore.updateEventCalendar({ weekStartsOn: 1 });
			const cells = eventCalendarViewStore.monthCells;
			expect(cells).toHaveLength(42);
			expect(cells[0]).toEqual({ day: '2026-09-28', inMonth: false });
			settingsStore.updateEventCalendar({ weekStartsOn: 0 });
			expect(eventCalendarViewStore.monthCells[0]).toEqual({ day: '2026-09-27', inMonth: false });
		});

		it('drops weekend cells when showWeekends is false', () => {
			settingsStore.updateEventCalendar({ showWeekends: false });
			expect(eventCalendarViewStore.monthCells).toHaveLength(30);
		});

		it('follows focusedDate', () => {
			eventCalendarViewStore.setDate('2026-02-10');
			expect(eventCalendarViewStore.monthCells.some((c) => c.day === '2026-02-01' && c.inMonth)).toBe(true);
		});
	});

	describe('rangeLabel', () => {
		it('week view follows weekStartsOn and showWeekends', () => {
			settingsStore.updateEventCalendar({ weekStartsOn: 1, showWeekends: false });
			expect(eventCalendarViewStore.rangeLabel).toEqual({ title: 'October, 2026', subtitle: 'Week 44 · Oct 26 – 30' });

			settingsStore.updateEventCalendar({ weekStartsOn: 0, showWeekends: true });
			expect(eventCalendarViewStore.rangeLabel).toEqual({ title: 'October, 2026', subtitle: 'Week 44 · Oct 25 – 31' });
		});

		it('a week across two months takes its title from the first visible day', () => {
			settingsStore.updateEventCalendar({ weekStartsOn: 1 });
			eventCalendarViewStore.setDate('2026-11-01');
			expect(eventCalendarViewStore.rangeLabel).toEqual({ title: 'October, 2026', subtitle: 'Week 44 · Oct 26 – Nov 1' });
		});

		it('month view gives the month span', () => {
			eventCalendarViewStore.setView('month');
			expect(eventCalendarViewStore.rangeLabel).toEqual({ title: 'October, 2026', subtitle: 'Oct 1 – 31' });
		});

		it('day view names the weekday', () => {
			eventCalendarViewStore.setView('day');
			expect(eventCalendarViewStore.rangeLabel.subtitle).toMatch(/^Week 44 · Wed/);
		});
	});

	describe('todayKey and nowMinutes', () => {
		it('read nowMs', () => {
			expect(eventCalendarViewStore.todayKey).toBe('2026-10-28');
			expect(eventCalendarViewStore.nowMinutes).toBe(10 * 60 + 30);
			eventCalendarViewStore.setNow(new Date(2026, 9, 29, 0, 5).getTime());
			expect(eventCalendarViewStore.todayKey).toBe('2026-10-29');
			expect(eventCalendarViewStore.nowMinutes).toBe(5);
		});

		it('do not depend on focusedDate', () => {
			eventCalendarViewStore.setDate('2020-01-01');
			expect(eventCalendarViewStore.todayKey).toBe('2026-10-28');
			expect(eventCalendarViewStore.nowMinutes).toBe(630);
		});

		describe.runIf(runtimeTimeZoneSwitchWorks())('on a DST transition day', () => {
			it('nowMinutes is wall-clock minutes', () => {
				withTimeZone('America/New_York', () => {
					// 2026-03-08: clocks jump from 02:00 to 03:00.
					eventCalendarViewStore.setNow(new Date(2026, 2, 8, 10, 0).getTime());
					expect(eventCalendarViewStore.todayKey).toBe('2026-03-08');
					expect(eventCalendarViewStore.nowMinutes).toBe(600);
				});
			});
		});
	});

	describe('navigation', () => {
		beforeEach(() => {
			eventCalendarViewStore.openPopover('/v/a.md', RECT);
		});

		it('setView changes the view and clears the popover', () => {
			eventCalendarViewStore.setView('month');
			expect(eventCalendarViewStore.view).toBe('month');
			expect(eventCalendarViewStore.popover).toBeNull();
			expect(eventCalendarViewStore.selectedEventPath).toBeNull();
		});

		it('setDate changes the date and clears the popover', () => {
			eventCalendarViewStore.setDate('2026-12-01');
			expect(eventCalendarViewStore.focusedDate).toBe('2026-12-01');
			expect(eventCalendarViewStore.popover).toBeNull();
		});

		it('step moves by the view unit and clears the popover', () => {
			eventCalendarViewStore.step(1);
			expect(eventCalendarViewStore.focusedDate).toBe('2026-11-04');
			expect(eventCalendarViewStore.popover).toBeNull();
			eventCalendarViewStore.setView('day');
			eventCalendarViewStore.step(-1);
			expect(eventCalendarViewStore.focusedDate).toBe('2026-11-03');
			eventCalendarViewStore.setView('month');
			eventCalendarViewStore.step(1);
			expect(eventCalendarViewStore.focusedDate).toBe('2026-12-03');
		});

		it('goToToday reads the clock and clears the popover', () => {
			eventCalendarViewStore.setDate('2020-01-01');
			eventCalendarViewStore.openPopover('/v/a.md', RECT);
			vi.setSystemTime(new Date(2026, 10, 2, 9, 0));
			eventCalendarViewStore.goToToday();
			expect(eventCalendarViewStore.focusedDate).toBe('2026-11-02');
			expect(eventCalendarViewStore.popover).toBeNull();
		});

		it('navigation leaves the dialog open', () => {
			eventCalendarViewStore.openDialog({ mode: 'edit', path: '/v/a.md' });
			eventCalendarViewStore.step(1);
			expect(eventCalendarViewStore.isDialogOpen).toBe(true);
		});
	});

	describe('popover', () => {
		it('openPopover stores the path and a copy of the plain rect', () => {
			const rect = { ...RECT };
			eventCalendarViewStore.openPopover('/v/a.md', rect);
			rect.x = 999;
			expect(eventCalendarViewStore.popover).toEqual({ path: '/v/a.md', rect: RECT });
			expect(eventCalendarViewStore.selectedEventPath).toBe('/v/a.md');
		});

		it('closePopover clears it', () => {
			eventCalendarViewStore.openPopover('/v/a.md', RECT);
			eventCalendarViewStore.closePopover();
			expect(eventCalendarViewStore.popover).toBeNull();
			expect(eventCalendarViewStore.selectedEventPath).toBeNull();
		});
	});

	describe('dialog', () => {
		it('openDialog sets mode and payload and bumps session', () => {
			eventCalendarViewStore.openDialog({ mode: 'create', date: '2026-10-28', start: 600, end: 660 });
			const first = eventCalendarViewStore.dialog;
			expect(first?.mode).toBe('create');
			expect(first?.payload).toEqual({ mode: 'create', date: '2026-10-28', start: 600, end: 660 });
			expect(eventCalendarViewStore.isDialogOpen).toBe(true);

			eventCalendarViewStore.openDialog({ mode: 'edit', path: '/v/a.md' });
			const second = eventCalendarViewStore.dialog;
			expect(second?.mode).toBe('edit');
			expect(second!.session).toBe(first!.session + 1);
		});

		it('openDialog stores a copy of the payload', () => {
			const payload = { mode: 'create' as const, date: '2026-10-28', start: 600 };
			eventCalendarViewStore.openDialog(payload);
			payload.date = 'x';
			payload.start = 0;
			expect(eventCalendarViewStore.dialog?.payload).toEqual({ mode: 'create', date: '2026-10-28', start: 600 });
		});

		it('session keeps growing across close and reset', () => {
			eventCalendarViewStore.openDialog({ mode: 'edit', path: '/v/a.md' });
			const first = eventCalendarViewStore.dialog!.session;
			eventCalendarViewStore.closeDialog();
			eventCalendarViewStore.reset();
			eventCalendarViewStore.openDialog({ mode: 'edit', path: '/v/a.md' });
			expect(eventCalendarViewStore.dialog!.session).toBeGreaterThan(first);
		});

		it('closeDialog clears it', () => {
			eventCalendarViewStore.openDialog({ mode: 'edit', path: '/v/a.md' });
			eventCalendarViewStore.closeDialog();
			expect(eventCalendarViewStore.dialog).toBeNull();
			expect(eventCalendarViewStore.isDialogOpen).toBe(false);
		});
	});

	describe('shortcuts help', () => {
		it('openHelp and closeHelp toggle helpOpen and isDialogOpen', () => {
			eventCalendarViewStore.openHelp();
			expect(eventCalendarViewStore.helpOpen).toBe(true);
			expect(eventCalendarViewStore.isDialogOpen).toBe(true);
			eventCalendarViewStore.closeHelp();
			expect(eventCalendarViewStore.helpOpen).toBe(false);
			expect(eventCalendarViewStore.isDialogOpen).toBe(false);
		});

		it('leaves the popover and the event dialog alone', () => {
			eventCalendarViewStore.openPopover('/v/a.md', RECT);
			eventCalendarViewStore.openHelp();
			expect(eventCalendarViewStore.selectedEventPath).toBe('/v/a.md');
			eventCalendarViewStore.openDialog({ mode: 'edit', path: '/v/a.md' });
			eventCalendarViewStore.closeHelp();
			expect(eventCalendarViewStore.dialog?.mode).toBe('edit');
			expect(eventCalendarViewStore.isDialogOpen).toBe(true);
		});
	});

	describe('gestureLive', () => {
		it('setGestureLive sets and clears it', () => {
			eventCalendarViewStore.setGestureLive(true);
			expect(eventCalendarViewStore.gestureLive).toBe(true);
			eventCalendarViewStore.setGestureLive(false);
			expect(eventCalendarViewStore.gestureLive).toBe(false);
		});

		it('leaves view, date, popover and dialog alone', () => {
			eventCalendarViewStore.setView('month');
			eventCalendarViewStore.openPopover('/v/a.md', RECT);
			eventCalendarViewStore.setGestureLive(true);
			expect(eventCalendarViewStore.view).toBe('month');
			expect(eventCalendarViewStore.selectedEventPath).toBe('/v/a.md');
			expect(eventCalendarViewStore.isDialogOpen).toBe(false);
		});
	});

	describe('closeTransient', () => {
		it('closes the popover, the dialog and the shortcuts help', () => {
			eventCalendarViewStore.openPopover('/v/a.md', RECT);
			eventCalendarViewStore.openDialog({ mode: 'edit', path: '/v/a.md' });
			eventCalendarViewStore.openHelp();
			eventCalendarViewStore.closeTransient();
			expect(eventCalendarViewStore.popover).toBeNull();
			expect(eventCalendarViewStore.dialog).toBeNull();
			expect(eventCalendarViewStore.helpOpen).toBe(false);
			expect(eventCalendarViewStore.isDialogOpen).toBe(false);
			expect(eventCalendarViewStore.selectedEventPath).toBeNull();
		});

		it('keeps view and date', () => {
			eventCalendarViewStore.setView('month');
			eventCalendarViewStore.setDate('2026-12-01');
			eventCalendarViewStore.closeTransient();
			expect(eventCalendarViewStore.view).toBe('month');
			expect(eventCalendarViewStore.focusedDate).toBe('2026-12-01');
		});
	});

	describe('remapPath', () => {
		it('moves the popover and an edit dialog to the new path', () => {
			eventCalendarViewStore.openPopover('/v/a.md', RECT);
			eventCalendarViewStore.openDialog({ mode: 'edit', path: '/v/a.md' });
			const session = eventCalendarViewStore.dialog!.session;
			eventCalendarViewStore.remapPath('/v/a.md', '/v/b.md');
			expect(eventCalendarViewStore.popover).toEqual({ path: '/v/b.md', rect: RECT });
			expect(eventCalendarViewStore.selectedEventPath).toBe('/v/b.md');
			expect(eventCalendarViewStore.dialog).toEqual({
				mode: 'edit',
				payload: { mode: 'edit', path: '/v/b.md' },
				session,
			});
		});

		it('leaves other paths and a create dialog alone', () => {
			eventCalendarViewStore.openPopover('/v/c.md', RECT);
			eventCalendarViewStore.openDialog({ mode: 'create', date: '2026-10-28' });
			const popover = eventCalendarViewStore.popover;
			const dialog = eventCalendarViewStore.dialog;
			eventCalendarViewStore.remapPath('/v/a.md', '/v/b.md');
			expect(eventCalendarViewStore.popover).toBe(popover);
			expect(eventCalendarViewStore.dialog).toBe(dialog);
		});

		it('is a no-op when nothing is open', () => {
			eventCalendarViewStore.remapPath('/v/a.md', '/v/b.md');
			expect(eventCalendarViewStore.popover).toBeNull();
			expect(eventCalendarViewStore.dialog).toBeNull();
		});
	});

	describe('initFromSettings', () => {
		it('applies the default view once per session', () => {
			settingsStore.updateEventCalendar({ defaultView: 'month' });
			eventCalendarViewStore.initFromSettings();
			expect(eventCalendarViewStore.view).toBe('month');
			expect(eventCalendarViewStore.initialized).toBe(true);

			eventCalendarViewStore.setView('day');
			settingsStore.updateEventCalendar({ defaultView: 'week' });
			eventCalendarViewStore.initFromSettings();
			expect(eventCalendarViewStore.view).toBe('day');
		});

		it('applies again after reset', () => {
			eventCalendarViewStore.initFromSettings();
			settingsStore.updateEventCalendar({ defaultView: 'day' });
			eventCalendarViewStore.reset();
			expect(eventCalendarViewStore.initialized).toBe(false);
			eventCalendarViewStore.initFromSettings();
			expect(eventCalendarViewStore.view).toBe('day');
		});
	});

	describe('reset', () => {
		it('restores view, date, popover, dialog, shortcuts help and initialized', () => {
			eventCalendarViewStore.initFromSettings();
			eventCalendarViewStore.setView('month');
			eventCalendarViewStore.setDate('2020-01-01');
			eventCalendarViewStore.openPopover('/v/a.md', RECT);
			eventCalendarViewStore.openDialog({ mode: 'edit', path: '/v/a.md' });
			eventCalendarViewStore.openHelp();
			eventCalendarViewStore.setGestureLive(true);
			eventCalendarViewStore.reset();
			expect(eventCalendarViewStore.gestureLive).toBe(false);
			expect(eventCalendarViewStore.view).toBe('week');
			expect(eventCalendarViewStore.focusedDate).toBe('2026-10-28');
			expect(eventCalendarViewStore.popover).toBeNull();
			expect(eventCalendarViewStore.dialog).toBeNull();
			expect(eventCalendarViewStore.helpOpen).toBe(false);
			expect(eventCalendarViewStore.initialized).toBe(false);
		});
	});

	describe('focusRequest', () => {
		it('is null after reset', () => {
			expect(eventCalendarViewStore.focusRequest).toBeNull();
		});

		it('requestFocus stores the path under a new seq on every call', () => {
			eventCalendarViewStore.requestFocus('/v/a.md');
			const first = eventCalendarViewStore.focusRequest;
			expect(first?.path).toBe('/v/a.md');
			eventCalendarViewStore.requestFocus('/v/a.md');
			expect(eventCalendarViewStore.focusRequest?.seq).toBeGreaterThan(first!.seq);
		});

		it('clearFocusRequest drops only the matching request', () => {
			eventCalendarViewStore.requestFocus('/v/a.md');
			const stale = eventCalendarViewStore.focusRequest!.seq;
			eventCalendarViewStore.requestFocus('/v/b.md');
			eventCalendarViewStore.clearFocusRequest(stale);
			expect(eventCalendarViewStore.focusRequest?.path).toBe('/v/b.md');
			eventCalendarViewStore.clearFocusRequest(eventCalendarViewStore.focusRequest!.seq);
			expect(eventCalendarViewStore.focusRequest).toBeNull();
		});

		it('navigation, closeTransient and reset drop it', () => {
			const drops: Array<() => void> = [
				() => eventCalendarViewStore.setView('day'),
				() => eventCalendarViewStore.setDate('2026-12-01'),
				() => eventCalendarViewStore.step(1),
				() => eventCalendarViewStore.goToToday(),
				() => eventCalendarViewStore.closeTransient(),
				() => eventCalendarViewStore.reset(),
			];
			for (const drop of drops) {
				eventCalendarViewStore.requestFocus('/v/a.md');
				drop();
				expect(eventCalendarViewStore.focusRequest).toBeNull();
			}
		});

		it('remapPath follows a renamed note and keeps the seq', () => {
			eventCalendarViewStore.requestFocus('/v/a.md');
			const seq = eventCalendarViewStore.focusRequest!.seq;
			eventCalendarViewStore.remapPath('/v/a.md', '/v/b.md');
			expect(eventCalendarViewStore.focusRequest).toEqual({ path: '/v/b.md', seq });
			eventCalendarViewStore.remapPath('/v/x.md', '/v/y.md');
			expect(eventCalendarViewStore.focusRequest).toEqual({ path: '/v/b.md', seq });
		});
	});
});
