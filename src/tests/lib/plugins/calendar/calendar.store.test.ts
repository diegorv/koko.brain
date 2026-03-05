import { describe, it, expect, beforeEach } from 'vitest';
import { calendarStore } from '$lib/plugins/calendar/calendar.store.svelte';

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

	describe('setSelectedDateKey', () => {
		it('sets selected date key', () => {
			calendarStore.setSelectedDateKey('2024-01-15');
			expect(calendarStore.selectedDateKey).toBe('2024-01-15');
		});

		it('allows null', () => {
			calendarStore.setSelectedDateKey(null);
			expect(calendarStore.selectedDateKey).toBeNull();
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

	describe('dayFileCounts (derived Map)', () => {
		it('returns Map of dateKey to file count', () => {
			calendarStore.setDayPaths(new Map([
				['2024-01-01', ['/vault/a.md', '/vault/b.md']],
				['2024-01-02', ['/vault/c.md']],
			]));

			const counts = calendarStore.dayFileCounts;
			expect(counts).toBeInstanceOf(Map);
			expect(counts.get('2024-01-01')).toBe(2);
			expect(counts.get('2024-01-02')).toBe(1);
		});

		it('is empty when no day paths exist', () => {
			expect(calendarStore.dayFileCounts.size).toBe(0);
		});

		it('updates after updateFileDate', () => {
			calendarStore.setDayPaths(new Map([
				['2024-01-01', ['/vault/a.md', '/vault/b.md']],
			]));
			expect(calendarStore.dayFileCounts.get('2024-01-01')).toBe(2);

			calendarStore.updateFileDate('/vault/a.md', '2024-01-01', '2024-01-02');
			expect(calendarStore.dayFileCounts.get('2024-01-01')).toBe(1);
			expect(calendarStore.dayFileCounts.get('2024-01-02')).toBe(1);
		});
	});

	describe('selectedDateFiles (derived array)', () => {
		it('returns files for the selected date', () => {
			calendarStore.setDayPaths(new Map([
				['2024-01-15', ['/vault/a.md', '/vault/b.md']],
			]));
			calendarStore.setSelectedDateKey('2024-01-15');

			expect(calendarStore.selectedDateFiles).toEqual(['/vault/a.md', '/vault/b.md']);
		});

		it('returns empty array when no date is selected', () => {
			calendarStore.setDayPaths(new Map([
				['2024-01-15', ['/vault/a.md']],
			]));
			calendarStore.setSelectedDateKey(null);

			expect(calendarStore.selectedDateFiles).toEqual([]);
		});

		it('returns empty array when selected date has no files', () => {
			calendarStore.setDayPaths(new Map([
				['2024-01-15', ['/vault/a.md']],
			]));
			calendarStore.setSelectedDateKey('2024-01-20');

			expect(calendarStore.selectedDateFiles).toEqual([]);
		});

		it('updates when selected date changes', () => {
			calendarStore.setDayPaths(new Map([
				['2024-01-15', ['/vault/a.md']],
				['2024-01-16', ['/vault/b.md']],
			]));
			calendarStore.setSelectedDateKey('2024-01-15');
			expect(calendarStore.selectedDateFiles).toEqual(['/vault/a.md']);

			calendarStore.setSelectedDateKey('2024-01-16');
			expect(calendarStore.selectedDateFiles).toEqual(['/vault/b.md']);
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

		it('clears derived state too', () => {
			calendarStore.setDayPaths(new Map([['2024-01-01', ['/a.md']]]));
			calendarStore.reset();

			expect(calendarStore.dayFileCounts.size).toBe(0);
			expect(calendarStore.selectedDateFiles).toEqual([]);
		});
	});
});
