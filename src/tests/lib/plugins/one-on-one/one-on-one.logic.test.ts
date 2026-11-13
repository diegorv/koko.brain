import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import {
	buildOneOnOnePath,
	buildOneOnOneVariables,
	buildMyPeople,
	loadPeopleFromEntries,
	myPeopleDaysLabel,
	filterPeople,
	mergePeopleLists,
	type PersonEntry,
} from '#lib/plugins/one-on-one/one-on-one.logic.js';
import type { PeriodicNotesSettings } from '#lib/core/settings/settings.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

dayjs.extend(advancedFormat);
dayjs.extend(quarterOfYear);

const fixedDate = dayjs('2026-02-11T14:30:45.123');

describe('buildOneOnOnePath', () => {
	it('builds full path with base folder, date folder, person name, and date', () => {
		const result = buildOneOnOnePath(
			'/vault', '_notes', 'YYYY/MM-MMM',
			'[-1on1-]{person}[-]DD-MM-YYYY',
			'John',
			fixedDate,
		);
		expect(result).toBe('/vault/_notes/2026/02-Feb/-1on1-John-11-02-2026.md');
	});

	it('builds path without base folder', () => {
		const result = buildOneOnOnePath(
			'/vault', '', 'YYYY/MM-MMM',
			'[-1on1-]{person}[-]DD-MM-YYYY',
			'Jane',
			fixedDate,
		);
		expect(result).toBe('/vault/2026/02-Feb/-1on1-Jane-11-02-2026.md');
	});

	it('builds path without folder format', () => {
		const result = buildOneOnOnePath(
			'/vault', '_notes', '',
			'[-1on1-]{person}[-]DD-MM-YYYY',
			'Alice',
			fixedDate,
		);
		expect(result).toBe('/vault/_notes/-1on1-Alice-11-02-2026.md');
	});

	it('handles person names with spaces', () => {
		const result = buildOneOnOnePath(
			'/vault', '_notes', 'YYYY/MM-MMM',
			'[-1on1-]{person}[-]DD-MM-YYYY',
			'John Doe',
			fixedDate,
		);
		expect(result).toBe('/vault/_notes/2026/02-Feb/-1on1-John Doe-11-02-2026.md');
	});

	it('handles empty person name', () => {
		const result = buildOneOnOnePath(
			'/vault', '_notes', '',
			'[-1on1-]{person}[-]DD-MM-YYYY',
			'',
			fixedDate,
		);
		// Empty name is wrapped in [] for dayjs escaping, resulting in literal "[]"
		expect(result).toBe('/vault/_notes/-1on1-[]-11-02-2026.md');
	});

	it('handles format without {person} placeholder', () => {
		const result = buildOneOnOnePath(
			'/vault', '', '', 'DD-MM-YYYY', 'John', fixedDate,
		);
		expect(result).toBe('/vault/11-02-2026.md');
	});
});

describe('buildOneOnOneVariables', () => {
	const settings: PeriodicNotesSettings = {
		folder: '_notes',
		daily: {
			format: 'YYYY/MM-MMM/[_journal-day-]DD-MM-YYYY',
			template: '',
		},
		weekly: { format: 'YYYY/MM-MMM/[__journal-week-]WW[-]YYYY' },
		monthly: { format: 'YYYY/MM-MMM/MM-MMM' },
		quarterly: { format: 'YYYY/[_journal-quarter-]YYYY[-Q]Q' },
		yearly: { format: 'YYYY/YYYY' },
	};

	it('includes created timestamp', () => {
		const vars = buildOneOnOneVariables(fixedDate, 'John', settings);
		expect(vars.created).toBe('2026-02-11T14:30:45');
	});

	it('includes year, month, monthName', () => {
		const vars = buildOneOnOneVariables(fixedDate, 'John', settings);
		expect(vars.year).toBe('2026');
		expect(vars.month).toBe('02');
		expect(vars.monthName).toBe('February');
	});

	it('includes person name', () => {
		const vars = buildOneOnOneVariables(fixedDate, 'Jane Doe', settings);
		expect(vars.person).toBe('Jane Doe');
	});

	it('includes dailyNotePath as wikilink path', () => {
		const vars = buildOneOnOneVariables(fixedDate, 'John', settings);
		expect(vars.dailyNotePath).toBe('_notes/2026/02-Feb/_journal-day-11-02-2026');
	});

	it('includes dailyNoteDisplay as formatted date', () => {
		const vars = buildOneOnOneVariables(fixedDate, 'John', settings);
		expect(vars.dailyNoteDisplay).toBe('11-02-2026');
	});

	it('does not throw when daily.format is empty (dayjs falls back to ISO output)', () => {
		// An empty format string is falsy, so dayjs.format('') uses its
		// default ISO-8601 output instead of producing an empty filename.
		const emptyFormat: PeriodicNotesSettings = {
			...settings,
			daily: { format: '', template: '' },
		};

		const vars = buildOneOnOneVariables(fixedDate, 'John', emptyFormat);

		expect(vars.dailyNotePath.startsWith('_notes/2026-02-11T14:30:45')).toBe(true);
	});

	it('builds a bare ISO dailyNotePath when both folder and daily.format are empty', () => {
		const bare: PeriodicNotesSettings = {
			...settings,
			folder: '',
			daily: { format: '', template: '' },
		};

		const vars = buildOneOnOneVariables(fixedDate, 'John', bare);

		// No folder prefix and no slash separator leaks in
		expect(vars.dailyNotePath.startsWith('2026-02-11T14:30:45')).toBe(true);
		expect(vars.dailyNotePath.startsWith('/')).toBe(false);
		// Remaining variables are unaffected by the empty daily format
		expect(vars.person).toBe('John');
		expect(vars.year).toBe('2026');
		expect(vars.dailyNoteDisplay).toBe('11-02-2026');
	});
});

describe('loadPeopleFromEntries', () => {
	it('filters and sorts .md files from directory entries with work context', () => {
		const entries = [
			{ name: 'Charlie.md', isDirectory: false },
			{ name: 'Alice.md', isDirectory: false },
			{ name: 'subfolder', isDirectory: true },
			{ name: 'Bob.md', isDirectory: false },
			{ name: '.DS_Store', isDirectory: false },
		];

		const result = loadPeopleFromEntries(entries, '/vault/_people-work', 'work');

		expect(result).toEqual([
			{ name: 'Alice', path: '/vault/_people-work/Alice.md', context: 'work' },
			{ name: 'Bob', path: '/vault/_people-work/Bob.md', context: 'work' },
			{ name: 'Charlie', path: '/vault/_people-work/Charlie.md', context: 'work' },
		]);
	});

	it('filters and sorts .md files with personal context', () => {
		const entries = [
			{ name: 'Zara.md', isDirectory: false },
			{ name: 'Maria.md', isDirectory: false },
		];

		const result = loadPeopleFromEntries(entries, '/vault/_people', 'personal');

		expect(result).toEqual([
			{ name: 'Maria', path: '/vault/_people/Maria.md', context: 'personal' },
			{ name: 'Zara', path: '/vault/_people/Zara.md', context: 'personal' },
		]);
	});

	it('returns empty array for empty entries', () => {
		const result = loadPeopleFromEntries([], '/vault/_people', 'personal');
		expect(result).toEqual([]);
	});

	it('returns empty array when no .md files exist', () => {
		const entries = [
			{ name: 'subfolder', isDirectory: true },
			{ name: '.DS_Store', isDirectory: false },
		];
		const result = loadPeopleFromEntries(entries, '/vault/_people', 'personal');
		expect(result).toEqual([]);
	});

	it('handles files with multiple extensions', () => {
		const entries = [
			{ name: 'backup.old.md', isDirectory: false },
		];
		const result = loadPeopleFromEntries(entries, '/vault/_people', 'work');
		expect(result).toEqual([{ name: 'backup.old', path: '/vault/_people/backup.old.md', context: 'work' }]);
	});
});

describe('mergePeopleLists', () => {
	it('puts work people first, then personal people', () => {
		const work: PersonEntry[] = [
			{ name: 'Alice', path: '/vault/_people-work/Alice.md', context: 'work' },
			{ name: 'Bob', path: '/vault/_people-work/Bob.md', context: 'work' },
		];
		const personal: PersonEntry[] = [
			{ name: 'Charlie', path: '/vault/_people/Charlie.md', context: 'personal' },
		];

		const result = mergePeopleLists(work, personal);

		expect(result).toHaveLength(3);
		expect(result[0]).toEqual(work[0]);
		expect(result[1]).toEqual(work[1]);
		expect(result[2]).toEqual(personal[0]);
	});

	it('returns only work people when personal list is empty', () => {
		const work: PersonEntry[] = [
			{ name: 'Alice', path: '/vault/_people-work/Alice.md', context: 'work' },
		];
		const result = mergePeopleLists(work, []);
		expect(result).toEqual(work);
	});

	it('returns only personal people when work list is empty', () => {
		const personal: PersonEntry[] = [
			{ name: 'Bob', path: '/vault/_people/Bob.md', context: 'personal' },
		];
		const result = mergePeopleLists([], personal);
		expect(result).toEqual(personal);
	});

	it('returns empty array when both lists are empty', () => {
		expect(mergePeopleLists([], [])).toEqual([]);
	});
});

describe('filterPeople', () => {
	const people: PersonEntry[] = [
		{ name: 'Alice Smith', path: '/vault/_people-work/Alice Smith.md', context: 'work' },
		{ name: 'Bob Jones', path: '/vault/_people-work/Bob Jones.md', context: 'work' },
		{ name: 'Charlie Brown', path: '/vault/_people/Charlie Brown.md', context: 'personal' },
	];

	it('returns all people when query is empty', () => {
		expect(filterPeople('', people)).toEqual(people);
	});

	it('returns all people when query is whitespace', () => {
		expect(filterPeople('  ', people)).toEqual(people);
	});

	it('filters by case-insensitive substring match', () => {
		const result = filterPeople('ali', people);
		expect(result).toEqual([people[0]]);
	});

	it('returns multiple matches', () => {
		const result = filterPeople('o', people);
		expect(result).toEqual([people[1], people[2]]);
	});

	it('returns empty array when nothing matches', () => {
		const result = filterPeople('xyz', people);
		expect(result).toEqual([]);
	});
});

describe('buildMyPeople', () => {
	const PEOPLE = '/vault/Work/_people';
	const OPTIONS = { vaultPath: '/vault', workPeopleFolder: 'Work/_people', todayKey: '2026-11-01', dueAfterDays: 14 };

	function person(name: string) {
		return entryV2(`${PEOPLE}/${name}.md`, { isA: 'Person' });
	}

	it('counts a note whose _related_to links the person, wherever it lives', () => {
		const rows = buildMyPeople(
			[person('Ana'), entryV2('/vault/Somewhere/deep/sync.md', { relatedTo: ['Ana'], frontmatter: { date: '2026-10-27' } })],
			OPTIONS,
		);
		expect(rows).toEqual([{ name: 'Ana', path: `${PEOPLE}/Ana.md`, lastDate: '2026-10-27', days: 5, overdue: false }]);
	});

	it('gives no row for a view in the people folder', () => {
		const rows = buildMyPeople([person('Ana'), entryV2(`${PEOPLE}/Team.view`), entryV2(`${PEOPLE}/Other.VIEW`)], OPTIONS);

		expect(rows.map((r) => r.name)).toEqual(['Ana']);
	});

	it('gives no rows for a people folder holding only a view', () => {
		expect(buildMyPeople([entryV2(`${PEOPLE}/Team.view`)], OPTIONS)).toEqual([]);
	});

	it('does not count a daily note that only mentions the person in its body', () => {
		const daily = entryV2('/vault/_notes/2026/10-Oct/2026-10-31.md', {
			frontmatter: { date: '2026-10-31' },
			outgoingLinks: [{ target: 'Ana', alias: null, heading: null, position: 0 }],
		});
		const [row] = buildMyPeople([person('Ana'), daily], OPTIONS);
		expect(row.lastDate).toBeNull();
		expect(row.days).toBeNull();
	});

	it('takes the latest note date among the 1:1s', () => {
		const rows = buildMyPeople(
			[
				person('Ana'),
				entryV2('/vault/a.md', { relatedTo: ['Ana'], frontmatter: { date: '2026-10-13' } }),
				entryV2('/vault/b.md', { relatedTo: ['Ana', 'Promo'], frontmatter: { date: '2026-10-27' } }),
				entryV2('/vault/c.md', { relatedTo: ['Ana'], frontmatter: { created: '2026-10-20T09:00:00' } }),
			],
			OPTIONS,
		);
		expect(rows[0].lastDate).toBe('2026-10-27');
		expect(rows[0].days).toBe(5);
	});

	it('matches the link case-insensitively, ignoring a folder prefix and .md', () => {
		const rows = buildMyPeople(
			[person('Ana Souza'), entryV2('/vault/a.md', { relatedTo: ['Work/_people/ana souza.md'], frontmatter: { date: '2026-10-30' } })],
			OPTIONS,
		);
		expect(rows[0].days).toBe(2);
	});

	it('gives "never" (null days, flagged) when the person has no 1:1', () => {
		const rows = buildMyPeople([person('Ana'), entryV2('/vault/x.md', { relatedTo: ['Bruno'], frontmatter: { date: '2026-10-30' } })], OPTIONS);
		expect(rows).toEqual([{ name: 'Ana', path: `${PEOPLE}/Ana.md`, lastDate: null, days: null, overdue: true }]);
	});

	it('does not count a 1:1 dated after today', () => {
		const rows = buildMyPeople(
			[
				person('Ana'),
				entryV2('/vault/past.md', { relatedTo: ['Ana'], frontmatter: { date: '2026-10-25' } }),
				entryV2('/vault/next.md', { relatedTo: ['Ana'], frontmatter: { date: '2026-11-08' } }),
			],
			OPTIONS,
		);
		expect(rows[0].lastDate).toBe('2026-10-25');
	});

	it('flags past dueAfterDays only: exactly dueAfterDays is not flagged, one more day is', () => {
		const at = (date: string) =>
			buildMyPeople([person('Ana'), entryV2('/vault/a.md', { relatedTo: ['Ana'], frontmatter: { date } })], OPTIONS)[0];
		expect(at('2026-10-18')).toMatchObject({ days: 14, overdue: false });
		expect(at('2026-10-17')).toMatchObject({ days: 15, overdue: true });
		expect(at('2026-11-01')).toMatchObject({ days: 0, overdue: false });
	});

	it('follows dueAfterDays', () => {
		const entries = [person('Ana'), entryV2('/vault/a.md', { relatedTo: ['Ana'], frontmatter: { date: '2026-10-25' } })];
		expect(buildMyPeople(entries, OPTIONS)[0].overdue).toBe(false);
		expect(buildMyPeople(entries, { ...OPTIONS, dueAfterDays: 5 })[0].overdue).toBe(true);
	});

	it('lists only the notes directly in the work people folder', () => {
		const rows = buildMyPeople(
			[
				person('Ana'),
				entryV2(`${PEOPLE}/archive/Old.md`),
				entryV2('/vault/Personal/_people/Mom.md'),
				entryV2('/vault/Work/_people-notes.md'),
			],
			{ ...OPTIONS, workPeopleFolder: '/Work/_people/' },
		);
		expect(rows.map((r) => r.name)).toEqual(['Ana']);
	});

	it('orders never first, then the oldest last 1:1, ties by name', () => {
		const rows = buildMyPeople(
			[
				person('Carla'),
				person('Bruno'),
				person('Ana'),
				person('Dani'),
				entryV2('/vault/1.md', { relatedTo: ['Carla'], frontmatter: { date: '2026-10-30' } }),
				entryV2('/vault/2.md', { relatedTo: ['Ana'], frontmatter: { date: '2026-10-10' } }),
				entryV2('/vault/3.md', { relatedTo: ['Bruno'], frontmatter: { date: '2026-10-30' } }),
			],
			OPTIONS,
		);
		expect(rows.map((r) => r.name)).toEqual(['Dani', 'Ana', 'Bruno', 'Carla']);
	});

	it('returns no rows for an empty vault, a blank folder setting or no vault', () => {
		expect(buildMyPeople([], OPTIONS)).toEqual([]);
		expect(buildMyPeople([person('Ana')], { ...OPTIONS, workPeopleFolder: '' })).toEqual([]);
		expect(buildMyPeople([person('Ana')], { ...OPTIONS, vaultPath: null })).toEqual([]);
	});

	it('returns no days for an unparseable today key', () => {
		const rows = buildMyPeople([person('Ana'), entryV2('/vault/a.md', { relatedTo: ['Ana'], frontmatter: { date: '2026-10-25' } })], {
			...OPTIONS,
			todayKey: 'not-a-day',
		});
		expect(rows).toEqual([{ name: 'Ana', path: `${PEOPLE}/Ana.md`, lastDate: null, days: null, overdue: true }]);
	});
});

describe('myPeopleDaysLabel', () => {
	it('shows days as Nd and no 1:1 as never', () => {
		expect(myPeopleDaysLabel(0)).toBe('0d');
		expect(myPeopleDaysLabel(15)).toBe('15d');
		expect(myPeopleDaysLabel(null)).toBe('never');
	});
});
