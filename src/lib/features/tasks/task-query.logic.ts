import { vaultRelativeKey } from '#lib/utils/path.js';
import { TASK_STATUSES, isTaskOpen, statusGlyph } from './task-status.logic';
import type { TaskStatus } from './task-metadata.types';
import { noteFolder, noteTaskCounts, parseSectionTags } from './tasks.logic';
import type { FileTaskGroup, TaskDateFilter, TaskItem } from './tasks.types';

/**
 * One task of the Tasks view, with the fields of its note that the filters and
 * the list read. It keeps every `TaskItem` field, so `toggleTask`, `taskChips`
 * and `taskDisplayText` take a row unchanged.
 */
export type TaskRow = TaskItem & {
	/** Absolute note path: the only path passed to IPC, the editor and `toggleTask` */
	filePath: string;
	/** Vault-relative path, for display and sorting only; the absolute path outside the vault */
	relPath: string;
	/** Vault-relative folder (`noteFolder`): '' at the root, outside the vault and with no vault open */
	folder: string;
	/** The note's display name */
	noteTitle: string;
	/** `isTaskOpen(status)` */
	open: boolean;
	/** The note's last-modified time in ms */
	modifiedAt: number;
	/** The note's tasks, counted before any quick filter or date cutoff */
	noteTaskCount: number;
	/** The note's open tasks, counted before any quick filter or date cutoff */
	noteOpenCount: number;
	/** Line of the nearest earlier task in the same note with a smaller indent */
	parentLine?: number;
};

/** A row the quick filters keep: one that passes, or one `dimmed` because a passing row sits in its subtree */
export type VisibleRow = TaskRow & {
	/** True when the row fails the filters and stays only as the parent of a passing row */
	dimmed: boolean;
};

/** The Tasks view's quick filters */
export type TaskQuickFilters = {
	/** Which tasks show when no status is chosen */
	show: 'open' | 'closed' | 'all';
	/** Chosen statuses in `TASK_STATUSES` order; when non-empty they win over `show`. Never `[]` once set by a setter */
	statuses?: TaskStatus[];
};

/** The quick filters a fresh Tasks view starts with */
export const DEFAULT_QUICK: TaskQuickFilters = { show: 'open' };

/** A quick filter field `isQuickFieldDefault` tests */
export type QuickFilterField = 'status';

/**
 * Whether `field` of `quick` is at its default. The status field is when
 * `show` is `open` and no status is chosen (`statuses` absent or empty).
 */
export function isQuickFieldDefault(quick: TaskQuickFilters, field: QuickFilterField): boolean {
	switch (field) {
		case 'status':
			return quick.show === 'open' && !quick.statuses?.length;
	}
}

/**
 * `statuses` with `status` added or removed, in `TASK_STATUSES` order
 * whatever the click order. `undefined` when the list empties.
 */
export function toggleQuickStatus(statuses: TaskStatus[] | undefined, status: TaskStatus): TaskStatus[] | undefined {
	const chosen = new Set(statuses);
	if (chosen.has(status)) chosen.delete(status);
	else chosen.add(status);
	const next = TASK_STATUSES.filter((s) => chosen.has(s));
	return next.length > 0 ? next : undefined;
}

/**
 * Flattens the note groups into rows, keeping the group order and the
 * document order. The note counts cover the whole group.
 */
export function buildTaskRows(groups: FileTaskGroup[], vaultPath: string | null): TaskRow[] {
	const rows: TaskRow[] = [];
	for (const group of groups) {
		const relPath = (vaultPath === null ? null : vaultRelativeKey(vaultPath, group.filePath)) ?? group.filePath;
		const folder = noteFolder(vaultPath, group.filePath);
		const counts = noteTaskCounts(group.tasks);
		// The tasks above the current one with a smaller indent, nearest last.
		const ancestors: TaskItem[] = [];
		for (const task of group.tasks) {
			while (ancestors.length > 0 && ancestors[ancestors.length - 1].indent >= task.indent) ancestors.pop();
			const parent = ancestors[ancestors.length - 1];
			rows.push({
				...task,
				filePath: group.filePath,
				relPath,
				folder,
				noteTitle: group.fileName,
				open: isTaskOpen(task.status),
				modifiedAt: group.modifiedAt,
				noteTaskCount: counts.total,
				noteOpenCount: counts.open,
				...(parent ? { parentLine: parent.lineNumber } : {}),
			});
			ancestors.push(task);
		}
	}
	return rows;
}

/** Whether `row` passes the status filter: a chosen status, else `show`. */
function passesStatus(row: TaskRow, quick: TaskQuickFilters): boolean {
	if (quick.statuses?.length) return quick.statuses.includes(row.status);
	if (quick.show === 'open') return row.open;
	if (quick.show === 'closed') return !row.open;
	return true;
}

/**
 * The rows that pass the quick filters, plus each failing row with a passing
 * row in its subtree (the later rows of the same note with a larger indent,
 * up to the next one whose indent is not larger), kept as `dimmed`.
 * Returns new objects; `rows` is never mutated.
 */
export function applyQuickFilters(rows: TaskRow[], quick: TaskQuickFilters): VisibleRow[] {
	const passes = rows.map((row) => passesStatus(row, quick));
	const visible: VisibleRow[] = [];
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (passes[i]) {
			visible.push({ ...row, dimmed: false });
			continue;
		}
		for (let j = i + 1; j < rows.length; j++) {
			if (rows[j].filePath !== row.filePath || rows[j].indent <= row.indent) break;
			if (passes[j]) {
				visible.push({ ...row, dimmed: true });
				break;
			}
		}
	}
	return visible;
}

/** Days covered by a date filter other than `all` */
function dateFilterDays(dateFilter: Exclude<TaskDateFilter, 'all'>): number {
	return dateFilter === 'last7days' ? 7 : 30;
}

/**
 * Drops the rows of notes last edited before the date filter's window
 * (`now` minus 7 or 30 days). Returns `rows` itself for `all`. Every row of a
 * note shares `modifiedAt`, so this commutes with `applyQuickFilters`.
 */
export function applyEditedCutoff(rows: TaskRow[], dateFilter: TaskDateFilter, now: number): TaskRow[] {
	if (dateFilter === 'all') return rows;
	const cutoff = now - dateFilterDays(dateFilter) * 24 * 60 * 60 * 1000;
	return rows.filter((row) => row.modifiedAt >= cutoff);
}

/** One note of the Tasks list and its visible rows */
export interface NoteRows {
	/** Absolute note path */
	filePath: string;
	/** The note's display name */
	noteTitle: string;
	/** Vault-relative folder, '' at the root */
	folder: string;
	/** The note's last-modified time in ms */
	modifiedAt: number;
	/** The note's tasks, before any filter */
	total: number;
	/** The note's open tasks, before any filter */
	open: number;
	/** The note's visible rows, in document order */
	rows: VisibleRow[];
}

/**
 * Groups visible rows by note, in first-appearance order. `total` and `open`
 * come from the note's first row, so filters never change them. A note with
 * no visible row is not returned.
 */
export function rowsByNote(rows: VisibleRow[]): NoteRows[] {
	const notes = new Map<string, NoteRows>();
	for (const row of rows) {
		let note = notes.get(row.filePath);
		if (!note) {
			note = {
				filePath: row.filePath,
				noteTitle: row.noteTitle,
				folder: row.folder,
				modifiedAt: row.modifiedAt,
				total: row.noteTaskCount,
				open: row.noteOpenCount,
				rows: [],
			};
			notes.set(row.filePath, note);
		}
		note.rows.push(row);
	}
	return [...notes.values()];
}

/** The chosen statuses' words, in their (`TASK_STATUSES`) order. */
function statusWords(statuses: TaskStatus[]): string[] {
	return statuses.map((s) => statusGlyph(s).word);
}

/**
 * The value after `Status: ` on the Status menu trigger: `open`, `closed`,
 * `all`, or the chosen statuses' words joined with `, `.
 */
export function statusFilterLabel(quick: TaskQuickFilters): string {
	return quick.statuses?.length ? statusWords(quick.statuses).join(', ') : quick.show;
}

/**
 * The toolbar count: "N open in M notes" at the default status filter, else
 * "N tasks in M notes", with singular forms. N counts the rows that are not
 * dimmed, M the notes holding at least one of them.
 */
export function taskCountText(rows: VisibleRow[], quick: TaskQuickFilters): string {
	const notes = new Set<string>();
	let count = 0;
	for (const row of rows) {
		if (row.dimmed) continue;
		count++;
		notes.add(row.filePath);
	}
	const what = isQuickFieldDefault(quick, 'status') ? 'open' : count === 1 ? 'task' : 'tasks';
	return `${count} ${what} in ${notes.size} ${notes.size === 1 ? 'note' : 'notes'}`;
}

/** The Tasks view's filters, as the store holds them */
export interface TaskRuleOptions {
	/** Raw section tag text, as typed (one or more tags; see `parseSectionTags`) */
	sectionTag: string;
	/** The quick filters */
	quick: TaskQuickFilters;
	/** Active date filter */
	dateFilter: TaskDateFilter;
}

/** Shows the parsed section tags joined with ` or `; '' when there are none. */
function displaySectionTags(sectionTag: string): string {
	return parseSectionTags(sectionTag).join(' or ');
}

/** The sentence's opening words for the status filter. */
function describeStatus(quick: TaskQuickFilters): string {
	if (quick.statuses?.length) return `Tasks that are ${statusWords(quick.statuses).join(' or ')}`;
	if (quick.show === 'open') return 'Open tasks';
	if (quick.show === 'closed') return 'Closed tasks';
	return 'All tasks';
}

/**
 * Builds the sentence above the Tasks list that says which tasks it shows,
 * e.g. "Open tasks under headings containing #to-list". No trailing period.
 */
export function describeTaskRule({ sectionTag, quick, dateFilter }: TaskRuleOptions): string {
	const tag = displaySectionTags(sectionTag);
	const where = tag ? ` under headings containing ${tag}` : ' from every note';
	const when = dateFilter === 'all' ? '' : `, in notes edited in the last ${dateFilterDays(dateFilter)} days`;
	return `${describeStatus(quick)}${where}${when}`;
}

/** Why the Tasks list is empty, and the one action that would fill it */
export interface EmptyTasksExplanation {
	/** Sentence naming the filter that emptied the list */
	message: string;
	/** Button that lifts that filter, when one does */
	action?: { kind: 'clearTag' | 'showAllStatuses' | 'allTime'; label: string };
}

/**
 * Names the first filter stage that leaves the Tasks list empty: the section
 * tag (no row at all), then the status filter, then the date filter.
 * @param rows - the unfiltered store rows (already limited by the section tag
 *   on the Rust side)
 * @param now - the clock the date cutoff reads, in ms
 */
export function explainEmptyTasks({
	rows,
	sectionTag,
	quick,
	dateFilter,
	now,
}: TaskRuleOptions & { rows: TaskRow[]; now: number }): EmptyTasksExplanation {
	if (rows.length === 0) {
		const tag = displaySectionTags(sectionTag);
		if (tag) {
			return {
				message: `No task sits under a heading containing ${tag}`,
				action: { kind: 'clearTag', label: 'Clear tag' },
			};
		}
		return { message: 'No tasks in this vault yet' };
	}

	const statusDefault = isQuickFieldDefault(quick, 'status');

	// Checked without the date cutoff: when the status filter alone empties
	// the list, lifting the date filter would not fill it.
	if (applyQuickFilters(rows, quick).length === 0) {
		const total = rows.length;
		return {
			message: statusDefault
				? total === 1
					? 'The only task is closed'
					: `All ${total} tasks are closed`
				: 'No task has the chosen status',
			action: { kind: 'showAllStatuses', label: 'Show all' },
		};
	}

	if (dateFilter !== 'all' && applyQuickFilters(applyEditedCutoff(rows, dateFilter, now), quick).length === 0) {
		const days = dateFilterDays(dateFilter);
		let message: string;
		if (statusDefault) message = `No open task is in a note edited in the last ${days} days`;
		else if (quick.show === 'all' && !quick.statuses?.length) message = `No note with tasks was edited in the last ${days} days`;
		else message = `No task with the chosen status is in a note edited in the last ${days} days`;
		return { message, action: { kind: 'allTime', label: 'All time' } };
	}

	// Unreachable from the view, which asks only when its list is empty.
	return { message: 'No tasks found' };
}
