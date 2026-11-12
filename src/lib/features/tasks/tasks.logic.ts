import { isSafeUrl } from '#lib/utils/sanitize-url.js';
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

/** The Tasks view's filters, as the store holds them */
export interface TaskRuleOptions {
	/** Raw section tag text, as typed (one or more tags; see `parseSectionTags`) */
	sectionTag: string;
	/** Whether completed tasks are hidden */
	hideCompleted: boolean;
	/** Active date filter */
	dateFilter: TaskDateFilter;
}

/**
 * Splits the section tag textbox into the tags sent to
 * `get_tasks_in_section_v2`: split on whitespace and commas, a leading `#`
 * added when missing, exact duplicates removed (first-typed order kept).
 * A lone `#` is dropped: it would match every tagged heading, and the
 * debounce can fire mid-typing (`#to-list #`). Matching is case-sensitive,
 * so `#Work` and `#work` stay two tags. An empty result means no section
 * filter.
 */
export function parseSectionTags(text: string): string[] {
	const tags: string[] = [];
	for (const token of text.split(/[\s,]+/)) {
		if (!token || token === '#') continue;
		const tag = token.startsWith('#') ? token : `#${token}`;
		if (!tags.includes(tag)) tags.push(tag);
	}
	return tags;
}

/** Shows the parsed section tags joined with ` or `; '' when there are none. */
function displaySectionTags(sectionTag: string): string {
	return parseSectionTags(sectionTag).join(' or ');
}

/** Days covered by a date filter other than `all` */
function dateFilterDays(dateFilter: Exclude<TaskDateFilter, 'all'>): number {
	return dateFilter === 'last7days' ? 7 : 30;
}

/**
 * Builds the sentence above the Tasks list that says which tasks it shows,
 * e.g. "Open tasks under headings containing #to-list". No trailing period.
 */
export function describeTaskRule({ sectionTag, hideCompleted, dateFilter }: TaskRuleOptions): string {
	const tag = displaySectionTags(sectionTag);
	const which = hideCompleted ? 'Open tasks' : 'All tasks';
	const where = tag ? ` under headings containing ${tag}` : ' from every note';
	const when = dateFilter === 'all' ? '' : `, in notes edited in the last ${dateFilterDays(dateFilter)} days`;
	return `${which}${where}${when}`;
}

/** Why the Tasks list is empty, and the one action that would fill it */
export interface EmptyTasksExplanation {
	/** Sentence naming the filter that emptied the list */
	message: string;
	/** Button that lifts that filter, when one does */
	action?: { kind: 'clearTag' | 'showCompleted' | 'allTime'; label: string };
}

/**
 * Names the first filter stage that leaves the Tasks list empty. The view
 * calls it only when its filtered list is empty; it picks wording and does
 * not filter again, so it takes no clock.
 * @param groups - the unfiltered store groups (already limited by the
 *   section tag on the Rust side)
 */
export function explainEmptyTasks({
	groups,
	sectionTag,
	hideCompleted,
	dateFilter,
}: TaskRuleOptions & { groups: FileTaskGroup[] }): EmptyTasksExplanation {
	let total = 0;
	let checked = 0;
	for (const group of groups) {
		for (const task of group.tasks) {
			total++;
			if (task.checked) checked++;
		}
	}

	if (total === 0) {
		const tag = displaySectionTags(sectionTag);
		if (tag) {
			return {
				message: `No task sits under a heading containing ${tag}`,
				action: { kind: 'clearTag', label: 'Clear tag' },
			};
		}
		return { message: 'No tasks in this vault yet' };
	}

	// `filterCompleted` keeps every unchecked task, so only an all-checked set
	// empties the list here.
	if (hideCompleted && checked === total) {
		return {
			message: total === 1 ? 'The only task is completed' : `All ${total} tasks are completed`,
			action: { kind: 'showCompleted', label: 'Show completed' },
		};
	}

	// The view filters by date before it hides completed tasks, so with
	// hide-completed on the list can be empty while open tasks sit in old notes.
	if (dateFilter !== 'all') {
		const days = dateFilterDays(dateFilter);
		return {
			message: hideCompleted
				? `No open task is in a note edited in the last ${days} days`
				: `No note with tasks was edited in the last ${days} days`,
			action: { kind: 'allTime', label: 'All time' },
		};
	}

	// Unreachable from the view: past the first two stages an unchecked task
	// remains (or hide-completed is off), and with no date filter it is listed.
	return { message: 'No tasks found' };
}


/** A segment of task text for rich rendering in the Tasks view */
export type TaskTextSegment =
	| { type: 'text'; value: string }
	| { type: 'wikilink'; target: string; heading?: string; display: string }
	| { type: 'link'; label: string; url: string };

/** Matches `[[target#heading|alias]]` or `[label](url)` */
const TASK_TEXT_RE = /\[\[([^\]|#]*)(?:#([^\]|]+))?(?:\|([^\]]+))?\]\]|\[([^\]]+)\]\(([^)\s]+)\)/g;

/**
 * Parses task text into text, wikilink and markdown-link segments.
 * Only absolute URLs with a safe protocol become links: a relative href would
 * navigate the app's own webview. Anything else stays as plain text.
 */
export function parseTaskTextSegments(text: string): TaskTextSegment[] {
	const segments: TaskTextSegment[] = [];
	const pushText = (value: string) => {
		const last = segments[segments.length - 1];
		if (last?.type === 'text') last.value += value;
		else segments.push({ type: 'text', value });
	};
	let lastIndex = 0;

	for (const m of text.matchAll(TASK_TEXT_RE)) {
		if (m.index > lastIndex) pushText(text.slice(lastIndex, m.index));

		if (m[4] !== undefined) {
			const url = m[5];
			if (/^[a-z][a-z0-9+.-]*:/i.test(url) && isSafeUrl(url)) {
				segments.push({ type: 'link', label: m[4], url });
			} else {
				pushText(m[0]);
			}
		} else {
			const target = m[1];
			const heading = m[2] || undefined;
			const display = m[3] || (heading ? `${target}#${heading}` : target);
			segments.push(heading ? { type: 'wikilink', target, heading, display } : { type: 'wikilink', target, display });
		}

		lastIndex = m.index + m[0].length;
	}

	if (lastIndex < text.length) pushText(text.slice(lastIndex));
	return segments;
}
