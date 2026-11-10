/**
 * Completion sync, as pure planning: which synced lines get their status
 * (and, for a recurring task, their `📅`) rewritten from Todoist, which
 * links push an `item_close` or `item_uncomplete`, and how the bases move.
 * Design: `.scratch/todoist-bisync/research/design.md` rules 3, 5, 6, 7, 10;
 * facts in `research/live-check.md`.
 */

import type { TodoistSyncLogInput, TodoistTaskLink } from '#lib/contracts/index.js';
import { assertSingleLine, type LocalBase, type PullDue, type PullItem, type RemoteBase, type ScannedLine } from './pull.logic.js';
import {
	addTag,
	isClosedStatus,
	nextStatusChar,
	removeTag,
	replaceDescription,
	setDueDate,
	setPriority,
	setTaskStatus,
	taskLineStatus,
	taskLineText,
	type PriorityEmoji,
	type TaskLineState,
} from './task-line.logic.js';

/** The Sync API commands a completion push sends; `item_complete` is never used (rule 6). */
export type CompletionCommandType = 'item_close' | 'item_uncomplete';

/** `pending_cmd` JSON: a close or reopen sent or about to be sent, kept until acknowledged. */
export interface PendingCommand {
	/** The command uuid, reused on a resend so Todoist applies it once. */
	uuid: string;
	/** The command type. */
	type: CompletionCommandType;
}

/** A token patch for one synced line. */
export interface LineChange {
	/** The line's anchor. */
	anchor: string;
	/** Vault-relative note path. */
	relPath: string;
	/** The line as scanned: the write is skipped (stale) when the note no longer holds it. */
	expected: ScannedLine;
	/** Status to set, or null to keep it. */
	status: TaskLineState | null;
	/** New `📅` date, null to remove it, or undefined to keep it. */
	dueDate?: string | null;
	/** New description text through `replaceDescription`, or undefined to keep it. */
	description?: string;
	/** New priority emoji, null to remove it, or undefined to keep it. */
	priority?: PriorityEmoji | null;
	/** Tags to add before the anchor. */
	addTags?: string[];
	/** Tags to remove, case-insensitively. */
	removeTags?: string[];
}

/** A command to send for one link. */
export interface PlannedCommand {
	/** The line's anchor. */
	anchor: string;
	/** Todoist item id. */
	todoistId: string;
	/** The command, as stored in `pending_cmd`. */
	pending: PendingCommand;
}

/** What {@link planCompletion} decided. */
export interface CompletionPlan {
	/** Lines to patch. */
	lineChanges: LineChange[];
	/** Links to store; a link whose line change goes stale must not be stored. */
	links: TodoistTaskLink[];
	/** Close and reopen commands to send after the links are stored. */
	commands: PlannedCommand[];
	/** Entries for the sync log. */
	log: TodoistSyncLogInput[];
}

/** Everything {@link planCompletion} reads. */
export interface CompletionInput {
	/** The stored links, with this cycle's `frozen` flags. */
	links: TodoistTaskLink[];
	/** Anchor -> every in-scope line carrying it. */
	occurrences: Map<string, ScannedLine[]>;
	/** Todoist items seen this cycle by id: the full sync's open items with the incremental pull's changes on top. */
	items: Map<string, PullItem>;
	/**
	 * Whether the items were pulled incrementally from a stored token. Then an
	 * item missing from them is unchanged since its `remote_base`; without a
	 * token, missing means unknown and the link is skipped.
	 */
	incremental: boolean;
	/** Project ids of the vault's tree; items outside it are left alone. */
	treeIds: ReadonlySet<string>;
	/** Makes a command uuid. */
	newUuid: () => string;
}

/** `YYYY-MM-DD` of a due, or null. */
export function dueDay(due: PullDue | null): string | null {
	return due && /^\d{4}-\d{2}-\d{2}/u.test(due.date) ? due.date.slice(0, 10) : null;
}

/** A copy of a due for `remote_base`, the shape `pulledTask` stores. */
export function baseDue(due: PullDue | null): PullDue | null {
	if (!due) return null;
	return {
		date: due.date,
		string: due.string,
		isRecurring: due.isRecurring,
		datetime: due.datetime ?? null,
		timezone: due.timezone ?? null,
		lang: due.lang ?? null,
	};
}

/** Parses `pending_cmd`; null when absent or not one of ours. */
export function parsePending(raw: string | null): PendingCommand | null {
	if (raw === null) return null;
	try {
		const value = JSON.parse(raw) as Partial<PendingCommand>;
		if (typeof value.uuid !== 'string' || (value.type !== 'item_close' && value.type !== 'item_uncomplete')) return null;
		return { uuid: value.uuid, type: value.type };
	} catch {
		return null;
	}
}

function localBaseFromLine(line: ScannedLine): LocalBase | null {
	return line.fields ? { ...line.fields, status: line.status } : null;
}

/**
 * Plans the completion half of a cycle, after the pull (rule 6). Per link
 * with exactly one line (a duplicated anchor freezes it, rule 10), an item
 * seen in the vault's tree and not deleted:
 * - local change = closed(line status) vs closed(`local_base.status`);
 *   remote change = `checked` vs `remote_base.checked` (rule 3);
 * - both changed and agree: only the bases move; disagree: Todoist wins,
 *   the brain value is logged;
 * - remote only: the line takes Todoist's status;
 * - local close: `item_close`, unless the task is recurring and its remote
 *   due moved since the base (Todoist already closed an occurrence), then
 *   the close is dropped, the line takes Todoist's state and it is logged;
 * - local reopen: `item_uncomplete`;
 * - an open recurring item whose date moved gets the new `📅` (rule 7).
 *
 * A null `local_base` (a link paired by rebuild or by an existing line) is
 * filled from the line, and nothing is pushed for it this cycle. A command
 * of the same type as the stored `pending_cmd` reuses its uuid; a pending
 * command no longer wanted is cleared, and logged unless Todoist already
 * shows its effect.
 */
export function planCompletion(input: CompletionInput): CompletionPlan {
	const plan: CompletionPlan = { lineChanges: [], links: [], commands: [], log: [] };
	for (const link of input.links) {
		const lines = input.occurrences.get(link.anchor) ?? [];
		if (lines.length !== 1 || link.todoistId === null || link.remoteBase === null) continue;
		const line = lines[0];
		const remoteBase = JSON.parse(link.remoteBase) as RemoteBase;
		const item = input.items.get(link.todoistId) ?? (input.incremental ? unchangedItem(link.todoistId, remoteBase) : undefined);
		if (!item || item.isDeleted || !input.treeIds.has(item.projectId)) continue;
		const filled = link.localBase === null;
		const localBase = filled ? localBaseFromLine(line) : (JSON.parse(link.localBase!) as LocalBase);
		if (!localBase) continue;

		const pending = parsePending(link.pendingCmd);
		const lineClosed = isClosedStatus(line.status);
		const localChanged = !filled && lineClosed !== isClosedStatus(localBase.status);
		const remoteChanged = item.checked !== remoteBase.checked;
		const dueMoved = dueDay(item.due) !== dueDay(remoteBase.due);
		const todoistState: TaskLineState = item.checked ? 'closed' : 'open';

		let status: TaskLineState | null = null;
		let push: CompletionCommandType | null = null;
		let dropped = false;
		if (localChanged && remoteChanged) {
			if (lineClosed !== item.checked) {
				status = todoistState;
				plan.log.push({ kind: 'conflict', anchor: link.anchor, message: `Completion changed on both sides; Todoist wins. Brain value: ${lineClosed ? 'closed' : 'open'}` });
			}
		} else if (remoteChanged) {
			status = todoistState;
		} else if (localChanged && lineClosed && dueMoved && item.due?.isRecurring) {
			// Todoist closed an occurrence (or moved it), so this close would act on a stale one.
			dropped = true;
			status = todoistState;
			plan.log.push({ kind: 'close-dropped', anchor: link.anchor, message: 'The brain close was dropped: the Todoist due moved since the last sync' });
		} else if (localChanged) {
			push = lineClosed ? 'item_close' : 'item_uncomplete';
		}
		// undefined keeps the `📅`; a dropped close takes Todoist's due whole, a recurring roll its new date.
		let newDue: string | null | undefined;
		if (dropped) newDue = dueDay(item.due);
		else if (push === null && !item.checked && item.due?.isRecurring && dueMoved) newDue = dueDay(item.due);

		// Not logged: a pending replaced by a command, already applied in Todoist, or covered by `close-dropped`.
		if (pending && push === null && !dropped && item.checked !== (pending.type === 'item_close')) {
			plan.log.push({ kind: 'pending-dropped', anchor: link.anchor, message: `A pending ${pending.type} from an earlier run is no longer wanted and was cleared` });
		}
		const next: TodoistTaskLink = { ...link, noteRelPath: line.relPath, pendingCmd: null };
		if (push !== null) {
			const uuid = pending?.type === push ? pending.uuid : input.newUuid();
			next.pendingCmd = JSON.stringify({ uuid, type: push } satisfies PendingCommand);
			plan.commands.push({ anchor: link.anchor, todoistId: link.todoistId, pending: { uuid, type: push } });
		} else {
			const keepChar = status === null && isClosedStatus(line.status) === isClosedStatus(localBase.status);
			const nextLocal: LocalBase = {
				...localBase,
				status: status ? nextStatusChar(line.status, status) : keepChar ? localBase.status : line.status,
				dueDate: newDue === undefined ? localBase.dueDate : newDue,
			};
			// The due moves only with the `📅` written here; other due changes are left for the field sync.
			const nextRemote: RemoteBase = { ...remoteBase, checked: item.checked, due: newDue === undefined ? remoteBase.due : baseDue(item.due) };
			next.localBase = JSON.stringify(nextLocal);
			next.remoteBase = JSON.stringify(nextRemote);
			if (status !== null || newDue !== undefined) {
				plan.lineChanges.push({ anchor: link.anchor, relPath: line.relPath, expected: line, status, ...(newDue === undefined ? {} : { dueDate: newDue }) });
			}
		}
		if (!sameLink(next, link)) plan.links.push(next);
	}
	return plan;
}

/**
 * The item as its `remote_base` last saw it, for a link whose item an
 * incremental pull did not report (so it did not change).
 */
export function unchangedItem(id: string, base: RemoteBase): PullItem {
	return {
		id,
		projectId: base.projectId,
		sectionId: base.sectionId,
		parentId: base.parentId,
		content: base.content,
		description: '',
		labels: base.labels,
		priority: base.priority,
		due: base.due,
		checked: base.checked,
		isDeleted: false,
		childOrder: 0,
	};
}

/** Whether storing `a` over `b` would change nothing: same note, pending command and bases. */
export function sameLink(a: TodoistTaskLink, b: TodoistTaskLink): boolean {
	return (
		a.noteRelPath === b.noteRelPath &&
		a.pendingCmd === b.pendingCmd &&
		sameJson(a.localBase, b.localBase) &&
		sameJson(a.remoteBase, b.remoteBase)
	);
}

function sameJson(a: string | null, b: string | null): boolean {
	if (a === null || b === null) return a === b;
	return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(b));
}

/** What to do for one link once Todoist answered its command. */
export interface AckPlan {
	/** The line patch, or null. */
	lineChange: LineChange | null;
	/** The link to store once the line change is written (or right away without one). */
	link: TodoistTaskLink;
	/** The link to store instead when the line change goes stale: only `pending_cmd` cleared, so the next cycle reconciles. */
	staleLink: TodoistTaskLink;
	/** Entries for the sync log. */
	log: TodoistSyncLogInput[];
}

/**
 * After an `ok` for a link's command, rewrites the line from the item an
 * incremental pull returned (rule 6): its status, and for an open recurring
 * item the new `📅` (a close rolls it forward). Both bases move to what was
 * written; the remote due moves only with a written `📅`. Without the item
 * (not returned), only `pending_cmd` is cleared.
 * A recurring item that ended up completed (a `starting <date>` rule,
 * live-check R) is logged.
 * @param link - the link as stored with its `pending_cmd`
 * @param line - the line as scanned this cycle
 * @param item - the item from the pull after the command, if returned
 */
export function planAck(link: TodoistTaskLink, line: ScannedLine, item: PullItem | undefined): AckPlan {
	const staleLink: TodoistTaskLink = { ...link, pendingCmd: null };
	if (!item || link.localBase === null || link.remoteBase === null) {
		return { lineChange: null, link: staleLink, staleLink, log: [] };
	}
	const localBase = JSON.parse(link.localBase) as LocalBase;
	const remoteBase = JSON.parse(link.remoteBase) as RemoteBase;
	const status: TaskLineState = item.checked ? 'closed' : 'open';
	const newDue = !item.checked && item.due?.isRecurring ? dueDay(item.due) : null;
	const log: TodoistSyncLogInput[] =
		item.checked && remoteBase.due?.isRecurring
			? [{ kind: 'recurring-completed', anchor: link.anchor, message: `Closing the recurring task completed it for good (Todoist rule "${remoteBase.due.string}")` }]
			: [];
	const nextLocal: LocalBase = { ...localBase, status: nextStatusChar(line.status, status), dueDate: newDue ?? localBase.dueDate };
	// As in planCompletion, the due moves only with the `📅` written; other due changes are left for the field sync.
	const nextRemote: RemoteBase = { ...remoteBase, checked: item.checked, due: newDue ? baseDue(item.due) : remoteBase.due };
	return {
		lineChange: { anchor: link.anchor, relPath: line.relPath, expected: line, status, ...(newDue ? { dueDate: newDue } : {}) },
		link: { ...staleLink, localBase: JSON.stringify(nextLocal), remoteBase: JSON.stringify(nextRemote) },
		staleLink,
		log,
	};
}

/**
 * After a terminal command error (a 4xx `sync_status` other than 429,
 * design rule 13): `pending_cmd` is cleared and the line's status becomes
 * the local base, so the same push is not retried every cycle.
 */
export function terminalLink(link: TodoistTaskLink, line: ScannedLine): TodoistTaskLink {
	const localBase = link.localBase === null ? null : ({ ...(JSON.parse(link.localBase) as LocalBase), status: line.status } satisfies LocalBase);
	return { ...link, pendingCmd: null, localBase: localBase === null ? null : JSON.stringify(localBase) };
}

/**
 * Applies a line change to the raw line, or returns null when the raw line
 * no longer holds the scanned text and open/closed state (edited since the
 * scan; an index line only knows the canonical status char, so `X` scans as
 * `x`). The description goes first, on the text the plan checked it
 * against. Throws when the result would hold a line break.
 */
export function applyLineChange(raw: string, change: LineChange): string | null {
	const status = taskLineStatus(raw);
	if (status === null || taskLineText(raw) !== change.expected.line) return null;
	if (isClosedStatus(status) !== isClosedStatus(change.expected.status)) return null;
	let out = raw;
	if (change.description !== undefined) {
		const patch = replaceDescription(out, change.description);
		if (patch?.kind !== 'line') return null;
		out = patch.line;
	}
	if (change.status) out = setTaskStatus(out, change.status)!;
	if (change.dueDate !== undefined) out = setDueDate(out, change.dueDate)!;
	if (change.priority !== undefined) out = setPriority(out, change.priority)!;
	for (const tag of change.removeTags ?? []) out = removeTag(out, tag)!;
	for (const tag of change.addTags ?? []) out = addTag(out, tag)!;
	assertSingleLine(out);
	return out;
}
