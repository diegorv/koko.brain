import { formatDate } from '#lib/utils/date.js';
import { vaultRelativeKey } from '#lib/utils/path.js';
import { isSafeUrl } from '#lib/utils/sanitize-url.js';
import { isTaskOpen } from './task-status.logic';
import type { TaskMetadata } from './task-metadata.types';
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
 * Checks whether a task at the given index has any open descendants
 * (`isTaskOpen`). Descendants are consecutive tasks with indent greater than
 * the parent's indent.
 */
function hasOpenDescendants(tasks: TaskItem[], parentIdx: number): boolean {
	const parentIndent = tasks[parentIdx].indent;

	for (let j = parentIdx + 1; j < tasks.length; j++) {
		if (tasks[j].indent <= parentIndent) break;
		if (isTaskOpen(tasks[j].status)) return true;
	}

	return false;
}

/**
 * Filters closed tasks (done and cancelled, see `isTaskOpen`) while
 * preserving hierarchy. A closed parent is kept if it has any open
 * descendants. A closed task with no open descendants is removed.
 * Open tasks are always kept.
 */
export function filterCompletedTasks(tasks: TaskItem[]): TaskItem[] {
	const result: TaskItem[] = [];

	for (let i = 0; i < tasks.length; i++) {
		const task = tasks[i];

		if (isTaskOpen(task.status)) {
			result.push(task);
			continue;
		}

		// Closed task: keep only if it has open descendants
		if (hasOpenDescendants(tasks, i)) {
			result.push(task);
		}
	}

	return result;
}

/**
 * Filters out closed tasks from groups, preserving parent-child hierarchy.
 * A closed parent task is kept visible if it has any open children.
 * Only hides a family (parent + children) when all are closed.
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

/**
 * Computes summary statistics from an array of FileTaskGroups: `completed`
 * counts closed tasks (done and cancelled), `pending` the open ones.
 */
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
			if (!isTaskOpen(task.status)) completed++;
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
	/** Whether closed tasks (done and cancelled) are hidden */
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

/** The section tag the Tasks view uses when no usable one was saved */
const DEFAULT_SECTION_TAG = '#to-list';

/** Whether `value` is a JSON object: not `null`, not an array, not a primitive. */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads the Tasks view's saved state (`settings.json` `tasksView`, unvalidated).
 * Valid: absent, or an object whose `sectionTag` is absent or a string; `version`
 * is not checked, so a newer build's value still loads. A saved text holding no
 * tag (`''`, spaces, commas) gives `#to-list`, as does an invalid value; any
 * other text comes back as typed, untrimmed.
 */
export function parseTasksView(raw: unknown): { sectionTag: string; valid: boolean } {
	if (raw === undefined) return { sectionTag: DEFAULT_SECTION_TAG, valid: true };
	if (!isPlainObject(raw)) return { sectionTag: DEFAULT_SECTION_TAG, valid: false };
	const { sectionTag } = raw;
	if (sectionTag === undefined) return { sectionTag: DEFAULT_SECTION_TAG, valid: true };
	if (typeof sectionTag !== 'string') return { sectionTag: DEFAULT_SECTION_TAG, valid: false };
	return { sectionTag: parseSectionTags(sectionTag).length > 0 ? sectionTag : DEFAULT_SECTION_TAG, valid: true };
}

/**
 * Returns the Tasks view's saved state with `sectionTag` set to `sectionTag`, as
 * typed. Every other key of an object `raw` is kept, so later fields saved under
 * the same key survive; a numeric `version` is kept, otherwise `1` is written. A
 * non-object `raw` is replaced wholesale. `raw` is never mutated.
 */
export function withSectionTag(raw: unknown, sectionTag: string): Record<string, unknown> {
	const base = isPlainObject(raw) ? raw : {};
	return { ...base, version: typeof base.version === 'number' ? base.version : 1, sectionTag };
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
	let closed = 0;
	for (const group of groups) {
		for (const task of group.tasks) {
			total++;
			if (!isTaskOpen(task.status)) closed++;
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

	// `filterCompleted` keeps every open task, so only an all-closed set
	// empties the list here.
	if (hideCompleted && closed === total) {
		return {
			message: total === 1 ? 'The only task is closed' : `All ${total} tasks are closed`,
			action: { kind: 'showCompleted', label: 'Show closed' },
		};
	}

	// The view filters by date before it hides closed tasks, so with
	// hide-closed on the list can be empty while open tasks sit in old notes.
	if (dateFilter !== 'all') {
		const days = dateFilterDays(dateFilter);
		return {
			message: hideCompleted
				? `No open task is in a note edited in the last ${days} days`
				: `No note with tasks was edited in the last ${days} days`,
			action: { kind: 'allTime', label: 'All time' },
		};
	}

	// Unreachable from the view: past the first two stages an open task
	// remains (or hide-closed is off), and with no date filter it is listed.
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

/** A trailing block id, `^abc` (the class `todoist-sync` uses for its own). */
const TRAILING_BLOCK_ID_RE = /(?:^|\s)\^[\w-]+$/;
/** A trailing Todoist anchor, `🆔 td-123`, with or without the emoji's variation selector. */
const TRAILING_TODOIST_ANCHOR_RE = /(?:^|\s)🆔\u{FE0F}?\s*td-\S+$/u;

/**
 * Removes a trailing block id, then a trailing Todoist anchor, from task text.
 * The order follows a synced line, which ends in `🆔 td-x ^abc`. The leading
 * trim drops the `\r` a CRLF note leaves: task lines are split on `\n` only.
 * Local regexes keep `tasks` off `todoist-sync`'s anchor logic.
 */
export function stripTaskTrailers(text: string): string {
	return text.trimEnd().replace(TRAILING_BLOCK_ID_RE, '').replace(TRAILING_TODOIST_ANCHOR_RE, '').trim();
}

/** A `#` right after a non-space character, as in `[[Book#Chapter]]` or `a.md#sec`. */
const INLINE_HASH_RE = /\S#[A-Za-z0-9_]/;

/**
 * Whether the row shows its raw text instead of Rust's description. Rust's
 * tag regex strips a `#word` anywhere, so a link heading or URL anchor would
 * lose its tail and leave a false tag; a real tag starts after whitespace or
 * at the line start, so it never trips the test. A description left empty (a
 * tag-only task such as `#todo`) also falls back to the raw text.
 */
export function usesRawTaskText(task: Pick<TaskItem, 'text' | 'metadata'>): boolean {
	return INLINE_HASH_RE.test(task.text) || stripTaskTrailers(task.metadata.description) === '';
}

/**
 * The text a task row shows: Rust's description (dates, priority, recurrence,
 * ids and tags removed) without its trailing block id, or the raw text without
 * its trailers when `usesRawTaskText` says so.
 */
export function taskDisplayText(task: Pick<TaskItem, 'text' | 'metadata'>): string {
	return stripTaskTrailers(usesRawTaskText(task) ? task.text : task.metadata.description);
}

/** One metadata chip after a task row's text */
export interface TaskChip {
	/** Which metadata field the chip shows */
	kind: 'due' | 'scheduled' | 'start' | 'priority' | 'recurrence' | 'tag';
	/** Visible text, e.g. `Nov 3`, `high`, `#work` */
	label: string;
	/** Hover text, when the label needs one */
	title?: string;
	/** Set on a due chip of an open task whose due date is before today */
	overdue?: boolean;
}

/** `Nov 3`, or `Nov 3, 2027` when the year differs from `today`'s. Both are `YYYY-MM-DD`. */
function chipDate(date: string, today: string): string {
	return formatDate(date, date.slice(0, 4) === today.slice(0, 4) ? 'MMM D' : 'MMM D, YYYY');
}

/** A block id the Rust recurrence regex swallows when it follows the rule. */
const RECURRENCE_BLOCK_ID_RE = /\s\^[\w-]+$/;

/**
 * The chips a task row shows after its text, in this order: due, scheduled,
 * start, priority, recurrence, then one per tag. Each appears only when its
 * field is set; a `none` priority shows none.
 * @param today - `YYYY-MM-DD`; a due date before it (string order) is overdue
 * @param options.tags - false on the raw-text path, where the tags show inline
 *   and the Rust list may hold false tags taken from links
 * @param options.open - only an open task is ever overdue
 */
export function taskChips(
	metadata: TaskMetadata,
	today: string,
	options: { tags: boolean; open: boolean },
): TaskChip[] {
	const chips: TaskChip[] = [];
	const { dueDate, scheduledDate, startDate, priority, recurrence } = metadata;
	if (dueDate) {
		const label = chipDate(dueDate, today);
		chips.push(
			options.open && dueDate < today
				? { kind: 'due', label, title: `Overdue, due ${dueDate}`, overdue: true }
				: { kind: 'due', label, title: `Due ${dueDate}` },
		);
	}
	if (scheduledDate) chips.push({ kind: 'scheduled', label: `Scheduled ${chipDate(scheduledDate, today)}` });
	if (startDate) chips.push({ kind: 'start', label: `Starts ${chipDate(startDate, today)}` });
	if (priority && priority !== 'none') chips.push({ kind: 'priority', label: priority });
	if (recurrence) chips.push({ kind: 'recurrence', label: recurrence.text.replace(RECURRENCE_BLOCK_ID_RE, '') });
	if (options.tags) {
		for (const tag of metadata.tags) chips.push({ kind: 'tag', label: `#${tag}` });
	}
	return chips;
}

/** Built once: constructing a collator per comparison is what `localeCompare` with options costs. */
const PATH_COLLATOR = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * Orders two note paths for the Tasks list: numbers compare as numbers
 * (`note 9` before `note 10`) and case and accents are ignored, with raw
 * code-unit order breaking ties. Without the tie-break, `A.md`/`a.md` or
 * `resume.md`/`résumé.md` compare equal, a stable sort keeps the incoming
 * order, and the two swap whenever that order changes. Paths are absolute,
 * but every indexed note shares the vault root, so this is the
 * vault-relative order.
 */
export function compareTaskPaths(a: string, b: string): number {
	return PATH_COLLATOR.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0);
}

/**
 * The vault-relative folder of a note, e.g. `Projects/Clients` for
 * `Projects/Clients/ACME.md`. Empty for a note at the vault root, a path
 * outside the vault and when no vault is open.
 */
export function noteFolder(vaultPath: string | null, filePath: string): string {
	if (vaultPath === null) return '';
	const key = vaultRelativeKey(vaultPath, filePath);
	if (key === null) return '';
	const slash = key.lastIndexOf('/');
	return slash === -1 ? '' : key.slice(0, slash);
}

/** A note's open tasks (`isTaskOpen`) and all its tasks. */
export function noteTaskCounts(tasks: TaskItem[]): { open: number; total: number } {
	let open = 0;
	for (const task of tasks) {
		if (isTaskOpen(task.status)) open++;
	}
	return { open, total: tasks.length };
}
