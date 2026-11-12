import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { formatDateWithOffset } from '#lib/utils/date.js';
import { vaultRelativeKey } from '#lib/utils/path.js';
import { headingChains, matchesHeading } from './task-headings.logic';
import { TASK_STATUSES, isTaskOpen, statusGlyph } from './task-status.logic';
import type { TaskPriority, TaskStatus } from './task-metadata.types';
import { taskRowKey } from './tasks-keys.logic';
import { compareTaskPaths, noteFolder, noteTaskCounts, parseSectionTags, taskDisplayText } from './tasks.logic';
import type { TaskItem } from './tasks.types';

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
	/** Line of the nearest earlier kept task in the same note with a smaller indent */
	parentLine?: number;
	/** The note's document type (`NoteEntry.isA`), or null */
	noteType: string | null;
	/** The note's tags, without `#` */
	noteTags: string[];
	/** The note's archived flag */
	archived: boolean;
	/** The note's organized flag */
	organized: boolean;
	/** The note's favorite flag */
	favorite: boolean;
	/** The note's frontmatter: the snapshot's own object, never to be mutated */
	properties: NoteEntryV2['frontmatter'];
	/** The task's heading chain, outermost first (`headingChains`); [] before the first heading */
	headings: string[];
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

/** What the Tasks view itself last wrote to a task line, shown until the snapshot holds it. */
export interface TaskOverlayEntry {
	/** The line's task text after the write */
	text: string;
	/** The status the write set */
	status: TaskStatus;
	/** The index version the write produced (`UpdateResult.version`) */
	version: number;
}

/** The view's own writes, keyed by `taskRowKey(filePath, lineNumber)`. */
export type TaskOverlay = ReadonlyMap<string, TaskOverlayEntry>;

/**
 * Builds the Tasks view's rows from the entries snapshot: notes in
 * `compareTaskPaths` order of their path, tasks in document order.
 *
 * A task is kept when its heading chain (`headingChains`) matches one of
 * `sectionTags` (`matchesHeading`, `'tag'` mode); no tag keeps every task. An
 * overlay entry for a kept task replaces its text and status, and `checked`
 * and `open` follow the overlaid status. The note counts and `parentLine`
 * cover the note's kept tasks only. An entry with no kept task gives no row.
 *
 * `entries` is the shared snapshot (QueryJS reads the same objects): it, its
 * entries, their tasks and their frontmatter are never mutated or reordered.
 * `properties` is the entry's frontmatter object itself.
 * @param entries - the `get_all_vault_entries_v2` snapshot, `modifiedAt` in seconds
 * @param vaultPath - the open vault's path, for `relPath` and `folder`
 */
export function buildTaskRows(
	entries: readonly NoteEntryV2[],
	vaultPath: string | null,
	sectionTags: readonly string[],
	overlay: TaskOverlay,
): TaskRow[] {
	const notes = entries.filter((entry) => entry.tasks.length > 0).sort((a, b) => compareTaskPaths(a.path, b.path));
	const rows: TaskRow[] = [];
	for (const entry of notes) {
		const chains = headingChains(entry.taskHeadings);
		const kept: { task: TaskItem; headings: string[] }[] = [];
		for (const task of entry.tasks) {
			const headings = task.heading === undefined ? [] : (chains[task.heading] ?? []);
			if (!matchesHeading(headings, sectionTags, 'tag')) continue;
			const written = overlay.get(taskRowKey(entry.path, task.lineNumber));
			const status = written?.status ?? task.status;
			kept.push({
				task: {
					text: written?.text ?? task.text,
					checked: status !== 'todo',
					indent: task.indent,
					lineNumber: task.lineNumber,
					status,
					metadata: task.metadata,
				},
				headings,
			});
		}
		if (kept.length === 0) continue;
		const relPath = (vaultPath === null ? null : vaultRelativeKey(vaultPath, entry.path)) ?? entry.path;
		const folder = noteFolder(vaultPath, entry.path);
		const counts = noteTaskCounts(kept.map((k) => k.task));
		// The tasks above the current one with a smaller indent, nearest last.
		const ancestors: TaskItem[] = [];
		for (const { task, headings } of kept) {
			while (ancestors.length > 0 && ancestors[ancestors.length - 1].indent >= task.indent) ancestors.pop();
			const parent = ancestors[ancestors.length - 1];
			rows.push({
				...task,
				filePath: entry.path,
				relPath,
				folder,
				noteTitle: entry.title,
				open: isTaskOpen(task.status),
				modifiedAt: entry.modifiedAt * 1000,
				noteTaskCount: counts.total,
				noteOpenCount: counts.open,
				...(parent ? { parentLine: parent.lineNumber } : {}),
				noteType: entry.isA,
				noteTags: entry.tags,
				archived: entry.archived,
				organized: entry.organized,
				favorite: entry.favorite,
				properties: entry.frontmatter,
				headings,
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

/** What the Tasks list groups its rows by (the Display menu's Group by). */
export type TaskGroupKey = 'note' | 'folder' | 'due' | 'priority' | 'status';

/** The most rows a group renders before its `Show N more` button (PRD A9). */
export const GROUP_ROW_CAP = 50;

/**
 * The key a group's collapsed (or revealed) state is held under:
 * `<groupBy>:<group key>`, so the same raw key under two groupings stays
 * apart (`note:/vault/A.md`, `due:overdue`, `folder:` for the vault root).
 */
export function collapseKey(groupBy: TaskGroupKey, key: string): string {
	return `${groupBy}:${key}`;
}

/** A key the rows of a group other than Note are sorted by. */
export type TaskSortKey = 'due' | 'priority' | 'path';

/** The sort of a fresh Tasks view: due date, then priority, then path. */
export const DEFAULT_TASK_SORT: TaskSortKey[] = ['due', 'priority', 'path'];

/** A row of a group; `breadcrumb` is set only outside Note groups. */
export type GroupedRow = VisibleRow & {
	/** `taskDisplayText` of the row's immediate parent task, when that parent is among the grouped rows */
	breadcrumb?: string;
};

/** One group of the Tasks list */
export interface TaskGroup {
	/** The group's raw key: the note path, the folder, or the due, priority or status key */
	key: string;
	/** The header text */
	label: string;
	/** The group's rows: document order with dimmed parents in a Note group, sorted and flat otherwise */
	rows: GroupedRow[];
	/** The rows that are not dimmed */
	count: number;
	/** Note groups only: absolute note path */
	filePath?: string;
	/** Note groups only: vault-relative folder, '' at the root */
	folder?: string;
	/** Note groups only: the note's last-modified time in ms */
	modifiedAt?: number;
	/** Note groups only: the note's tasks, before any filter */
	total?: number;
	/** Note groups only: the note's open tasks, before any filter */
	open?: number;
}

/** The Due grouping's buckets, in display order. */
const DUE_GROUPS = [
	{ key: 'overdue', label: 'Overdue' },
	{ key: 'today', label: 'Today' },
	{ key: 'tomorrow', label: 'Tomorrow' },
	{ key: 'week', label: 'This week' },
	{ key: 'later', label: 'Later' },
	{ key: 'none', label: 'No date' },
] as const;

/** The Priority grouping's labels; `TASK_PRIORITIES` gives the order. */
const PRIORITY_LABELS: Record<TaskPriority, string> = {
	highest: 'Highest',
	high: 'High',
	medium: 'Medium',
	none: 'No priority',
	low: 'Low',
	lowest: 'Lowest',
};

/** A row's priority, `none` when it has no priority signifier. */
const priorityOf = (row: TaskRow): TaskPriority => row.metadata.priority ?? 'none';

/** Rank of each priority in `TASK_PRIORITIES` order. */
const PRIORITY_RANK = new Map(TASK_PRIORITIES.map((p, i) => [p, i]));

/** Orders due dates ascending, an absent or empty one last. */
function compareDue(a: string | undefined, b: string | undefined): number {
	const x = a || '';
	const y = b || '';
	if (x === y) return 0;
	if (x === '') return 1;
	if (y === '') return -1;
	return x < y ? -1 : 1;
}

const SORT_COMPARE: Record<TaskSortKey, (a: TaskRow, b: TaskRow) => number> = {
	due: (a, b) => compareDue(a.metadata.dueDate, b.metadata.dueDate),
	priority: (a, b) => PRIORITY_RANK.get(priorityOf(a))! - PRIORITY_RANK.get(priorityOf(b))!,
	path: (a, b) => compareTaskPaths(a.relPath, b.relPath),
};

/** Compares rows by each `sort` key in turn, then by `relPath` and `lineNumber`, so ties always resolve. */
function compareRows(sort: TaskSortKey[]): (a: TaskRow, b: TaskRow) => number {
	return (a, b) => {
		for (const key of sort) {
			const c = SORT_COMPARE[key](a, b);
			if (c !== 0) return c;
		}
		return compareTaskPaths(a.relPath, b.relPath) || a.lineNumber - b.lineNumber;
	};
}

/** One group per note, in the incoming order; rows keep document order and dimmed parents. */
function noteGroups(rows: VisibleRow[]): TaskGroup[] {
	const notes = new Map<string, TaskGroup>();
	for (const row of rows) {
		let note = notes.get(row.filePath);
		if (!note) {
			note = {
				key: row.filePath,
				label: row.noteTitle,
				rows: [],
				count: 0,
				filePath: row.filePath,
				folder: row.folder,
				modifiedAt: row.modifiedAt,
				total: row.noteTaskCount,
				open: row.noteOpenCount,
			};
			notes.set(row.filePath, note);
		}
		note.rows.push(row);
		if (!row.dimmed) note.count++;
	}
	return [...notes.values()];
}

/** How a flat grouping keys, orders and labels its groups. */
interface FlatGrouping {
	keyOf: (row: TaskRow) => string;
	/** The present keys in display order */
	order: (keys: string[]) => string[];
	label: (key: string) => string;
}

/** Keeps the entries of a fixed key order that are present. */
const fixedOrder = (all: readonly string[]) => (keys: string[]) => all.filter((k) => keys.includes(k));

function flatGrouping(groupBy: Exclude<TaskGroupKey, 'note'>, today: string): FlatGrouping {
	switch (groupBy) {
		case 'folder':
			return {
				keyOf: (row) => row.folder,
				order: (keys) => [...keys].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : compareTaskPaths(a, b))),
				label: (key) => key || 'Vault root',
			};
		case 'due': {
			const tomorrow = formatDateWithOffset(today, 'YYYY-MM-DD', 'YYYY-MM-DD', 1);
			const weekEnd = formatDateWithOffset(today, 'YYYY-MM-DD', 'YYYY-MM-DD', 7);
			return {
				keyOf: (row) => {
					const due = row.metadata.dueDate;
					if (!due) return 'none';
					if (due < today) return 'overdue';
					if (due === today) return 'today';
					if (due <= tomorrow) return 'tomorrow';
					if (due <= weekEnd) return 'week';
					return 'later';
				},
				order: fixedOrder(DUE_GROUPS.map((g) => g.key)),
				label: (key) => DUE_GROUPS.find((g) => g.key === key)!.label,
			};
		}
		case 'priority':
			return {
				keyOf: priorityOf,
				order: fixedOrder(TASK_PRIORITIES),
				label: (key) => PRIORITY_LABELS[key as TaskPriority],
			};
		case 'status':
			return {
				keyOf: (row) => row.status,
				order: fixedOrder(TASK_STATUSES),
				label: (key) => {
					const word = statusGlyph(key as TaskStatus).word;
					return word.charAt(0).toUpperCase() + word.slice(1);
				},
			};
	}
}

/**
 * Groups the visible rows for the Tasks list, leaving out empty groups.
 * Note groups keep the incoming order (path order), document order and the
 * dimmed parents, and read `total` and `open` from their first row. Every
 * other grouping drops dimmed rows, sorts the rest by `sort` (then path and
 * line) and gives a row whose parent task is among `rows` (dimmed included)
 * that parent's `taskDisplayText` as `breadcrumb`.
 * @param today - today as `YYYY-MM-DD`, for the due buckets
 */
export function groupTaskRows(rows: VisibleRow[], groupBy: TaskGroupKey, sort: TaskSortKey[], today: string): TaskGroup[] {
	if (groupBy === 'note') return noteGroups(rows);
	const byKey = new Map(rows.map((row) => [taskRowKey(row.filePath, row.lineNumber), row]));
	const flat: GroupedRow[] = [];
	for (const row of rows) {
		if (row.dimmed) continue;
		const parent = row.parentLine === undefined ? undefined : byKey.get(taskRowKey(row.filePath, row.parentLine));
		flat.push(parent ? { ...row, breadcrumb: taskDisplayText(parent) } : row);
	}
	flat.sort(compareRows(sort));
	const grouping = flatGrouping(groupBy, today);
	const buckets = new Map<string, GroupedRow[]>();
	for (const row of flat) {
		const key = grouping.keyOf(row);
		const bucket = buckets.get(key);
		if (bucket) bucket.push(row);
		else buckets.set(key, [row]);
	}
	return grouping.order([...buckets.keys()]).map((key) => {
		const bucketRows = buckets.get(key)!;
		return { key, label: grouping.label(key), rows: bucketRows, count: bucketRows.length };
	});
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
 *   in `buildTaskRows`)
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
