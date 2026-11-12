import { settingsStore } from '#lib/core/settings/settings.store.svelte.js';
import { formatNow } from '#lib/utils/date.js';
import { timeSync } from '#lib/utils/debug.js';
import {
	DEFAULT_QUICK,
	DEFAULT_TASK_SORT,
	applyQuickFilters,
	defaultTaskQuery,
	groupTaskRows,
	selectSourceRows,
	type TaskExcludes,
	type TaskGroupKey,
	type TaskQuery,
	type TaskQuickFilters,
	type TaskRow,
	type TaskSortKey,
	type TaskSource,
} from './task-query.logic';
import type { TaskRowRef } from './tasks.types';

/** Every task of the snapshot as a row (unfiltered), replaced whole, never mutated */
let rows = $state.raw<TaskRow[]>([]);
/** The sources, excludes and quick filters, replaced whole on every change */
let query = $state.raw<TaskQuery>(defaultTaskQuery());
/** What the list groups its rows by */
let groupBy = $state<TaskGroupKey>('note');
/** The sort keys of the groups other than Note; fixed at `DEFAULT_TASK_SORT` (no control sets it) */
let sort = $state.raw<TaskSortKey[]>([...DEFAULT_TASK_SORT]);
/** True while the task index is being built */
let isLoading = $state(false);
/** True once a fetch for the current vault has settled, on success or failure */
let hasLoaded = $state(false);
/**
 * Fixed user-facing message when the latest refresh failed, null otherwise.
 * Never the raw error text, which goes to the log.
 */
let error = $state<string | null>(null);
/**
 * The Tasks list viewport's last `scrollTop`, restored when the view mounts
 * again. Not reactive: no component renders it, so scrolling writes it
 * without waking any effect.
 */
let scrollOffset = 0;
/**
 * The Tasks list's current row (the keyboard's place), kept across refetches
 * and remounts; null when no row was focused yet.
 */
let currentRow = $state.raw<TaskRowRef | null>(null);
/**
 * The `collapseKey`s of the collapsed groups, kept across remounts and
 * cleared by `reset()`. Replaced whole on every toggle: Svelte does not
 * proxy a `Set`, so a mutation in place would not be seen.
 */
let collapsedGroups = $state.raw<ReadonlySet<string>>(new Set());

/**
 * The rows the sources and excludes keep (`selectSourceRows`), before the
 * quick filters. Re-runs on a rows, sources, excludes or template folder
 * setting change, with no fetch.
 */
const sourceRows = $derived.by(() =>
	selectSourceRows(rows, query.sources, query.exclude, {
		templates: settingsStore.templates.folder,
		system: settingsStore.templates.systemFolder,
	}),
);

/**
 * The rows the list shows: `sourceRows` through the quick filters. The clock
 * (today and now) is read when the derived re-runs and is not tracked, so a
 * pane left open past midnight or across an edited cutoff updates on the next
 * refetch.
 */
const visibleRows = $derived.by(() => applyQuickFilters(sourceRows, query.quick, formatNow('YYYY-MM-DD'), Date.now()));

/**
 * The list's groups (`groupTaskRows`). Today is read when the derived re-runs
 * and is not tracked, like `visibleRows`. `timeSync` logs through `debug()`,
 * which reads `settingsStore`, so a settings write also re-runs it.
 */
const groups = $derived.by(() =>
	timeSync('TASK-PROFILE', 'groupTaskRows', () => groupTaskRows(visibleRows, groupBy, sort, formatNow('YYYY-MM-DD'))),
);

export const tasksStore = {
	/** Every task of the snapshot as a row, before any view filter */
	get rows() { return rows; },
	/** The rows the sources and excludes keep, before the quick filters */
	get sourceRows() { return sourceRows; },
	/** The rows the list shows, dimmed parents included (see `applyQuickFilters`) */
	get visibleRows() { return visibleRows; },
	/** The list's groups, in display order */
	get groups() { return groups; },
	/** What the list groups its rows by */
	get groupBy() { return groupBy; },
	/** The sort keys of the groups other than Note */
	get sort() { return sort; },
	/** The sources, excludes and quick filters */
	get query() { return query; },
	/** The quick filters (`query.quick`) */
	get quick() { return query.quick; },
	get isLoading() { return isLoading; },
	get hasLoaded() { return hasLoaded; },
	get error() { return error; },
	get scrollOffset() { return scrollOffset; },
	/** The list's current row, or null */
	get currentRow() { return currentRow; },
	/** The `collapseKey`s of the collapsed groups */
	get collapsedGroups() { return collapsedGroups; },

	/** Replaces the rows. */
	setRows(next: TaskRow[]) { rows = next; },
	/** Replaces the source cards. */
	setSources(sources: TaskSource[]) { query = { ...query, sources }; },
	/** Replaces the excludes. */
	setExclude(exclude: TaskExcludes) { query = { ...query, exclude }; },
	/** Merges `partial` into the quick filters; a key set to `undefined` clears that field. */
	setQuick(partial: Partial<TaskQuickFilters>) { query = { ...query, quick: { ...query.quick, ...partial } }; },
	/** Puts the quick filters back to `DEFAULT_QUICK`. */
	resetQuick() { query = { ...query, quick: { ...DEFAULT_QUICK } }; },
	/** Sets the grouping; the current value changes nothing. */
	setGroupBy(next: TaskGroupKey) { groupBy = next; },
	setLoading(loading: boolean) { isLoading = loading; },
	setHasLoaded(loaded: boolean) { hasLoaded = loaded; },
	/** Sets or clears the refresh error message. */
	setError(message: string | null) { error = message; },
	/** Saves the list viewport's `scrollTop`. */
	setScrollOffset(offset: number) { scrollOffset = offset; },
	/** Sets the current row to a copy of `row`, or clears it; does nothing when the row is unchanged. */
	setCurrentRow(row: TaskRowRef | null) {
		if (row === null) {
			currentRow = null;
			return;
		}
		if (currentRow && currentRow.filePath === row.filePath && currentRow.lineNumber === row.lineNumber) return;
		currentRow = { filePath: row.filePath, lineNumber: row.lineNumber };
	},
	/** Collapses the group with `collapseKey` `key`, or expands it when collapsed. */
	toggleGroupCollapsed(key: string) {
		const next = new Set(collapsedGroups);
		if (!next.delete(key)) next.add(key);
		collapsedGroups = next;
	},

	reset() {
		rows = [];
		query = defaultTaskQuery();
		groupBy = 'note';
		sort = [...DEFAULT_TASK_SORT];
		isLoading = false;
		hasLoaded = false;
		error = null;
		scrollOffset = 0;
		currentRow = null;
		collapsedGroups = new Set();
	},
};
