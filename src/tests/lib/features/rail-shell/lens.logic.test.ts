import { describe, it, expect } from 'vitest';
import dayjs from 'dayjs';
import {
	ARCHIVE_LENS,
	DEFAULT_RAIL_ITEM,
	FAVORITES_LENS,
	INBOX_LENS,
	newNoteContent,
	newNoteRule,
	noteSubtitle,
	parseTypesPick,
	pickedTypesLens,
	resolveLens,
	restoreRailItem,
	staleTypesPickFix,
	stepTypesPickCheck,
	INITIAL_TYPES_PICK_CHECK,
	TYPES_LENS,
	typeNavigatorRows,
} from '#lib/features/rail-shell/lens.logic.js';
import type { LensContext, NewNoteContext, RailLensProvider } from '#lib/features/rail-shell/rail-shell.types.js';
import { buildCapturePath } from '#lib/plugins/quick-capture/note-composer.logic.js';
import { dockBadgeCount } from '#lib/features/dock-badge/dock-badge.logic.js';
import { excludeSystemFolder, getNotesForSelection } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import type { TypeMetadata } from '#lib/features/type-definitions/type-definitions.logic.js';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';

const VAULT = '/vault';

/** Unix seconds of a local-time instant, the unit `NoteEntryV2.createdAt` uses. */
const localSeconds = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime() / 1000;

function ctx(
	entries: LensContext['entries'],
	systemFolder = '_system',
	typeMetadataMap: Map<string, TypeMetadata> = buildTypeMetadataMap(entries),
): LensContext {
	return { entries, vaultPath: VAULT, systemFolder, typeMetadataMap };
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

describe('resolveLens - Favorites', () => {
	const entries = [
		entryV2(`${VAULT}/fav-old.md`, { favorite: true, organized: true, modifiedAt: 100 }),
		entryV2(`${VAULT}/Work/fav-new.md`, { favorite: true, modifiedAt: 300, isA: 'Project' }),
		entryV2(`${VAULT}/fav-archived.md`, { favorite: true, archived: true, modifiedAt: 500 }),
		entryV2(`${VAULT}/plain.md`, { modifiedAt: 500 }),
		entryV2(`${VAULT}/_system/templates/Daily.md`, { favorite: true, modifiedAt: 500 }),
	];

	it('resolves to its label and its rule in plain words', () => {
		const lens = resolveLens(FAVORITES_LENS, ctx(entries));
		expect(lens?.label).toBe('Favorites');
		expect(lens?.rule).toBe('favorite, not archived');
	});

	it('lists favorite notes that are not archived, newest change first, without the system folder', () => {
		const lens = resolveLens(FAVORITES_LENS, ctx(entries));
		expect(lens?.notes.map((n) => n.title)).toEqual(['fav-new', 'fav-old']);
	});

	it('shows only Inbox notes in italics', () => {
		const notes = resolveLens(FAVORITES_LENS, ctx(entries))!.notes;
		expect(notes.map((n) => n.italic)).toEqual([true, false]);
		expect(notes[0].subtitle).toBe('Project · Work');
	});

	it('does not italicize a favorite type definition, which is never an Inbox note', () => {
		const [note] = resolveLens(FAVORITES_LENS, ctx([entryV2(`${VAULT}/types/Project.md`, { favorite: true, isA: 'Type' })]))!.notes;
		expect(note.italic).toBe(false);
	});

	it('resolves to an empty list over an empty snapshot', () => {
		expect(resolveLens(FAVORITES_LENS, ctx([]))).toEqual({ label: 'Favorites', rule: 'favorite, not archived', notes: [] });
	});
});

describe('resolveLens - Archive', () => {
	const entries = [
		entryV2(`${VAULT}/old.md`, { archived: true, modifiedAt: 100 }),
		entryV2(`${VAULT}/new.md`, { archived: true, favorite: true, organized: true, modifiedAt: 300 }),
		entryV2(`${VAULT}/live.md`, { favorite: true, modifiedAt: 500 }),
		entryV2(`${VAULT}/_system/templates/Old.md`, { archived: true, modifiedAt: 500 }),
	];

	it('resolves to its label and its rule in plain words', () => {
		const lens = resolveLens(ARCHIVE_LENS, ctx(entries));
		expect(lens?.label).toBe('Archive');
		expect(lens?.rule).toBe('archived');
	});

	it('lists every archived note, favorites included, newest change first, without the system folder', () => {
		const lens = resolveLens(ARCHIVE_LENS, ctx(entries));
		expect(lens?.notes.map((n) => n.title)).toEqual(['new', 'old']);
	});

	it('does not italicize an archived note that is not organized, which is never an Inbox note', () => {
		const notes = resolveLens(ARCHIVE_LENS, ctx(entries))!.notes;
		expect(notes.map((n) => n.italic)).toEqual([false, false]);
	});

	it('resolves to an empty list over an empty snapshot', () => {
		expect(resolveLens(ARCHIVE_LENS, ctx([]))).toEqual({ label: 'Archive', rule: 'archived', notes: [] });
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
		const missing: RailLensProvider = { kind: 'view', resolve: () => null };
		expect(resolveLens({ kind: 'view', target: 'Gone.view' }, ctx([]), [missing])).toBeNull();
	});

	it('keeps the type lens built in, whatever a provider registers for the kind', () => {
		const other: RailLensProvider = { kind: 'type', resolve: () => null };
		expect(resolveLens({ kind: 'type', target: 'Project' }, ctx([]), [other])?.rule).toBe('type is Project, not archived');
	});
});

describe('resolveLens - Type and Untyped', () => {
	const entries = [
		entryV2(`${VAULT}/types/Project.md`, { isA: 'Type', frontmatter: { _sidebar_label: 'All projects' } }),
		entryV2(`${VAULT}/types/Person.md`, { isA: 'Type' }),
		entryV2(`${VAULT}/types/Hidden.md`, { isA: 'Type', frontmatter: { _visible: false } }),
		entryV2(`${VAULT}/alpha.md`, { isA: 'Project', modifiedAt: 100 }),
		entryV2(`${VAULT}/Work/beta.md`, { isA: 'Project', modifiedAt: 300 }),
		entryV2(`${VAULT}/pinned.md`, { isA: 'Project', modifiedAt: 50, frontmatter: { _order: 1 } }),
		entryV2(`${VAULT}/shelved.md`, { isA: 'Project', archived: true, modifiedAt: 900 }),
		entryV2(`${VAULT}/_system/templates/Project.md`, { isA: 'Project', modifiedAt: 900 }),
		entryV2(`${VAULT}/ana.md`, { isA: 'Person', favorite: true, modifiedAt: 10 }),
		entryV2(`${VAULT}/standup.md`, { isA: 'Meeting', modifiedAt: 10 }),
		entryV2(`${VAULT}/secret.md`, { isA: 'Hidden', modifiedAt: 10 }),
		entryV2(`${VAULT}/loose-old.md`, { modifiedAt: 10 }),
		entryV2(`${VAULT}/loose-new.md`, { modifiedAt: 20, organized: true }),
		entryV2(`${VAULT}/loose-archived.md`, { archived: true, modifiedAt: 30 }),
	];
	const PROJECT = { kind: 'type', target: 'Project' };

	it("resolves to the type's sidebar label and its rule in plain words", () => {
		const lens = resolveLens(PROJECT, ctx(entries));
		expect(lens?.label).toBe('All projects');
		expect(lens?.rule).toBe('type is Project, not archived');
	});

	it('lists the same notes in the same order as the classic Types list', () => {
		const lens = resolveLens(PROJECT, ctx(entries))!;
		const classic = getNotesForSelection(
			excludeSystemFolder(entries, VAULT, '_system'),
			{ kind: 'type', name: 'Project' },
			buildTypeMetadataMap(entries),
		);
		expect(lens.notes.map((n) => n.path)).toEqual(classic.map((n) => n.path));
		// `_order` pins first, then newest change; archived and system-folder notes left out.
		expect(lens.notes.map((n) => n.title)).toEqual(['pinned', 'beta', 'alpha']);
	});

	it('carries the row fields of a type note', () => {
		const ana = resolveLens({ kind: 'type', target: 'Person' }, ctx(entries))!.notes[0];
		expect(ana).toMatchObject({ path: `${VAULT}/ana.md`, isA: 'Person', favorite: true, subtitle: 'Person', italic: true });
	});

	it('labels a type that has notes but no definition by its default label', () => {
		const lens = resolveLens({ kind: 'type', target: 'Meeting' }, ctx(entries))!;
		expect(lens.label).toBe('Meetings');
		expect(lens.notes.map((n) => n.title)).toEqual(['standup']);
	});

	it('resolves a type with no notes to an empty list', () => {
		expect(resolveLens({ kind: 'type', target: 'Project' }, ctx([]))).toEqual({
			label: 'Projects',
			rule: 'type is Project, not archived',
			notes: [],
		});
	});

	it('resolves the Types item before a pick to no list', () => {
		expect(resolveLens(TYPES_LENS, ctx(entries))).toBeNull();
		expect(resolveLens({ kind: 'type', target: '' }, ctx(entries))).toBeNull();
	});

	it('lists the notes with no type that are not archived, newest change first', () => {
		const lens = resolveLens({ kind: 'untyped' }, ctx(entries))!;
		expect(lens.label).toBe('Untyped');
		expect(lens.rule).toBe('no type, not archived');
		expect(lens.notes.map((n) => n.title)).toEqual(['loose-new', 'loose-old']);
	});

	it('resolves Untyped to an empty list over an empty snapshot', () => {
		expect(resolveLens({ kind: 'untyped' }, ctx([]))).toEqual({ label: 'Untyped', rule: 'no type, not archived', notes: [] });
	});

	describe('typeNavigatorRows', () => {
		it('lists the visible types in sidebar order, then Untyped when it is shown', () => {
			const rows = typeNavigatorRows(ctx(entries), true);
			expect(rows.map((r) => r.label)).toEqual(['All projects', 'Persons', 'Meetings', 'Untyped']);
			expect(rows.map((r) => r.lens)).toEqual([
				{ kind: 'type', target: 'Project' },
				{ kind: 'type', target: 'Person' },
				{ kind: 'type', target: 'Meeting' },
				{ kind: 'untyped' },
			]);
			expect(rows[0].definitionPath).toBe(`${VAULT}/types/Project.md`);
			expect(rows[2].definitionPath).toBeNull();
			expect(rows.map((r) => r.typeName)).toEqual(['Project', 'Person', 'Meeting', null]);
		});

		it('counts on every row match the list its lens resolves to', () => {
			const rows = typeNavigatorRows(ctx(entries), true);
			expect(rows.map((r) => r.count)).toEqual([3, 1, 1, 2]);
			for (const row of rows) {
				expect(row.count).toBe(resolveLens(row.lens, ctx(entries))!.notes.length);
			}
		});

		it('leaves Untyped out when untyped notes are not shown', () => {
			expect(typeNavigatorRows(ctx(entries), false).map((r) => r.label)).toEqual(['All projects', 'Persons', 'Meetings']);
		});

		it('keeps a defined type with no notes, at zero', () => {
			const defs = [entryV2(`${VAULT}/types/Person.md`, { isA: 'Type' })];
			expect(typeNavigatorRows(ctx(defs), false)).toEqual([
				{ lens: { kind: 'type', target: 'Person' }, label: 'Persons', count: 0, typeName: 'Person', definitionPath: `${VAULT}/types/Person.md` },
			]);
		});

		it('is empty over an empty snapshot, except an Untyped row when it is shown', () => {
			expect(typeNavigatorRows(ctx([]), false)).toEqual([]);
			expect(typeNavigatorRows(ctx([]), true)).toEqual([
				{ lens: { kind: 'untyped' }, label: 'Untyped', count: 0, typeName: null, definitionPath: null },
			]);
		});
	});
});

describe('Types navigator pick', () => {
	const rows = typeNavigatorRows(
		ctx([entryV2(`${VAULT}/types/Project.md`, { isA: 'Type' }), entryV2(`${VAULT}/types/Person.md`, { isA: 'Type' })]),
		false,
	);

	it('parses a saved type or Untyped pick', () => {
		expect(parseTypesPick({ kind: 'type', target: 'Project' })).toEqual({ kind: 'type', target: 'Project' });
		expect(parseTypesPick({ kind: 'untyped' })).toEqual({ kind: 'untyped' });
		expect(parseTypesPick({ kind: 'type', target: 'Project', extra: 1 })).toEqual({ kind: 'type', target: 'Project' });
	});

	it('rejects a missing or hand-edited pick', () => {
		for (const bad of [null, undefined, 'Project', 42, {}, { kind: 'type' }, { kind: 'type', target: '' }, { kind: 'type', target: 7 }, { kind: 'inbox' }]) {
			expect(parseTypesPick(bad)).toBeNull();
		}
	});

	it('keeps the saved pick, even one the snapshot does not list yet', () => {
		expect(pickedTypesLens({ kind: 'type', target: 'Person' }, rows)).toEqual({ kind: 'type', target: 'Person' });
		expect(pickedTypesLens({ kind: 'type', target: 'Brand new' }, rows)).toEqual({ kind: 'type', target: 'Brand new' });
	});

	it('picks the first row when nothing valid is saved', () => {
		expect(pickedTypesLens(null, rows)).toEqual({ kind: 'type', target: 'Project' });
		expect(pickedTypesLens('garbage', rows)).toEqual({ kind: 'type', target: 'Project' });
	});

	it('falls back to the bare Types lens when the navigator has no rows', () => {
		expect(pickedTypesLens(null, [])).toEqual(TYPES_LENS);
	});

	it('restores the Types rail item with the bare Types lens', () => {
		expect(restoreRailItem('types')).toEqual({ item: 'types', lens: TYPES_LENS });
	});

	describe('staleTypesPickFix', () => {
		it('leaves a pick the navigator lists alone', () => {
			expect(staleTypesPickFix('types', { kind: 'type', target: 'Person' }, rows)).toBeNull();
		});

		it('leaves a missing or malformed pick alone', () => {
			expect(staleTypesPickFix('types', null, rows)).toBeNull();
			expect(staleTypesPickFix('types', 'Project', rows)).toBeNull();
		});

		it('sends the Types item back to the default item and clears a type that no longer exists', () => {
			expect(staleTypesPickFix('types', { kind: 'type', target: 'Gone' }, rows)).toEqual({ railItem: DEFAULT_RAIL_ITEM, railTypesLens: null });
		});

		it('only clears the stale pick when another rail item is active', () => {
			expect(staleTypesPickFix('favorites', { kind: 'type', target: 'Gone' }, rows)).toEqual({ railTypesLens: null });
		});

		it('treats Untyped as gone when untyped notes are not shown', () => {
			expect(staleTypesPickFix('types', { kind: 'untyped' }, rows)).toEqual({ railItem: DEFAULT_RAIL_ITEM, railTypesLens: null });
			const withUntyped = typeNavigatorRows(ctx([]), true);
			expect(staleTypesPickFix('types', { kind: 'untyped' }, withUntyped)).toBeNull();
		});
	});

	describe('stepTypesPickCheck', () => {
		/** Feeds each observation in order and returns the step on which the check ran, or -1 */
		function runsAt(observations: Array<{ vaultPath: string | null; indexReady: boolean; entriesVersion: number; enabled: boolean }>): number {
			let gate = INITIAL_TYPES_PICK_CHECK;
			for (const [i, obs] of observations.entries()) {
				const step = stepTypesPickCheck(gate, obs);
				gate = step.next;
				if (step.run) return i;
			}
			return -1;
		}

		it('runs on the first snapshot after the opened vault index is ready', () => {
			expect(
				runsAt([
					{ vaultPath: '/A', indexReady: false, entriesVersion: 0, enabled: true },
					{ vaultPath: '/A', indexReady: true, entriesVersion: 0, enabled: true },
					{ vaultPath: '/A', indexReady: true, entriesVersion: 1, enabled: true },
				]),
			).toBe(2);
		});

		it('runs only once per vault open', () => {
			let gate = INITIAL_TYPES_PICK_CHECK;
			const runs: boolean[] = [];
			for (const obs of [
				{ vaultPath: '/A', indexReady: false, entriesVersion: 0, enabled: true },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 0, enabled: true },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 1, enabled: true },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 2, enabled: true },
			]) {
				const step = stepTypesPickCheck(gate, obs);
				gate = step.next;
				runs.push(step.run);
			}
			expect(runs).toEqual([false, false, true, false]);
		});

		it('does not run without a vault', () => {
			expect(runsAt([{ vaultPath: null, indexReady: true, entriesVersion: 3, enabled: true }])).toBe(-1);
		});

		it('on a switch, ignores the previous vault entries still in the store', () => {
			// A is open and checked; B's path lands while A's index and entries remain.
			let gate = INITIAL_TYPES_PICK_CHECK;
			for (const obs of [
				{ vaultPath: '/A', indexReady: false, entriesVersion: 0, enabled: true },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 0, enabled: true },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 1, enabled: true },
			]) gate = stepTypesPickCheck(gate, obs).next;
			const switchSteps = [
				{ vaultPath: '/B', indexReady: true, entriesVersion: 1, enabled: true },
				{ vaultPath: '/B', indexReady: true, entriesVersion: 2, enabled: true },
			];
			const runs = switchSteps.map((obs) => {
				const step = stepTypesPickCheck(gate, obs);
				gate = step.next;
				return step.run;
			});
			expect(runs).toEqual([false, false]);
		});

		it('ignores a tail refresh of the previous vault before the new index is ready', () => {
			expect(
				runsAt([
					{ vaultPath: '/B', indexReady: true, entriesVersion: 4, enabled: true },
					// teardown: readiness cleared, entries reset
					{ vaultPath: '/B', indexReady: false, entriesVersion: 0, enabled: true },
					// tail vault-index-updated from A refills the store
					{ vaultPath: '/B', indexReady: false, entriesVersion: 1, enabled: true },
					// B's index built: the store still holds A's tail snapshot
					{ vaultPath: '/B', indexReady: true, entriesVersion: 1, enabled: true },
					// B's own first snapshot
					{ vaultPath: '/B', indexReady: true, entriesVersion: 2, enabled: true },
				]),
			).toBe(4);
		});

		it('waits while disabled and runs once enabled, with no new snapshot', () => {
			expect(
				runsAt([
					{ vaultPath: '/A', indexReady: false, entriesVersion: 0, enabled: false },
					{ vaultPath: '/A', indexReady: true, entriesVersion: 0, enabled: false },
					{ vaultPath: '/A', indexReady: true, entriesVersion: 1, enabled: false },
					{ vaultPath: '/A', indexReady: true, entriesVersion: 1, enabled: true },
				]),
			).toBe(3);
		});

		it('runs again after the same vault is reopened', () => {
			let gate = INITIAL_TYPES_PICK_CHECK;
			const runs: boolean[] = [];
			for (const obs of [
				{ vaultPath: '/A', indexReady: false, entriesVersion: 0, enabled: true },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 0, enabled: true },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 1, enabled: true },
				{ vaultPath: '/A', indexReady: false, entriesVersion: 0, enabled: true },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 0, enabled: true },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 1, enabled: true },
			]) {
				const step = stepTypesPickCheck(gate, obs);
				gate = step.next;
				runs.push(step.run);
			}
			expect(runs).toEqual([false, false, true, false, false, true]);
		});
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

	it('puts a Favorites note in the Cmd+N folder with _favorite: true', () => {
		const cmdN = buildCapturePath(VAULT, '_notes', 'YYYY/MM-MMM', '[n-]HH-mm', NOW);
		expect(newNoteRule(FAVORITES_LENS, newCtx())).toEqual({
			folder: cmdN.slice(0, cmdN.lastIndexOf('/')),
			frontmatter: { _favorite: true },
		});
		expect(newNoteRule(FAVORITES_LENS, newCtx(null))).toBeNull();
	});

	it('yields no rule for the Archive, whatever a provider says', () => {
		const archive: RailLensProvider = {
			kind: 'archive',
			resolve: () => null,
			newNote: () => ({ folder: VAULT, frontmatter: {} }),
		};
		expect(newNoteRule(ARCHIVE_LENS, newCtx())).toBeNull();
		expect(newNoteRule(ARCHIVE_LENS, newCtx(), [archive])).toBeNull();
	});

	it('yields no rule for a lens whose provider has no creation rule', () => {
		const noCreate: RailLensProvider = { kind: 'view', resolve: () => null };
		expect(newNoteRule({ kind: 'view' }, newCtx(), [noCreate])).toBeNull();
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

describe('newNoteRule - Type and Untyped', () => {
	const NOW = dayjs('2026-10-31T09:15:00');
	const newCtx = (vaultPath: string | null = VAULT): NewNoteContext => ({
		vaultPath,
		captureBaseFolder: '_notes',
		captureFolderFormat: 'YYYY/MM-MMM',
		now: NOW,
	});

	it('creates a note of the picked type, which brings its folder and template', () => {
		expect(newNoteRule({ kind: 'type', target: 'Project' }, newCtx())).toEqual({ typeName: 'Project' });
	});

	it('creates a plain note from Untyped, where Cmd+N puts one', () => {
		const cmdN = buildCapturePath(VAULT, '_notes', 'YYYY/MM-MMM', '[n-]HH-mm', NOW);
		expect(newNoteRule({ kind: 'untyped' }, newCtx())).toEqual({ folder: cmdN.slice(0, cmdN.lastIndexOf('/')), frontmatter: {} });
	});

	it('yields no rule before a type is picked or without a vault', () => {
		expect(newNoteRule(TYPES_LENS, newCtx())).toBeNull();
		expect(newNoteRule({ kind: 'type', target: 'Project' }, newCtx(null))).toBeNull();
		expect(newNoteRule({ kind: 'untyped' }, newCtx(null))).toBeNull();
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

describe('restoreRailItem', () => {
	it('restores each built-in rail item with its lens', () => {
		expect(restoreRailItem('inbox')).toEqual({ item: 'inbox', lens: INBOX_LENS });
		expect(restoreRailItem('favorites')).toEqual({ item: 'favorites', lens: FAVORITES_LENS });
		expect(restoreRailItem('archive')).toEqual({ item: 'archive', lens: ARCHIVE_LENS });
	});

	it('falls back to the default item for an unknown saved item', () => {
		expect(DEFAULT_RAIL_ITEM).toBe('inbox');
		expect(restoreRailItem('people')).toEqual({ item: 'inbox', lens: INBOX_LENS });
	});

	it('falls back to the default item for an empty or missing saved item', () => {
		expect(restoreRailItem('')).toEqual({ item: 'inbox', lens: INBOX_LENS });
		expect(restoreRailItem(undefined)).toEqual({ item: 'inbox', lens: INBOX_LENS });
		expect(restoreRailItem(null)).toEqual({ item: 'inbox', lens: INBOX_LENS });
	});

	it('falls back to the default item when a hand-edited file saved a non-string', () => {
		expect(restoreRailItem(42)).toEqual({ item: 'inbox', lens: INBOX_LENS });
		expect(restoreRailItem({ kind: 'archive' })).toEqual({ item: 'inbox', lens: INBOX_LENS });
	});

	it('does not resolve inherited object keys as rail items', () => {
		expect(restoreRailItem('toString')).toEqual({ item: 'inbox', lens: INBOX_LENS });
	});
});
