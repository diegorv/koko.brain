import type { FileTreeNode } from '$lib/core/filesystem/fs.types';
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

/** Regex matching a markdown heading, captures: (1) hashes, (2) heading text */
const HEADING_RE = /^(#{1,6})\s+(.*)$/;

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
 * Extracts tasks only from sections whose heading contains the given tag.
 * A "section" spans from a heading line until the next heading of equal or higher level.
 * If sectionTag is empty, falls back to extracting all tasks.
 * @param sectionTag - The tag to match in headings (e.g. "#to-list"). Include the # prefix.
 */
export function extractTasksFromSection(content: string, sectionTag: string): TaskItem[] {
	if (!sectionTag.trim()) return extractTasks(content);

	const tag = sectionTag.startsWith('#') ? sectionTag : `#${sectionTag}`;
	const lines = content.split('\n');
	const tasks: TaskItem[] = [];
	let inCodeBlock = false;
	let codeFenceChar: string | null = null;
	let inMatchingSection = false;
	let sectionLevel = 0;

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];

		const fenceMatch = line.match(CODE_FENCE_RE);
		if (fenceMatch) {
			const fence = fenceMatch[2];
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

		const headingMatch = line.match(HEADING_RE);
		if (headingMatch) {
			const level = headingMatch[1].length;
			const headingText = headingMatch[2];

			if (inMatchingSection && level <= sectionLevel) {
				inMatchingSection = false;
			}

			if (headingText.includes(tag)) {
				inMatchingSection = true;
				sectionLevel = level;
			}
			continue;
		}

		if (inMatchingSection) {
			const task = parseTaskLine(line, i + 1);
			if (task) tasks.push(task);
		}
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
 * Recursively walks a FileTreeNode[] to build a flat filePath -> modifiedAt map.
 */
export function buildModifiedAtMap(fileTree: FileTreeNode[]): Map<string, number> {
	const map = new Map<string, number>();

	function walk(nodes: FileTreeNode[]): void {
		for (const node of nodes) {
			if (node.isDirectory) {
				if (node.children) walk(node.children);
			} else if (node.modifiedAt != null) {
				map.set(node.path, node.modifiedAt);
			}
		}
	}

	walk(fileTree);
	return map;
}

/**
 * Extracts the display name from a file path (filename without extension).
 */
function getDisplayName(filePath: string): string {
	const name = filePath.split('/').pop() ?? filePath;
	const dotIndex = name.lastIndexOf('.');
	return dotIndex > 0 ? name.substring(0, dotIndex) : name;
}

/**
 * Builds FileTaskGroups directly from a pre-computed task index.
 * Avoids re-parsing file contents — uses the cached TaskItem[] per file.
 * @returns FileTaskGroup[] sorted by modifiedAt descending.
 */
export function buildGroupsFromIndex(
	fileTasksIndex: Map<string, TaskItem[]>,
	modifiedAtMap: Map<string, number>,
): FileTaskGroup[] {
	const groups: FileTaskGroup[] = [];

	for (const [filePath, tasks] of fileTasksIndex) {
		groups.push({
			filePath,
			fileName: getDisplayName(filePath),
			modifiedAt: modifiedAtMap.get(filePath) ?? 0,
			tasks,
		});
	}

	groups.sort((a, b) => b.modifiedAt - a.modifiedAt);
	return groups;
}

/**
 * Aggregates tasks across all vault files.
 * When sectionTag is provided, only extracts tasks from sections whose heading contains that tag.
 * @returns FileTaskGroup[] sorted by modifiedAt descending. Files with 0 tasks are excluded.
 */
export function aggregateFileTasks(
	noteContents: Map<string, string>,
	modifiedAtMap: Map<string, number>,
	sectionTag?: string,
): FileTaskGroup[] {
	const groups: FileTaskGroup[] = [];
	const useSection = sectionTag && sectionTag.trim().length > 0;

	for (const [filePath, content] of noteContents) {
		const tasks = useSection
			? extractTasksFromSection(content, sectionTag)
			: extractTasks(content);
		if (tasks.length === 0) continue;

		groups.push({
			filePath,
			fileName: getDisplayName(filePath),
			modifiedAt: modifiedAtMap.get(filePath) ?? 0,
			tasks,
		});
	}

	groups.sort((a, b) => b.modifiedAt - a.modifiedAt);
	return groups;
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

/**
 * Checks whether two task arrays are equivalent.
 * Compares checked state, text, and status for each task in order.
 */
export function tasksEqual(a: TaskItem[], b: TaskItem[]): boolean {
	if (a.length !== b.length) return false;
	return a.every(
		(task, i) =>
			task.text === b[i].text && task.checked === b[i].checked && task.status === b[i].status,
	);
}

/**
 * Toggles a task's checked state in the raw file content at the given line number.
 * @param lineNumber - 1-based line number
 * @returns The updated content string
 */
export function toggleTaskInContent(content: string, lineNumber: number): string {
	const lines = content.split('\n');
	const idx = lineNumber - 1;
	if (idx < 0 || idx >= lines.length) return content;

	const line = lines[idx];
	if (/\[ \]/.test(line)) {
		lines[idx] = line.replace('[ ]', '[x]');
	} else if (/\[[xX\-/?!>]\]/.test(line)) {
		lines[idx] = line.replace(/\[[xX\-/?!>]\]/, '[ ]');
	}

	return lines.join('\n');
}
