import { describe, it, expect, vi } from 'vitest';
import dayjs from 'dayjs';
import {
	buildPeriodicNotePath,
	buildPeriodicNotePathForToday,
	buildAdjacentPeriodPath,
	getPeriodicNoteTitle,
	getTodayPeriodicNoteTitle,
	getFormatForPeriod,
	getTemplatePathForPeriod,
	getDailyInlineTemplate,
	buildPeriodicNotePathForDate,
	buildWikilinkPath,
	buildPeriodicVariables,
	buildDailyLinksTable,
	buildWeeklyLinksTable,
	buildMonthlyLinksTable,
	buildQuarterlyLinksTable,
	detectPeriodicNoteType,
} from '$lib/plugins/periodic-notes/periodic-notes.logic';
import type { PeriodicNotesSettings } from '$lib/core/settings/settings.types';

const fixedDate = dayjs(new Date(2026, 1, 9)); // Feb 9, 2026

describe('buildPeriodicNotePath', () => {
	it('builds path at vault root when folder is empty', () => {
		const result = buildPeriodicNotePath('/vault', '', 'DD-MM-YYYY', fixedDate);
		expect(result).toBe('/vault/09-02-2026.md');
	});

	it('builds path with subfolder', () => {
		const result = buildPeriodicNotePath('/vault', '_notes', 'DD-MM-YYYY', fixedDate);
		expect(result).toBe('/vault/_notes/09-02-2026.md');
	});

	it('builds path with nested format (subfolder structure in format)', () => {
		// Literal text like "_journal-day-" must be escaped with [] in dayjs format
		const result = buildPeriodicNotePath('/vault', '_notes', 'YYYY/MM-MMM/[_journal-day-]DD-MM-YYYY', fixedDate);
		expect(result).toBe('/vault/_notes/2026/02-Feb/_journal-day-09-02-2026.md');
	});

	it('builds weekly note path', () => {
		const result = buildPeriodicNotePath('/vault', '_notes', 'YYYY/MM-MMM/[__journal-week-]WW[-]YYYY', fixedDate);
		expect(result).toBe('/vault/_notes/2026/02-Feb/__journal-week-07-2026.md');
	});

	it('builds monthly note path', () => {
		const result = buildPeriodicNotePath('/vault', '_notes', 'YYYY/MM-MMM/MM-MMM', fixedDate);
		expect(result).toBe('/vault/_notes/2026/02-Feb/02-Feb.md');
	});

	it('builds quarterly note path', () => {
		const result = buildPeriodicNotePath('/vault', '_notes', 'YYYY/[_journal-quarter-]YYYY[-Q]Q', fixedDate);
		expect(result).toBe('/vault/_notes/2026/_journal-quarter-2026-Q1.md');
	});
});

describe('buildPeriodicNotePathForToday', () => {
	it('builds path for today using current date', () => {
		const result = buildPeriodicNotePathForToday('/vault', '', 'DD-MM-YYYY');
		// dayjs() returns current date, so we just verify structure
		expect(result).toMatch(/^\/vault\/\d{2}-\d{2}-\d{4}\.md$/);
	});
});

describe('buildAdjacentPeriodPath', () => {
	it('builds previous day path', () => {
		const result = buildAdjacentPeriodPath('/vault', '_notes', 'DD-MM-YYYY', fixedDate, -1, 'daily');
		expect(result).toBe('/vault/_notes/08-02-2026.md');
	});

	it('builds next day path', () => {
		const result = buildAdjacentPeriodPath('/vault', '_notes', 'DD-MM-YYYY', fixedDate, 1, 'daily');
		expect(result).toBe('/vault/_notes/10-02-2026.md');
	});

	it('builds previous week path', () => {
		const result = buildAdjacentPeriodPath('/vault', '_notes', 'YYYY/MM-MMM/[__journal-week-]WW[-]YYYY', fixedDate, -1, 'weekly');
		expect(result).toBe('/vault/_notes/2026/02-Feb/__journal-week-06-2026.md');
	});

	it('builds next month path', () => {
		const result = buildAdjacentPeriodPath('/vault', '_notes', 'YYYY/MM-MMM/MM-MMM', fixedDate, 1, 'monthly');
		expect(result).toBe('/vault/_notes/2026/03-Mar/03-Mar.md');
	});

	it('builds next quarter path', () => {
		const result = buildAdjacentPeriodPath('/vault', '_notes', 'YYYY/[_journal-quarter-]YYYY[-Q]Q', fixedDate, 1, 'quarterly');
		expect(result).toBe('/vault/_notes/2026/_journal-quarter-2026-Q2.md');
	});
});

describe('getPeriodicNoteTitle', () => {
	it('returns formatted title for a date', () => {
		expect(getPeriodicNoteTitle('DD-MM-YYYY', fixedDate)).toBe('09-02-2026');
	});

	it('returns formatted title with nested format', () => {
		expect(getPeriodicNoteTitle('YYYY/MM-MMM/[_journal-day-]DD-MM-YYYY', fixedDate))
			.toBe('2026/02-Feb/_journal-day-09-02-2026');
	});
});

describe('getTodayPeriodicNoteTitle', () => {
	it('returns today title using mocked date', () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date(2026, 1, 9));
		expect(getTodayPeriodicNoteTitle('DD-MM-YYYY')).toBe('09-02-2026');
		vi.useRealTimers();
	});
});

describe('getFormatForPeriod', () => {
	const settings: PeriodicNotesSettings = {
		folder: '',
		daily: { format: 'DD-MM-YYYY', template: '' },
		weekly: { format: 'YYYY/[W]WW' },
		monthly: { format: 'YYYY/MM-MMM' },
		quarterly: { format: 'YYYY/[Q]Q' },
		yearly: { format: 'YYYY/YYYY' },
	};

	it('returns daily format', () => {
		expect(getFormatForPeriod(settings, 'daily')).toBe('DD-MM-YYYY');
	});

	it('returns weekly format', () => {
		expect(getFormatForPeriod(settings, 'weekly')).toBe('YYYY/[W]WW');
	});

	it('returns monthly format', () => {
		expect(getFormatForPeriod(settings, 'monthly')).toBe('YYYY/MM-MMM');
	});

	it('returns quarterly format', () => {
		expect(getFormatForPeriod(settings, 'quarterly')).toBe('YYYY/[Q]Q');
	});
});

describe('getTemplatePathForPeriod', () => {
	const settings: PeriodicNotesSettings = {
		folder: '',
		daily: { format: 'DD-MM-YYYY', template: '', templatePath: '_templates/Daily.md' },
		weekly: { format: 'WW', templatePath: '_templates/Weekly.md' },
		monthly: { format: 'MM' },
		quarterly: { format: 'Q' },
		yearly: { format: 'YYYY/YYYY' },
	};

	it('returns template path when set', () => {
		expect(getTemplatePathForPeriod(settings, 'daily')).toBe('_templates/Daily.md');
		expect(getTemplatePathForPeriod(settings, 'weekly')).toBe('_templates/Weekly.md');
	});

	it('returns undefined when not set', () => {
		expect(getTemplatePathForPeriod(settings, 'monthly')).toBeUndefined();
		expect(getTemplatePathForPeriod(settings, 'quarterly')).toBeUndefined();
	});
});

describe('getDailyInlineTemplate', () => {
	it('returns the daily inline template', () => {
		const settings: PeriodicNotesSettings = {
			folder: '',
			daily: { format: 'DD-MM-YYYY', template: '# Hello' },
			weekly: { format: 'WW' },
			monthly: { format: 'MM' },
			quarterly: { format: 'Q' },
			yearly: { format: 'YYYY/YYYY' },
		};
		expect(getDailyInlineTemplate(settings)).toBe('# Hello');
	});
});

describe('buildPeriodicNotePathForDate', () => {
	it('builds path from a dateKey string', () => {
		const result = buildPeriodicNotePathForDate('/vault', '_notes', 'DD-MM-YYYY', '2026-02-09');
		expect(result).toBe('/vault/_notes/09-02-2026.md');
	});

	it('builds path at vault root when folder is empty', () => {
		const result = buildPeriodicNotePathForDate('/vault', '', 'YYYY-MM-DD', '2026-03-15');
		expect(result).toBe('/vault/2026-03-15.md');
	});

	it('builds path with nested format', () => {
		const result = buildPeriodicNotePathForDate('/vault', '_notes', 'YYYY/MM-MMM/[_journal-day-]DD-MM-YYYY', '2026-02-09');
		expect(result).toBe('/vault/_notes/2026/02-Feb/_journal-day-09-02-2026.md');
	});
});

// --- Etapa 3: Template Variables for Navigation ---

const defaultSettings: PeriodicNotesSettings = {
	folder: '_notes',
	daily: {
		format: 'YYYY/MM-MMM/[_journal-day-]DD-MM-YYYY',
		template: '',
	},
	weekly: {
		format: 'YYYY/MM-MMM/[__journal-week-]WW[-]YYYY',
	},
	monthly: {
		format: 'YYYY/MM-MMM/MM-MMM',
	},
	quarterly: {
		format: 'YYYY/[_journal-quarter-]YYYY[-Q]Q',
	},
	yearly: {
		format: 'YYYY/YYYY',
	},
};

describe('buildWikilinkPath', () => {
	it('builds path with folder', () => {
		const result = buildWikilinkPath('_notes', 'DD-MM-YYYY', fixedDate);
		expect(result).toBe('_notes/09-02-2026');
	});

	it('builds path without folder', () => {
		const result = buildWikilinkPath('', 'DD-MM-YYYY', fixedDate);
		expect(result).toBe('09-02-2026');
	});

	it('builds path with nested format', () => {
		const result = buildWikilinkPath('_notes', 'YYYY/MM-MMM/[_journal-day-]DD-MM-YYYY', fixedDate);
		expect(result).toBe('_notes/2026/02-Feb/_journal-day-09-02-2026');
	});
});

describe('buildPeriodicVariables', () => {
	describe('common variables', () => {
		it('generates year, month, monthName, week, quarter for all types', () => {
			const vars = buildPeriodicVariables('daily', fixedDate, defaultSettings);
			expect(vars.year).toBe('2026');
			expect(vars.month).toBe('02');
			expect(vars.monthName).toBe('February');
			expect(vars.week).toBe('07');
			expect(vars.quarter).toBe('1');
		});

		it('generates yearPath for all types', () => {
			const vars = buildPeriodicVariables('daily', fixedDate, defaultSettings);
			expect(vars.yearPath).toBe('_notes/2026/2026');
		});

		it('generates yearPath without folder', () => {
			const noFolderSettings = { ...defaultSettings, folder: '' };
			const vars = buildPeriodicVariables('daily', fixedDate, noFolderSettings);
			expect(vars.yearPath).toBe('2026/2026');
		});
	});

	describe('daily navigation variables', () => {
		it('generates yesterdayPath and tomorrowPath', () => {
			const vars = buildPeriodicVariables('daily', fixedDate, defaultSettings);
			expect(vars.yesterdayPath).toBe('_notes/2026/02-Feb/_journal-day-08-02-2026');
			expect(vars.tomorrowPath).toBe('_notes/2026/02-Feb/_journal-day-10-02-2026');
		});

		it('generates weekPath, monthPath, quarterPath', () => {
			const vars = buildPeriodicVariables('daily', fixedDate, defaultSettings);
			expect(vars.weekPath).toBe('_notes/2026/02-Feb/__journal-week-07-2026');
			expect(vars.monthPath).toBe('_notes/2026/02-Feb/02-Feb');
			expect(vars.quarterPath).toBe('_notes/2026/_journal-quarter-2026-Q1');
		});

		it('does not include weekly/monthly/quarterly-specific variables', () => {
			const vars = buildPeriodicVariables('daily', fixedDate, defaultSettings);
			expect(vars.prevWeekPath).toBeUndefined();
			expect(vars.dailyLinksTable).toBeUndefined();
			expect(vars.weeklyLinksTable).toBeUndefined();
			expect(vars.monthlyLinksTable).toBeUndefined();
		});
	});

	describe('weekly navigation variables', () => {
		it('generates prevWeekPath and nextWeekPath', () => {
			const vars = buildPeriodicVariables('weekly', fixedDate, defaultSettings);
			expect(vars.prevWeekPath).toBe('_notes/2026/02-Feb/__journal-week-06-2026');
			expect(vars.nextWeekPath).toBe('_notes/2026/02-Feb/__journal-week-08-2026');
		});

		it('generates monthPath and quarterPath', () => {
			const vars = buildPeriodicVariables('weekly', fixedDate, defaultSettings);
			expect(vars.monthPath).toBe('_notes/2026/02-Feb/02-Feb');
			expect(vars.quarterPath).toBe('_notes/2026/_journal-quarter-2026-Q1');
		});

		it('generates dailyLinksTable', () => {
			const vars = buildPeriodicVariables('weekly', fixedDate, defaultSettings);
			expect(vars.dailyLinksTable).toBeDefined();
			expect(vars.dailyLinksTable).toContain('| Day | Link |');
			expect(vars.dailyLinksTable).toContain('Monday');
			expect(vars.dailyLinksTable).toContain('Sunday');
		});
	});

	describe('monthly navigation variables', () => {
		it('generates prevMonthPath and nextMonthPath', () => {
			const vars = buildPeriodicVariables('monthly', fixedDate, defaultSettings);
			expect(vars.prevMonthPath).toBe('_notes/2026/01-Jan/01-Jan');
			expect(vars.nextMonthPath).toBe('_notes/2026/03-Mar/03-Mar');
		});

		it('generates quarterPath', () => {
			const vars = buildPeriodicVariables('monthly', fixedDate, defaultSettings);
			expect(vars.quarterPath).toBe('_notes/2026/_journal-quarter-2026-Q1');
		});

		it('generates weeklyLinksTable', () => {
			const vars = buildPeriodicVariables('monthly', fixedDate, defaultSettings);
			expect(vars.weeklyLinksTable).toBeDefined();
			expect(vars.weeklyLinksTable).toContain('| Week | Link |');
		});
	});

	describe('quarterly navigation variables', () => {
		it('generates prevQuarterPath and nextQuarterPath', () => {
			const vars = buildPeriodicVariables('quarterly', fixedDate, defaultSettings);
			expect(vars.prevQuarterPath).toBe('_notes/2025/_journal-quarter-2025-Q4');
			expect(vars.nextQuarterPath).toBe('_notes/2026/_journal-quarter-2026-Q2');
		});

		it('generates monthlyLinksTable', () => {
			const vars = buildPeriodicVariables('quarterly', fixedDate, defaultSettings);
			expect(vars.monthlyLinksTable).toBeDefined();
			expect(vars.monthlyLinksTable).toContain('| Month | Link |');
			expect(vars.monthlyLinksTable).toContain('January');
			expect(vars.monthlyLinksTable).toContain('February');
			expect(vars.monthlyLinksTable).toContain('March');
		});
	});

	describe('yearly navigation variables', () => {
		it('generates prevYearPath and nextYearPath', () => {
			const vars = buildPeriodicVariables('yearly', fixedDate, defaultSettings);
			expect(vars.prevYearPath).toBe('_notes/2025/2025');
			expect(vars.nextYearPath).toBe('_notes/2027/2027');
		});

		it('generates yearPath using yearly format from settings', () => {
			const vars = buildPeriodicVariables('yearly', fixedDate, defaultSettings);
			expect(vars.yearPath).toBe('_notes/2026/2026');
		});

		it('generates quarterlyLinksTable', () => {
			const vars = buildPeriodicVariables('yearly', fixedDate, defaultSettings);
			expect(vars.quarterlyLinksTable).toBeDefined();
			expect(vars.quarterlyLinksTable).toContain('| Quarter | Link |');
			expect(vars.quarterlyLinksTable).toContain('Q1');
			expect(vars.quarterlyLinksTable).toContain('Q2');
			expect(vars.quarterlyLinksTable).toContain('Q3');
			expect(vars.quarterlyLinksTable).toContain('Q4');
		});

		it('does not include lower-level variables', () => {
			const vars = buildPeriodicVariables('yearly', fixedDate, defaultSettings);
			expect(vars.prevQuarterPath).toBeUndefined();
			expect(vars.monthlyLinksTable).toBeUndefined();
			expect(vars.weeklyLinksTable).toBeUndefined();
			expect(vars.dailyLinksTable).toBeUndefined();
		});
	});
});

describe('buildDailyLinksTable', () => {
	it('generates 7 rows for Mon-Sun of the week', () => {
		const table = buildDailyLinksTable('_notes', 'YYYY/MM-MMM/[_journal-day-]DD-MM-YYYY', fixedDate);
		const lines = table.split('\n');
		// header + separator + 7 data rows
		expect(lines).toHaveLength(9);
		expect(lines[0]).toBe('| Day | Link |');
		expect(lines[1]).toBe('|-----|------|');
	});

	// Feb 9, 2026 is a Monday — the week is Mon Feb 9 to Sun Feb 15
	it('starts from Monday of the ISO week', () => {
		const table = buildDailyLinksTable('_notes', 'YYYY/MM-MMM/[_journal-day-]DD-MM-YYYY', fixedDate);
		expect(table).toContain('| Monday | [[_notes/2026/02-Feb/_journal-day-09-02-2026|Mon 09]] |');
		expect(table).toContain('| Sunday | [[_notes/2026/02-Feb/_journal-day-15-02-2026|Sun 15]] |');
	});

	it('works without folder', () => {
		const table = buildDailyLinksTable('', 'DD-MM-YYYY', fixedDate);
		expect(table).toContain('| Monday | [[09-02-2026|Mon 09]] |');
	});
});

describe('buildWeeklyLinksTable', () => {
	it('generates rows for all weeks overlapping the month', () => {
		const table = buildWeeklyLinksTable('_notes', 'YYYY/MM-MMM/[__journal-week-]WW[-]YYYY', fixedDate);
		const lines = table.split('\n');
		// Feb 2026: starts Sunday Feb 1 → first week Mon Jan 26 (W05), last day Sat Feb 28 → Mon Feb 23 (W09)
		// Weeks: W05, W06, W07, W08, W09 = 5 weeks
		expect(lines).toHaveLength(7); // header + separator + 5 data rows
		expect(lines[0]).toBe('| Week | Link |');
	});

	it('contains correct week numbers', () => {
		const table = buildWeeklyLinksTable('_notes', 'YYYY/MM-MMM/[__journal-week-]WW[-]YYYY', fixedDate);
		expect(table).toContain('Week 05');
		expect(table).toContain('Week 09');
	});
});

describe('buildMonthlyLinksTable', () => {
	it('generates 3 rows for the quarter months', () => {
		const table = buildMonthlyLinksTable('_notes', 'YYYY/MM-MMM/MM-MMM', fixedDate);
		const lines = table.split('\n');
		// header + separator + 3 data rows
		expect(lines).toHaveLength(5);
		expect(lines[0]).toBe('| Month | Link |');
	});

	it('lists the correct months for Q1', () => {
		const table = buildMonthlyLinksTable('_notes', 'YYYY/MM-MMM/MM-MMM', fixedDate);
		expect(table).toContain('| January | [[_notes/2026/01-Jan/01-Jan|January]] |');
		expect(table).toContain('| February | [[_notes/2026/02-Feb/02-Feb|February]] |');
		expect(table).toContain('| March | [[_notes/2026/03-Mar/03-Mar|March]] |');
	});

	it('lists correct months for Q4', () => {
		const q4Date = dayjs(new Date(2026, 9, 15)); // Oct 15, 2026
		const table = buildMonthlyLinksTable('_notes', 'YYYY/MM-MMM/MM-MMM', q4Date);
		expect(table).toContain('October');
		expect(table).toContain('November');
		expect(table).toContain('December');
	});
});

describe('buildQuarterlyLinksTable', () => {
	it('generates 4 rows for the year quarters', () => {
		const table = buildQuarterlyLinksTable('_notes', 'YYYY/[_journal-quarter-]YYYY[-Q]Q', fixedDate);
		const lines = table.split('\n');
		// header + separator + 4 data rows
		expect(lines).toHaveLength(6);
		expect(lines[0]).toBe('| Quarter | Link |');
		expect(lines[1]).toBe('|---------|------|');
	});

	it('lists all 4 quarters with correct links', () => {
		const table = buildQuarterlyLinksTable('_notes', 'YYYY/[_journal-quarter-]YYYY[-Q]Q', fixedDate);
		expect(table).toContain('| Q1 | [[_notes/2026/_journal-quarter-2026-Q1|Q1 2026]] |');
		expect(table).toContain('| Q2 | [[_notes/2026/_journal-quarter-2026-Q2|Q2 2026]] |');
		expect(table).toContain('| Q3 | [[_notes/2026/_journal-quarter-2026-Q3|Q3 2026]] |');
		expect(table).toContain('| Q4 | [[_notes/2026/_journal-quarter-2026-Q4|Q4 2026]] |');
	});

	it('works without folder', () => {
		const table = buildQuarterlyLinksTable('', 'YYYY/[Q]Q', fixedDate);
		expect(table).toContain('| Q1 | [[2026/Q1|Q1 2026]] |');
	});
});

describe('detectPeriodicNoteType', () => {
	it('detects daily note from wikilink target', () => {
		const result = detectPeriodicNoteType('_notes/2026/02-Feb/_journal-day-14-02-2026', defaultSettings);
		expect(result).not.toBeNull();
		expect(result!.periodType).toBe('daily');
		expect(result!.date.year()).toBe(2026);
		expect(result!.date.month()).toBe(1); // 0-indexed Feb
		expect(result!.date.date()).toBe(14);
	});

	it('detects weekly note from wikilink target', () => {
		const result = detectPeriodicNoteType('_notes/2026/02-Feb/__journal-week-07-2026', defaultSettings);
		expect(result).not.toBeNull();
		expect(result!.periodType).toBe('weekly');
		expect(result!.date.year()).toBe(2026);
		expect(result!.date.isoWeek()).toBe(7);
	});

	it('detects monthly note from wikilink target', () => {
		const result = detectPeriodicNoteType('_notes/2026/02-Feb/02-Feb', defaultSettings);
		expect(result).not.toBeNull();
		expect(result!.periodType).toBe('monthly');
		expect(result!.date.year()).toBe(2026);
		expect(result!.date.month()).toBe(1); // 0-indexed Feb
	});

	it('detects quarterly note from wikilink target', () => {
		const result = detectPeriodicNoteType('_notes/2026/_journal-quarter-2026-Q1', defaultSettings);
		expect(result).not.toBeNull();
		expect(result!.periodType).toBe('quarterly');
		expect(result!.date.year()).toBe(2026);
		expect(result!.date.quarter()).toBe(1);
	});

	it('returns null for non-matching paths', () => {
		expect(detectPeriodicNoteType('_notes/random-file', defaultSettings)).toBeNull();
		expect(detectPeriodicNoteType('other-folder/2026/02-Feb/_journal-day-14-02-2026', defaultSettings)).toBeNull();
		expect(detectPeriodicNoteType('', defaultSettings)).toBeNull();
	});

	it('returns null when path does not start with folder prefix', () => {
		expect(detectPeriodicNoteType('2026/02-Feb/_journal-day-14-02-2026', defaultSettings)).toBeNull();
	});

	it('works with empty folder setting', () => {
		const noFolderSettings = { ...defaultSettings, folder: '' };
		const result = detectPeriodicNoteType('2026/02-Feb/_journal-day-14-02-2026', noFolderSettings);
		expect(result).not.toBeNull();
		expect(result!.periodType).toBe('daily');
		expect(result!.date.date()).toBe(14);
	});

	it('detects daily note for different dates', () => {
		const result = detectPeriodicNoteType('_notes/2026/01-Jan/_journal-day-01-01-2026', defaultSettings);
		expect(result).not.toBeNull();
		expect(result!.periodType).toBe('daily');
		expect(result!.date.year()).toBe(2026);
		expect(result!.date.month()).toBe(0); // January
		expect(result!.date.date()).toBe(1);
	});

	it('detects Q4 quarterly note', () => {
		const result = detectPeriodicNoteType('_notes/2026/_journal-quarter-2026-Q4', defaultSettings);
		expect(result).not.toBeNull();
		expect(result!.periodType).toBe('quarterly');
		expect(result!.date.quarter()).toBe(4);
	});

	it('detects daily note with MMMM (full month name) format', () => {
		const mmmmSettings: PeriodicNotesSettings = {
			...defaultSettings,
			daily: { format: 'YYYY/MMMM/DD', template: '' },
		};
		const result = detectPeriodicNoteType('_notes/2026/February/14', mmmmSettings);
		expect(result).not.toBeNull();
		expect(result!.periodType).toBe('daily');
		expect(result!.date.month()).toBe(1); // 0-indexed Feb
		expect(result!.date.date()).toBe(14);
	});

	it('detects yearly note from wikilink target', () => {
		const result = detectPeriodicNoteType('_notes/2026/2026', defaultSettings);
		expect(result).not.toBeNull();
		expect(result!.periodType).toBe('yearly');
		expect(result!.date.year()).toBe(2026);
	});
});
