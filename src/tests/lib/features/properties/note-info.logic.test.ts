import { describe, it, expect } from 'vitest';
import { buildNoteInfoRows } from '#lib/features/properties/note-info.logic.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

/** Local-time instant as the seconds-since-epoch `NoteEntryV2` timestamps carry. */
function seconds(year: number, monthIndex: number, day: number, hour = 12, minute = 0): number {
	return new Date(year, monthIndex, day, hour, minute).getTime() / 1000;
}

/** 13:52 as the system's clock prints it, 12-hour or 24-hour. */
const AFTERNOON_TIME = /(0?1:52\sPM|13:52)$/;
/** 09:05 as the system's clock prints it, 12-hour or 24-hour. */
const MORNING_TIME = /(0?9:05\sAM|09:05)$/;

describe('buildNoteInfoRows', () => {
	it('formats modified, created, words and size in that order', () => {
		const entry = entryV2('/vault/note.md', {
			modifiedAt: seconds(2026, 10, 5, 13, 52),
			createdAt: seconds(2026, 4, 12, 9, 5),
			wordCount: 167,
			size: 1126,
		});

		const [modified, created, words, size] = buildNoteInfoRows(entry);

		expect(modified.label).toBe('Modified');
		expect(modified.value).toMatch(/^November 5, 2026, /);
		expect(modified.value).toMatch(AFTERNOON_TIME);
		expect(created.label).toBe('Created');
		expect(created.value).toMatch(/^May 12, 2026, /);
		expect(created.value).toMatch(MORNING_TIME);
		expect(words).toEqual({ label: 'Words', value: '167' });
		expect(size).toEqual({ label: 'Size', value: '1.1 KB' });
	});

	it('shows a placeholder for every value when the note is not indexed', () => {
		expect(buildNoteInfoRows(null)).toEqual([
			{ label: 'Modified', value: '--' },
			{ label: 'Created', value: '--' },
			{ label: 'Words', value: '--' },
			{ label: 'Size', value: '--' },
		]);
	});

	it('shows a placeholder for a timestamp the filesystem does not expose', () => {
		const rows = buildNoteInfoRows(entryV2('/vault/note.md', { modifiedAt: seconds(2026, 10, 5), createdAt: 0 }));

		expect(rows.find((r) => r.label === 'Created')?.value).toBe('--');
		expect(rows.find((r) => r.label === 'Modified')?.value).toMatch(/^November 5, 2026, /);
	});

	it('shows zero words and bytes for an empty note', () => {
		const rows = buildNoteInfoRows(entryV2('/vault/empty.md'));

		expect(rows.find((r) => r.label === 'Words')?.value).toBe('0');
		expect(rows.find((r) => r.label === 'Size')?.value).toBe('0 B');
	});
});
