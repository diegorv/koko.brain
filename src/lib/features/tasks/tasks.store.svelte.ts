import type { FileTaskGroup, TaskDateFilter } from './tasks.types';

/** All task groups across the vault (unfiltered) */
let fileTaskGroups = $state<FileTaskGroup[]>([]);
/** Active date filter */
let dateFilter = $state<TaskDateFilter>('all');
/**
 * Section tag text to filter by, one or more tags separated by spaces or
 * commas (e.g. "#to-list #work"; see `parseSectionTags`). Text with no tag
 * means all tasks.
 */
let sectionTag = $state('#to-list');
/** Whether to hide completed tasks */
let hideCompleted = $state(true);
/** True while the task index is being built */
let isLoading = $state(false);
/** True once a fetch for the current vault has settled, on success or failure */
let hasLoaded = $state(false);

export const tasksStore = {
	get fileTaskGroups() { return fileTaskGroups; },
	get dateFilter() { return dateFilter; },
	get sectionTag() { return sectionTag; },
	get hideCompleted() { return hideCompleted; },
	get isLoading() { return isLoading; },
	get hasLoaded() { return hasLoaded; },

	setFileTaskGroups(groups: FileTaskGroup[]) { fileTaskGroups = groups; },
	setDateFilter(filter: TaskDateFilter) { dateFilter = filter; },
	setSectionTag(tag: string) { sectionTag = tag; },
	setHideCompleted(hide: boolean) { hideCompleted = hide; },
	setLoading(loading: boolean) { isLoading = loading; },
	setHasLoaded(loaded: boolean) { hasLoaded = loaded; },

	reset() {
		fileTaskGroups = [];
		dateFilter = 'all';
		sectionTag = '#to-list';
		hideCompleted = true;
		isLoading = false;
		hasLoaded = false;
	},
};
