import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import advancedFormat from 'dayjs/plugin/advancedFormat';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import {
	buildQuickNotePath,
	getQuickNoteTitle,
	buildQuickNoteVariables,
} from '$lib/plugins/quick-note/quick-note.logic';
import type { PeriodicNotesSettings } from '$lib/core/settings/settings.types';

dayjs.extend(advancedFormat);
dayjs.extend(quarterOfYear);

// Fixed date with known milliseconds
const fixedDate = dayjs('2026-02-11T14:30:45.123');

describe('buildQuickNotePath', () => {
	it('builds full path with base folder, date folder, and filename', () => {
		const result = buildQuickNotePath(
			'/vault', '_notes', 'YYYY/MM-MMM',
			'[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS',
			fixedDate,
		);
		expect(result).toBe('/vault/_notes/2026/02-Feb/capture-note-2026-02-11_14-30-45-123.md');
	});

	it('builds path without base folder', () => {
		const result = buildQuickNotePath(
			'/vault', '', 'YYYY/MM-MMM',
			'[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS',
			fixedDate,
		);
		expect(result).toBe('/vault/2026/02-Feb/capture-note-2026-02-11_14-30-45-123.md');
	});

	it('builds path without folder format', () => {
		const result = buildQuickNotePath(
			'/vault', '_notes', '',
			'[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS',
			fixedDate,
		);
		expect(result).toBe('/vault/_notes/capture-note-2026-02-11_14-30-45-123.md');
	});

	it('builds path with all empty optional params', () => {
		const result = buildQuickNotePath('/vault', '', '', 'YYYY-MM-DD', fixedDate);
		expect(result).toBe('/vault/2026-02-11.md');
	});
});

describe('getQuickNoteTitle', () => {
	it('returns the formatted filename', () => {
		const title = getQuickNoteTitle('[capture-note-]YYYY-MM-DD[_]HH-mm-ss-SSS', fixedDate);
		expect(title).toBe('capture-note-2026-02-11_14-30-45-123');
	});

	it('returns ISO string for empty format', () => {
		const title = getQuickNoteTitle('', fixedDate);
		// dayjs.format('') returns ISO 8601 format
		expect(title).toContain('2026-02-11');
	});
});

describe('buildQuickNoteVariables', () => {
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
		const vars = buildQuickNoteVariables(fixedDate, settings);
		expect(vars.created).toBe('2026-02-11T14:30:45');
	});

	it('includes year, month, monthName', () => {
		const vars = buildQuickNoteVariables(fixedDate, settings);
		expect(vars.year).toBe('2026');
		expect(vars.month).toBe('02');
		expect(vars.monthName).toBe('February');
	});

	it('includes dailyNotePath as wikilink path', () => {
		const vars = buildQuickNoteVariables(fixedDate, settings);
		expect(vars.dailyNotePath).toBe('_notes/2026/02-Feb/_journal-day-11-02-2026');
	});

	it('includes dailyNoteDisplay as formatted date', () => {
		const vars = buildQuickNoteVariables(fixedDate, settings);
		expect(vars.dailyNoteDisplay).toBe('11-02-2026');
	});
});
