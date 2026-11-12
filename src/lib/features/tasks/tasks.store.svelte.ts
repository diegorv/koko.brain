import { DEFAULT_QUICK, applyEditedCutoff, applyQuickFilters, type TaskQuickFilters, type TaskRow } from './task-query.logic';
import type { FileTaskGroup, TaskDateFilter } from './tasks.types';

/** All task groups across the vault (unfiltered) */
let fileTaskGroups = $state<FileTaskGroup[]>([]);
/** Every task of the fetched groups as a row (unfiltered), replaced whole, never mutated */
let rows = $state.raw<TaskRow[]>([]);
/** Active date filter */
let dateFilter = $state<TaskDateFilter>('all');
/**
 * Section tag text to filter by, one or more tags separated by spaces or
 * commas (e.g. "#to-list #work"; see `parseSectionTags`). Text with no tag
 * means all tasks.
 */
let sectionTag = $state('#to-list');
/** The quick filters (status), replaced whole on every change */
let quick = $state.raw<TaskQuickFilters>({ ...DEFAULT_QUICK });
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
 * The rows the list shows: the date cutoff, then the quick filters. The clock
 * is read when the derived re-runs and is not tracked, so a pane left open
 * across a cutoff boundary updates on the next refetch.
 */
const visibleRows = $derived.by(() => applyQuickFilters(applyEditedCutoff(rows, dateFilter, Date.now()), quick));

export const tasksStore = {
	get fileTaskGroups() { return fileTaskGroups; },
	/** Every fetched task as a row, before any view filter */
	get rows() { return rows; },
	/** The rows the list shows, dimmed parents included (see `applyQuickFilters`) */
	get visibleRows() { return visibleRows; },
	get dateFilter() { return dateFilter; },
	get sectionTag() { return sectionTag; },
	/** The quick filters */
	get quick() { return quick; },
	get isLoading() { return isLoading; },
	get hasLoaded() { return hasLoaded; },
	get error() { return error; },
	get scrollOffset() { return scrollOffset; },

	setFileTaskGroups(groups: FileTaskGroup[]) { fileTaskGroups = groups; },
	/** Replaces the rows. */
	setRows(next: TaskRow[]) { rows = next; },
	setDateFilter(filter: TaskDateFilter) { dateFilter = filter; },
	setSectionTag(tag: string) { sectionTag = tag; },
	/** Merges `partial` into the quick filters; a key set to `undefined` clears that field. */
	setQuick(partial: Partial<TaskQuickFilters>) { quick = { ...quick, ...partial }; },
	/** Puts the quick filters back to `DEFAULT_QUICK`. */
	resetQuick() { quick = { ...DEFAULT_QUICK }; },
	setLoading(loading: boolean) { isLoading = loading; },
	setHasLoaded(loaded: boolean) { hasLoaded = loaded; },
	/** Sets or clears the refresh error message. */
	setError(message: string | null) { error = message; },
	/** Saves the list viewport's `scrollTop`. */
	setScrollOffset(offset: number) { scrollOffset = offset; },

	reset() {
		fileTaskGroups = [];
		rows = [];
		dateFilter = 'all';
		sectionTag = '#to-list';
		quick = { ...DEFAULT_QUICK };
		isLoading = false;
		hasLoaded = false;
		error = null;
		scrollOffset = 0;
	},
};
