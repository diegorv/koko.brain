import {
	DEFAULT_QUICK,
	DEFAULT_TASK_SORT,
	TASK_PRIORITIES,
	defaultTaskExcludes,
	emptyTaskExcludes,
	headingSources,
	type DueRange,
	type LifecycleState,
	type PropertyOp,
	type TaskExcludes,
	type TaskGroupKey,
	type TaskQuery,
	type TaskQuickFilters,
	type TaskSortKey,
	type TaskSource,
	type TaskSourceClause,
} from './task-query.logic';
import { TASK_STATUSES } from './task-status.logic';
import { parseSectionTags } from './tasks.logic';

/** What a list (saved view or built-in) selects and how it shows it. */
export interface TaskViewQuery {
	/** The source cards; none lists every note */
	sources: TaskSource[];
	/** The list's own excludes, added to the global ones (`mergeExcludes`) */
	exclude: TaskExcludes;
	/** The quick filters; `search` is never stored */
	quick: TaskQuickFilters;
	/** What the list groups its rows by */
	groupBy: TaskGroupKey;
	/** The sort keys of the groups other than Note */
	sort: TaskSortKey[];
}

/** A list of the Tasks view's list column: a saved view, or a built-in one. */
export interface SavedTaskView {
	/** Stable id: a UUID for a saved view, a reserved word for a built-in or the seed */
	id: string;
	/** The name the list shows */
	name: string;
	/** What the list selects */
	query: TaskViewQuery;
}

/** The part of `settings.json` `tasksView` this build writes, besides `version`. */
export interface TaskViewsState {
	/** Id of the list the vault opens on */
	activeList: string;
	/** The excludes every list applies */
	globalExcludes: TaskExcludes;
	/** The saved views, in list order */
	savedViews: SavedTaskView[];
}

/** Reserved id of the built-in "All open" list. */
export const ALL_OPEN_ID = 'all-open';

/** Fixed id of the "To list" view the migration seeds, so a reload before any write seeds the same one. */
export const TO_LIST_ID = 'to-list';

/** The built-in "All open" list: every open task, grouped by note. Never written to disk. */
export const ALL_OPEN_VIEW: SavedTaskView = {
	id: ALL_OPEN_ID,
	name: 'All open',
	query: {
		sources: [],
		exclude: emptyTaskExcludes(),
		quick: { ...DEFAULT_QUICK },
		groupBy: 'note',
		sort: [...DEFAULT_TASK_SORT],
	},
};

/** The built-in lists, in list order. */
export const BUILT_IN_TASK_VIEWS: readonly SavedTaskView[] = [ALL_OPEN_VIEW];

/** `a` with each entry of `b` it lacks appended, compared exactly. */
const union = (a: readonly string[], b: readonly string[]) => [...a, ...b.filter((v, i) => !a.includes(v) && b.indexOf(v) === i)];

/**
 * The excludes a list applies: each switch on when it is on in either, each
 * list the union of both without duplicates. A list's own excludes only add:
 * they never lift a global one.
 */
export function mergeExcludes(global: TaskExcludes, own: TaskExcludes): TaskExcludes {
	return {
		archived: global.archived || own.archived,
		typeDefinitions: global.typeDefinitions || own.typeDefinitions,
		templatesFolder: global.templatesFolder || own.templatesFolder,
		systemFolder: global.systemFolder || own.systemFolder,
		folders: union(global.folders, own.folders),
		notes: union(global.notes, own.notes),
		tags: union(global.tags, own.tags),
		types: union(global.types, own.types),
	};
}

/**
 * The "To list" view the migration seeds: one heading card per tag of the
 * legacy `sectionTag` text (`parseSectionTags`), or the `#to-list` card when it
 * holds no tag; no own exclude; quick filters, grouping and sort at their defaults.
 */
export function toListView(sectionTag: string): SavedTaskView {
	const tags = parseSectionTags(sectionTag);
	return {
		id: TO_LIST_ID,
		name: 'To list',
		query: {
			sources: headingSources(tags.length > 0 ? tags : ['#to-list']),
			exclude: emptyTaskExcludes(),
			quick: { ...DEFAULT_QUICK },
			groupBy: 'note',
			sort: [...DEFAULT_TASK_SORT],
		},
	};
}

/**
 * What a saved view stores of the session: its query, grouping and sort,
 * without `quick.search` (a restored search would hide rows behind a filter
 * nobody typed in this session).
 */
export function viewQueryOf(query: TaskQuery, groupBy: TaskGroupKey, sort: readonly TaskSortKey[]): TaskViewQuery {
	const { search: _search, ...quick } = query.quick;
	// A copy: the store keeps `groupBy` in deep state, whose proxy must not reach a saved view.
	const group = typeof groupBy === 'string' ? groupBy : { property: groupBy.property };
	return { sources: query.sources, exclude: query.exclude, quick, groupBy: group, sort: [...sort] };
}

/** The saved view or built-in list with `id`, saved views first; undefined when none has it. */
export function findTaskView(id: string, savedViews: readonly SavedTaskView[]): SavedTaskView | undefined {
	return savedViews.find((v) => v.id === id) ?? BUILT_IN_TASK_VIEWS.find((v) => v.id === id);
}

/** Whether `value` is a JSON object: not `null`, not an array, not a primitive. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The strings of `value` when it is an array, else `[]`. */
const strings = (value: unknown): string[] => (Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []);

/** `value` when it is one of `allowed`, else undefined. */
function oneOf<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
	return allowed.includes(value as T) ? (value as T) : undefined;
}

/** The entries of `value` that are in `allowed`, in `allowed` order; undefined when none is. */
function someOf<T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const kept = allowed.filter((a) => value.includes(a));
	return kept.length > 0 ? kept : undefined;
}

/**
 * Reads saved excludes: each field of the wrong type falls back to its own
 * default in `defaults`, and non-string list entries are dropped.
 */
function parseExcludes(raw: Record<string, unknown>, defaults: TaskExcludes): TaskExcludes {
	const flag = (key: 'archived' | 'typeDefinitions' | 'templatesFolder' | 'systemFolder') =>
		typeof raw[key] === 'boolean' ? (raw[key] as boolean) : defaults[key];
	return {
		archived: flag('archived'),
		typeDefinitions: flag('typeDefinitions'),
		templatesFolder: flag('templatesFolder'),
		systemFolder: flag('systemFolder'),
		folders: strings(raw.folders),
		notes: strings(raw.notes),
		tags: strings(raw.tags),
		types: strings(raw.types),
	};
}

const PROPERTY_OPS: readonly PropertyOp[] = ['is', 'isNot', 'contains', 'exists'];
const LIFECYCLE_STATES: readonly LifecycleState[] = ['inbox', 'organized', 'favorite', 'archived'];
const DUE_RANGES: readonly DueRange[] = ['any', 'overdue', 'today', 'next7', 'none', 'edited7', 'edited30'];
/** The string group keys; a Record so a key added to `TaskGroupKey` fails to compile until listed here. */
const GROUP_KEY_SET: Record<Exclude<TaskGroupKey, { property: string }>, true> = {
	note: true,
	folder: true,
	type: true,
	heading: true,
	due: true,
	priority: true,
	status: true,
};
const GROUP_KEYS = Object.keys(GROUP_KEY_SET) as (keyof typeof GROUP_KEY_SET)[];
const SORT_KEYS: readonly TaskSortKey[] = ['due', 'priority', 'path'];

/** A saved clause rebuilt field by field, or null when its kind or a required field is wrong. */
function parseClause(raw: unknown): TaskSourceClause | null {
	if (!isPlainObject(raw)) return null;
	const negate = typeof raw.negate === 'boolean' ? { negate: raw.negate } : {};
	switch (raw.kind) {
		case 'folder':
			return typeof raw.path === 'string' ? { kind: 'folder', path: raw.path, ...negate } : null;
		case 'type':
			return typeof raw.type === 'string' ? { kind: 'type', type: raw.type, ...negate } : null;
		case 'noteTag':
			return typeof raw.tag === 'string' ? { kind: 'noteTag', tag: raw.tag, ...negate } : null;
		case 'heading':
			return typeof raw.text === 'string' ? { kind: 'heading', text: raw.text, match: raw.match === 'substring' ? 'substring' : 'tag' } : null;
		case 'property': {
			const op = oneOf(raw.op, PROPERTY_OPS);
			if (typeof raw.key !== 'string' || !op) return null;
			return { kind: 'property', key: raw.key, op, ...(typeof raw.value === 'string' ? { value: raw.value } : {}) };
		}
		case 'lifecycle': {
			const state = oneOf(raw.state, LIFECYCLE_STATES);
			return state ? { kind: 'lifecycle', state } : null;
		}
		default:
			return null;
	}
}

/** Saved source cards: a card that is not an object with a `clauses` array is dropped, and so is each bad clause. */
function parseSources(raw: unknown): TaskSource[] {
	if (!Array.isArray(raw)) return [];
	return raw
		.filter((card): card is { clauses: unknown[] } => isPlainObject(card) && Array.isArray(card.clauses))
		.map((card) => ({ clauses: card.clauses.map(parseClause).filter((c): c is TaskSourceClause => c !== null) }));
}

/** Saved quick filters, field by field; `search` is never read back. */
function parseQuick(raw: unknown): TaskQuickFilters {
	if (!isPlainObject(raw)) return { ...DEFAULT_QUICK };
	const quick: TaskQuickFilters = { show: oneOf(raw.show, ['open', 'closed', 'all'] as const) ?? DEFAULT_QUICK.show };
	const statuses = someOf(raw.statuses, TASK_STATUSES);
	if (statuses) quick.statuses = statuses;
	const due = oneOf(raw.due, DUE_RANGES);
	if (due && due !== 'any') quick.due = due;
	const priorities = someOf(raw.priorities, TASK_PRIORITIES);
	if (priorities) quick.priorities = priorities;
	const tags = strings(raw.tags);
	if (tags.length > 0) quick.tags = tags;
	return quick;
}

/** A saved grouping, else `note`. */
function parseGroupBy(raw: unknown): TaskGroupKey {
	if (isPlainObject(raw) && typeof raw.property === 'string') return { property: raw.property };
	return oneOf(raw, GROUP_KEYS) ?? 'note';
}

/** A saved view's query, each field falling back to its own default. */
function parseViewQuery(raw: unknown): TaskViewQuery {
	const q = isPlainObject(raw) ? raw : {};
	const sort = strings(q.sort).filter((k): k is TaskSortKey => SORT_KEYS.includes(k as TaskSortKey));
	return {
		sources: parseSources(q.sources),
		exclude: isPlainObject(q.exclude) ? parseExcludes(q.exclude, emptyTaskExcludes()) : emptyTaskExcludes(),
		quick: parseQuick(q.quick),
		groupBy: parseGroupBy(q.groupBy),
		sort: sort.length > 0 ? sort : [...DEFAULT_TASK_SORT],
	};
}

/**
 * Reads the Tasks view's saved state (`settings.json` `tasksView`, unvalidated)
 * into fresh objects. `valid` is false when `raw` is present but not an
 * object, or its `globalExcludes` is not an object, its `savedViews` not an
 * array, or (while seeding) its legacy `sectionTag` not a string; each bad
 * field falls back to its default and the others are kept.
 *
 * Without a valid `savedViews` it seeds the "To list" view (`toListView`)
 * from the legacy `sectionTag`. A present `savedViews`, even `[]`, never
 * seeds. A view entry that is not an object, or has no string `id` and
 * `name`, is dropped. `activeList` is kept when it names a saved view or a
 * built-in, else the first saved view, else "All open". `version` is not checked.
 */
export function parseTasksViewState(raw: unknown): { state: TaskViewsState; valid: boolean } {
	let valid = raw === undefined || isPlainObject(raw);
	const saved = isPlainObject(raw) ? raw : {};

	let globalExcludes = defaultTaskExcludes();
	if (isPlainObject(saved.globalExcludes)) globalExcludes = parseExcludes(saved.globalExcludes, defaultTaskExcludes());
	else if (saved.globalExcludes !== undefined) valid = false;

	let savedViews: SavedTaskView[];
	if (Array.isArray(saved.savedViews)) {
		savedViews = saved.savedViews
			.filter((v): v is Record<string, unknown> => isPlainObject(v) && typeof v.id === 'string' && typeof v.name === 'string')
			.map((v) => ({ id: v.id as string, name: v.name as string, query: parseViewQuery(v.query) }));
	} else {
		if (saved.savedViews !== undefined) valid = false;
		const { sectionTag } = saved;
		if (sectionTag !== undefined && typeof sectionTag !== 'string') valid = false;
		savedViews = [toListView(typeof sectionTag === 'string' ? sectionTag : '')];
	}

	const stored = typeof saved.activeList === 'string' ? saved.activeList : '';
	const activeList = findTaskView(stored, savedViews)?.id ?? savedViews[0]?.id ?? ALL_OPEN_ID;
	return { state: { activeList, globalExcludes, savedViews }, valid };
}

/**
 * Returns the Tasks view's saved state with `state` written into it. Every
 * unknown key of an object `raw` is kept; the legacy `sectionTag`, and a
 * `headingTags` or `query` key a hand edit may have left, are removed. A
 * numeric `version` is kept, otherwise `1` is written. A non-object `raw` is
 * replaced wholesale. `raw` is never mutated.
 */
export function withTasksViewState(raw: unknown, state: TaskViewsState): Record<string, unknown> {
	const base = isPlainObject(raw) ? raw : {};
	const { sectionTag: _sectionTag, headingTags: _headingTags, query: _query, ...rest } = base;
	return {
		...rest,
		version: typeof base.version === 'number' ? base.version : 1,
		activeList: state.activeList,
		globalExcludes: state.globalExcludes,
		savedViews: state.savedViews,
	};
}
