/**
 * The pull half of a sync cycle, as pure planning: which project notes to
 * create, which open Todoist tasks to insert as anchored lines, which links
 * to pair or freeze, and what to log. Design:
 * `.scratch/todoist-bisync/research/design.md` rules 1, 3, 8, 8c, 10,
 * Project model and Anchor.
 */

import type { TaskPriority, TodoistSyncLogInput, TodoistTaskLink } from '#lib/contracts/index.js';
import { canonicalizeScalar } from '#lib/core/frontmatter/yaml-quoting.logic.js';
import { anchorForTodoistId, anchorToken, readAnchor } from './anchor.logic.js';
import { mapPriorityFromTodoist } from './priority.logic.js';
import { treeProjectIds, type ScopeProject } from './sync-scope.logic.js';
import { codeFence } from './task-line-edits.logic.js';
import {
	contentRoundTripProblem,
	hasSignifier,
	isTaskTagName,
	taskLineStatus,
	taskLineText,
	type PriorityEmoji,
	type RoundTripProblem,
} from './task-line.logic.js';

/** The item fields the pull reads (SDK `Task`, camel-cased). */
export interface PullItem {
	/** Todoist task id. */
	id: string;
	/** Project the task is in. */
	projectId: string;
	/** Section within the project, or null. */
	sectionId: string | null;
	/** Parent task for a subtask, or null. */
	parentId: string | null;
	/** Task title (Markdown). */
	content: string;
	/** Task description; may hold a `kokobrain:td-...` line. */
	description: string;
	/** Label names. */
	labels: string[];
	/** Todoist priority, 1 (Normal) to 4 (Very Urgent). */
	priority: number;
	/** Due date, or null. */
	due: PullDue | null;
	/** Whether the task is completed. */
	checked: boolean;
	/** Whether the task is deleted. */
	isDeleted: boolean;
	/** Position among its siblings (same parent). */
	childOrder: number;
}

/** A Todoist due date as the SDK returns it. */
export interface PullDue {
	/** `YYYY-MM-DD`, or a datetime starting with it. */
	date: string;
	/** The human text, e.g. `every month`. */
	string: string;
	/** Whether the due date repeats. */
	isRecurring: boolean;
	/** Full datetime when the due has a time. */
	datetime?: string | null;
	/** Timezone of a fixed-time due. */
	timezone?: string | null;
	/** Language `string` was parsed in. */
	lang?: string | null;
}

/** `local_base` JSON: the values parsed from the line as last written or seen. */
export interface LocalBase {
	/** The line's task text without metadata. */
	description: string;
	/** The status char. */
	status: string;
	/** `📅` date, `YYYY-MM-DD`, or null. */
	dueDate: string | null;
	/** Priority from the line's emoji, or null. */
	priority: TaskPriority | null;
	/** Tags on the line, without `#`. */
	tags: string[];
}

/** `remote_base` JSON: the raw Todoist values last seen. */
export interface RemoteBase {
	/** Task content as Todoist has it. */
	content: string;
	/** Project id. */
	projectId: string;
	/** Section id, or null. */
	sectionId: string | null;
	/** Parent task id, or null. */
	parentId: string | null;
	/** Whether the task is completed. */
	checked: boolean;
	/** Todoist priority, 1 to 4. */
	priority: number;
	/** Due date, or null. */
	due: PullDue | null;
	/** Every label, as Todoist has it. */
	labels: string[];
	/** Labels not written as tags (rule 8); always re-sent on a label push. */
	unmappedLabels: string[];
	/** Set when the content does not survive a write and parse back; such content is never pushed. */
	contentProblem: RoundTripProblem | null;
}

/** A task line found in the vault: its text after `[ ] ` (Rust `Task.text`). */
export interface ScannedLine {
	/** Vault-relative note path. */
	relPath: string;
	/** 1-based line number. */
	lineNumber: number;
	/** The task text, without the `- [ ] ` prefix. */
	line: string;
	/** The status char (for an index line, the canonical char of its parsed status). */
	status: string;
	/** The line's fields as the Rust parser reads them; null when the index has not parsed this text yet. */
	fields: LineFields | null;
}

/** The parsed fields of a line that a `local_base` keeps besides the status. */
export type LineFields = Omit<LocalBase, 'status'>;

/** An indexed note, and the Todoist project its frontmatter names when it is in sync scope. */
export interface ScannedNote {
	/** Vault-relative path. */
	relPath: string;
	/** `todoist_project` frontmatter value; null when absent or out of scope. */
	projectId: string | null;
}

/** Everything {@link planPull} reads. */
export interface PullInput {
	/** Normalized sync folder (`normalizeSyncFolder`). */
	folder: string;
	/** Every project of the full `/sync`. */
	projects: ScopeProject[];
	/** Every item of the full `/sync`. */
	items: PullItem[];
	rootId: string;
	includeInbox: boolean;
	/** The stored link table. */
	links: TodoistTaskLink[];
	/** Anchor -> every in-scope line carrying it. */
	occurrences: Map<string, ScannedLine[]>;
	/** Every indexed note. */
	notes: ScannedNote[];
	/** Lower-cased label names never written as tags (`excludedLabelSet`). */
	excludedLabels: ReadonlySet<string>;
}

/** New lines for one note and the links to store once they are written. */
export interface PlannedInsert {
	relPath: string;
	lines: string[];
	links: TodoistTaskLink[];
}

/** What one pull does. */
export interface PullPlan {
	/** `rebuild` pairs only: no note created, no line inserted (rule 1). */
	mode: 'normal' | 'rebuild';
	/** Project notes to create, with their frontmatter. */
	createNotes: { projectId: string; relPath: string; content: string }[];
	/** Lines to insert at the end of each note. */
	inserts: PlannedInsert[];
	/** New links for items paired with a line already in the vault. */
	pairedLinks: TodoistTaskLink[];
	/** Existing links whose `frozen` flag changed. */
	updatedLinks: TodoistTaskLink[];
	/** Rebuild only: distinct anchors in the vault that no open item paired with. */
	linesUnmatched: number;
	/** Entries for the sync log. */
	log: TodoistSyncLogInput[];
}

/** What a sync cycle wrote: the pull, then the completion sync. */
export interface PullCounts {
	/** Whether the pull ran in rebuild mode. */
	mode: PullPlan['mode'];
	/** Project notes created. */
	notesCreated: number;
	/** Task lines inserted. */
	tasksInserted: number;
	/** Links paired with lines already in the vault. */
	linksPaired: number;
	/** Rebuild only: anchored lines left unmatched (`PullPlan.linesUnmatched`). */
	linesUnmatched: number;
	/** Synced lines patched from Todoist (status, recurring `📅`). */
	linesUpdated: number;
	/** Close and reopen commands Todoist acknowledged. */
	todoistUpdated: number;
}

/** Labels kept out of the tag mapping besides `defaultLabel` (design rule 8): the scope tag and the context labels. */
const ALWAYS_EXCLUDED_LABELS = ['todoist', 'work', 'personal'];

/** What a Todoist `due.date` must start with to be written as `📅`. */
const DUE_DATE_RE = /^\d{4}-\d{2}-\d{2}/u;

/** Todoist priority -> line emoji (`PRIORITY_EMOJIS` order). */
export const PRIORITY_EMOJI: Partial<Record<TaskPriority, PriorityEmoji>> = { highest: '🔺', high: '⏫', medium: '🔼' };

/**
 * The sync folder as used for paths: trimmed, empty and `.` segments dropped
 * (so the path matches the one the watcher reports), empty -> `Todoist`. Null
 * for a value that is absolute (leading `/` or `\`, `~`, a drive letter) or
 * has a `..` segment.
 */
export function normalizeSyncFolder(raw: string): string | null {
	const value = raw.trim();
	if (/^[/\\~]/u.test(value) || /^[A-Za-z]:/u.test(value)) return null;
	if (value.split(/[/\\]/u).includes('..')) return null;
	const folder = value
		.split('/')
		.filter((s) => s !== '' && s !== '.')
		.join('/');
	return folder === '' ? 'Todoist' : folder;
}

/**
 * A project name as a note filename (no extension): `\ / : * ? " < > |` and
 * control chars become `-`, whitespace collapses, leading dots and
 * surrounding spaces and dots go; empty -> `Untitled`.
 */
export function projectNoteBaseName(name: string): string {
	const cleaned = name
		// eslint-disable-next-line no-control-regex
		.replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/gu, '-')
		.replace(/\s+/gu, ' ')
		.replace(/^[.\s]+|[.\s]+$/gu, '');
	return cleaned === '' ? 'Untitled' : cleaned;
}

/**
 * Every task line of a note's content with its 1-based number, its text and
 * its status char, skipping code fences like Rust `extract_tasks`.
 */
export function extractTaskLines(content: string): { lineNumber: number; text: string; status: string }[] {
	const out: { lineNumber: number; text: string; status: string }[] = [];
	let fence: string | null = null;
	content.split('\n').forEach((line, i) => {
		const marker = codeFence(line);
		if (marker !== null) {
			if (fence === null) fence = marker;
			else if (fence === marker) fence = null;
			return;
		}
		if (fence !== null) return;
		const text = taskLineText(line);
		if (text !== null) out.push({ lineNumber: i + 1, text, status: taskLineStatus(line)! });
	});
	return out;
}

/**
 * The anchor a brain-born task's description names on its own
 * `kokobrain:td-...` line, or null. Only the brain-born format (`td-` plus 8
 * base36 chars, `generateAnchor`) counts, so a description can never claim a
 * `td-<todoist id>` anchor.
 */
export function kokobrainAnchor(description: string): string | null {
	return /^kokobrain:(td-[0-9a-z]{8})\s*$/mu.exec(description)?.[1] ?? null;
}

/** Throws when a line planned for a note holds CR or LF: the writers would refuse it, and the line would split. */
export function assertSingleLine(line: string): void {
	if (/[\r\n]/u.test(line)) throw new Error(`A planned task line holds a line break: ${JSON.stringify(line)}`);
}

/** Lower-cased labels never written as tags: the scope tag, the context labels and `defaultLabel`. */
export function excludedLabelSet(defaultLabel: string): Set<string> {
	const set = new Set(ALWAYS_EXCLUDED_LABELS);
	if (defaultLabel.trim() !== '') set.add(defaultLabel.trim().toLowerCase());
	return set;
}

/** The labels written as tags (rule 8): a whole tag name, not excluded (compared lower-cased). */
export function mappedLabels(labels: readonly string[], excludedLabels: ReadonlySet<string>): string[] {
	return labels.filter((l) => isTaskTagName(l) && !excludedLabels.has(l.toLowerCase()));
}

/**
 * The line for an open Todoist task, with its bases:
 * `- [ ] <content> <priority> 📅 <date> 🔁 <rule> #tags 🆔 td-<id>`, only
 * the fields that exist. A label becomes a tag only when its whole name is a
 * tag name and it is not excluded; the rest stay in `unmappedLabels`.
 * Content that would not survive a parse back is written as-is (a newline
 * becomes a space, which a line cannot hold) and flagged. CR and LF in the
 * recurrence text become spaces; recurrence text holding a signifier emoji
 * or `#` is left out (the `📅` stays) and flagged as `recurrenceProblem`,
 * since the parser would read those as the line's metadata. A due whose
 * date does not start with `YYYY-MM-DD` is left out of the line and flagged
 * as `dueProblem`.
 */
export function pulledTask(
	item: PullItem,
	excludedLabels: ReadonlySet<string>,
): {
	line: string;
	localBase: LocalBase;
	remoteBase: RemoteBase;
	contentProblem: RoundTripProblem | null;
	dueProblem: boolean;
	recurrenceProblem: boolean;
} {
	const contentProblem = contentRoundTripProblem(item.content);
	const content = item.content.replace(/\r\n|\r|\n/gu, ' ');
	const tags = mappedLabels(item.labels, excludedLabels);
	const unmappedLabels = item.labels.filter((l) => !tags.includes(l));
	const priority = mapPriorityFromTodoist(item.priority);
	const dueProblem = item.due !== null && !DUE_DATE_RE.test(item.due.date);
	const due = dueProblem ? null : item.due;
	const dueDate = due ? due.date.slice(0, 10) : null;
	const recurrenceProblem = Boolean(due?.isRecurring) && !isSafeRecurrenceText(due!.string);
	const parts = [
		content,
		priority ? PRIORITY_EMOJI[priority] : undefined,
		dueDate ? `📅 ${dueDate}` : undefined,
		due?.isRecurring && !recurrenceProblem ? `🔁 ${due.string.replace(/\r\n|\r|\n/gu, ' ')}` : undefined,
		...tags.map((t) => `#${t}`),
		anchorToken(anchorForTodoistId(item.id)),
	].filter((p): p is string => p !== undefined && p !== '');
	return {
		line: `- [ ] ${parts.join(' ')}`,
		localBase: { description: content, status: ' ', dueDate, priority, tags },
		remoteBase: remoteBaseOf(item, unmappedLabels, contentProblem),
		contentProblem,
		dueProblem,
		recurrenceProblem,
	};
}

/** Whether a Todoist `due.string` can be written after `🔁`: no signifier emoji and no `#` the parser would read as metadata. */
function isSafeRecurrenceText(text: string): boolean {
	return !hasSignifier(text) && !text.includes('#');
}

function remoteBaseOf(item: PullItem, unmappedLabels: string[], contentProblem: RoundTripProblem | null): RemoteBase {
	return {
		content: item.content,
		projectId: item.projectId,
		sectionId: item.sectionId,
		parentId: item.parentId,
		checked: item.checked,
		priority: item.priority,
		due: item.due
			? {
					date: item.due.date,
					string: item.due.string,
					isRecurring: item.due.isRecurring,
					datetime: item.due.datetime ?? null,
					timezone: item.due.timezone ?? null,
					lang: item.due.lang ?? null,
				}
			: null,
		labels: [...item.labels],
		unmappedLabels,
		contentProblem,
	};
}

function newLink(anchor: string, todoistId: string, noteRelPath: string, extra: Partial<TodoistTaskLink>): TodoistTaskLink {
	return {
		anchor,
		todoistId,
		noteRelPath,
		localBase: null,
		remoteBase: null,
		pendingUuid: null,
		pendingCmd: null,
		missCount: 0,
		frozen: false,
		...extra,
	};
}

/**
 * Plans one pull over the vault's tree (rule 8c). Items already linked are
 * left alone except for their `frozen` flag (2+ lines carry the anchor,
 * rule 10; logged when it turns on). An unlinked item whose anchor
 * (`kokobrain:` line first, then `td-<id>`) is in the vault is paired with
 * that line. The rest are inserted at the end of their project note, which
 * is created when no note's frontmatter names the project.
 *
 * Rebuild mode (rule 1) runs when the link table is empty but the vault has
 * anchored lines or an item carries a `kokobrain:` line: it only pairs, and
 * logs the items and lines left unmatched.
 */
export function planPull(input: PullInput): PullPlan {
	const plan: PullPlan = { mode: 'normal', createNotes: [], inserts: [], pairedLinks: [], updatedLinks: [], linesUnmatched: 0, log: [] };
	const treeIds = treeProjectIds(input.projects, input.rootId, input.includeInbox) ?? new Set<string>();
	const items = treeOrder(input.items.filter((i) => !i.checked && !i.isDeleted && treeIds.has(i.projectId)));
	if (input.links.length === 0 && (input.occurrences.size > 0 || items.some((i) => kokobrainAnchor(i.description)))) {
		plan.mode = 'rebuild';
	}

	const occurrenceCount = (anchor: string) => input.occurrences.get(anchor)?.length ?? 0;
	for (const link of input.links) {
		const frozen = occurrenceCount(link.anchor) >= 2;
		if (frozen === link.frozen) continue;
		plan.updatedLinks.push({ ...link, frozen });
		if (frozen) plan.log.push(frozenEntry(link.anchor));
	}

	const targets = projectTargets(input, treeIds, plan);
	const linkedIds = new Set(input.links.map((l) => l.todoistId));
	const ownedAnchors = new Set(input.links.map((l) => l.anchor));
	const paired = new Set<string>();
	const inserts = new Map<string, PlannedInsert>();

	// The item's own `td-<id>` first, then its description's brain-born anchor.
	const unlinked = items.filter((i) => !linkedIds.has(i.id));
	const foundAnchor = new Map<string, string>();
	const claims = new Map<string, number>();
	for (const item of unlinked) {
		const found = [anchorForTodoistId(item.id), kokobrainAnchor(item.description)].find(
			(a): a is string => a !== null && occurrenceCount(a) > 0,
		);
		if (!found) continue;
		foundAnchor.set(item.id, found);
		claims.set(found, (claims.get(found) ?? 0) + 1);
	}

	for (const item of unlinked) {
		const kb = kokobrainAnchor(item.description);
		const own = anchorForTodoistId(item.id);
		const found = foundAnchor.get(item.id);
		if (found) {
			if (ownedAnchors.has(found)) {
				plan.log.push({ kind: 'anchor-conflict', anchor: found, message: `Todoist task ${item.id} carries an anchor another link owns` });
				continue;
			}
			if (claims.get(found)! > 1) {
				plan.log.push({ kind: 'anchor-conflict', anchor: found, message: `Todoist task ${item.id} claims an anchor another task claims too; neither is paired` });
				continue;
			}
			paired.add(found);
			const lines = input.occurrences.get(found)!;
			const { remoteBase } = pulledTask(item, input.excludedLabels);
			plan.pairedLinks.push(
				newLink(found, item.id, lines[0].relPath, { remoteBase: JSON.stringify(remoteBase), frozen: lines.length >= 2 }),
			);
			if (lines.length >= 2) plan.log.push(frozenEntry(found));
			continue;
		}
		if (plan.mode === 'rebuild' || kb) {
			plan.log.push({ kind: 'unmatched', anchor: kb ?? own, message: `Todoist task ${item.id} has no line in the vault` });
			continue;
		}
		const relPath = targets.get(item.projectId);
		if (!relPath) continue;
		const task = pulledTask(item, input.excludedLabels);
		if (hasSignifier(item.content)) {
			// The parser keeps the first `🆔` and reads the other signifiers as metadata.
			plan.log.push({ kind: 'content-skipped', anchor: own, message: `Content of Todoist task ${item.id} holds a task signifier; it is not inserted` });
			continue;
		}
		assertSingleLine(task.line);
		if (readAnchor(task.line) !== own) {
			plan.log.push({ kind: 'anchor-mismatch', anchor: own, message: `The line for Todoist task ${item.id} would not read back as ${own}; it is not inserted` });
			continue;
		}
		if (task.dueProblem) {
			plan.log.push({ kind: 'due-dropped', anchor: own, message: `Todoist task ${item.id} has a due date that is not YYYY-MM-DD; the due is left out` });
		}
		if (task.recurrenceProblem) {
			plan.log.push({
				kind: 'recurrence-dropped',
				anchor: own,
				message: `The recurrence of Todoist task ${item.id} holds a task signifier or #; the 🔁 text is left out of the line`,
			});
		}
		if (task.contentProblem) {
			plan.log.push({
				kind: 'content-roundtrip',
				anchor: own,
				message: `Content of Todoist task ${item.id} does not survive a parse back (${task.contentProblem}); it is never pushed`,
			});
		}
		const insert = inserts.get(relPath) ?? { relPath, lines: [], links: [] };
		insert.lines.push(task.line);
		insert.links.push(
			newLink(own, item.id, relPath, { localBase: JSON.stringify(task.localBase), remoteBase: JSON.stringify(task.remoteBase) }),
		);
		inserts.set(relPath, insert);
	}
	plan.inserts = [...inserts.values()];

	if (plan.mode === 'rebuild') {
		for (const anchor of input.occurrences.keys()) {
			if (paired.has(anchor)) continue;
			plan.linesUnmatched++;
			plan.log.push({ kind: 'unmatched', anchor, message: 'Anchored line has no Todoist task in the vault tree' });
		}
	}
	return plan;
}

/**
 * Items in outline order: each parent followed by its subtasks, siblings by
 * `childOrder` (which counts among siblings, not across the project). An
 * item whose parent is not in `items` counts as a root.
 */
function treeOrder(items: PullItem[]): PullItem[] {
	const ids = new Set(items.map((i) => i.id));
	const children = new Map<string | null, PullItem[]>();
	for (const item of items) {
		const parent = item.parentId !== null && ids.has(item.parentId) ? item.parentId : null;
		children.set(parent, [...(children.get(parent) ?? []), item]);
	}
	const out: PullItem[] = [];
	const visit = (parent: string | null) => {
		for (const item of [...(children.get(parent) ?? [])].sort((a, b) => a.childOrder - b.childOrder)) {
			out.push(item);
			visit(item.id);
		}
	};
	visit(null);
	return out;
}

/**
 * Project id -> the note its lines go to: the one note whose frontmatter
 * names it, or (outside rebuild mode) a new note in the folder, the Inbox
 * first so it gets `Inbox.md`. A project with two or more notes gets none
 * (logged). New notes are added to `plan.createNotes`.
 */
function projectTargets(input: PullInput, treeIds: Set<string>, plan: PullPlan): Map<string, string> {
	const byId = new Map<string, string[]>();
	for (const note of input.notes) {
		if (note.projectId === null) continue;
		byId.set(note.projectId, [...(byId.get(note.projectId) ?? []), note.relPath]);
	}
	const taken = new Set(input.notes.map((n) => n.relPath.toLowerCase()));
	const projects = [...treeIds].map((id) => input.projects.find((p) => p.id === id)!);
	projects.sort((a, b) => Number(Boolean(b.inboxProject)) - Number(Boolean(a.inboxProject)));

	const targets = new Map<string, string>();
	for (const project of projects) {
		const existing = byId.get(project.id) ?? [];
		if (existing.length === 1) {
			targets.set(project.id, existing[0]);
			continue;
		}
		if (existing.length > 1) {
			plan.log.push({
				kind: 'duplicate-project-note',
				anchor: null,
				message: `Project ${project.id} is named by ${existing.length} notes (${existing.join(', ')}); nothing is written to them`,
			});
			continue;
		}
		if (plan.mode === 'rebuild') continue;
		const base = project.inboxProject ? 'Inbox' : projectNoteBaseName(project.name);
		let relPath = `${input.folder}/${base}.md`;
		for (let n = 2; taken.has(relPath.toLowerCase()); n++) relPath = `${input.folder}/${base} ${n}.md`;
		taken.add(relPath.toLowerCase());
		targets.set(project.id, relPath);
		plan.createNotes.push({ projectId: project.id, relPath, content: `---\ntodoist_project: ${canonicalizeScalar(project.id)}\n---\n` });
	}
	return targets;
}

/** The message a finished pull shows. */
export function formatPullResult(counts: PullCounts): string {
	if (counts.mode === 'rebuild') {
		const rebuilt = `Todoist sync rebuilt ${plural(counts.linksPaired, 'link')} from the vault; nothing was created.`;
		// With no link paired the table stays empty, so the next run is a rebuild again.
		if (counts.linksPaired > 0 || counts.linesUnmatched === 0) return rebuilt;
		const lines = counts.linesUnmatched === 1 ? '1 anchored line has' : `${counts.linesUnmatched} anchored lines have`;
		return `${rebuilt} ${lines} no open Todoist task: new Todoist tasks come in only after a line pairs or those 🆔 anchors are removed.`;
	}
	const parts = [
		counts.notesCreated > 0 ? `${plural(counts.notesCreated, 'note')} created` : '',
		counts.tasksInserted > 0 ? `${plural(counts.tasksInserted, 'task')} added` : '',
		counts.linksPaired > 0 ? `${plural(counts.linksPaired, 'link')} paired` : '',
		counts.linesUpdated > 0 ? `${plural(counts.linesUpdated, 'line')} updated` : '',
		counts.todoistUpdated > 0 ? `${plural(counts.todoistUpdated, 'task')} updated in Todoist` : '',
	].filter((p) => p !== '');
	return `Todoist sync done: ${parts.length > 0 ? parts.join(', ') : 'nothing new'}.`;
}

function plural(n: number, noun: string): string {
	return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

function frozenEntry(anchor: string): TodoistSyncLogInput {
	return { kind: 'frozen', anchor, message: 'Anchor occurs on more than one line; the link is frozen' };
}
