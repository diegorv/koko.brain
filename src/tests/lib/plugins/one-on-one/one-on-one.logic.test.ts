import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import {
	buildOneOnOnePath,
	buildOneOnOneVariables,
	loadPeopleFromEntries,
	filterPeople,
	mergePeopleLists,
	type PersonEntry,
} from '$lib/plugins/one-on-one/one-on-one.logic';
import type { PeriodicNotesSettings } from '$lib/core/settings/settings.types';

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
