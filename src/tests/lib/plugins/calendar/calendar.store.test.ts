import { describe, it, expect, beforeEach } from 'vitest';
import { calendarStore } from '#lib/plugins/calendar/calendar.store.svelte.js';

describe('calendarStore', () => {
	beforeEach(() => {
		calendarStore.reset();
	});

	describe('month navigation', () => {
		it('nextMonth advances to next month', () => {
			const startMonth = calendarStore.currentMonth;
			calendarStore.nextMonth();

			if (startMonth === 11) {
				expect(calendarStore.currentMonth).toBe(0);
			} else {
				expect(calendarStore.currentMonth).toBe(startMonth + 1);
			}
		});

		it('nextMonth wraps Dec to Jan and increments year', () => {
			// Set to December
			while (calendarStore.currentMonth !== 11) {
				calendarStore.nextMonth();
			}
			const year = calendarStore.currentYear;

			calendarStore.nextMonth();

			expect(calendarStore.currentMonth).toBe(0);
			expect(calendarStore.currentYear).toBe(year + 1);
		});

		it('prevMonth goes back one month', () => {
			// Ensure we're not on January
			if (calendarStore.currentMonth === 0) {
				calendarStore.nextMonth();
			}
			const startMonth = calendarStore.currentMonth;
			calendarStore.prevMonth();

			expect(calendarStore.currentMonth).toBe(startMonth - 1);
		});

		it('prevMonth wraps Jan to Dec and decrements year', () => {
			// Set to January
			while (calendarStore.currentMonth !== 0) {
				calendarStore.prevMonth();
			}
			const year = calendarStore.currentYear;

			calendarStore.prevMonth();

			expect(calendarStore.currentMonth).toBe(11);
			expect(calendarStore.currentYear).toBe(year - 1);
		});
	});

	describe('year navigation', () => {
		it('nextYear increments year', () => {
			const year = calendarStore.currentYear;
			calendarStore.nextYear();
			expect(calendarStore.currentYear).toBe(year + 1);
		});

		it('prevYear decrements year', () => {
			const year = calendarStore.currentYear;
			calendarStore.prevYear();
			expect(calendarStore.currentYear).toBe(year - 1);
		});
	});

	describe('goToToday', () => {
		it('navigates to current month and year', () => {
			// Move away from today
			calendarStore.nextYear();
			calendarStore.nextMonth();

			calendarStore.goToToday();

			const now = new Date();
			expect(calendarStore.currentYear).toBe(now.getFullYear());
			expect(calendarStore.currentMonth).toBe(now.getMonth());
		});
	});

	describe('showMonth', () => {
		it('shows the given month', () => {
			calendarStore.showMonth(2024, 1);
			expect(calendarStore.currentYear).toBe(2024);
			expect(calendarStore.currentMonth).toBe(1);
		});
	});

	describe('setDayPaths', () => {
		it('replaces day paths map', () => {
			const paths = new Map([['2024-01-01', ['/vault/a.md']]]);
			calendarStore.setDayPaths(paths);
			expect(calendarStore.dayPaths).toEqual(paths);
		});
	});

	describe('updateFileDate', () => {
		it('moves file from old date to new date', () => {
			calendarStore.setDayPaths(new Map([
				['2024-01-01', ['/vault/a.md', '/vault/b.md']],
			]));

			calendarStore.updateFileDate('/vault/a.md', '2024-01-01', '2024-01-02');

			expect(calendarStore.dayPaths.get('2024-01-01')).toEqual(['/vault/b.md']);
			expect(calendarStore.dayPaths.get('2024-01-02')).toEqual(['/vault/a.md']);
		});

		it('removes date key when last file is moved away', () => {
			calendarStore.setDayPaths(new Map([
				['2024-01-01', ['/vault/a.md']],
			]));

			calendarStore.updateFileDate('/vault/a.md', '2024-01-01', '2024-01-02');

			expect(calendarStore.dayPaths.has('2024-01-01')).toBe(false);
			expect(calendarStore.dayPaths.get('2024-01-02')).toEqual(['/vault/a.md']);
		});

		it('adds to existing date key without duplicates', () => {
			calendarStore.setDayPaths(new Map([
				['2024-01-02', ['/vault/existing.md']],
			]));

			calendarStore.updateFileDate('/vault/new.md', null, '2024-01-02');

			expect(calendarStore.dayPaths.get('2024-01-02')).toEqual(['/vault/existing.md', '/vault/new.md']);
		});

		it('does not add duplicate file to date key', () => {
			calendarStore.setDayPaths(new Map([
				['2024-01-02', ['/vault/a.md']],
			]));

			calendarStore.updateFileDate('/vault/a.md', null, '2024-01-02');

			expect(calendarStore.dayPaths.get('2024-01-02')).toEqual(['/vault/a.md']);
		});
	});

	describe('reset', () => {
		it('resets to current date', () => {
			calendarStore.nextYear();
			calendarStore.setDayPaths(new Map([['key', ['/a']]]));

			calendarStore.reset();

			const now = new Date();
			expect(calendarStore.currentYear).toBe(now.getFullYear());
			expect(calendarStore.currentMonth).toBe(now.getMonth());
			expect(calendarStore.dayPaths.size).toBe(0);
		});
	});
});
