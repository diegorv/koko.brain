import { describe, it, expect } from 'vitest';
import {
	DEFAULT_QUICK,
	GROUP_ROW_CAP,
	applyQuickFilters,
	buildTaskRows,
	collapseKey,
	defaultTaskExcludes,
	defaultTaskQuery,
	describeTaskQuery,
	explainEmptyTasks,
	DEFAULT_TASK_SORT,
	headingSources,
	hideFolder,
	hideNote,
	onlyThisFolder,
	tagHeadingCardText,
	selectSourceRows,
	groupTaskRows,
	isQuickFieldDefault,
	matchesNestedTag,
	statusFilterLabel,
	tagMenuOptions,
	taskCountText,
	taskTagOptions,
	toggleQuickPriority,
	toggleQuickStatus,
	toggleQuickTag,
	type DueRange,
	type QuickFilterField,
	type TaskGroup,
	type TaskExcludes,
	type TaskGroupKey,
	type TaskQuery,
	type TaskQuickFilters,
	type TaskRow,
	type TaskSource,
	type TaskSourceClause,
	type VisibleRow,
} from '#lib/features/tasks/task-query.logic.js';
import type { TaskPriority, TaskStatus } from '#lib/features/tasks/task-metadata.types.js';
import { parseSectionTags, taskDisplayText } from '#lib/features/tasks/tasks.logic.js';
import type { TaskItem } from '#lib/features/tasks/tasks.types.js';
import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { sevenStatusGroup, taskEntryV2, taskGroupV2, taskV2 } from '../../../fixtures/tasks.fixture';
import { entryV2 } from '../../../fixtures/vault-entries.fixture';
import { runtimeTimeZoneSwitchWorks, withTimeZone } from '../../../fixtures/timezone.fixture';

const DAY = 24 * 60 * 60 * 1000;
const TODAY = '2026-11-05';
const NOW = new Date('2026-11-05T12:00:00Z').getTime();

/** A note's snapshot entry holding `tasks`, with `modifiedAt` given in ms as the rows carry it. */
function group(filePath: string, tasks: TaskItem[], modifiedAt = NOW): NoteEntryV2 {
	return taskEntryV2(taskGroupV2(filePath, tasks, modifiedAt / 1000));
}

/** `buildTaskRows` with no overlay. */
const rowsFrom = (entries: NoteEntryV2[], vaultPath: string | null) => buildTaskRows(entries, vaultPath, new Map());

/** One note: `## A #to-list` / `### B #to-list` / `### C` / `## Other`, a task under each, and one before them. */
const sections = (path = '/vault/s.md', overrides: Partial<NoteEntryV2> = {}) =>
	entryV2(path, {
		taskHeadings: [
			{ level: 2, text: 'A #to-list', line: 2 },
			{ level: 3, text: 'B #to-list', line: 4 },
			{ level: 3, text: 'C', line: 6 },
			{ level: 2, text: 'Other', line: 8 },
		],
		tasks: [
			taskV2('before', { lineNumber: 1 }),
			taskV2('under A', { lineNumber: 3, heading: 0 }),
			taskV2('under B', { lineNumber: 5, heading: 1, status: 'done' }),
			taskV2('under C', { lineNumber: 7, heading: 2 }),
			taskV2('under Other', { lineNumber: 9, heading: 3 }),
		],
		...overrides,
	});

/** A parent task under `## Misc` and its child under `## List #to-list`. */
const parentOutside = () =>
	entryV2('/vault/p.md', {
		taskHeadings: [{ level: 2, text: 'Misc', line: 1 }, { level: 2, text: 'List #to-list', line: 4 }],
		tasks: [taskV2('outside parent', { lineNumber: 2, heading: 0 }), taskV2('child', { lineNumber: 5, indent: 1, heading: 1 })],
	});

/** A task as Rust sends it, at `indent` on `lineNumber`. */
const task = (status: TaskStatus, indent: number, lineNumber: number, text = `${status} ${lineNumber}`) =>
	taskV2(text, { status, indent, lineNumber });

/** Rows of one note under `/vault`. */
const rowsOf = (tasks: TaskItem[], filePath = '/vault/a.md') => rowsFrom([group(filePath, tasks)], '/vault');

/** `[text, dimmed]` per visible row. */
const shown = (rows: VisibleRow[]) => rows.map((r) => [r.text, r.dimmed]);

describe('applyQuickFilters: the open rule', () => {
	const statuses = (rows: VisibleRow[]) => rows.map((r) => r.status);
	const seven = () => rowsFrom([taskEntryV2(sevenStatusGroup())], '/vault');

	it('keeps the five open statuses under Open and drops done and cancelled', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'open' }, TODAY, NOW))).toEqual([
			'todo',
			'in-progress',
			'question',
			'important',
			'forwarded',
		]);
	});

	it('keeps only done and cancelled under Closed', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'closed' }, TODAY, NOW))).toEqual(['done', 'cancelled']);
	});

	it('keeps every row under All', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'all' }, TODAY, NOW))).toHaveLength(7);
	});

	it('lets chosen statuses win over show', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'closed', statuses: ['in-progress', 'done'] }, TODAY, NOW))).toEqual([
			'in-progress',
			'done',
		]);
	});

	it('falls back to show when statuses is empty', () => {
		expect(statuses(applyQuickFilters(seven(), { show: 'closed', statuses: [] }, TODAY, NOW))).toEqual(['done', 'cancelled']);
	});

	it('keeps a done parent with an in-progress child, both sent checked, dimming the parent', () => {
		const rows = rowsOf([
			taskV2('Parent', { status: 'done', checked: true, indent: 0, lineNumber: 1 }),
			taskV2('Child', { status: 'in-progress', checked: true, indent: 1, lineNumber: 2 }),
		]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW))).toEqual([
			['Parent', true],
			['Child', false],
		]);
	});

	it('returns new objects and leaves the input rows untouched', () => {
		const rows = rowsOf([task('todo', 0, 1)]);
		const [visible] = applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW);
		expect(visible).not.toBe(rows[0]);
		expect(rows[0]).not.toHaveProperty('dimmed');
	});

	it('returns nothing for no rows', () => {
		expect(applyQuickFilters([], DEFAULT_QUICK, TODAY, NOW)).toEqual([]);
	});
});

describe('applyQuickFilters: dimming', () => {
	it('dims each failing ancestor of a passing row', () => {
		const rows = rowsOf([task('done', 0, 1), task('done', 1, 2), task('todo', 2, 3)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW))).toEqual([
			['done 1', true],
			['done 2', true],
			['todo 3', false],
		]);
	});

	it('keeps a done parent with an open in-progress child dimmed', () => {
		const rows = rowsOf([task('done', 0, 1), task('in-progress', 1, 2)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW))).toEqual([
			['done 1', true],
			['in-progress 2', false],
		]);
	});

	it('drops a done row followed by a todo row at the same indent', () => {
		const rows = rowsOf([task('done', 0, 1), task('todo', 0, 2)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW))).toEqual([['todo 2', false]]);
	});

	it('drops a done row whose subtree ends before a later todo at a smaller or equal indent', () => {
		const rows = rowsOf([task('done', 1, 1), task('done', 2, 2), task('todo', 0, 3), task('done', 1, 4), task('todo', 1, 5)]);
		expect(shown(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW))).toEqual([
			['todo 3', false],
			['todo 5', false],
		]);
	});

	it('never keeps a done row for a passing row of another note', () => {
		const rows = rowsFrom(
			[group('/vault/a.md', [task('done', 0, 1)]), group('/vault/b.md', [task('todo', 1, 1)])],
			'/vault',
		);
		expect(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW).map((r) => [r.filePath, r.text])).toEqual([['/vault/b.md', 'todo 1']]);
	});

	it('drops a done parent whose whole subtree is closed, with its subtree', () => {
		const rows = rowsOf([task('done', 0, 1), task('done', 1, 2), task('cancelled', 2, 3)]);
		expect(applyQuickFilters(rows, DEFAULT_QUICK, TODAY, NOW)).toEqual([]);
	});

	it('dims an open parent of a passing done row under Closed', () => {
		const rows = rowsOf([task('todo', 0, 1), task('done', 1, 2)]);
		expect(shown(applyQuickFilters(rows, { show: 'closed' }, TODAY, NOW))).toEqual([
			['todo 1', true],
			['done 2', false],
		]);
	});
});

describe('buildTaskRows', () => {
	it('sets relPath and folder for a root note and a nested note', () => {
		const rows = rowsFrom(
			[group('/vault/Root.md', [task('todo', 0, 1)]), group('/vault/Projects/Clients/B.md', [task('todo', 0, 1)])],
			'/vault',
		);
		expect(rows.map((r) => [r.relPath, r.folder])).toEqual([
			['Projects/Clients/B.md', 'Projects/Clients'],
			['Root.md', ''],
		]);
		expect(rows.map((r) => r.filePath)).toEqual(['/vault/Projects/Clients/B.md', '/vault/Root.md']);
	});

	it('keeps the absolute path as relPath and an empty folder outside the vault', () => {
		const [outside, lookalike] = rowsFrom(
			[group('/elsewhere/x.md', [task('todo', 0, 1)]), group('/vault2/x.md', [task('todo', 0, 1)])],
			'/vault',
		);
		expect([outside.relPath, outside.folder]).toEqual(['/elsewhere/x.md', '']);
		expect([lookalike.relPath, lookalike.folder]).toEqual(['/vault2/x.md', '']);
	});

	it('keeps the absolute path as relPath and an empty folder with no vault open', () => {
		const [row] = rowsFrom([group('/vault/Projects/x.md', [task('todo', 0, 1)])], null);
		expect([row.relPath, row.folder]).toEqual(['/vault/Projects/x.md', '']);
	});

	it('copies every task field and sets noteTitle, open and modifiedAt', () => {
		const t = taskV2('Ship 📅 2026-11-03', {
			status: 'in-progress',
			indent: 0,
			lineNumber: 4,
			metadata: { description: 'Ship', dueDate: '2026-11-03', tags: ['work'] },
		});
		const [row] = rowsFrom([group('/vault/Plan.md', [t], 1234)], '/vault');
		expect(row).toMatchObject({ ...t, noteTitle: 'Plan', open: true, modifiedAt: 1234, filePath: '/vault/Plan.md' });
		const [closed] = rowsOf([task('cancelled', 0, 1)]);
		expect(closed.open).toBe(false);
	});

	it('counts the note\'s tasks and open tasks over its kept tasks', () => {
		const rows = rowsOf([task('todo', 0, 1), task('done', 0, 2), task('in-progress', 0, 3)]);
		expect(rows.map((r) => [r.noteTaskCount, r.noteOpenCount])).toEqual([
			[3, 2],
			[3, 2],
			[3, 2],
		]);
	});

	it('sets parentLine to the nearest earlier task with a smaller indent, never from another note', () => {
		const rows = rowsFrom(
			[
				group('/vault/a.md', [task('todo', 0, 1), task('todo', 1, 2), task('todo', 2, 3), task('todo', 1, 5), task('todo', 0, 6)]),
				group('/vault/b.md', [task('todo', 1, 1)]),
			],
			'/vault',
		);
		expect(rows.map((r) => r.parentLine)).toEqual([undefined, 1, 2, 1, undefined, undefined]);
	});

	it('sorts the notes by path and keeps the document order', () => {
		const rows = rowsFrom(
			[group('/vault/z.md', [task('todo', 0, 3), task('todo', 0, 7)]), group('/vault/a.md', [task('todo', 0, 1)])],
			'/vault',
		);
		expect(rows.map((r) => `${r.relPath}:${r.lineNumber}`)).toEqual(['a.md:1', 'z.md:3', 'z.md:7']);
	});

	it('compares numbers in note paths as numbers', () => {
		const rows = rowsFrom([group('/vault/note 10.md', [task('todo', 0, 1)]), group('/vault/note 9.md', [task('todo', 0, 1)])], '/vault');
		expect(rows.map((r) => r.relPath)).toEqual(['note 9.md', 'note 10.md']);
	});

	it('gives no rows for no entries, and none for an entry without tasks', () => {
		expect(rowsFrom([], '/vault')).toEqual([]);
		expect(rowsFrom([entryV2('/vault/empty.md')], '/vault')).toEqual([]);
	});

	it('fills the note fields from the entry', () => {
		const frontmatter = { status: 'open', n: 3 };
		const entry = entryV2('/vault/Projects/Clients/ACME.md', {
			isA: 'Project',
			tags: ['work', 'a/b'],
			archived: true,
			organized: false,
			favorite: true,
			frontmatter,
			modifiedAt: 1_700_000_000,
			tasks: [taskV2('Call')],
		});
		const [row] = rowsFrom([entry], '/vault');
		expect(row).toMatchObject({
			noteType: 'Project',
			noteTags: ['work', 'a/b'],
			archived: true,
			organized: false,
			favorite: true,
			relPath: 'Projects/Clients/ACME.md',
			folder: 'Projects/Clients',
			noteTitle: 'ACME',
			modifiedAt: 1_700_000_000_000,
			headings: [],
		});
		expect(row.properties).toBe(frontmatter);
		expect(row).not.toHaveProperty('key');
		expect(row).not.toHaveProperty('heading');
	});

	it('changes neither the snapshot array, its entries, their tasks nor their frontmatter', () => {
		const entries = [
			entryV2('/vault/note 10.md', { frontmatter: { a: 1 }, tasks: [taskV2('ten', { status: 'done' })] }),
			entryV2('/vault/note 9.md', { tasks: [taskV2('nine')] }),
		];
		const before = structuredClone(entries);
		const firstEntry = entries[0];
		const firstTasks = entries[0].tasks;

		const rows = buildTaskRows(entries, '/vault', new Map([['/vault/note 10.md:1', { text: 'ten', status: 'todo', version: 1 }]]));

		expect(rows.map((r) => r.relPath)).toEqual(['note 9.md', 'note 10.md']);
		expect(entries).toEqual(before);
		expect(entries[0]).toBe(firstEntry);
		expect(entries[0].tasks).toBe(firstTasks);
	});

	describe('headings', () => {
		it('keeps every task, with its heading chain', () => {
			const rows = buildTaskRows([sections()], '/vault', new Map());
			expect(rows.map((r) => r.text)).toEqual(['before', 'under A', 'under B', 'under C', 'under Other']);
			expect(rows.map((r) => r.headings)).toEqual([[], ['A #to-list'], ['A #to-list', 'B #to-list'], ['A #to-list', 'C'], ['Other']]);
			expect(rows.map((r) => [r.noteTaskCount, r.noteOpenCount])[0]).toEqual([5, 4]);
		});

		it('sets parentLine over every task of the note, whatever its heading', () => {
			const [, child] = buildTaskRows([parentOutside()], '/vault', new Map());
			expect(child.text).toBe('child');
			expect(child.parentLine).toBe(2);
		});
	});

	describe('overlay', () => {
		const note = () =>
			entryV2('/vault/a.md', {
				tasks: [taskV2('one', { lineNumber: 1 }), taskV2('two', { lineNumber: 2 })],
			});

		it('changes status, text, checked and open of its row only', () => {
			const overlay = new Map([['/vault/a.md:2', { text: 'two, edited', status: 'done' as const, version: 3 }]]);
			const rows = buildTaskRows([note()], '/vault', overlay);
			expect(rows.map((r) => [r.text, r.status, r.checked, r.open])).toEqual([
				['one', 'todo', false, true],
				['two, edited', 'done', true, false],
			]);
			expect(rows.map((r) => [r.noteTaskCount, r.noteOpenCount])).toEqual([
				[2, 1],
				[2, 1],
			]);
		});

		it('sets checked from an overlaid todo status', () => {
			const entry = entryV2('/vault/a.md', { tasks: [taskV2('one', { status: 'done' })] });
			const [row] = buildTaskRows([entry], '/vault', new Map([['/vault/a.md:1', { text: 'one', status: 'todo' as const, version: 3 }]]));
			expect([row.status, row.checked, row.open]).toEqual(['todo', false, true]);
		});

		it("replaces the row's metadata when the entry carries one, and keeps the snapshot's when it does not", () => {
			const metadata = { description: 'two', dueDate: '2026-11-06', priority: 'high' as const, tags: [] };
			const overlay = new Map([
				['/vault/a.md:1', { text: 'one', status: 'done' as const, version: 3 }],
				['/vault/a.md:2', { text: 'two 📅 2026-11-06 ⏫', status: 'todo' as const, version: 3, metadata }],
			]);
			const rows = buildTaskRows([note()], '/vault', overlay);
			expect(rows.map((r) => r.metadata)).toEqual([{ description: 'one', tags: [] }, metadata]);
		});

		it('applies to no other note at the same line', () => {
			const other = entryV2('/vault/b.md', { tasks: [taskV2('b one')] });
			const rows = buildTaskRows([note(), other], '/vault', new Map([['/vault/a.md:1', { text: 'one', status: 'done' as const, version: 3 }]]));
			expect(rows.map((r) => [r.filePath, r.status])).toEqual([
				['/vault/a.md', 'done'],
				['/vault/a.md', 'todo'],
				['/vault/b.md', 'todo'],
			]);
		});
	});
});

/** No exclude on. */
const NO_EXCLUDES: TaskExcludes = {
	archived: false,
	typeDefinitions: false,
	templatesFolder: false,
	systemFolder: false,
	folders: [],
	notes: [],
	tags: [],
	types: [],
};

/** The default template and system folder settings. */
const FOLDERS = { templates: '_system/templates', system: '_system' };

describe('query defaults', () => {
	it('defaultTaskExcludes turns the four switches on with empty lists', () => {
		expect(defaultTaskExcludes()).toEqual({
			archived: true,
			typeDefinitions: true,
			templatesFolder: true,
			systemFolder: true,
			folders: [],
			notes: [],
			tags: [],
			types: [],
		});
		expect(defaultTaskExcludes()).not.toBe(defaultTaskExcludes());
	});

	it('headingSources gives one card per tag, and none for no tag', () => {
		expect(headingSources(['#a', '#b'])).toEqual([
			{ clauses: [{ kind: 'heading', text: '#a', match: 'tag' }] },
			{ clauses: [{ kind: 'heading', text: '#b', match: 'tag' }] },
		]);
		expect(headingSources([])).toEqual([]);
	});

	describe('tagHeadingCardText', () => {
		const tagCard = (text: string): TaskSource => ({ clauses: [{ kind: 'heading', text, match: 'tag' }] });

		it('joins the trimmed texts of the cards holding one tag heading clause', () => {
			expect(tagHeadingCardText([tagCard(' #a '), tagCard('b'), tagCard('#c/')])).toBe('#a b #c/');
		});

		it("is '' for no card", () => {
			expect(tagHeadingCardText([])).toBe('');
		});

		it('leaves out substring heading cards, other clause kinds and cards of several clauses', () => {
			expect(
				tagHeadingCardText([
					tagCard('#a'),
					{ clauses: [{ kind: 'heading', text: 'Inbox', match: 'substring' }] },
					{ clauses: [{ kind: 'folder', path: 'Projects' }] },
					{ clauses: [{ kind: 'folder', path: 'Projects' }, ...tagCard('#b').clauses] },
					{ clauses: [] },
				]),
			).toBe('#a');
		});

		it.each([[''], ['  '], ['#'], [' #/ ']])('is null while a tag heading card holds %j, no tag yet', (text) => {
			expect(tagHeadingCardText([tagCard('#a'), tagCard(text)])).toBeNull();
		});
	});

	it('defaultTaskQuery holds the #to-list card, the default excludes and DEFAULT_QUICK', () => {
		expect(defaultTaskQuery()).toEqual({
			version: 1,
			sources: headingSources(['#to-list']),
			exclude: defaultTaskExcludes(),
			quick: DEFAULT_QUICK,
		});
	});
});

describe('selectSourceRows', () => {
	/** A note with one task whose text is the note's vault-relative path. */
	const note = (relPath: string, fields: Partial<NoteEntryV2> = {}) =>
		entryV2(`/vault/${relPath}`, { tasks: [taskV2(relPath)], ...fields });

	/** The texts of the rows `sources` and `exclude` keep. */
	const select = (entries: NoteEntryV2[], sources: TaskSource[], exclude = NO_EXCLUDES, folders = FOLDERS) =>
		selectSourceRows(rowsFrom(entries, '/vault'), sources, exclude, folders).map((r) => r.text);

	const card = (...clauses: TaskSourceClause[]): TaskSource => ({ clauses });

	describe('folder clause', () => {
		const entries = () => [note('Projects/a.md'), note('Projects/ACME/b.md'), note('Projects2/c.md'), note('d.md')];

		it('matches the folder and every folder under it, not a sibling sharing its prefix', () => {
			expect(select(entries(), [card({ kind: 'folder', path: 'Projects' })])).toEqual(['Projects/a.md', 'Projects/ACME/b.md']);
		});

		it('trims leading and trailing slashes', () => {
			expect(select(entries(), [card({ kind: 'folder', path: '/Projects/' })])).toEqual(['Projects/a.md', 'Projects/ACME/b.md']);
			expect(select(entries(), [card({ kind: 'folder', path: 'Projects/ACME/' })])).toEqual(['Projects/ACME/b.md']);
		});

		it('is case-sensitive', () => {
			expect(select(entries(), [card({ kind: 'folder', path: 'projects' })])).toEqual([]);
		});

		it('keeps the rest when negated', () => {
			expect(select(entries(), [card({ kind: 'folder', path: 'Projects', negate: true })])).toEqual(['d.md', 'Projects2/c.md']);
		});
	});

	describe('type clause', () => {
		const entries = () => [note('a.md', { isA: 'Project' }), note('b.md', { isA: 'Meeting' }), note('c.md')];

		it('matches the note type, ignoring case; a note with no type never matches', () => {
			expect(select(entries(), [card({ kind: 'type', type: 'PROJECT' })])).toEqual(['a.md']);
		});

		it('keeps the other notes, untyped ones included, when negated', () => {
			expect(select(entries(), [card({ kind: 'type', type: 'project', negate: true })])).toEqual(['b.md', 'c.md']);
		});
	});

	describe('note tag clause', () => {
		const entries = () => [
			note('a.md', { tags: ['work/client'] }),
			note('b.md', { tags: ['workshop'] }),
			note('c.md', { tags: ['Work'] }),
			note('d.md', { tags: ['#work'] }),
			note('e.md'),
		];

		it('matches the tag and its nested tags, ignoring case and a # on either side', () => {
			expect(select(entries(), [card({ kind: 'noteTag', tag: 'work' })])).toEqual(['a.md', 'c.md', 'd.md']);
			expect(select(entries(), [card({ kind: 'noteTag', tag: '#work' })])).toEqual(['a.md', 'c.md', 'd.md']);
		});

		it('keeps the rest when negated', () => {
			expect(select(entries(), [card({ kind: 'noteTag', tag: '#work', negate: true })])).toEqual(['b.md', 'e.md']);
		});
	});

	describe('property clause', () => {
		/** One note per frontmatter value of `status` (absent for `missing.md`), named after its value. */
		const entries = () => [
			note('string.md', { frontmatter: { status: 'Active' } }),
			note('number.md', { frontmatter: { status: 2 } }),
			note('boolean.md', { frontmatter: { status: true } }),
			note('list.md', { frontmatter: { status: ['draft', 'ACTIVE'] } }),
			note('missing.md', { frontmatter: { other: 'active' } }),
			note('empty-string.md', { frontmatter: { status: '' } }),
			note('null.md', { frontmatter: { status: null } }),
			note('empty-list.md', { frontmatter: { status: [] } }),
			note('object.md', { frontmatter: { status: { state: 'active' } } }),
			note('object-list.md', { frontmatter: { status: [{ state: 'active' }, null] } }),
		];
		const where = (op: 'is' | 'isNot' | 'contains' | 'exists', value?: string, key = 'status') =>
			select(entries(), [card({ kind: 'property', key, op, ...(value === undefined ? {} : { value }) })]);

		it('is: equals a scalar or a list element, ignoring case; an object never matches', () => {
			expect(where('is', 'active')).toEqual(['list.md', 'string.md']);
			expect(where('is', 'act')).toEqual([]);
		});

		it('is: compares numbers and booleans as String(value)', () => {
			expect(where('is', '2')).toEqual(['number.md']);
			expect(where('is', 'TRUE')).toEqual(['boolean.md']);
		});

		it('isNot: keeps every note `is` drops, a missing key and an object included', () => {
			expect(where('isNot', 'active')).toEqual([
				'boolean.md',
				'empty-list.md',
				'empty-string.md',
				'missing.md',
				'null.md',
				'number.md',
				'object-list.md',
				'object.md',
			]);
		});

		it('contains: a substring of a string or a list element, ignoring case; an object never matches', () => {
			expect(where('contains', 'CTIV')).toEqual(['list.md', 'string.md']);
			expect(where('contains', 'raf')).toEqual(['list.md']);
			expect(where('contains', 'state')).toEqual([]);
			expect(where('contains', 'ru')).toEqual(['boolean.md']);
		});

		it("exists: the key is present and not null, '' or []", () => {
			expect(where('exists')).toEqual(['boolean.md', 'list.md', 'number.md', 'object-list.md', 'object.md', 'string.md']);
		});

		it('matches the key exactly, case included', () => {
			expect(where('exists', undefined, 'Status')).toEqual([]);
			expect(where('is', 'active', ' status ')).toEqual(['list.md', 'string.md']);
		});

		it('trims the value', () => {
			expect(where('is', ' active ')).toEqual(['list.md', 'string.md']);
		});

		it.each([
			['is', undefined, 'status'],
			['contains', '  ', 'status'],
			['isNot', '', 'status'],
			['exists', undefined, ' '],
			['is', 'active', ''],
		] as const)('op %s with value %j and key %j is inactive, matching every row', (op, value, key) => {
			expect(where(op, value, key)).toHaveLength(10);
		});
	});

	describe('heading clause', () => {
		/** One task under each heading text, in one note. */
		const under = (...headings: string[]) =>
			entryV2('/vault/h.md', {
				taskHeadings: headings.map((text, i) => ({ level: 2, text, line: i * 2 + 1 })),
				tasks: headings.map((text, i) => taskV2(`under ${text}`, { lineNumber: i * 2 + 2, heading: i })),
			});

		it('reads each task\'s heading chain, per row', () => {
			expect(select([sections()], [card({ kind: 'heading', text: '#to-list', match: 'tag' })])).toEqual([
				'under A',
				'under B',
				'under C',
			]);
		});

		it('matches a nested tag in tag mode, not a longer tag or one in parentheses', () => {
			const entry = under('A #to-list/today', 'B #to-listing', 'C (#to-list)');
			expect(select([entry], [card({ kind: 'heading', text: '#to-list', match: 'tag' })])).toEqual(['under A #to-list/today']);
		});

		it('matches the text with its # anywhere in the heading in substring mode', () => {
			const entry = under('A #to-list/today', 'B #to-listing', 'C plain to-list');
			expect(select([entry], [card({ kind: 'heading', text: '#to-list', match: 'substring' })])).toEqual([
				'under A #to-list/today',
				'under B #to-listing',
			]);
		});

		it('keeps a child under the heading without its parent outside it', () => {
			expect(select([parentOutside()], [card({ kind: 'heading', text: '#to-list', match: 'tag' })])).toEqual(['child']);
		});
	});

	describe('cards and clauses', () => {
		const entries = () => [
			note('Projects/a.md', { tags: ['work'] }),
			note('Projects/b.md'),
			note('Home/c.md', { tags: ['work'] }),
			note('Home/d.md', { isA: 'Meeting' }),
		];

		it('ANDs the clauses of a card', () => {
			expect(select(entries(), [card({ kind: 'folder', path: 'Projects' }, { kind: 'noteTag', tag: 'work' })])).toEqual(['Projects/a.md']);
		});

		it('ORs the cards', () => {
			expect(
				select(entries(), [
					card({ kind: 'folder', path: 'Projects' }, { kind: 'noteTag', tag: 'work' }),
					card({ kind: 'type', type: 'Meeting' }),
				]),
			).toEqual(['Home/d.md', 'Projects/a.md']);
		});

		it('keeps every row for no card and for an empty card', () => {
			const all = ['Home/c.md', 'Home/d.md', 'Projects/a.md', 'Projects/b.md'];
			expect(select(entries(), [])).toEqual(all);
			expect(select(entries(), [card()])).toEqual(all);
			expect(select(entries(), [card({ kind: 'type', type: 'Nope' }), card()])).toEqual(all);
		});

		it.each([
			[{ kind: 'folder', path: '  ' }],
			[{ kind: 'folder', path: '/', negate: true }],
			[{ kind: 'type', type: ' ' }],
			[{ kind: 'type', type: '', negate: true }],
			[{ kind: 'noteTag', tag: '#' }],
			[{ kind: 'noteTag', tag: ' # ', negate: true }],
			[{ kind: 'heading', text: '', match: 'tag' }],
			[{ kind: 'heading', text: ' #', match: 'substring' }],
		] as [TaskSourceClause][])('treats the empty clause %j as matching every row', (clause) => {
			expect(select(entries(), [card(clause)])).toHaveLength(4);
			expect(select(entries(), [card(clause, { kind: 'folder', path: 'Home' })])).toEqual(['Home/c.md', 'Home/d.md']);
		});
	});

	describe('excludes', () => {
		const entries = () => [
			note('_system/templates/T.md'),
			note('_system/S.md'),
			note('Old.md', { archived: true }),
			note('Types/Project.md', { isA: 'Type' }),
			note('Projects/a.md', { tags: ['work/client'], isA: 'Project' }),
			note('Projects/ACME/b.md'),
		];
		const only = (partial: Partial<TaskExcludes>) => ({ ...NO_EXCLUDES, ...partial });

		it('drops archived notes', () => {
			expect(select(entries(), [], only({ archived: true }))).not.toContain('Old.md');
			expect(select(entries(), [], only({ archived: true }))).toHaveLength(5);
		});

		it('drops type definitions (noteType Type)', () => {
			expect(select(entries(), [], only({ typeDefinitions: true }))).toEqual([
				'_system/S.md',
				'_system/templates/T.md',
				'Old.md',
				'Projects/a.md',
				'Projects/ACME/b.md',
			]);
		});

		it('drops the templates folder only, or the whole system folder', () => {
			expect(select(entries(), [], only({ templatesFolder: true }))).not.toContain('_system/templates/T.md');
			expect(select(entries(), [], only({ templatesFolder: true }))).toContain('_system/S.md');
			const system = select(entries(), [], only({ systemFolder: true }));
			expect(system).not.toContain('_system/S.md');
			expect(system).not.toContain('_system/templates/T.md');
		});

		it('drops nothing for an empty template or system folder setting', () => {
			expect(select(entries(), [], only({ templatesFolder: true, systemFolder: true }), { templates: '', system: '' })).toHaveLength(6);
		});

		it('reads the folder settings with the folder rule', () => {
			const kept = select(entries(), [], only({ templatesFolder: true }), { templates: '/Projects/', system: '' });
			expect(kept).not.toContain('Projects/a.md');
			expect(kept).not.toContain('Projects/ACME/b.md');
			expect(kept).toHaveLength(4);
		});

		it('drops listed folders, notes, tags and types', () => {
			expect(select(entries(), [], only({ folders: ['Projects/ACME'] }))).not.toContain('Projects/ACME/b.md');
			expect(select(entries(), [], only({ notes: ['Old.md'] }))).not.toContain('Old.md');
			expect(select(entries(), [], only({ notes: ['old.md'] }))).toContain('Old.md');
			expect(select(entries(), [], only({ tags: ['#work'] }))).not.toContain('Projects/a.md');
			expect(select(entries(), [], only({ types: ['project'] }))).not.toContain('Projects/a.md');
		});

		it('ignores empty list values', () => {
			expect(select(entries(), [], only({ folders: [' ', '/'], notes: [''], tags: ['#'], types: [''] }))).toHaveLength(6);
		});

		it('wins over a card that names the excluded folder', () => {
			expect(select(entries(), [card({ kind: 'folder', path: 'Projects' })], only({ folders: ['Projects/ACME'] }))).toEqual([
				'Projects/a.md',
			]);
			expect(select(entries(), [card({ kind: 'folder', path: '_system' })], only({ systemFolder: true }))).toEqual([]);
		});
	});

	it('counts each note\'s tasks and open tasks over its kept rows, leaving the input rows untouched', () => {
		const rows = rowsFrom([sections()], '/vault');
		const kept = selectSourceRows(rows, headingSources(['#to-list']), NO_EXCLUDES, FOLDERS);
		expect(kept.map((r) => [r.text, r.noteTaskCount, r.noteOpenCount])).toEqual([
			['under A', 3, 2],
			['under B', 3, 2],
			['under C', 3, 2],
		]);
		expect(rows.map((r) => [r.noteTaskCount, r.noteOpenCount])[0]).toEqual([5, 4]);
	});

	it('with defaultTaskQuery drops a template task and an archived note\'s task, and keeps one under ## Inbox #to-list', () => {
		const inbox = (path: string, fields: Partial<NoteEntryV2> = {}) =>
			entryV2(path, {
				taskHeadings: [{ level: 2, text: 'Inbox #to-list', line: 1 }],
				tasks: [taskV2(path, { lineNumber: 2, heading: 0 })],
				tags: ['work'],
				...fields,
			});
		const rows = buildTaskRows(
			[inbox('/vault/_system/templates/Daily.md'), inbox('/vault/Old.md', { archived: true }), inbox('/vault/Notes/Plan.md')],
			'/vault',
			new Map(),
		);
		const { sources, exclude } = defaultTaskQuery();
		expect(selectSourceRows(rows, sources, exclude, FOLDERS).map((r) => r.relPath)).toEqual(['Notes/Plan.md']);
		expect(selectSourceRows(rows, [card({ kind: 'noteTag', tag: '#work' })], exclude, FOLDERS).map((r) => r.relPath)).toEqual([
			'Notes/Plan.md',
		]);
	});

	it('returns nothing for no rows', () => {
		expect(selectSourceRows([], [], defaultTaskExcludes(), FOLDERS)).toEqual([]);
	});
});

describe('group header actions', () => {
	const query = (sources: TaskSource[], exclude: Partial<TaskExcludes> = {}): TaskQuery => ({
		version: 1,
		sources,
		exclude: { ...NO_EXCLUDES, ...exclude },
		quick: { show: 'open' },
	});
	const projects: TaskSourceClause = { kind: 'folder', path: 'Projects' };

	describe('onlyThisFolder', () => {
		it('adds one card holding the folder clause when there is no card', () => {
			expect(onlyThisFolder(query([]), 'Projects').sources).toEqual([{ clauses: [projects] }]);
		});

		it('adds the folder clause to the one card, so it ANDs with its clauses', () => {
			const tag: TaskSourceClause = { kind: 'heading', text: '#to-list', match: 'tag' };
			expect(onlyThisFolder(query([{ clauses: [tag] }]), 'Projects').sources).toEqual([{ clauses: [tag, projects] }]);
		});

		it('adds it to every card, an empty card included, so no card widens the list past the folder', () => {
			const type: TaskSourceClause = { kind: 'type', type: 'Meeting' };
			expect(onlyThisFolder(query([{ clauses: [type] }, { clauses: [] }]), 'Projects').sources).toEqual([
				{ clauses: [type, projects] },
				{ clauses: [projects] },
			]);
		});

		it('leaves a card that already holds the folder clause as it is, and a negated one does not count', () => {
			const same: TaskSource = { clauses: [{ kind: 'folder', path: '/Projects/' }] };
			const negated: TaskSourceClause = { kind: 'folder', path: 'Projects', negate: true };
			const next = onlyThisFolder(query([same, { clauses: [negated] }]), 'Projects');
			expect(next.sources[0]).toBe(same);
			expect(next.sources[1]).toEqual({ clauses: [negated, projects] });
		});

		it('keeps the excludes and quick filters, leaves the input untouched, and lists only that folder', () => {
			const before = query([{ clauses: [{ kind: 'type', type: 'Project' }] }], { folders: ['Archive'] });
			const snapshot = structuredClone(before);
			const next = onlyThisFolder(before, 'Projects');
			expect(before).toEqual(snapshot);
			expect(next.exclude).toBe(before.exclude);
			expect(next.quick).toBe(before.quick);
			const rows = rowsFrom(
				[
					entryV2('/vault/Projects/a.md', { isA: 'Project', tasks: [taskV2('a')] }),
					entryV2('/vault/Home/b.md', { isA: 'Project', tasks: [taskV2('b')] }),
				],
				'/vault',
			);
			expect(selectSourceRows(rows, next.sources, next.exclude, FOLDERS).map((r) => r.text)).toEqual(['a']);
		});

		it('returns the query unchanged for the vault root', () => {
			const before = query([]);
			expect(onlyThisFolder(before, '')).toBe(before);
		});
	});

	describe('hideFolder', () => {
		it('adds the folder to the excluded folders, keeping the sources', () => {
			const before = query(headingSources(['#to-list']), { folders: ['Archive'] });
			const next = hideFolder(before, 'Projects');
			expect(next.exclude).toEqual({ ...NO_EXCLUDES, folders: ['Archive', 'Projects'] });
			expect(next.sources).toBe(before.sources);
			expect(before.exclude.folders).toEqual(['Archive']);
		});

		it('returns the query unchanged when the folder is already excluded, written with slashes or not', () => {
			const before = query([], { folders: ['/Projects/'] });
			expect(hideFolder(before, 'Projects')).toBe(before);
		});

		it('returns the query unchanged for the vault root', () => {
			const before = query([]);
			expect(hideFolder(before, '')).toBe(before);
		});
	});

	describe('hideNote', () => {
		it('adds the note path to the excluded notes', () => {
			const next = hideNote(query([], { notes: ['Inbox.md'] }), 'Projects/P.md');
			expect(next.exclude.notes).toEqual(['Inbox.md', 'Projects/P.md']);
		});

		it('returns the query unchanged when the note is already excluded', () => {
			const before = query([], { notes: ['Projects/P.md'] });
			expect(hideNote(before, 'Projects/P.md')).toBe(before);
		});
	});

	it('names the hidden folder and note in the sentence', () => {
		const next = hideNote(hideFolder(query([]), 'Projects'), 'Home/H.md');
		expect(describeTaskQuery(next)).toBe('Open tasks from every note, except folder Projects, note Home/H.md');
	});
});

describe('groupTaskRows', () => {
	const SORT = [...DEFAULT_TASK_SORT];

	/** A todo task on `lineNumber` with `meta` merged into its metadata. */
	const t = (text: string, lineNumber: number, meta: Partial<TaskItem['metadata']> = {}, extra: Partial<TaskItem> = {}) =>
		taskV2(text, { lineNumber, metadata: { description: text, tags: [], ...meta }, ...extra });

	/**
	 * Five notes, in an order that is neither path nor `modifiedAt` order
	 * (each note's rows built on their own, so `buildTaskRows` does not sort
	 * them). Today is 2026-11-05.
	 */
	const mixed = () =>
		applyQuickFilters(
			[
				group('/vault/Projects/x.md', [
					t('B1', 1, { dueDate: '2026-11-05', priority: 'low' }),
					t('B2', 2, { priority: 'none' }),
				], 300),
				group('/vault/note 10.md', [t('A1', 1, { dueDate: '2026-11-04', priority: 'highest' }), t('A2', 2, { dueDate: '2026-11-06' })], 100),
				group('/vault/Projects/y.md', [
					t('C1', 1, { dueDate: '2026-11-07', priority: 'medium' }, { status: 'done' }),
					t('C2', 2, { dueDate: '2026-11-12', priority: 'lowest' }, { status: 'in-progress' }),
				], 500),
				group('/vault/note 9.md', [
					t('D1', 1, { dueDate: '2026-11-13', priority: 'high' }, { status: 'question' }),
					t('D2', 2, { dueDate: '2026-11-06' }, { status: 'important' }),
				], 200),
				group('/vault/Archive/z.md', [
					t('E1', 1, {}, { status: 'cancelled' }),
					t('E2', 2, { dueDate: '2026-11-06' }, { status: 'forwarded' }),
				], 400),
			].flatMap((entry) => rowsFrom([entry], '/vault')),
			{ show: 'all' },
			TODAY,
			NOW,
		);

	/** `[key, label, row texts]` per group. */
	const summary = (groups: TaskGroup[]) => groups.map((g) => [g.key, g.label, g.rows.map((r) => r.text)]);

	it('note: one group per note in the incoming order whatever modifiedAt, rows in document order', () => {
		expect(summary(groupTaskRows(mixed(), 'note', SORT, TODAY))).toEqual([
			['/vault/Projects/x.md', 'x', ['B1', 'B2']],
			['/vault/note 10.md', 'note 10', ['A1', 'A2']],
			['/vault/Projects/y.md', 'y', ['C1', 'C2']],
			['/vault/note 9.md', 'note 9', ['D1', 'D2']],
			['/vault/Archive/z.md', 'z', ['E1', 'E2']],
		]);
	});

	it('folder: Vault root first, then folders in path order, two notes of a folder merged', () => {
		expect(summary(groupTaskRows(mixed(), 'folder', SORT, TODAY))).toEqual([
			['', 'Vault root', ['A1', 'D2', 'A2', 'D1']],
			['Archive', 'Archive', ['E2', 'E1']],
			['Projects', 'Projects', ['B1', 'C1', 'C2', 'B2']],
		]);
	});

	it('due: buckets in order, 11-04 overdue, 11-05 today, 11-06 tomorrow, 11-07 and 11-12 this week, 11-13 later', () => {
		expect(summary(groupTaskRows(mixed(), 'due', SORT, TODAY))).toEqual([
			['overdue', 'Overdue', ['A1']],
			['today', 'Today', ['B1']],
			// Same due date and priority: path order, `note 9` before `note 10`.
			['tomorrow', 'Tomorrow', ['E2', 'D2', 'A2']],
			['week', 'This week', ['C1', 'C2']],
			['later', 'Later', ['D1']],
			['none', 'No date', ['E1', 'B2']],
		]);
	});

	it("priority: No priority between Medium and Low, holding a 'none' row and a row with no priority", () => {
		expect(summary(groupTaskRows(mixed(), 'priority', SORT, TODAY))).toEqual([
			['highest', 'Highest', ['A1']],
			['high', 'High', ['D1']],
			['medium', 'Medium', ['C1']],
			['none', 'No priority', ['E2', 'D2', 'A2', 'E1', 'B2']],
			['low', 'Low', ['B1']],
			['lowest', 'Lowest', ['C2']],
		]);
	});

	it('status: one group per status in TASK_STATUSES order, labelled with the capitalised word', () => {
		expect(summary(groupTaskRows(mixed(), 'status', SORT, TODAY))).toEqual([
			['todo', 'Todo', ['A1', 'B1', 'A2', 'B2']],
			['in-progress', 'In progress', ['C2']],
			['question', 'Question', ['D1']],
			['important', 'Important', ['D2']],
			['forwarded', 'Forwarded', ['E2']],
			['done', 'Done', ['C1']],
			['cancelled', 'Cancelled', ['E1']],
		]);
	});

	it("sorts by priority first under ['priority', 'due', 'path']", () => {
		const [todo] = groupTaskRows(mixed(), 'status', ['priority', 'due', 'path'], TODAY);
		expect(todo.rows.map((r) => r.text)).toEqual(['A1', 'A2', 'B2', 'B1']);
	});

	it('falls back to path then line after the sort keys, so an empty sort still gives one order', () => {
		const [todo] = groupTaskRows(mixed(), 'status', [], TODAY);
		expect(todo.rows.map((r) => r.text)).toEqual(['A1', 'A2', 'B1', 'B2']);
	});

	it('leaves out empty groups', () => {
		const rows = mixed().filter((r) => r.text === 'A1');
		expect(summary(groupTaskRows(rows, 'due', SORT, TODAY))).toEqual([['overdue', 'Overdue', ['A1']]]);
	});

	it('gives no group for no rows', () => {
		for (const by of ['note', 'folder', 'due', 'priority', 'status'] as TaskGroupKey[]) {
			expect(groupTaskRows([], by, SORT, TODAY)).toEqual([]);
		}
	});

	describe('note group fields and counts', () => {
		/** Two notes, out of path order: each note's rows are built on their own. */
		const twoNotes = () =>
			[
				group('/vault/Projects/b.md', [task('todo', 0, 1), task('todo', 0, 2), task('done', 0, 3)], 5),
				group('/vault/a.md', [task('todo', 0, 1)], 9),
			].flatMap((entry) => rowsFrom([entry], '/vault'));

		it('carries filePath, folder and modifiedAt from the first row', () => {
			const groups = groupTaskRows(applyQuickFilters(twoNotes(), { show: 'all' }, TODAY, NOW), 'note', SORT, TODAY);
			expect(groups.map((g) => [g.filePath, g.label, g.folder, g.modifiedAt, g.rows.length])).toEqual([
				['/vault/Projects/b.md', 'b', 'Projects', 5, 3],
				['/vault/a.md', 'a', '', 9, 1],
			]);
		});

		it('reads total from noteTaskCount and open from noteOpenCount, so total stays 3 with 2 rows passing', () => {
			const [b] = groupTaskRows(applyQuickFilters(twoNotes(), { show: 'open' }, TODAY, NOW), 'note', SORT, TODAY);
			expect(b.rows.map((r) => r.lineNumber)).toEqual([1, 2]);
			expect([b.total, b.open]).toEqual([3, 2]);
		});

		it('keeps total and open whatever show hides, and leaves out a note with no visible row', () => {
			const groups = groupTaskRows(applyQuickFilters(twoNotes(), { show: 'closed' }, TODAY, NOW), 'note', SORT, TODAY);
			expect(groups.map((g) => g.filePath)).toEqual(['/vault/Projects/b.md']);
			expect([groups[0].total, groups[0].open]).toEqual([3, 2]);
			expect(groups[0].rows.map((r) => r.lineNumber)).toEqual([3]);
		});

		const parentAndChildren = () =>
			applyQuickFilters(rowsOf([task('done', 0, 1), task('todo', 1, 2), task('todo', 1, 3)]), { show: 'open' }, TODAY, NOW);

		it('counts a dimmed parent out of count but keeps it in rows', () => {
			const [note] = groupTaskRows(parentAndChildren(), 'note', SORT, TODAY);
			expect(note.count).toBe(2);
			expect(note.rows.map((r) => [r.lineNumber, r.dimmed])).toEqual([[1, true], [2, false], [3, false]]);
		});

		it('gives a flat group count equal to rows.length', () => {
			const groups = groupTaskRows(parentAndChildren(), 'status', SORT, TODAY);
			expect(groups.map((g) => [g.key, g.count, g.rows.length])).toEqual([['todo', 2, 2]]);
		});

		it('carries no note fields on a flat group', () => {
			const [g] = groupTaskRows(parentAndChildren(), 'status', SORT, TODAY);
			expect([g.filePath, g.folder, g.modifiedAt, g.total, g.open]).toEqual([undefined, undefined, undefined, undefined, undefined]);
		});
	});

	describe('breadcrumbs', () => {
		/** A done parent due 11-04 and its todo child due 11-05: different due buckets. */
		const family = () =>
			rowsOf([
				t('Plan trip ^plan1', 1, { dueDate: '2026-11-04' }, { status: 'done' }),
				t('Book train', 2, { dueDate: '2026-11-05' }, { indent: 1 }),
			]);

		it('sets the parent text on a child in another bucket and drops the dimmed parent', () => {
			const groups = groupTaskRows(applyQuickFilters(family(), { show: 'open' }, TODAY, NOW), 'due', SORT, TODAY);
			expect(groups.map((g) => [g.key, g.rows.map((r) => [r.text, r.breadcrumb])])).toEqual([
				['today', [['Book train', 'Plan trip']]],
			]);
		});

		it('sets it when the parent sits in the same group, and never in a note group', () => {
			const visible = applyQuickFilters(family(), { show: 'all' }, TODAY, NOW);
			const [parent, child] = groupTaskRows(visible, 'folder', SORT, TODAY)[0].rows;
			expect([parent.text, parent.breadcrumb]).toEqual(['Plan trip ^plan1', undefined]);
			expect(child.breadcrumb).toBe(taskDisplayText(family()[0]));
			expect(child.breadcrumb).toBe('Plan trip');
			expect(groupTaskRows(visible, 'note', SORT, TODAY)[0].rows.map((r) => r.breadcrumb)).toEqual([undefined, undefined]);
		});

		it('gives no breadcrumb for a parentLine with no matching row', () => {
			const orphan = applyQuickFilters(family(), { show: 'all' }, TODAY, NOW).filter((r) => r.lineNumber === 2);
			expect(orphan[0].parentLine).toBe(1);
			const [today] = groupTaskRows(orphan, 'due', SORT, TODAY);
			expect(today.rows.map((r) => r.breadcrumb)).toEqual([undefined]);
		});
	});
});

describe('collapseKey', () => {
	it('joins the grouping and the raw group key', () => {
		expect(collapseKey('note', '/vault/A.md')).toBe('note:/vault/A.md');
		expect(collapseKey('due', 'overdue')).toBe('due:overdue');
	});

	it('keys the vault-root folder as `folder:`', () => {
		expect(collapseKey('folder', '')).toBe('folder:');
	});

	it('keeps the same raw key apart under two groupings', () => {
		expect(collapseKey('due', 'none')).not.toBe(collapseKey('priority', 'none'));
	});
});

describe('GROUP_ROW_CAP', () => {
	it('is 50', () => {
		expect(GROUP_ROW_CAP).toBe(50);
	});
});

/** A todo task on `lineNumber`, due on `dueDate` when given (absent otherwise, as Rust sends it). */
const dueTask = (dueDate: string | undefined, lineNumber: number, indent = 0) =>
	taskV2(dueDate ?? `undated ${lineNumber}`, {
		indent,
		lineNumber,
		metadata: { description: dueDate ?? `undated ${lineNumber}`, tags: [], ...(dueDate ? { dueDate } : {}) },
	});

describe('applyQuickFilters: the Due filter', () => {
	/** The text of each visible row, under `show: 'all'` and `due`. */
	const kept = (rows: TaskRow[], due: DueRange | undefined, today = TODAY, now = NOW) =>
		applyQuickFilters(rows, { show: 'all', due }, today, now).map((r) => r.text);

	const dated = () => rowsOf([dueTask('2026-11-04', 1), dueTask('2026-11-05', 2), dueTask('2026-11-12', 3), dueTask('2026-11-13', 4), dueTask(undefined, 5)]);

	it('overdue keeps a due date before today and drops today and an undated row', () => {
		expect(kept(dated(), 'overdue')).toEqual(['2026-11-04']);
	});

	it('today keeps only a due date equal to today', () => {
		expect(kept(dated(), 'today')).toEqual(['2026-11-05']);
	});

	it('next7 keeps today through today + 7 days and drops the day before, the eighth day and an undated row', () => {
		expect(kept(dated(), 'next7')).toEqual(['2026-11-05', '2026-11-12']);
	});

	it('next7 crosses a year end', () => {
		const rows = rowsOf([dueTask('2027-01-04', 1), dueTask('2027-01-05', 2)]);
		expect(kept(rows, 'next7', '2026-12-28')).toEqual(['2027-01-04']);
	});

	describe.runIf(runtimeTimeZoneSwitchWorks())('next7 under America/Sao_Paulo', () => {
		it('crosses a year end on the local calendar', () => {
			const rows = rowsOf([dueTask('2027-01-04', 1), dueTask('2027-01-05', 2)]);
			expect(withTimeZone('America/Sao_Paulo', () => kept(rows, 'next7', '2026-12-28'))).toEqual(['2027-01-04']);
		});
	});

	it('none keeps only undated rows', () => {
		expect(kept(dated(), 'none')).toEqual(['undated 5']);
	});

	it('undefined and any keep every row', () => {
		expect(kept(dated(), undefined)).toHaveLength(5);
		expect(kept(dated(), 'any')).toHaveLength(5);
	});

	describe('the note edited options', () => {
		const notes = () =>
			rowsFrom(
				[
					group('/vault/a.md', [dueTask(undefined, 1)], NOW - 1 * DAY),
					group('/vault/b.md', [dueTask(undefined, 1)], NOW - 10 * DAY),
					group('/vault/c.md', [dueTask('2026-11-01', 1)], NOW - 60 * DAY),
				],
				'/vault',
			);
		const files = (due: DueRange) => applyQuickFilters(notes(), { show: 'all', due }, TODAY, NOW).map((r) => r.filePath);

		it('edited7 keeps the note edited a day ago', () => {
			expect(files('edited7')).toEqual(['/vault/a.md']);
		});

		it('edited30 keeps the notes edited 1 and 10 days ago', () => {
			expect(files('edited30')).toEqual(['/vault/a.md', '/vault/b.md']);
		});

		it('keeps a row exactly at the 7-day cutoff', () => {
			const rows = rowsFrom([group('/vault/edge.md', [dueTask(undefined, 1)], NOW - 7 * DAY)], '/vault');
			expect(kept(rows, 'edited7')).toEqual(['undated 1']);
		});

		it('drops an overdue row of a 60-day-old note and keeps an undated row of a recent one', () => {
			expect(files('edited30')).not.toContain('/vault/c.md');
			expect(files('edited7')).toEqual(['/vault/a.md']);
		});
	});

	it('keeps an undated parent of an overdue child dimmed under overdue', () => {
		const rows = rowsOf([dueTask(undefined, 1, 0), dueTask('2026-11-04', 2, 1)]);
		expect(shown(applyQuickFilters(rows, { show: 'all', due: 'overdue' }, TODAY, NOW))).toEqual([
			['undated 1', true],
			['2026-11-04', false],
		]);
	});

	it('joins the status clause: a done overdue row fails under Open', () => {
		const rows = rowsOf([taskV2('Late', { status: 'done', lineNumber: 1, metadata: { description: 'Late', tags: [], dueDate: '2026-11-04' } })]);
		expect(applyQuickFilters(rows, { show: 'open', due: 'overdue' }, TODAY, NOW)).toEqual([]);
		expect(kept(rows, 'overdue')).toEqual(['Late']);
	});
});

/** A todo task on `lineNumber` with `priority` (absent when undefined, as Rust sends it) and `tags`. */
const metaTask = (text: string, lineNumber: number, meta: { priority?: TaskPriority; tags?: string[] } = {}, indent = 0) =>
	taskV2(text, {
		indent,
		lineNumber,
		metadata: { description: text, tags: meta.tags ?? [], ...(meta.priority ? { priority: meta.priority } : {}) },
	});

describe('applyQuickFilters: the Priority filter', () => {
	const kept = (rows: TaskRow[], priorities: TaskPriority[] | undefined) =>
		applyQuickFilters(rows, { show: 'all', priorities }, TODAY, NOW).map((r) => r.text);
	const levels = () =>
		rowsOf([
			metaTask('high', 1, { priority: 'high' }),
			metaTask('low', 2, { priority: 'low' }),
			metaTask('absent', 3),
			metaTask('none', 4, { priority: 'none' }),
			metaTask('highest', 5, { priority: 'highest' }),
		]);

	it('keeps only high under [high]', () => {
		expect(kept(levels(), ['high'])).toEqual(['high']);
	});

	it('keeps an absent priority and an explicit none under [none]', () => {
		const rows = levels();
		expect(rows[2].metadata).not.toHaveProperty('priority');
		expect(kept(rows, ['none'])).toEqual(['absent', 'none']);
	});

	it('keeps both levels under [high, low]', () => {
		expect(kept(levels(), ['high', 'low'])).toEqual(['high', 'low']);
	});

	it('keeps every row for an empty or absent set', () => {
		expect(kept(levels(), [])).toHaveLength(5);
		expect(kept(levels(), undefined)).toHaveLength(5);
	});

	it('keeps a low parent of a high child dimmed under [high]', () => {
		const rows = rowsOf([metaTask('parent', 1, { priority: 'low' }, 0), metaTask('child', 2, { priority: 'high' }, 1)]);
		expect(shown(applyQuickFilters(rows, { show: 'all', priorities: ['high'] }, TODAY, NOW))).toEqual([
			['parent', true],
			['child', false],
		]);
	});
});

describe('toggleQuickPriority', () => {
	it('stores levels in menu order whatever the click order', () => {
		expect(toggleQuickPriority(toggleQuickPriority(undefined, 'none'), 'high')).toEqual(['high', 'none']);
		expect(toggleQuickPriority(['highest', 'lowest'], 'low')).toEqual(['highest', 'low', 'lowest']);
	});

	it('returns undefined when the last level is removed', () => {
		expect(toggleQuickPriority(['high'], 'high')).toBeUndefined();
	});
});

describe('matchesNestedTag', () => {
	it.each([
		['work', 'work', true],
		['work', 'work/client', true],
		['work', 'workshop', false],
		['work', 'Work', true],
		['Work', 'work/Client', true],
		['#work', 'work', true],
		['#work', 'work/client', true],
		['work/client', 'work', false],
		['work', 'home', false],
	] as const)('chosen %j matches %j: %s', (chosen, tag, expected) => {
		expect(matchesNestedTag(chosen, tag)).toBe(expected);
	});
});

describe('applyQuickFilters: the Tag filter', () => {
	const kept = (rows: TaskRow[], tags: string[] | undefined) =>
		applyQuickFilters(rows, { show: 'all', tags }, TODAY, NOW).map((r) => r.text);
	const tagged = () =>
		rowsOf([
			metaTask('work', 1, { tags: ['work'] }),
			metaTask('client', 2, { tags: ['work/client'] }),
			metaTask('workshop', 3, { tags: ['workshop'] }),
			metaTask('home', 4, { tags: ['Home'] }),
			metaTask('untagged', 5),
		]);

	it('keeps work and work/client under [work], dropping workshop', () => {
		expect(kept(tagged(), ['work'])).toEqual(['work', 'client']);
	});

	it('keeps a task carrying any of two tags', () => {
		expect(kept(tagged(), ['workshop', 'home'])).toEqual(['workshop', 'home']);
	});

	it('matches a different case', () => {
		expect(kept(tagged(), ['HOME'])).toEqual(['home']);
	});

	it('ignores a leading # on the chosen tag', () => {
		expect(kept(tagged(), ['#work'])).toEqual(['work', 'client']);
	});

	it('keeps every row for an empty or absent set', () => {
		expect(kept(tagged(), [])).toHaveLength(5);
		expect(kept(tagged(), undefined)).toHaveLength(5);
	});
});

describe('taskTagOptions', () => {
	it('returns tags without #, de-duplicated by case keeping the first spelling, sorted case-insensitively', () => {
		const rows = rowsOf([
			metaTask('a', 1, { tags: ['work', 'Zeta'] }),
			metaTask('b', 2, { tags: ['Work', 'alpha'] }),
			metaTask('c', 3, { tags: ['work/client'] }),
		]);
		expect(taskTagOptions(rows)).toEqual(['alpha', 'work', 'work/client', 'Zeta']);
	});

	it('returns [] for rows with no tags', () => {
		expect(taskTagOptions(rowsOf([metaTask('a', 1)]))).toEqual([]);
		expect(taskTagOptions([])).toEqual([]);
	});
});

describe('tagMenuOptions', () => {
	const rows = () => rowsOf([metaTask('a', 1, { tags: ['work'] })]);

	it('is taskTagOptions when every chosen tag is present', () => {
		expect(tagMenuOptions(rows(), ['work'])).toEqual(['work']);
		expect(tagMenuOptions(rows(), undefined)).toEqual(['work']);
	});

	it('keeps a chosen tag no longer in the rows, in sorted place', () => {
		expect(tagMenuOptions(rows(), ['alpha'])).toEqual(['alpha', 'work']);
		expect(tagMenuOptions([], ['home'])).toEqual(['home']);
	});
});

describe('toggleQuickTag', () => {
	const options = ['alpha', 'home', 'work'];

	it('stores chosen tags in option order whatever the click order', () => {
		expect(toggleQuickTag(toggleQuickTag(undefined, 'work', options), 'alpha', options)).toEqual(['alpha', 'work']);
	});

	it('returns undefined when the last tag is removed', () => {
		expect(toggleQuickTag(['home'], 'home', options)).toBeUndefined();
	});
});

describe('applyQuickFilters: the search', () => {
	const kept = (rows: TaskRow[], search: string | undefined) =>
		applyQuickFilters(rows, { show: 'all', search }, TODAY, NOW).map((r) => r.text);

	// Rust's output for these lines, copied from Issue 109's pinned pairs in tasks.logic.test.ts.
	const chapter = () => taskV2('read [[Book#Chapter 2]]', { lineNumber: 1, metadata: { description: 'read [[Book 2]]', tags: ['Chapter'] } });
	const invoice = () =>
		taskV2('Send invoice 📅 2026-11-03 ⏫ #work', {
			lineNumber: 2,
			metadata: { description: 'Send invoice', dueDate: '2026-11-03', priority: 'high', tags: ['work'] },
		});

	it('finds a row by what it shows when that is the raw text', () => {
		expect(kept(rowsOf([chapter(), invoice()]), 'chapter')).toEqual(['read [[Book#Chapter 2]]']);
	});

	it('searches the description, not the raw text with its due date', () => {
		const rows = rowsOf([chapter(), invoice()]);
		expect(kept(rows, 'INVOICE')).toEqual(['Send invoice 📅 2026-11-03 ⏫ #work']);
		expect(kept(rows, '2026-11-03')).toEqual([]);
	});

	it('finds a row by a substring of its note title alone', () => {
		const rows = rowsFrom([group('/vault/Quarterly Plan.md', [metaTask('Ship', 1)]), group('/vault/b.md', [metaTask('Ship', 1)])], '/vault');
		expect(applyQuickFilters(rows, { show: 'all', search: '  terly pl ' }, TODAY, NOW).map((r) => r.filePath)).toEqual([
			'/vault/Quarterly Plan.md',
		]);
	});

	it('keeps every row for a blank or whitespace-only search', () => {
		const rows = rowsOf([chapter(), invoice()]);
		expect(kept(rows, '')).toHaveLength(2);
		expect(kept(rows, '   ')).toHaveLength(2);
		expect(kept(rows, undefined)).toHaveLength(2);
	});
});

describe('isQuickFieldDefault', () => {
	it.each([
		['priority', {}, true],
		['priority', { priorities: [] }, true],
		['priority', { priorities: ['high'] }, false],
		['tag', {}, true],
		['tag', { tags: [] }, true],
		['tag', { tags: ['work'] }, false],
		['search', {}, true],
		['search', { search: '' }, true],
		['search', { search: '  ' }, true],
		['search', { search: 'a' }, false],
	] as [QuickFilterField, Partial<TaskQuickFilters>, boolean][])('%s of %j is default: %s', (field, partial, expected) => {
		expect(isQuickFieldDefault({ show: 'closed', ...partial }, field)).toBe(expected);
	});

	it.each([
		[{ show: 'open' }, true],
		[{ show: 'open', statuses: [] }, true],
		[{ show: 'open', statuses: undefined }, true],
		[{ show: 'all' }, false],
		[{ show: 'closed' }, false],
		[{ show: 'open', statuses: ['todo'] }, false],
	] as [TaskQuickFilters, boolean][])('status of %j is default: %s', (quick, expected) => {
		expect(isQuickFieldDefault(quick, 'status')).toBe(expected);
	});

	it.each([
		[undefined, true],
		['any', true],
		['overdue', false],
		['today', false],
		['next7', false],
		['none', false],
		['edited7', false],
		['edited30', false],
	] as [DueRange | undefined, boolean][])('due %s is default: %s', (due, expected) => {
		expect(isQuickFieldDefault({ show: 'closed', due }, 'due')).toBe(expected);
	});
});

describe('toggleQuickStatus', () => {
	it('adds a status in TASK_STATUSES order, whatever the click order', () => {
		expect(toggleQuickStatus(toggleQuickStatus(undefined, 'done'), 'in-progress')).toEqual(['in-progress', 'done']);
		expect(toggleQuickStatus(['todo', 'done'], 'question')).toEqual(['todo', 'question', 'done']);
	});

	it('removes a chosen status', () => {
		expect(toggleQuickStatus(['in-progress', 'done'], 'in-progress')).toEqual(['done']);
	});

	it('returns undefined when the last status is removed', () => {
		expect(toggleQuickStatus(['done'], 'done')).toBeUndefined();
	});

	it('does not mutate its input', () => {
		const statuses: TaskStatus[] = ['done'];
		toggleQuickStatus(statuses, 'todo');
		expect(statuses).toEqual(['done']);
	});
});

describe('statusFilterLabel', () => {
	it.each([
		[{ show: 'open' }, 'open'],
		[{ show: 'closed' }, 'closed'],
		[{ show: 'all' }, 'all'],
		[{ show: 'closed', statuses: [] }, 'closed'],
		[{ show: 'open', statuses: ['in-progress', 'done'] }, 'in progress, done'],
		[{ show: 'all', statuses: ['cancelled'] }, 'cancelled'],
	] as [TaskQuickFilters, string][])('%j reads %j', (quick, expected) => {
		expect(statusFilterLabel(quick)).toBe(expected);
	});
});

describe('taskCountText', () => {
	const visible = (tasks: TaskItem[][], quick: TaskQuickFilters) =>
		applyQuickFilters(
			rowsFrom(
				tasks.map((t, i) => group(`/vault/n${i}.md`, t)),
				'/vault',
			),
			quick,
			TODAY,
			NOW,
		);

	it('counts open rows and their notes at the default status', () => {
		expect(taskCountText(visible([[task('todo', 0, 1), task('done', 0, 2)], [task('question', 0, 1)]], DEFAULT_QUICK), DEFAULT_QUICK)).toBe(
			'2 open in 2 notes',
		);
	});

	it('words one open row in one note in the singular', () => {
		expect(taskCountText(visible([[task('todo', 0, 1)]], DEFAULT_QUICK), DEFAULT_QUICK)).toBe('1 open in 1 note');
	});

	it('does not count dimmed rows or a note holding only dimmed rows', () => {
		const rows: VisibleRow[] = visible([[task('done', 0, 1), task('todo', 1, 2)]], DEFAULT_QUICK);
		const onlyDimmed = rows.map((r) => ({ ...r, dimmed: true }));
		expect(taskCountText(rows, DEFAULT_QUICK)).toBe('1 open in 1 note');
		expect(taskCountText(onlyDimmed, DEFAULT_QUICK)).toBe('0 open in 0 notes');
	});

	it('says tasks when the status filter is not at its default', () => {
		const quick: TaskQuickFilters = { show: 'all' };
		expect(taskCountText(visible([[task('todo', 0, 1), task('done', 0, 2)], [task('done', 0, 1)]], quick), quick)).toBe(
			'3 tasks in 2 notes',
		);
		const closed: TaskQuickFilters = { show: 'closed' };
		expect(taskCountText(visible([[task('done', 0, 1)]], closed), closed)).toBe('1 task in 1 note');
	});

	it('reads zero for no rows', () => {
		expect(taskCountText([], DEFAULT_QUICK)).toBe('0 open in 0 notes');
		expect(taskCountText([], { show: 'all' })).toBe('0 tasks in 0 notes');
	});
});

describe('describeTaskQuery', () => {
	const OPEN: TaskQuickFilters = { show: 'open' };
	const ALL: TaskQuickFilters = { show: 'all' };
	/** The default exclude part. */
	const EXCEPT = ', except archived notes, type definitions, templates, the system folder';

	/** The query the section tag textbox gives for `sectionTag`, with `exclude` (the defaults when absent). */
	const textbox = (sectionTag: string, quick: TaskQuickFilters, exclude = defaultTaskExcludes()): TaskQuery => ({
		version: 1,
		sources: headingSources(parseSectionTags(sectionTag)),
		exclude,
		quick,
	});
	const describeTextbox = (sectionTag: string, quick: TaskQuickFilters) => describeTaskQuery(textbox(sectionTag, quick));
	const withSources = (sources: TaskSource[], exclude = NO_EXCLUDES): TaskQuery => ({ version: 1, sources, exclude, quick: OPEN });

	it('describes the default query', () => {
		expect(describeTaskQuery(defaultTaskQuery())).toBe(
			'Open tasks under headings containing #to-list, except archived notes, type definitions, templates, the system folder',
		);
	});

	it.each([
		[OPEN, '#to-list', `Open tasks under headings containing #to-list${EXCEPT}`],
		[ALL, '#to-list', `All tasks under headings containing #to-list${EXCEPT}`],
		[OPEN, '', `Open tasks from every note${EXCEPT}`],
		[ALL, '', `All tasks from every note${EXCEPT}`],
	] as const)('quick=%j, tag=%j gives %j', (quick, sectionTag, expected) => {
		expect(describeTextbox(sectionTag, quick)).toBe(expected);
	});

	it.each([
		['overdue', ', overdue'],
		['today', ', due today'],
		['next7', ', due in the next 7 days'],
		['none', ', with no due date'],
		['edited7', ', in notes edited in the last 7 days'],
		['edited30', ', in notes edited in the last 30 days'],
	] as [DueRange, string][])('due %s adds %j after the exclude part', (due, phrase) => {
		expect(describeTextbox('#to-list', { show: 'open', due })).toBe(`Open tasks under headings containing #to-list${EXCEPT}${phrase}`);
		expect(describeTextbox('', { show: 'all', due })).toBe(`All tasks from every note${EXCEPT}${phrase}`);
	});

	it('adds nothing for any', () => {
		expect(describeTextbox('', { show: 'open', due: 'any' })).toBe(`Open tasks from every note${EXCEPT}`);
	});

	it('starts with Closed tasks under Closed', () => {
		expect(describeTextbox('', { show: 'closed' })).toBe(`Closed tasks from every note${EXCEPT}`);
	});

	it('names the chosen statuses in TASK_STATUSES order, joined with or', () => {
		expect(describeTextbox('#work', { show: 'open', statuses: ['in-progress', 'done'], due: 'edited7' })).toBe(
			`Tasks that are in progress or done under headings containing #work${EXCEPT}, in notes edited in the last 7 days`,
		);
	});

	it('adds the # to a tag typed without one', () => {
		expect(describeTextbox('work', OPEN)).toBe(`Open tasks under headings containing #work${EXCEPT}`);
	});

	it('trims a tag with surrounding spaces', () => {
		expect(describeTextbox('  #work  ', OPEN)).toBe(`Open tasks under headings containing #work${EXCEPT}`);
	});

	it('treats a whitespace-only tag as no tag', () => {
		expect(describeTextbox('   ', OPEN)).toBe(`Open tasks from every note${EXCEPT}`);
	});

	it('joins several tags with or', () => {
		expect(describeTextbox('#to-list #work', OPEN)).toBe(`Open tasks under headings containing #to-list or #work${EXCEPT}`);
		expect(describeTextbox('a, b c', ALL)).toBe(`All tasks under headings containing #a or #b or #c${EXCEPT}`);
	});

	it('treats separators with no tag as no tag', () => {
		expect(describeTextbox(' , ', OPEN)).toBe(`Open tasks from every note${EXCEPT}`);
	});

	it.each([
		[{ priorities: ['high', 'none'] }, ', priority high or no priority'],
		[{ tags: ['work', 'home/x'] }, ', tagged #work or #home/x'],
		[{ search: '  invoice ' }, ', matching "invoice"'],
	] as [Partial<TaskQuickFilters>, string][])('%j adds %j after the exclude part', (partial, phrase) => {
		expect(describeTextbox('#to-list', { show: 'open', ...partial })).toBe(
			`Open tasks under headings containing #to-list${EXCEPT}${phrase}`,
		);
	});

	it('puts priority, tag and search in that order after the due part', () => {
		expect(describeTextbox('', { show: 'all', due: 'overdue', priorities: ['highest'], tags: ['work'], search: 'call' })).toBe(
			`All tasks from every note${EXCEPT}, overdue, priority highest, tagged #work, matching "call"`,
		);
	});

	it('adds nothing for empty priority, tag and search values', () => {
		expect(describeTextbox('', { show: 'open', priorities: [], tags: [], search: '  ' })).toBe(`Open tasks from every note${EXCEPT}`);
	});

	it('words two general cards, clauses joined with and, cards with ; or', () => {
		const sources: TaskSource[] = [
			{ clauses: [{ kind: 'folder', path: '/Projects/' }, { kind: 'noteTag', tag: 'work' }, { kind: 'heading', text: 'to-do', match: 'tag' }] },
			{
				clauses: [
					{ kind: 'folder', path: 'Archive', negate: true },
					{ kind: 'type', type: 'Meeting' },
					{ kind: 'type', type: 'Draft', negate: true },
					{ kind: 'noteTag', tag: '#old', negate: true },
					{ kind: 'heading', text: '#call', match: 'substring' },
				],
			},
		];
		expect(describeTaskQuery(withSources(sources))).toBe(
			'Open tasks from notes in folder Projects and tagged #work and under a heading tagged #to-do; or not in folder Archive and of type Meeting and not of type Draft and not tagged #old and under a heading containing "#call"',
		);
	});

	it('words each property op and leaves an inactive property clause out', () => {
		const sources: TaskSource[] = [
			{
				clauses: [
					{ kind: 'property', key: ' status ', op: 'is', value: ' active ' },
					{ kind: 'property', key: 'area', op: 'isNot', value: 'Home' },
				],
			},
			{
				clauses: [
					{ kind: 'property', key: 'title', op: 'contains', value: 'plan' },
					{ kind: 'property', key: 'due', op: 'exists' },
					{ kind: 'property', key: 'owner', op: 'is', value: ' ' },
				],
			},
		];
		expect(describeTaskQuery(withSources(sources))).toBe(
			'Open tasks from notes where status is active and where area is not Home; or where title contains plan and where due is set',
		);
	});

	it('uses the general wording when a heading card sits beside another card', () => {
		const sources: TaskSource[] = [...headingSources(['#to-list']), { clauses: [{ kind: 'folder', path: 'Projects' }] }];
		expect(describeTaskQuery(withSources(sources))).toBe('Open tasks from notes under a heading tagged #to-list; or in folder Projects');
	});

	it('leaves inactive clauses out, and says every note when a card has no active clause', () => {
		expect(describeTaskQuery(withSources([{ clauses: [{ kind: 'folder', path: ' / ' }, { kind: 'type', type: 'Project' }] }]))).toBe(
			'Open tasks from notes of type Project',
		);
		expect(
			describeTaskQuery(withSources([{ clauses: [{ kind: 'type', type: 'Project' }] }, { clauses: [{ kind: 'noteTag', tag: '#', negate: true }] }])),
		).toBe('Open tasks from every note');
		expect(describeTaskQuery(withSources([{ clauses: [] }]))).toBe('Open tasks from every note');
	});

	it('says every note for no card', () => {
		expect(describeTaskQuery(withSources([], defaultTaskExcludes()))).toBe(`Open tasks from every note${EXCEPT}`);
	});

	it('adds no exclude part with every exclude off', () => {
		expect(describeTaskQuery(textbox('#to-list', OPEN, NO_EXCLUDES))).toBe('Open tasks under headings containing #to-list');
	});

	it('names the active switches, then each listed folder, note, tag and type', () => {
		const exclude: TaskExcludes = {
			...NO_EXCLUDES,
			archived: true,
			systemFolder: true,
			folders: ['/Archive/', ' '],
			notes: ['Inbox.md'],
			tags: ['old', '#tmp/x'],
			types: ['Meeting'],
		};
		expect(describeTaskQuery(textbox('', OPEN, exclude))).toBe(
			'Open tasks from every note, except archived notes, the system folder, folder Archive, note Inbox.md, tag #old, tag #tmp/x, type Meeting',
		);
	});

	it('puts the quick filters after the excludes', () => {
		expect(describeTextbox('#to-list', { show: 'open', due: 'overdue', tags: ['work'] })).toBe(
			`Open tasks under headings containing #to-list${EXCEPT}, overdue, tagged #work`,
		);
	});
});

describe('explainEmptyTasks', () => {
	const OPEN: TaskQuickFilters = { show: 'open' };
	const ALL: TaskQuickFilters = { show: 'all' };
	const SHOW_ALL = { kind: 'showAllStatuses', label: 'Show all' };
	const RESET_DUE = { kind: 'resetQuick', field: 'due', label: 'Reset Due filter' };
	const DUE_MESSAGE = 'No task matches the Due filter';

	/** Rows of one or more notes, each `[tasks, modifiedAt]`. */
	function rows(...notes: [TaskItem[], number?][]): TaskRow[] {
		return rowsFrom(
			notes.map(([tasks, modifiedAt], i) => group(`/vault/n${i}.md`, tasks, modifiedAt ?? 0)),
			'/vault',
		);
	}

	const open = (lineNumber: number) => task('todo', 0, lineNumber);
	const done = (lineNumber: number) => task('done', 0, lineNumber);
	/** `explainEmptyTasks` for the textbox query of `sectionTag`, with `exclude` (the defaults when absent). */
	const explain = (r: TaskRow[], quick: TaskQuickFilters, sectionTag = '', exclude = defaultTaskExcludes()) =>
		explainEmptyTasks({
			rows: r,
			query: { version: 1, sources: headingSources(parseSectionTags(sectionTag)), exclude, quick },
			folders: FOLDERS,
			today: TODAY,
			now: NOW,
		});
	const EDIT_SOURCES = { kind: 'editSources', label: 'Edit sources' };

	describe('stage 1: no task', () => {
		it('says the vault has no tasks, with no action, whatever the query', () => {
			expect(explain([], OPEN, '')).toEqual({ message: 'No tasks in this vault yet' });
			expect(explain([], { show: 'closed', statuses: ['done'], due: 'edited7' }, '#to-list')).toEqual({
				message: 'No tasks in this vault yet',
			});
		});
	});

	describe('stage 2: the sources', () => {
		/** A note whose one open task sits under `## heading`. */
		const under = (heading: string, fields: Partial<NoteEntryV2> = {}) =>
			rowsFrom(
				[entryV2('/vault/h.md', { taskHeadings: [{ level: 2, text: heading, line: 1 }], tasks: [taskV2('t', { lineNumber: 2, heading: 0 })], ...fields })],
				'/vault',
			);

		it('names the tag and offers to edit the sources in the textbox case', () => {
			expect(explain(rows([[open(1)]]), ALL, '#to-list')).toEqual({
				message: 'No task sits under a heading containing #to-list',
				action: EDIT_SOURCES,
			});
		});

		it('displays the tag as the sentence does', () => {
			expect(explain(rows([[open(1)]]), ALL, ' work ').message).toBe('No task sits under a heading containing #work');
		});

		it('names several tags joined with or, and offers to edit the sources', () => {
			expect(explain(under('Misc #other'), ALL, '#to-list #work')).toEqual({
				message: 'No task sits under a heading containing #to-list or #work',
				action: EDIT_SOURCES,
			});
		});

		it.each([['  '], [' , ']])('is skipped for the tag text %j, which holds no tag', (sectionTag) => {
			expect(explain(rows([[done(1)]]), OPEN, sectionTag)).toEqual({ message: 'The only task is closed', action: { kind: 'showAllStatuses', label: 'Show all' } });
		});

		it('says no note matches general sources, and offers to edit them', () => {
			const query: TaskQuery = { version: 1, sources: [{ clauses: [{ kind: 'folder', path: 'Projects' }] }], exclude: defaultTaskExcludes(), quick: OPEN };
			expect(explainEmptyTasks({ rows: rows([[open(1)]]), query, folders: FOLDERS, today: TODAY, now: NOW })).toEqual({
				message: 'No note matches the sources',
				action: EDIT_SOURCES,
			});
		});

		it('comes before the excludes and the quick filters', () => {
			expect(explain(under('Misc', { archived: true, tasks: [taskV2('t', { lineNumber: 2, heading: 0, status: 'done' })] }), OPEN, '#to-list')).toEqual({
				message: 'No task sits under a heading containing #to-list',
				action: EDIT_SOURCES,
			});
		});
	});

	describe('stage 3: the excludes', () => {
		const archived = (status: TaskStatus = 'todo') =>
			rowsFrom([entryV2('/vault/Old.md', { archived: true, tasks: [taskV2('old', { status })] })], '/vault');

		const EXCLUDED = { message: 'Every matching note is excluded', action: { kind: 'editExcludes', label: 'Edit excludes' } };

		it('says every matching note is excluded, and offers to edit the excludes', () => {
			expect(explain(archived(), OPEN)).toEqual(EXCLUDED);
		});

		it('counts only what the sources kept', () => {
			const r = rowsFrom(
				[
					entryV2('/vault/_system/templates/T.md', { taskHeadings: [{ level: 2, text: 'Inbox #to-list', line: 1 }], tasks: [taskV2('t', { lineNumber: 2, heading: 0 })] }),
					entryV2('/vault/Plain.md', { tasks: [taskV2('plain')] }),
				],
				'/vault',
			);
			expect(explain(r, OPEN, '#to-list')).toEqual(EXCLUDED);
		});

		it('comes before the quick filters', () => {
			expect(explain(archived('done'), { show: 'open', due: 'overdue' })).toEqual(EXCLUDED);
		});

		it('lets the quick filters run over the kept rows only', () => {
			const r = [...archived('todo'), ...rows([[done(1)]])];
			expect(explain(r, OPEN)).toEqual({ message: 'The only task is closed', action: { kind: 'showAllStatuses', label: 'Show all' } });
			expect(explain(r, OPEN, '', NO_EXCLUDES)).toEqual({ message: 'No tasks found' });
		});
	});

	describe('stage 4: the status filter', () => {
		it('counts the closed tasks at the default status', () => {
			expect(explain(rows([[done(1), done(2)]], [[done(3)]]), OPEN)).toEqual({ message: 'All 3 tasks are closed', action: SHOW_ALL });
		});

		it('words a single task on its own', () => {
			expect(explain(rows([[done(1)]]), OPEN)).toEqual({ message: 'The only task is closed', action: SHOW_ALL });
		});

		it('comes before the Due filter when both would empty the list', () => {
			expect(explain(rows([[done(1)], 0]), { show: 'open', due: 'edited7' })).toEqual({ message: 'The only task is closed', action: SHOW_ALL });
		});

		it('wins when every row is closed under Status Open and Due Overdue', () => {
			const late = taskV2('Late', { status: 'done', lineNumber: 1, metadata: { description: 'Late', tags: [], dueDate: '2026-11-04' } });
			expect(explain(rows([[late, done(2)]]), { show: 'open', due: 'overdue' })).toEqual({
				message: 'All 2 tasks are closed',
				action: SHOW_ALL,
			});
		});

		it('says every task is closed for only [x] and [-] tasks', () => {
			const r = rows([[taskV2('Shipped', { status: 'done', lineNumber: 1 }), taskV2('Old idea', { status: 'cancelled', lineNumber: 2 })]]);
			expect(explain(r, OPEN)).toEqual({ message: 'All 2 tasks are closed', action: SHOW_ALL });
		});

		it('says no task has the chosen status under Closed with no closed row', () => {
			expect(explain(rows([[open(1)]]), { show: 'closed' })).toEqual({ message: 'No task has the chosen status', action: SHOW_ALL });
		});

		it('says no task has the chosen status for a status set with no match', () => {
			expect(explain(rows([[open(1), done(2)]]), { show: 'open', statuses: ['question'] })).toEqual({
				message: 'No task has the chosen status',
				action: SHOW_ALL,
			});
		});
	});

	describe('stage 5: the Due filter', () => {
		it('names the Due filter for Overdue over open undated rows', () => {
			expect(explain(rows([[open(1), open(2)]]), { show: 'open', due: 'overdue' })).toEqual({ message: DUE_MESSAGE, action: RESET_DUE });
		});

		it('names the Due filter when no row passes both Status and Due', () => {
			const late = taskV2('Late', { status: 'done', lineNumber: 2, metadata: { description: 'Late', tags: [], dueDate: '2026-11-04' } });
			expect(explain(rows([[open(1), late]]), { show: 'open', due: 'overdue' })).toEqual({ message: DUE_MESSAGE, action: RESET_DUE });
		});

		it('names the Due filter for an open task in an old note under Note edited in the last 7 days', () => {
			expect(explain(rows([[open(1)], NOW - 10 * DAY], [[done(1)], NOW - DAY]), { show: 'open', due: 'edited7' })).toEqual({
				message: DUE_MESSAGE,
				action: RESET_DUE,
			});
		});

		it('names the Due filter under All and under chosen statuses', () => {
			expect(explain(rows([[done(1)]]), { show: 'all', due: 'edited30' })).toEqual({ message: DUE_MESSAGE, action: RESET_DUE });
			expect(explain(rows([[open(1)]]), { show: 'all', statuses: ['todo'], due: 'today' })).toEqual({
				message: DUE_MESSAGE,
				action: RESET_DUE,
			});
		});
	});

	describe('stages 6 to 8: Priority, Tag and Search', () => {
		const RESET_PRIORITY = { kind: 'resetQuick', field: 'priorities', label: 'Reset Priority filter' };
		const RESET_TAG = { kind: 'resetQuick', field: 'tags', label: 'Reset Tag filter' };
		const RESET_SEARCH = { kind: 'resetQuick', field: 'search', label: 'Reset Search filter' };
		const PRIORITY = { message: 'No task matches the Priority filter', action: RESET_PRIORITY };
		const TAG = { message: 'No task matches the Tag filter', action: RESET_TAG };
		const SEARCH = { message: 'No task matches the Search filter', action: RESET_SEARCH };

		/** A high open task tagged work, and a done low one tagged home. */
		const two = () => rows([[metaTask('Call Ana', 1, { priority: 'high', tags: ['work'] }), taskV2('Paint', { status: 'done', lineNumber: 2, metadata: { description: 'Paint', priority: 'low', tags: ['home'] } })]]);

		it('names each filter when it alone empties the list', () => {
			expect(explain(two(), { show: 'open', priorities: ['low'] })).toEqual(PRIORITY);
			expect(explain(two(), { show: 'open', tags: ['home'] })).toEqual(TAG);
			expect(explain(two(), { show: 'open', search: 'paint' })).toEqual(SEARCH);
		});

		it('is cumulative: a filter that empties the list only with the ones before it is named', () => {
			// Priority low keeps Paint under All, then Search "call" drops it.
			expect(explain(two(), { show: 'all', priorities: ['low'], search: 'call' })).toEqual(SEARCH);
		});

		it('names Priority when Priority and Search would each empty the list', () => {
			expect(explain(two(), { show: 'open', priorities: ['lowest'], search: 'nothing' })).toEqual(PRIORITY);
		});

		it('names Tag when Tag and Search would each empty the list', () => {
			expect(explain(two(), { show: 'open', tags: ['nope'], search: 'nothing' })).toEqual(TAG);
		});

		it('lets Status and Due win over all three', () => {
			const rest: Partial<TaskQuickFilters> = { priorities: ['lowest'], tags: ['nope'], search: 'nothing' };
			expect(explain(rows([[done(1)]]), { show: 'open', ...rest })).toEqual({
				message: 'The only task is closed',
				action: SHOW_ALL,
			});
			expect(explain(two(), { show: 'open', due: 'overdue', ...rest })).toEqual({
				message: DUE_MESSAGE,
				action: RESET_DUE,
			});
		});
	});

	it('falls back to "No tasks found" with no action when the Due filter is any', () => {
		expect(explain(rows([[open(1)]]), OPEN)).toEqual({ message: 'No tasks found' });
	});
});
