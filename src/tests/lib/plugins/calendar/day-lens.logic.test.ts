import { describe, it, expect, vi, afterEach } from 'vitest';
import dayjs from 'dayjs';
import {
	DAY_LENS_KIND,
	dayNewNoteRule,
	noteDateCounts,
	parseRailDay,
	pickedDayLens,
	resolveDayLens,
} from '#lib/plugins/calendar/day-lens.logic.js';
import { newNoteContent, resolveLens, newNoteRule } from '#lib/features/rail-shell/lens.logic.js';
import { buildCapturePath } from '#lib/plugins/quick-capture/note-composer.logic.js';
import type { LensContext, NewNoteContext, PlainNewNoteRule } from '#lib/features/rail-shell/rail-shell.types.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const VAULT = '/vault';
const DAY = '2026-10-27';

/** Unix seconds of a local-time instant, the unit `NoteEntryV2.createdAt` uses. */
const localSeconds = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime() / 1000;

function ctx(entries: LensContext['entries'], systemFolder = '_system'): LensContext {
	return { entries, vaultPath: VAULT, systemFolder, typeMetadataMap: new Map(), fileTree: [] };
}

const dayLens = (target = DAY) => ({ kind: DAY_LENS_KIND, target });

/** One note per note-date source on the day, one per source on another day, and one with no day. */
function vault() {
	return [
		entryV2('/vault/by-date.md', { frontmatter: { date: DAY }, modifiedAt: 30 }),
		entryV2('/vault/by-created.md', { frontmatter: { created: `${DAY} 09:15` }, modifiedAt: 20 }),
		entryV2('/vault/by-disk.md', { createdAt: localSeconds(2026, 10, 27), modifiedAt: 10 }),
		// `date` wins over `created` and the disk time: this note belongs to the 28th.
		entryV2('/vault/date-wins.md', { frontmatter: { date: '2026-10-28', created: DAY }, createdAt: localSeconds(2026, 10, 27) }),
		entryV2('/vault/other-disk.md', { createdAt: localSeconds(2026, 10, 26) }),
		entryV2('/vault/no-day.md'),
	];
}

describe('resolveDayLens', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('lists exactly the notes whose note date is the day, newest change first', () => {
		const resolved = resolveDayLens(dayLens(), ctx(vault()));
		expect(resolved.notes.map((n) => n.path)).toEqual(['/vault/by-date.md', '/vault/by-created.md', '/vault/by-disk.md']);
	});

	it('labels the day and states the rule', () => {
		const resolved = resolveDayLens(dayLens(), ctx(vault()));
		expect(resolved.label).toBe('27 Oct 2026');
		expect(resolved.rule).toBe('note date is 2026-10-27');
	});

	it('leaves the system folder out and keeps archived notes', () => {
		const resolved = resolveDayLens(
			dayLens(),
			ctx([
				entryV2('/vault/_system/templates/Daily.md', { frontmatter: { date: DAY } }),
				entryV2('/vault/old.md', { frontmatter: { date: DAY }, archived: true }),
			]),
		);
		expect(resolved.notes.map((n) => n.path)).toEqual(['/vault/old.md']);
	});

	it('leaves out a type definition and a .view created that day with no date', () => {
		const created = localSeconds(2026, 10, 27);
		const resolved = resolveDayLens(
			dayLens(),
			ctx([
				entryV2('/vault/types/Project.md', { isA: 'Type', createdAt: created }),
				entryV2('/vault/Projects.view', { createdAt: created }),
				entryV2('/vault/note.md', { createdAt: created }),
			]),
		);
		expect(resolved.notes.map((n) => n.path)).toEqual(['/vault/note.md']);
	});

	it('lists nothing for a day without notes, and for an empty vault', () => {
		expect(resolveDayLens(dayLens('2026-01-01'), ctx(vault())).notes).toEqual([]);
		expect(resolveDayLens(dayLens(), ctx([])).notes).toEqual([]);
	});

	it('lists nothing for a lens without a valid day', () => {
		const resolved = resolveDayLens({ kind: DAY_LENS_KIND, target: 'yesterday' }, ctx(vault()));
		expect(resolved.notes).toEqual([]);
		expect(resolved.rule).toBe('');
	});

	it('rows carry the shared subtitle (relative modified time, folder)', () => {
		// Local noon two days after the day, so the relative time never depends on the machine's date or zone.
		const now = new Date(2026, 9, 29, 12).getTime();
		vi.useFakeTimers({ toFake: ['Date'] });
		vi.setSystemTime(now);
		const resolved = resolveDayLens(
			dayLens(),
			ctx([entryV2('/vault/Work/a.md', { frontmatter: { date: DAY }, isA: 'Project', modifiedAt: now / 1000 - 2 * 3600 })]),
		);
		expect(resolved.notes[0].subtitle).toBe('2h ago · Work');
	});

	it('is what the rail resolves the kind to once the provider is registered', () => {
		const provider = { kind: DAY_LENS_KIND, resolve: resolveDayLens };
		expect(resolveLens(dayLens(), ctx(vault()), [provider])).toEqual(resolveDayLens(dayLens(), ctx(vault())));
	});
});

describe('noteDateCounts', () => {
	it('counts each day with the same rule the day lens lists', () => {
		const counts = noteDateCounts(ctx(vault()));
		expect(counts.get(DAY)).toBe(3);
		expect(counts.get('2026-10-28')).toBe(1);
		expect(counts.get('2026-10-26')).toBe(1);
		for (const [day, count] of counts) {
			expect(resolveDayLens(dayLens(day), ctx(vault())).notes).toHaveLength(count);
		}
	});

	it('is empty for an empty vault and leaves the system folder out', () => {
		expect(noteDateCounts(ctx([])).size).toBe(0);
		expect(noteDateCounts(ctx([entryV2('/vault/_system/t.md', { frontmatter: { date: DAY } })])).size).toBe(0);
	});

	it('gives no entry for a day that only has a type definition or a .view', () => {
		const entries = [
			entryV2('/vault/types/Project.md', { isA: 'Type', frontmatter: { date: DAY } }),
			entryV2('/vault/Projects.view', { createdAt: localSeconds(2026, 10, 27) }),
		];
		expect(noteDateCounts(ctx(entries)).has(DAY)).toBe(false);
	});
});

describe('parseRailDay / pickedDayLens', () => {
	it('reads a saved YYYY-MM-DD day', () => {
		expect(parseRailDay(DAY)).toBe(DAY);
		expect(pickedDayLens(DAY, '2026-11-01')).toEqual(dayLens());
	});

	it('reads anything else as no pick, so the lens shows today', () => {
		for (const saved of [null, undefined, '', 'tomorrow', '2026-02-30', `${DAY}T10:00`, 20261027, { day: DAY }]) {
			expect(parseRailDay(saved)).toBeNull();
			expect(pickedDayLens(saved, '2026-11-01')).toEqual(dayLens('2026-11-01'));
		}
	});
});

describe('dayNewNoteRule', () => {
	const now = dayjs('2026-11-01T10:00:00');
	const newCtx: NewNoteContext = { vaultPath: VAULT, captureBaseFolder: 'Notes', captureFolderFormat: 'YYYY/MM', now };

	it('creates a plain note where Cmd+N puts one, dated the day', () => {
		const rule = dayNewNoteRule(dayLens(), newCtx) as PlainNewNoteRule;
		const cmdN = buildCapturePath(VAULT, 'Notes', 'YYYY/MM', '[n]', now);
		expect(rule).toEqual({
			folder: cmdN.slice(0, cmdN.lastIndexOf('/')),
			frontmatter: { date: DAY },
		});
		expect(newNoteContent(rule)).toBe(`---\ndate: ${DAY}\n---\n`);
	});

	it('a note created by the rule lands in that day', () => {
		const rule = dayNewNoteRule(dayLens(), newCtx) as PlainNewNoteRule;
		const created = entryV2(`${rule.folder}/Untitled.md`, { frontmatter: { ...rule.frontmatter }, createdAt: localSeconds(2026, 11, 1) });
		expect(resolveDayLens(dayLens(), ctx([created])).notes.map((n) => n.path)).toEqual([created.path]);
	});

	it('has no rule without a vault or a valid day', () => {
		expect(dayNewNoteRule(dayLens(), { ...newCtx, vaultPath: null })).toBeNull();
		expect(dayNewNoteRule({ kind: DAY_LENS_KIND }, newCtx)).toBeNull();
	});

	it('is what the rail uses for "+ New here" once the provider is registered', () => {
		const provider = { kind: DAY_LENS_KIND, resolve: resolveDayLens, newNote: dayNewNoteRule };
		expect(newNoteRule(dayLens(), newCtx, [provider])).toEqual(dayNewNoteRule(dayLens(), newCtx));
	});
});
