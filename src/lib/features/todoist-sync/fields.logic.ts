/**
 * Field sync from Todoist to the note, as pure planning: per synced line,
 * the content, due date, priority and labels Todoist changed since
 * `remote_base`, each turned into a token patch of the line. Design:
 * `.scratch/todoist-bisync/research/design.md` rules 3, 4, 7, 8.
 */

import type { TaskPriority, TodoistSyncLogInput, TodoistTaskLink } from '#lib/contracts/index.js';
import { baseDue, dueDay, sameLink, unchangedItem, type CompletionPlan, type LineChange } from './completion.logic.js';
import { mapPriorityFromTodoist, mapPriorityToTodoist } from './priority.logic.js';
import {
	mappedLabels,
	PRIORITY_EMOJI,
	type LocalBase,
	type PullDue,
	type PullItem,
	type RemoteBase,
	type ScannedLine,
} from './pull.logic.js';
import { contentRoundTripProblem, replaceDescription, type PriorityEmoji } from './task-line.logic.js';

/** Everything {@link planFields} reads besides the completion plan. */
export interface FieldsInput {
	/** The stored links, with this cycle's `frozen` flags. */
	links: TodoistTaskLink[];
	/** Anchor -> every in-scope line carrying it. */
	occurrences: Map<string, ScannedLine[]>;
	/** Todoist items seen this cycle by id (as for `planCompletion`). */
	items: Map<string, PullItem>;
	/** Whether the items were pulled incrementally, so a missing item is unchanged. */
	incremental: boolean;
	/** Project ids of the vault's tree. */
	treeIds: ReadonlySet<string>;
	/** Lower-cased label names never written as tags (`excludedLabelSet`). */
	excludedLabels: ReadonlySet<string>;
}

/** The token patches of one line, without anchor, path and expected line. */
type FieldPatch = Pick<LineChange, 'description' | 'dueDate' | 'priority' | 'addTags' | 'removeTags'>;

/**
 * Plans the field half of a cycle on top of the completion plan (whose
 * links carry the bases completion moved) and returns both merged: one line
 * change and one link per anchor. Per link with exactly one line, parsed
 * line fields, both bases, an item seen in the tree and not deleted, and no
 * close or reopen planned this cycle (left to the next one), each field
 * Todoist changed since `remote_base` (rule 3):
 * - content: the description is replaced (rule 4). Content that fails the
 *   round trip, or a mid-sentence conflict, leaves the line alone and is
 *   logged; the remote base still moves, so it is logged once. A line
 *   inserted from content that failed the round trip is left alone and
 *   logged on every later content change, while `local_base` holds that
 *   content.
 * - due: the `📅` takes the date part, or goes when the due was removed; a
 *   time or text change only moves the remote base. The `🔁` text is
 *   never written (rule 7), nor removed: when Todoist drops the due of a
 *   recurring task, the `📅` goes and the `🔁 <rule>` text stays.
 * - priority: the emoji of the new priority, unless the line's priority
 *   already maps to it (`🔽` and `⏬` both map to Todoist 1).
 * - labels: tag-name labels added or removed (rule 8), compared
 *   case-insensitively; excluded and unmapped labels only move the base.
 * A field the brain already has only moves the bases; one the brain also
 * changed to another value is overwritten (Todoist wins) and the brain
 * value logged.
 *
 * "Close or reopen planned" means a command in `completion.commands`: when
 * the caller drops commands over the cap, those links get field sync this
 * cycle, and their status base is left as stored, so the push is planned
 * again next cycle.
 */
export function planFields(input: FieldsInput, completion: CompletionPlan): CompletionPlan {
	const pushed = new Set(completion.commands.map((c) => c.anchor));
	const links = new Map(input.links.map((l) => [l.anchor, l]));
	for (const l of completion.links) links.set(l.anchor, l);
	const changes = new Map(completion.lineChanges.map((c) => [c.anchor, c]));
	const out = new Map(completion.links.map((l) => [l.anchor, l]));
	const log = [...completion.log];

	for (const link of links.values()) {
		const lines = input.occurrences.get(link.anchor) ?? [];
		if (pushed.has(link.anchor) || lines.length !== 1 || link.todoistId === null) continue;
		if (link.remoteBase === null || link.localBase === null) continue;
		const line = lines[0];
		if (line.fields === null) continue;
		const remoteBase = JSON.parse(link.remoteBase) as RemoteBase;
		const item = input.items.get(link.todoistId) ?? (input.incremental ? unchangedItem(link.todoistId, remoteBase) : undefined);
		if (!item || item.isDeleted || !input.treeIds.has(item.projectId)) continue;

		const result = planLink(link.anchor, line, JSON.parse(link.localBase) as LocalBase, remoteBase, item, input.excludedLabels);
		log.push(...result.log);
		const next: TodoistTaskLink = { ...link, localBase: JSON.stringify(result.local), remoteBase: JSON.stringify(result.remote) };
		if (!sameLink(next, link)) out.set(link.anchor, next);
		if (Object.keys(result.patch).length > 0) {
			const base = changes.get(link.anchor) ?? { anchor: link.anchor, relPath: line.relPath, expected: line, status: null };
			changes.set(link.anchor, { ...base, ...result.patch });
		}
	}
	return { lineChanges: [...changes.values()], links: [...out.values()], commands: completion.commands, log };
}

function planLink(
	anchor: string,
	line: ScannedLine,
	localBase: LocalBase,
	remoteBase: RemoteBase,
	item: PullItem,
	excludedLabels: ReadonlySet<string>,
): { patch: FieldPatch; local: LocalBase; remote: RemoteBase; log: TodoistSyncLogInput[] } {
	const fields = line.fields!;
	const patch: FieldPatch = {};
	const local: LocalBase = { ...localBase };
	const remote: RemoteBase = { ...remoteBase };
	const log: TodoistSyncLogInput[] = [];
	const conflict = (field: string, brain: unknown) =>
		log.push({ kind: 'conflict', anchor, message: `The ${field} changed on both sides; Todoist wins. Brain value: ${JSON.stringify(brain)}` });

	if (item.content !== remoteBase.content) {
		remote.content = item.content;
		const problem = contentRoundTripProblem(item.content);
		remote.contentProblem = problem;
		if (problem) {
			log.push({ kind: 'content-roundtrip', anchor, message: `The new Todoist content does not survive a parse back (${problem}); the line keeps its text` });
		} else if (fields.description === item.content) {
			local.description = item.content;
		} else if (contentRoundTripProblem(localBase.description) !== null) {
			// The line was inserted from content that failed the round trip (`pulledTask` keeps it raw in
			// `local_base`), so part of that content parsed as metadata: a word-span replace would leave it behind.
			log.push({
				kind: 'description-conflict',
				anchor,
				message: `The line was written from Todoist text that does not survive a parse back, so the new Todoist text was not written: ${JSON.stringify(item.content)}`,
			});
		} else {
			const replaced = replaceDescription(`- [ ] ${line.line}`, item.content);
			if (replaced?.kind === 'line') {
				if (fields.description !== localBase.description) conflict('text', fields.description);
				patch.description = item.content;
				local.description = item.content;
			} else {
				log.push({
					kind: 'description-conflict',
					anchor,
					message: `The line has a tag, link or signifier inside its text, so the Todoist text was not written: ${JSON.stringify(item.content)}`,
				});
			}
		}
	}

	if (!sameDue(item.due, remoteBase.due)) {
		remote.due = baseDue(item.due);
		const day = dueDay(item.due);
		if (item.due !== null && day === null) {
			log.push({ kind: 'due-dropped', anchor, message: 'The Todoist due date is not YYYY-MM-DD; the line keeps its 📅' });
		} else if (day !== dueDay(remoteBase.due)) {
			if (fields.dueDate !== day) {
				if (fields.dueDate !== localBase.dueDate) conflict('due date', fields.dueDate);
				patch.dueDate = day;
			}
			local.dueDate = day;
		}
	}

	if (item.priority !== remoteBase.priority) {
		remote.priority = item.priority;
		const linePriority = fields.priority ?? undefined;
		if (mapPriorityToTodoist(linePriority) !== item.priority) {
			if ((fields.priority ?? null) !== (localBase.priority ?? null)) conflict('priority', fields.priority);
			const priority: TaskPriority | null = mapPriorityFromTodoist(item.priority);
			patch.priority = priority ? (PRIORITY_EMOJI[priority] as PriorityEmoji) : null;
			local.priority = priority;
		} else {
			local.priority = fields.priority;
		}
	}

	if (!sameList(item.labels, remoteBase.labels)) {
		const tags = mappedLabels(item.labels, excludedLabels);
		remote.labels = [...item.labels];
		remote.unmappedLabels = item.labels.filter((l) => !tags.includes(l));
		const before = mappedLabels(remoteBase.labels, excludedLabels);
		const added = minus(tags, before);
		const removed = minus(before, tags);
		const addTags = minus(added, fields.tags);
		const removeTags = removed.filter((t) => has(fields.tags, t));
		if (addTags.length > 0) patch.addTags = addTags;
		if (removeTags.length > 0) patch.removeTags = removeTags;
		local.tags = [...minus(localBase.tags, removed), ...minus(added, localBase.tags)];
	}

	return { patch, local, remote, log };
}

function has(list: readonly string[], value: string): boolean {
	return list.some((v) => v.toLowerCase() === value.toLowerCase());
}

/** `a` without the entries of `b`, case-insensitively. */
function minus(a: readonly string[], b: readonly string[]): string[] {
	return a.filter((v) => !has(b, v));
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
	return a.length === b.length && a.every((v, i) => v === b[i]);
}

function sameDue(a: PullDue | null, b: PullDue | null): boolean {
	if (a === null || b === null) return a === b;
	return (
		a.date === b.date &&
		a.string === b.string &&
		a.isRecurring === b.isRecurring &&
		(a.datetime ?? null) === (b.datetime ?? null) &&
		(a.timezone ?? null) === (b.timezone ?? null) &&
		(a.lang ?? null) === (b.lang ?? null)
	);
}
