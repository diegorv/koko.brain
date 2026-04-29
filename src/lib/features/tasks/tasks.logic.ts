import type { TaskItem, FileTaskGroup, TaskDateFilter } from './tasks.types';

// Audit Tier 4 #16 (2026-04-29): the previous TS-side task scanner —
// `extractTasks` plus its helpers (`parseTaskLine`, `calculateIndent`,
// `TASK_RE`, `ORDERED_TASK_RE`, `CODE_FENCE_RE`) — was removed. Phase 7.6
// migrated production task indexing to the Rust `get_all_tasks_v2` IPC,
// leaving the TS function exported but unused outside its own tests. Rust
// owns task parsing now (see `src-tauri/src/vault/parsing.rs::extract_tasks`
// and `src-tauri/src/vault/task.rs`); the result is consumed via
// `tasks.service.ts::buildTaskIndex`.

/**
 * Checks whether a task at the given index has any unchecked descendants.
 * Descendants are consecutive tasks with indent greater than the parent's indent.
 */
function hasUncheckedDescendants(tasks: TaskItem[], parentIdx: number): boolean {
	const parentIndent = tasks[parentIdx].indent;

	for (let j = parentIdx + 1; j < tasks.length; j++) {
		if (tasks[j].indent <= parentIndent) break;
		if (!tasks[j].checked) return true;
	}

	return false;
}

/**
 * Filters completed tasks while preserving hierarchy.
 * A completed parent is kept if it has any unchecked descendants.
 * A completed task with no unchecked descendants is removed.
 * Unchecked tasks are always kept.
 */
export function filterCompletedTasks(tasks: TaskItem[]): TaskItem[] {
	const result: TaskItem[] = [];

	for (let i = 0; i < tasks.length; i++) {
		const task = tasks[i];

		if (!task.checked) {
			result.push(task);
			continue;
		}

		// Completed task: keep only if it has unchecked descendants
		if (hasUncheckedDescendants(tasks, i)) {
			result.push(task);
		}
	}

	return result;
}

/**
 * Filters out completed tasks from groups, preserving parent-child hierarchy.
 * A completed parent task is kept visible if it has any unchecked children.
 * Only hides a family (parent + children) when all are completed.
 */
export function filterCompleted(groups: FileTaskGroup[]): FileTaskGroup[] {
	const filtered: FileTaskGroup[] = [];

	for (const group of groups) {
		const visibleTasks = filterCompletedTasks(group.tasks);
		if (visibleTasks.length > 0) {
			filtered.push({ ...group, tasks: visibleTasks });
		}
	}

	return filtered;
}

/**
 * Filters file task groups by date range based on modifiedAt.
 * @param now - injectable for testing, defaults to Date.now()
 */
export function filterByDate(
	groups: FileTaskGroup[],
	filter: TaskDateFilter,
	now?: number,
): FileTaskGroup[] {
	if (filter === 'all') return groups;

	const currentTime = now ?? Date.now();
	const days = filter === 'last7days' ? 7 : 30;
	const cutoff = currentTime - days * 24 * 60 * 60 * 1000;

	return groups.filter((g) => g.modifiedAt >= cutoff);
}

/** Computes summary statistics from an array of FileTaskGroups */
export function computeTaskStats(groups: FileTaskGroup[]): {
	total: number;
	completed: number;
	pending: number;
	fileCount: number;
} {
	let total = 0;
	let completed = 0;

	for (const group of groups) {
		for (const task of group.tasks) {
			total++;
			if (task.checked) completed++;
		}
	}

	return {
		total,
		completed,
		pending: total - completed,
		fileCount: groups.length,
	};
}

