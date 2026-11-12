import { formatDateWithOffset } from '#lib/utils/date.js';
import { vaultRelativeKey } from '#lib/utils/path.js';
import { TASK_STATUSES, isTaskOpen, statusGlyph } from './task-status.logic';
import type { TaskPriority, TaskStatus } from './task-metadata.types';
import { noteFolder, noteTaskCounts, parseSectionTags, taskDisplayText } from './tasks.logic';
import type { FileTaskGroup, TaskItem } from './tasks.types';

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
	/** The note's tasks, counted before any quick filter */
	noteTaskCount: number;
	/** The note's open tasks, counted before any quick filter */
	noteOpenCount: number;
	/** Line of the nearest earlier task in the same note with a smaller indent */
	parentLine?: number;
};

/** A row the quick filters keep: one that passes, or one `dimmed` because a passing row sits in its subtree */
export type VisibleRow = TaskRow & {
	/** True when the row fails the filters and stays only as the parent of a passing row */
	dimmed: boolean;
};

/**
 * The Due filter's options. `overdue`, `today`, `next7` (today through today
 * + 7 days) and `none` read the task's due date; `edited7` and `edited30`
 * read the note's modification time instead.
 */
export type DueRange = 'any' | 'overdue' | 'today' | 'next7' | 'none' | 'edited7' | 'edited30';

/** The Tasks view's quick filters */
export type TaskQuickFilters = {
	/** Which tasks show when no status is chosen */
	show: 'open' | 'closed' | 'all';
	/** Chosen statuses in `TASK_STATUSES` order; when non-empty they win over `show`. Never `[]` once set by a setter */
	statuses?: TaskStatus[];
	/** The Due filter; unset means `any`, and choosing Any stores `undefined` */
	due?: DueRange;
	/** Chosen priorities in `TASK_PRIORITIES` order; empty means any. Never `[]` once set by a setter */
	priorities?: TaskPriority[];
	/** Chosen task tags without `#`, in the Tag menu's option order; empty means any. Never `[]` once set by a setter */
	tags?: string[];
	/** Search text as typed; blank means none. An empty box stores `undefined` */
	search?: string;
};

/** The quick filters a fresh Tasks view starts with */
export const DEFAULT_QUICK: TaskQuickFilters = { show: 'open' };

/** A quick filter field `isQuickFieldDefault` tests */
export type QuickFilterField = 'status' | 'due' | 'priority' | 'tag' | 'search';

/**
 * Whether `field` of `quick` is at its default. The status field is when
 * `show` is `open` and no status is chosen (`statuses` absent or empty); the
 * due field when `due` is absent or `any`; priority and tag when their list
 * is absent or empty; search when it is absent or blank after `trim()`.
 */
export function isQuickFieldDefault(quick: TaskQuickFilters, field: QuickFilterField): boolean {
	switch (field) {
		case 'status':
			return quick.show === 'open' && !quick.statuses?.length;
		case 'due':
			return quick.due === undefined || quick.due === 'any';
		case 'priority':
			return !quick.priorities?.length;
		case 'tag':
			return !quick.tags?.length;
		case 'search':
			return !quick.search?.trim();
	}
}

/** Every priority, highest first, in the order of the generated `TaskPriority` (`none` between medium and low) */
export const TASK_PRIORITIES: readonly TaskPriority[] = ['highest', 'high', 'medium', 'none', 'low', 'lowest'];

/** A priority's menu label and sentence word: the level itself, `no priority` for `none`. */
export function priorityWord(priority: TaskPriority): string {
	return priority === 'none' ? 'no priority' : priority;
}

/**
 * `priorities` with `priority` added or removed, in `TASK_PRIORITIES` order
 * whatever the click order. `undefined` when the list empties.
 */
export function toggleQuickPriority(priorities: TaskPriority[] | undefined, priority: TaskPriority): TaskPriority[] | undefined {
	const chosen = new Set(priorities);
	if (chosen.has(priority)) chosen.delete(priority);
	else chosen.add(priority);
	const next = TASK_PRIORITIES.filter((p) => chosen.has(p));
	return next.length > 0 ? next : undefined;
}

/**
 * Whether a task tag passes a chosen tag: equal to it, or nested under it
 * (`work` passes `work/client`, not `workshop`), case-insensitively. A
 * leading `#` on the chosen tag is ignored.
 */
export function matchesNestedTag(chosen: string, tag: string): boolean {
	const c = chosen.replace(/^#/, '').toLowerCase();
	const t = tag.toLowerCase();
	return t === c || t.startsWith(`${c}/`);
}

const byLowerCase = (a: string, b: string) => {
	const x = a.toLowerCase();
	const y = b.toLowerCase();
	return x < y ? -1 : x > y ? 1 : 0;
};

/**
 * The Tag menu's options: every tag of `rows` as Rust emits it (no `#`),
 * de-duplicated case-insensitively (the first spelling wins) and sorted
 * case-insensitively.
 */
export function taskTagOptions(rows: TaskRow[]): string[] {
	const seen = new Map<string, string>();
	for (const row of rows) {
		for (const tag of row.metadata.tags) {
			const key = tag.toLowerCase();
			if (!seen.has(key)) seen.set(key, tag);
		}
	}
	return [...seen.values()].sort(byLowerCase);
}

/**
 * `taskTagOptions(rows)` plus each chosen tag it lacks (same spelling), so a
 * chosen tag whose tasks are gone can still be unchecked. Sorted the same way.
 */
export function tagMenuOptions(rows: TaskRow[], chosen: string[] | undefined): string[] {
	const options = taskTagOptions(rows);
	const missing = (chosen ?? []).filter((tag) => !options.includes(tag));
	return missing.length > 0 ? [...options, ...missing].sort(byLowerCase) : options;
}

/**
 * `tags` with `tag` added or removed, in `options` order whatever the click
 * order. `undefined` when the list empties.
 */
export function toggleQuickTag(tags: string[] | undefined, tag: string, options: string[]): string[] | undefined {
	const chosen = new Set(tags);
	if (chosen.has(tag)) chosen.delete(tag);
	else chosen.add(tag);
	const next = options.filter((o) => chosen.has(o));
	return next.length > 0 ? next : undefined;
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

const DAY_MS = 86_400_000;

/**
 * The Due filter as a row predicate, built once per call. Due dates are
 * `YYYY-MM-DD` keys, so plain string comparison orders them; a key Rust sent
 * without a calendar check still sorts consistently.
 * @param today - today as `YYYY-MM-DD`
 * @param now - the clock the edited options' cutoff reads, in ms
 */
function duePredicate(due: DueRange | undefined, today: string, now: number): ((row: TaskRow) => boolean) | null {
	switch (due) {
		case undefined:
		case 'any':
			return null;
		case 'overdue':
			return (row) => row.metadata.dueDate !== undefined && row.metadata.dueDate < today;
		case 'today':
			return (row) => row.metadata.dueDate === today;
		case 'next7': {
			// Parsed as a local date: `new Date(today)` would read UTC midnight.
			const end = formatDateWithOffset(today, 'YYYY-MM-DD', 'YYYY-MM-DD', 7);
			return (row) => row.metadata.dueDate !== undefined && row.metadata.dueDate >= today && row.metadata.dueDate <= end;
		}
		case 'none':
			return (row) => !row.metadata.dueDate;
		case 'edited7':
		case 'edited30': {
			const cutoff = now - (due === 'edited7' ? 7 : 30) * DAY_MS;
			return (row) => row.modifiedAt >= cutoff;
		}
	}
}

/**
 * The Priority, Tag and Search filters as one row predicate, or null when all
 * three are at their default. A task with no priority signifier has no
 * `metadata.priority` (Rust never sends `none`), so `none` matches it too.
 * Search matches the trimmed text, case-insensitively, inside what the row
 * shows (`taskDisplayText`) or its note title; tags and dates are not searched.
 */
function metaPredicate(quick: TaskQuickFilters): ((row: TaskRow) => boolean) | null {
	const priorities = isQuickFieldDefault(quick, 'priority') ? null : new Set(quick.priorities);
	const tags = isQuickFieldDefault(quick, 'tag') ? null : quick.tags!;
	const needle = isQuickFieldDefault(quick, 'search') ? null : quick.search!.trim().toLowerCase();
	if (!priorities && !tags && needle === null) return null;
	return (row) =>
		(!priorities || priorities.has(row.metadata.priority ?? 'none')) &&
		(!tags || tags.some((chosen) => row.metadata.tags.some((tag) => matchesNestedTag(chosen, tag)))) &&
		(needle === null ||
			taskDisplayText(row).toLowerCase().includes(needle) ||
			row.noteTitle.toLowerCase().includes(needle));
}

/**
 * The rows that pass the quick filters (status, Due, Priority, Tag and
 * Search), plus each failing row with a passing row in its subtree (the later
 * rows of the same note with a larger indent, up to the next one whose indent
 * is not larger), kept as `dimmed`. The edited Due options fold into the same
 * predicate: every row of a note shares `modifiedAt`, so no failing row is
 * ever kept dimmed for them. Returns new objects; `rows` is never mutated.
 * @param today - today as `YYYY-MM-DD`, for the due date options
 * @param now - the clock the edited options read, in ms
 */
export function applyQuickFilters(rows: TaskRow[], quick: TaskQuickFilters, today: string, now: number): VisibleRow[] {
	const passesDue = duePredicate(quick.due, today, now);
	const passesMeta = metaPredicate(quick);
	const passes = rows.map(
		(row) =>
			passesStatus(row, quick) && (passesDue === null || passesDue(row)) && (passesMeta === null || passesMeta(row)),
	);
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

/** The sentence's closing words for each Due option other than `any`. */
const DUE_PHRASES: Record<Exclude<DueRange, 'any'>, string> = {
	overdue: ', overdue',
	today: ', due today',
	next7: ', due in the next 7 days',
	none: ', with no due date',
	edited7: ', in notes edited in the last 7 days',
	edited30: ', in notes edited in the last 30 days',
};

/**
 * Builds the sentence above the Tasks list that says which tasks it shows,
 * e.g. "Open tasks under headings containing #to-list, overdue, priority
 * high, tagged #work, matching "call"". No trailing period.
 */
export function describeTaskRule({ sectionTag, quick }: TaskRuleOptions): string {
	const tag = displaySectionTags(sectionTag);
	const where = tag ? ` under headings containing ${tag}` : ' from every note';
	const when = quick.due === undefined || quick.due === 'any' ? '' : DUE_PHRASES[quick.due];
	const priority = isQuickFieldDefault(quick, 'priority')
		? ''
		: `, priority ${quick.priorities!.map(priorityWord).join(' or ')}`;
	const tagged = isQuickFieldDefault(quick, 'tag') ? '' : `, tagged ${quick.tags!.map((t) => `#${t}`).join(' or ')}`;
	const matching = isQuickFieldDefault(quick, 'search') ? '' : `, matching "${quick.search!.trim()}"`;
	return `${describeStatus(quick)}${where}${when}${priority}${tagged}${matching}`;
}

/** Why the Tasks list is empty, and the one action that would fill it */
export interface EmptyTasksExplanation {
	/** Sentence naming the filter that emptied the list */
	message: string;
	/** Button that lifts that filter, when one does; `resetQuick` resets only `field` */
	action?:
		| { kind: 'clearTag'; label: string }
		| { kind: 'showAllStatuses'; label: string }
		| { kind: 'resetQuick'; field: 'due' | 'priorities' | 'tags' | 'search'; label: string };
}

/** The stages after Due, in the order `explainEmptyTasks` checks them. */
const META_STAGES = [
	{ field: 'priority', key: 'priorities', name: 'Priority' },
	{ field: 'tag', key: 'tags', name: 'Tag' },
	{ field: 'search', key: 'search', name: 'Search' },
] as const;

/**
 * Names the first filter stage that leaves the Tasks list empty: the section
 * tag (no row at all), then the status filter, then Due, Priority, Tag and
 * Search. Each stage keeps the filters of the stages before it.
 * @param rows - the unfiltered store rows (already limited by the section tag
 *   on the Rust side)
 * @param today - today as `YYYY-MM-DD`, for the due date options
 * @param now - the clock the edited options read, in ms
 */
export function explainEmptyTasks({
	rows,
	sectionTag,
	quick,
	today,
	now,
}: TaskRuleOptions & { rows: TaskRow[]; today: string; now: number }): EmptyTasksExplanation {
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

	// Checked without the Due filter: when the status filter alone empties
	// the list, lifting the Due filter would not fill it.
	const statusOnly: TaskQuickFilters = { show: quick.show, statuses: quick.statuses };
	if (applyQuickFilters(rows, statusOnly, today, now).length === 0) {
		const total = rows.length;
		return {
			message: isQuickFieldDefault(quick, 'status')
				? total === 1
					? 'The only task is closed'
					: `All ${total} tasks are closed`
				: 'No task has the chosen status',
			action: { kind: 'showAllStatuses', label: 'Show all' },
		};
	}

	const statusAndDue: TaskQuickFilters = { ...statusOnly, due: quick.due };
	if (!isQuickFieldDefault(quick, 'due') && applyQuickFilters(rows, statusAndDue, today, now).length === 0) {
		return {
			message: 'No task matches the Due filter',
			action: { kind: 'resetQuick', field: 'due', label: 'Reset Due filter' },
		};
	}

	let upTo: TaskQuickFilters = statusAndDue;
	for (const stage of META_STAGES) {
		upTo = { ...upTo, [stage.key]: quick[stage.key] };
		if (!isQuickFieldDefault(quick, stage.field) && applyQuickFilters(rows, upTo, today, now).length === 0) {
			return {
				message: `No task matches the ${stage.name} filter`,
				action: { kind: 'resetQuick', field: stage.key, label: `Reset ${stage.name} filter` },
			};
		}
	}

	// Unreachable from the view, which asks only when its list is empty.
	return { message: 'No tasks found' };
}
