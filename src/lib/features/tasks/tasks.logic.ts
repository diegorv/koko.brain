import type { TaskItem, FileTaskGroup, TaskDateFilter } from './tasks.types';
import { parseTaskMetadata, mapCheckboxChar } from './task-metadata.logic';

/**
 * Regex matching a task list item line.
 * Captures: (1) leading whitespace + marker, (2) check character, (3) task text.
 * Supports extended status chars: space, x/X, -, /, ?, >, !
 */
const TASK_RE = /^(\s*[-*+]\s)\[([xX \-/?!>])\]\s(.*)$/;

/** Regex matching an ordered list task (e.g. "1. [ ] task") */
const ORDERED_TASK_RE = /^(\s*)\d+\.\s\[([xX \-/?!>])\]\s(.*)$/;

/** Regex matching the start of a fenced code block */
const CODE_FENCE_RE = /^(\s*)(```|~~~)/;

/**
 * Calculates the indent level from a whitespace string.
 * Each tab counts as 1 indent level, every 2 spaces count as 1 indent level.
 */
function calculateIndent(whitespace: string): number {
	let tabs = 0;
	let spaces = 0;

	for (const ch of whitespace) {
		if (ch === '\t') tabs++;
		else if (ch === ' ') spaces++;
	}

	return tabs + Math.floor(spaces / 2);
}

/**
 * Parses a single line as a task item.
 * Supports both unordered (`- [ ]`, `* [ ]`, `+ [ ]`) and ordered (`1. [ ]`) markers.
 * Extracts status from the checkbox character and metadata from emoji signifiers.
 * @returns TaskItem or null if the line is not a task
 */
function parseTaskLine(line: string, lineNumber: number): TaskItem | null {
	const unordered = line.match(TASK_RE);
	if (unordered) {
		const checkChar = unordered[2];
		const rawText = unordered[3];
		if (!rawText.trim()) return null;
		const leadingWhitespace = line.match(/^(\s*)/)?.[1] ?? '';
		return {
			text: rawText,
			checked: checkChar !== ' ',
			indent: calculateIndent(leadingWhitespace),
			lineNumber,
			status: mapCheckboxChar(checkChar),
			metadata: parseTaskMetadata(rawText),
		};
	}

	const ordered = line.match(ORDERED_TASK_RE);
	if (ordered) {
		const checkChar = ordered[2];
		const rawText = ordered[3];
		if (!rawText.trim()) return null;
		return {
			text: rawText,
			checked: checkChar !== ' ',
			indent: calculateIndent(ordered[1]),
			lineNumber,
			status: mapCheckboxChar(checkChar),
			metadata: parseTaskMetadata(rawText),
		};
	}

	return null;
}

/**
 * Extracts all tasks from a single file's content.
 * Skips tasks inside fenced code blocks.
 * @returns TaskItem[] in document order
 */
export function extractTasks(content: string): TaskItem[] {
	const lines = content.split('\n');
	const tasks: TaskItem[] = [];
	let inCodeBlock = false;
	let codeFenceChar: string | null = null;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		const fenceMatch = line.match(CODE_FENCE_RE);
		if (fenceMatch) {
			const fence = fenceMatch[2]; // "```" or "~~~"
			if (!inCodeBlock) {
				inCodeBlock = true;
				codeFenceChar = fence;
			} else if (fence === codeFenceChar) {
				inCodeBlock = false;
				codeFenceChar = null;
			}
			continue;
		}

		if (inCodeBlock) continue;

		const task = parseTaskLine(line, i + 1);
		if (task) tasks.push(task);
	}

	return tasks;
}

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

