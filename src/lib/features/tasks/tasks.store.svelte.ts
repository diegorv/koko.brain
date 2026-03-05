import type { FileTaskGroup, TaskDateFilter } from './tasks.types';

/** All task groups across the vault (unfiltered) */
let fileTaskGroups = $state<FileTaskGroup[]>([]);
/** Active date filter */
let dateFilter = $state<TaskDateFilter>('all');
/** Section tag to filter by (e.g. "#to-list"). Empty string means all tasks. */
let sectionTag = $state('#to-list');
/** Whether to hide completed tasks */
let hideCompleted = $state(true);
/** True while the task index is being built */
let isLoading = $state(false);

export const tasksStore = {
	get fileTaskGroups() { return fileTaskGroups; },
	get dateFilter() { return dateFilter; },
	get sectionTag() { return sectionTag; },
	get hideCompleted() { return hideCompleted; },
	get isLoading() { return isLoading; },

	setFileTaskGroups(groups: FileTaskGroup[]) { fileTaskGroups = groups; },
	setDateFilter(filter: TaskDateFilter) { dateFilter = filter; },
	setSectionTag(tag: string) { sectionTag = tag; },
	setHideCompleted(hide: boolean) { hideCompleted = hide; },
	setLoading(loading: boolean) { isLoading = loading; },

	reset() {
		fileTaskGroups = [];
		dateFilter = 'all';
		sectionTag = '#to-list';
		hideCompleted = true;
		isLoading = false;
	},
};
