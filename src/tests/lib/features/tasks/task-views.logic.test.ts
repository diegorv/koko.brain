import { describe, it, expect } from 'vitest';
import {
	DEFAULT_QUICK,
	DEFAULT_TASK_SORT,
	defaultTaskExcludes,
	defaultTaskQuery,
	emptyTaskExcludes,
	headingSources,
} from '#lib/features/tasks/task-query.logic.js';
import {
	ALL_OPEN_ID,
	ALL_OPEN_VIEW,
	TO_LIST_ID,
	findTaskView,
	mergeExcludes,
	parseTasksViewState,
	toListView,
	viewQueryOf,
	withTasksViewState,
	type SavedTaskView,
} from '#lib/features/tasks/task-views.logic.js';

/** A saved view named `name` listing the folder `folder`. */
const folderView = (id: string, name: string, folder = 'Projects'): SavedTaskView => ({
	id,
	name,
	query: {
		sources: [{ clauses: [{ kind: 'folder', path: folder }] }],
		exclude: emptyTaskExcludes(),
		quick: { ...DEFAULT_QUICK },
		groupBy: 'note',
		sort: [...DEFAULT_TASK_SORT],
	},
});

describe('mergeExcludes', () => {
	it('keeps a global switch on whatever the own one says', () => {
		const merged = mergeExcludes(defaultTaskExcludes(), emptyTaskExcludes());
		expect(merged.archived).toBe(true);
		expect(merged).toEqual(defaultTaskExcludes());
	});

	it('turns a switch on when only the own excludes have it', () => {
		const merged = mergeExcludes(emptyTaskExcludes(), { ...emptyTaskExcludes(), templatesFolder: true });
		expect(merged.templatesFolder).toBe(true);
		expect(merged.archived).toBe(false);
	});

	it('unites each list without duplicates, global entries first', () => {
		const merged = mergeExcludes(
			{ ...defaultTaskExcludes(), folders: ['A', 'B'], tags: ['#x'] },
			{ ...emptyTaskExcludes(), folders: ['B', 'C', 'C'], notes: ['n.md'], types: ['Meeting'] },
		);
		expect(merged.folders).toEqual(['A', 'B', 'C']);
		expect(merged.notes).toEqual(['n.md']);
		expect(merged.tags).toEqual(['#x']);
		expect(merged.types).toEqual(['Meeting']);
	});
});

describe('toListView', () => {
	it('builds one heading card per saved tag, with the fixed id and defaults', () => {
		expect(toListView('#to-list #work')).toEqual({
			id: TO_LIST_ID,
			name: 'To list',
			query: {
				sources: headingSources(['#to-list', '#work']),
				exclude: emptyTaskExcludes(),
				quick: DEFAULT_QUICK,
				groupBy: 'note',
				sort: DEFAULT_TASK_SORT,
			},
		});
	});

	it.each([[''], [' , '], ['#']])('gives the #to-list card for %j, which holds no tag', (text) => {
		expect(toListView(text).query.sources).toEqual(headingSources(['#to-list']));
	});
});

describe('viewQueryOf', () => {
	it('keeps the query, grouping and sort and drops the search', () => {
		const query = { ...defaultTaskQuery(), quick: { show: 'all' as const, due: 'today' as const, search: 'milk' } };
		expect(viewQueryOf(query, { property: 'area' }, ['path'])).toEqual({
			sources: query.sources,
			exclude: query.exclude,
			quick: { show: 'all', due: 'today' },
			groupBy: { property: 'area' },
			sort: ['path'],
		});
	});
});

describe('findTaskView', () => {
	it('finds a saved view, then a built-in, else nothing', () => {
		const saved = [folderView('a', 'A')];
		expect(findTaskView('a', saved)).toBe(saved[0]);
		expect(findTaskView(ALL_OPEN_ID, saved)).toBe(ALL_OPEN_VIEW);
		expect(findTaskView('gone', saved)).toBeUndefined();
	});
});

describe('ALL_OPEN_VIEW', () => {
	it('lists every open task, grouped by note, with no own exclude', () => {
		expect(ALL_OPEN_VIEW).toEqual({
			id: 'all-open',
			name: 'All open',
			query: { sources: [], exclude: emptyTaskExcludes(), quick: DEFAULT_QUICK, groupBy: 'note', sort: DEFAULT_TASK_SORT },
		});
	});
});

describe('parseTasksViewState', () => {
	it.each([[undefined], [{}], [{ version: 1, sectionTag: '' }]])('seeds the #to-list view for %j, quietly', (raw) => {
		expect(parseTasksViewState(raw)).toEqual({
			state: { activeList: TO_LIST_ID, globalExcludes: defaultTaskExcludes(), savedViews: [toListView('')] },
			valid: true,
		});
	});

	it('seeds from a saved sectionTag', () => {
		expect(parseTasksViewState({ version: 1, sectionTag: '#to-list #work' }).state.savedViews).toEqual([toListView('#to-list #work')]);
	});

	it('never seeds over a present savedViews, even []', () => {
		expect(parseTasksViewState({ savedViews: [], sectionTag: '#a' })).toEqual({
			state: { activeList: ALL_OPEN_ID, globalExcludes: defaultTaskExcludes(), savedViews: [] },
			valid: true,
		});
	});

	it('keeps an activeList naming a saved view or a built-in, else opens the first saved view', () => {
		const savedViews = [folderView('a', 'A'), folderView('b', 'B')];
		expect(parseTasksViewState({ savedViews, activeList: 'b' }).state.activeList).toBe('b');
		expect(parseTasksViewState({ savedViews, activeList: ALL_OPEN_ID }).state.activeList).toBe(ALL_OPEN_ID);
		expect(parseTasksViewState({ savedViews, activeList: 'gone' }).state.activeList).toBe('a');
		expect(parseTasksViewState({ savedViews, activeList: 7 }).state.activeList).toBe('a');
	});

	it('round-trips saved views written by withTasksViewState', () => {
		const state = {
			activeList: 'b',
			globalExcludes: { ...defaultTaskExcludes(), templatesFolder: false, folders: ['Old'] },
			savedViews: [
				folderView('a', 'A'),
				{
					id: 'b',
					name: 'B',
					query: {
						sources: [
							{
								clauses: [
									{ kind: 'heading' as const, text: '#x', match: 'substring' as const },
									{ kind: 'type' as const, type: 'Project', negate: true },
									{ kind: 'noteTag' as const, tag: 'w' },
									{ kind: 'property' as const, key: 'status', op: 'is' as const, value: 'active' },
									{ kind: 'lifecycle' as const, state: 'archived' as const },
								],
							},
						],
						exclude: { ...emptyTaskExcludes(), notes: ['n.md'] },
						quick: { show: 'all' as const, statuses: ['done' as const], due: 'overdue' as const, priorities: ['high' as const], tags: ['t'] },
						groupBy: { property: 'area' },
						sort: ['path' as const],
					},
				},
			],
		};
		expect(parseTasksViewState(JSON.parse(JSON.stringify(withTasksViewState(undefined, state))))).toEqual({ state, valid: true });
	});

	it('never reads back a stored search', () => {
		const view = { ...folderView('a', 'A'), query: { ...folderView('a', 'A').query, quick: { show: 'open', search: 'milk' } } };
		expect(parseTasksViewState({ savedViews: [view] }).state.savedViews[0].query.quick).toEqual({ show: 'open' });
	});

	it('drops a view entry that is not an object or lacks a string id and name, quietly', () => {
		const good = folderView('a', 'A');
		const { state, valid } = parseTasksViewState({ savedViews: [5, null, { id: 'x' }, { id: 1, name: 'N' }, good] });
		expect(state.savedViews).toEqual([good]);
		expect(valid).toBe(true);
	});

	it('falls back field by field inside a view, dropping bad cards and clauses', () => {
		const { state, valid } = parseTasksViewState({
			savedViews: [
				{
					id: 'a',
					name: 'A',
					query: {
						sources: [5, { clauses: 'x' }, { clauses: [{ kind: 'folder', path: 3 }, { kind: 'nope' }, { kind: 'folder', path: 'P' }] }],
						exclude: { archived: 'x', folders: ['F', 2] },
						quick: { show: 'nope', statuses: [], priorities: ['bad'] },
						groupBy: 'nope',
						sort: 'due',
					},
				},
				{ id: 'b', name: 'B' },
			],
		});
		expect(valid).toBe(true);
		expect(state.savedViews[0].query).toEqual({
			sources: [{ clauses: [{ kind: 'folder', path: 'P' }] }],
			exclude: { ...emptyTaskExcludes(), folders: ['F'] },
			quick: DEFAULT_QUICK,
			groupBy: 'note',
			sort: DEFAULT_TASK_SORT,
		});
		expect(state.savedViews[1].query).toEqual(ALL_OPEN_VIEW.query);
	});

	it('inside a valid globalExcludes, a field of the wrong type falls back to its own default, quietly', () => {
		const { state, valid } = parseTasksViewState({ globalExcludes: { archived: 'x', templatesFolder: false, folders: ['A', 1], tags: 'x' } });
		expect(valid).toBe(true);
		expect(state.globalExcludes).toEqual({ ...defaultTaskExcludes(), templatesFolder: false, folders: ['A'] });
	});

	it.each([[42], [null], [[]], ['x'], [{ globalExcludes: 5 }], [{ globalExcludes: [] }], [{ savedViews: {} }], [{ sectionTag: 5 }]])(
		'%j is invalid and gives the defaults plus the seed',
		(raw) => {
			expect(parseTasksViewState(raw)).toEqual({
				state: { activeList: TO_LIST_ID, globalExcludes: defaultTaskExcludes(), savedViews: [toListView('')] },
				valid: false,
			});
		},
	);

	it('keeps the valid fields next to an invalid one', () => {
		const savedViews = [folderView('a', 'A')];
		expect(parseTasksViewState({ globalExcludes: 5, savedViews })).toEqual({
			state: { activeList: 'a', globalExcludes: defaultTaskExcludes(), savedViews },
			valid: false,
		});
	});
});

describe('withTasksViewState', () => {
	const state = { activeList: TO_LIST_ID, globalExcludes: defaultTaskExcludes(), savedViews: [toListView('')] };

	it('writes version 1 and the state when nothing was saved', () => {
		expect(withTasksViewState(undefined, state)).toEqual({ version: 1, ...state });
	});

	it('keeps unknown keys and a numeric version, and drops the legacy keys', () => {
		const raw = { version: 2, sectionTag: '#a', headingTags: ['#a'], query: {}, extra: { x: 1 } };
		expect(withTasksViewState(raw, state)).toEqual({ version: 2, extra: { x: 1 }, ...state });
		expect(raw.sectionTag).toBe('#a');
	});

	it('writes version 1 over a non-numeric version', () => {
		expect(withTasksViewState({ version: '1' }, state).version).toBe(1);
	});

	it.each([[42], [null], [[]], ['x']])('replaces a non-object %j wholesale', (raw) => {
		expect(withTasksViewState(raw, state)).toEqual({ version: 1, ...state });
	});
});
