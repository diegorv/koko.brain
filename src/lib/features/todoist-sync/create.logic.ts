/**
 * Brain-born tasks, as pure planning: which task lines are created in
 * Todoist, the `item_add` each one sends, and how a pending add finds its
 * Todoist task again after a lost response. Design:
 * `.scratch/todoist-bisync/research/design.md` rules 1, 2, 8, 8b, 10, 11,
 * 13, Scope and Anchor.
 */

import type { TodoistSyncLogInput, TodoistTaskLink } from '#lib/contracts/index.js';
import { anchorToken, hasForeignId, idValues, readAnchor } from './anchor.logic.js';
import { isDetached } from './detach.logic.js';
import { mapPriorityToTodoist } from './priority.logic.js';
import { kokobrainAnchor, mappedLabels, type LocalBase, type PullDue, type PullItem, type RemoteBase, type ScannedLine, type ScannedNote } from './pull.logic.js';
import { contentRoundTripProblem, isClosedStatus, taskLineText } from './task-line.logic.js';

/** Todoist's limit on task content (design rule 13), counted in code points as the field push does. */
const MAX_CONTENT_LENGTH = 500;

/** The scope tag: a line carrying it is synced wherever it is (design Scope). */
const SCOPE_TAG = 'todoist';

/**
 * A block id ends a line (`live-preview/parsers/block-reference.ts`): the
 * anchor goes before it, and Todoist never gets it as content.
 */
const TRAILING_BLOCK_ID = /(?:^|\s+)\^[\w-]+$/u;

/** The due of an `item_add` (live-check R): `{date}`, `{date, string, lang}` or `{string}`. */
export interface AddDue {
	/** The `📅` date, `YYYY-MM-DD`. */
	date?: string;
	/** The `🔁` rule, as written on the line. */
	string?: string;
	/** Language of `string`. */
	lang?: string;
}

/** The `item_add` args of a brain-born task (SDK `TaskAddArgs`, camel-cased). */
export interface ItemAddArgs {
	/** The line's description. */
	content: string;
	/** `kokobrain:<anchor>`, so the task names its line (design rule 1). */
	description: string;
	/** Project the task goes to. */
	projectId: string;
	/** Section the task goes to: the one linked to the `##` heading above the line, when there is one. */
	sectionId?: string;
	/** Todoist priority, 1 to 4. */
	priority: number;
	/** The line's tags (excluded labels left out), plus `personal` in a personal vault. */
	labels: string[];
	/** The line's due, when it has a `📅` or a `🔁`. */
	due?: AddDue;
	/** Always false: Todoist must not read `@label` words in the content. */
	autoParseLabels: false;
}

/** `pending_cmd` JSON of a brain-born task: its `item_add`, resent as-is until acknowledged. */
export interface PendingAdd {
	type: 'item_add';
	/** The command uuid, also in `pending_uuid`; a resend with it is applied once (live-check 8). */
	uuid: string;
	/** The command temp id: the line's anchor. */
	tempId: string;
	args: ItemAddArgs;
}

/** Everything {@link planCreates} reads. */
export interface CreateInput {
	/** Every task line in sync scope (design rule 11). */
	lines: ScannedLine[];
	/** Every indexed note, with its `todoist_project` id when in sync scope. */
	notes: ScannedNote[];
	/** The stored links, with this cycle's updates. */
	links: TodoistTaskLink[];
	/** Anchor -> every in-scope line carrying it. */
	occurrences: Map<string, ScannedLine[]>;
	/** Project ids of the vault's tree, frozen projects left out. */
	treeIds: ReadonlySet<string>;
	/** The root project, where `#todoist` lines outside project notes go. */
	rootId: string;
	/** Note path -> temp id of its brain-born project sent this cycle: its lines are added with the temp id as project. */
	pendingProjects: ReadonlyMap<string, string>;
	/** Lower-cased label names never sent from tags (`excludedLabelSet`). */
	excludedLabels: ReadonlySet<string>;
	/** The vault context (design rule 8b). */
	syncContext: 'work' | 'personal';
	/** Anchors already in use (in the vault, the link table, this cycle's inserts). */
	takenAnchors: ReadonlySet<string>;
	/** Makes a command uuid. */
	newUuid: () => string;
	/** Makes a brain-born anchor not in `taken` (`generateAnchor`). */
	newAnchor: (taken: ReadonlySet<string>) => string;
	/** The live section linked to the `##` heading above a line of a project note; null (or absent) for none. */
	sectionOf?: (line: ScannedLine) => string | null;
}

/** A line to create: its anchor is written first, then its pending link is stored, then the command is sent (rule 2). */
export interface PlannedCreate {
	/** The anchor to write on the line. */
	anchor: string;
	/** The scanned line that gets it. */
	line: ScannedLine;
	/** The link to store once the anchor is written: `todoist_id` null, `pending_uuid` and `pending_cmd` set. */
	link: TodoistTaskLink;
	/** The command to send once the link is stored. */
	command: PendingAdd;
}

/** What {@link planCreates} decided. */
export interface CreatePlan {
	/** New creates this cycle. */
	creates: PlannedCreate[];
	/** Pending adds stored by an earlier cycle and never acknowledged, sent again with their uuid. */
	resends: { link: TodoistTaskLink; command: PendingAdd }[];
	/** Lines left out, for the sync log. */
	log: TodoistSyncLogInput[];
}

/** Parses `pending_cmd`; null when absent or not an `item_add`. */
export function parsePendingAdd(raw: string | null): PendingAdd | null {
	if (raw === null) return null;
	try {
		const value = JSON.parse(raw) as Partial<PendingAdd> | null;
		if (value?.type !== 'item_add' || typeof value.uuid !== 'string' || typeof value.tempId !== 'string' || typeof value.args !== 'object') {
			return null;
		}
		return value as PendingAdd;
	} catch {
		return null;
	}
}

/** A pending add still waiting for its Todoist id: not acknowledged and not detached. */
function pendingAddOf(link: TodoistTaskLink): PendingAdd | null {
	if (link.todoistId !== null || isDetached(link)) return null;
	return parsePendingAdd(link.pendingCmd);
}

/**
 * Plans the creates of one cycle (design Scope, rules 2 and 10). A line is
 * created when it is an open (rule 5), top-level task line the index has
 * parsed, carries no `🆔` at all, and sits in a project note of the tree
 * (created in that project), in the note of a brain-born project sent this
 * cycle (created with its temp id), or carries `#todoist` (created in the
 * root project, unless the root is frozen; the line stays in its note). A
 * line with a user `🆔` (no `td-`)
 * is logged and left out; an anchored line is never created, whether or not
 * it has a link row, so a detached line that comes back stays detached.
 * Content over 500 characters, or that would not survive a parse back, is
 * logged and left out. A note named by two project notes' id is left out,
 * as the pull leaves it.
 *
 * A line under a `##` heading linked to a section (`sectionOf`) is created
 * in that section; its `local_base` keeps the place it is created in.
 *
 * Pending adds of earlier cycles (not detached, not frozen, with exactly one
 * line) are listed for a resend with their stored command.
 */
export function planCreates(input: CreateInput): CreatePlan {
	const plan: CreatePlan = { creates: [], resends: [], log: [] };
	const noteProjects = projectNotes(input.notes, input.treeIds);
	const taken = new Set(input.takenAnchors);

	for (const line of input.lines) {
		if (line.fields === null || isClosedStatus(line.status) || line.indent > 0) continue;
		const tagged = input.treeIds.has(input.rootId) && line.fields.tags.some((t) => t.toLowerCase() === SCOPE_TAG);
		const projectId = noteProjects.get(line.relPath) ?? input.pendingProjects.get(line.relPath) ?? (tagged ? input.rootId : null);
		if (projectId === null) continue;
		const where = `${line.relPath}:${line.lineNumber}`;
		if (idValues(line.line).length > 0) {
			if (readAnchor(line.line) === null && hasForeignId(line.line)) {
				plan.log.push({ kind: 'create-skipped', anchor: null, message: `${where}: the line carries a 🆔 that is not a sync anchor; it is not created in Todoist` });
			}
			continue;
		}
		const content = line.fields.description.replace(TRAILING_BLOCK_ID, '');
		const problem = [...content].length > MAX_CONTENT_LENGTH ? 'over 500 characters' : contentRoundTripProblem(content);
		if (problem) {
			plan.log.push({ kind: 'create-skipped', anchor: null, message: `${where}: the line is not created in Todoist (${problem}): ${JSON.stringify(content)}` });
			continue;
		}

		const anchor = input.newAnchor(taken);
		taken.add(anchor);
		const uuid = input.newUuid();
		const sectionId = noteProjects.has(line.relPath) ? (input.sectionOf?.(line) ?? null) : null;
		const args = addArgs(line, content, anchor, projectId, input);
		if (sectionId !== null) args.sectionId = sectionId;
		const command: PendingAdd = { type: 'item_add', uuid, tempId: anchor, args };
		const local: LocalBase = { ...line.fields, status: line.status, location: { projectId, sectionId } };
		plan.creates.push({
			anchor,
			line,
			command,
			link: {
				anchor,
				todoistId: null,
				noteRelPath: line.relPath,
				localBase: JSON.stringify(local),
				remoteBase: null,
				pendingUuid: uuid,
				pendingCmd: JSON.stringify(command),
				missCount: 0,
				frozen: false,
			},
		});
	}

	for (const link of input.links) {
		const command = pendingAddOf(link);
		if (command === null || link.frozen || (input.occurrences.get(link.anchor)?.length ?? 0) !== 1) continue;
		plan.resends.push({ link, command });
	}
	return plan;
}

/** Note path -> project id, for the notes whose `todoist_project` is in the tree and named by no other note. */
function projectNotes(notes: ScannedNote[], treeIds: ReadonlySet<string>): Map<string, string> {
	const count = new Map<string, number>();
	for (const note of notes) if (note.projectId !== null) count.set(note.projectId, (count.get(note.projectId) ?? 0) + 1);
	const out = new Map<string, string>();
	for (const note of notes) {
		if (note.projectId !== null && treeIds.has(note.projectId) && count.get(note.projectId) === 1) out.set(note.relPath, note.projectId);
	}
	return out;
}

/** The `item_add` args of a line (design rules 1, 7, 8, 8b), `content` being its description without a block id. */
function addArgs(line: ScannedLine, content: string, anchor: string, projectId: string, input: CreateInput): ItemAddArgs {
	const fields = line.fields!;
	const labels: string[] = [];
	for (const tag of fields.tags) {
		if (input.excludedLabels.has(tag.toLowerCase()) || labels.some((l) => l.toLowerCase() === tag.toLowerCase())) continue;
		labels.push(tag);
	}
	if (input.syncContext === 'personal') labels.push('personal');
	const args: ItemAddArgs = {
		content,
		description: `kokobrain:${anchor}`,
		projectId,
		priority: mapPriorityToTodoist(fields.priority ?? undefined),
		labels,
		autoParseLabels: false,
	};
	const rule = line.recurrence?.trim() ?? '';
	// Never `<rule> starting <date>`: such a rule completes for good on the first close (live-check R).
	if (rule !== '') args.due = fields.dueDate ? { date: fields.dueDate, string: rule, lang: 'en' } : { string: rule };
	else if (fields.dueDate) args.due = { date: fields.dueDate };
	return args;
}

/**
 * The link of an acknowledged add: the Todoist id stored, the pending add
 * cleared, and `remote_base` at the values sent, so the next pull's diff
 * brings in only what Todoist did with them (the first date of a rule sent
 * without one, a label added by the owner's webhook). `projectId` is the
 * real id of the project the task landed in, for a command sent with a
 * project's temp id.
 */
export function ackedLink(
	link: TodoistTaskLink,
	command: PendingAdd,
	todoistId: string,
	excludedLabels: ReadonlySet<string>,
	projectId: string = command.args.projectId,
): TodoistTaskLink {
	const { args } = command;
	const tags = mappedLabels(args.labels, excludedLabels);
	const remote: RemoteBase = {
		content: args.content,
		projectId,
		sectionId: args.sectionId ?? null,
		parentId: null,
		checked: false,
		priority: args.priority,
		due: sentDue(args.due),
		labels: [...args.labels],
		unmappedLabels: args.labels.filter((l) => !tags.includes(l)),
		contentProblem: null,
	};
	return { ...link, todoistId, pendingUuid: null, pendingCmd: null, remoteBase: JSON.stringify(remote) };
}

function sentDue(due: AddDue | undefined): PullDue | null {
	if (due?.date === undefined) return null;
	return { date: due.date, string: due.string ?? due.date, isRecurring: due.string !== undefined, datetime: null, timezone: null, lang: due.lang ?? null };
}

/** Everything {@link pairPendingAdds} reads. */
export interface PairInput {
	/** The stored links. */
	links: TodoistTaskLink[];
	/** Every item pulled this cycle. */
	items: PullItem[];
	/** Lower-cased label names never written as tags. */
	excludedLabels: ReadonlySet<string>;
}

/** What {@link pairPendingAdds} decided. */
export interface PairPlan {
	/** Pending adds paired with their Todoist task, as {@link ackedLink} stores them. */
	links: TodoistTaskLink[];
	/** Items that match a pending add ambiguously: neither paired nor inserted as a new line. */
	heldItemIds: Set<string>;
	log: TodoistSyncLogInput[];
}

/**
 * Pairs pulled items with the pending adds whose response was lost (design
 * rule 2), before the pull may insert any of them as a new line. An item
 * not linked yet pairs with the pending add its description's `kokobrain:`
 * line names; an item with no such line pairs by content and project. Only
 * a one-to-one match pairs; the items of any other match are held (logged),
 * so they never become a second line, and the pending add's resend
 * resolves it.
 */
export function pairPendingAdds(input: PairInput): PairPlan {
	const plan: PairPlan = { links: [], heldItemIds: new Set(), log: [] };
	const pending = new Map<string, { link: TodoistTaskLink; command: PendingAdd }>();
	for (const link of input.links) {
		const command = pendingAddOf(link);
		if (command) pending.set(link.anchor, { link, command });
	}
	if (pending.size === 0) return plan;
	const linkedIds = new Set(input.links.map((l) => l.todoistId));

	const matches = new Map<string, PullItem[]>();
	for (const item of input.items) {
		if (linkedIds.has(item.id)) continue;
		const named = kokobrainAnchor(item.description);
		const hits =
			named !== null
				? pending.has(named)
					? [named]
					: []
				: [...pending.values()].filter((p) => p.command.args.content === item.content && p.command.args.projectId === item.projectId).map((p) => p.link.anchor);
		if (hits.length > 1) {
			plan.heldItemIds.add(item.id);
			for (const anchor of hits) matches.set(anchor, [...(matches.get(anchor) ?? []), item]);
			continue;
		}
		if (hits.length === 1) matches.set(hits[0], [...(matches.get(hits[0]) ?? []), item]);
	}

	for (const [anchor, items] of matches) {
		const { link, command } = pending.get(anchor)!;
		if (items.length === 1 && !plan.heldItemIds.has(items[0].id)) {
			plan.links.push(ackedLink(link, command, items[0].id, input.excludedLabels, items[0].projectId));
			continue;
		}
		for (const item of items) plan.heldItemIds.add(item.id);
		plan.log.push({
			kind: 'anchor-conflict',
			anchor,
			message: `Todoist tasks ${items.map((i) => i.id).join(', ')} all match this line's pending create; none is paired or inserted`,
		});
	}
	return plan;
}

/** A brain-born anchor, as `generateAnchor` makes it: `td-` plus 8 base36 chars. */
const BRAIN_BORN_ANCHOR = /^td-[0-9a-z]{8}$/u;

/**
 * One `orphan-anchor` entry per brain-born anchor in the scan that no link
 * owns and no item names in its `kokobrain:` line, at its first line. Such a
 * line is left by a cycle that stopped after writing the anchor and before
 * storing its pending add (a crash, a vault switch): it is never created,
 * since it carries an anchor, so the entry tells the user how to recover.
 * @param owned - anchors with a link row, this cycle's pairs included
 */
export function orphanAnchorLog(occurrences: ReadonlyMap<string, readonly ScannedLine[]>, owned: ReadonlySet<string>, items: Iterable<PullItem>): TodoistSyncLogInput[] {
	const named = new Set<string | null>([...items].map((i) => kokobrainAnchor(i.description)));
	const log: TodoistSyncLogInput[] = [];
	for (const [anchor, lines] of occurrences) {
		if (!BRAIN_BORN_ANCHOR.test(anchor) || owned.has(anchor) || named.has(anchor)) continue;
		log.push({
			kind: 'orphan-anchor',
			anchor,
			message: `${lines[0].relPath}:${lines[0].lineNumber}: the line's 🆔 ${anchor} has no sync link and no Todoist task, so it does not sync; remove its 🆔 to create it in Todoist`,
		});
	}
	return log;
}

/**
 * Appends the anchor token to a task line (before a trailing block id and
 * trailing whitespace), for a line that carries no `🆔` yet. Null for a line
 * that is no task.
 */
export function addAnchor(line: string, anchor: string): string | null {
	const text = taskLineText(line);
	if (text === null) return null;
	const head = line.slice(0, line.length - text.length);
	const trailing = /(?: \^[\w-]+)?\s*$/u.exec(text)![0];
	const body = text.slice(0, text.length - trailing.length);
	return `${head}${body} ${anchorToken(anchor)}${trailing}`;
}

/** What {@link syncOwnsTaskLine} knows about the line's note. */
export interface LineOwnerContext {
	/** Whether the sync is on with a root project chosen. */
	syncOn: boolean;
	/** Whether the note's path may hold synced lines (`isInSyncScope`). */
	inSyncScope: boolean;
	/** Whether the note's frontmatter names a Todoist project (`todoist_project`). */
	projectNote: boolean;
}

/**
 * Whether the two-way sync owns a task line, so the Tasks view's old "Send
 * to Todoist" action is hidden for it: an anchored line always; with the
 * sync on and the note in sync scope, a line of a project note or one
 * tagged `#todoist`. Approximates {@link planCreates}' scope without the
 * vault's project tree.
 * @param text - the task text after `[ ] `
 * @param tags - the line's parsed tags
 */
export function syncOwnsTaskLine(text: string, tags: readonly string[], context: LineOwnerContext): boolean {
	if (readAnchor(text) !== null) return true;
	if (!context.syncOn || !context.inSyncScope) return false;
	return context.projectNote || tags.some((t) => t.toLowerCase() === SCOPE_TAG);
}
