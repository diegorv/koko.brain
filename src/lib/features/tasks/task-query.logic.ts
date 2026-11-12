import type { NoteEntryV2 } from '#lib/types/vault-v2.types.js';
import { formatDateWithOffset } from '#lib/utils/date.js';
import { vaultRelativeKey } from '#lib/utils/path.js';
import { findInlineTags } from '#lib/utils/tag-extraction.js';
import { isInboxEntry } from '#lib/features/type-definitions/inbox-workflow.logic.js';
import { headingChains, matchesHeading, type HeadingMatchMode } from './task-headings.logic';
import { TASK_STATUSES, isTaskOpen, statusGlyph } from './task-status.logic';
import type { TaskMetadata, TaskPriority, TaskStatus } from './task-metadata.types';
import { taskRowKey } from './tasks-keys.logic';
import { compareTaskPaths, noteFolder, noteTaskCounts, taskDisplayText } from './tasks.logic';
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
	/** The note's tasks the sources and excludes keep (`selectSourceRows`), counted before any quick filter */
	noteTaskCount: number;
	/** The note's open tasks the sources and excludes keep (`selectSourceRows`), counted before any quick filter */
	noteOpenCount: number;
	/** Line of the nearest earlier task in the same note with a smaller indent, whether or not the sources keep it */
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
	/** Whether the note is in the lifecycle inbox (`isInboxEntry`) */
	inbox: boolean;
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
	/** The line's metadata as Rust re-parsed it after a text write; absent when the snapshot's still holds */
	metadata?: TaskMetadata;
}

/** The view's own writes, keyed by `taskRowKey(filePath, lineNumber)`. */
export type TaskOverlay = ReadonlyMap<string, TaskOverlayEntry>;

/**
 * Builds the Tasks view's rows from the entries snapshot: every task, notes
 * in `compareTaskPaths` order of their path, tasks in document order, each
 * with its heading chain (`headingChains`). The sources and excludes run
 * later, in `selectSourceRows`, which also recounts the note counts.
 *
 * An overlay entry for a task replaces its text and status, and its
 * metadata when the entry carries one; `checked` and `open` follow the
 * overlaid status. The note counts and `parentLine`
 * cover every task of the note. An entry with no task gives no row.
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
	overlay: TaskOverlay,
): TaskRow[] {
	const notes = entries.filter((entry) => entry.tasks.length > 0).sort((a, b) => compareTaskPaths(a.path, b.path));
	const rows: TaskRow[] = [];
	for (const entry of notes) {
		const chains = headingChains(entry.taskHeadings);
		const kept: { task: TaskItem; headings: string[] }[] = [];
		for (const task of entry.tasks) {
			const headings = task.heading === undefined ? [] : (chains[task.heading] ?? []);
			const written = overlay.get(taskRowKey(entry.path, task.lineNumber));
			const status = written?.status ?? task.status;
			kept.push({
				task: {
					text: written?.text ?? task.text,
					checked: status !== 'todo',
					indent: task.indent,
					lineNumber: task.lineNumber,
					status,
					metadata: written?.metadata ?? task.metadata,
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
				inbox: isInboxEntry(entry),
				properties: entry.frontmatter,
				headings,
			});
			ancestors.push(task);
		}
	}
	return rows;
}

/** A lifecycle clause's state (see `TaskSourceClause`). */
export type LifecycleState = 'inbox' | 'organized' | 'favorite' | 'archived';

/** How a property clause compares the note's frontmatter value (see `TaskSourceClause`). */
export type PropertyOp = 'is' | 'isNot' | 'contains' | 'exists';

/**
 * One condition of a source card. `negate` flips a folder, type or note tag
 * clause. A clause whose value is empty after trimming is inactive: it
 * matches every row and its `negate` is ignored. A property clause is
 * inactive when its key is blank, or its `value` is blank for any op but
 * `exists`.
 */
export type TaskSourceClause =
	/** The note is in `path` (vault-relative, outer `/` trimmed) or a folder under it; case-sensitive */
	| { kind: 'folder'; path: string; negate?: boolean }
	/** The note's type equals `type`, ignoring case; a note with no type never does */
	| { kind: 'type'; type: string; negate?: boolean }
	/** A note tag equals `tag` or is nested under it, ignoring case and a leading `#` */
	| { kind: 'noteTag'; tag: string; negate?: boolean }
	/** The task's heading chain matches `text` (`matchesHeading`) */
	| { kind: 'heading'; text: string; match: HeadingMatchMode }
	/**
	 * The note's frontmatter value under `key` (trimmed, then case-sensitive:
	 * the keys are alias-resolved at parse time) against `value` (trimmed).
	 * Strings, numbers and booleans compare as `String(value)`, ignoring case;
	 * an object never matches `is` or `contains`. `is`: equals a scalar, or an
	 * element of a list. `isNot`: not `is`, so a note without the key passes.
	 * `contains`: a substring of a scalar or of a list element. `exists`: the
	 * key is present and its value is not `null`, `''` or `[]`; `value` is ignored.
	 */
	| { kind: 'property'; key: string; op: PropertyOp; value?: string }
	/**
	 * The note's lifecycle: `inbox` reads `TaskRow.inbox`, the other states
	 * the flag of that name. Never inactive, and has no `negate`. A card
	 * holding an `archived` one lifts the archived exclude for the rows it
	 * matches (`selectSourceRows`).
	 */
	| { kind: 'lifecycle'; state: LifecycleState };

/** A source card: its clauses are ANDed; the cards of a query are ORed. */
export interface TaskSource {
	/** The card's conditions; none matches every row */
	clauses: TaskSourceClause[];
}

/** What the Tasks view never lists, whatever the sources say. */
export interface TaskExcludes {
	/** Drops the tasks of archived notes */
	archived: boolean;
	/** Drops the tasks of type definitions (`noteType === 'Type'`) */
	typeDefinitions: boolean;
	/** Drops the tasks under the templates folder setting */
	templatesFolder: boolean;
	/** Drops the tasks under the system folder setting */
	systemFolder: boolean;
	/** Vault-relative folders to drop, each with the folders under it */
	folders: string[];
	/** Vault-relative note paths to drop, compared exactly */
	notes: string[];
	/** Note tags to drop, with their nested tags */
	tags: string[];
	/** Note types to drop, ignoring case */
	types: string[];
}

/** Everything that decides which tasks the Tasks view lists, but the grouping and sort. */
export interface TaskQuery {
	/** Shape version */
	version: 1;
	/** The source cards; none lists every note */
	sources: TaskSource[];
	/** The excludes, which win over the sources */
	exclude: TaskExcludes;
	/** The quick filters */
	quick: TaskQuickFilters;
}

/** The template and system folder settings the excludes read, vault-relative; '' excludes nothing. */
export interface TaskSourceFolders {
	/** `settings.templates.folder` */
	templates: string;
	/** `settings.templates.systemFolder` */
	system: string;
}

/** The excludes of a fresh Tasks view: the four switches on, no listed value. */
export function defaultTaskExcludes(): TaskExcludes {
	return {
		archived: true,
		typeDefinitions: true,
		templatesFolder: true,
		systemFolder: true,
		folders: [],
		notes: [],
		tags: [],
		types: [],
	};
}

/** One card per tag, each holding a heading clause in tag mode; `[]` for no tag. */
export function headingSources(tags: readonly string[]): TaskSource[] {
	return tags.map((text) => ({ clauses: [{ kind: 'heading', text, match: 'tag' }] }));
}

/**
 * What `tasksView.sectionTag` keeps of `sources` until saved views: the
 * trimmed texts of the cards holding exactly one heading clause in tag mode,
 * space-joined ('' for none). Null while one of those cards has no tag yet
 * (empty, or `#` alone), so an emptied card is not saved until it holds text.
 */
export function tagHeadingCardText(sources: readonly TaskSource[]): string | null {
	const texts: string[] = [];
	for (const { clauses } of sources) {
		const [only] = clauses;
		if (clauses.length !== 1 || only.kind !== 'heading' || only.match !== 'tag') continue;
		if (!headingValue(only.text, 'tag')) return null;
		texts.push(only.text.trim());
	}
	return texts.join(' ');
}

/** The query of a fresh Tasks view: the `#to-list` card, the default excludes and `DEFAULT_QUICK`. */
export function defaultTaskQuery(): TaskQuery {
	return { version: 1, sources: headingSources(['#to-list']), exclude: defaultTaskExcludes(), quick: { ...DEFAULT_QUICK } };
}

/** A vault-relative folder with its outer `/` and spaces trimmed; '' when nothing is left. */
const folderValue = (path: string) => path.trim().replace(/^\/+|\/+$/g, '');

/**
 * The query that keeps only `folder`'s tasks (a Folder group's "Only this
 * folder"): one card holding the folder clause when there is no card, else
 * the clause added to every card (AND), so no card lists tasks past the
 * folder. A card already holding that folder clause, not negated, is kept
 * as it is. `query` itself when `folder` is '' (the vault root). Never mutates `query`.
 */
export function onlyThisFolder(query: TaskQuery, folder: string): TaskQuery {
	const path = folderValue(folder);
	if (!path) return query;
	const clause: TaskSourceClause = { kind: 'folder', path };
	if (query.sources.length === 0) return { ...query, sources: [{ clauses: [clause] }] };
	const holds = (card: TaskSource) => card.clauses.some((c) => c.kind === 'folder' && !c.negate && folderValue(c.path) === path);
	return { ...query, sources: query.sources.map((card) => (holds(card) ? card : { clauses: [...card.clauses, clause] })) };
}

/**
 * The query with `folder` added to the excluded folders (a Folder group's
 * "Hide this folder"). `query` itself when `folder` is '' (the vault root) or
 * already excluded, compared with outer `/` trimmed. Never mutates `query`.
 */
export function hideFolder(query: TaskQuery, folder: string): TaskQuery {
	const path = folderValue(folder);
	const { folders } = query.exclude;
	if (!path || folders.some((f) => folderValue(f) === path)) return query;
	return { ...query, exclude: { ...query.exclude, folders: [...folders, path] } };
}

/**
 * The query with the vault-relative `relPath` added to the excluded notes (a
 * Note group's "Hide this note"). `query` itself when it is already excluded.
 * Never mutates `query`.
 */
export function hideNote(query: TaskQuery, relPath: string): TaskQuery {
	const { notes } = query.exclude;
	if (notes.includes(relPath)) return query;
	return { ...query, exclude: { ...query.exclude, notes: [...notes, relPath] } };
}

/** A tag lower-cased, trimmed and without its leading `#`; '' when nothing is left. */
const tagValue = (tag: string) => tag.trim().replace(/^#/, '').toLowerCase();

/** `text` of a heading clause as `matchesHeading` reads it: trimmed, no leading `#`, and in tag mode no trailing `/`. */
function headingValue(text: string, match: HeadingMatchMode): string {
	const name = text.trim().replace(/^#/, '');
	return match === 'tag' ? name.replace(/\/+$/, '') : name;
}

/** Whether a row's folder is `folder` (normalized, non-empty) or under it. */
const inFolder = (rowFolder: string, folder: string) => rowFolder === folder || rowFolder.startsWith(`${folder}/`);

/** Whether a note tag list holds `tag` (normalized, non-empty) or a tag nested under it. */
const hasNoteTag = (noteTags: readonly string[], tag: string) => noteTags.some((t) => matchesNestedTag(tag, t.replace(/^#/, '')));

type RowTest = (row: TaskRow) => boolean;

/** A clause as a row test, or null when it is inactive. Values are normalized here, once per call. */
function clauseTest(clause: TaskSourceClause): RowTest | null {
	let test: RowTest;
	switch (clause.kind) {
		case 'folder': {
			const folder = folderValue(clause.path);
			if (!folder) return null;
			test = (row) => inFolder(row.folder, folder);
			break;
		}
		case 'type': {
			const type = clause.type.trim().toLowerCase();
			if (!type) return null;
			test = (row) => row.noteType?.toLowerCase() === type;
			break;
		}
		case 'noteTag': {
			const tag = tagValue(clause.tag);
			if (!tag) return null;
			test = (row) => hasNoteTag(row.noteTags, tag);
			break;
		}
		case 'heading': {
			const text = headingValue(clause.text, clause.match);
			if (!text) return null;
			const tags = [text];
			return (row) => matchesHeading(row.headings, tags, clause.match);
		}
		case 'property':
			return propertyTest(clause.key, clause.op, clause.value);
		case 'lifecycle': {
			const { state } = clause;
			return (row) => row[state];
		}
	}
	return clause.negate ? (row) => !test(row) : test;
}

/** A frontmatter value's scalars as `String(value)`, lower-cased: the value itself, or each list element; objects and `null` give none. */
function propertyScalars(value: unknown): string[] {
	return (Array.isArray(value) ? value : [value]).flatMap((v) =>
		typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? [String(v).toLowerCase()] : [],
	);
}

/** A property clause as a row test, or null when it is inactive (see `TaskSourceClause`). */
function propertyTest(rawKey: string, op: PropertyOp, rawValue: string | undefined): RowTest | null {
	const key = rawKey.trim();
	const value = (rawValue ?? '').trim().toLowerCase();
	if (!key || (op !== 'exists' && !value)) return null;
	// An own key only: `constructor` must not read Object.prototype's.
	const read = (row: TaskRow): unknown => (Object.hasOwn(row.properties, key) ? row.properties[key] : undefined);
	switch (op) {
		case 'exists':
			return (row) => {
				const v = read(row);
				return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
			};
		case 'is':
			return (row) => propertyScalars(read(row)).includes(value);
		case 'isNot':
			return (row) => !propertyScalars(read(row)).includes(value);
		case 'contains':
			return (row) => propertyScalars(read(row)).some((s) => s.includes(value));
	}
}

/** Whether `source` holds a lifecycle `archived` clause, which lifts the archived exclude for the rows it matches. */
function liftsArchived(source: TaskSource): boolean {
	return source.clauses.some((c) => c.kind === 'lifecycle' && c.state === 'archived');
}

/**
 * The excludes but the archived switch as one row test, or null when none is
 * active: `selectSourceRows` applies the archived switch per card. Values are
 * normalized here, once per call.
 */
function excludeTest(exclude: TaskExcludes, folders: TaskSourceFolders): RowTest | null {
	const tests: RowTest[] = [];
	// The rule of `isTypeDefinition` (features/type-definitions/type-definitions.logic.ts),
	// inlined: it reads an entry's `isA`, and a row carries it as `noteType`.
	if (exclude.typeDefinitions) tests.push((row) => row.noteType === 'Type');
	const dropFolders = [
		...(exclude.templatesFolder ? [folders.templates] : []),
		...(exclude.systemFolder ? [folders.system] : []),
		...exclude.folders,
	]
		.map(folderValue)
		.filter(Boolean);
	if (dropFolders.length > 0) tests.push((row) => dropFolders.some((f) => inFolder(row.folder, f)));
	const notes = new Set(exclude.notes.filter((n) => n.trim()));
	if (notes.size > 0) tests.push((row) => notes.has(row.relPath));
	const tags = exclude.tags.map(tagValue).filter(Boolean);
	if (tags.length > 0) tests.push((row) => tags.some((tag) => hasNoteTag(row.noteTags, tag)));
	const types = new Set(exclude.types.map((t) => t.trim().toLowerCase()).filter(Boolean));
	if (types.size > 0) tests.push((row) => row.noteType !== null && types.has(row.noteType.toLowerCase()));
	return tests.length > 0 ? (row) => tests.some((test) => test(row)) : null;
}

/**
 * The rows the sources and excludes keep: a row passes when no exclude
 * matches it and `sources` is empty or some card has every clause matching
 * (see `TaskSourceClause`). The heading clause reads the task's own heading
 * chain; the others read note fields every row of a note shares.
 *
 * A card holding a lifecycle `archived` clause lifts the archived exclude for
 * the rows it matches; every other exclude still wins, and a row matched only
 * by other cards still loses to the archived exclude.
 *
 * Each kept row is a new object whose `noteTaskCount` and `noteOpenCount`
 * count the kept rows of its note. A source that drops a parent task keeps
 * its child with no dimmed parent above it (`applyQuickFilters` dims only
 * rows it is given). `rows` is never mutated.
 * @param folders - the template and system folder settings the two folder switches read
 */
export function selectSourceRows(
	rows: readonly TaskRow[],
	sources: readonly TaskSource[],
	exclude: TaskExcludes,
	folders: TaskSourceFolders,
): TaskRow[] {
	const excluded = excludeTest(exclude, folders);
	const cards = sources.map((source) => ({
		tests: source.clauses.map(clauseTest).filter((t): t is RowTest => t !== null),
		keepsArchived: liftsArchived(source),
	}));
	const passes = (row: TaskRow) => {
		if (excluded?.(row)) return false;
		const dropArchived = exclude.archived && row.archived;
		if (cards.length === 0) return !dropArchived;
		return cards.some((card) => (!dropArchived || card.keepsArchived) && card.tests.every((test) => test(row)));
	};
	const kept = rows.filter(passes);
	const counts = new Map<string, { total: number; open: number }>();
	for (const row of kept) {
		const c = counts.get(row.filePath) ?? { total: 0, open: 0 };
		c.total++;
		if (row.open) c.open++;
		counts.set(row.filePath, c);
	}
	return kept.map((row) => {
		const c = counts.get(row.filePath)!;
		return { ...row, noteTaskCount: c.total, noteOpenCount: c.open };
	});
}

/** What the Sources panel's value pickers offer, each list sorted case-insensitively. */
export interface SourceSuggestions {
	/** Every row's folder and each of its parent folders, without '' */
	folders: string[];
	/** The note tags, as the rows hold them (no `#`) */
	tags: string[];
	/** The note types, without null */
	types: string[];
	/**
	 * The inline tags in the rows' heading chains, as `#tag`: the heading
	 * clause matches a tag in both modes, never a heading's whole text
	 */
	headingTags: string[];
	/** The frontmatter keys, de-duplicated by exact spelling: the property clause matches its key case included */
	keys: string[];
	/** Under each exact frontmatter key, its scalar values and list elements as `String(value)`; a key with none has no entry */
	values: ReadonlyMap<string, string[]>;
}

/**
 * Collects strings de-duplicated case-insensitively (the first spelling wins),
 * or by exact string when `exact`; blank ones are skipped.
 */
function stringSet(exact = false) {
	const seen = new Map<string, string>();
	return {
		add(value: string) {
			const key = exact ? value : value.toLowerCase();
			if (value.trim() && !seen.has(key)) seen.set(key, value);
		},
		sorted: () => [...seen.values()].sort(byLowerCase),
	};
}

/**
 * The Sources panel's suggestions from `rows` (`tasksStore.rows`: every note
 * with tasks, before the sources and excludes), each list but the keys
 * de-duplicated case-insensitively, the first spelling winning, and sorted. Objects and
 * `null` give no property value.
 */
export function sourceSuggestions(rows: readonly TaskRow[]): SourceSuggestions {
	const folders = stringSet();
	const tags = stringSet();
	const types = stringSet();
	const headingTags = stringSet();
	const keys = stringSet(true);
	const values = new Map<string, ReturnType<typeof stringSet>>();
	const notes = new Set<string>();
	for (const row of rows) {
		for (const heading of row.headings) for (const { tag } of findInlineTags(heading)) headingTags.add(`#${tag}`);
		// The other fields are the note's, the same on each of its rows.
		if (notes.has(row.filePath)) continue;
		notes.add(row.filePath);
		const parts = row.folder.split('/');
		for (let i = 1; i <= parts.length; i++) folders.add(parts.slice(0, i).join('/'));
		for (const tag of row.noteTags) tags.add(tag);
		if (row.noteType !== null) types.add(row.noteType);
		for (const [key, value] of Object.entries(row.properties)) {
			keys.add(key);
			for (const v of Array.isArray(value) ? value : [value]) {
				if (typeof v !== 'string' && typeof v !== 'number' && typeof v !== 'boolean') continue;
				let set = values.get(key);
				if (!set) values.set(key, (set = stringSet()));
				set.add(String(v));
			}
		}
	}
	const sortedValues = new Map<string, string[]>();
	for (const [key, set] of values) {
		const list = set.sorted();
		if (list.length > 0) sortedValues.set(key, list);
	}
	return {
		folders: folders.sorted(),
		tags: tags.sorted(),
		types: types.sorted(),
		headingTags: headingTags.sorted(),
		keys: keys.sorted(),
		values: sortedValues,
	};
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
	/** Note groups only: the note's tasks the sources and excludes keep, before any quick filter */
	total?: number;
	/** Note groups only: the note's open tasks the sources and excludes keep, before any quick filter */
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

/** A tag as the sentence shows it: trimmed, with one leading `#`, case kept. */
const tagWord = (tag: string) => `#${tag.trim().replace(/^#/, '')}`;

/** A clause in the sentence's words, or null when it is inactive. */
function clauseWords(clause: TaskSourceClause): string | null {
	const not = 'negate' in clause && clause.negate ? 'not ' : '';
	switch (clause.kind) {
		case 'folder': {
			const folder = folderValue(clause.path);
			return folder ? `${not}in folder ${folder}` : null;
		}
		case 'type': {
			const type = clause.type.trim();
			return type ? `${not}of type ${type}` : null;
		}
		case 'noteTag':
			return tagValue(clause.tag) ? `${not}tagged ${tagWord(clause.tag)}` : null;
		case 'heading': {
			const text = headingValue(clause.text, clause.match);
			if (!text) return null;
			return clause.match === 'tag' ? `under a heading tagged #${text}` : `under a heading containing "${clause.text.trim()}"`;
		}
		case 'property': {
			const key = clause.key.trim();
			const value = (clause.value ?? '').trim();
			if (!key || (clause.op !== 'exists' && !value)) return null;
			return `where ${key} ${PROPERTY_OP_WORDS[clause.op]}${clause.op === 'exists' ? '' : ` ${value}`}`;
		}
		case 'lifecycle':
			return LIFECYCLE_WORDS[clause.state];
	}
}

/** Each lifecycle state as the sentence says it, after "from notes". */
const LIFECYCLE_WORDS: Record<LifecycleState, string> = {
	inbox: 'in the inbox',
	organized: 'that are organized',
	favorite: 'that are favorites',
	archived: 'that are archived',
};

/** Each property op as the sentence says it, before the value. */
const PROPERTY_OP_WORDS: Record<PropertyOp, string> = { is: 'is', isNot: 'is not', contains: 'contains', exists: 'is set' };

/** The active clauses of each card, with their words. */
function activeCards(sources: readonly TaskSource[]): { clause: TaskSourceClause; words: string }[][] {
	return sources.map((source) =>
		source.clauses.flatMap((clause) => {
			const words = clauseWords(clause);
			return words === null ? [] : [{ clause, words }];
		}),
	);
}

/**
 * The tags of the tag cards case, as the sentence shows them joined with
 * ` or `: every card holds exactly one active heading clause in tag mode, as
 * the cards built from saved tags (`headingSources`) do. Null for any other
 * sources, no card included.
 */
function textboxTags(sources: readonly TaskSource[]): string | null {
	const cards = activeCards(sources);
	if (cards.length === 0) return null;
	const tags: string[] = [];
	for (const card of cards) {
		const [only] = card;
		if (card.length !== 1 || only.clause.kind !== 'heading' || only.clause.match !== 'tag') return null;
		tags.push(`#${headingValue(only.clause.text, 'tag')}`);
	}
	return tags.join(' or ');
}

/** The sentence's source part. */
function describeSources(sources: readonly TaskSource[]): string {
	const cards = activeCards(sources);
	// A card with no active clause matches every row, and the cards are ORed.
	if (cards.length === 0 || cards.some((card) => card.length === 0)) return ' from every note';
	const tags = textboxTags(sources);
	if (tags) return ` under headings containing ${tags}`;
	return ` from notes ${cards.map((card) => card.map((c) => c.words).join(' and ')).join('; or ')}`;
}

/**
 * The sentence's exclude part: the active switches, then each listed value;
 * '' when none is active. The archived switch is left out when every card
 * lifts it (`liftsArchived`), as it then removes nothing.
 */
function describeExcludes(exclude: TaskExcludes, sources: readonly TaskSource[]): string {
	const parts: string[] = [];
	const archivedLifted = sources.length > 0 && sources.every(liftsArchived);
	if (exclude.archived && !archivedLifted) parts.push('archived notes');
	if (exclude.typeDefinitions) parts.push('type definitions');
	if (exclude.templatesFolder) parts.push('templates');
	if (exclude.systemFolder) parts.push('the system folder');
	for (const folder of exclude.folders.map(folderValue)) if (folder) parts.push(`folder ${folder}`);
	for (const note of exclude.notes) if (note.trim()) parts.push(`note ${note}`);
	for (const tag of exclude.tags) if (tagValue(tag)) parts.push(`tag ${tagWord(tag)}`);
	for (const type of exclude.types) if (type.trim()) parts.push(`type ${type.trim()}`);
	return parts.length > 0 ? `, except ${parts.join(', ')}` : '';
}

/**
 * Builds the sentence above the Tasks list that says which tasks it shows:
 * the status, the sources, the excludes, then Due, Priority, Tag and Search,
 * e.g. "Open tasks under headings containing #to-list, except archived notes,
 * type definitions, templates, the system folder, overdue". No trailing period.
 */
export function describeTaskQuery(query: TaskQuery): string {
	const { quick } = query;
	const when = quick.due === undefined || quick.due === 'any' ? '' : DUE_PHRASES[quick.due];
	const priority = isQuickFieldDefault(quick, 'priority')
		? ''
		: `, priority ${quick.priorities!.map(priorityWord).join(' or ')}`;
	const tagged = isQuickFieldDefault(quick, 'tag') ? '' : `, tagged ${quick.tags!.map((t) => `#${t}`).join(' or ')}`;
	const matching = isQuickFieldDefault(quick, 'search') ? '' : `, matching "${quick.search!.trim()}"`;
	return `${describeStatus(quick)}${describeSources(query.sources)}${describeExcludes(query.exclude, query.sources)}${when}${priority}${tagged}${matching}`;
}

/** Why the Tasks list is empty, and the one action that would fill it */
export interface EmptyTasksExplanation {
	/** Sentence naming the filter that emptied the list */
	message: string;
	/** Button that lifts that filter, when one does; `resetQuick` resets only `field` */
	action?:
		| { kind: 'editSources'; label: string }
		| { kind: 'editExcludes'; label: string }
		| { kind: 'showAllStatuses'; label: string }
		| { kind: 'resetQuick'; field: 'due' | 'priorities' | 'tags' | 'search'; label: string };
}

/** The stages after Due, in the order `explainEmptyTasks` checks them. */
const META_STAGES = [
	{ field: 'priority', key: 'priorities', name: 'Priority' },
	{ field: 'tag', key: 'tags', name: 'Tag' },
	{ field: 'search', key: 'search', name: 'Search' },
] as const;

/** Excludes with nothing on, to run the sources alone. */
const NO_EXCLUDES: TaskExcludes = {
	archived: false,
	typeDefinitions: false,
	templatesFolder: false,
	systemFolder: false,
	folders: [],
	notes: [],
	tags: [],
	types: [],
};

/**
 * Names the first stage of the pipeline that leaves the Tasks list empty: no
 * task at all, then the sources, then the excludes, then the status filter,
 * Due, Priority, Tag and Search over the rows the sources and excludes keep.
 * Each stage keeps the filters of the stages before it.
 * @param rows - every task row of the snapshot (`tasksStore.rows`)
 * @param folders - the template and system folder settings the excludes read
 * @param today - today as `YYYY-MM-DD`, for the due date options
 * @param now - the clock the edited options read, in ms
 */
export function explainEmptyTasks({
	rows: allRows,
	query,
	folders,
	today,
	now,
}: {
	rows: readonly TaskRow[];
	query: TaskQuery;
	folders: TaskSourceFolders;
	today: string;
	now: number;
}): EmptyTasksExplanation {
	if (allRows.length === 0) return { message: 'No tasks in this vault yet' };

	const sourced = selectSourceRows(allRows, query.sources, NO_EXCLUDES, folders);
	if (sourced.length === 0) {
		const tags = textboxTags(query.sources);
		return {
			message: tags ? `No task sits under a heading containing ${tags}` : 'No note matches the sources',
			action: { kind: 'editSources', label: 'Edit sources' },
		};
	}

	// The sources run again with the excludes: a lifecycle archived card lifts the archived exclude.
	const rows = selectSourceRows(allRows, query.sources, query.exclude, folders);
	if (rows.length === 0) return { message: 'Every matching note is excluded', action: { kind: 'editExcludes', label: 'Edit excludes' } };

	const { quick } = query;
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
