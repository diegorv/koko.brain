/**
 * Field sync between Todoist and the note, as pure planning: per synced
 * line, the content, due date, priority and labels Todoist changed since
 * `remote_base`, each turned into a token patch of the line, and the ones
 * the brain changed since `local_base`, turned into one `item_update` per
 * task. Design: `.scratch/todoist-bisync/research/design.md` rules 3, 4, 7,
 * 8, 13.
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
import { contentRoundTripProblem, replaceDescription, trailingBlockId, type PriorityEmoji } from './task-line.logic.js';

/**
 * Todoist's limit on task content (design rule 13), counted here in code
 * points. Which unit Todoist counts (code points or UTF-16 units) is not
 * verified; the two differ only for text outside the BMP, such as emoji.
 */
const MAX_CONTENT_LENGTH = 500;

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
	/** Makes a command uuid. */
	newUuid: () => string;
}

/** A due as an `item_update` sends it. */
export interface PushDue {
	/** `YYYY-MM-DD`, or with the time part of the task's due. */
	date: string;
	/** The recurrence rule of a recurring task, from `remote_base` (rule 7). */
	string?: string;
	/** Language of `string`. */
	lang?: string;
	/** Timezone of a fixed-time due. */
	timezone?: string;
}

/** The `item_update` args of one push; only the fields the brain changed. */
export interface ItemUpdateArgs {
	/** Todoist task id. */
	id: string;
	/** New content. */
	content?: string;
	/** New due, or null to remove it. */
	due?: PushDue | null;
	/** New Todoist priority, 1 to 4. */
	priority?: number;
	/** The full label list (it replaces Todoist's). */
	labels?: string[];
}

/** An `item_update` to send for one link. */
export interface PlannedUpdate {
	/** The line's anchor. */
	anchor: string;
	/** Todoist item id. */
	todoistId: string;
	/** The command uuid. */
	uuid: string;
	/** The command args. */
	args: ItemUpdateArgs;
	/** The link to store once Todoist answers `ok`: both bases at the pushed values. */
	okLink: TodoistTaskLink;
	/** The link to store on a terminal refusal: `local_base` at the line's values, so the push is not retried. */
	refusedLink: TodoistTaskLink;
}

/** What {@link planFields} decided: the completion plan merged with the field half. */
export interface FieldsPlan extends CompletionPlan {
	/** Field pushes, to send after the links are stored; their bases move only on `ok`. */
	updates: PlannedUpdate[];
	/**
	 * Set when a link with a close or reopen this cycle also has a Todoist
	 * field edit: the field sync skips it, so the `sync_token` must stay where
	 * it is or a terminal refusal of the command would hide that edit for good.
	 */
	withholdToken: boolean;
}

/** The token patches of one line, without anchor, path and expected line. */
type FieldPatch = Pick<LineChange, 'description' | 'dueDate' | 'priority' | 'addTags' | 'removeTags'>;

/**
 * Plans the field half of a cycle on top of the completion plan (whose
 * links carry the bases completion moved) and returns both merged: one line
 * change and one link per anchor, plus the pushes. Per link with exactly one
 * line, parsed line fields, both bases, an item seen in the tree and not
 * deleted, and no close or reopen planned this cycle (left to the next one),
 * each field Todoist changed since `remote_base` (rule 3):
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
 * Each field Todoist did not change but the line did (compared with
 * `local_base` in Todoist terms) goes into the link's `item_update`, unless
 * Todoist already holds that value (then only the local base moves):
 * - content: not queued when over 500 characters or failing the round
 *   trip; logged once (`local_base.unpushedDescription`), and the line's
 *   other fields still push.
 * - due: the date with the time and timezone of `remote_base`; a recurring
 *   task sends `{date, string, lang}` with its rule, and a removed `📅` on
 *   one is not pushed (logged), since a due without a date drops the rule.
 * - priority: the mapped Todoist value; `🔽`, `⏬` and none are all 1.
 * - labels: the line's mapped tags plus every other label the task carries
 *   (unmapped, scope, context and default labels are never removed).
 * A link whose content the round-trip check flagged (`remote_base`, or a
 * `local_base` holding raw inserted content) pushes nothing.
 *
 * A block id that ends the line (` ^abc`) is no part of the content: the
 * text is compared and pushed without it, and Todoist text written into the
 * line leaves it last.
 *
 * "Close or reopen planned" means a command in `completion.commands`: when
 * the caller drops commands over the cap, those links get field sync this
 * cycle, and their status base is left as stored, so the push is planned
 * again next cycle.
 */
export function planFields(input: FieldsInput, completion: CompletionPlan): FieldsPlan {
	const pushed = new Set(completion.commands.map((c) => c.anchor));
	const links = new Map(input.links.map((l) => [l.anchor, l]));
	for (const l of completion.links) links.set(l.anchor, l);
	const changes = new Map(completion.lineChanges.map((c) => [c.anchor, c]));
	const out = new Map(completion.links.map((l) => [l.anchor, l]));
	const log = [...completion.log];
	const updates: PlannedUpdate[] = [];
	let withholdToken = false;

	for (const link of links.values()) {
		const lines = input.occurrences.get(link.anchor) ?? [];
		if (lines.length !== 1 || link.todoistId === null) continue;
		if (link.remoteBase === null || link.localBase === null) continue;
		const line = lines[0];
		const remoteBase = JSON.parse(link.remoteBase) as RemoteBase;
		const item = input.items.get(link.todoistId) ?? (input.incremental ? unchangedItem(link.todoistId, remoteBase) : undefined);
		if (!item || item.isDeleted || !input.treeIds.has(item.projectId)) continue;
		if (pushed.has(link.anchor)) {
			if (fieldsChanged(item, remoteBase)) withholdToken = true;
			continue;
		}
		if (line.fields === null) continue;
		// Completion moved the bases to the `📅` it writes, so the line is read as that patch leaves it.
		const due = changes.get(link.anchor)?.dueDate;
		const seen = due === undefined ? line : { ...line, fields: { ...line.fields, dueDate: due } };

		const result = planLink(link.anchor, seen, JSON.parse(link.localBase) as LocalBase, remoteBase, item, input.excludedLabels);
		log.push(...result.log);
		const next: TodoistTaskLink = { ...link, localBase: JSON.stringify(result.local), remoteBase: JSON.stringify(result.remote) };
		if (!sameLink(next, link)) out.set(link.anchor, next);
		if (Object.keys(result.patch).length > 0) {
			const base = changes.get(link.anchor) ?? { anchor: link.anchor, relPath: line.relPath, expected: line, status: null };
			changes.set(link.anchor, { ...base, ...result.patch });
		}
		if (result.push) {
			const okLocal = JSON.stringify(result.push.local);
			updates.push({
				anchor: link.anchor,
				todoistId: link.todoistId,
				uuid: input.newUuid(),
				args: { id: link.todoistId, ...result.push.args },
				okLink: { ...next, localBase: okLocal, remoteBase: JSON.stringify(result.push.remote) },
				refusedLink: { ...next, localBase: okLocal },
			});
		}
	}
	return { lineChanges: [...changes.values()], links: [...out.values()], commands: completion.commands, log, updates, withholdToken };
}

/** Whether Todoist changed a field the field sync reads since the base. */
function fieldsChanged(item: PullItem, base: RemoteBase): boolean {
	return item.content !== base.content || !sameDue(item.due, base.due) || item.priority !== base.priority || !sameList(item.labels, base.labels);
}

interface LinkPlan {
	patch: FieldPatch;
	local: LocalBase;
	remote: RemoteBase;
	log: TodoistSyncLogInput[];
	/** The push, with the bases to store once Todoist answers `ok`; null when nothing is pushed. */
	push: { args: Omit<ItemUpdateArgs, 'id'>; local: LocalBase; remote: RemoteBase } | null;
}

function planLink(
	anchor: string,
	line: ScannedLine,
	localBase: LocalBase,
	remoteBase: RemoteBase,
	item: PullItem,
	excludedLabels: ReadonlySet<string>,
): LinkPlan {
	const fields = line.fields!;
	// The description as Todoist content: a block id ending the line is left out, also from a base that kept it (a create's).
	const blockId = trailingBlockId(line.line);
	const contentOf = (text: string) => (blockId !== null && text.endsWith(` ${blockId}`) ? text.slice(0, -blockId.length - 1) : text);
	const description = contentOf(fields.description);
	const baseDescription = contentOf(localBase.description);
	const patch: FieldPatch = {};
	// The marker is kept only while the line still holds that same unsendable text (set again below).
	const { unpushedDescription, ...kept } = localBase;
	const local: LocalBase = kept;
	const remote: RemoteBase = { ...remoteBase };
	const log: TodoistSyncLogInput[] = [];
	const conflict = (field: string, brain: unknown) =>
		log.push({ kind: 'conflict', anchor, message: `The ${field} changed on both sides; Todoist wins. Brain value: ${JSON.stringify(brain)}` });

	const contentChanged = item.content !== remoteBase.content;
	if (contentChanged) {
		remote.content = item.content;
		const problem = contentRoundTripProblem(item.content);
		remote.contentProblem = problem;
		if (problem) {
			log.push({ kind: 'content-roundtrip', anchor, message: `The new Todoist content does not survive a parse back (${problem}); the line keeps its text` });
		} else if (description === item.content) {
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
			const brainChanged = description !== baseDescription;
			if (replaced?.kind === 'line') {
				if (brainChanged) conflict('text', description);
				patch.description = item.content;
				local.description = item.content;
			} else {
				const brain = brainChanged ? `; the brain text changed too and is not sent: ${JSON.stringify(description)}` : '';
				log.push({
					kind: 'description-conflict',
					anchor,
					message: `The line has a tag, link or signifier inside its text, so the Todoist text was not written: ${JSON.stringify(item.content)}${brain}`,
				});
				// Neither side's text wins: the brain text is taken as seen so it is not pushed over Todoist's later.
				// An unsendable one is kept in the marker, and the base takes Todoist's text so a revert is pushed.
				if (contentRoundTripProblem(description) === null) local.description = description;
				else {
					local.unpushedDescription = description;
					local.description = item.content;
				}
			}
		}
	}

	const day = dueDay(item.due);
	const dayChanged = day !== dueDay(remoteBase.due) || (item.due !== null && day === null);
	if (!sameDue(item.due, remoteBase.due)) {
		remote.due = baseDue(item.due);
		if (item.due !== null && day === null) {
			log.push({ kind: 'due-dropped', anchor, message: 'The Todoist due date is not YYYY-MM-DD; the line keeps its 📅' });
		} else if (dayChanged) {
			if (fields.dueDate !== day) {
				if (fields.dueDate !== localBase.dueDate) conflict('due date', fields.dueDate);
				patch.dueDate = day;
			}
			local.dueDate = day;
		}
	}

	const priorityChanged = item.priority !== remoteBase.priority;
	const linePriority = mapPriorityToTodoist(fields.priority ?? undefined);
	if (priorityChanged) {
		remote.priority = item.priority;
		if (linePriority !== item.priority) {
			if (linePriority !== mapPriorityToTodoist(localBase.priority ?? undefined)) conflict('priority', fields.priority);
			const priority: TaskPriority | null = mapPriorityFromTodoist(item.priority);
			patch.priority = priority ? (PRIORITY_EMOJI[priority] as PriorityEmoji) : null;
			local.priority = priority;
		} else {
			local.priority = fields.priority;
		}
	}

	const tags = mappedLabels(item.labels, excludedLabels);
	const before = mappedLabels(remoteBase.labels, excludedLabels);
	const tagsChanged = !sameSet(tags, before);
	const lineTags = fields.tags.filter((t) => !excludedLabels.has(t.toLowerCase()));
	const localTagsChanged = !sameSet(lineTags, localBase.tags.filter((t) => !excludedLabels.has(t.toLowerCase())));
	if (!sameList(item.labels, remoteBase.labels)) {
		remote.labels = [...item.labels];
		remote.unmappedLabels = item.labels.filter((l) => !tags.includes(l));
		if (tagsChanged && localTagsChanged) {
			if (!sameSet(lineTags, tags)) conflict('tags', fields.tags);
			const addTags = minus(tags, fields.tags);
			const removeTags = minus(lineTags, tags);
			if (addTags.length > 0) patch.addTags = addTags;
			if (removeTags.length > 0) patch.removeTags = removeTags;
			local.tags = tags;
		} else {
			const added = minus(tags, before);
			const removed = minus(before, tags);
			const addTags = minus(added, fields.tags);
			const removeTags = removed.filter((t) => has(fields.tags, t));
			if (addTags.length > 0) patch.addTags = addTags;
			if (removeTags.length > 0) patch.removeTags = removeTags;
			local.tags = [...minus(localBase.tags, removed), ...minus(added, localBase.tags)];
		}
	}

	if (remote.contentProblem !== null || contentRoundTripProblem(localBase.description) !== null) {
		return { patch, local, remote, log, push: null };
	}

	// The push half: only fields Todoist left alone this cycle, compared in Todoist terms.
	const args: Omit<ItemUpdateArgs, 'id'> = {};
	const okLocal: Partial<LocalBase> = {};
	const okRemote: Partial<RemoteBase> = {};

	if (!contentChanged && description !== contentOf(local.description)) {
		const text = description;
		const problem = [...text].length > MAX_CONTENT_LENGTH ? 'over 500 characters' : contentRoundTripProblem(text);
		if (text === remote.content) {
			local.description = text;
		} else if (problem) {
			if (text !== unpushedDescription) {
				log.push({ kind: 'content-not-pushed', anchor, message: `The brain text was not sent to Todoist (${problem}): ${JSON.stringify(text)}` });
			}
			local.unpushedDescription = text;
		} else {
			args.content = text;
			okLocal.description = text;
			okRemote.content = text;
		}
	}

	if (!dayChanged && fields.dueDate !== local.dueDate) {
		if (fields.dueDate === dueDay(remote.due)) {
			local.dueDate = fields.dueDate;
		} else if (fields.dueDate === null && remote.due?.isRecurring) {
			log.push({ kind: 'due-not-pushed', anchor, message: 'The 📅 of a recurring task was removed in the brain; Todoist keeps its due, since removing it would drop the rule' });
			local.dueDate = null;
		} else {
			const due = fields.dueDate === null ? null : pushDue(fields.dueDate, remote.due);
			args.due = due;
			okLocal.dueDate = fields.dueDate;
			okRemote.due = due === null ? null : dueAfterPush(due, remote.due);
		}
	}

	if (!priorityChanged && linePriority !== mapPriorityToTodoist(local.priority ?? undefined)) {
		if (linePriority === remote.priority) {
			local.priority = fields.priority;
		} else {
			args.priority = linePriority;
			okLocal.priority = fields.priority;
			okRemote.priority = linePriority;
		}
	}

	if (!tagsChanged && localTagsChanged) {
		if (sameSet(lineTags, tags)) {
			local.tags = fields.tags;
		} else {
			// Todoist's casing and order for the labels it keeps; every label that is not a mapped tag stays (rule 8).
			const labels = [...remote.labels.filter((l) => mappedLabels([l], excludedLabels).length === 0 || has(lineTags, l)), ...uniq(minus(lineTags, remote.labels))];
			args.labels = labels;
			okLocal.tags = fields.tags;
			okRemote.labels = labels;
		}
	}

	const push = Object.keys(args).length > 0 ? { args, local: { ...local, ...okLocal }, remote: { ...remote, ...okRemote } } : null;
	return { patch, local, remote, log, push };
}

/** The due to send for a `📅` moved to `day`: the base's time and timezone kept, a recurring rule always sent with it (rule 7). */
function pushDue(day: string, base: PullDue | null): PushDue {
	const time = base ? (base.date.length > 10 ? base.date : (base.datetime ?? '')).slice(10) : '';
	const due: PushDue = { date: `${day}${time}` };
	if (base?.timezone) due.timezone = base.timezone;
	if (base?.isRecurring) {
		due.string = base.string;
		due.lang = base.lang ?? 'en';
	}
	return due;
}

/** The `remote_base` due after Todoist accepted `sent`; the echo in the next pull only refines its text. */
function dueAfterPush(sent: PushDue, base: PullDue | null): PullDue {
	return {
		date: sent.date,
		string: sent.string ?? sent.date,
		isRecurring: Boolean(base?.isRecurring),
		datetime: sent.date.length > 10 ? sent.date : null,
		timezone: sent.timezone ?? null,
		lang: sent.lang ?? base?.lang ?? null,
	};
}

function has(list: readonly string[], value: string): boolean {
	return list.some((v) => v.toLowerCase() === value.toLowerCase());
}

/** `a` without the entries of `b`, case-insensitively. */
function minus(a: readonly string[], b: readonly string[]): string[] {
	return a.filter((v) => !has(b, v));
}

/** `a` with later case-insensitive repeats dropped. */
function uniq(a: readonly string[]): string[] {
	return a.filter((v, i) => !has(a.slice(0, i), v));
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
	return minus(a, b).length === 0 && minus(b, a).length === 0;
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
