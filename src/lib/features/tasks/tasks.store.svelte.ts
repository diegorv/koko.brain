import { formatNow } from '#lib/utils/date.js';
import { timeSync } from '#lib/utils/debug.js';
import {
	DEFAULT_QUICK,
	DEFAULT_TASK_SORT,
	applyQuickFilters,
	groupTaskRows,
	type TaskGroupKey,
	type TaskQuickFilters,
	type TaskRow,
	type TaskSortKey,
} from './task-query.logic';
import type { FileTaskGroup, TaskRowRef } from './tasks.types';

/** All task groups across the vault (unfiltered) */
let fileTaskGroups = $state<FileTaskGroup[]>([]);
/** Every task of the fetched groups as a row (unfiltered), replaced whole, never mutated */
let rows = $state.raw<TaskRow[]>([]);
/**
 * Section tag text to filter by, one or more tags separated by spaces or
 * commas (e.g. "#to-list #work"; see `parseSectionTags`). Text with no tag
 * means all tasks.
 */
let sectionTag = $state('#to-list');
/** The quick filters (status, Due, Priority, Tag and Search), replaced whole on every change */
let quick = $state.raw<TaskQuickFilters>({ ...DEFAULT_QUICK });
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
 * The rows the list shows, through the quick filters. The clock (today and
 * now) is read when the derived re-runs and is not tracked, so a pane left
 * open past midnight or across an edited cutoff updates on the next refetch.
 */
const visibleRows = $derived.by(() => applyQuickFilters(rows, quick, formatNow('YYYY-MM-DD'), Date.now()));

/**
 * The list's groups (`groupTaskRows`). Today is read when the derived re-runs
 * and is not tracked, like `visibleRows`. `timeSync` logs through `debug()`,
 * which reads `settingsStore`, so a settings write also re-runs it.
 */
const groups = $derived.by(() =>
	timeSync('TASK-PROFILE', 'groupTaskRows', () => groupTaskRows(visibleRows, groupBy, sort, formatNow('YYYY-MM-DD'))),
);

export const tasksStore = {
	get fileTaskGroups() { return fileTaskGroups; },
	/** Every fetched task as a row, before any view filter */
	get rows() { return rows; },
	/** The rows the list shows, dimmed parents included (see `applyQuickFilters`) */
	get visibleRows() { return visibleRows; },
	/** The list's groups, in display order */
	get groups() { return groups; },
	/** What the list groups its rows by */
	get groupBy() { return groupBy; },
	/** The sort keys of the groups other than Note */
	get sort() { return sort; },
	get sectionTag() { return sectionTag; },
	/** The quick filters */
	get quick() { return quick; },
	get isLoading() { return isLoading; },
	get hasLoaded() { return hasLoaded; },
	get error() { return error; },
	get scrollOffset() { return scrollOffset; },
	/** The list's current row, or null */
	get currentRow() { return currentRow; },

	setFileTaskGroups(groups: FileTaskGroup[]) { fileTaskGroups = groups; },
	/** Replaces the rows. */
	setRows(next: TaskRow[]) { rows = next; },
	setSectionTag(tag: string) { sectionTag = tag; },
	/** Merges `partial` into the quick filters; a key set to `undefined` clears that field. */
	setQuick(partial: Partial<TaskQuickFilters>) { quick = { ...quick, ...partial }; },
	/** Puts the quick filters back to `DEFAULT_QUICK`. */
	resetQuick() { quick = { ...DEFAULT_QUICK }; },
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

	reset() {
		fileTaskGroups = [];
		rows = [];
		sectionTag = '#to-list';
		quick = { ...DEFAULT_QUICK };
		groupBy = 'note';
		sort = [...DEFAULT_TASK_SORT];
		isLoading = false;
		hasLoaded = false;
		error = null;
		scrollOffset = 0;
		currentRow = null;
	},
};
