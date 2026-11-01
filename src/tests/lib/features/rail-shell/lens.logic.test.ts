import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import { INBOX_LENS, newNoteContent, newNoteRule, noteSubtitle, resolveLens } from '#lib/features/rail-shell/lens.logic.js';
import type { LensContext, NewNoteContext, RailLensProvider } from '#lib/features/rail-shell/rail-shell.types.js';
import { buildCapturePath } from '#lib/plugins/quick-capture/note-composer.logic.js';
import { dockBadgeCount } from '#lib/features/dock-badge/dock-badge.logic.js';
import { excludeSystemFolder } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const VAULT = '/vault';

/** Unix seconds of a local-time instant, the unit `NoteEntryV2.createdAt` uses. */
const localSeconds = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime() / 1000;

function ctx(entries: LensContext['entries'], systemFolder = '_system'): LensContext {
	return { entries, vaultPath: VAULT, systemFolder };
}

describe('resolveLens - Inbox', () => {
	const entries = [
		entryV2(`${VAULT}/inbox-old.md`, { modifiedAt: 100 }),
		entryV2(`${VAULT}/notes/inbox-new.md`, { modifiedAt: 300, isA: 'Project' }),
		entryV2(`${VAULT}/organized.md`, { organized: true, modifiedAt: 500 }),
		entryV2(`${VAULT}/archived.md`, { archived: true, modifiedAt: 500 }),
		entryV2(`${VAULT}/types/Project.md`, { isA: 'Type', modifiedAt: 500 }),
		entryV2(`${VAULT}/_system/templates/Daily.md`, { modifiedAt: 500 }),
	];

	it('resolves to its label and its rule in plain words', () => {
		const lens = resolveLens(INBOX_LENS, ctx(entries));
		expect(lens?.label).toBe('Inbox');
		expect(lens?.rule).toBe('not organized, not archived');
	});

	it('lists the notes of the inbox predicate, newest change first', () => {
		const lens = resolveLens(INBOX_LENS, ctx(entries));
		expect(lens?.notes.map((n) => n.title)).toEqual(['inbox-new', 'inbox-old']);
	});

	it('excludes type definitions and the system folder', () => {
		const paths = resolveLens(INBOX_LENS, ctx(entries))!.notes.map((n) => n.path);
		expect(paths).not.toContain(`${VAULT}/types/Project.md`);
		expect(paths).not.toContain(`${VAULT}/_system/templates/Daily.md`);
	});

	it('keeps the system folder notes when no system folder is set', () => {
		const paths = resolveLens(INBOX_LENS, ctx(entries, ''))!.notes.map((n) => n.path);
		expect(paths).toContain(`${VAULT}/_system/templates/Daily.md`);
	});

	it('lists as many notes as the dock badge counts', () => {
		const lens = resolveLens(INBOX_LENS, ctx(entries))!;
		const badge = dockBadgeCount(true, excludeSystemFolder(entries, VAULT, '_system'));
		expect(lens.notes).toHaveLength(badge!);
	});

	it('marks every inbox note italic and carries the row fields', () => {
		const [note] = resolveLens(INBOX_LENS, ctx([entryV2(`${VAULT}/a.md`, { favorite: true, modifiedAt: 7, frontmatter: { status: 'x' } })]))!.notes;
		expect(note).toMatchObject({
			path: `${VAULT}/a.md`,
			title: 'a',
			favorite: true,
			modifiedAt: 7,
			frontmatter: { status: 'x' },
			isA: null,
			italic: true,
		});
	});

	it('resolves to an empty list over an empty snapshot', () => {
		const lens = resolveLens(INBOX_LENS, ctx([]));
		expect(lens).toEqual({ label: 'Inbox', rule: 'not organized, not archived', notes: [] });
	});
});

describe('resolveLens - registered lenses', () => {
	const dayProvider: RailLensProvider = {
		kind: 'day',
		resolve: (lens) => ({ label: `Day ${lens.target}`, rule: `note date is ${lens.target}`, notes: [] }),
	};

	it('hands a non-built-in kind to the provider registered for it', () => {
		const lens = resolveLens({ kind: 'day', target: '2026-10-27' }, ctx([]), [dayProvider]);
		expect(lens?.label).toBe('Day 2026-10-27');
		expect(lens?.rule).toBe('note date is 2026-10-27');
	});

	it('returns null for a kind nobody resolves', () => {
		expect(resolveLens({ kind: 'nope' }, ctx([]), [dayProvider])).toBeNull();
	});

	it('returns null when the provider cannot resolve the target', () => {
		const missing: RailLensProvider = { kind: 'type', resolve: () => null };
		expect(resolveLens({ kind: 'type', target: 'Gone' }, ctx([]), [missing])).toBeNull();
	});
});

describe('noteSubtitle', () => {
	it('shows the type, the note date and the vault-relative folder', () => {
		const entry = entryV2(`${VAULT}/Work/projects/alpha.md`, { isA: 'Project', frontmatter: { date: '2026-10-27' } });
		expect(noteSubtitle(entry, VAULT)).toBe('Project · 2026-10-27 · Work/projects');
	});

	it('uses the note date rule: date, else created, else the disk creation time', () => {
		const disk = localSeconds(2026, 10, 1);
		expect(noteSubtitle(entryV2(`${VAULT}/a.md`, { createdAt: disk, frontmatter: { date: '2026-10-27', created: '2026-10-20' } }), VAULT)).toContain('2026-10-27');
		expect(noteSubtitle(entryV2(`${VAULT}/a.md`, { createdAt: disk, frontmatter: { created: '2026-10-20' } }), VAULT)).toContain('2026-10-20');
		expect(noteSubtitle(entryV2(`${VAULT}/a.md`, { createdAt: disk, frontmatter: { date: 'not a date' } }), VAULT)).toContain('2026-10-01');
	});

	it('says Note for an untyped note and leaves out a missing date and the vault root', () => {
		expect(noteSubtitle(entryV2(`${VAULT}/a.md`), VAULT)).toBe('Note');
	});

	it('leaves out the folder when the vault path is unknown', () => {
		expect(noteSubtitle(entryV2(`${VAULT}/Work/a.md`, { isA: 'Project' }), null)).toBe('Project');
	});
});

describe('newNoteRule', () => {
	const NOW = dayjs('2026-10-31T09:15:00');
	const newCtx = (vaultPath: string | null = VAULT): NewNoteContext => ({
		vaultPath,
		captureBaseFolder: '_notes',
		captureFolderFormat: 'YYYY/MM-MMM',
		now: NOW,
	});

	it('puts an Inbox note in the Cmd+N folder with _organized: false', () => {
		const cmdN = buildCapturePath(VAULT, '_notes', 'YYYY/MM-MMM', '[n-]HH-mm', NOW);
		expect(newNoteRule(INBOX_LENS, newCtx())).toEqual({
			folder: cmdN.slice(0, cmdN.lastIndexOf('/')),
			frontmatter: { _organized: false },
		});
	});

	it('yields no rule without a vault', () => {
		expect(newNoteRule(INBOX_LENS, newCtx(null))).toBeNull();
	});

	it('yields no rule for a lens whose provider has no creation rule', () => {
		const noCreate: RailLensProvider = { kind: 'archive', resolve: () => null };
		expect(newNoteRule({ kind: 'archive' }, newCtx(), [noCreate])).toBeNull();
	});

	it('yields no rule for a kind nobody resolves', () => {
		expect(newNoteRule({ kind: 'nope' }, newCtx())).toBeNull();
	});

	it("hands a non-built-in kind to its provider's creation rule", () => {
		const day: RailLensProvider = {
			kind: 'day',
			resolve: () => null,
			newNote: (lens, c) => ({ folder: `${c.vaultPath}/days`, frontmatter: { date: lens.target! } }),
		};
		expect(newNoteRule({ kind: 'day', target: '2026-10-27' }, newCtx(), [day])).toEqual({
			folder: `${VAULT}/days`,
			frontmatter: { date: '2026-10-27' },
		});
	});
});

describe('newNoteContent', () => {
	it("writes the rule's frontmatter block", () => {
		expect(newNoteContent({ folder: VAULT, frontmatter: { _organized: false, date: '2026-10-27' } })).toBe(
			'---\n_organized: false\ndate: 2026-10-27\n---\n',
		);
	});

	it('writes an empty note when the rule sets no frontmatter', () => {
		expect(newNoteContent({ folder: VAULT, frontmatter: {} })).toBe('');
	});
});
