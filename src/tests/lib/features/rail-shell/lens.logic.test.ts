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
	SEARCH_LENS,
	SEARCH_RAIL_ITEM,
	staleTypesPickFix,
	stepTypesPickCheck,
	INITIAL_TYPES_PICK_CHECK,
	TYPES_LENS,
	typeNavigatorRows,
	describeViewFilters,
	queryViewLens,
	resolveViewLens,
	VIEW_LENS_KIND,
	viewNavigatorRows,
	viewNoteType,
	FILES_LENS,
	FOLDER_LENS_KIND,
	fileKind,
	navigatorFolders,
	pickedFolderLens,
	staleFolderPickFix,
	parseExpandedFolders,
	toggleExpandedFolder,
	followFolderPathChange,
	TODAY_LENS,
	TODAY_LENS_KIND,
	TODAY_RAIL_ITEM,
	todayLens,
	NEIGHBOURHOOD_LENS_KIND,
	NEIGHBOURHOOD_RAIL_ITEM,
	neighbourhoodLens,
} from '#lib/features/rail-shell/lens.logic.js';
import type { LensContext, NewNoteContext, PlainNewNoteRule, RailLensProvider, RailNavigator } from '#lib/features/rail-shell/rail-shell.types.js';
import { buildCapturePath } from '#lib/plugins/quick-capture/note-composer.logic.js';
import { dockBadgeCount } from '#lib/features/dock-badge/dock-badge.logic.js';
import { excludeSystemFolder, getNotesForSelection } from '#lib/features/type-definitions/type-sidebar.logic.js';
import { buildTypeMetadataMap } from '#lib/features/type-definitions/type-definitions.logic.js';
import type { TypeMetadata } from '#lib/features/type-definitions/type-definitions.logic.js';
import { buildNoteRecord } from '#lib/features/collection/collection.logic.js';
import { parseFilterToGroups } from '#lib/features/collection/toolbar/filter.logic.js';
import type { CollectionDefinition, NoteRecord } from '#lib/features/collection/collection.types.js';
import type { FileTreeNode } from '#lib/core/filesystem/fs.types.js';
import { entryV2, outgoingLinksFromContent } from '../../../fixtures/vault-entries.fixture';

const VAULT = '/vault';

/** Unix seconds of a local-time instant, the unit `NoteEntryV2.createdAt` uses. */
const localSeconds = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime() / 1000;

function ctx(
	entries: LensContext['entries'],
	systemFolder = '_system',
	typeMetadataMap: Map<string, TypeMetadata> = buildTypeMetadataMap(entries),
	fileTree: FileTreeNode[] = [],
): LensContext {
	return { entries, vaultPath: VAULT, systemFolder, typeMetadataMap, fileTree };
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

describe('resolveLens - Today', () => {
	const DAY = '2026-10-27';
	const entries = [
		entryV2(`${VAULT}/pin-old.md`, { favorite: true, frontmatter: { date: '2026-01-01' }, modifiedAt: 100 }),
		entryV2(`${VAULT}/Work/pin-new.md`, { favorite: true, frontmatter: { date: '2026-01-01' }, modifiedAt: 300 }),
		entryV2(`${VAULT}/pin-archived.md`, { favorite: true, archived: true, frontmatter: { date: '2026-01-01' }, modifiedAt: 500 }),
		entryV2(`${VAULT}/by-date.md`, { frontmatter: { date: DAY }, modifiedAt: 40 }),
		entryV2(`${VAULT}/by-created.md`, { frontmatter: { created: `${DAY} 09:15` }, modifiedAt: 30 }),
		entryV2(`${VAULT}/by-disk.md`, { createdAt: localSeconds(2026, 10, 27), modifiedAt: 20 }),
		// `date` wins over the disk time: this note belongs to the 28th.
		entryV2(`${VAULT}/date-wins.md`, { frontmatter: { date: '2026-10-28' }, createdAt: localSeconds(2026, 10, 27) }),
		entryV2(`${VAULT}/other-day.md`, { frontmatter: { date: '2026-10-26' } }),
		entryV2(`${VAULT}/_system/templates/Daily.md`, { favorite: true, frontmatter: { date: DAY } }),
	];
	const groups = (resolved: ReturnType<typeof resolveLens>) =>
		resolved?.groups?.map((g) => ({ id: g.id, label: g.label, titles: g.notes.map((n) => n.title) }));

	it('groups the favorites first, then the notes whose note date is the day, each newest change first', () => {
		expect(groups(resolveLens(todayLens(DAY), ctx(entries)))).toEqual([
			{ id: 'pinned', label: 'Pinned', titles: ['pin-new', 'pin-old'] },
			{ id: 'today', label: 'Today', titles: ['by-date', 'by-created', 'by-disk'] },
		]);
	});

	it('resolves to its label and its rule in plain words', () => {
		const resolved = resolveLens(todayLens(DAY), ctx(entries));
		expect(resolved?.label).toBe('Today');
		expect(resolved?.rule).toBe('pinned; note date is today');
	});

	it('lists every grouped note once, in group order', () => {
		const pinnedToday = entryV2(`${VAULT}/both.md`, { favorite: true, frontmatter: { date: DAY }, modifiedAt: 900 });
		const resolved = resolveLens(todayLens(DAY), ctx([...entries, pinnedToday]));
		expect(groups(resolved)?.map((g) => g.titles)).toEqual([
			['both', 'pin-new', 'pin-old'],
			['both', 'by-date', 'by-created', 'by-disk'],
		]);
		expect(resolved?.notes.map((n) => n.title)).toEqual(['both', 'pin-new', 'pin-old', 'by-date', 'by-created', 'by-disk']);
	});

	it('keeps an archived note dated today in the Today group', () => {
		const resolved = resolveLens(todayLens(DAY), ctx([entryV2(`${VAULT}/old.md`, { archived: true, frontmatter: { date: DAY } })]));
		expect(groups(resolved)).toEqual([
			{ id: 'pinned', label: 'Pinned', titles: [] },
			{ id: 'today', label: 'Today', titles: ['old'] },
		]);
	});

	it('resolves to two empty groups over an empty snapshot', () => {
		const resolved = resolveLens(todayLens(DAY), ctx([]));
		expect(resolved?.notes).toEqual([]);
		expect(groups(resolved)).toEqual([
			{ id: 'pinned', label: 'Pinned', titles: [] },
			{ id: 'today', label: 'Today', titles: [] },
		]);
	});

	it('lists only the pinned notes when the lens carries no day', () => {
		for (const lens of [TODAY_LENS, { kind: TODAY_LENS_KIND, target: 'not-a-day' }]) {
			expect(groups(resolveLens(lens, ctx(entries)))?.map((g) => g.titles)).toEqual([['pin-new', 'pin-old'], []]);
		}
	});

	it('builds the lens of a day', () => {
		expect(todayLens(DAY)).toEqual({ kind: 'today', target: DAY });
		expect(TODAY_LENS).toEqual({ kind: 'today' });
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
		function runsAt(observations: Array<{ vaultPath: string | null; indexReady: boolean; entriesVersion: number }>): number {
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
					{ vaultPath: '/A', indexReady: false, entriesVersion: 0 },
					{ vaultPath: '/A', indexReady: true, entriesVersion: 0 },
					{ vaultPath: '/A', indexReady: true, entriesVersion: 1 },
				]),
			).toBe(2);
		});

		it('runs only once per vault open', () => {
			let gate = INITIAL_TYPES_PICK_CHECK;
			const runs: boolean[] = [];
			for (const obs of [
				{ vaultPath: '/A', indexReady: false, entriesVersion: 0 },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 0 },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 1 },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 2 },
			]) {
				const step = stepTypesPickCheck(gate, obs);
				gate = step.next;
				runs.push(step.run);
			}
			expect(runs).toEqual([false, false, true, false]);
		});

		it('does not run without a vault', () => {
			expect(runsAt([{ vaultPath: null, indexReady: true, entriesVersion: 3 }])).toBe(-1);
		});

		it('on a switch, ignores the previous vault entries still in the store', () => {
			// A is open and checked; B's path lands while A's index and entries remain.
			let gate = INITIAL_TYPES_PICK_CHECK;
			for (const obs of [
				{ vaultPath: '/A', indexReady: false, entriesVersion: 0 },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 0 },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 1 },
			]) gate = stepTypesPickCheck(gate, obs).next;
			const switchSteps = [
				{ vaultPath: '/B', indexReady: true, entriesVersion: 1 },
				{ vaultPath: '/B', indexReady: true, entriesVersion: 2 },
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
					{ vaultPath: '/B', indexReady: true, entriesVersion: 4 },
					// teardown: readiness cleared, entries reset
					{ vaultPath: '/B', indexReady: false, entriesVersion: 0 },
					// tail vault-index-updated from A refills the store
					{ vaultPath: '/B', indexReady: false, entriesVersion: 1 },
					// B's index built: the store still holds A's tail snapshot
					{ vaultPath: '/B', indexReady: true, entriesVersion: 1 },
					// B's own first snapshot
					{ vaultPath: '/B', indexReady: true, entriesVersion: 2 },
				]),
			).toBe(4);
		});

		it('runs again after the same vault is reopened', () => {
			let gate = INITIAL_TYPES_PICK_CHECK;
			const runs: boolean[] = [];
			for (const obs of [
				{ vaultPath: '/A', indexReady: false, entriesVersion: 0 },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 0 },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 1 },
				{ vaultPath: '/A', indexReady: false, entriesVersion: 0 },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 0 },
				{ vaultPath: '/A', indexReady: true, entriesVersion: 1 },
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
		const noCreate: RailLensProvider = { kind: 'day', resolve: () => null };
		expect(newNoteRule({ kind: 'day' }, newCtx(), [noCreate])).toBeNull();
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

describe('newNoteRule - Today', () => {
	const NOW = dayjs('2026-10-31T09:15:00');
	const newCtx = (vaultPath: string | null = VAULT): NewNoteContext => ({
		vaultPath,
		captureBaseFolder: '_notes',
		captureFolderFormat: 'YYYY/MM-MMM',
		now: NOW,
	});

	it("puts a Today note in the Cmd+N folder with today's date", () => {
		const cmdN = buildCapturePath(VAULT, '_notes', 'YYYY/MM-MMM', '[n-]HH-mm', NOW);
		const rule = newNoteRule(todayLens('2026-10-31'), newCtx());
		expect(rule).toEqual({ folder: cmdN.slice(0, cmdN.lastIndexOf('/')), frontmatter: { date: '2026-10-31' } });
		expect(newNoteContent(rule as PlainNewNoteRule)).toBe('---\ndate: 2026-10-31\n---\n');
	});

	it('dates the note by the creation instant, also before the lens has a day', () => {
		expect(newNoteRule(TODAY_LENS, newCtx())).toMatchObject({ frontmatter: { date: '2026-10-31' } });
	});

	it("dates the note by the lens's day when it has one, so the note lands in the list shown", () => {
		expect(newNoteRule(todayLens('2026-10-30'), newCtx())).toMatchObject({ frontmatter: { date: '2026-10-30' } });
	});

	it('falls back to the creation instant when the lens day is not a valid day key', () => {
		expect(newNoteRule(todayLens('2026-13-45'), newCtx())).toMatchObject({ frontmatter: { date: '2026-10-31' } });
		expect(newNoteRule(todayLens('yesterday'), newCtx())).toMatchObject({ frontmatter: { date: '2026-10-31' } });
	});

	it('creates nothing without a vault', () => {
		expect(newNoteRule(todayLens('2026-10-31'), newCtx(null))).toBeNull();
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
		expect(restoreRailItem('today')).toEqual({ item: 'today', lens: TODAY_LENS });
		expect(restoreRailItem('favorites')).toEqual({ item: 'favorites', lens: FAVORITES_LENS });
		expect(restoreRailItem('archive')).toEqual({ item: 'archive', lens: ARCHIVE_LENS });
		expect(SEARCH_RAIL_ITEM).toBe('search');
		expect(restoreRailItem(SEARCH_RAIL_ITEM)).toEqual({ item: 'search', lens: SEARCH_LENS });
	});

	it('falls back to the default item for an unknown saved item', () => {
		expect(DEFAULT_RAIL_ITEM).toBe(TODAY_RAIL_ITEM);
		expect(TODAY_RAIL_ITEM).toBe('today');
		expect(restoreRailItem('people')).toEqual({ item: 'today', lens: TODAY_LENS });
	});

	it('falls back to the default item for an empty or missing saved item', () => {
		expect(restoreRailItem('')).toEqual({ item: 'today', lens: TODAY_LENS });
		expect(restoreRailItem(undefined)).toEqual({ item: 'today', lens: TODAY_LENS });
		expect(restoreRailItem(null)).toEqual({ item: 'today', lens: TODAY_LENS });
	});

	it('falls back to the default item when a hand-edited file saved a non-string', () => {
		expect(restoreRailItem(42)).toEqual({ item: 'today', lens: TODAY_LENS });
		expect(restoreRailItem({ kind: 'archive' })).toEqual({ item: 'today', lens: TODAY_LENS });
	});

	it('does not resolve inherited object keys as rail items', () => {
		expect(restoreRailItem('toString')).toEqual({ item: 'today', lens: TODAY_LENS });
	});

	it('restores a registered navigator item with the lens its pick sets now', () => {
		let pick = '2026-10-27';
		const calendar: RailNavigator = {
			id: 'calendar',
			label: 'Calendar',
			icon: {} as RailNavigator['icon'],
			component: {} as RailNavigator['component'],
			lens: () => ({ kind: 'day', target: pick }),
		};
		expect(restoreRailItem('calendar', [calendar])).toEqual({ item: 'calendar', lens: { kind: 'day', target: '2026-10-27' } });
		pick = '2026-10-28';
		expect(restoreRailItem('calendar', [calendar]).lens).toEqual({ kind: 'day', target: '2026-10-28' });
	});

	it('falls back to the default item while the saved navigator is not registered', () => {
		expect(restoreRailItem('calendar', [])).toEqual({ item: 'today', lens: TODAY_LENS });
	});

	it("restores the Neighbourhood item with its note's lens while a note is set", () => {
		expect(NEIGHBOURHOOD_RAIL_ITEM).toBe('neighbourhood');
		expect(restoreRailItem(NEIGHBOURHOOD_RAIL_ITEM, [], '/vault/a.md')).toEqual({
			item: 'neighbourhood',
			lens: { kind: NEIGHBOURHOOD_LENS_KIND, target: '/vault/a.md' },
		});
	});

	it('falls back to the default item for Neighbourhood without a note (after a restart)', () => {
		expect(restoreRailItem(NEIGHBOURHOOD_RAIL_ITEM)).toEqual({ item: 'today', lens: TODAY_LENS });
		expect(restoreRailItem(NEIGHBOURHOOD_RAIL_ITEM, [], null)).toEqual({ item: 'today', lens: TODAY_LENS });
	});

	it('ignores the Neighbourhood note on any other saved item', () => {
		expect(restoreRailItem('inbox', [], '/vault/a.md')).toEqual({ item: 'inbox', lens: INBOX_LENS });
	});
});

describe('resolveLens - Neighbourhood', () => {
	const HUB = `${VAULT}/Work/Project Alpha.md`;
	const groupsOf = (lens: ReturnType<typeof resolveLens>) =>
		lens?.groups?.map((g) => ({ id: g.id, label: g.label, notes: g.notes.map((n) => n.title) }));

	it('lists the note, then its outgoing links, backlinks and relationship groups, in that order', () => {
		const entries = [
			entryV2(HUB, {
				isA: 'Project',
				outgoingLinks: outgoingLinksFromContent('[[Spec]] [[Ghost]] [[spec]] [[Project Alpha]] [[Brief|the brief]]'),
				belongsTo: ['Roadmap'],
				relatedTo: ['Bob', 'Missing'],
				hasMany: ['Task one'],
				relationships: { client: ['Acme'], mentor: ['Bob'] },
			}),
			entryV2(`${VAULT}/Spec.md`),
			entryV2(`${VAULT}/Brief.md`),
			entryV2(`${VAULT}/Roadmap.md`),
			entryV2(`${VAULT}/People/Bob.md`),
			entryV2(`${VAULT}/Task one.md`),
			entryV2(`${VAULT}/Acme.md`),
			entryV2(`${VAULT}/old-mention.md`, { modifiedAt: 100, outgoingLinks: outgoingLinksFromContent('[[Project Alpha]]') }),
			entryV2(`${VAULT}/new-child.md`, {
				modifiedAt: 300,
				archived: true,
				outgoingLinks: outgoingLinksFromContent('[[Work/Project Alpha]] [[project alpha]]'),
			}),
			entryV2(`${VAULT}/_system/templates/Uses.md`, { modifiedAt: 200, outgoingLinks: outgoingLinksFromContent('[[Project Alpha]]') }),
			entryV2(`${VAULT}/unrelated.md`, { outgoingLinks: outgoingLinksFromContent('[[Spec]]') }),
		];
		const lens = resolveLens(neighbourhoodLens(HUB), ctx(entries));

		expect(lens?.label).toBe('Project Alpha');
		expect(lens?.rule).toBe('Project Alpha and everything linked to it');
		expect(groupsOf(lens)).toEqual([
			{ id: 'note', label: 'This note', notes: ['Project Alpha'] },
			// Link order, each note once, the note itself and unresolved links left out.
			{ id: 'outgoing', label: 'Outgoing links', notes: ['Spec', 'Brief'] },
			// Newest change first; archived and system-folder notes stay.
			{ id: 'backlinks', label: 'Backlinks', notes: ['new-child', 'Uses', 'old-mention'] },
			{ id: 'belongs-to', label: 'Belongs to', notes: ['Roadmap'] },
			{ id: 'related-to', label: 'Related to', notes: ['Bob'] },
			{ id: 'has-many', label: 'Has many', notes: ['Task one'] },
			{ id: 'other', label: 'Other relationships', notes: ['Acme', 'Bob'] },
		]);
		// Every note once, in group order.
		expect(lens?.notes.map((n) => n.title)).toEqual([
			'Project Alpha', 'Spec', 'Brief', 'new-child', 'Uses', 'old-mention', 'Roadmap', 'Bob', 'Task one', 'Acme',
		]);
		expect(lens?.groups?.[0].notes[0].subtitle).toBe('Project · Work');
	});

	it('lists every group, empty, for a note with no links in any direction', () => {
		const entries = [entryV2(HUB), entryV2(`${VAULT}/other.md`, { outgoingLinks: outgoingLinksFromContent('[[Elsewhere]]') })];
		const lens = resolveLens(neighbourhoodLens(HUB), ctx(entries));

		expect(groupsOf(lens)).toEqual([
			{ id: 'note', label: 'This note', notes: ['Project Alpha'] },
			{ id: 'outgoing', label: 'Outgoing links', notes: [] },
			{ id: 'backlinks', label: 'Backlinks', notes: [] },
			{ id: 'belongs-to', label: 'Belongs to', notes: [] },
			{ id: 'related-to', label: 'Related to', notes: [] },
			{ id: 'has-many', label: 'Has many', notes: [] },
			{ id: 'other', label: 'Other relationships', notes: [] },
		]);
		expect(lens?.notes.map((n) => n.title)).toEqual(['Project Alpha']);
	});

	it('resolves to null when the note is not in the snapshot, or the lens has no note', () => {
		expect(resolveLens(neighbourhoodLens(HUB), ctx([entryV2(`${VAULT}/other.md`)]))).toBeNull();
		expect(resolveLens(neighbourhoodLens(HUB), ctx([]))).toBeNull();
		expect(resolveLens({ kind: NEIGHBOURHOOD_LENS_KIND }, ctx([entryV2(HUB)]))).toBeNull();
	});

	it('has no New here rule', () => {
		const now = dayjs('2026-10-27T10:00:00');
		expect(
			newNoteRule(neighbourhoodLens(HUB), { vaultPath: VAULT, captureBaseFolder: 'Inbox', captureFolderFormat: 'YYYY', now }),
		).toBeNull();
	});
});

describe('View lens', () => {
	const groups = (filter: Parameters<typeof parseFilterToGroups>[0]) => parseFilterToGroups(filter);
	const KNOWN = ['Project', 'Person'];

	describe('viewNoteType', () => {
		it('gives the type of one _type equality filter', () => {
			expect(viewNoteType(groups('_type == "Project"'), KNOWN)).toBe('Project');
			expect(viewNoteType(groups({ and: ['_type == "Project"', 'status == "active"'] }), KNOWN)).toBe('Project');
		});

		it('reads the `type` alias and takes the known casing of the type', () => {
			expect(viewNoteType(groups('type == "project"'), KNOWN)).toBe('Project');
			expect(viewNoteType(groups('_type == "Recipe"'), KNOWN)).toBe('Recipe');
		});

		it('reads the note. and property. forms of the type field, as the engine does', () => {
			expect(viewNoteType(groups("note._type == 'Project'"), KNOWN)).toBe('Project');
			expect(viewNoteType(groups("note.type == 'project'"), KNOWN)).toBe('Project');
			expect(viewNoteType(groups("property._type == 'Person'"), KNOWN)).toBe('Person');
			expect(viewNoteType(groups("property.type == 'Person'"), KNOWN)).toBe('Person');
			expect(viewNoteType(groups({ and: ["note._type == 'Project'", "_type == 'Person'"] }), KNOWN)).toBeNull();
			expect(viewNoteType(groups("file._type == 'Project'"), KNOWN)).toBeNull();
		});

		it('combines the global and the view filters', () => {
			expect(viewNoteType([...groups('status == "active"'), ...groups('_type == "Person"')], KNOWN)).toBe('Person');
		});

		it('gives no type without a _type equality filter', () => {
			expect(viewNoteType([], KNOWN)).toBeNull();
			expect(viewNoteType(groups('status == "active"'), KNOWN)).toBeNull();
			expect(viewNoteType(groups('_type != "Project"'), KNOWN)).toBeNull();
		});

		it('gives no type for several _type equality filters', () => {
			expect(viewNoteType(groups({ and: ['_type == "Project"', '_type == "Person"'] }), KNOWN)).toBeNull();
			expect(viewNoteType([...groups('_type == "Project"'), ...groups('type == "Project"')], KNOWN)).toBeNull();
		});

		it('gives no type when a _type filter sits in an OR or NOT group', () => {
			expect(viewNoteType(groups({ or: ['_type == "Project"', '_type == "Person"'] }), KNOWN)).toBeNull();
			expect(viewNoteType(groups({ or: ['_type == "Project"'] }), KNOWN)).toBeNull();
			expect(viewNoteType(groups({ and: ['_type == "Project"'], or: ['_type == "Person"', 'x == 1'] }), KNOWN)).toBeNull();
			expect(viewNoteType(groups({ and: ['_type == "Project"'], not: ['_type == "Person"'] }), KNOWN)).toBeNull();
		});
	});

	describe('describeViewFilters', () => {
		it('writes the filters in words, not archived', () => {
			expect(describeViewFilters(groups({ and: ['_type == "Project"', 'status == "active"'] }))).toBe(
				"_type == 'Project' and status == 'active', not archived",
			);
			expect(describeViewFilters(groups({ or: ['a == 1', 'b == 2'] }))).toBe('(a == 1 or b == 2), not archived');
			expect(describeViewFilters(groups({ not: ['a == 1'] }))).toBe('not a == 1, not archived');
		});

		it('says every note when there are no filters', () => {
			expect(describeViewFilters([])).toBe('every note, not archived');
		});
	});

	describe('viewNavigatorRows', () => {
		const tree: FileTreeNode[] = [
			{ name: 'Views', path: `${VAULT}/Views`, isDirectory: true, children: [
				{ name: 'Zeta.view', path: `${VAULT}/Views/Zeta.view`, isDirectory: false },
				{ name: 'Alpha.view', path: `${VAULT}/Views/Alpha.view`, isDirectory: false },
			] },
			{ name: 'Mid.view', path: `${VAULT}/Mid.view`, isDirectory: false },
			{ name: 'note.md', path: `${VAULT}/note.md`, isDirectory: false },
		];
		const byPath = new Map([
			[`${VAULT}/Mid.view`, entryV2(`${VAULT}/Mid.view`, { frontmatter: { _sidebar_label: 'Middle', _order: 1 } })],
		]);

		it('lists the .view files by _order, then name, labelled by _sidebar_label', () => {
			const rows = viewNavigatorRows(tree, byPath);
			expect(rows.map((r) => r.label)).toEqual(['Middle', 'Alpha', 'Zeta']);
			expect(rows[0]).toEqual({
				lens: { kind: VIEW_LENS_KIND, target: `${VAULT}/Mid.view` },
				label: 'Middle',
				count: null,
				typeName: null,
				definitionPath: null,
			});
		});

		it('is empty without .view files', () => {
			expect(viewNavigatorRows([], new Map())).toEqual([]);
		});
	});

	describe('queryViewLens and resolveViewLens', () => {
		const VIEW = `${VAULT}/Projects.view`;
		const files: Record<string, string> = {
			[`${VAULT}/Work/b.md`]: '---\n_type: Project\nrank: 1\n---\n',
			[`${VAULT}/Work/a.md`]: '---\n_type: Project\nrank: 3\n---\n',
			[`${VAULT}/Work/c.md`]: '---\n_type: Project\nrank: 2\n---\n',
			[`${VAULT}/Work/old.md`]: '---\n_type: Project\nrank: 9\n_archived: true\n---\n',
			[`${VAULT}/person.md`]: '---\n_type: Person\n---\n',
			[`${VAULT}/_system/templates/Project.md`]: '---\n_type: Project\nrank: 0\n---\n',
		};
		const index = new Map<string, NoteRecord>(Object.entries(files).map(([p, c]) => [p, buildNoteRecord(p, c)]));
		const entries = [
			entryV2(`${VAULT}/Work/a.md`, { isA: 'Project', modifiedAt: 300 }),
			entryV2(`${VAULT}/Work/b.md`, { isA: 'Project', modifiedAt: 100 }),
			entryV2(`${VAULT}/Work/c.md`, { isA: 'Project', modifiedAt: 200 }),
			entryV2(`${VAULT}/Work/old.md`, { isA: 'Project', archived: true, modifiedAt: 400 }),
			entryV2(`${VAULT}/person.md`, { isA: 'Person' }),
			entryV2(`${VAULT}/_system/templates/Project.md`, { isA: 'Project' }),
			entryV2(VIEW, { frontmatter: { _sidebar_label: 'All projects', _sort: 'title' } }),
		];
		const def = (sort?: { column: string; direction: 'ASC' | 'DESC' }[]): CollectionDefinition => ({
			filters: '_type == "Project"',
			views: [{ type: 'table', name: 'Projects', ...(sort ? { sort } : {}) }],
		});

		it('lists the query result in the order its Sort shows', () => {
			const result = queryViewLens(def([{ column: 'rank', direction: 'DESC' }]), null, index);
			const lens = resolveViewLens(VIEW, result, ctx(entries));
			expect(lens.label).toBe('All projects');
			expect(lens.rule).toBe("_type == 'Project', not archived");
			expect(lens.notes.map((n) => n.title)).toEqual(['a', 'c', 'b']);
		});

		it("falls back to the view's _sort when it has no Sort", () => {
			const lens = resolveViewLens(VIEW, queryViewLens(def(), null, index), ctx(entries));
			expect(lens.notes.map((n) => n.title)).toEqual(['a', 'b', 'c']);
		});

		it('applies the toolbar overrides instead of the saved filters and sort', () => {
			const person = groups('_type == "Person"');
			const result = queryViewLens(def(), {
				globalFilters: person,
				viewFilters: [],
				sort: [{ column: 'file.name', direction: 'ASC' }],
			}, index);
			expect(resolveViewLens(VIEW, result, ctx(entries)).notes.map((n) => n.title)).toEqual(['person']);
			expect(result?.filterGroups).toEqual(person);
		});

		it('leaves out archived notes and the system folder', () => {
			const paths = resolveViewLens(VIEW, queryViewLens(def(), null, index), ctx(entries)).notes.map((n) => n.path);
			expect(paths).not.toContain(`${VAULT}/Work/old.md`);
			expect(paths).not.toContain(`${VAULT}/_system/templates/Project.md`);
		});

		it('labels the view by its file name without _sidebar_label', () => {
			const lens = resolveViewLens(`${VAULT}/Plain.view`, queryViewLens(def(), null, index), ctx(entries));
			expect(lens.label).toBe('Plain');
		});

		it('resolves to an empty list when the query could not run', () => {
			expect(queryViewLens({ views: [] }, null, index)).toBeNull();
			const lens = resolveViewLens(VIEW, null, ctx(entries));
			expect(lens).toEqual({ label: 'All projects', rule: '', notes: [] });
		});

		it('resolves to an empty list over an empty index', () => {
			expect(resolveViewLens(VIEW, queryViewLens(def(), null, new Map()), ctx(entries)).notes).toEqual([]);
		});
	});

	describe('view pick', () => {
		const viewRows = viewNavigatorRows([{ name: 'P.view', path: `${VAULT}/P.view`, isDirectory: false }], new Map());

		it('parses a saved view pick', () => {
			expect(parseTypesPick({ kind: 'view', target: `${VAULT}/P.view` })).toEqual({ kind: 'view', target: `${VAULT}/P.view` });
			expect(parseTypesPick({ kind: 'view' })).toBeNull();
			expect(parseTypesPick({ kind: 'view', target: '' })).toBeNull();
		});

		it('picks the first row, a view, when nothing is saved', () => {
			expect(pickedTypesLens(null, viewRows)).toEqual({ kind: 'view', target: `${VAULT}/P.view` });
		});

		it('keeps a view that still exists and drops a deleted one', () => {
			expect(staleTypesPickFix('types', { kind: 'view', target: `${VAULT}/P.view` }, viewRows)).toBeNull();
			expect(staleTypesPickFix('types', { kind: 'view', target: `${VAULT}/Gone.view` }, viewRows)).toEqual({
				railItem: DEFAULT_RAIL_ITEM,
				railTypesLens: null,
			});
		});
	});

	describe('newNoteRule - View', () => {
		const NOW = dayjs('2026-10-31T09:15:00');
		const newCtx = (viewTypeName: string | null, vaultPath: string | null = VAULT): NewNoteContext => ({
			vaultPath,
			captureBaseFolder: '_notes',
			captureFolderFormat: 'YYYY/MM-MMM',
			now: NOW,
			viewTypeName,
		});
		const lens = { kind: VIEW_LENS_KIND, target: `${VAULT}/P.view` };

		it("creates a note of the view's type", () => {
			expect(newNoteRule(lens, newCtx('Project'))).toEqual({ typeName: 'Project' });
		});

		it('creates a plain note where Cmd+N puts one when the view has no single type', () => {
			const cmdN = buildCapturePath(VAULT, '_notes', 'YYYY/MM-MMM', '[n-]HH-mm', NOW);
			expect(newNoteRule(lens, newCtx(null))).toEqual({ folder: cmdN.slice(0, cmdN.lastIndexOf('/')), frontmatter: {} });
		});

		it('yields no rule without a vault or a view', () => {
			expect(newNoteRule(lens, newCtx('Project', null))).toBeNull();
			expect(newNoteRule({ kind: VIEW_LENS_KIND }, newCtx('Project'))).toBeNull();
		});
	});
});

describe('Folder lens', () => {
	const file = (path: string, modifiedAt = 0): FileTreeNode => ({
		name: path.split('/').pop()!,
		path,
		isDirectory: false,
		modifiedAt,
	});
	const dir = (path: string, children: FileTreeNode[]): FileTreeNode => ({
		name: path.split('/').pop()!,
		path,
		isDirectory: true,
		children,
	});
	const WORK = `${VAULT}/Work`;
	const PROJECTS = `${WORK}/projects`;
	const tree: FileTreeNode[] = [
		dir(`${VAULT}/.obsidian`, [file(`${VAULT}/.obsidian/app.json`)]),
		dir(WORK, [
			dir(`${WORK}/.hidden`, [file(`${WORK}/.hidden/secret.md`)]),
			dir(PROJECTS, [file(`${PROJECTS}/Alpha.md`)]),
			file(`${WORK}/Plan.md`, 2_000),
			file(`${WORK}/Board.canvas`, 3_000),
			file(`${WORK}/Tasks.kanban`),
			file(`${WORK}/Open.view`),
			file(`${WORK}/Spec.pdf`),
			file(`${WORK}/Shot.png`),
			file(`${WORK}/notes.txt`),
			file(`${WORK}/.DS_Store`),
		]),
		file(`${VAULT}/Welcome.md`),
	];
	const entries = [
		entryV2(`${WORK}/Plan.md`, { isA: 'Project', modifiedAt: 2, favorite: true, frontmatter: { status: 'active' } }),
		entryV2(`${PROJECTS}/Alpha.md`),
		entryV2(`${VAULT}/Welcome.md`),
	];
	const folderCtx = (fileTree: FileTreeNode[] = tree) => ctx(entries, '_system', undefined, fileTree);
	const folder = (target?: string) => ({ kind: FOLDER_LENS_KIND, ...(target ? { target } : {}) });

	describe('fileKind', () => {
		it('names the kind of each file the list shows', () => {
			expect(fileKind('a.md')).toBe('markdown');
			expect(fileKind('a.MARKDOWN')).toBe('markdown');
			expect(fileKind('a.canvas')).toBe('canvas');
			expect(fileKind('a.kanban')).toBe('kanban');
			expect(fileKind('a.view')).toBe('view');
			expect(fileKind('a.collection')).toBe('collection');
			expect(fileKind('a.pdf')).toBe('pdf');
			expect(fileKind('a.PNG')).toBe('image');
			expect(fileKind('a.webp')).toBe('image');
			expect(fileKind('a.txt')).toBe('other');
			expect(fileKind('README')).toBe('other');
		});
	});

	describe('resolveFolderLens through resolveLens', () => {
		it('lists the direct children only, of every file kind, in tree order', () => {
			const lens = resolveLens(folder(WORK), folderCtx());
			expect(lens?.notes.map((n) => n.path)).toEqual([
				`${WORK}/Plan.md`,
				`${WORK}/Board.canvas`,
				`${WORK}/Tasks.kanban`,
				`${WORK}/Open.view`,
				`${WORK}/Spec.pdf`,
				`${WORK}/Shot.png`,
				`${WORK}/notes.txt`,
			]);
			expect(lens?.notes.map((n) => n.kind)).toEqual(['markdown', 'canvas', 'kanban', 'view', 'pdf', 'image', 'other']);
		});

		it('leaves out nested notes, subfolders and hidden files', () => {
			const paths = resolveLens(folder(WORK), folderCtx())!.notes.map((n) => n.path);
			expect(paths).not.toContain(`${PROJECTS}/Alpha.md`);
			expect(paths).not.toContain(PROJECTS);
			expect(paths).not.toContain(`${WORK}/.hidden/secret.md`);
			expect(paths).not.toContain(`${WORK}/.DS_Store`);
		});

		it('labels the lens with the folder name and the rule "in <folder>/"', () => {
			const lens = resolveLens(folder(PROJECTS), folderCtx());
			expect(lens?.label).toBe('projects');
			expect(lens?.rule).toBe('in Work/projects/');
			expect(lens?.notes.map((n) => n.title)).toEqual(['Alpha']);
		});

		it('fills a markdown row from its entry and other files from the tree', () => {
			const [plan, board] = resolveLens(folder(WORK), folderCtx())!.notes;
			expect(plan).toMatchObject({ title: 'Plan', isA: 'Project', favorite: true, frontmatter: { status: 'active' } });
			expect(plan.subtitle).toBe('Project · Work');
			expect(board).toMatchObject({ title: 'Board', isA: null, favorite: false, frontmatter: {}, modifiedAt: 3, subtitle: 'Canvas', italic: false });
		});

		it('lists the vault root without a target or with the vault path', () => {
			for (const lens of [folder(), folder(VAULT)]) {
				const resolved = resolveLens(lens, folderCtx());
				expect(resolved?.label).toBe('vault');
				expect(resolved?.rule).toBe('in the vault root');
				expect(resolved?.notes.map((n) => n.path)).toEqual([`${VAULT}/Welcome.md`]);
			}
		});

		it('lists nothing for an empty folder', () => {
			const lens = resolveLens(folder(`${VAULT}/Empty`), folderCtx([dir(`${VAULT}/Empty`, [])]));
			expect(lens?.notes).toEqual([]);
			expect(lens?.rule).toBe('in Empty/');
		});

		it('resolves to null when the folder no longer exists, is a file or is hidden', () => {
			expect(resolveLens(folder(`${VAULT}/Gone`), folderCtx())).toBeNull();
			expect(resolveLens(folder(`${VAULT}/Welcome.md`), folderCtx())).toBeNull();
			expect(resolveLens(folder(`${VAULT}/.obsidian`), folderCtx())).toBeNull();
		});

		it('resolves to null without a vault', () => {
			expect(resolveLens(folder(), { ...folderCtx(), vaultPath: null })).toBeNull();
		});
	});

	describe('navigatorFolders', () => {
		it('keeps folders only, without hidden ones, in tree order', () => {
			expect(navigatorFolders(tree).map((n) => n.path)).toEqual([WORK]);
			expect(navigatorFolders(tree[1].children!).map((n) => n.path)).toEqual([PROJECTS]);
		});

		it('gives nothing for no nodes', () => {
			expect(navigatorFolders([])).toEqual([]);
			expect(navigatorFolders(undefined)).toEqual([]);
		});
	});

	describe('Files rail item and pick', () => {
		it('restores the Files rail item with the bare folder lens', () => {
			expect(restoreRailItem('files')).toEqual({ item: 'files', lens: FILES_LENS });
			expect(FILES_LENS).toEqual({ kind: 'folder' });
		});

		it('picks the saved folder, else the vault root', () => {
			expect(pickedFolderLens(WORK)).toEqual({ kind: 'folder', target: WORK });
			expect(pickedFolderLens(null)).toEqual(FILES_LENS);
			expect(pickedFolderLens('')).toEqual(FILES_LENS);
			expect(pickedFolderLens(42)).toEqual(FILES_LENS);
		});
	});

	describe('parseExpandedFolders', () => {
		it('keeps the saved folder paths', () => {
			expect(parseExpandedFolders([WORK, PROJECTS])).toEqual([WORK, PROJECTS]);
			expect(parseExpandedFolders([])).toEqual([]);
		});

		it('reads a hand-edited value as no folders and drops non-string items', () => {
			expect(parseExpandedFolders('Work')).toEqual([]);
			expect(parseExpandedFolders(null)).toEqual([]);
			expect(parseExpandedFolders([WORK, 7, ''])).toEqual([WORK]);
		});
	});

	describe('followFolderPathChange', () => {
		const RENAMED = `${VAULT}/Job`;

		it('keeps a renamed picked folder picked under its new path, and its expanded state', () => {
			expect(followFolderPathChange(WORK, [WORK, PROJECTS], WORK, RENAMED)).toEqual({
				railFolder: RENAMED,
				railExpandedFolders: [RENAMED, `${RENAMED}/projects`],
			});
		});

		it('re-roots a pick inside a renamed or moved parent', () => {
			expect(followFolderPathChange(PROJECTS, [], WORK, RENAMED)).toEqual({ railFolder: `${RENAMED}/projects` });
		});

		it('leaves unrelated paths and sibling prefixes alone', () => {
			expect(followFolderPathChange(`${VAULT}/Work2`, [`${VAULT}/Work2`], WORK, RENAMED)).toBeNull();
			expect(followFolderPathChange(`${VAULT}/Personal`, [], WORK, null)).toBeNull();
		});

		it('sends a deleted pick, or a pick inside a deleted folder, back to the vault root', () => {
			expect(followFolderPathChange(WORK, [], WORK, null)).toEqual({ railFolder: null });
			expect(followFolderPathChange(PROJECTS, [], WORK, null)).toEqual({ railFolder: null });
		});

		it('drops a deleted folder and its subfolders from the expanded list', () => {
			expect(followFolderPathChange(null, [WORK, PROJECTS, `${VAULT}/Personal`], WORK, null)).toEqual({
				railExpandedFolders: [`${VAULT}/Personal`],
			});
		});

		it('does nothing with no pick and no expanded folders, or a hand-edited list', () => {
			expect(followFolderPathChange(null, [], WORK, RENAMED)).toBeNull();
			expect(followFolderPathChange(null, 'Work', WORK, null)).toBeNull();
		});
	});

	describe('toggleExpandedFolder', () => {
		it('adds a collapsed folder and removes an expanded one', () => {
			expect(toggleExpandedFolder([WORK], PROJECTS)).toEqual([WORK, PROJECTS]);
			expect(toggleExpandedFolder([WORK, PROJECTS], WORK)).toEqual([PROJECTS]);
		});

		it('starts from no folders when the saved list is hand-edited', () => {
			expect(toggleExpandedFolder('Work', WORK)).toEqual([WORK]);
		});
	});

	describe('staleFolderPickFix', () => {
		it('does nothing when the pick and every expanded folder still exist', () => {
			expect(staleFolderPickFix('files', WORK, [WORK, PROJECTS], tree, VAULT)).toBeNull();
			expect(staleFolderPickFix('files', null, [], tree, VAULT)).toBeNull();
			expect(staleFolderPickFix('files', VAULT, [], tree, VAULT)).toBeNull();
		});

		it('clears a gone pick and goes back to the default item when Files is active', () => {
			expect(staleFolderPickFix('files', `${VAULT}/Gone`, [WORK], tree, VAULT)).toEqual({
				railItem: DEFAULT_RAIL_ITEM,
				railFolder: null,
			});
		});

		it('clears a gone pick without moving the rail when another item is active', () => {
			expect(staleFolderPickFix('types', `${VAULT}/Gone`, [], tree, VAULT)).toEqual({ railFolder: null });
		});

		it('drops expanded folders that no longer exist', () => {
			expect(staleFolderPickFix('files', WORK, [WORK, `${VAULT}/Gone`], tree, VAULT)).toEqual({ railExpandedFolders: [WORK] });
		});

		it('leaves everything saved when the tree is empty, as after a failed tree load', () => {
			expect(staleFolderPickFix('files', WORK, [WORK, PROJECTS], [], VAULT)).toBeNull();
		});

		it('reads a hand-edited expanded list that is not an array of strings as empty', () => {
			expect(staleFolderPickFix('files', null, 'Work', tree, VAULT)).toEqual({ railExpandedFolders: [] });
			expect(staleFolderPickFix('files', null, [WORK, 7], tree, VAULT)).toEqual({ railExpandedFolders: [WORK] });
		});
	});

	describe('newNoteRule - Folder', () => {
		const newCtx = (vaultPath: string | null = VAULT): NewNoteContext => ({
			vaultPath,
			captureBaseFolder: '_notes',
			captureFolderFormat: 'YYYY/MM-MMM',
			now: dayjs('2026-10-31T09:15:00'),
		});

		it('creates a plain note in the picked folder', () => {
			expect(newNoteRule(folder(PROJECTS), newCtx())).toEqual({ folder: PROJECTS, frontmatter: {} });
		});

		it('creates it at the vault root before a pick', () => {
			expect(newNoteRule(FILES_LENS, newCtx())).toEqual({ folder: VAULT, frontmatter: {} });
		});

		it('yields no rule without a vault', () => {
			expect(newNoteRule(folder(PROJECTS), newCtx(null))).toBeNull();
		});
	});
});
